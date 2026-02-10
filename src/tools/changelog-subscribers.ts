import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  FeaturebaseClient,
  handleToolError,
} from "../client/featurebase-client.js";

export function registerChangelogSubscribersTools(
  server: McpServer,
  client: FeaturebaseClient
) {
  server.tool(
    "add_changelog_subscribers",
    "Add email addresses as changelog subscribers in bulk. Subscribers receive email notifications when new changelogs are published.",
    {
      emails: z
        .array(z.string())
        .describe(
          "Array of email addresses to add as subscribers (1-1000 emails)"
        ),
      locale: z
        .string()
        .optional()
        .describe(
          "Locale for the subscribers (defaults to organization default)"
        ),
    },
    async ({ emails, locale }) => {
      try {
        const body: Record<string, unknown> = { emails };
        if (locale !== undefined) body.locale = locale;

        const result = await client.post(
          "/v2/changelogs/subscribers",
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
    "remove_changelog_subscribers",
    "Remove email addresses from changelog subscribers in bulk. Removed subscribers will no longer receive notifications.",
    {
      emails: z
        .array(z.string())
        .describe(
          "Array of email addresses to remove from subscribers (1-1000 emails)"
        ),
    },
    async ({ emails }) => {
      try {
        const result = await client.request(
          "DELETE",
          "/v2/changelogs/subscribers",
          { body: { emails } }
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
