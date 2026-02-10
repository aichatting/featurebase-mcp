import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  FeaturebaseClient,
  handleToolError,
} from "../client/featurebase-client.js";

export function registerTeamsTools(
  server: McpServer,
  client: FeaturebaseClient
) {
  server.tool(
    "list_teams",
    "List all teams in the organization. Returns all teams without pagination.",
    {},
    async () => {
      try {
        const result = await client.get("/v2/teams");
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      } catch (e) {
        return handleToolError(e);
      }
    }
  );

  server.tool(
    "get_team",
    "Retrieve a single team by its unique identifier.",
    {
      id: z.string().describe("Team unique identifier"),
    },
    async ({ id }) => {
      try {
        const result = await client.get(`/v2/teams/${id}`);
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      } catch (e) {
        return handleToolError(e);
      }
    }
  );
}
