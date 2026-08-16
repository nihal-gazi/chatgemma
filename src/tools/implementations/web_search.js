/**
 * Web Search Tool for ChatGemma
 * Searches public web sources (DuckDuckGo, Wikipedia, Search APIs) with CORS-friendly fallbacks.
 */

export const webSearchTool = {
  name: "web_search",
  displayName: "Web Search",
  iconName: "Globe",
  description:
    "Search the live web for real-time information, documentation, news, facts, and external knowledge. Returns a list of search results with titles, summaries, and URLs.",
  parameters: {
    type: "OBJECT",
    properties: {
      query: {
        type: "STRING",
        description: "The search query keywords to look up on the web.",
      },
      numResults: {
        type: "INTEGER",
        description: "Optional number of results to return (default 5).",
      },
    },
    required: ["query"],
  },
  renderSummary: (args) => `Search: "${args.query || ""}"`,

  async execute(args, context = {}) {
    const query = (args.query || "").trim();
    const numResults = args.numResults || 5;

    if (!query) {
      return {
        query: "",
        results: [],
        error: "Search query was empty.",
      };
    }

    const results = [];

    // Strategy 1: Wikipedia Open API (Always CORS-friendly)
    try {
      const wikiUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(
        query
      )}&format=json&origin=*&utf8=1&srlimit=${numResults}`;
      
      const wikiRes = await fetch(wikiUrl);
      if (wikiRes.ok) {
        const wikiData = await wikiRes.json();
        const searchItems = wikiData?.query?.search || [];
        for (const item of searchItems) {
          const cleanSnippet = item.snippet
            .replace(/<\/?[^>]+(>|$)/g, "")
            .replace(/&quot;/g, '"')
            .replace(/&#039;/g, "'")
            .replace(/&amp;/g, "&");

          results.push({
            title: item.title,
            snippet: cleanSnippet,
            url: `https://en.wikipedia.org/wiki/${encodeURIComponent(item.title.replace(/ /g, "_"))}`,
            source: "Wikipedia",
          });
        }
      }
    } catch (e) {
      console.warn("[web_search] Wikipedia search error:", e);
    }

    // Strategy 2: DuckDuckGo Instant Answer API
    try {
      const ddgUrl = `https://api.duckduckgo.com/?q=${encodeURIComponent(
        query
      )}&format=json&no_html=1&skip_disambig=1`;
      
      const ddgRes = await fetch(ddgUrl);
      if (ddgRes.ok) {
        const ddgData = await ddgRes.json();
        if (ddgData.AbstractText) {
          results.unshift({
            title: ddgData.Heading || query,
            snippet: ddgData.AbstractText,
            url: ddgData.AbstractURL || `https://duckduckgo.com/?q=${encodeURIComponent(query)}`,
            source: ddgData.AbstractSource || "DuckDuckGo Instant Answer",
          });
        }

        if (Array.isArray(ddgData.RelatedTopics)) {
          for (const topic of ddgData.RelatedTopics.slice(0, 3)) {
            if (topic.Text && topic.FirstURL) {
              results.push({
                title: topic.Text.split(" - ")[0] || query,
                snippet: topic.Text,
                url: topic.FirstURL,
                source: "DuckDuckGo",
              });
            }
          }
        }
      }
    } catch (e) {
      console.warn("[web_search] DuckDuckGo API error:", e);
    }

    // Strategy 3: If results are empty, provide structured search metadata link
    if (results.length === 0) {
      results.push({
        title: `Web results for: ${query}`,
        snippet: `Search completed for "${query}". Visit direct search portals for complete index.`,
        url: `https://duckduckgo.com/?q=${encodeURIComponent(query)}`,
        source: "DuckDuckGo Web",
      });
    }

    return {
      query,
      count: results.length,
      results: results.slice(0, numResults),
    };
  },
};
