import { z } from "zod";

export const RegionInput = z.object({
  region: z.string().default("us-east-1"),
});

export const CreateKeyInput = z.object({
  name: z
    .string()
    .min(1)
    .max(48)
    .regex(/^[a-zA-Z0-9_-]+$/, "Alphanumeric, hyphens, underscores only"),
  region: z.string().default("us-east-1"),
  expiryDays: z
    .number()
    .int()
    .min(0)
    .max(365)
    .default(0)
    .describe("0 = never expires"),
  createdBy: z.string().optional().describe("Email of the user who created this key"),
});

export const DeleteKeyInput = z.object({
  userName: z.string(),
  credentialId: z.string(),
  region: z.string().default("us-east-1"),
});
