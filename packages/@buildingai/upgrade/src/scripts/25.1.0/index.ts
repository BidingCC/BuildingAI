import { ExtensionStatus } from "@buildingai/constants/shared/extension.constant";
import {
    AiModel,
    DecoratePageEntity,
    Extension,
    MembershipLevels,
    MembershipPlans,
    Menu,
    MenuSourceType,
    MenuType,
    Permission,
    PermissionType,
} from "@buildingai/db/entities";
import { DataSource, MoreThan, Repository } from "@buildingai/db/typeorm";
import { checkVersionCompatibility, ExtensionEngine } from "@buildingai/utils";
import * as fs from "fs";
import * as path from "path";

import { BaseUpgradeScript, UpgradeContext } from "../../index";

/** Menu configuration for batch creation */
interface MenuConfig {
    name: string;
    code: string;
    path: string;
    icon?: string;
    component: string;
    permissionCode?: string;
    sort: number;
    isHidden: 0 | 1;
    type: MenuType;
}

/**
 * Upgrade script 25.1.0
 */
export class Upgrade extends BaseUpgradeScript {
    readonly version = "25.1.0";

    async execute(context: UpgradeContext): Promise<void> {
        this.log("Starting upgrade to version 25.1.0...");

        try {
            const { dataSource } = context;

            await this.addPermissions(dataSource);
            await this.addMembershipMenus(dataSource);
            await this.addMembershipOrderMenu(dataSource);
            await this.addAppsCenterMenu(dataSource);
            await this.addWebAppsMenuItem(dataSource);
            await this.seedMembershipLevels(dataSource);
            await this.seedMembershipPlans(dataSource);
            await this.disableAllExtensions(dataSource);
            await this.fixAiModelConfig(dataSource);
            await this.fixWebAppsMenu(dataSource);

            this.success("Upgrade to version 25.1.0 completed.");
        } catch (error) {
            this.error("Upgrade to version 25.1.0 failed.", error);
            throw error;
        }
    }

    /**
     * Create or find a menu by code.
     */
    private async findOrCreateMenu(
        repo: Repository<Menu>,
        code: string,
        config: MenuConfig,
        parentId: string,
    ): Promise<Menu> {
        const existing = await repo.findOne({ where: { code } });
        if (existing) {
            this.log(`Menu ${code} already exists, skipping creation.`);
            return existing;
        }

        const menu = repo.create({
            ...config,
            icon: config.icon ?? "",
            parentId,
            sourceType: MenuSourceType.SYSTEM,
        } as Partial<Menu>);

        await repo.save(menu);
        this.log(`Menu ${code} created successfully.`);
        return menu;
    }

    private async addPermissions(dataSource: DataSource): Promise<void> {
        const repo = dataSource.getRepository(Permission);

        const membershipPerms = ["list", "update", "create"].flatMap((action) =>
            ["levels", "plans"].map((resource) => ({
                code: `${resource}:${action}`,
                name: `permission.${resource}.${action}`,
                description: `${action === "list" ? "查看" : action === "update" ? "编辑" : "创建"}会员${resource === "levels" ? "等级" : "套餐"}`,
                group: "membership",
                groupName: "permission.group.membership",
            })),
        );

        const permissions = [
            ...membershipPerms,
            {
                code: "membership-order:list",
                name: "permission.membershipOrder.list",
                description: "查看会员订单列表",
                group: "financial",
                groupName: "permission.group.financial",
            },
        ];

        const existingCodes = new Set((await repo.find({ select: ["code"] })).map((p) => p.code));

        const newPerms = permissions
            .filter((p) => !existingCodes.has(p.code))
            .map((p) =>
                repo.create({
                    ...p,
                    type: PermissionType.SYSTEM,
                    isDeprecated: false,
                } as Partial<Permission>),
            );

        if (newPerms.length > 0) {
            await repo.save(newPerms);
            newPerms.forEach((p) => this.log(`Permission ${p.code} created.`));
        }

        permissions
            .filter((p) => existingCodes.has(p.code))
            .forEach((p) => this.log(`Permission ${p.code} already exists, skipping.`));
    }

    private async addMembershipMenus(dataSource: DataSource): Promise<void> {
        const repo = dataSource.getRepository(Menu);

        const systemManageMenu = await repo.findOne({ where: { code: "system-manage" } });
        if (!systemManageMenu) {
            this.log("Parent menu system-manage not found, skipping membership menu creation.");
            return;
        }

        const membershipMenu = await this.findOrCreateMenu(
            repo,
            "membership",
            {
                name: "console-menu.membershipManagement.title",
                code: "membership",
                path: "membership",
                icon: "i-lucide-crown",
                component: "",
                sort: 650,
                isHidden: 0,
                type: MenuType.DIRECTORY,
            },
            systemManageMenu.id,
        );

        await this.addResourceMenus(repo, membershipMenu.id, "levels", "levelsList");
        await this.addResourceMenus(repo, membershipMenu.id, "plans", "plansList");
    }

    /**
     * Add resource menus (list, update, add) for a given resource type.
     */
    private async addResourceMenus(
        repo: Repository<Menu>,
        parentId: string,
        resource: "levels" | "plans",
        i18nKey: string,
    ): Promise<void> {
        const listMenu = await this.findOrCreateMenu(
            repo,
            `${resource}-list`,
            {
                name: `console-menu.membershipManagement.${i18nKey}`,
                code: `${resource}-list`,
                path: resource,
                component: `/console/membership/${resource}/list`,
                permissionCode: `${resource}:list`,
                sort: 0,
                isHidden: 0,
                type: MenuType.MENU,
            },
            parentId,
        );

        const subMenus: MenuConfig[] = [
            {
                name: "console-common.edit",
                code: `${resource}-list-update`,
                path: `${resource}/edit`,
                component: `/console/membership/${resource}/edit`,
                permissionCode: `${resource}:update`,
                sort: 0,
                isHidden: 1,
                type: MenuType.MENU,
            },
            {
                name: "console-common.add",
                code: `${resource}-list-add`,
                path: `${resource}/add`,
                component: `/console/membership/${resource}/add`,
                permissionCode: `${resource}:create`,
                sort: 0,
                isHidden: 1,
                type: MenuType.MENU,
            },
        ];

        for (const config of subMenus) {
            await this.findOrCreateMenu(repo, config.code, config, listMenu.id);
        }
    }

    private async addMembershipOrderMenu(dataSource: DataSource): Promise<void> {
        const repo = dataSource.getRepository(Menu);

        const orderMenu = await repo.findOne({
            where: { path: "order", type: MenuType.DIRECTORY },
        });

        if (!orderMenu) {
            this.log("Parent menu order not found, skipping membership order menu creation.");
            return;
        }

        await this.findOrCreateMenu(
            repo,
            "membership-order",
            {
                name: "console-menu.financial.orderMembership",
                code: "membership-order",
                path: "order-membership",
                component: "/console/order/order-membership",
                permissionCode: "membership-order:list",
                sort: 1,
                isHidden: 0,
                type: MenuType.MENU,
            },
            orderMenu.id,
        );
    }

    private async addAppsCenterMenu(dataSource: DataSource): Promise<void> {
        const repo = dataSource.getRepository(Menu);

        const diyCenterMenu = await repo.findOne({ where: { code: "diy-center" } });
        if (!diyCenterMenu) {
            this.log("Parent menu diy-center not found, skipping apps center menu creation.");
            return;
        }

        await this.findOrCreateMenu(
            repo,
            "apps-center",
            {
                name: "console-menu.diyCenter.appCenter",
                code: "apps-center",
                path: "apps",
                component: "/console/decorate/apps/list",
                permissionCode: "extensions:list",
                sort: 2,
                isHidden: 0,
                type: MenuType.MENU,
            },
            diyCenterMenu.id,
        );
    }

    private async addWebAppsMenuItem(dataSource: DataSource): Promise<void> {
        const repo: Repository<DecoratePageEntity> = dataSource.getRepository(DecoratePageEntity);
        const webPage = await repo.findOne({ where: { name: "web" } });

        if (!webPage) {
            this.log("Web page configuration not found, skipping apps menu item creation.");
            return;
        }

        const data = webPage.data as { menus?: any[]; layout?: string };
        const menus = data?.menus ?? [];

        if (menus.some((m: any) => m.link?.path === "/apps" || m.link?.name === "menu.apps")) {
            this.log("Apps menu item already exists, skipping creation.");
            return;
        }

        menus.push({
            id: "menu_1764936950052-28ca0576-854a-4272-8e26-7c1dc1159ca1",
            icon: "i-tabler-apps",
            link: { name: "menu.apps", path: "/apps", type: "system", query: {} },
            title: "应用中心",
        });

        await repo.update(webPage.id, { data: { ...data, menus } } as any);
        this.log("Apps menu item added to web homepage configuration.");
    }

    private async seedMembershipLevels(dataSource: DataSource): Promise<void> {
        const repo = dataSource.getRepository(MembershipLevels);

        const defaultBenefits = [
            { icon: "", content: "每月赠送积分" },
            { icon: "", content: "绘画生成" },
            { icon: "", content: "视频生成" },
        ];

        const levelConfigs = [
            {
                name: "基础会员（示例）",
                level: 1,
                givePower: 100,
                description: "约生成10个视频或100张图片",
            },
            {
                name: "标准会员（示例）",
                level: 2,
                givePower: 500,
                description: "约生成50个视频或500张图片",
            },
            {
                name: "高级会员（示例）",
                level: 3,
                givePower: 3000,
                description: "约生成300个视频或3000张图片",
            },
        ].map((c) => ({
            ...c,
            icon: `/static/vip/${c.level}.jpg`,
            benefits: defaultBenefits,
        }));

        const existingLevels = new Set(
            (await repo.find({ select: ["level"] })).map((l) => l.level),
        );

        const newLevels = levelConfigs.filter((c) => !existingLevels.has(c.level));

        if (newLevels.length > 0) {
            await repo.save(newLevels);
            newLevels.forEach((c) => this.log(`Membership level created: ${c.name}`));
        }

        levelConfigs
            .filter((c) => existingLevels.has(c.level))
            .forEach((c) => this.log(`Membership level ${c.name} already exists, skipping.`));

        this.log(`Membership level seeding completed. Created ${newLevels.length} level(s).`);
    }

    private async seedMembershipPlans(dataSource: DataSource): Promise<void> {
        const planRepo = dataSource.getRepository(MembershipPlans);
        const levelRepo = dataSource.getRepository(MembershipLevels);

        const levels = await levelRepo.find({ order: { level: "ASC" } });
        if (levels.length === 0) {
            this.log("No membership levels found, skipping plan seeding.");
            return;
        }

        // MembershipPlanDuration: MONTH=1, QUARTER=2, HALF=3, YEAR=4, FOREVER=5, CUSTOM=6
        const planConfigs = [
            { name: "7天体验", durationConfig: 6, sort: 4, duration: { value: 7, unit: "day" } },
            { name: "单月购买", durationConfig: 1, sort: 3 },
            { name: "按季", durationConfig: 2, label: "5折", sort: 2 },
            { name: "按年", durationConfig: 4, label: "", sort: 1 },
        ];

        const priceTable: Record<string, Record<number, number>> = {
            "7天体验": { 1: 0.01, 2: 0.02, 3: 0.03 },
            单月购买: { 1: 19, 2: 59, 3: 199 },
            按季: { 1: 49, 2: 99, 3: 299 },
            按年: { 1: 79, 2: 239, 3: 649 },
        };

        const recommendedPlans = new Set(["单月购买", "按季"]);

        const existingNames = new Set(
            (await planRepo.find({ select: ["name"] })).map((p) => p.name),
        );

        const newPlans = planConfigs
            .filter((c) => !existingNames.has(c.name))
            .map((config) => ({
                ...config,
                billing: levels.map((level: any) => ({
                    levelId: level.id,
                    salesPrice: priceTable[config.name]?.[level.level] ?? 0,
                    status: true,
                    label:
                        recommendedPlans.has(config.name) ||
                        (config.name === "按年" && level.level === 3)
                            ? "推荐"
                            : "",
                })),
            }));

        if (newPlans.length > 0) {
            await planRepo.save(newPlans);
            newPlans.forEach((p) => this.log(`Membership plan created: ${p.name}`));
        }

        planConfigs
            .filter((c) => existingNames.has(c.name))
            .forEach((c) => this.log(`Membership plan ${c.name} already exists, skipping.`));

        this.log(`Membership plan seeding completed. Created ${newPlans.length} plan(s).`);
    }

    /**
     * Disable incompatible extensions in database and extensions.json file.
     * Only disables extensions that are not compatible with the current platform version.
     */
    private async disableAllExtensions(dataSource: DataSource): Promise<void> {
        const platformVersion = "25.1.0";
        const extensionsDir = path.resolve(process.cwd(), "../../extensions");
        const extensionsJsonPath = path.join(extensionsDir, "extensions.json");

        if (!fs.existsSync(extensionsJsonPath)) {
            this.log("extensions.json not found, skipping compatibility check.");
            return;
        }

        try {
            const content = fs.readFileSync(extensionsJsonPath, "utf-8");
            const data = JSON.parse(content) as {
                applications?: Record<string, { enabled?: boolean }>;
                functionals?: Record<string, { enabled?: boolean }>;
            };

            const incompatibleIdentifiers: string[] = [];
            let disabledCount = 0;

            // Check compatibility for each application
            if (data.applications) {
                for (const identifier of Object.keys(data.applications)) {
                    const extConfig = data.applications[identifier];
                    if (!extConfig || extConfig.enabled === false) {
                        continue;
                    }

                    // Read engine config from extension's manifest.json or package.json
                    const engine = this.getExtensionEngine(extensionsDir, identifier);
                    const compatResult = checkVersionCompatibility(platformVersion, engine);

                    if (!compatResult.compatible) {
                        this.log(
                            `Extension "${identifier}" is incompatible: ${compatResult.reason}`,
                        );
                        extConfig.enabled = false;
                        incompatibleIdentifiers.push(identifier);
                        disabledCount++;
                    }
                }
            }

            // Write updated extensions.json
            if (disabledCount > 0) {
                fs.writeFileSync(extensionsJsonPath, JSON.stringify(data, null, 4), "utf-8");
                this.log(`Disabled ${disabledCount} incompatible extension(s) in extensions.json.`);
            } else {
                this.log(
                    "All enabled extensions are compatible with the current platform version.",
                );
            }

            // Disable incompatible extensions in database
            if (incompatibleIdentifiers.length > 0) {
                const repo = dataSource.getRepository(Extension);
                for (const identifier of incompatibleIdentifiers) {
                    await repo.update(
                        { identifier, status: ExtensionStatus.ENABLED },
                        { status: ExtensionStatus.DISABLED },
                    );
                }
                this.log(
                    `Disabled ${incompatibleIdentifiers.length} incompatible extension(s) in database.`,
                );
            }
        } catch (err) {
            this.error("Failed to check extension compatibility.", err);
        }
    }

    /**
     * Get extension engine configuration from manifest.json or package.json
     */
    private getExtensionEngine(extensionsDir: string, identifier: string): ExtensionEngine {
        const extensionPath = path.join(extensionsDir, identifier);
        const defaultEngine: ExtensionEngine = { buildingai: "<=25.0.4" };

        // Try manifest.json first
        const manifestPath = path.join(extensionPath, "manifest.json");
        if (fs.existsSync(manifestPath)) {
            try {
                const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
                if (manifest.engine) {
                    return manifest.engine;
                }
            } catch {
                // Ignore parse errors
            }
        }

        // Fallback to package.json
        const packageJsonPath = path.join(extensionPath, "package.json");
        if (fs.existsSync(packageJsonPath)) {
            try {
                const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));
                if (packageJson.engine) {
                    return packageJson.engine;
                }
            } catch {
                // Ignore parse errors
            }
        }

        return defaultEngine;
    }

    private async fixAiModelConfig(dataSource: DataSource): Promise<void> {
        const repo = dataSource.getRepository(AiModel);

        // Fix maxContext field: values > 99 should be reset to 5
        const result = await repo.update({ maxContext: MoreThan(99) }, { maxContext: 5 });

        this.log(`Fixed ${result.affected || 0} AI model(s) with invalid maxContext values.`);
    }

    private async fixWebAppsMenu(dataSource: DataSource): Promise<void> {
        const repo = dataSource.getRepository(DecoratePageEntity);

        // Find all records with name = 'web'
        const webPages = await repo.find({ where: { name: "web" } });

        let updatedCount = 0;

        for (const page of webPages) {
            if (!page.data || typeof page.data !== "object") continue;

            const pageData = page.data as { menus?: Array<any>; layout?: string };
            if (!Array.isArray(pageData.menus)) continue;

            let hasChanges = false;

            for (const menu of pageData.menus) {
                // Check if type is 'plugin' and path starts with '/extensions/'
                if (menu.link?.type === "plugin" && menu.link?.path?.startsWith("/extensions/")) {
                    menu.link.path = menu.link.path.replace(
                        /^\/extensions\//,
                        "/buildingai/extension/",
                    );
                    hasChanges = true;
                }
            }

            if (hasChanges) {
                await repo.update({ id: page.id }, { data: pageData } as any);
                updatedCount++;
            }
        }

        this.log(`Fixed ${updatedCount} web app menu(s) with old extension paths.`);
    }
}

export default Upgrade;
