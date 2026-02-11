import { ExtensionStatus } from "@buildingai/constants/shared/extension.constant";
import {
    AiModel,
    Extension,
    MembershipLevels,
    MembershipPlans,
    Permission,
    PermissionType,
} from "@buildingai/db/entities";
import { DataSource, MoreThan } from "@buildingai/db/typeorm";
import { checkVersionCompatibility, ExtensionEngine } from "@buildingai/utils";
import * as fs from "fs";
import * as path from "path";

import { BaseUpgradeScript, UpgradeContext } from "../../index";

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
            await this.seedMembershipLevels(dataSource);
            await this.seedMembershipPlans(dataSource);
            await this.disableAllExtensions(dataSource);
            await this.fixAiModelConfig(dataSource);

            this.success("Upgrade to version 25.1.0 completed.");
        } catch (error) {
            this.error("Upgrade to version 25.1.0 failed.", error);
            throw error;
        }
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
}

export default Upgrade;
