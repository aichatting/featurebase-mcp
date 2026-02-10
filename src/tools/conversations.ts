import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { FeaturebaseClient, handleToolError } from "../client/featurebase-client.js";

export function registerConversationsTools(server: McpServer, client: FeaturebaseClient) {
  server.tool(
    "list_conversations",
    "List conversations in your organization with cursor-based pagination. Returns conversation objects with state, participants, source, and timestamps.",
    {
      limit: z.number().min(1).max(100).describe("Number of conversations to return (1-100, default 10)").optional(),
      cursor: z.string().describe("Cursor from previous response for pagination").optional(),
    },
    async ({ limit, cursor }) => {
      try {
        const result = await client.get("/v2/conversations", { limit, cursor });
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      } catch (e) {
        return handleToolError(e);
      }
    }
  );

  server.tool(
    "create_conversation",
    "Create a new conversation. Supports contact-initiated (from.type='contact') and admin-initiated outreach (from.type='admin'). For admin-initiated, provide to.type and to.id for the recipient contact. Content is in markdown format.",
    {
      fromType: z.enum(["contact", "admin"]).describe("Type of sender: 'contact' for customer/lead, 'admin' for admin-initiated outreach"),
      fromId: z.string().describe("Featurebase ID of the sender (24-character ObjectId)"),
      bodyMarkdown: z.string().describe("Initial message content in markdown format"),
      toType: z.enum(["contact"]).describe("Recipient type for admin-initiated conversations (must be 'contact')").optional(),
      toId: z.string().describe("Featurebase ID of the recipient contact for admin-initiated conversations").optional(),
      channel: z.enum(["desktop", "email"]).describe("Channel: 'desktop' (default) or 'email'").optional(),
      createdAt: z.string().describe("ISO timestamp for backdating creation (useful for migrations)").optional(),
    },
    async ({ fromType, fromId, bodyMarkdown, toType, toId, channel, createdAt }) => {
      try {
        const body: Record<string, unknown> = {
          from: { type: fromType, id: fromId },
          bodyMarkdown,
        };
        if (toType !== undefined && toId !== undefined) {
          body.to = { type: toType, id: toId };
        }
        if (channel !== undefined) body.channel = channel;
        if (createdAt !== undefined) body.createdAt = createdAt;

        const result = await client.post("/v2/conversations", body);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      } catch (e) {
        return handleToolError(e);
      }
    }
  );

  server.tool(
    "get_conversation",
    "Retrieve a single conversation by its short ID, including up to 500 conversation parts (messages). Returns full conversation details with participants, source, read receipts, and message history.",
    {
      id: z.string().describe("Conversation short ID"),
    },
    async ({ id }) => {
      try {
        const result = await client.get(`/v2/conversations/${id}`);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      } catch (e) {
        return handleToolError(e);
      }
    }
  );

  server.tool(
    "update_conversation",
    "Update a conversation's properties. Supports partial updates - only provided fields are changed. Can update state, assignment, title, custom attributes, and mark as read.",
    {
      id: z.string().describe("Conversation short ID"),
      actingAdminId: z.string().describe("Admin ID performing the action (for attribution). If not provided, uses bot service user.").optional(),
      state: z.enum(["open", "closed", "snoozed"]).describe("Conversation state").optional(),
      snoozedUntil: z.string().describe("ISO datetime when to unsnooze (required when state is 'snoozed')").optional(),
      adminAssigneeId: z.string().describe("Admin ID to assign, or empty string to unassign").optional(),
      teamAssigneeId: z.string().describe("Team ID to assign, or empty string to unassign").optional(),
      title: z.string().describe("Conversation title").optional(),
      customAttributes: z.string().describe("JSON string of custom attributes to set on the conversation").optional(),
      markAsReadAllAdmins: z.boolean().describe("Mark conversation as read for all admins").optional(),
      markAsReadAllContacts: z.boolean().describe("Mark conversation as read for all contacts").optional(),
      markAsReadAdminIds: z.string().describe("Comma-separated admin IDs to mark as read").optional(),
      markAsReadContactIds: z.string().describe("Comma-separated contact IDs to mark as read").optional(),
    },
    async ({ id, actingAdminId, state, snoozedUntil, adminAssigneeId, teamAssigneeId, title, customAttributes, markAsReadAllAdmins, markAsReadAllContacts, markAsReadAdminIds, markAsReadContactIds }) => {
      try {
        const body: Record<string, unknown> = {};
        if (actingAdminId !== undefined) body.actingAdminId = actingAdminId;
        if (state !== undefined) body.state = state;
        if (snoozedUntil !== undefined) body.snoozedUntil = snoozedUntil;
        if (adminAssigneeId !== undefined) body.adminAssigneeId = adminAssigneeId === "" ? null : adminAssigneeId;
        if (teamAssigneeId !== undefined) body.teamAssigneeId = teamAssigneeId === "" ? null : teamAssigneeId;
        if (title !== undefined) body.title = title;
        if (customAttributes !== undefined) body.customAttributes = JSON.parse(customAttributes);

        const hasMarkAsRead = markAsReadAllAdmins !== undefined || markAsReadAllContacts !== undefined || markAsReadAdminIds !== undefined || markAsReadContactIds !== undefined;
        if (hasMarkAsRead) {
          const markAsRead: Record<string, unknown> = {};
          if (markAsReadAllAdmins !== undefined) markAsRead.allAdmins = markAsReadAllAdmins;
          if (markAsReadAllContacts !== undefined) markAsRead.allContacts = markAsReadAllContacts;
          if (markAsReadAdminIds !== undefined) markAsRead.adminIds = markAsReadAdminIds.split(",").map(s => s.trim());
          if (markAsReadContactIds !== undefined) markAsRead.contactIds = markAsReadContactIds.split(",").map(s => s.trim());
          body.markAsRead = markAsRead;
        }

        const result = await client.patch(`/v2/conversations/${id}`, body);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      } catch (e) {
        return handleToolError(e);
      }
    }
  );

  server.tool(
    "delete_conversation",
    "Permanently delete a conversation by its short ID. This is irreversible - the conversation and all messages will be permanently deleted.",
    {
      id: z.string().describe("Conversation short ID"),
    },
    async ({ id }) => {
      try {
        const result = await client.delete(`/v2/conversations/${id}`);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      } catch (e) {
        return handleToolError(e);
      }
    }
  );

  server.tool(
    "reply_to_conversation",
    "Reply to an existing conversation. Supports contact replies (type='contact') and admin replies/notes (type='admin'). Use messageType 'reply' for customer-visible replies or 'note' for internal admin notes.",
    {
      id: z.string().describe("Conversation short ID"),
      type: z.enum(["contact", "admin"]).describe("Type of reply author: 'contact' for customer/lead, 'admin' for admin"),
      bodyMarkdown: z.string().describe("Message content in markdown format"),
      messageType: z.enum(["reply", "note"]).describe("'reply' for customer-visible reply, 'note' for internal admin note (admin only)"),
      authorId: z.string().describe("Featurebase ID of the author (required for admin replies)").optional(),
      userId: z.string().describe("External user ID from your system (for contact replies)").optional(),
      contactId: z.string().describe("Featurebase contact ID (for contact replies)").optional(),
    },
    async ({ id, type, bodyMarkdown, messageType, authorId, userId, contactId }) => {
      try {
        const body: Record<string, unknown> = {
          type,
          bodyMarkdown,
          messageType,
        };
        if (type === "admin" && authorId !== undefined) body.id = authorId;
        if (type === "contact") {
          if (contactId !== undefined) body.id = contactId;
          if (userId !== undefined) body.userId = userId;
        }

        const result = await client.post(`/v2/conversations/${id}/reply`, body);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      } catch (e) {
        return handleToolError(e);
      }
    }
  );
}
