import { WebController } from "@common/decorators";
import { Get } from "@nestjs/common";

@WebController("sms-config")
export class SmsConfigWebController {
    @Get()
    async getConfigList() {
        return [];
    }
}
