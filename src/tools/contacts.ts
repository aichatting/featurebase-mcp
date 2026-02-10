import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  FeaturebaseClient,
  handleToolError,
} from "../client/featurebase-client.js";

export function registerContactsTools(
  server: McpServer,
  client: FeaturebaseClient
) {
  server.tool(
    "list_contacts",
    "List contacts (customers and leads) with cursor-based pagination. Returns contact objects with email, name, type, companies, custom fields, and activity info.",
    {
      limit: z
        .number()
        .min(1)
        .max(100)
        .describe("Number of contacts to return (1-100, default 10)")
        .optional(),
      cursor: z
        .string()
        .describe(
          "Opaque cursor from a previous response for pagination"
        )
        .optional(),
      contactType: z
        .enum(["customer", "lead", "all"])
        .describe(
          'Filter by contact type: "customer" (default), "lead", or "all"'
        )
        .optional(),
    },
    async ({ limit, cursor, contactType }) => {
      try {
        const result = await client.get("/v2/contacts", {
          limit,
          cursor,
          contactType,
        });
        return {
          content: [
            { type: "text", text: JSON.stringify(result, null, 2) },
          ],
        };
      } catch (e) {
        return handleToolError(e);
      }
    }
  );

  server.tool(
    "upsert_contact",
    "Create or update a contact. If a contact with the given email or userId already exists, it will be updated. At least one of email or userId must be provided.",
    {
      email: z
        .string()
        .describe("Contact email address. Used for identification if userId is not provided.")
        .optional(),
      userId: z
        .string()
        .describe(
          "External user ID from your system. Takes precedence over email for identification."
        )
        .optional(),
      name: z.string().describe("Contact display name").optional(),
      profilePicture: z
        .string()
        .describe("Profile picture URL")
        .optional(),
      companies: z
        .string()
        .describe(
          'JSON array of company objects. Each must have "id" and "name". Optional fields: monthlySpend, customFields, industry, website, plan, companySize, createdAt.'
        )
        .optional(),
      customFields: z
        .string()
        .describe(
          "JSON object of custom field values. Values can be string, number, boolean, null, or array of primitives."
        )
        .optional(),
      subscribedToChangelog: z
        .boolean()
        .describe("Whether the contact is subscribed to changelog updates")
        .optional(),
      locale: z
        .string()
        .describe("Contact locale/language preference (e.g. 'en')")
        .optional(),
      phone: z.string().describe("Contact phone number").optional(),
      roles: z
        .string()
        .describe("JSON array of role IDs to assign to the contact")
        .optional(),
      createdAt: z
        .string()
        .describe(
          "When the contact was created in your system (ISO 8601)"
        )
        .optional(),
    },
    async ({
      email,
      userId,
      name,
      profilePicture,
      companies,
      customFields,
      subscribedToChangelog,
      locale,
      phone,
      roles,
      createdAt,
    }) => {
      try {
        const body: Record<string, unknown> = {};
        if (email !== undefined) body.email = email;
        if (userId !== undefined) body.userId = userId;
        if (name !== undefined) body.name = name;
        if (profilePicture !== undefined)
          body.profilePicture = profilePicture;
        if (companies !== undefined)
          body.companies = JSON.parse(companies);
        if (customFields !== undefined)
          body.customFields = JSON.parse(customFields);
        if (subscribedToChangelog !== undefined)
          body.subscribedToChangelog = subscribedToChangelog;
        if (locale !== undefined) body.locale = locale;
        if (phone !== undefined) body.phone = phone;
        if (roles !== undefined) body.roles = JSON.parse(roles);
        if (createdAt !== undefined) body.createdAt = createdAt;

        const result = await client.post("/v2/contacts", body);
        return {
          content: [
            { type: "text", text: JSON.stringify(result, null, 2) },
          ],
        };
      } catch (e) {
        return handleToolError(e);
      }
    }
  );

  server.tool(
    "get_contact",
    "Retrieve a single contact by their Featurebase ID. Returns the full contact object including email, name, type, companies, custom fields, and activity info.",
    {
      id: z.string().describe("Featurebase contact ID (24-character ObjectId)"),
    },
    async ({ id }) => {
      try {
        const result = await client.get(`/v2/contacts/${id}`);
        return {
          content: [
            { type: "text", text: JSON.stringify(result, null, 2) },
          ],
        };
      } catch (e) {
        return handleToolError(e);
      }
    }
  );

  server.tool(
    "delete_contact",
    "Permanently delete a contact by their Featurebase ID. Supports deleting both customers and leads. This action cannot be undone.",
    {
      id: z.string().describe("Featurebase contact ID (24-character ObjectId)"),
    },
    async ({ id }) => {
      try {
        const result = await client.delete(`/v2/contacts/${id}`);
        return {
          content: [
            { type: "text", text: JSON.stringify(result, null, 2) },
          ],
        };
      } catch (e) {
        return handleToolError(e);
      }
    }
  );

  server.tool(
    "get_contact_by_user_id",
    "Retrieve a contact by their external user ID from your system (via SSO). Only returns customers, not leads.",
    {
      userId: z
        .string()
        .describe("External user ID from your system"),
    },
    async ({ userId }) => {
      try {
        const result = await client.get(
          `/v2/contacts/by-user-id/${userId}`
        );
        return {
          content: [
            { type: "text", text: JSON.stringify(result, null, 2) },
          ],
        };
      } catch (e) {
        return handleToolError(e);
      }
    }
  );

  server.tool(
    "delete_contact_by_user_id",
    "Permanently delete a contact by their external user ID. Only deletes customers, not leads. This action cannot be undone.",
    {
      userId: z
        .string()
        .describe("External user ID from your system"),
    },
    async ({ userId }) => {
      try {
        const result = await client.delete(
          `/v2/contacts/by-user-id/${userId}`
        );
        return {
          content: [
            { type: "text", text: JSON.stringify(result, null, 2) },
          ],
        };
      } catch (e) {
        return handleToolError(e);
      }
    }
  );

  server.tool(
    "block_contact",
    "Block a contact from the messenger/inbox by their Featurebase ID. Blocked contacts cannot send new messages. Works for both customers and leads.",
    {
      id: z.string().describe("Featurebase contact ID (24-character ObjectId)"),
    },
    async ({ id }) => {
      try {
        const result = await client.post(`/v2/contacts/${id}/block`);
        return {
          content: [
            { type: "text", text: JSON.stringify(result, null, 2) },
          ],
        };
      } catch (e) {
        return handleToolError(e);
      }
    }
  );

  server.tool(
    "unblock_contact",
    "Unblock a contact from the messenger/inbox by their Featurebase ID. The contact regains full messenger functionality. Works for both customers and leads.",
    {
      id: z.string().describe("Featurebase contact ID (24-character ObjectId)"),
    },
    async ({ id }) => {
      try {
        const result = await client.post(
          `/v2/contacts/${id}/unblock`
        );
        return {
          content: [
            { type: "text", text: JSON.stringify(result, null, 2) },
          ],
        };
      } catch (e) {
        return handleToolError(e);
      }
    }
  );
}
