import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  FeaturebaseClient,
  handleToolError,
} from "../client/featurebase-client.js";

export function registerBoardsTools(
  server: McpServer,
  client: FeaturebaseClient
) {
  server.tool(
    "list_boards",
    "List all boards (post categories) for the authenticated organization. Returns all boards without pagination.",
    {},
    async () => {
      try {
        const result = await client.get("/v2/boards");
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      } catch (e) {
        return handleToolError(e);
      }
    }
  );
}
