import { Module } from "@nestjs/common";

import { SmsConfigWebController } from "./controllers/web/sms-config.controller";

@Module({
    controllers: [SmsConfigWebController],
    imports: [],
    exports: [],
})
export class NotificationModule {}
