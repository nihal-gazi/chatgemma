/**
 * Grep Tool for ChatGemma
 * Searches with regular expressions and pattern matching across conversation messages,
 * attached documents (PDFs, DOCX, CSVs, Code), and history.
 */

export const grepTool = {
  name: "grep",
  displayName: "Grep Search",
  iconName: "FileSearch",
  description:
    "Search using regular expressions or keyword patterns across conversation messages or any attached files (PDFs, docs, code, txt, csv). Extracts matching line numbers, page numbers, surrounding context lines, and file references.",
  parameters: {
    type: "OBJECT",
    properties: {
      pattern: {
        type: "STRING",
        description: "The regex pattern or keyword to search for (e.g. 'def calculate_profit', 'Q4 Revenue', 'TODO').",
      },
      fileName: {
        type: "STRING",
        description: "Optional filename or keyword to restrict search to a specific attached file (e.g. 'document.pdf', 'main.py').",
      },
      target: {
        type: "STRING",
        enum: ["current_chat", "all_chats"],
        description: "Search scope: 'current_chat' for active conversation files & messages, or 'all_chats' across all history.",
      },
      caseSensitive: {
        type: "BOOLEAN",
        description: "Whether the regex search is case sensitive (default false).",
      },
    },
    required: ["pattern"],
  },
  renderSummary: (args) =>
    `Grep: /${args.pattern || ""}/${args.caseSensitive ? "" : "i"}${args.fileName ? ` in "${args.fileName}"` : ""}`,

  async execute(args, context = {}) {
    const patternStr = (args.pattern || "").trim();
    const target = args.target || "current_chat";
    const filterFileName = (args.fileName || "").trim().toLowerCase();
    const caseSensitive = Boolean(args.caseSensitive);

    if (!patternStr) {
      return {
        pattern: "",
        matches: [],
        totalMatches: 0,
        error: "Search pattern was empty.",
      };
    }

    let regex;
    try {
      regex = new RegExp(patternStr, caseSensitive ? "g" : "gi");
    } catch (e) {
      return {
        pattern: patternStr,
        matches: [],
        totalMatches: 0,
        error: `Invalid regular expression: ${e.message}`,
      };
    }

    const matches = [];
    const sessionsToSearch = [];

    if (target === "all_chats" && Array.isArray(context.sessions)) {
      sessionsToSearch.push(...context.sessions);
    } else if (context.activeSession) {
      sessionsToSearch.push(context.activeSession);
    }

    for (const session of sessionsToSearch) {
      const sessionTitle = session.title || "Untitled Chat";
      const messages = session.messages || [];

      for (let msgIdx = 0; msgIdx < messages.length; msgIdx++) {
        const msg = messages[msgIdx];

        // 1. Search in message content if not specifically filtering for a file
        if (!filterFileName) {
          const content = msg.content || "";
          const lines = content.split("\n");

          for (let lineNum = 0; lineNum < lines.length; lineNum++) {
            const line = lines[lineNum];
            regex.lastIndex = 0;
            if (regex.test(line)) {
              matches.push({
                sessionTitle,
                sessionId: session.id,
                role: msg.role,
                messageIndex: msgIdx + 1,
                lineNumber: lineNum + 1,
                lineContent: line.trim(),
                timestamp: msg.timestamp || "",
              });
            }
          }
        }

        // 2. Search inside attached files in this message
        if (Array.isArray(msg.files)) {
          for (const file of msg.files) {
            if (file.isImage || !file.textContent) continue;

            if (filterFileName && !file.name.toLowerCase().includes(filterFileName)) {
              continue;
            }

            const fileLines = file.textContent.split("\n");
            let currentPage = 1;

            for (let fLineIdx = 0; fLineIdx < fileLines.length; fLineIdx++) {
              const fLine = fileLines[fLineIdx];

              // Track page boundaries for PDFs
              const pageMatch = fLine.match(/^---\s*Page\s*(\d+)\s*---/i);
              if (pageMatch) {
                currentPage = parseInt(pageMatch[1], 10);
              }

              regex.lastIndex = 0;
              if (regex.test(fLine)) {
                // Surrounding context line before and after
                const prevLine = fLineIdx > 0 ? fileLines[fLineIdx - 1].trim() : "";
                const nextLine = fLineIdx < fileLines.length - 1 ? fileLines[fLineIdx + 1].trim() : "";

                matches.push({
                  sessionTitle,
                  sessionId: session.id,
                  role: msg.role,
                  fileName: file.name,
                  fileId: file.id,
                  pageNumber: file.pageCount ? currentPage : undefined,
                  lineNumber: fLineIdx + 1,
                  lineContent: fLine.trim(),
                  contextBefore: prevLine || undefined,
                  contextAfter: nextLine || undefined,
                  timestamp: msg.timestamp || "",
                });

                if (matches.length >= 60) break;
              }
            }
          }
        }
      }
    }

    return {
      pattern: patternStr,
      fileName: filterFileName || undefined,
      target,
      caseSensitive,
      totalMatches: matches.length,
      matches: matches.slice(0, 50), // Cap top 50 matches for token efficiency
    };
  },
};
