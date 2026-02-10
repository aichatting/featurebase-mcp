import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { FeaturebaseClient, handleToolError } from "../client/featurebase-client.js";

export function registerConversationRedactTools(server: McpServer, client: FeaturebaseClient) {
  server.tool(
    "redact_conversation_part",
    "Redact a conversation part (message) by its ID. This permanently removes the message content and replaces it with a redaction notice. This action is irreversible.",
    {
      conversationId: z.string().describe("Conversation short ID"),
      partId: z.string().describe("Conversation part ID to redact"),
    },
    async ({ conversationId, partId }) => {
      try {
        const result = await client.post(`/v2/conversations/${conversationId}/parts/${partId}/redact`);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      } catch (e) {
        return handleToolError(e);
      }
    }
  );
}
