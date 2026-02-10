import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { FeaturebaseClient, handleToolError } from "../client/featurebase-client.js";

export function registerCollectionsTools(server: McpServer, client: FeaturebaseClient) {
  server.tool(
    "list_collections",
    "List collections in your organization's help center. Collections organize articles into logical groups.",
    {
      limit: z.number().min(1).max(100).optional().describe("Number of items to return (1-100, default 10)"),
      cursor: z.string().optional().describe("Opaque cursor for pagination from a previous response's nextCursor"),
    },
    async ({ limit, cursor }) => {
      try {
        const result = await client.get("/v2/help_center/collections", { limit, cursor });
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      } catch (e) {
        return handleToolError(e);
      }
    }
  );

  server.tool(
    "create_collection",
    "Create a new collection in your organization's help center.",
    {
      name: z.string().describe("The name of the collection"),
      description: z.string().optional().describe("A description of the collection"),
      icon: z.string().optional().describe("Icon as JSON string with type ('emoji' or 'predefined') and value fields"),
      parentId: z.string().optional().describe("The ID of the parent collection, if any"),
      translations: z.string().optional().describe("JSON string of translations keyed by locale code"),
    },
    async ({ name, description, icon, parentId, translations }) => {
      try {
        const body: Record<string, unknown> = { name };
        if (description !== undefined) body.description = description;
        if (icon !== undefined) body.icon = JSON.parse(icon);
        if (parentId !== undefined) body.parentId = parentId;
        if (translations !== undefined) body.translations = JSON.parse(translations);
        const result = await client.post("/v2/help_center/collections", body);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      } catch (e) {
        return handleToolError(e);
      }
    }
  );

  server.tool(
    "get_collection",
    "Retrieve a specific collection by its unique identifier.",
    {
      id: z.string().describe("Collection unique identifier"),
    },
    async ({ id }) => {
      try {
        const result = await client.get(`/v2/help_center/collections/${id}`);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      } catch (e) {
        return handleToolError(e);
      }
    }
  );

  server.tool(
    "update_collection",
    "Update an existing collection. Only include the fields you wish to update.",
    {
      id: z.string().describe("The unique identifier of the collection to update"),
      name: z.string().optional().describe("The new name of the collection"),
      description: z.string().optional().describe("The new description of the collection"),
      icon: z.string().optional().describe("Updated icon as JSON string with type ('emoji' or 'predefined') and value fields"),
      parentId: z.string().optional().describe("The new parent collection ID, or null for root level"),
      translations: z.string().optional().describe("JSON string of updated translations keyed by locale code"),
    },
    async ({ id, name, description, icon, parentId, translations }) => {
      try {
        const body: Record<string, unknown> = {};
        if (name !== undefined) body.name = name;
        if (description !== undefined) body.description = description;
        if (icon !== undefined) body.icon = JSON.parse(icon);
        if (parentId !== undefined) body.parentId = parentId;
        if (translations !== undefined) body.translations = JSON.parse(translations);
        const result = await client.patch(`/v2/help_center/collections/${id}`, body);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      } catch (e) {
        return handleToolError(e);
      }
    }
  );

  server.tool(
    "delete_collection",
    "Delete an existing collection by its unique identifier.",
    {
      id: z.string().describe("The unique identifier of the collection to delete"),
    },
    async ({ id }) => {
      try {
        const result = await client.delete(`/v2/help_center/collections/${id}`);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      } catch (e) {
        return handleToolError(e);
      }
    }
  );
}
