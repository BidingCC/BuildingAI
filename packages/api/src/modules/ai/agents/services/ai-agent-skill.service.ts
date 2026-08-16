import { execFile } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

import { BaseService } from "@buildingai/base";
import { type UserPlayground } from "@buildingai/db";
import { InjectRepository } from "@buildingai/db/@nestjs/typeorm";
import { Agent, AiAgentSkill } from "@buildingai/db/entities";
import { Repository } from "@buildingai/db/typeorm";
import { HttpErrorFactory } from "@buildingai/errors";
import { UploadService } from "@modules/upload/services/upload.service";
import { Injectable, Logger } from "@nestjs/common";
import { Request } from "express";

import { SkillParserService, type ParsedSkill } from "./skill-parser.service";

const execFileAsync = promisify(execFile);

/**
 * 智能体 Skill 业务服务
 *
 * 负责：
 * - 通过文件上传（zip）添加 skill
 * - 通过远程 git 仓库 URL 添加 skill
 * - skill 列表、删除、绑定到智能体实例
 */
@Injectable()
export class AiAgentSkillService extends BaseService<AiAgentSkill> {
    protected readonly logger = new Logger(AiAgentSkillService.name);

    constructor(
        @InjectRepository(AiAgentSkill)
        private readonly skillRepository: Repository<AiAgentSkill>,
        @InjectRepository(Agent)
        private readonly agentRepository: Repository<Agent>,
        private readonly skillParser: SkillParserService,
        private readonly uploadService: UploadService,
    ) {
        super(skillRepository);
    }

    /**
     * 通过上传的 zip 文件添加 skill
     */
    async addByUpload(
        agentId: string,
        file: Express.Multer.File,
        user: UserPlayground,
        request: Request,
    ): Promise<AiAgentSkill> {
        const agent = await this.requireOwnedAgent(agentId, user.id);
        const tmpDir = await mkdtemp(join(tmpdir(), "skill-upload-"));
        try {
            // FileInterceptor 默认使用内存存储，file.path 为 undefined，只有 file.buffer。
            // 先将 buffer 落盘为临时 zip，再用系统 unzip 解压（避免引入 zip 依赖）。
            const zipPath = join(tmpDir, `${file.originalname || "skill"}.zip`);
            await writeFile(zipPath, file.buffer);

            // 1. 原始 zip 落盘（作为 sourceRef）
            const uploaded = await this.uploadService.saveUploadedFile(
                file,
                request,
                `skill-${agentId}`,
            );

            // 2. 解压到临时目录（使用系统 unzip，避免引入 zip 依赖）
            await execFileAsync("unzip", ["-o", "-q", zipPath, "-d", tmpDir]);

            // 3. 解析 skill 定义
            const parsed = this.skillParser.parseDirectory(
                tmpDir,
                file.originalname.replace(/\.zip$/i, ""),
            );

            // 4. 落库 + 绑定
            return this.persistSkill(agent, parsed, "upload", uploaded.url, {
                originalName: file.originalname,
                size: file.size,
            });
        } catch (err) {
            this.logger.error(`解析上传 skill 失败: ${err}`);
            throw HttpErrorFactory.badRequest(
                `Skill 解析失败：${err instanceof Error ? err.message : String(err)}`,
            );
        } finally {
            await rm(tmpDir, { recursive: true, force: true });
        }
    }

    /**
     * 通过远程 git 仓库 URL 添加 skill
     */
    async addByGit(
        agentId: string,
        gitUrl: string,
        user: UserPlayground,
        request: Request,
    ): Promise<AiAgentSkill> {
        const agent = await this.requireOwnedAgent(agentId, user.id);
        if (!/^https?:\/\/.+/.test(gitUrl)) {
            throw HttpErrorFactory.badRequest("请提供合法的 git 仓库 URL（http/https）");
        }

        const tmpDir = await mkdtemp(join(tmpdir(), "skill-git-"));
        try {
            // 1. 浅克隆
            await execFileAsync("git", ["clone", "--depth", "1", gitUrl, tmpDir], {
                timeout: 60_000,
            });

            // 2. 解析 skill 定义
            const parsed = this.skillParser.parseDirectory(tmpDir, this.nameFromUrl(gitUrl));

            // 3. 落库 + 绑定（git 模式 sourceRef 直接存仓库 URL）
            return this.persistSkill(agent, parsed, "git", gitUrl, {
                gitUrl,
            });
        } catch (err) {
            this.logger.error(`克隆/解析 git skill 失败: ${err}`);
            throw HttpErrorFactory.badRequest(
                `Git Skill 添加失败：${err instanceof Error ? err.message : String(err)}`,
            );
        } finally {
            await rm(tmpDir, { recursive: true, force: true });
        }
    }

    /**
     * 列出某智能体的全部 skill
     */
    async listByAgent(agentId: string, userId: string): Promise<AiAgentSkill[]> {
        await this.requireOwnedAgent(agentId, userId);
        return this.skillRepository.find({
            where: { agentId },
            order: { createdAt: "DESC" },
        });
    }

    /**
     * 删除 skill 并解绑
     */
    async remove(skillId: string, userId: string): Promise<void> {
        const skill = await this.skillRepository.findOne({ where: { id: skillId } });
        if (!skill) throw HttpErrorFactory.notFound("Skill 不存在");
        await this.requireOwnedAgent(skill.agentId, userId);
        await this.skillRepository.delete({ id: skillId });
    }

    /**
     * 校验智能体存在且属于当前用户
     */
    private async requireOwnedAgent(agentId: string, userId: string): Promise<Agent> {
        const agent = await this.agentRepository.findOne({ where: { id: agentId } });
        if (!agent) throw HttpErrorFactory.notFound("智能体不存在");
        if (agent.createBy && agent.createBy !== userId) {
            throw HttpErrorFactory.forbidden("无权限操作该智能体");
        }
        return agent;
    }

    /**
     * 写入 skill 元数据并绑定到智能体
     */
    private async persistSkill(
        agent: Agent,
        parsed: ParsedSkill,
        sourceType: "upload" | "git",
        sourceRef: string,
        fileMeta: Record<string, any>,
    ): Promise<AiAgentSkill> {
        const skill = await this.skillRepository.save(
            this.skillRepository.create({
                agentId: agent.id,
                name: parsed.name,
                description: parsed.description,
                instructions: parsed.instructions,
                sourceType,
                sourceRef,
                fileMeta,
            }),
        );

        // 绑定到智能体 skillIds
        const existing = agent.skillIds ?? [];
        if (!existing.includes(skill.id)) {
            agent.skillIds = [...existing, skill.id];
            await this.agentRepository.save(agent);
        }
        return skill;
    }

    private nameFromUrl(url: string): string {
        const last = url.replace(/\.git$/i, "").split(/[\\/]/).pop() || "git-skill";
        return last;
    }
}
