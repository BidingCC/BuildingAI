import { AppEntity } from "../decorators/app-entity.decorator";
import { Column } from "../typeorm";
import { BaseEntity } from "./base";

/**
 * 智能体 Skill 实体
 *
 * 每个 Skill 是一段「指令 + 知识」配置，从上传的 zip/文件夹
 * 或远程 git 仓库中解析得到（优先 skill.json，否则 SKILL.md frontmatter）。
 * 文件原始内容落盘（磁盘/云存储），本表仅保存元数据与引用路径，
 * 并绑定到具体的智能体实例（agentId + Agent.skillIds）。
 */
@AppEntity({ name: "ai_agent_skill", comment: "智能体技能" })
export class AiAgentSkill extends BaseEntity {
    /**
     * 关联智能体ID
     */
    @Column({ type: "uuid", comment: "关联智能体ID" })
    agentId: string;

    /**
     * Skill 名称
     */
    @Column({ length: 255, comment: "Skill 名称" })
    name: string;

    /**
     * Skill 描述
     */
    @Column({ type: "text", nullable: true, comment: "Skill 描述" })
    description?: string;

    /**
     * 注入到 system prompt 的指令文本
     */
    @Column({ type: "text", comment: "注入 prompt 的指令文本" })
    instructions: string;

    /**
     * 来源类型
     */
    @Column({
        type: "enum",
        enum: ["upload", "git"],
        comment: "来源类型：upload-文件上传, git-远程仓库",
    })
    sourceType: "upload" | "git";

    /**
     * 来源引用
     * upload: 落盘路径 / 访问 URL
     * git: 仓库 URL
     */
    @Column({ type: "text", comment: "来源引用（落盘路径或 git 仓库 URL）" })
    sourceRef: string;

    /**
     * 原始文件/仓库元数据（如文件名列表、commit、branch 等）
     */
    @Column({ type: "json", nullable: true, comment: "原始文件/仓库元数据" })
    fileMeta?: Record<string, any>;
}
