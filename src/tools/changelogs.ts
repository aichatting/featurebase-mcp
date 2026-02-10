import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  FeaturebaseClient,
  handleToolError,
} from "../client/featurebase-client.js";

export function registerChangelogsTools(
  server: McpServer,
  client: FeaturebaseClient
) {
  server.tool(
    "list_changelogs",
    "List all changelogs for the organization. Supports filtering by search query, categories, locale, state, date range, and cursor-based pagination.",
    {
      id: z
        .string()
        .optional()
        .describe("Find changelog by its ID or slug"),
      q: z
        .string()
        .optional()
        .describe("Search for changelogs by title or content"),
      categories: z
        .string()
        .optional()
        .describe(
          "Filter by category names, comma-separated (e.g. 'New,Fixed')"
        ),
      locale: z
        .string()
        .optional()
        .describe(
          "Locale of the changelogs (e.g. 'en'). Defaults to org default."
        ),
      state: z
        .enum(["draft", "live", "all"])
        .optional()
        .describe("Filter by state: draft, live, or all (default: live)"),
      startDate: z
        .string()
        .optional()
        .describe(
          "Include changelogs dated on or after this date (e.g. 2024-01-01)"
        ),
      endDate: z
        .string()
        .optional()
        .describe(
          "Include changelogs dated on or before this date (e.g. 2024-12-31)"
        ),
      sortBy: z
        .enum(["date"])
        .optional()
        .describe("Field to sort by (currently only 'date')"),
      sortOrder: z
        .enum(["asc", "desc"])
        .optional()
        .describe("Sort direction: asc or desc (default: desc)"),
      limit: z
        .number()
        .optional()
        .describe("Maximum number of changelogs to return (1-100, default 10)"),
      cursor: z
        .string()
        .optional()
        .describe("Cursor for pagination from previous response's nextCursor"),
    },
    async ({ id, q, categories, locale, state, startDate, endDate, sortBy, sortOrder, limit, cursor }) => {
      try {
        const result = await client.get("/v2/changelogs", {
          id,
          q,
          categories,
          locale,
          state,
          startDate,
          endDate,
          sortBy,
          sortOrder,
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
    "create_changelog",
    "Create a new changelog. Requires a title. Provide content as htmlContent or markdownContent. Optionally set categories, featured image, locale, date, and state.",
    {
      title: z
        .string()
        .describe("The title of the changelog (required)"),
      htmlContent: z
        .string()
        .optional()
        .describe(
          "HTML content of the changelog. Provide either htmlContent or markdownContent."
        ),
      markdownContent: z
        .string()
        .optional()
        .describe(
          "Markdown content of the changelog. Provide either htmlContent or markdownContent."
        ),
      categories: z
        .array(z.string())
        .optional()
        .describe(
          "Array of category names (e.g. ['New', 'Fixed', 'Improved'])"
        ),
      featuredImage: z
        .string()
        .optional()
        .describe("URL of the featured image"),
      allowedSegmentIds: z
        .array(z.string())
        .optional()
        .describe("Array of segment IDs allowed to view this changelog"),
      locale: z
        .string()
        .optional()
        .describe("Locale of the changelog (defaults to org default)"),
      date: z
        .string()
        .optional()
        .describe("The date of the changelog (e.g. 2024-01-15)"),
      state: z
        .enum(["draft", "live"])
        .optional()
        .describe("State of the changelog: draft (default) or live"),
    },
    async ({
      title,
      htmlContent,
      markdownContent,
      categories,
      featuredImage,
      allowedSegmentIds,
      locale,
      date,
      state,
    }) => {
      try {
        const body: Record<string, unknown> = { title };
        if (htmlContent !== undefined) body.htmlContent = htmlContent;
        if (markdownContent !== undefined)
          body.markdownContent = markdownContent;
        if (categories !== undefined) body.categories = categories;
        if (featuredImage !== undefined) body.featuredImage = featuredImage;
        if (allowedSegmentIds !== undefined)
          body.allowedSegmentIds = allowedSegmentIds;
        if (locale !== undefined) body.locale = locale;
        if (date !== undefined) body.date = date;
        if (state !== undefined) body.state = state;

        const result = await client.post("/v2/changelogs", body);
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      } catch (e) {
        return handleToolError(e);
      }
    }
  );

  server.tool(
    "get_changelog",
    "Get a single changelog by its unique ID or slug.",
    {
      id: z.string().describe("Changelog unique identifier or slug"),
    },
    async ({ id }) => {
      try {
        const result = await client.get(`/v2/changelogs/${id}`);
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      } catch (e) {
        return handleToolError(e);
      }
    }
  );

  server.tool(
    "update_changelog",
    "Update an existing changelog by ID. All fields are optional.",
    {
      id: z.string().describe("Changelog unique identifier"),
      title: z.string().optional().describe("New title for the changelog"),
      htmlContent: z
        .string()
        .optional()
        .describe("New HTML content for the changelog"),
      markdownContent: z
        .string()
        .optional()
        .describe("New markdown content for the changelog"),
      categories: z
        .array(z.string())
        .optional()
        .describe("Array of category names"),
      featuredImage: z
        .string()
        .optional()
        .describe("URL of the featured image"),
      allowedSegmentIds: z
        .array(z.string())
        .optional()
        .describe("Array of segment IDs allowed to view this changelog"),
      date: z
        .string()
        .optional()
        .describe("The date of the changelog (e.g. 2024-01-15)"),
    },
    async ({
      id,
      title,
      htmlContent,
      markdownContent,
      categories,
      featuredImage,
      allowedSegmentIds,
      date,
    }) => {
      try {
        const body: Record<string, unknown> = {};
        if (title !== undefined) body.title = title;
        if (htmlContent !== undefined) body.htmlContent = htmlContent;
        if (markdownContent !== undefined)
          body.markdownContent = markdownContent;
        if (categories !== undefined) body.categories = categories;
        if (featuredImage !== undefined) body.featuredImage = featuredImage;
        if (allowedSegmentIds !== undefined)
          body.allowedSegmentIds = allowedSegmentIds;
        if (date !== undefined) body.date = date;

        const result = await client.patch(`/v2/changelogs/${id}`, body);
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      } catch (e) {
        return handleToolError(e);
      }
    }
  );

  server.tool(
    "delete_changelog",
    "Permanently delete a changelog and all associated comments. This cannot be undone.",
    {
      id: z.string().describe("Changelog unique identifier"),
    },
    async ({ id }) => {
      try {
        const result = await client.delete(`/v2/changelogs/${id}`);
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      } catch (e) {
        return handleToolError(e);
      }
    }
  );

  server.tool(
    "publish_changelog",
    "Publish a changelog, optionally sending email notifications to subscribers. Supports scheduling for a future date.",
    {
      id: z.string().describe("Changelog unique identifier"),
      sendEmail: z
        .boolean()
        .optional()
        .describe(
          "Whether to send email notifications to subscribers (default: false)"
        ),
      locales: z
        .array(z.string())
        .optional()
        .describe(
          "Array of locales to publish to. Empty array publishes to all locales."
        ),
      scheduledDate: z
        .string()
        .optional()
        .describe(
          "Future date/time to schedule publishing (ISO 8601). Omit to publish immediately."
        ),
    },
    async ({ id, sendEmail, locales, scheduledDate }) => {
      try {
        const body: Record<string, unknown> = {};
        if (sendEmail !== undefined) body.sendEmail = sendEmail;
        if (locales !== undefined) body.locales = locales;
        if (scheduledDate !== undefined) body.scheduledDate = scheduledDate;

        const result = await client.post(
          `/v2/changelogs/${id}/publish`,
          body
        );
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      } catch (e) {
        return handleToolError(e);
      }
    }
  );

  server.tool(
    "unpublish_changelog",
    "Unpublish a changelog, removing it from public view. Content is preserved as draft.",
    {
      id: z.string().describe("Changelog unique identifier"),
      locales: z
        .array(z.string())
        .optional()
        .describe(
          "Array of locales to unpublish from. Empty array unpublishes from all locales."
        ),
    },
    async ({ id, locales }) => {
      try {
        const body: Record<string, unknown> = {};
        if (locales !== undefined) body.locales = locales;

        const result = await client.post(
          `/v2/changelogs/${id}/unpublish`,
          body
        );
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      } catch (e) {
        return handleToolError(e);
      }
    }
  );
}
