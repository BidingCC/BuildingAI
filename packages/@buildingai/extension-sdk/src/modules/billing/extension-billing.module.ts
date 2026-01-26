import { BaseBillingService } from "@buildingai/core/modules";
import { TypeOrmModule } from "@buildingai/db/@nestjs/typeorm";
import { User } from "@buildingai/db/entities";
import { AccountLog } from "@buildingai/db/entities";
import { Global, Module } from "@nestjs/common";

import { ExtensionBillingService } from "./extension-billing.service";

/**
 * Extension Billing Module (Global)
 */
@Global()
@Module({
    imports: [TypeOrmModule.forFeature([User, AccountLog])],
    providers: [BaseBillingService, ExtensionBillingService],
    exports: [
        BaseBillingService,
        ExtensionBillingService,
        TypeOrmModule.forFeature([User, AccountLog]),
    ],
})
export class ExtensionBillingModule {}
