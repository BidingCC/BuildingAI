import { BaseController } from "@buildingai/base";
import { BuildFileUrl } from "@buildingai/decorators/file-url.decorator";
import { ConsoleController } from "@common/decorators";
import { Permissions } from "@common/decorators/permissions.decorator";
import { QuerySignRecordDto } from "@modules/award/dto/query-sign-record.dto";
import { AwardRecordService } from "@modules/award/services/award-record.service";
import { Get, Query } from "@nestjs/common";

@ConsoleController("award-record", "奖励记录管理")
export class AwardRecordController extends BaseController {
    constructor(private readonly awardRecordService: AwardRecordService) {
        super();
    }

    @Get("signRecord")
    @Permissions({
        code: "sign-record-list",
        name: "签到记录列表",
        description: "签到记录列表",
    })
    @BuildFileUrl(["**.avatar"])
    async signRecords(@Query() querySignRecordDto: QuerySignRecordDto) {
        return this.awardRecordService.signRecords(querySignRecordDto);
    }
}
