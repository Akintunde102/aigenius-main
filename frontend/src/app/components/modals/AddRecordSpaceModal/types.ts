import { CompatibleStructureFieldType } from "@/lib/types";

export type Structure = {
    id: string;
    required: boolean;
    unique?: boolean;
    description?: string;
    comment?: string;
    hashed?: boolean;
    name: string;
    type: CompatibleStructureFieldType;
}