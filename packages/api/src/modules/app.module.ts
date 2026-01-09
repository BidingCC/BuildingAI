import { CacheModule, RedisModule } from "@buildingai/cache";
import { createDataSourceConfig } from "@buildingai/config/db.config";
import { getEnabledExtensionsFromConfig, initExtensionCache } from "@buildingai/core/modules";
import { getExtensionSchemaName } from "@buildingai/core/modules";
import {
    BillingModule,
    SecretModule,
    UploadModule as CoreUploadModule,
} from "@buildingai/core/modules";
import { FileUrlModule } from "@buildingai/db";
import { DataSource } from "@buildingai/db/typeorm";
import { DictModule } from "@buildingai/dict";
import { TerminalLogger } from "@buildingai/logger";
import { AuthGuard } from "@common/guards/auth.guard";
import { DemoGuard } from "@common/guards/demo.guard";
import { ExtensionGuard } from "@common/guards/extension.guard";
import { MemberOnlyGuard } from "@common/guards/member-only.guard";
import { PermissionsGuard } from "@common/guards/permissions.guard";
import { SuperAdminGuard } from "@common/guards/super-admin.guard";
import { DatabaseModule } from "@core/database/database.module";
import { AnalyseModule } from "@modules/analyse/analyse.module";
import { AuthModule } from "@modules/auth/auth.module";
import { ChannelModule } from "@modules/channel/channel.module";
import { ExtensionCoreModule } from "@modules/extension/extension.module";
import { HealthModule } from "@modules/health/health.module";
import { MembershipModule } from "@modules/membership/membership.module";
import { DynamicModule, Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_GUARD } from "@nestjs/core";
import { ServeStaticModule } from "@nestjs/serve-static";
import { existsSync } from "fs";
import { join } from "path";

import { AiModule } from "./ai/ai.module";
import { ConfigModule as AppConfigModule } from "./config/config.module";
import { DecorateModule } from "./decorate/decorate.module";
import { FinanceModule } from "./finance/finance.module";
import { MenuModule } from "./menu/menu.module";
import { PayModule } from "./pay/pay.module";
import { PermissionModule } from "./permission/permission.module";
import { Pm2Module } from "./pm2/pm2.module";
import { RechargeModule } from "./recharge/recharge.module";
import { RoleModule } from "./role/role.module";
import { ScheduleModule } from "./schedule/schedule.module";
import { SystemModule } from "./system/system.module";
import { TagModule } from "./tag/tag.module";
import { TestModule } from "./test/test.module";
import { UploadModule } from "./upload/upload.module";
import { UserModule } from "./user/user.module";

@Module({})
export class AppModule {
    static async register(): Promise<DynamicModule> {
        const extensionsDir = join(process.cwd(), "..", "..", "extensions");
        const enabledIdentifiers = await getEnabledExtensionsFromConfig(extensionsDir);

        const extensionsList = await initExtensionCache(extensionsDir, enabledIdentifiers);

        // Create database schemas for extensions before loading extension modules
        await this.createExtensionSchemas(extensionsList);

        const publicPath = join(__dirname, "..", "..", "..", "..", "public");
        const webPath = join(publicPath, "web");

        const webIndexPath = join(webPath, "index.html");

        const shouldUseWebPath = existsSync(webPath) && existsSync(webIndexPath);
        const rootPath = shouldUseWebPath ? webPath : publicPath;

        return {
            module: AppModule,
            imports: [
                ServeStaticModule.forRoot({
                    rootPath,
                    exclude: [
                        ...extensionsList.map((extension) => `/extensions/${extension.identifier}`),
                        ...extensionsList.map((extension) => `/${extension.name}`),
                        process.env.VITE_APP_WEB_API_PREFIX,
                        process.env.VITE_APP_CONSOLE_API_PREFIX,
                    ],
                }),
                ConfigModule.forRoot({
                    isGlobal: true,
                    envFilePath: `../../.env`,
                }),
                FileUrlModule,
                RedisModule,
                CacheModule,
                DictModule,
                DatabaseModule,
                BillingModule,
                AuthModule,
                ChannelModule,
                AiModule,
                AppConfigModule,
                DecorateModule,
                FinanceModule,
                HealthModule,
                MenuModule,
                PayModule,
                PermissionModule,
                MembershipModule,
                Pm2Module,
                RechargeModule,
                RoleModule,
                SystemModule,
                TagModule,
                TestModule,
                CoreUploadModule,
                UploadModule,
                AnalyseModule,
                SecretModule,
                UserModule,
                ScheduleModule,
                await ExtensionCoreModule.register(),
            ],
            controllers: [],
            providers: [
                {
                    provide: APP_GUARD,
                    useClass: DemoGuard,
                },
                {
                    provide: APP_GUARD,
                    useClass: AuthGuard,
                },
                {
                    provide: APP_GUARD,
                    useClass: ExtensionGuard,
                },
                {
                    provide: APP_GUARD,
                    useClass: PermissionsGuard,
                },
                {
                    provide: APP_GUARD,
                    useClass: SuperAdminGuard,
                },
                {
                    provide: APP_GUARD,
                    useClass: MemberOnlyGuard,
                },
            ],
        };
    }

    /**
     * Create database schemas for extensions
     *
     * @param extensionsList List of extensions
     */
    private static async createExtensionSchemas(
        extensionsList: Array<{ identifier: string; name: string }>,
    ): Promise<void> {
        if (!extensionsList || extensionsList.length === 0) {
            TerminalLogger.info(
                "Extension Schema",
                "No extensions found, skipping schema creation",
            );
            return;
        }

        let dataSource: DataSource | null = null;

        try {
            // Create a temporary database connection for schema creation
            const databaseOptions = createDataSourceConfig();
            dataSource = new DataSource({
                ...databaseOptions,
                logging: false,
            });

            await dataSource.initialize();
            TerminalLogger.log(
                "Extension Schema",
                `Creating schemas for ${extensionsList.length} extension(s)...`,
            );

            for (const extension of extensionsList) {
                await this.createSchemaForExtension(dataSource, extension);
            }

            TerminalLogger.success(
                "Extension Schema",
                "All extension schemas created successfully",
            );
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            TerminalLogger.error("Extension Schema", `Failed to create schemas: ${errorMessage}`);
            throw error;
        } finally {
            // Close the temporary connection
            if (dataSource?.isInitialized) {
                await dataSource.destroy();
            }
        }
    }

    /**
     * Create database schema for a single extension
     *
     * @param dataSource Database connection
     * @param extension Extension information
     */
    private static async createSchemaForExtension(
        dataSource: DataSource,
        extension: { identifier: string; name: string },
    ): Promise<void> {
        const schemaName = getExtensionSchemaName(extension.identifier);

        try {
            // Check if schema already exists
            const result = await dataSource.query(
                `SELECT schema_name FROM information_schema.schemata WHERE schema_name = $1`,
                [schemaName],
            );

            if (result.length > 0) {
                TerminalLogger.log(
                    "Extension Schema",
                    `Schema "${schemaName}" already exists, skipping...`,
                );
                return;
            }

            // Create schema
            await dataSource.query(`CREATE SCHEMA IF NOT EXISTS "${schemaName}"`);
            TerminalLogger.success("Extension Schema", `Created schema: ${schemaName}`);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            TerminalLogger.error(
                "Extension Schema",
                `Failed to create schema "${schemaName}": ${errorMessage}`,
            );
            throw error;
        }
    }
}
