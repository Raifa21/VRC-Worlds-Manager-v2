import { z } from "zod";

export const WorldDataSchema = z
  .object({
    imageUrl: z.string().url(),
    name: z.string().max(100),
    // must start with wld_ or wrld_ and then 36 chars
    id: z.string().regex(
      /^w(?:ld|rld)_[0-9A-Fa-f]{8}(?:-[0-9A-Fa-f]{4}){3}-[0-9A-Fa-f]{12}$/,
      { message: "Invalid world ID format" }
    ),

    authorName: z.string().max(100),
    authorId: z.string().min(1),
    capacity: z.number().int().nonnegative(),
    recommendedCapacity: z.number().int().nonnegative().nullable(),
    tags: z.array(z.string().max(50)).max(20),
    publicationDate: z.string().nullable(),
    updatedAt: z.string(),
    description: z.string().max(1000),
    visits: z.number().int().nonnegative().nullable(),
    favorites: z.number().int().nonnegative(),
    platform: z.array(z.string().max(20)).max(5),
  })
  .strict();

export type WorldData = z.infer<typeof WorldDataSchema>;
