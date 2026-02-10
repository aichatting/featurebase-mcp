import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  FeaturebaseClient,
  handleToolError,
} from "../client/featurebase-client.js";

export function registerPostStatusesTools(
  server: McpServer,
  client: FeaturebaseClient
) {
  server.tool(
    "list_post_statuses",
    "List all post statuses (workflow stages) for the authenticated organization. Returns all statuses without pagination.",
    {},
    async () => {
      try {
        const result = await client.get("/v2/post_statuses");
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      } catch (e) {
        return handleToolError(e);
      }
    }
  );

  server.tool(
    "get_post_status",
    "Retrieve a single post status by its unique identifier.",
    {
      id: z.string().describe("Post status unique identifier"),
    },
    async ({ id }) => {
      try {
        const result = await client.get(`/v2/post_statuses/${id}`);
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      } catch (e) {
        return handleToolError(e);
      }
    }
  );
}
