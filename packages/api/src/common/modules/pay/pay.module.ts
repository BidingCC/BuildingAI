import { TypeOrmModule } from "@buildingai/db/@nestjs/typeorm";
import { Payconfig } from "@buildingai/db/entities";
import { PayconfigService } from "@modules/system/services/payconfig.service";
import { Module } from "@nestjs/common";

import { AlipayService } from "./services/alipay.service";
import { PayfactoryService } from "./services/payfactory.service";
import { WxPayService } from "./services/wxpay.service";

@Module({
    imports: [TypeOrmModule.forFeature([Payconfig])],
    controllers: [],
    providers: [PayconfigService, WxPayService, AlipayService, PayfactoryService],
    exports: [PayconfigService, WxPayService, AlipayService, PayfactoryService],
})
export class PayModule {}
