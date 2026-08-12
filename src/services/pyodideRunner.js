/**
 * Pyodide WebAssembly Python Code Execution Service
 * 
 * Runs Python code entirely in the client-side browser sandbox.
 */

let pyodideInstance = null;
let pyodideLoadingPromise = null;

export async function getPyodide() {
  if (pyodideInstance) return pyodideInstance;

  if (pyodideLoadingPromise) {
    return pyodideLoadingPromise;
  }

  pyodideLoadingPromise = new Promise(async (resolve, reject) => {
    try {
      // Check if pyodide.js script is already in the document
      if (!window.loadPyodide) {
        await new Promise((resScript, rejScript) => {
          const script = document.createElement("script");
          script.src = "https://cdn.jsdelivr.net/pyodide/v0.26.2/full/pyodide.js";
          script.async = true;
          script.onload = resScript;
          script.onerror = () => rejScript(new Error("Failed to load Pyodide WebAssembly CDN"));
          document.head.appendChild(script);
        });
      }

      const pyodide = await window.loadPyodide({
        indexURL: "https://cdn.jsdelivr.net/pyodide/v0.26.2/full/",
      });

      // Setup standard I/O redirection helper in Python
      await pyodide.runPythonAsync(`
import sys
import io

class OutputCapture:
    def __init__(self):
        self.stdout_buf = io.StringIO()
        self.stderr_buf = io.StringIO()
        self._old_stdout = None
        self._old_stderr = None

    def __enter__(self):
        self._old_stdout = sys.stdout
        self._old_stderr = sys.stderr
        sys.stdout = self.stdout_buf
        sys.stderr = self.stderr_buf
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        sys.stdout = self._old_stdout
        sys.stderr = self._old_stderr

    def get_stdout(self):
        return self.stdout_buf.getvalue()

    def get_stderr(self):
        return self.stderr_buf.getvalue()
`);

      pyodideInstance = pyodide;
      resolve(pyodide);
    } catch (err) {
      pyodideLoadingPromise = null;
      reject(err);
    }
  });

  return pyodideLoadingPromise;
}

export async function runPythonCode(code) {
  if (!code || typeof code !== "string") {
    return {
      success: false,
      output: "",
      error: "No Python code provided",
      durationMs: 0,
    };
  }

  const startTime = performance.now();

  try {
    const pyodide = await getPyodide();

    // Wrap execution with OutputCapture
    pyodide.globals.set("__user_code__", code);

    const result = await pyodide.runPythonAsync(`
with OutputCapture() as __cap__:
    __exec_res__ = None
    try:
        __exec_res__ = exec(__user_code__, globals())
    except Exception as __e__:
        import traceback
        traceback.print_exc()

__stdout_val__ = __cap__.get_stdout()
__stderr_val__ = __cap__.get_stderr()
(__stdout_val__, __stderr_val__)
`);

    const [stdout, stderr] = result.toJs();
    const durationMs = Math.round(performance.now() - startTime);

    let output = "";
    if (stdout) output += stdout;
    if (stderr) output += (output ? "\n" : "") + stderr;

    if (!output.trim()) {
      output = "Execution finished with no stdout (return code 0).";
    }

    return {
      success: !stderr || !stderr.includes("Traceback (most recent call last):"),
      output: output.trim(),
      error: stderr ? stderr.trim() : null,
      durationMs,
    };
  } catch (err) {
    const durationMs = Math.round(performance.now() - startTime);
    return {
      success: false,
      output: "",
      error: err.message || String(err),
      durationMs,
    };
  }
}

export function isPyodideLoaded() {
  return Boolean(pyodideInstance);
}
