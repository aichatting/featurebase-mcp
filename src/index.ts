import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import http from "node:http";
import crypto from "node:crypto";
import { FeaturebaseClient } from "./client/featurebase-client.js";

import { registerPostsTools } from "./tools/posts.js";
import { registerPostVotersTools } from "./tools/post-voters.js";
import { registerCommentsTools } from "./tools/comments.js";
import { registerChangelogsTools } from "./tools/changelogs.js";
import { registerChangelogSubscribersTools } from "./tools/changelog-subscribers.js";
import { registerHelpCentersTools } from "./tools/help-centers.js";
import { registerCollectionsTools } from "./tools/collections.js";
import { registerArticlesTools } from "./tools/articles.js";
import { registerContactsTools } from "./tools/contacts.js";
import { registerConversationsTools } from "./tools/conversations.js";
import { registerConversationParticipantsTools } from "./tools/conversation-participants.js";
import { registerConversationRedactTools } from "./tools/conversation-redact.js";
import { registerBoardsTools } from "./tools/boards.js";
import { registerPostStatusesTools } from "./tools/post-statuses.js";
import { registerCompaniesTools } from "./tools/companies.js";
import { registerCompanyContactsTools } from "./tools/company-contacts.js";
import { registerTeamsTools } from "./tools/teams.js";
import { registerWebhooksTools } from "./tools/webhooks.js";
import { registerAdminsTools } from "./tools/admins.js";

const apiKey = process.env.FEATUREBASE_API_KEY;
if (!apiKey) {
  console.error("FEATUREBASE_API_KEY environment variable is required");
  process.exit(1);
}

const client = new FeaturebaseClient(apiKey);

const server = new McpServer({
  name: "featurebase",
  version: "1.0.0",
});

registerPostsTools(server, client);
registerPostVotersTools(server, client);
registerCommentsTools(server, client);
registerChangelogsTools(server, client);
registerChangelogSubscribersTools(server, client);
registerHelpCentersTools(server, client);
registerCollectionsTools(server, client);
registerArticlesTools(server, client);
registerContactsTools(server, client);
registerConversationsTools(server, client);
registerConversationParticipantsTools(server, client);
registerConversationRedactTools(server, client);
registerBoardsTools(server, client);
registerPostStatusesTools(server, client);
registerCompaniesTools(server, client);
registerCompanyContactsTools(server, client);
registerTeamsTools(server, client);
registerWebhooksTools(server, client);
registerAdminsTools(server, client);

const MODE = process.env.MCP_TRANSPORT || "stdio";
const PORT = parseInt(process.env.PORT || "3000", 10);
const MCP_API_KEY = process.env.MCP_API_KEY || crypto.randomUUID();

function authenticate(req: http.IncomingMessage, res: http.ServerResponse): boolean {
  const auth = req.headers.authorization;
  const url = new URL(req.url || "/", `http://localhost:${PORT}`);
  const queryKey = url.searchParams.get("key");
  const token = auth?.startsWith("Bearer ") ? auth.slice(7) : queryKey;

  if (token !== MCP_API_KEY) {
    res.writeHead(401, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Unauthorized" }));
    return false;
  }
  return true;
}

async function main() {
  if (MODE === "sse") {
    if (!process.env.MCP_API_KEY) {
      console.error(`Generated MCP_API_KEY: ${MCP_API_KEY}`);
      console.error("Set MCP_API_KEY env var to use a fixed key.");
    }

    let sseTransport: SSEServerTransport | null = null;

    const httpServer = http.createServer(async (req, res) => {
      const url = new URL(req.url || "/", `http://localhost:${PORT}`);

      if (req.method === "GET" && url.pathname === "/health") {
        res.writeHead(200);
        res.end("ok");
        return;
      }

      if (!authenticate(req, res)) return;

      if (req.method === "GET" && url.pathname === "/sse") {
        sseTransport = new SSEServerTransport("/messages", res);
        await server.connect(sseTransport);
      } else if (req.method === "POST" && url.pathname === "/messages") {
        if (sseTransport) {
          await sseTransport.handlePostMessage(req, res);
        } else {
          res.writeHead(400);
          res.end("Not connected");
        }
      } else {
        res.writeHead(404);
        res.end("Not found");
      }
    });

    httpServer.listen(PORT, () => {
      console.error(`Featurebase MCP server running on http://localhost:${PORT}/sse`);
    });
  } else {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("Featurebase MCP server running on stdio");
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
