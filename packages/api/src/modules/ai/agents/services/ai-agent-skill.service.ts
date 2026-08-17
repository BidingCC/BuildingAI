import { execFile } from "node:child_process";
import { mkdtemp, readdir, realpath, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { isAbsolute, join, relative } from "node:path";
import { URL } from "node:url";
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
        const agent = await this.requireOwnedAgent(agentId, user);
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

            // 2.1 zip-slip 防护：校验解压后所有条目真实路径均落在临时目录内（B7）
            await this.assertNoZipSlip(tmpDir);

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
        const agent = await this.requireOwnedAgent(agentId, user);
        this.validateGitUrl(gitUrl);

        const tmpDir = await mkdtemp(join(tmpdir(), "skill-git-"));
        try {
            // 1. 浅克隆（-- 终止符防止 URL 被当作 git 选项解析，缓解选项注入）
            await execFileAsync("git", ["clone", "--depth", "1", "--", gitUrl, tmpDir], {
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
    async listByAgent(agentId: string, user: UserPlayground): Promise<AiAgentSkill[]> {
        await this.requireOwnedAgent(agentId, user);
        return this.skillRepository.find({
            where: { agentId },
            order: { createdAt: "DESC" },
        });
    }

    /**
     * 删除 skill 并解绑
     */
    async remove(skillId: string, user: UserPlayground): Promise<void> {
        const skill = await this.skillRepository.findOne({ where: { id: skillId } });
        if (!skill) throw HttpErrorFactory.notFound("Skill 不存在");
        await this.requireOwnedAgent(skill.agentId, user);
        await this.skillRepository.delete({ id: skillId });

        // 同步清理 agent.skillIds，避免孤儿引用
        const agent = await this.agentRepository.findOne({ where: { id: skill.agentId } });
        if (agent?.skillIds?.includes(skillId)) {
            agent.skillIds = agent.skillIds.filter((id) => id !== skillId);
            await this.agentRepository.save(agent);
        }
    }

    /**
     * 校验智能体存在且属于当前用户
     */
    private async requireOwnedAgent(agentId: string, user: UserPlayground): Promise<Agent> {
        const agent = await this.agentRepository.findOne({ where: { id: agentId } });
        if (!agent) throw HttpErrorFactory.notFound("智能体不存在");
        // 系统/模板智能体（createBy 为空）仅 isRoot 用户可管理，普通用户一律禁止（B5）
        if (!agent.createBy) {
            if (user.isRoot !== 1) {
                throw HttpErrorFactory.forbidden("无权限操作系统智能体");
            }
            return agent;
        }
        if (agent.createBy !== user.id) {
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
        fileMeta: Record<string, unknown>,
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

    private validateGitUrl(gitUrl: string): void {
        let parsed: URL;
        try {
            parsed = new URL(gitUrl);
        } catch {
            throw HttpErrorFactory.badRequest("请提供合法的 git 仓库 URL");
        }
        if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
            throw HttpErrorFactory.badRequest("仅支持 http/https 协议的 git 仓库 URL");
        }
        if (parsed.username || parsed.password) {
            throw HttpErrorFactory.badRequest("git 仓库 URL 不允许包含账号或密码");
        }
        const host = parsed.hostname.toLowerCase();
        // SSRF 防护：阻止访问本地/内网地址
        if (
            host === "localhost" ||
            host === "0.0.0.0" ||
            host.endsWith(".local") ||
            host.endsWith(".internal") ||
            host.startsWith("127.") ||
            host.startsWith("10.") ||
            host.startsWith("192.168.") ||
            host.startsWith("169.254.") ||
            (host.startsWith("172.") && /^172\.(1[6-9]|2\d|3[01])\./.test(host)) ||
            host === "[::1]" ||
            host.startsWith("fe80")
        ) {
            throw HttpErrorFactory.badRequest("不支持的 git 仓库地址");
        }
    }

    private nameFromUrl(url: string): string {
        const last = url.replace(/\.git$/i, "").split(/[\\/]/).pop() || "git-skill";
        return last;
    }

    /**
     * zip-slip 防护：递归校验解压目录内所有条目真实路径均落在 rootDir 内（B7）。
     * 防御恶意 zip 通过 `../` 等路径将文件写到临时目录之外。
     */
    private async assertNoZipSlip(rootDir: string): Promise<void> {
        const stack = [rootDir];
        while (stack.length) {
            const dir = stack.pop() as string;
            const entries = await readdir(dir, { withFileTypes: true });
            for (const entry of entries) {
                const full = join(dir, entry.name);
                const real = await realpath(full);
                const rel = relative(rootDir, real);
                if (rel === "" || isAbsolute(rel) || rel.startsWith("..")) {
                    throw HttpErrorFactory.badRequest("压缩包包含非法路径，已拒绝");
                }
                if (entry.isDirectory()) stack.push(full);
            }
        }
    }
}
