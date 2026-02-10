import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { FeaturebaseClient, handleToolError } from "../client/featurebase-client.js";

export function registerCommentsTools(server: McpServer, client: FeaturebaseClient) {
  server.tool(
    "list_comments",
    "List comments for your organization. Optionally filter by postId, changelogId, privacy, inReview status. Supports cursor-based pagination and sorting.",
    {
      postId: z.string().describe("Filter comments by post ID").optional(),
      changelogId: z.string().describe("Filter comments by changelog ID").optional(),
      privacy: z.enum(["public", "private", "all"]).describe("Filter comments by privacy: public, private, or all").optional(),
      inReview: z.boolean().describe("Filter by moderation review status").optional(),
      sortBy: z.enum(["best", "top", "new", "old"]).describe("Sort order: best (default, confidence), top (net score), new, old").optional(),
      limit: z.number().min(1).max(100).describe("Max comments to return (1-100, default 10)").optional(),
      cursor: z.string().describe("Cursor for pagination from previous response nextCursor").optional(),
    },
    async ({ postId, changelogId, privacy, inReview, sortBy, limit, cursor }) => {
      try {
        const result = await client.get("/v2/comments", {
          postId,
          changelogId,
          privacy,
          inReview,
          sortBy,
          limit,
          cursor,
        });
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      } catch (e) {
        return handleToolError(e);
      }
    }
  );

  server.tool(
    "create_comment",
    "Create a new comment or reply on a post or changelog. Content should be HTML format. Provide postId or changelogId to target the comment. Use parentCommentId to create a threaded reply.",
    {
      content: z.string().describe("Comment content in HTML format"),
      postId: z.string().describe("Post ID to comment on (accepts ObjectId or slug)").optional(),
      changelogId: z.string().describe("Changelog ID to comment on (accepts ObjectId or slug)").optional(),
      parentCommentId: z.string().describe("Parent comment ID if this is a reply").optional(),
      isPrivate: z.boolean().describe("Whether the comment is private (only visible to admins)").optional(),
      sendNotification: z.boolean().describe("Whether to notify voters about the comment (default true)").optional(),
      authorId: z.string().describe("Featurebase user ID to attribute the comment to").optional(),
      authorUserId: z.string().describe("External user ID from your system (matched via SSO)").optional(),
      authorEmail: z.string().describe("Author email (used to find or create user)").optional(),
      authorName: z.string().describe("Author display name").optional(),
      authorProfilePicture: z.string().describe("Author profile picture URL").optional(),
      createdAt: z.string().describe("ISO 8601 timestamp to backdate creation (useful for imports)").optional(),
      upvotes: z.number().describe("Initial upvotes count (useful for imports)").optional(),
      downvotes: z.number().describe("Initial downvotes count (useful for imports)").optional(),
    },
    async ({ content, postId, changelogId, parentCommentId, isPrivate, sendNotification, authorId, authorUserId, authorEmail, authorName, authorProfilePicture, createdAt, upvotes, downvotes }) => {
      try {
        const body: Record<string, unknown> = { content };
        if (postId !== undefined) body.postId = postId;
        if (changelogId !== undefined) body.changelogId = changelogId;
        if (parentCommentId !== undefined) body.parentCommentId = parentCommentId;
        if (isPrivate !== undefined) body.isPrivate = isPrivate;
        if (sendNotification !== undefined) body.sendNotification = sendNotification;
        if (createdAt !== undefined) body.createdAt = createdAt;
        if (upvotes !== undefined) body.upvotes = upvotes;
        if (downvotes !== undefined) body.downvotes = downvotes;

        if (authorId || authorUserId || authorEmail || authorName || authorProfilePicture) {
          const author: Record<string, string> = {};
          if (authorId) author.id = authorId;
          if (authorUserId) author.userId = authorUserId;
          if (authorEmail) author.email = authorEmail;
          if (authorName) author.name = authorName;
          if (authorProfilePicture) author.profilePicture = authorProfilePicture;
          body.author = author;
        }

        const result = await client.post("/v2/comments", body);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      } catch (e) {
        return handleToolError(e);
      }
    }
  );

  server.tool(
    "get_comment",
    "Retrieve a single comment by its unique identifier. Returns the full comment object including author, voting stats, privacy, moderation status, and timestamps.",
    {
      id: z.string().describe("Comment unique identifier"),
    },
    async ({ id }) => {
      try {
        const result = await client.get(`/v2/comments/${id}`);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      } catch (e) {
        return handleToolError(e);
      }
    }
  );

  server.tool(
    "update_comment",
    "Update an existing comment. Can modify content, privacy, pinned status, and moderation status. Some fields require admin permissions.",
    {
      id: z.string().describe("Comment unique identifier"),
      content: z.string().describe("Comment content in HTML format").optional(),
      isPrivate: z.boolean().describe("Whether the comment is private (only visible to admins)").optional(),
      isPinned: z.boolean().describe("Whether the comment is pinned at the top").optional(),
      inReview: z.boolean().describe("Whether the comment is pending moderation review").optional(),
      createdAt: z.string().describe("Update the creation date (useful for imports)").optional(),
      upvotes: z.number().describe("Set the upvotes count directly").optional(),
      downvotes: z.number().describe("Set the downvotes count directly").optional(),
    },
    async ({ id, content, isPrivate, isPinned, inReview, createdAt, upvotes, downvotes }) => {
      try {
        const body: Record<string, unknown> = {};
        if (content !== undefined) body.content = content;
        if (isPrivate !== undefined) body.isPrivate = isPrivate;
        if (isPinned !== undefined) body.isPinned = isPinned;
        if (inReview !== undefined) body.inReview = inReview;
        if (createdAt !== undefined) body.createdAt = createdAt;
        if (upvotes !== undefined) body.upvotes = upvotes;
        if (downvotes !== undefined) body.downvotes = downvotes;

        const result = await client.patch(`/v2/comments/${id}`, body);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      } catch (e) {
        return handleToolError(e);
      }
    }
  );

  server.tool(
    "delete_comment",
    "Delete a comment by ID. Comments with replies are soft-deleted (content replaced with [deleted]). Comments without replies are permanently removed.",
    {
      id: z.string().describe("Comment unique identifier"),
    },
    async ({ id }) => {
      try {
        const result = await client.delete(`/v2/comments/${id}`);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      } catch (e) {
        return handleToolError(e);
      }
    }
  );
}
