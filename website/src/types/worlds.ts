export type WorldApiData = {
    imageUrl: string;
    name: string;
    id: string;
    authorName: string;
    authorId: string;
    capacity: number;
    recommendedCapacity?: number;
    tags: string[];
    publicationDate?: string; // ISO8601 string, nullable
    updatedAt: string; // ISO8601 string
    description: string;
    visits?: number;
    favorites: number;
    platform: string[];
};
