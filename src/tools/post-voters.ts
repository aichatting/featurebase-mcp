import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  FeaturebaseClient,
  handleToolError,
} from "../client/featurebase-client.js";

export function registerPostVotersTools(
  server: McpServer,
  client: FeaturebaseClient
) {
  server.tool(
    "list_post_voters",
    "List all voters (upvoters) for a specific post. Returns user details including name, email, companies, and activity stats.",
    {
      id: z.string().describe("Post unique identifier"),
      limit: z
        .number()
        .min(1)
        .max(100)
        .optional()
        .describe("Number of voters to return (1-100, default 10)"),
      cursor: z
        .string()
        .optional()
        .describe(
          "Opaque cursor from a previous response's nextCursor field for pagination"
        ),
    },
    async ({ id, limit, cursor }) => {
      try {
        const result = await client.get(`/v2/posts/${id}/voters`, {
          limit,
          cursor,
        });
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      } catch (e) {
        return handleToolError(e);
      }
    }
  );

  server.tool(
    "add_post_voter",
    "Add a voter (upvote) to a post. Identify the voter by Featurebase user ID, external user ID, or email. If no voter is specified, the authenticated user's vote is added.",
    {
      id: z.string().describe("Post unique identifier"),
      voterId: z
        .string()
        .optional()
        .describe("Featurebase user ID to add as voter"),
      voterUserId: z
        .string()
        .optional()
        .describe("External user ID from your system (matched via SSO)"),
      voterEmail: z
        .string()
        .optional()
        .describe("Voter email (used to find or create user)"),
      voterName: z
        .string()
        .optional()
        .describe("Voter display name (used when creating new user)"),
      voterProfilePicture: z
        .string()
        .optional()
        .describe("Voter profile picture URL"),
    },
    async ({ id, voterId, voterUserId, voterEmail, voterName, voterProfilePicture }) => {
      try {
        const body: Record<string, string> = {};
        if (voterId !== undefined) body.id = voterId;
        if (voterUserId !== undefined) body.userId = voterUserId;
        if (voterEmail !== undefined) body.email = voterEmail;
        if (voterName !== undefined) body.name = voterName;
        if (voterProfilePicture !== undefined)
          body.profilePicture = voterProfilePicture;

        const result = await client.post(`/v2/posts/${id}/voters`, body);
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      } catch (e) {
        return handleToolError(e);
      }
    }
  );

  server.tool(
    "remove_post_voter",
    "Remove a voter (upvote) from a post. Identify the voter by Featurebase user ID, external user ID, or email. If no voter is specified, the authenticated user's vote is removed.",
    {
      id: z.string().describe("Post unique identifier"),
      voterId: z
        .string()
        .optional()
        .describe("Featurebase user ID to remove as voter"),
      voterUserId: z
        .string()
        .optional()
        .describe("External user ID from your system (matched via SSO)"),
      voterEmail: z
        .string()
        .optional()
        .describe("Voter email to identify user"),
    },
    async ({ id, voterId, voterUserId, voterEmail }) => {
      try {
        const body: Record<string, string> = {};
        if (voterId !== undefined) body.id = voterId;
        if (voterUserId !== undefined) body.userId = voterUserId;
        if (voterEmail !== undefined) body.email = voterEmail;

        const result = await client.request("DELETE", `/v2/posts/${id}/voters`, {
          body,
        });
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      } catch (e) {
        return handleToolError(e);
      }
    }
  );
}
