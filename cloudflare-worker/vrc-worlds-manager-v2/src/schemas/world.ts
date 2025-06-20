import { z } from "zod";

export const WorldDataSchema = z
  .object({
    imageUrl: z       // https://…/file_{UUID}/{number}/file
      .string()
      .url()
      .regex(
        /^https:\/\/api\.vrchat\.cloud\/api\/1\/file\/file_[0-9A-Fa-f-]{36}\/\d+\/file$/,
        { message: "Invalid VRChat file URL" }
      ),
    name: z.string().max(50),             // client‐truncated to 50 chars
    id: z.string().regex(
      /^w(?:ld|rld)_[0-9A-Fa-f]{8}(?:-[0-9A-Fa-f]{4}){3}-[0-9A-Fa-f]{12}$/,
      { message: "Invalid world ID format" }
    ),
    authorName: z.string().max(50),       // client‐truncated to 50 chars
    authorId: z
      .string()
      .refine(
      (val) =>
        /^usr_[0-9A-Fa-f]{8}(?:-[0-9A-Fa-f]{4}){3}-[0-9A-Fa-f]{12}$/.test(val) ||
        /^[A-Za-z0-9]{10}$/.test(val),
      { message: "Invalid authorId format" }
      ),
    capacity: z.number().int().nonnegative(),
    recommendedCapacity: z.number().int().nonnegative().nullable(),
    tags: z.array(z.string().max(50)).max(20), // each tag ≤50 chars, max 20 tags
    publicationDate: z
      .string()
      .refine((s) => !isNaN(Date.parse(s)), {
        message: "Invalid ISO publicationDate",
      }),
    updatedAt: z
      .string()
      .refine((s) => !isNaN(Date.parse(s)), {
        message: "Invalid ISO updatedAt",
      }),
    description: z.string().max(50),    // client‐truncated to 50 chars
    visits: z.number().int().nonnegative().nullable(),
    favorites: z.number().int().nonnegative(),
    platform: z.enum(["ios", "android", "standalonewindows"]),
  })
  .strict();

export type WorldData = z.infer<typeof WorldDataSchema>;
