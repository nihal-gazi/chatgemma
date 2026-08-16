/**
 * Run Code Tool for ChatGemma
 * Executes Python code client-side in a WebAssembly sandbox using Pyodide.
 */

let pyodidePromise = null;

async function getPyodide() {
  if (typeof window !== "undefined" && window.pyodideInstance) {
    return window.pyodideInstance;
  }

  if (!pyodidePromise) {
    pyodidePromise = (async () => {
      if (typeof window === "undefined") {
        throw new Error("Pyodide code execution is only supported in browser environments.");
      }

      if (!window.loadPyodide) {
        await new Promise((resolve, reject) => {
          const script = document.createElement("script");
          script.src = "https://cdn.jsdelivr.net/pyodide/v0.26.2/full/pyodide.js";
          script.async = true;
          script.onload = resolve;
          script.onerror = () =>
            reject(new Error("Failed to load Pyodide runtime from CDN. Check network connection."));
          document.head.appendChild(script);
        });
      }

      const pyodide = await window.loadPyodide({
        indexURL: "https://cdn.jsdelivr.net/pyodide/v0.26.2/full/",
      });

      // Initialize Python IO redirection
      await pyodide.runPythonAsync(`
import sys
import io
`);
      window.pyodideInstance = pyodide;
      return pyodide;
    })();
  }

  return pyodidePromise;
}

export const runCodeTool = {
  name: "run_code",
  displayName: "Python Runner",
  iconName: "Terminal",
  description:
    "Execute Python code in a secure in-browser WebAssembly Pyodide sandbox. Use for mathematical calculations, data transformation, algorithms, text analysis, and logic verification. Returns stdout output and evaluated results.",
  parameters: {
    type: "OBJECT",
    properties: {
      code: {
        type: "STRING",
        description: "The complete Python code to execute.",
      },
    },
    required: ["code"],
  },
  renderSummary: (args) => {
    const lines = (args.code || "").trim().split("\n");
    return `Python (${lines.length} ${lines.length === 1 ? "line" : "lines"})`;
  },

  async execute(args, context = {}) {
    const code = (args.code || "").trim();
    if (!code) {
      return {
        success: false,
        error: "No Python code provided.",
        output: "",
      };
    }

    const startTime = performance.now();

    try {
      const pyodide = await getPyodide();

      // Reset stdout/stderr capture buffers in Python
      await pyodide.runPythonAsync(`
_stdout_buffer = io.StringIO()
_stderr_buffer = io.StringIO()
_old_stdout = sys.stdout
_old_stderr = sys.stderr
sys.stdout = _stdout_buffer
sys.stderr = _stderr_buffer
`);

      let rawResult = undefined;
      let runtimeError = null;

      try {
        rawResult = await pyodide.runPythonAsync(code);
      } catch (err) {
        runtimeError = err;
      } finally {
        // Restore standard output
        await pyodide.runPythonAsync(`
sys.stdout = _old_stdout
sys.stderr = _old_stderr
`);
      }

      // Extract captured stdout and stderr
      const stdout = await pyodide.runPythonAsync(`_stdout_buffer.getvalue()`);
      const stderr = await pyodide.runPythonAsync(`_stderr_buffer.getvalue()`);

      const executionTimeMs = Math.round(performance.now() - startTime);

      if (runtimeError) {
        return {
          success: false,
          error: runtimeError.message || String(runtimeError),
          stdout: stdout || "",
          stderr: stderr || "",
          executionTimeMs,
        };
      }

      let formattedResult = "";
      if (rawResult !== undefined && rawResult !== null) {
        try {
          formattedResult = String(rawResult);
        } catch {
          formattedResult = "[Evaluated Object]";
        }
      }

      return {
        success: true,
        stdout: stdout || "",
        stderr: stderr || "",
        result: formattedResult,
        executionTimeMs,
      };
    } catch (err) {
      const executionTimeMs = Math.round(performance.now() - startTime);
      return {
        success: false,
        error: err.message || "Failed to initialize Pyodide environment.",
        output: "",
        executionTimeMs,
      };
    }
  },
};
