import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  FeaturebaseClient,
  handleToolError,
} from "../client/featurebase-client.js";

export function registerWebhooksTools(
  server: McpServer,
  client: FeaturebaseClient
) {
  server.tool(
    "list_webhooks",
    "List webhooks in the organization with cursor-based pagination. Optionally filter by status.",
    {
      limit: z
        .number()
        .min(1)
        .max(100)
        .optional()
        .describe("Number of webhooks to return (1-100, default 10)"),
      cursor: z
        .string()
        .optional()
        .describe(
          "Opaque cursor from a previous response's nextCursor field for pagination"
        ),
      status: z
        .enum(["active", "paused", "suspended"])
        .optional()
        .describe("Filter webhooks by status"),
    },
    async ({ limit, cursor, status }) => {
      try {
        const result = await client.get("/v2/webhooks", {
          limit,
          cursor,
          status,
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
    "create_webhook",
    "Create a new webhook to receive event notifications.",
    {
      name: z
        .string()
        .max(100)
        .describe("Human-readable webhook name (max 100 chars)"),
      url: z
        .string()
        .describe("Webhook endpoint URL (must be HTTPS)"),
      topics: z
        .string()
        .describe(
          "Comma-separated event topics to subscribe to. Available: post.created, post.updated, post.deleted, post.voted, changelog.published, comment.created, comment.updated, comment.deleted"
        ),
      description: z
        .string()
        .max(500)
        .optional()
        .describe("Optional description (max 500 chars)"),
    },
    async ({ name, url, topics, description }) => {
      try {
        const body: Record<string, unknown> = {
          name,
          url,
          topics: topics.split(",").map((t) => t.trim()),
        };
        if (description !== undefined) body.description = description;

        const result = await client.post("/v2/webhooks", body);
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      } catch (e) {
        return handleToolError(e);
      }
    }
  );

  server.tool(
    "get_webhook",
    "Retrieve a single webhook by its unique identifier.",
    {
      id: z.string().describe("Webhook unique identifier"),
    },
    async ({ id }) => {
      try {
        const result = await client.get(`/v2/webhooks/${id}`);
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      } catch (e) {
        return handleToolError(e);
      }
    }
  );

  server.tool(
    "update_webhook",
    "Update a webhook's properties. Only provided fields will be modified.",
    {
      id: z.string().describe("Webhook unique identifier"),
      name: z
        .string()
        .max(255)
        .optional()
        .describe("Human-readable webhook name"),
      url: z
        .string()
        .optional()
        .describe("Webhook endpoint URL (must be HTTPS)"),
      description: z
        .string()
        .optional()
        .describe("Description (empty string to clear)"),
      topics: z
        .string()
        .optional()
        .describe(
          "Comma-separated event topics to subscribe to"
        ),
      status: z
        .enum(["active", "paused"])
        .optional()
        .describe("Set to 'active' to reactivate or 'paused' to pause delivery"),
    },
    async ({ id, name, url, description, topics, status }) => {
      try {
        const body: Record<string, unknown> = {};
        if (name !== undefined) body.name = name;
        if (url !== undefined) body.url = url;
        if (description !== undefined)
          body.description = description === "" ? null : description;
        if (topics !== undefined)
          body.topics = topics.split(",").map((t) => t.trim());
        if (status !== undefined) body.status = status;

        const result = await client.patch(`/v2/webhooks/${id}`, body);
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      } catch (e) {
        return handleToolError(e);
      }
    }
  );

  server.tool(
    "delete_webhook",
    "Permanently delete a webhook. This action cannot be undone.",
    {
      id: z.string().describe("Webhook unique identifier"),
    },
    async ({ id }) => {
      try {
        const result = await client.delete(`/v2/webhooks/${id}`);
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      } catch (e) {
        return handleToolError(e);
      }
    }
  );
}
