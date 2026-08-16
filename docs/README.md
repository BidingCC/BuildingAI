# LifeOS 项目文档

本目录存放 LifeOS 平台的通用文档，与具体扩展应用无关的架构设计、开发规范等内容。

## 文档结构

```
docs/                              # 主目录：通用文档
├── README.md                      # 本文件（文档索引）
├── architecture.md                # 平台整体架构
├── development-guide.md           # 开发指南
├── extension-guide.md             # 扩展开发规范
└── ...

extensions/                       # 各扩展应用目录
├── bazi-profile/
│   ├── docs/                    # bazi-profile 应用专属文档
│   │   └── prd.md              # 产品需求文档（PRD）
│   └── ...
├── simple-blog/
│   ├── docs/                    # simple-blog 应用专属文档
│   └── ...
└── ...
```

## 文档分类原则

| 文档类型 | 存放位置 | 说明 |
|----------|----------|------|
| 平台通用架构、规范 | `docs/` | 所有扩展共享的内容 |
| 单个扩展的 PRD、设计文档 | `extensions/<ext-name>/docs/` | 仅与该扩展相关 |
| 扩展开发指南 | `docs/extension-guide.md` | 通用开发规范 |
| 个人记忆/上下文 | `.codebuddy/memory/` | AI 助手跨会话记忆，不对外 |

## 各扩展文档入口

- [bazi-profile](../../extensions/bazi-profile/docs/prd.md) — 八字档案管理 + AI 报告生成
- simple-blog — 待补充

---

> 新增扩展时，请在对应 `extensions/<ext-name>/` 下创建 `docs/` 目录存放应用专属文档。
