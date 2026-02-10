import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { FeaturebaseClient, handleToolError } from "../client/featurebase-client.js";

export function registerConversationParticipantsTools(server: McpServer, client: FeaturebaseClient) {
  server.tool(
    "add_conversation_participant",
    "Add a contact (customer or lead) as a participant to an existing conversation. Identify the contact by Featurebase ID, external userId, or email. Returns the updated conversation.",
    {
      id: z.string().describe("Conversation short ID"),
      participantId: z.string().describe("Featurebase ID of the contact to add (24-character ObjectId)").optional(),
      participantUserId: z.string().describe("External user ID from your system (matches customer only)").optional(),
      participantEmail: z.string().describe("Email address of the contact (matches customer only)").optional(),
      actingAdminId: z.string().describe("Admin ID performing the action (for attribution)").optional(),
    },
    async ({ id, participantId, participantUserId, participantEmail, actingAdminId }) => {
      try {
        const participant: Record<string, string> = {};
        if (participantId !== undefined) participant.id = participantId;
        if (participantUserId !== undefined) participant.userId = participantUserId;
        if (participantEmail !== undefined) participant.email = participantEmail;

        const body: Record<string, unknown> = { participant };
        if (actingAdminId !== undefined) body.actingAdminId = actingAdminId;

        const result = await client.post(`/v2/conversations/${id}/participants`, body);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      } catch (e) {
        return handleToolError(e);
      }
    }
  );

  server.tool(
    "remove_conversation_participant",
    "Remove a contact from a conversation by their Featurebase ID. Cannot remove the last participant. Returns the updated conversation.",
    {
      conversationId: z.string().describe("Conversation short ID"),
      contactId: z.string().describe("Featurebase ID of the contact to remove (24-character ObjectId)"),
      actingAdminId: z.string().describe("Admin ID performing the action (for attribution)").optional(),
    },
    async ({ conversationId, contactId, actingAdminId }) => {
      try {
        const body: Record<string, unknown> = { id: contactId };
        if (actingAdminId !== undefined) body.actingAdminId = actingAdminId;

        const result = await client.request("DELETE", `/v2/conversations/${conversationId}/participants`, { body });
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      } catch (e) {
        return handleToolError(e);
      }
    }
  );
}
