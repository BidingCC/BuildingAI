import { RedisModule } from "@buildingai/cache";
import { Module } from "@nestjs/common";

import { SmsService } from "./services/sms.service";

@Module({
    imports: [RedisModule],
    exports: [SmsService],
    providers: [SmsService],
})
export class SmsModule {}
