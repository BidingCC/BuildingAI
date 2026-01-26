import { TypeOrmModule } from "@buildingai/db/@nestjs/typeorm";
import { RefundLog } from "@buildingai/db/entities";
import { Module } from "@nestjs/common";

import { RefundService } from "./services/refund.service";

@Module({
    imports: [TypeOrmModule.forFeature([RefundLog])],
    providers: [RefundService],
    exports: [RefundService],
})
export class RefundModule {}
