import { TerminalLogger } from "@buildingai/logger";
import fse from "fs-extra";
import * as path from "path";

import { Repository } from "../../typeorm";

/**
 * Menu item data structure
 */
interface MenuItem {
    id?: string;
    name: string;
    path?: string;
    icon?: string;
    permissionCode?: string | null;
    children?: MenuItem[];
    [key: string]: any;
}

/**
 * Menu seeder
 *
 * Responsible for initializing the admin menu
 * Depends on the NestJS runtime environment (requires permission code validation)
 */
export class MenuSeeder {
    readonly name = "MenuSeeder";

    constructor(
        private readonly menuRepository: Repository<any>,
        private readonly permissionService: any,
    ) {}

    /**
     * Execute menu initialization
     */
    async run(): Promise<void> {
        try {
            TerminalLogger.log(this.name, "Starting menu data initialization...");

            // Check whether menu data already exists
            const existingMenusCount = await this.menuRepository.count();

            // If menu data exists, clear all menus first
            if (existingMenusCount > 0) {
                TerminalLogger.warn(
                    this.name,
                    `Found ${existingMenusCount} existing menu records, preparing to reset...`,
                );
                await this.menuRepository.clear();
                TerminalLogger.success(this.name, "Existing menu data cleared");
            }

            // Read menu configuration file
            const menuData = await this.loadMenuConfig();

            // Recursively persist the menu tree
            await this.saveMenuTree(menuData);

            TerminalLogger.success(this.name, "Menu data initialization completed");
        } catch (error) {
            TerminalLogger.error(this.name, `Menu data initialization failed: ${error.message}`);
            throw error;
        }
    }

    /**
     * Read menu configuration file
     */
    private async loadMenuConfig(): Promise<MenuItem[]> {
        const possiblePaths = [
            // Development environment path
            path.join(process.cwd(), "packages/@buildingai/db/src/seeds/data/menu.json"),
            // Compiled path
            path.join(__dirname, "../data/menu.json"),
        ];

        for (const possiblePath of possiblePaths) {
            if (await fse.pathExists(possiblePath)) {
                return await fse.readJson(possiblePath);
            }
        }

        throw new Error("Unable to find menu.json file");
    }

    /**
     * Recursively persist the menu tree
     *
     * @param menuItems Menu items array
     * @param parentId Parent menu ID
     */
    private async saveMenuTree(
        menuItems: MenuItem[],
        parentId: string | null = null,
    ): Promise<void> {
        for (const menuItem of menuItems) {
            // Extract child menus
            const { children, ...menuData } = menuItem;

            // Set parent ID
            menuData.parentId = parentId;

            // Handle permission code: convert empty string to null
            if (menuData.permissionCode === "" || menuData.permissionCode === undefined) {
                menuData.permissionCode = null;
            }

            // Check whether the permission code exists
            if (menuData.permissionCode) {
                try {
                    // Try to look up whether the permission code exists
                    const permissionExists = await this.permissionService.findByCodeSafe(
                        menuData.permissionCode,
                    );

                    if (!permissionExists) {
                        // If the permission code does not exist, set it to null
                        TerminalLogger.warn(
                            this.name,
                            `Permission code ${menuData.permissionCode} does not exist, set to null`,
                        );
                        menuData.permissionCode = null;
                    }
                } catch (error) {
                    // When lookup fails, set to null for safety
                    TerminalLogger.error(
                        this.name,
                        `Failed to check permission code: ${error.message}`,
                    );
                    menuData.permissionCode = null;
                }
            }

            // Save current menu item
            const savedMenu = await this.menuRepository.save(menuData);

            // Recursively save child menus if any exist
            if (children && children.length > 0) {
                await this.saveMenuTree(children, savedMenu.id);
            }
        }
    }
}
