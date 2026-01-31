import { CacheService } from "@buildingai/cache";
import { TypeOrmModule } from "@buildingai/db/@nestjs/typeorm";
import { User } from "@buildingai/db/entities";
import { Payconfig } from "@buildingai/db/entities";
import { Dict } from "@buildingai/db/entities";
import { Agent } from "@buildingai/db/entities";
import { AiChatMessage } from "@buildingai/db/entities";
import { AccountLog } from "@buildingai/db/entities";
import { RechargeOrder } from "@buildingai/db/entities";
import { Recharge, RefundLog } from "@buildingai/db/entities";
import { DictCacheService } from "@buildingai/dict";
import { DictService } from "@buildingai/dict";
import { PayModule } from "@common/modules/pay/pay.module";
import { RefundService } from "@common/modules/refund/services/refund.service";
import { FinanceController } from "@modules/finance/controllers/finance.controller";
import { FinanceService } from "@modules/finance/services/finance.service";
import { PayconfigService } from "@modules/system/services/payconfig.service";
import { Module } from "@nestjs/common";

@Module({
    imports: [
        TypeOrmModule.forFeature([
            Dict,
            AccountLog,
            User,
            Recharge,
            RechargeOrder,
            Payconfig,
            AiChatMessage,
            RefundLog,
            Agent,
        ]),
        PayModule,
    ],
    controllers: [FinanceController],
    providers: [
        FinanceService,
        RefundService,
        DictCacheService,
        CacheService,
        DictService,
    ],
    exports: [
        FinanceService,
        RefundService,
        DictCacheService,
        CacheService,
        DictService,
    ],
})
export class FinanceModule {}
