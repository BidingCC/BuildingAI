import { TypeOrmModule } from "@buildingai/db/@nestjs/typeorm";
import { User } from "@buildingai/db/entities";
import { AccountLog } from "@buildingai/db/entities";
import { Global, Module } from "@nestjs/common";

import { AppBillingService } from "./app-billing.service";
import { BaseBillingService } from "./base-billing.service";

/**
 * Billing Module (Global)
 *
 * Provides centralized billing and power management functionality.
 * This module is global, so you don't need to import it in every module.
 * Just import it once in your root module (e.g., AppModule).
 *
 * Services provided:
 * - BaseBillingService: Core billing functionality
 * - AppBillingService: Application-level billing
 * - BillingService: Legacy service (deprecated, use AppBillingService instead)
 */
@Global()
@Module({
    imports: [TypeOrmModule.forFeature([User, AccountLog])],
    providers: [BaseBillingService, AppBillingService],
    exports: [BaseBillingService, AppBillingService, TypeOrmModule.forFeature([User, AccountLog])],
})
export class BillingModule {}
