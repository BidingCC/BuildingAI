# Skills 管理指南

本项目使用统一的 skills 管理系统，通过 node 命令将根目录 `skills/` 文件夹下的 skills 同步到各个 AI 编辑器的配置目录中。
仅用于开发环境，我们的 skill 默认不生效，仅在你运行`同步`命令后， skill 会自动生效与你的 AI 编辑器中， 在根目录可以查看到对应后缀 如 .cursor/skills/xxx。

初始化：通常情况下开发你仅需要运行 `pnpm skills sync 编辑器名称即可` 如 `pnpm skills sync cursor`

## 支持的 AI 编辑器

Skills 会自动同步到以下 AI 编辑器的配置目录：

- `.agent/skills/` - Agent 编辑器
- `.agents/skills/` - Agents 编辑器
- `.gemini/skills/` - Gemini 编辑器
- `.kiro/skills/` - Kiro 编辑器
- `.trae/skills/` - Trae 编辑器
- `.windsurf/skills/` - Windsurf 编辑器
- `.cursor/skills/` - Cursor 编辑器

## 命令使用

### 同步单个 skill

同步到所有编辑器：
```bash
pnpm skills sync <skill-name>
```

同步到特定编辑器：
```bash
pnpm skills sync <skill-name> <editor>
```

示例：
```bash
# 同步到所有编辑器
pnpm skills sync project-architecture

# 仅同步到 Cursor 编辑器
pnpm skills sync project-architecture cursor
```

### 同步全部 skills

同步到所有编辑器：
```bash
pnpm skills sync all
```

同步到特定编辑器：
```bash
pnpm skills sync <editor>
```

示例：
```bash
# 同步所有 skills 到所有编辑器
pnpm skills sync all

# 同步所有 skills 到 Cursor 编辑器
pnpm skills sync cursor
```

### 删除单个 skill

从所有编辑器删除：
```bash
pnpm skills remove <skill-name>
```

从特定编辑器删除：
```bash
pnpm skills remove <skill-name> <editor>
```

示例：
```bash
# 从所有编辑器删除
pnpm skills remove project-architecture

# 仅从 Cursor 编辑器删除
pnpm skills remove project-architecture cursor
```

### 删除全部 skills

从所有编辑器删除：
```bash
pnpm skills remove all
```

从特定编辑器删除：
```bash
pnpm skills remove all <editor>
```

示例：
```bash
# 从所有编辑器删除所有 skills
pnpm skills remove all

# 从 Cursor 编辑器删除所有 skills
pnpm skills remove all cursor
```

### 支持的编辑器

可用的编辑器名称：
- `cursor` - Cursor 编辑器
- `trae` - Trae 编辑器
- `agent` - Agent 
- `agents` - Agents
- `gemini` - Gemini 编辑器
- `kiro` - Kiro 编辑器
- `windsurf` - Windsurf 编辑器

## Skills 管理流程

### 现有 Skills 位置

所有 skills 都存放在项目根目录的 `skills/` 文件夹下，每个 skill 都是一个独立的文件夹。

### 新增 Skill 流程

1. 在 `skills/` 目录下创建新的 skill 文件夹
2. 添加 skill 相关文件（如 `SKILL.md`、`references/` 等）
3. 执行同步命令：
   ```bash
   # 同步到所有编辑器
   pnpm skills sync <skill-name>
   
   # 或仅同步到特定编辑器
   pnpm skills sync <skill-name> <editor>
   
   # 或同步全部 skills
   pnpm skills sync all
   ```

### 删除 Skill 流程

1. 先执行删除命令，从 AI 编辑器配置目录中移除：
   ```bash
   # 从所有编辑器删除
   pnpm skills remove <skill-name>
   
   # 或从特定编辑器删除
   pnpm skills remove <skill-name> <editor>
   
   # 或删除全部
   pnpm skills remove all
   ```
2. 然后手动删除根目录 `skills/` 文件夹下对应的 skill 文件夹

## 查找和添加 Skills

你可以在 [https://skillsmp.com/](https://skillsmp.com/) 上查找和发现更多可用的 skills。找到合适的 skill 后，执行以下步骤：
1.在终端添加 skill 时，选择安装到 project 然后选择 copy 而不是软连接下载。
2.下载完成可以在任意 .agent/skills/ 文件夹中查看 skill。
3.如果这个 skill 仅用于你自己的 AI 应用程序，不需要给其他开发者，那么你可以选择不复制到 根目录的 skills 文件夹下。
4.如果你希望这个 skill 给别人使用，那么你需要把 .agent/skills/你下载的 skill 文件复制到根目录的 skills 文件夹下， 然后提交即可

## 现有 Skills 说明

### ai-sdk

**作用**：提供 AI SDK 相关的文档和帮助，用于构建 AI 驱动的功能。

**使用场景**：
- 询问 AI SDK 函数（如 `generateText`、`streamText`、`ToolLoopAgent`、`tools` 等）
- 构建 AI 代理、聊天机器人或文本生成功能
- 了解 AI 提供商（OpenAI、Anthropic 等）、流式传输、工具调用或结构化输出

### frontend-design

**作用**：创建独特、生产级的前端界面，具有高质量的设计。

**使用场景**：
- 构建 Web 组件、页面、应用程序
- 设计网站、落地页、仪表板、React 组件、HTML/CSS 布局
- 美化或样式化任何 Web UI

**特点**：避免通用的 AI 美学，生成具有创意和精致代码的 UI 设计。

### postgresql-table-design

**作用**：设计 PostgreSQL 特定的数据库架构。

**使用场景**：
- 设计数据库表结构
- 了解 PostgreSQL 最佳实践
- 数据类型选择、索引、约束、性能模式
- PostgreSQL 高级特性

**特点**：涵盖 PostgreSQL 特有的最佳实践、数据类型、索引、约束、性能模式和高级特性。

### project-architecture

**作用**：BuildingAI monorepo 项目结构和架构指南。

**使用场景**：
- 理解项目组织结构
- 定位文件位置
- 理解包关系和依赖
- 查找特定功能的实现位置
- 导航代码库结构

**特点**：对于任何需要理解项目布局、导入模式、模块组织或跨包依赖的开发任务都至关重要。

### skill-creator

**作用**：创建有效 skills 的指南。

**使用场景**：
- 创建新的 skill
- 更新现有 skill
- 扩展 Claude 的能力，提供专业知识、工作流或工具集成

**特点**：提供创建模块化、自包含 skill 包的指导，这些包通过提供专业知识、工作流和工具来扩展 Claude 的能力。

### skill-developer

**作用**：创建和管理 Claude Code skills，遵循 Anthropic 最佳实践。

**使用场景**：
- 创建新 skills
- 修改 skill-rules.json
- 理解触发模式
- 使用 hooks
- 调试 skill 激活
- 实现渐进式披露

**特点**：涵盖 skill 结构、YAML frontmatter、触发类型（关键词、意图模式、文件路径、内容模式）、执行级别（block、suggest、warn）、hook 机制（UserPromptSubmit、PreToolUse）、会话跟踪和 500 行规则。

### skill-writer

**作用**：指导用户为 Claude Code 创建 Agent Skills。

**使用场景**：
- 创建、编写、设计新的 Skill
- 处理 SKILL.md 文件
- 设计 skill 结构和 frontmatter
- 故障排除 skill 发现问题

**特点**：帮助创建结构良好的 Agent Skills，遵循最佳实践和验证要求。
