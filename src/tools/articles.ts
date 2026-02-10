import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { FeaturebaseClient, handleToolError } from "../client/featurebase-client.js";

export function registerArticlesTools(server: McpServer, client: FeaturebaseClient) {
  server.tool(
    "list_articles",
    "List articles in your organization's help center. Articles are the main content pieces containing documentation, guides, and FAQs.",
    {
      limit: z.number().min(1).max(100).optional().describe("Number of items to return (1-100, default 10)"),
      cursor: z.string().optional().describe("Opaque cursor for pagination from a previous response's nextCursor"),
      state: z.enum(["live", "draft", "all"]).optional().describe("Filter by article state (default 'live')"),
      parentId: z.string().optional().describe("Filter by parent collection ID"),
    },
    async ({ limit, cursor, state, parentId }) => {
      try {
        const result = await client.get("/v2/help_center/articles", { limit, cursor, state, parentId });
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      } catch (e) {
        return handleToolError(e);
      }
    }
  );

  server.tool(
    "create_article",
    "Create a new article in your organization's help center.",
    {
      title: z.string().describe("The title of the article"),
      description: z.string().optional().describe("A brief description of the article"),
      body: z.string().optional().describe("The HTML content of the article (supports external image URLs and base64 data URIs)"),
      formatter: z.enum(["default", "ai"]).optional().describe("Content formatter: 'default' or 'ai' (AI converts markdown/html to Featurebase format)"),
      parentId: z.string().optional().describe("The ID of the parent collection"),
      icon: z.string().optional().describe("Icon as JSON string with type and value fields"),
      state: z.enum(["live", "draft"]).optional().describe("Article state: 'live' or 'draft' (defaults to 'draft')"),
      translations: z.string().optional().describe("JSON string of translations keyed by locale code"),
    },
    async ({ title, description, body, formatter, parentId, icon, state, translations }) => {
      try {
        const reqBody: Record<string, unknown> = { title };
        if (description !== undefined) reqBody.description = description;
        if (body !== undefined) reqBody.body = body;
        if (formatter !== undefined) reqBody.formatter = formatter;
        if (parentId !== undefined) reqBody.parentId = parentId;
        if (icon !== undefined) reqBody.icon = JSON.parse(icon);
        if (state !== undefined) reqBody.state = state;
        if (translations !== undefined) reqBody.translations = JSON.parse(translations);
        const result = await client.post("/v2/help_center/articles", reqBody);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      } catch (e) {
        return handleToolError(e);
      }
    }
  );

  server.tool(
    "get_article",
    "Retrieve a specific article by its unique identifier.",
    {
      id: z.string().describe("Article unique identifier"),
      state: z.enum(["live", "draft"]).optional().describe("Article state to retrieve (default 'live')"),
    },
    async ({ id, state }) => {
      try {
        const result = await client.get(`/v2/help_center/articles/${id}`, { state });
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      } catch (e) {
        return handleToolError(e);
      }
    }
  );

  server.tool(
    "update_article",
    "Update an existing article. Only include the fields you wish to update.",
    {
      id: z.string().describe("The unique identifier of the article to update"),
      title: z.string().optional().describe("The new title of the article"),
      description: z.string().optional().describe("The new description of the article"),
      body: z.string().optional().describe("The new HTML content of the article"),
      formatter: z.enum(["default", "ai"]).optional().describe("Content formatter: 'default' or 'ai'"),
      icon: z.string().optional().describe("Updated icon as JSON string with type and value fields"),
      parentId: z.string().optional().describe("New parent collection ID"),
      authorId: z.string().optional().describe("ID of the new author (must be a member of the organization)"),
      state: z.enum(["live", "draft"]).optional().describe("'live' publishes immediately, 'draft' saves as draft"),
      translations: z.string().optional().describe("JSON string of updated translations keyed by locale code"),
    },
    async ({ id, title, description, body, formatter, icon, parentId, authorId, state, translations }) => {
      try {
        const reqBody: Record<string, unknown> = {};
        if (title !== undefined) reqBody.title = title;
        if (description !== undefined) reqBody.description = description;
        if (body !== undefined) reqBody.body = body;
        if (formatter !== undefined) reqBody.formatter = formatter;
        if (icon !== undefined) reqBody.icon = JSON.parse(icon);
        if (parentId !== undefined) reqBody.parentId = parentId;
        if (authorId !== undefined) reqBody.authorId = authorId;
        if (state !== undefined) reqBody.state = state;
        if (translations !== undefined) reqBody.translations = JSON.parse(translations);
        const result = await client.patch(`/v2/help_center/articles/${id}`, reqBody);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      } catch (e) {
        return handleToolError(e);
      }
    }
  );

  server.tool(
    "delete_article",
    "Delete an existing article by its unique identifier.",
    {
      id: z.string().describe("The unique identifier of the article to delete"),
    },
    async ({ id }) => {
      try {
        const result = await client.delete(`/v2/help_center/articles/${id}`);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      } catch (e) {
        return handleToolError(e);
      }
    }
  );
}
