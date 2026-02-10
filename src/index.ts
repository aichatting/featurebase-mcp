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

    // Session-based transport: each client gets a dedicated MCP server+transport.
    const sessions = new Map<string, StreamableHTTPServerTransport>();

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
        try {
          const sessionId = req.headers["mcp-session-id"] as string | undefined;

          // Session ID provided: it must already exist.
          if (sessionId) {
            const sessionTransport = sessions.get(sessionId);
            if (!sessionTransport) {
              res.writeHead(404);
              res.end("Session not found");
              return;
            }
            console.error(`  -> session ${sessionId}`);
            await sessionTransport.handleRequest(req, res);
            if (req.method === "DELETE") sessions.delete(sessionId);
            console.error(`  <- ${res.statusCode}`);
            return;
          }

          // Create a new session on POST when no valid session ID exists.
          if (req.method === "POST") {
            console.error("  -> new session");

            const transport = new StreamableHTTPServerTransport({
              sessionIdGenerator: () => crypto.randomUUID(),
              enableJsonResponse: true,
            });
            transport.onerror = (err) => console.error("  !! transport error:", err);
            transport.onclose = () => {
              if (transport.sessionId) sessions.delete(transport.sessionId);
            };

            const mcpServer = createServer();
            await mcpServer.connect(transport);
            await transport.handleRequest(req, res);

            if (transport.sessionId) {
              sessions.set(transport.sessionId, transport);
              console.error(`  <- ${res.statusCode} (session: ${transport.sessionId})`);
            } else {
              console.error(`  <- ${res.statusCode} (no session ID)`);
            }
          } else if (req.method === "GET") {
            res.writeHead(400);
            res.end("Missing mcp-session-id");
          } else if (req.method === "DELETE") {
            res.writeHead(404);
            res.end("Session not found");
          } else {
            res.writeHead(405);
            res.end("Method not allowed");
          }
        } catch (err) {
          console.error(`  !! MCP ERROR:`, err);
          if (!res.headersSent) {
            res.writeHead(500, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ jsonrpc: "2.0", error: { code: -32603, message: String(err) }, id: null }));
          }
        }
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
