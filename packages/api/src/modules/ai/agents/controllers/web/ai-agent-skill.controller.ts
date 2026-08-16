import { BuildFileUrl } from "@buildingai/decorators";
import { type UserPlayground } from "@buildingai/db";
import { WebController } from "@common/decorators/controller.decorator";
import {
    Body,
    Delete,
    Get,
    Param,
    Post,
    Req,
    UploadedFile,
    UseInterceptors,
} from "@nestjs/common";
import { IsString, IsUrl } from "class-validator";
import { FileInterceptor } from "@nestjs/platform-express";
import { Playground } from "@buildingai/decorators/playground.decorator";
import type { Request } from "express";

import { AiAgentSkillService } from "../../services/ai-agent-skill.service";

class AddGitSkillDto {
    @IsString()
    @IsUrl({ protocols: ["http", "https"], require_protocol: true })
    gitUrl: string;
}

@WebController("ai-agent-skills")
@BuildFileUrl(["**.url"])
export class AiAgentSkillWebController {
    constructor(private readonly skillService: AiAgentSkillService) {}

    /**
     * 通过上传 zip 文件添加 skill
     */
    @Post(":agentId/upload")
    @UseInterceptors(FileInterceptor("file"))
    async addByUpload(
        @Playground() user: UserPlayground,
        @Param("agentId") agentId: string,
        @UploadedFile() file: Express.Multer.File,
        @Req() request: Request,
    ) {
        if (!file) {
            throw new Error("缺少上传文件");
        }
        return this.skillService.addByUpload(agentId, file, user, request);
    }

    /**
     * 通过远程 git 仓库 URL 添加 skill
     */
    @Post(":agentId/git")
    async addByGit(
        @Playground() user: UserPlayground,
        @Param("agentId") agentId: string,
        @Body() dto: AddGitSkillDto,
        @Req() request: Request,
    ) {
        return this.skillService.addByGit(agentId, dto.gitUrl, user, request);
    }

    /**
     * 列出某智能体的全部 skill
     */
    @Get(":agentId")
    async list(
        @Playground() user: UserPlayground,
        @Param("agentId") agentId: string,
    ) {
        return this.skillService.listByAgent(agentId, user.id);
    }

    /**
     * 删除 skill
     */
    @Delete(":id")
    async remove(@Playground() user: UserPlayground, @Param("id") id: string) {
        await this.skillService.remove(id, user.id);
        return { success: true };
    }
}
