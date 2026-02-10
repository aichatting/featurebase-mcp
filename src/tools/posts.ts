import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  FeaturebaseClient,
  handleToolError,
} from "../client/featurebase-client.js";

export function registerPostsTools(
  server: McpServer,
  client: FeaturebaseClient
) {
  server.tool(
    "list_posts",
    "List all posts (feedback submissions) for the authenticated organization. Supports filtering by board, status, tags, search query, and sorting.",
    {
      limit: z
        .number()
        .min(1)
        .max(100)
        .optional()
        .describe("Number of posts to return (1-100, default 10)"),
      cursor: z
        .string()
        .optional()
        .describe(
          "Opaque cursor from a previous response's nextCursor field for pagination"
        ),
      boardId: z
        .string()
        .optional()
        .describe("Filter by board (category) ID"),
      statusId: z.string().optional().describe("Filter by status ID"),
      tags: z
        .string()
        .optional()
        .describe("Filter by tag names (comma-separated)"),
      q: z
        .string()
        .optional()
        .describe("Search query to filter posts by title/content"),
      inReview: z
        .boolean()
        .optional()
        .describe("Include posts that are in review"),
      sortBy: z
        .enum(["createdAt", "upvotes", "trending", "recent"])
        .optional()
        .describe("Sort order for posts (default: createdAt)"),
      sortOrder: z
        .enum(["asc", "desc"])
        .optional()
        .describe("Sort direction (default: desc)"),
    },
    async ({ limit, cursor, boardId, statusId, tags, q, inReview, sortBy, sortOrder }) => {
      try {
        const result = await client.get("/v2/posts", {
          limit,
          cursor,
          boardId,
          statusId,
          tags,
          q,
          inReview,
          sortBy,
          sortOrder,
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
    "create_post",
    "Create a new post (feedback submission) in a specified board.",
    {
      title: z
        .string()
        .min(2)
        .describe("Post title (minimum 2 characters)"),
      boardId: z.string().describe("Board ID to create the post in"),
      content: z
        .string()
        .optional()
        .describe("Post content in HTML format"),
      tags: z
        .string()
        .optional()
        .describe("Comma-separated tag names to attach"),
      statusId: z
        .string()
        .optional()
        .describe("Status ID to set (defaults to board's default status)"),
      commentsEnabled: z
        .boolean()
        .optional()
        .describe("Whether comments are allowed (default: true)"),
      inReview: z
        .boolean()
        .optional()
        .describe("Whether post is pending moderation (default: false)"),
      authorEmail: z
        .string()
        .optional()
        .describe("Author email to attribute the post to"),
      authorName: z
        .string()
        .optional()
        .describe("Author display name"),
      assigneeId: z
        .string()
        .optional()
        .describe("Admin ID to assign this post to"),
      eta: z
        .string()
        .optional()
        .describe("Estimated completion date (ISO 8601)"),
      visibility: z
        .enum(["public", "authorOnly", "companyOnly"])
        .optional()
        .describe(
          "Post visibility: public, authorOnly, or companyOnly"
        ),
    },
    async ({
      title,
      boardId,
      content,
      tags,
      statusId,
      commentsEnabled,
      inReview,
      authorEmail,
      authorName,
      assigneeId,
      eta,
      visibility,
    }) => {
      try {
        const body: Record<string, unknown> = { title, boardId };
        if (content !== undefined) body.content = content;
        if (tags !== undefined) body.tags = tags.split(",").map((t) => t.trim());
        if (statusId !== undefined) body.statusId = statusId;
        if (commentsEnabled !== undefined) body.commentsEnabled = commentsEnabled;
        if (inReview !== undefined) body.inReview = inReview;
        if (authorEmail || authorName) {
          const author: Record<string, string> = {};
          if (authorEmail) author.email = authorEmail;
          if (authorName) author.name = authorName;
          body.author = author;
        }
        if (assigneeId !== undefined) body.assigneeId = assigneeId;
        if (eta !== undefined) body.eta = eta;
        if (visibility !== undefined) body.visibility = visibility;

        const result = await client.post("/v2/posts", body);
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      } catch (e) {
        return handleToolError(e);
      }
    }
  );

  server.tool(
    "get_post",
    "Retrieve a single post by its unique identifier.",
    {
      id: z.string().describe("Post unique identifier"),
    },
    async ({ id }) => {
      try {
        const result = await client.get(`/v2/posts/${id}`);
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      } catch (e) {
        return handleToolError(e);
      }
    }
  );

  server.tool(
    "update_post",
    "Update an existing post. Only provided fields will be modified.",
    {
      id: z.string().describe("Post unique identifier"),
      title: z
        .string()
        .min(2)
        .optional()
        .describe("Post title (minimum 2 characters)"),
      content: z
        .string()
        .optional()
        .describe("Post content in HTML format"),
      boardId: z
        .string()
        .optional()
        .describe("Board ID to move post to"),
      statusId: z.string().optional().describe("Status ID to set"),
      tags: z
        .string()
        .optional()
        .describe("Comma-separated tag names to set (replaces existing)"),
      commentsEnabled: z
        .boolean()
        .optional()
        .describe("Whether comments are enabled on this post"),
      inReview: z
        .boolean()
        .optional()
        .describe("Whether post is pending moderation"),
      assigneeId: z
        .string()
        .optional()
        .describe("Admin ID to assign this post to (empty string to unassign)"),
      eta: z
        .string()
        .optional()
        .describe(
          "Estimated completion date (ISO 8601, empty string to clear)"
        ),
      visibility: z
        .enum(["public", "authorOnly", "companyOnly"])
        .optional()
        .describe("Post visibility: public, authorOnly, or companyOnly"),
      sendStatusUpdateEmail: z
        .boolean()
        .optional()
        .describe(
          "When changing status, send email notification to voters (default: false)"
        ),
    },
    async ({
      id,
      title,
      content,
      boardId,
      statusId,
      tags,
      commentsEnabled,
      inReview,
      assigneeId,
      eta,
      visibility,
      sendStatusUpdateEmail,
    }) => {
      try {
        const body: Record<string, unknown> = {};
        if (title !== undefined) body.title = title;
        if (content !== undefined) body.content = content;
        if (boardId !== undefined) body.boardId = boardId;
        if (statusId !== undefined) body.statusId = statusId;
        if (tags !== undefined)
          body.tags = tags.split(",").map((t) => t.trim());
        if (commentsEnabled !== undefined)
          body.commentsEnabled = commentsEnabled;
        if (inReview !== undefined) body.inReview = inReview;
        if (assigneeId !== undefined)
          body.assigneeId = assigneeId === "" ? null : assigneeId;
        if (eta !== undefined) body.eta = eta === "" ? null : eta;
        if (visibility !== undefined) body.visibility = visibility;
        if (sendStatusUpdateEmail !== undefined)
          body.sendStatusUpdateEmail = sendStatusUpdateEmail;

        const result = await client.patch(`/v2/posts/${id}`, body);
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      } catch (e) {
        return handleToolError(e);
      }
    }
  );

  server.tool(
    "delete_post",
    "Permanently delete a post. This action cannot be undone.",
    {
      id: z.string().describe("Post unique identifier"),
    },
    async ({ id }) => {
      try {
        const result = await client.delete(`/v2/posts/${id}`);
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      } catch (e) {
        return handleToolError(e);
      }
    }
  );
}
