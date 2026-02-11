/**
 * Tag constants
 * @description Define tag-related constants
 */

/**
 * Tag types
 */
export const TagType = {
    APP: "app",
    DATASET: "dataset",
} as const;

export type TagTypeType = (typeof TagType)[keyof typeof TagType];
export type TagTypeKey = keyof typeof TagType;
