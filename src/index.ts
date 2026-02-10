import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import http from "node:http";
import crypto from "node:crypto";
import { FeaturebaseClient } from "./client/featurebase-client.js";
import { OAuthProvider } from "./auth.js";

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

const fbClient = new FeaturebaseClient(apiKey);

function createServer(): McpServer {
  const server = new McpServer({
    name: "featurebase",
    version: "1.0.0",
  });

  registerPostsTools(server, fbClient);
  registerPostVotersTools(server, fbClient);
  registerCommentsTools(server, fbClient);
  registerChangelogsTools(server, fbClient);
  registerChangelogSubscribersTools(server, fbClient);
  registerHelpCentersTools(server, fbClient);
  registerCollectionsTools(server, fbClient);
  registerArticlesTools(server, fbClient);
  registerContactsTools(server, fbClient);
  registerConversationsTools(server, fbClient);
  registerConversationParticipantsTools(server, fbClient);
  registerConversationRedactTools(server, fbClient);
  registerBoardsTools(server, fbClient);
  registerPostStatusesTools(server, fbClient);
  registerCompaniesTools(server, fbClient);
  registerCompanyContactsTools(server, fbClient);
  registerTeamsTools(server, fbClient);
  registerWebhooksTools(server, fbClient);
  registerAdminsTools(server, fbClient);

  return server;
}

const MODE = process.env.MCP_TRANSPORT || "stdio";
const PORT = parseInt(process.env.PORT || "3000", 10);
const SERVER_URL = process.env.SERVER_URL || `http://localhost:${PORT}`;

async function main() {
  if (MODE === "http") {
    const oauth = new OAuthProvider(SERVER_URL);

    // Single stateless transport — no sessions needed
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
    });
    const mcpServer = createServer();
    await mcpServer.connect(transport);
    console.error("MCP server connected with 69 tools");

    const httpServer = http.createServer(async (req, res) => {
      const url = new URL(req.url || "/", SERVER_URL);
      console.error(`[${new Date().toISOString()}] ${req.method} ${url.pathname}`);

      // Health check
      if (req.method === "GET" && url.pathname === "/health") {
        res.writeHead(200);
        res.end("ok");
        return;
      }

      // OAuth endpoints (metadata, register, authorize, token)
      if (await oauth.handleRequest(req, res)) {
        console.error(`  -> OAuth`);
        return;
      }

      // MCP endpoint
      if (url.pathname === "/mcp") {
        console.error(`  -> MCP`);
        await transport.handleRequest(req, res);
      } else {
        res.writeHead(404);
        res.end("Not found");
      }
    });

    httpServer.listen(PORT, () => {
      console.error(`Featurebase MCP server running on ${SERVER_URL}/mcp`);
      console.error(`OAuth metadata at ${SERVER_URL}/.well-known/oauth-authorization-server`);
    });
  } else {
    const server = createServer();
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("Featurebase MCP server running on stdio");
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
