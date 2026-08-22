/**
 * Semantic & BM25 File Search Tool for ChatGemma
 * Enables Gemma to semantically search, score, and retrieve ranked excerpts or full contents
 * from all uploaded files, PDFs, DOCX, code repositories, and documents.
 */

import { chunkDocument } from "../../utils/files.js";

/**
 * Fast BM25 / TF-IDF semantic relevance scorer for text chunks.
 */
function scoreChunk(chunkText, queryTerms, rawQuery) {
  if (!chunkText || queryTerms.length === 0) return 0;

  const lowerChunk = chunkText.toLowerCase();
  let score = 0;

  // 1. Exact phrase match bonus
  if (lowerChunk.includes(rawQuery)) {
    score += 8.0;
  }

  // 2. Heading / Section Title bonus (lines starting with #, ---, or capital titles)
  const lines = chunkText.split("\n");
  for (const line of lines.slice(0, 3)) {
    const lowerLine = line.toLowerCase();
    for (const term of queryTerms) {
      if (lowerLine.includes(term)) {
        score += 3.0;
      }
    }
  }

  // 3. Keyword Term Frequency (TF)
  for (const term of queryTerms) {
    if (term.length < 2) continue;
    let count = 0;
    let pos = lowerChunk.indexOf(term);
    while (pos !== -1) {
      count++;
      pos = lowerChunk.indexOf(term, pos + term.length);
    }

    if (count > 0) {
      // Saturation formula: count / (count + 1.2)
      score += (count / (count + 1.2)) * Math.log(1 + 10 / Math.max(count, 1));
    }
  }

  return score;
}

export const fileSearchTool = {
  name: "file_search",
  displayName: "Uploaded Files Search",
  iconName: "FileSearch",
  description:
    "Semantically searches and inspects uploaded documents (PDFs, DOCX, Code, CSVs, TXT) across conversations using BM25 relevance scoring. Retrieves matching ranked passages, page excerpts, line ranges, or full file contents.",
  parameters: {
    type: "OBJECT",
    properties: {
      query: {
        type: "STRING",
        description: "Semantic query, concept, question, function/variable name, phrase, or topic to search for in files.",
      },
      fileName: {
        type: "STRING",
        description: "Optional filename or keyword to restrict search to a specific attached file (e.g. 'paper.pdf', 'report.docx', 'app.py').",
      },
      page: {
        type: "INTEGER",
        description: "Optional specific page number to retrieve directly from a PDF document.",
      },
      target: {
        type: "STRING",
        enum: ["current_chat", "all_chats"],
        description: "Search scope: 'current_chat' for active conversation files, or 'all_chats' across all chat history.",
      },
      includeFullContent: {
        type: "BOOLEAN",
        description: "If true, returns the complete full file content instead of ranked passages (useful for editing or comprehensive analysis).",
      },
      maxResults: {
        type: "INTEGER",
        description: "Maximum number of ranked semantic passages to return (default: 5).",
      },
    },
    required: ["query"],
  },
  renderSummary: (args) =>
    `File Search: "${args.query || ""}"${args.fileName ? ` in "${args.fileName}"` : ""}`,

  async execute(args, context = {}) {
    const rawQuery = (args.query || "").trim().toLowerCase();
    const filterFileName = (args.fileName || "").trim().toLowerCase();
    const filterPage = args.page ? parseInt(args.page, 10) : null;
    const target = args.target || "current_chat";
    const includeFull = Boolean(args.includeFullContent);
    const maxResults = Math.min(Math.max(args.maxResults || 5, 1), 15);

    if (!rawQuery && !filterPage) {
      return {
        query: "",
        results: [],
        totalFilesScanned: 0,
        error: "Query was empty. Please provide a search topic, keyword, or page number.",
      };
    }

    const queryTerms = rawQuery
      .split(/\s+/)
      .map((t) => t.replace(/[^a-z0-9_]/g, ""))
      .filter((t) => t.length > 1);

    const sessionsToSearch = [];
    if (target === "all_chats" && Array.isArray(context.sessions)) {
      sessionsToSearch.push(...context.sessions);
    } else if (context.activeSession) {
      sessionsToSearch.push(context.activeSession);
    }

    const matchedFiles = [];
    const rankedPassages = [];
    let totalFilesScanned = 0;

    for (const session of sessionsToSearch) {
      const messages = session.messages || [];

      for (const msg of messages) {
        if (!Array.isArray(msg.files) || msg.files.length === 0) continue;

        for (const file of msg.files) {
          totalFilesScanned++;

          if (filterFileName && !file.name.toLowerCase().includes(filterFileName)) {
            continue;
          }

          if (file.isImage) {
            // Image matching by filename or query
            if (rawQuery === "*" || file.name.toLowerCase().includes(rawQuery)) {
              matchedFiles.push({
                fileId: file.id,
                fileName: file.name,
                formattedSize: file.formattedSize,
                isImage: true,
                type: file.type,
                sessionTitle: session.title,
                sessionId: session.id,
                description: `Image file available for visual inspection.`,
              });
            }
            continue;
          }

          if (!file.textContent) continue;

          // Full content request
          if (includeFull) {
            matchedFiles.push({
              fileId: file.id,
              fileName: file.name,
              formattedSize: file.formattedSize,
              isImage: false,
              language: file.language,
              pageCount: file.pageCount,
              linesCount: file.linesCount,
              sessionTitle: session.title,
              sessionId: session.id,
              fullContent: file.textContent,
            });
            continue;
          }

          // Page-specific request (for PDFs)
          if (filterPage) {
            const lines = file.textContent.split("\n");
            const pageLines = [];
            let inTargetPage = false;

            for (const line of lines) {
              const pMatch = line.match(/^---\s*Page\s*(\d+)\s*---/i);
              if (pMatch) {
                const pNum = parseInt(pMatch[1], 10);
                if (pNum === filterPage) {
                  inTargetPage = true;
                } else if (inTargetPage) {
                  break;
                }
              } else if (inTargetPage) {
                pageLines.push(line);
              }
            }

            if (pageLines.length > 0) {
              rankedPassages.push({
                fileName: file.name,
                fileId: file.id,
                pageNumber: filterPage,
                score: 10.0,
                text: pageLines.join("\n").trim(),
                sessionTitle: session.title,
              });
              continue;
            }
          }

          // Semantic Chunk & BM25 Scoring
          const chunks = chunkDocument(file.textContent, { chunkSize: 1200, overlap: 200 });

          for (const chunk of chunks) {
            const score = scoreChunk(chunk.text, queryTerms, rawQuery);

            if (score > 0 || rawQuery === "*") {
              rankedPassages.push({
                fileName: file.name,
                fileId: file.id,
                language: file.language,
                pageNumber: chunk.pageNumber || undefined,
                startLine: chunk.startLine,
                endLine: chunk.endLine,
                score: parseFloat(score.toFixed(2)),
                text: chunk.text,
                sessionTitle: session.title,
              });
            }
          }
        }
      }
    }

    // Sort passages by BM25 semantic score descending
    rankedPassages.sort((a, b) => b.score - a.score);

    // Also search Knowledge Graph file entities
    const kgReferences = [];
    if (context.knowledgeGraph) {
      const kgResult = context.knowledgeGraph.search(rawQuery, {
        types: ["File", "Document", "Image"],
        limit: 5,
      });
      if (kgResult && kgResult.matchedEntities && kgResult.matchedEntities.length > 0) {
        for (const ent of kgResult.matchedEntities) {
          kgReferences.push({
            name: ent.name,
            types: ent.types,
            description: ent.description,
            metadata: ent.metadata,
          });
        }
      }
    }

    const topPassages = rankedPassages.slice(0, maxResults);

    return {
      query: rawQuery,
      target,
      fileNameFilter: filterFileName || undefined,
      totalFilesScanned,
      totalMatchesFound: includeFull ? matchedFiles.length : rankedPassages.length,
      results: includeFull ? matchedFiles : topPassages,
      knowledgeGraphReferences: kgReferences,
      summary: includeFull
        ? `Retrieved full content for ${matchedFiles.length} file(s).`
        : `Found ${rankedPassages.length} relevant passage(s). Showing top ${topPassages.length} ranked result(s).`,
    };
  },
};
