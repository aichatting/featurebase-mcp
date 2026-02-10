import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  FeaturebaseClient,
  handleToolError,
} from "../client/featurebase-client.js";

export function registerAdminsTools(
  server: McpServer,
  client: FeaturebaseClient
) {
  server.tool(
    "list_admin_roles",
    "List all available admin roles and their permissions. Returns all roles without pagination.",
    {},
    async () => {
      try {
        const result = await client.get("/v2/admins/roles");
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      } catch (e) {
        return handleToolError(e);
      }
    }
  );
}
