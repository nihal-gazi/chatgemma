/**
 * Grep Tool for ChatGemma
 * Searches with regular expressions and pattern matching across conversation messages and history.
 */

export const grepTool = {
  name: "grep",
  displayName: "Grep Search",
  iconName: "FileSearch",
  description:
    "Search using regular expressions or keyword patterns across current chat messages or all past chat sessions. Extracts matching lines, line numbers, and session context.",
  parameters: {
    type: "OBJECT",
    properties: {
      pattern: {
        type: "STRING",
        description: "The regex pattern or keyword to search for.",
      },
      target: {
        type: "STRING",
        enum: ["current_chat", "all_chats"],
        description: "Search scope: 'current_chat' for active conversation, or 'all_chats' to search across all history.",
      },
      caseSensitive: {
        type: "BOOLEAN",
        description: "Whether the regex search is case sensitive (default false).",
      },
    },
    required: ["pattern"],
  },
  renderSummary: (args) => `Grep: /${args.pattern || ""}/${args.caseSensitive ? "" : "i"}`,

  async execute(args, context = {}) {
    const patternStr = (args.pattern || "").trim();
    const target = args.target || "current_chat";
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
        const content = msg.content || "";
        const lines = content.split("\n");

        for (let lineNum = 0; lineNum < lines.length; lineNum++) {
          const line = lines[lineNum];
          // Reset regex state
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

        // Also search inside attached files in this message
        if (Array.isArray(msg.files)) {
          for (const file of msg.files) {
            if (!file.isImage && file.textContent) {
              const fileLines = file.textContent.split("\n");
              for (let fLineIdx = 0; fLineIdx < fileLines.length; fLineIdx++) {
                const fLine = fileLines[fLineIdx];
                regex.lastIndex = 0;
                if (regex.test(fLine)) {
                  matches.push({
                    sessionTitle,
                    sessionId: session.id,
                    role: msg.role,
                    fileName: file.name,
                    fileId: file.id,
                    lineNumber: fLineIdx + 1,
                    lineContent: fLine.trim(),
                    timestamp: msg.timestamp || "",
                  });
                }
              }
            }
          }
        }
      }
    }

    return {
      pattern: patternStr,
      target,
      caseSensitive,
      totalMatches: matches.length,
      matches: matches.slice(0, 50), // Cap top 50 matches for token efficiency
    };
  },
};
