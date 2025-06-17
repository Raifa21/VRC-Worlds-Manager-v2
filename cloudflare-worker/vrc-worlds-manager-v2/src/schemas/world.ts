export interface WorldApiData {
    imageUrl: string;
    name: string;
    id: string;
    authorName: string;
    authorId: string;
    capacity: number;
    recommendedCapacity?: number;
    tags: string[];
    publicationDate?: string;
    updatedAt: string;
    description: string;
    visits?: number;
    favorites: number;
    platform: string[];
}
