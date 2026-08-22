/**
 * File & Document Parsing, Multi-format Conversion, Large File Budgeting, and Semantic Search Chunking
 */

import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";
import pdfWorker from "pdfjs-dist/legacy/build/pdf.worker.mjs?url";
import mammoth from "mammoth";
import { generateId } from "./helpers.js";
import { estimateTokens } from "./tokens.js";

// Configure GlobalWorkerOptions.workerSrc for pdfjs-dist
if (pdfjsLib.GlobalWorkerOptions) {
  try {
    pdfjsLib.GlobalWorkerOptions.workerSrc =
      pdfWorker ||
      `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version || "6.2.108"}/pdf.worker.min.mjs`;
  } catch {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version || "6.2.108"}/pdf.worker.min.mjs`;
  }
}

// Token limit threshold beyond which full content is omitted from the raw turn prompt
// to preserve the 16,000-token context budget. Tools (grep, file_search) are used to query large files.
export const LARGE_FILE_TOKEN_THRESHOLD = 3500;

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
    tsv: "tsv",
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
    pdf: "pdf",
    docx: "docx",
    doc: "docx",
  };
  return map[ext] || "text";
}

/**
 * Cleanly extracts plain text from a PDF ArrayBuffer page-by-page.
 *
 * @param {ArrayBuffer} arrayBuffer
 * @returns {Promise<{ fullText: string, pageCount: number, pages: Array<{ pageNumber: number, text: string }> }>}
 */
export async function extractTextFromPdf(arrayBuffer) {
  try {
    if (pdfjsLib.GlobalWorkerOptions && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
      pdfjsLib.GlobalWorkerOptions.workerSrc =
        pdfWorker ||
        `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version || "6.2.108"}/pdf.worker.min.mjs`;
    }

    const loadingTask = pdfjsLib.getDocument({
      data: arrayBuffer,
      isEvalSupported: false,
      useSystemFonts: true,
      disableFontFace: true,
    });
    const pdf = await loadingTask.promise;
    const pages = [];
    const fullTextParts = [];

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item) => item.str)
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();

      pages.push({ pageNumber: i, text: pageText });
      fullTextParts.push(`--- Page ${i} ---\n${pageText}`);
    }

    const fullText = fullTextParts.join("\n\n");
    return {
      fullText: fullText.trim(),
      pageCount: pdf.numPages,
      pages,
    };
  } catch (err) {
    console.error("PDF text extraction error:", err);
    throw new Error(`Failed to parse PDF: ${err.message}`);
  }
}

/**
 * Cleanly extracts text from a Word (.docx) ArrayBuffer.
 *
 * @param {ArrayBuffer} arrayBuffer
 * @returns {Promise<{ fullText: string }>}
 */
export async function extractTextFromDocx(arrayBuffer) {
  try {
    const result = await mammoth.extractRawText({ arrayBuffer });
    return {
      fullText: (result.value || "").trim(),
    };
  } catch (err) {
    console.error("DOCX extraction error:", err);
    throw new Error(`Failed to parse Word document: ${err.message}`);
  }
}

/**
 * Splits document text into semantic chunks for BM25 and semantic keyword queries.
 *
 * @param {string} text - Full text of the document
 * @param {object} options - Chunking options
 * @returns {Array<{ chunkIndex: number, text: string, startLine: number, endLine: number, pageNumber?: number }>}
 */
export function chunkDocument(text = "", options = {}) {
  const chunkSize = options.chunkSize || 1200; // characters per chunk (~300 tokens)
  const overlap = options.overlap || 200;

  if (!text) return [];

  const chunks = [];
  const lines = text.split("\n");
  let currentChunkLines = [];
  let currentLength = 0;
  let chunkStartLine = 1;
  let chunkIdx = 1;
  let currentPage = 1;

  for (let l = 0; l < lines.length; l++) {
    const line = lines[l];
    const pageMatch = line.match(/^---\s*Page\s*(\d+)\s*---/i);
    if (pageMatch) {
      currentPage = parseInt(pageMatch[1], 10);
    }

    currentChunkLines.push(line);
    currentLength += line.length + 1;

    if (currentLength >= chunkSize || l === lines.length - 1) {
      const chunkText = currentChunkLines.join("\n").trim();
      if (chunkText.length > 0) {
        chunks.push({
          chunkIndex: chunkIdx++,
          text: chunkText,
          startLine: chunkStartLine,
          endLine: l + 1,
          pageNumber: currentPage,
        });
      }

      // Overlap by keeping trailing lines
      const keepLines = [];
      let overlapLen = 0;
      for (let k = currentChunkLines.length - 1; k >= 0; k--) {
        overlapLen += currentChunkLines[k].length + 1;
        keepLines.unshift(currentChunkLines[k]);
        if (overlapLen >= overlap) break;
      }

      currentChunkLines = keepLines;
      currentLength = overlapLen;
      chunkStartLine = l + 1 - keepLines.length + 1;
    }
  }

  return chunks;
}

/**
 * Process a raw browser File object into a serialized attachment payload.
 * Cleanly handles PDFs, DOCX, Spreadsheets, Code, JSON, Markdown, Text, and Images.
 *
 * @param {File} file - Browser File object
 * @returns {Promise<object>} Processed file object with metadata and clean text content
 */
export async function processUploadedFile(file) {
  if (!file) throw new Error("No file provided");

  const id = generateId("file");
  const name = file.name || "untitled";
  const size = file.size || 0;
  const type = file.type || "application/octet-stream";
  const extension = (name.split(".").pop() || "").toLowerCase();
  const formattedSize = formatFileSize(size);

  // 1. Image Formats (PNG, JPG, WebP, GIF, SVG, BMP)
  const isImage =
    type.startsWith("image/") || ["png", "jpg", "jpeg", "webp", "gif", "svg", "bmp"].includes(extension);

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
          formattedSize,
          type: type || (extension === "png" ? "image/png" : "image/jpeg"),
          extension,
          isImage: true,
          isLargeFile: false,
          dataUrl,
          base64Data,
        });
      };
      reader.onerror = (err) => reject(new Error(`Failed to read image file "${name}": ${err.message}`));
      reader.readAsDataURL(file);
    });
  }

  // 2. PDF Documents (.pdf) - Page-by-Page Clean Text Extraction
  if (extension === "pdf") {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const arrayBuffer = reader.result;
          const { fullText, pageCount, pages } = await extractTextFromPdf(arrayBuffer);
          const estimatedTokens = estimateTokens(fullText);
          const isLargeFile = estimatedTokens > LARGE_FILE_TOKEN_THRESHOLD;
          const lines = fullText.split("\n");

          // Clean preview snippet from first page
          const firstPagePreview = pages[0]?.text
            ? `Page 1: ${pages[0].text.slice(0, 240)}...`
            : fullText.slice(0, 240);

          resolve({
            id,
            name,
            size,
            formattedSize,
            type: "application/pdf",
            extension: "pdf",
            isImage: false,
            isLargeFile,
            pageCount,
            estimatedTokens,
            textContent: fullText,
            language: "pdf",
            linesCount: lines.length,
            snippet: `PDF Document (${pageCount} page${pageCount > 1 ? "s" : ""}, ${lines.length} lines)\n${firstPagePreview}`,
          });
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = (err) => reject(new Error(`Failed to read PDF file "${name}": ${err.message}`));
      reader.readAsArrayBuffer(file);
    });
  }

  // 3. Word Documents (.docx, .doc)
  if (extension === "docx" || extension === "doc") {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const arrayBuffer = reader.result;
          const { fullText } = await extractTextFromDocx(arrayBuffer);
          const estimatedTokens = estimateTokens(fullText);
          const isLargeFile = estimatedTokens > LARGE_FILE_TOKEN_THRESHOLD;
          const lines = fullText.split("\n");

          resolve({
            id,
            name,
            size,
            formattedSize,
            type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            extension,
            isImage: false,
            isLargeFile,
            estimatedTokens,
            textContent: fullText,
            language: "docx",
            linesCount: lines.length,
            snippet: `Word Document (${lines.length} lines)\n${fullText.slice(0, 240)}...`,
          });
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = (err) => reject(new Error(`Failed to read Word document "${name}": ${err.message}`));
      reader.readAsArrayBuffer(file);
    });
  }

  // 4. Text, Code, Markdown, JSON, CSV, Spreadsheets, etc.
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const rawText = reader.result || "";
      const language = detectLanguageFromFilename(name);
      const lines = rawText.split("\n");
      const estimatedTokens = estimateTokens(rawText);
      const isLargeFile = estimatedTokens > LARGE_FILE_TOKEN_THRESHOLD;

      resolve({
        id,
        name,
        size,
        formattedSize,
        type: type || "text/plain",
        extension,
        isImage: false,
        isLargeFile,
        estimatedTokens,
        textContent: rawText,
        language,
        linesCount: lines.length,
        snippet: rawText.slice(0, 300),
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
  if (fileData.pageCount) {
    desc += ` Contains ${fileData.pageCount} page(s).`;
  }
  if (!isImage && fileData.textContent) {
    const lines = fileData.textContent.split("\n");
    const preview = fileData.textContent.slice(0, 200).replace(/\s+/g, " ");
    desc += ` Contains ${lines.length} lines of ${fileData.language || "text"}. Preview: "${preview}..."`;
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
      isLargeFile: Boolean(fileData.isLargeFile),
      pageCount: fileData.pageCount || null,
      estimatedTokens: fileData.estimatedTokens || null,
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
  if (!isImage && fileData.language && fileData.language !== "text" && fileData.language !== "pdf" && fileData.language !== "docx") {
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
