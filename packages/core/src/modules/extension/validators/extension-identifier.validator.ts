import { Transform } from "class-transformer";
import {
    registerDecorator,
    ValidationArguments,
    ValidationOptions,
    ValidatorConstraint,
    ValidatorConstraintInterface,
} from "class-validator";

/**
 * Validator constraint for Node.js package name format
 */
@ValidatorConstraint({ name: "isValidNpmPackageName", async: false })
export class IsValidNpmPackageNameConstraint implements ValidatorConstraintInterface {
    /**
     * Validate if the identifier follows Node.js package naming rules
     * Reference: https://docs.npmjs.com/cli/v9/configuring-npm/package-json#name
     */
    validate(identifier: string) {
        if (!identifier || typeof identifier !== "string") {
            return false;
        }

        // Package name length must be <= 214 characters
        if (identifier.length > 214) {
            return false;
        }

        // Package name cannot start with . or _
        if (identifier.startsWith(".") || identifier.startsWith("_")) {
            return false;
        }

        // Package name cannot contain uppercase letters
        if (identifier !== identifier.toLowerCase()) {
            return false;
        }

        // Package name cannot start or end with hyphen
        if (identifier.startsWith("-") || identifier.endsWith("-")) {
            return false;
        }

        // Package name can only contain URL-safe characters
        // Allowed: lowercase letters, numbers, hyphens, underscores, dots
        // Must start with alphanumeric, can contain hyphens/underscores/dots in the middle
        const validPattern =
            /^(@[a-z0-9]([a-z0-9._-]*[a-z0-9])?\/)?[a-z0-9]([a-z0-9._-]*[a-z0-9])?$/;
        if (!validPattern.test(identifier)) {
            return false;
        }

        // Package name cannot contain leading or trailing spaces (already trimmed by transformer)
        if (identifier !== identifier.trim()) {
            return false;
        }

        return true;
    }

    defaultMessage(args: ValidationArguments) {
        const identifier = args.value;

        if (!identifier) {
            return "应用标识不能为空";
        }

        if (identifier.length > 214) {
            return "应用标识长度不能超过 214 个字符";
        }

        if (identifier.startsWith(".") || identifier.startsWith("_")) {
            return "应用标识不能以 . 或 _ 开头";
        }

        if (identifier.startsWith("-") || identifier.endsWith("-")) {
            return "应用标识不能以连字符(-)开头或结尾";
        }

        if (identifier !== identifier.toLowerCase()) {
            return "应用标识不能包含大写字母";
        }

        return "应用标识只能包含小写字母、数字、连字符(-)、下划线(_)和点(.)，且必须以字母或数字开头和结尾";
    }
}

/**
 * Custom validator decorator for npm package name validation
 */
export function IsValidNpmPackageName(validationOptions?: ValidationOptions) {
    return function (object: object, propertyName: string) {
        registerDecorator({
            target: object.constructor,
            propertyName: propertyName,
            options: validationOptions,
            constraints: [],
            validator: IsValidNpmPackageNameConstraint,
        });
    };
}

/**
 * Transform decorator to normalize extension identifier
 * 1. Trim leading and trailing spaces
 * 2. Add 'buildingai-' prefix if not present
 */
export function NormalizeExtensionIdentifier() {
    return Transform(({ value }) => {
        if (!value || typeof value !== "string") {
            return value;
        }

        // Step 1: Trim spaces
        let normalized = value.trim();

        // Step 2: Add 'buildingai-' prefix if not present
        if (!normalized.includes("buildingai-")) {
            normalized = `buildingai-${normalized}`;
        }

        return normalized;
    });
}
