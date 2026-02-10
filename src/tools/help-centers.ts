import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { FeaturebaseClient, handleToolError } from "../client/featurebase-client.js";

export function registerHelpCentersTools(server: McpServer, client: FeaturebaseClient) {
  server.tool(
    "list_help_centers",
    "List all help centers in your Featurebase organization. Currently only one help center per organization is supported.",
    {
      limit: z.number().min(1).max(100).optional().describe("Number of items to return (1-100, default 10)"),
      cursor: z.string().optional().describe("Opaque cursor for pagination from a previous response's nextCursor"),
    },
    async ({ limit, cursor }) => {
      try {
        const result = await client.get("/v2/help_center/help_centers", { limit, cursor });
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      } catch (e) {
        return handleToolError(e);
      }
    }
  );

  server.tool(
    "get_help_center",
    "Retrieve a single help center by its unique identifier.",
    {
      id: z.string().describe("Help center unique identifier"),
    },
    async ({ id }) => {
      try {
        const result = await client.get(`/v2/help_center/help_centers/${id}`);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      } catch (e) {
        return handleToolError(e);
      }
    }
  );
}
