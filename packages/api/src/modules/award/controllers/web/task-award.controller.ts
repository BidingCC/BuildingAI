import { BaseController } from "@buildingai/base";
import { type UserPlayground } from "@buildingai/db";
import { Playground } from "@buildingai/decorators";
import { WebController } from "@common/decorators/controller.decorator";
import { TaskAwardService } from "@modules/award/services/task-award.service";
import { Get, Post } from "@nestjs/common";

@WebController("task-award")
export class TaskAwardController extends BaseController {
    constructor(private readonly taskAwardService: TaskAwardService) {
        super();
    }

    @Get("center")
    public async center(@Playground() user: UserPlayground) {
        return await this.taskAwardService.center(user);
    }

    @Post("sign")
    public async sign(@Playground() user: UserPlayground) {
        return await this.taskAwardService.sign(user);
    }
}
