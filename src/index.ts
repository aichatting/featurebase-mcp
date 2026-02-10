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

    // Stateful sessions (for clients that support sessions like Claude)
    const sessions = new Map<string, { transport: StreamableHTTPServerTransport; server: McpServer }>();

    const httpServer = http.createServer(async (req, res) => {
      const url = new URL(req.url || "/", SERVER_URL);
      const ts = new Date().toISOString();

      console.error(`[${ts}] ${req.method} ${req.url}`);
      console.error(`  Headers: ${JSON.stringify({
        "content-type": req.headers["content-type"],
        "accept": req.headers["accept"],
        "authorization": req.headers["authorization"] ? "Bearer ***" : undefined,
        "mcp-session-id": req.headers["mcp-session-id"],
      })}`);

      // Health check
      if (req.method === "GET" && url.pathname === "/health") {
        console.error(`  -> 200 health ok`);
        res.writeHead(200);
        res.end("ok");
        return;
      }

      // OAuth endpoints (metadata, register, authorize, token)
      if (await oauth.handleRequest(req, res)) {
        console.error(`  -> handled by OAuth provider`);
        return;
      }

      // MCP endpoint
      if (url.pathname === "/mcp") {
        const sessionId = req.headers["mcp-session-id"] as string | undefined;

        // Route to existing session if present
        if (sessionId && sessions.has(sessionId)) {
          console.error(`  -> routing to existing session ${sessionId}`);
          const session = sessions.get(sessionId)!;
          await session.transport.handleRequest(req, res);
          return;
        }

        if (req.method === "POST") {
          // Every POST without a session creates a new stateless transport+server
          // The transport will assign a session ID in the response for future requests
          console.error(`  -> new POST request (active sessions: ${sessions.size})`);

          const transport = new StreamableHTTPServerTransport({
            sessionIdGenerator: () => crypto.randomUUID(),
          });

          transport.onclose = () => {
            const sid = transport.sessionId;
            if (sid) {
              console.error(`  [session] closed: ${sid}`);
              sessions.delete(sid);
            }
          };

          const mcpServer = createServer();
          await mcpServer.connect(transport);

          console.error(`  -> server connected, handling request...`);
          await transport.handleRequest(req, res);

          if (transport.sessionId) {
            sessions.set(transport.sessionId, { transport, server: mcpServer });
            console.error(`  -> session stored: ${transport.sessionId}`);
          } else {
            console.error(`  -> WARNING: no session ID after handleRequest`);
          }
        } else if (req.method === "GET") {
          // GET without session — return proper error
          console.error(`  -> 400 no session for GET`);
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({
            jsonrpc: "2.0",
            error: { code: -32000, message: "No active session. Send an initialize POST to /mcp first." },
            id: null,
          }));
        } else if (req.method === "DELETE") {
          console.error(`  -> 404 session not found`);
          res.writeHead(404);
          res.end("Session not found");
        } else {
          res.writeHead(405);
          res.end("Method not allowed");
        }
      } else {
        console.error(`  -> 404 not found`);
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
