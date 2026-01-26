import { NestContainer } from "@buildingai/di";
import type { EntitySubscriberInterface, InsertEvent, UpdateEvent } from "typeorm";

import { FileUrlService } from "../utils";
import { EventSubscriber } from "./../typeorm";

/**
 * Metadata key for storing file URL field names
 */
const NORMALIZE_FILE_URL_FIELDS_KEY = Symbol("normalizeFileUrlFields");

/**
 * Property decorator that marks a field for automatic file URL processing
 *
 * When applied to a string field, it will automatically:
 * - Remove domain prefix on BeforeInsert/BeforeUpdate (store relative path)
 *
 * @example
 * ```typescript
 * @AppEntity("user")
 * export class User extends BaseEntity {
 *     @Column({ nullable: true })
 *     @NormalizeFileUrl()
 *     avatar?: string;
 * }
 * ```
 */
export function NormalizeFileUrl(): PropertyDecorator {
    return function (target: object, propertyKey: string | symbol) {
        // Get existing file URL fields or create new Set
        const existingFields: Set<string | symbol> =
            Reflect.getMetadata(NORMALIZE_FILE_URL_FIELDS_KEY, target.constructor) || new Set();

        // Add current field to the set
        existingFields.add(propertyKey);

        // Store updated fields set
        Reflect.defineMetadata(NORMALIZE_FILE_URL_FIELDS_KEY, existingFields, target.constructor);
    };
}

/**
 * Get all fields marked with @NormalizeFileUrl() decorator
 */
export function getNormalizeFileUrlFields(target: object): Set<string | symbol> {
    return Reflect.getMetadata(NORMALIZE_FILE_URL_FIELDS_KEY, target.constructor) || new Set();
}

/**
 * Process all @NormalizeFileUrl() marked fields before insert/update
 */
async function processNormalizeFileUrlFields(entity: object): Promise<void> {
    const fields = getNormalizeFileUrlFields(entity);

    if (fields.size === 0) return;

    try {
        const fileService = NestContainer.get(FileUrlService);

        for (const field of fields) {
            const value = (entity as Record<string | symbol, unknown>)[field];
            if (typeof value === "string" && value) {
                (entity as Record<string | symbol, unknown>)[field] = await fileService.set(value);
            }
        }
    } catch (error) {
        console.warn("Failed to get FileUrlService:", error);
    }
}

/**
 * Global TypeORM subscriber that automatically processes @NormalizeFileUrl() fields
 * before insert and update operations
 */
@EventSubscriber()
export class NormalizeFileUrlSubscriber implements EntitySubscriberInterface {
    async beforeInsert(event: InsertEvent<any>): Promise<void> {
        if (event.entity) {
            await processNormalizeFileUrlFields(event.entity);
        }
    }

    async beforeUpdate(event: UpdateEvent<any>): Promise<void> {
        if (event.entity) {
            await processNormalizeFileUrlFields(event.entity as object);
        }
    }
}
