export default {
  page: {
    title: "对话",
    description: "开始新的对话",
    newConversation: "新对话",
  },
  aiGeneratedDisclaimer: "内容由 AI 生成，请仔细甄别",
  // Chat config page
  config: {
    tabs: {
      welcome: "欢迎界面",
      suggestions: "建议选项",
      chat: "对话配置",
      model: "模型配置",
    },
    welcomeTab: {
      title: "欢迎语",
      description: "对话页首屏展示的标题、描述与页脚",
      placeholder: {
        welcomeTitle: "例如：👋 Hi, How can I help you?",
        footerInfo: "例如：内容由AI生成，无法确保真实准确，仅供参考。",
      },
      form: {
        welcomeTitle: "欢迎标题",
        welcomeDescription: "欢迎描述",
        footerInfo: "页脚信息",
        footerPlaceholder: "例如：内容由AI生成，无法确保真实准确，仅供参考。",
        footerDescription: "对话区域底部的提示文案，选填",
      },
    },
    suggestionsTab: {
      title: "建议选项",
      description: "是否在对话页展示建议选项供用户快速选择",
      form: {
        enableSuggestions: "启用建议选项",
        enableDescription: "展示建议选项供用户快速选择",
        addNew: "新增建议项",
        inputPlaceholder: "输入文案后点击添加",
        addedItems: "已添加的建议项",
        empty: "暂无建议项，在上方输入后点击「添加」",
        notFilled: "未填写",
        remove: "移除",
      },
    },
    chatTab: {
      title: "对话相关",
      description: "附件上传与对话行为相关配置",
      form: {
        attachmentSizeLimit: "对话附件大小限制（MB）",
        attachmentSizePlaceholder: "10",
        attachmentSizeDescription: "单次上传附件的最大体积，单位：兆字节（MB）",
      },
    },
    modelTab: {
      title: "模型路由",
      description: "为记忆提取、标题生成等功能指定模型，不配置则对应功能不启用",
      tooltip: {
        memoryModel: "用于从对话中提取并写入长期记忆。不配置则不会读写长期记忆。",
        memoryModelHint: "用于提取长期记忆，可选用低成本模型",
        titleModel: "用于根据对话内容自动生成会话标题与追问建议。不配置则不会自动生成。",
        titleModelHint: "用于自动生成对话标题与追问建议，可选用低成本模型",
        help: "说明",
      },
      placeholder: {
        notEnabled: "不启用",
      },
      form: {
        memoryModel: "记忆提取模型",
        memoryModelPlaceholder: "不启用",
        memoryModelDescription: "用于从对话中提取并写入长期记忆。不配置则不会读写长期记忆。",
        memoryModelHint: "用于提取长期记忆，可选用低成本模型",
        titleModel: "标题生成模型",
        titleModelPlaceholder: "不启用",
        titleModelDescription: "用于根据对话内容自动生成会话标题与追问建议。不配置则不会自动生成。",
        titleModelHint: "用于自动生成对话标题与追问建议，可选用低成本模型",
      },
    },
    actions: {
      saveSettings: "保存设置",
      resetSettings: "重置设置",
      resetSuccess: "已重置为当前保存的配置",
    },
    validation: {
      welcomeTitleRequired: "欢迎标题为必填项",
      attachmentSizePositive: "对话附件大小限制须为正数（单位：MB）",
    },
  },

  // Chat record page
  record: {
    searchPlaceholder: "搜索对话标题、摘要或用户名",
    feedbackFilter: {
      all: "全部反馈",
      highLike: "高赞率",
      highDislike: "高踩率",
      hasFeedback: "有反馈",
    },
    conversation: {
      unnamed: "未命名对话",
      unknownUser: "未知用户",
      messages: "{count} 条消息",
      tokens: "{count} tokens",
    },
    empty: {
      noResults: "没有找到与「{keyword}」相关的对话",
      noData: "暂无对话记录",
    },
    confirm: {
      deleteTitle: "删除确认",
      deleteDescription: "确定要删除这条对话记录吗？",
    },
    toast: {
      deleteSuccess: "对话记录已删除",
      deleteFailed: "删除失败: {error}",
    },
    feedback: {
      like: "赞",
      dislike: "踩",
      reason: "原因：",
      noAnalysis: "暂无踩赞分析",
      highLikeRate: "高赞率",
      highDislikeRate: "高踩率",
      balancedFeedback: "反馈均衡",
      likeRateHigh: "赞率较高",
      dislikeRateHigh: "踩率较高",
      thumbsUp: "赞",
      thumbsDown: "踩",
      confidence: "置信度",
      noFeedbackAnalysis: "暂无踩赞分析",
      loadingMessages: "加载消息中...",
    },
    drawer: {
      title: "对话详情",
      userLabel: "用户：",
      noMessages: "暂无消息",
      confidence: "置信度",
    },
    user: "用户",
    delete: "删除",
    messages: "消息",
    tokens: "tokens",
    askAssistantTip: "你可以通过提问了解知识库中的相关内容",
  },
};
