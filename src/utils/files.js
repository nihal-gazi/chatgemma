/**
 * File & Image Processing, Multimodal Conversion, and Knowledge Graph Entity Extraction
 */

import { generateId } from "./helpers.js";

/**
 * Format bytes into human-readable string.
 * @param {number} bytes
 * @returns {string} e.g. "12.4 KB"
 */
export function formatFileSize(bytes = 0) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

/**
 * Detect language identifier for syntax highlighting from file extension.
 * @param {string} filename
 * @returns {string} Language identifier (e.g. "javascript", "python")
 */
export function detectLanguageFromFilename(filename = "") {
  const ext = (filename.split(".").pop() || "").toLowerCase();
  const map = {
    js: "javascript",
    jsx: "javascript",
    ts: "typescript",
    tsx: "typescript",
    py: "python",
    json: "json",
    html: "html",
    htm: "html",
    css: "css",
    scss: "css",
    md: "markdown",
    markdown: "markdown",
    csv: "csv",
    c: "c",
    cpp: "cpp",
    h: "cpp",
    cs: "csharp",
    java: "java",
    rs: "rust",
    go: "go",
    sql: "sql",
    yaml: "yaml",
    yml: "yaml",
    sh: "bash",
    bash: "bash",
    xml: "xml",
    txt: "text",
  };
  return map[ext] || "text";
}

/**
 * Process a raw browser File object into a serialized attachment payload.
 * Supports all image formats, text files, code files, CSV, JSON, Markdown, and documents.
 *
 * @param {File} file - Browser File object
 * @returns {Promise<object>} Processed file object with metadata, base64 data, or text content
 */
export async function processUploadedFile(file) {
  if (!file) throw new Error("No file provided");

  const id = generateId("file");
  const name = file.name || "untitled";
  const size = file.size || 0;
  const type = file.type || "application/octet-stream";
  const extension = (name.split(".").pop() || "").toLowerCase();
  const isImage = type.startsWith("image/") || ["png", "jpg", "jpeg", "webp", "gif", "svg", "bmp"].includes(extension);

  if (isImage) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result;
        const commaIdx = dataUrl.indexOf(",");
        const base64Data = commaIdx !== -1 ? dataUrl.substring(commaIdx + 1) : dataUrl;

        resolve({
          id,
          name,
          size,
          formattedSize: formatFileSize(size),
          type: type || (extension === "png" ? "image/png" : "image/jpeg"),
          extension,
          isImage: true,
          dataUrl,
          base64Data,
        });
      };
      reader.onerror = (err) => reject(new Error(`Failed to read image file "${name}": ${err.message}`));
      reader.readAsDataURL(file);
    });
  }

  // Text, code, document, markdown, JSON, CSV files
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const textContent = reader.result || "";
      const lines = textContent.split("\n");
      const language = detectLanguageFromFilename(name);

      resolve({
        id,
        name,
        size,
        formattedSize: formatFileSize(size),
        type,
        extension,
        isImage: false,
        textContent,
        language,
        linesCount: lines.length,
        snippet: textContent.slice(0, 300),
      });
    };
    reader.onerror = (err) => reject(new Error(`Failed to read document file "${name}": ${err.message}`));
    reader.readAsText(file);
  });
}

/**
 * Extracts structured Knowledge Graph entities & relations from an uploaded file.
 *
 * @param {object} fileData - Processed file object from processUploadedFile()
 * @param {string} [sessionId=""] - Associated session ID
 * @returns {object} { entity, relations } ready for KnowledgeGraph ingestion
 */
export function extractFileKnowledgeEntities(fileData, sessionId = "") {
  if (!fileData || !fileData.name) return null;

  const cleanName = fileData.name.trim();
  const isImage = Boolean(fileData.isImage);
  const types = isImage ? ["File", "Image"] : ["File", "Document"];

  let desc = `Uploaded ${isImage ? "image" : "document"} "${cleanName}" (${fileData.formattedSize || formatFileSize(fileData.size)}).`;
  if (!isImage && fileData.textContent) {
    const lines = fileData.textContent.split("\n");
    const preview = fileData.textContent.slice(0, 200).replace(/\s+/g, " ");
    desc += ` Contains ${lines.length} lines of ${fileData.language || "text"}. Excerpt: "${preview}..."`;
  }

  const entity = {
    name: cleanName,
    types,
    description: desc,
    aliases: [cleanName, cleanName.split(".")[0]],
    metadata: {
      fileId: fileData.id,
      size: fileData.size,
      formattedSize: fileData.formattedSize,
      type: fileData.type,
      extension: fileData.extension,
      isImage,
      language: fileData.language || null,
      linesCount: fileData.linesCount || null,
    },
    sourceSession: sessionId,
  };

  const relations = [];

  // 1. Relate file to session
  if (sessionId) {
    relations.push({
      source: cleanName,
      predicate: "ATTACHED_TO",
      target: sessionId,
      description: `File "${cleanName}" was uploaded and attached in chat session ${sessionId}.`,
      confidence: 1.0,
      sourceSession: sessionId,
    });
  }

  // 2. Relate code files to their language/framework
  if (!isImage && fileData.language && fileData.language !== "text") {
    relations.push({
      source: cleanName,
      predicate: "USES",
      target: fileData.language.toUpperCase(),
      description: `File "${cleanName}" is written in ${fileData.language}.`,
      confidence: 0.95,
      sourceSession: sessionId,
    });
  }

  return { entity, relations };
}
