import { DECORATOR_KEYS } from "@buildingai/constants";
import { joinRouterPaths } from "@buildingai/utils/helper";
import { validatePath } from "@buildingai/utils/path-validator";
import { applyDecorators, Controller, SetMetadata } from "@nestjs/common";

import { getExtensionPackNameFromControllerSync } from "../modules/extension/utils/extension.utils";

/**
 * Extension controller options interface
 */
export interface ExtensionControllerOptions {
    /**
     * Controller path
     */
    path?: string;

    /**
     * Whether to skip authentication
     */
    skipAuth?: boolean;
}

/**
 * Extension API controller decorator
 *
 * Used to mark a controller as a plugin frontend API controller, automatically adds route prefix
 * Route format: /{extensionIdentifier}/web/{controllerPath}
 */
export function ExtensionWebController(
    optionsOrPath?: ExtensionControllerOptions | string,
): ClassDecorator {
    const options: ExtensionControllerOptions =
        typeof optionsOrPath === "string" ? { path: optionsOrPath } : optionsOrPath || {};

    const extensionIdentifier = getExtensionPackNameFromControllerSync();
    const pathSegment = options.path || "";

    if (pathSegment) {
        validatePath(pathSegment, {
            errorMessage: `Extension frontend controller path "${pathSegment}" contains illegal characters. The path cannot contain "/" and ":" characters.`,
        });
    }

    const apiPrefix = process.env.VITE_APP_WEB_API_PREFIX;

    const routePath = apiPrefix
        ? joinRouterPaths(extensionIdentifier, apiPrefix, pathSegment)
        : joinRouterPaths(extensionIdentifier, "api", pathSegment);

    const decorators = [
        Controller(routePath),
        SetMetadata(DECORATOR_KEYS.PLUGIN_PACK_NAME_KEY, extensionIdentifier),
        SetMetadata(DECORATOR_KEYS.PLUGIN_WEB_CONTROLLER_KEY, true),
    ];

    if (options.skipAuth === true) {
        decorators.push(SetMetadata(DECORATOR_KEYS.IS_PUBLIC_KEY, true));
    }

    return applyDecorators(...decorators);
}

/**
 * Extension console controller decorator
 *
 * Used to mark a controller as a plugin backend console controller, automatically adds route prefix
 * Route format: /{extensionIdentifier}/console/{controllerPath}
 * Supports setting permission group information, uses controller path as permission group code, and groupName as group name
 */
export function ExtensionConsoleController(
    optionsOrPath: ExtensionControllerOptions | string,
    groupName: string,
): ClassDecorator {
    const options: ExtensionControllerOptions =
        typeof optionsOrPath === "string" ? { path: optionsOrPath } : optionsOrPath || {};

    const extensionIdentifier = getExtensionPackNameFromControllerSync();
    const pathSegment = options.path || "";

    if (pathSegment) {
        validatePath(pathSegment, {
            errorMessage: `Extension backend controller path "${pathSegment}" contains illegal characters. The path cannot contain "/" and ":" characters.`,
        });
    }

    const apiPrefix = process.env.VITE_APP_CONSOLE_API_PREFIX;

    const routePath = apiPrefix
        ? joinRouterPaths(extensionIdentifier, apiPrefix, pathSegment)
        : joinRouterPaths(extensionIdentifier, "consoleapi", pathSegment);

    const decorators = [
        Controller(routePath),
        SetMetadata(DECORATOR_KEYS.PLUGIN_PACK_NAME_KEY, extensionIdentifier),
        SetMetadata(DECORATOR_KEYS.PLUGIN_CONSOLE_CONTROLLER_KEY, true),
    ];

    if (options.skipAuth === true) {
        decorators.push(SetMetadata(DECORATOR_KEYS.IS_PUBLIC_KEY, true));
    }
    decorators.push(
        SetMetadata(DECORATOR_KEYS.PERMISSION_GROUP_KEY, {
            code: `${extensionIdentifier}@${pathSegment}`,
            name: groupName,
        }),
    );

    return applyDecorators(...decorators);
}
