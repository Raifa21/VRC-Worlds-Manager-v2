import { z } from "zod";

export const WorldDataSchema = z
  .object({
    imageUrl: z.string().url(),
    name: z.string().max(100),
    // must start with wld_ or wrld_ and then 32 hex chars
    id: z.string().regex(/^w(?:ld|rld)_[0-9a-fA-F]{32}$/, {
      message: "Invalid world ID format",
    }),
    authorName: z.string().max(100),
    authorId: z.string().min(1),
    capacity: z.number().int().nonnegative(),
    recommendedCapacity: z.number().int().nonnegative().optional(),
    tags: z.array(z.string().max(50)).max(20),
    publicationDate: z.string().optional(),
    updatedAt: z.string(),
    description: z.string().max(1000),
    visits: z.number().int().nonnegative().optional(),
    favorites: z.number().int().nonnegative(),
    platform: z.array(z.string().max(20)).max(5),
  })
  .strict();

export type WorldData = z.infer<typeof WorldDataSchema>;
