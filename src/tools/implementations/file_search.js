/**
 * File Search & Inspection Tool for ChatGemma
 * Enables Gemma to search, inspect, and retrieve full contents or snippets
 * from all uploaded files, code repositories, documents, and images.
 */

export const fileSearchTool = {
  name: "file_search",
  displayName: "Uploaded Files Search",
  iconName: "FileSearch",
  description:
    "Searches and inspects uploaded files, code, documents, and images attached across conversations. Retrieves matching lines, excerpts, file structure, or full file contents by query, filename, or file ID.",
  parameters: {
    type: "OBJECT",
    properties: {
      query: {
        type: "STRING",
        description: "Search keyword, function/variable name, phrase, filename, or file ID to look for inside uploaded files.",
      },
      target: {
        type: "STRING",
        enum: ["current_chat", "all_chats"],
        description: "Search scope: 'current_chat' for active conversation files, or 'all_chats' for all historical uploads.",
      },
      includeFullContent: {
        type: "BOOLEAN",
        description: "If true, returns the full file content instead of preview snippets (useful when you need the whole file to edit or analyze).",
      },
      fileType: {
        type: "STRING",
        enum: ["all", "code", "document", "image"],
        description: "Optional filter for file category (default: 'all').",
      },
    },
    required: ["query"],
  },
  renderSummary: (args) => `File Search: "${args.query || ""}" (${args.target || "current_chat"})`,

  async execute(args, context = {}) {
    const query = (args.query || "").trim();
    const target = args.target || "current_chat";
    const includeFull = Boolean(args.includeFullContent);
    const fileType = args.fileType || "all";

    if (!query) {
      return {
        query: "",
        matches: [],
        totalFilesFound: 0,
        error: "Query was empty. Please provide a search term or filename.",
      };
    }

    const cleanQuery = query.toLowerCase();
    const sessionsToSearch = [];

    if (target === "all_chats" && Array.isArray(context.sessions)) {
      sessionsToSearch.push(...context.sessions);
    } else if (context.activeSession) {
      sessionsToSearch.push(context.activeSession);
    }

    const matchedFiles = [];
    const seenFileIds = new Set();

    for (const session of sessionsToSearch) {
      const messages = session.messages || [];

      for (const msg of messages) {
        if (!Array.isArray(msg.files) || msg.files.length === 0) continue;

        for (const file of msg.files) {
          if (seenFileIds.has(file.id)) continue;

          // Category filter
          if (fileType === "image" && !file.isImage) continue;
          if (fileType === "code" && (file.isImage || file.language === "text")) continue;
          if (fileType === "document" && file.isImage) continue;

          const nameMatch = file.name?.toLowerCase().includes(cleanQuery);
          const langMatch = file.language?.toLowerCase().includes(cleanQuery);
          const contentMatch =
            !file.isImage &&
            typeof file.textContent === "string" &&
            file.textContent.toLowerCase().includes(cleanQuery);

          if (nameMatch || langMatch || contentMatch || query === "*" || query === file.id) {
            seenFileIds.add(file.id);

            const resultEntry = {
              fileId: file.id,
              fileName: file.name,
              formattedSize: file.formattedSize,
              isImage: Boolean(file.isImage),
              language: file.language || (file.isImage ? "image" : "text"),
              sessionTitle: session.title,
              sessionId: session.id,
              uploadedAt: msg.timestamp || "",
            };

            if (file.isImage) {
              resultEntry.description = `Image file (${file.type || "image"}, ${file.formattedSize}). Available for vision inspection.`;
            } else if (file.textContent) {
              resultEntry.linesCount = file.linesCount || file.textContent.split("\n").length;

              if (includeFull) {
                resultEntry.fullContent = file.textContent;
              } else {
                // Extract matching snippet lines
                const lines = file.textContent.split("\n");
                const matchingLines = [];
                for (let lIdx = 0; lIdx < lines.length; lIdx++) {
                  if (lines[lIdx].toLowerCase().includes(cleanQuery)) {
                    matchingLines.push({
                      lineNumber: lIdx + 1,
                      text: lines[lIdx].trim(),
                    });
                    if (matchingLines.length >= 8) break;
                  }
                }
                resultEntry.matchingSnippets =
                  matchingLines.length > 0
                    ? matchingLines
                    : [{ lineNumber: 1, text: file.textContent.slice(0, 200) }];
              }
            }

            matchedFiles.push(resultEntry);
          }
        }
      }
    }

    // Also search Knowledge Graph file entities for relevant knowledge context
    const kgMatches = [];
    if (context.knowledgeGraph) {
      const kgResult = context.knowledgeGraph.search(query, { types: ["File", "Document", "Image"], limit: 5 });
      if (kgResult && kgResult.matchedEntities && kgResult.matchedEntities.length > 0) {
        for (const ent of kgResult.matchedEntities) {
          kgMatches.push({
            name: ent.name,
            types: ent.types,
            description: ent.description,
            metadata: ent.metadata,
          });
        }
      }
    }

    return {
      query,
      target,
      totalFilesFound: matchedFiles.length,
      files: matchedFiles.slice(0, 15),
      knowledgeGraphReferences: kgMatches,
      summary: `Found ${matchedFiles.length} file(s) matching "${query}".`,
    };
  },
};
