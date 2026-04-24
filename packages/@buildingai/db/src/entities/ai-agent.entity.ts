import type {
    AgentWxcomConfig,
    AnnotationConfig,
    AutoQuestionsConfig,
    ContextConfig,
    FormFieldConfig,
    MemoryConfig,
    ModelConfig,
    ModelRouting,
    QuickCommandConfig,
    ThirdPartyIntegrationConfig,
    ToolConfig,
    VoiceConfig,
} from "@buildingai/types/ai/agent-config.interface";

import { AppEntity } from "../decorators/app-entity.decorator";
import { NormalizeFileUrl } from "../decorators/file-url.decorator";
import { Column, JoinTable, ManyToMany } from "../typeorm";
import { BaseEntity } from "./base";
import { SquarePublishStatus } from "./datasets.entity";
import { Tag } from "./tag.entity";

/**
 * 智能体实体
 */
@AppEntity({ name: "ai_agent", comment: "智能体管理" })
export class Agent extends BaseEntity {
    /**
     * 智能体名称
     */
    @Column({ length: 255, comment: "智能体名称" })
    name: string;

    /**
     * 智能体描述
     */
    @Column({ type: "text", nullable: true, comment: "智能体描述" })
    description?: string;

    /**
     * 创建模式
     */
    @Column({ type: "text", nullable: true, comment: "创建模式" })
    createMode: string;

    /**
     * 智能体头像
     */
    @Column({ type: "text", nullable: true, comment: "智能体头像" })
    @NormalizeFileUrl()
    avatar?: string;

    /**
     * 对话头像
     * 用于在对话界面展示的专属头像，便于与主头像区分
     */
    @Column({ type: "text", nullable: true, comment: "对话头像" })
    chatAvatar?: string;

    /**
     * 角色设定
     * 定义智能体的身份、性格、专业领域和行为准则
     * 支持表单变量替换，例如：{{userName}}、{{userType}}、{{company}}
     *
     * 示例：
     * - "你是一位专业的客服助手，用户姓名是{{userName}}，请用友好、专业的态度回答用户问题。"
     * - "你是一位{{domain}}领域的专家，拥有丰富的经验和专业知识，请为用户提供准确、详细的解答。"
     * - "你是一位{{role}}，性格{{personality}}，擅长{{skills}}，请以{{tone}}的语气与用户交流。"
     */
    @Column({ type: "text", nullable: true, comment: "角色设定" })
    rolePrompt?: string;

    /**
     * 是否显示对话上下文
     */
    @Column({ type: "boolean", default: true, comment: "是否显示对话上下文" })
    showContext: boolean;

    /**
     * 是否显示引用来源
     */
    @Column({ type: "boolean", default: true, comment: "是否显示引用来源" })
    showReference: boolean;

    /**
     * 是否开启联网搜索
     */
    @Column({ type: "boolean", default: false, comment: "是否开启联网搜索" })
    enableWebSearch: boolean;

    /**
     * 是否开启文件上传
     */
    @Column({ type: "boolean", default: false, comment: "是否开启文件上传" })
    enableFileUpload: boolean;

    /**
     * 是否开启对话头像
     */
    @Column({ type: "boolean", default: false, comment: "是否开启对话头像" })
    chatAvatarEnabled: boolean;

    /**
     * 记忆配置
     */
    @Column({ type: "json", nullable: true, comment: "记忆配置" })
    memoryConfig?: MemoryConfig;

    /**
     * 访问用户数量
     */
    @Column({ type: "int", default: 0, comment: "访问用户数量" })
    userCount: number;

    /**
     * 模型配置（主对话模型）
     * 包含模型ID和参数配置
     */
    @Column({ type: "json", nullable: true, comment: "模型配置" })
    modelConfig?: ModelConfig;

    /**
     * 多模型路由配置
     * 为记忆提取、规划、反思、追问建议、语音等功能指定独立模型
     * 未配置的功能自动回退到主 modelConfig
     */
    @Column({ type: "json", nullable: true, comment: "多模型路由配置" })
    modelRouting?: ModelRouting;

    /**
     * 上下文窗口管理配置
     * 控制最大上下文消息数、token 数及截断策略
     */
    @Column({ type: "json", nullable: true, comment: "上下文窗口管理" })
    contextConfig?: ContextConfig;

    /**
     * 语音配置
     * STT（语音转文字）和 TTS（文字转语音）模型配置
     */
    @Column({ type: "json", nullable: true, comment: "语音配置" })
    voiceConfig?: VoiceConfig;

    /**
     * 工具配置
     * 控制工具审批、超时等行为
     */
    @Column({ type: "json", nullable: true, comment: "工具配置" })
    toolConfig?: ToolConfig;

    /**
     * 问答标注配置
     * 开启、相似度阈值、向量模型
     */
    @Column({ type: "json", nullable: true, comment: "问答标注配置" })
    annotationConfig?: AnnotationConfig;

    /**
     * 最大执行步数（ToolLoop 循环上限）
     */
    @Column({ type: "int", default: 10, comment: "最大执行步数" })
    maxSteps: number;

    /**
     * 关联知识库ID列表
     */
    @Column({
        type: "simple-array",
        nullable: true,
        comment: "关联知识库ID列表",
    })
    datasetIds?: string[];

    /**
     * 开场白
     * 智能体在对话开始时主动发送的第一条消息
     * 用于自我介绍、引导用户或设置对话氛围
     * 支持表单变量替换
     *
     * 示例：
     * - "您好！我是{{userName}}的专属助手，很高兴为您服务！"
     * - "欢迎来到{{company}}，我是您的智能客服，有什么可以帮助您的吗？"
     * - "Hi {{userName}}！我是{{role}}，专门负责{{domain}}相关的问题，请告诉我您需要什么帮助？"
     */
    @Column({ type: "text", nullable: true, comment: "开场白" })
    openingStatement?: string;

    /**
     * 开场问题
     * 智能体在对话开始时主动提出的问题，引导用户进入对话
     * 帮助用户快速了解智能体的能力和服务范围
     */
    @Column({ type: "json", nullable: true, comment: "开场问题" })
    openingQuestions?: string[];

    /**
     * 快捷指令
     * 为用户提供快速访问的常用指令，提升对话效率
     * 每个指令包含头像、名称、内容、回复方式等配置
     *
     * 指令类型：
     * - custom: 使用预设的固定回复内容
     * - model: 调用AI模型生成动态回复
     *
     * 示例配置：
     * [
     *   {
     *     avatar: "👋", name: "打招呼", content: "你好",
     *     replyType: "custom", replyContent: "您好！很高兴见到您！"
     *   },
     *   {
     *     avatar: "❓", name: "帮助", content: "我需要帮助",
     *     replyType: "model", replyContent: ""
     *   }
     * ]
     */
    @Column({ type: "json", nullable: true, comment: "快捷指令" })
    quickCommands?: QuickCommandConfig[];

    /**
     * 自动追问
     * 智能体回复后自动生成相关问题建议，引导用户继续对话
     * 提升用户参与度和对话深度
     *
     * 配置选项：
     * - enabled: 是否开启自动追问功能
     * - customRuleEnabled: 是否使用自定义追问规则
     * - customRule: 自定义追问规则，指导AI生成更符合业务场景的问题
     *
     * 示例规则：
     * - "根据用户问题生成3个相关的技术问题"
     * - "针对产品咨询，生成关于功能、价格、服务的问题"
     * - "基于用户角色，生成个性化的跟进问题"
     */
    @Column({ type: "json", nullable: true, comment: "自动追问" })
    autoQuestions?: AutoQuestionsConfig;

    /**
     * 表单字段配置
     * 定义智能体支持的表单变量字段，用于动态替换角色设定中的变量
     * 每个字段包含：字段名、标签、类型、验证规则等
     *
     * 使用场景：
     * - 个性化对话：根据用户信息定制回复
     * - 角色定制：根据用户角色调整智能体身份
     * - 上下文增强：添加公司、部门等背景信息
     *
     * 示例配置：
     * [
     *   { name: "userName", label: "用户姓名", type: "text", required: true },
     *   { name: "userType", label: "用户类型", type: "select", options: [{label: "VIP", value: "vip"}] },
     *   { name: "company", label: "公司名称", type: "text" }
     * ]
     */
    @Column({ type: "json", nullable: true, comment: "表单字段配置" })
    formFields?: FormFieldConfig[];

    /**
     * 表单字段输入值
     * 存储用户填写的表单数据，用于预览和测试
     * 这些数据会用于替换角色设定中的变量占位符
     *
     * 示例：
     * {
     *   "userName": "张三",
     *   "userType": "vip",
     *   "company": "阿里巴巴"
     * }
     */
    @Column({ type: "json", nullable: true, comment: "表单字段输入值" })
    formFieldsInputs?: Record<string, any>;

    /**
     * MCP服务器ID列表
     * 智能体可使用的MCP工具服务器列表
     * 这些服务器提供的工具会在对话中自动可用
     *
     * 示例：
     * ["server-id-1", "server-id-2", "server-id-3"]
     */
    @Column({
        type: "simple-array",
        nullable: true,
        comment: "MCP服务器ID列表",
    })
    mcpServerIds?: string[];

    @Column({ type: "boolean", default: false, comment: "是否已发布到广场" })
    publishedToSquare: boolean;

    @Column({ type: "timestamptz", nullable: true, comment: "发布到广场的时间" })
    publishedAt?: Date | null;

    @Column({
        type: "enum",
        enum: SquarePublishStatus,
        default: SquarePublishStatus.NONE,
        comment:
            "发布到广场审核状态：none-未申请/已撤销，pending-待审核，approved-已通过，rejected-已拒绝",
    })
    squarePublishStatus: SquarePublishStatus;

    @Column({ type: "uuid", nullable: true, comment: "广场发布审核人ID" })
    squareReviewedBy?: string | null;

    @Column({ type: "timestamptz", nullable: true, comment: "广场发布审核时间" })
    squareReviewedAt?: Date | null;

    @Column({ type: "text", nullable: true, comment: "广场发布拒绝原因" })
    squareRejectReason?: string | null;

    @Column({
        type: "varchar",
        length: 255,
        nullable: true,
        comment: "创建者ID",
    })
    createBy: string;

    @Column({ type: "json", nullable: true, comment: "发布配置" })
    publishConfig?: {
        enableSite?: boolean;
        accessToken?: string | null;
        enableApiKey?: boolean;
        apiKey?: string | null;
        allowCopy?: boolean;
        wxcomConfig?: AgentWxcomConfig;
    };

    @Column({ type: "json", nullable: true, comment: "第三方平台集成配置" })
    thirdPartyIntegration?: ThirdPartyIntegrationConfig;

    @Column({ type: "int", nullable: true, comment: "智能体装修排序字段" })
    decorateSort?: number;

    @ManyToMany(() => Tag, (tag) => tag.agents)
    @JoinTable({
        name: "ai_agent_tags",
        joinColumn: { name: "agent_id", referencedColumnName: "id" },
        inverseJoinColumn: {
            name: "tag_id",
            referencedColumnName: "id",
        },
    })
    tags?: Tag[];
}
