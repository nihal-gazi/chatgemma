/**
 * General Purpose Helper Utilities for ChatGemma
 */

/**
 * Asynchronous sleep with AbortSignal cancellation support.
 * @param {number} ms - Milliseconds to sleep
 * @param {AbortSignal} [signal] - Optional abort signal
 * @returns {Promise<void>}
 */
export function sleep(ms, signal = null) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      const err = new Error("Aborted during sleep.");
      err.name = "AbortError";
      return reject(err);
    }

    const timer = setTimeout(() => {
      if (signal) signal.removeEventListener("abort", onAbort);
      resolve();
    }, ms);

    const onAbort = () => {
      clearTimeout(timer);
      if (signal) signal.removeEventListener("abort", onAbort);
      const err = new Error("Aborted during sleep.");
      err.name = "AbortError";
      reject(err);
    };

    if (signal) {
      signal.addEventListener("abort", onAbort, { once: true });
    }
  });
}

/**
 * Generates a random alphanumeric identifier with an optional prefix.
 * @param {string} [prefix="id"] - Prefix for the generated ID
 * @param {number} [length=8] - Random character length
 * @returns {string} Unique ID string
 */
export function generateId(prefix = "id", length = 8) {
  const rand = Math.random().toString(36).substring(2, 2 + length);
  return prefix ? `${prefix}_${rand}` : rand;
}

/**
 * Extracts and parses a JSON object or array from raw LLM output text.
 * Handles markdown ```json blocks and raw { ... } / [ ... ] substrings.
 * @param {string} rawText - Raw text output from LLM
 * @returns {any|null} Parsed JSON object/array, or null if parsing failed
 */
export function extractJsonFromText(rawText) {
  if (!rawText || typeof rawText !== "string") return null;

  // 1. Check for markdown code fence
  const jsonBlockMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (jsonBlockMatch && jsonBlockMatch[1]) {
    try {
      return JSON.parse(jsonBlockMatch[1].trim());
    } catch {
      // Fall through to brace extraction
    }
  }

  // 2. Look for outermost curly braces { ... }
  const firstBrace = rawText.indexOf("{");
  const lastBrace = rawText.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    try {
      return JSON.parse(rawText.slice(firstBrace, lastBrace + 1).trim());
    } catch {
      // Fall through to array check
    }
  }

  // 3. Look for outermost square brackets [ ... ]
  const firstBracket = rawText.indexOf("[");
  const lastBracket = rawText.lastIndexOf("]");
  if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
    try {
      return JSON.parse(rawText.slice(firstBracket, lastBracket + 1).trim());
    } catch {
      // Failed
    }
  }

  return null;
}

/**
 * Safe clipboard copy utility with fallback.
 * @param {string} text - Text to copy
 * @returns {Promise<boolean>} True if successful
 */
export async function copyToClipboard(text) {
  if (!text) return false;
  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (err) {
    console.warn("[Utils] Clipboard API write failed:", err);
  }

  // Fallback for older environments
  try {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    const successful = document.execCommand("copy");
    document.body.removeChild(textarea);
    return successful;
  } catch {
    return false;
  }
}
