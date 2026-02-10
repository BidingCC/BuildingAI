# Skills Management Guide

This project uses a unified skills management system, which syncs skills from the root directory's `skills/` folder to the configuration directories of various AI editors via node commands.
It is intended for the development environment only. By default, our skills are not active. They will automatically take effect in your AI editor only after you run the `sync` command. You can find the corresponding folders in the root directory with suffixes like `.cursor/skills/xxx`.

Initialization: Typically for development, you only need to run `pnpm skills sync <editor-name>`, for example: `pnpm skills sync cursor`.

## Supported AI Editors

Skills are automatically synced to the configuration directories of the following AI editors:

- `.agent/skills/` - Agent Editor
- `.agents/skills/` - Agents Editor
- `.gemini/skills/` - Gemini Editor
- `.kiro/skills/` - Kiro Editor
- `.trae/skills/` - Trae Editor
- `.windsurf/skills/` - Windsurf Editor
- `.cursor/skills/` - Cursor Editor

## Command Usage

### Sync a Single Skill

Sync to all editors:
```bash
pnpm skills sync <skill-name>
```

Sync to a specific editor:
```bash
pnpm skills sync <skill-name> <editor>
```

Examples:
```bash
# Sync to all editors
pnpm skills sync project-architecture

# Sync to the Cursor editor only
pnpm skills sync project-architecture cursor
```

### Sync All Skills

Sync to all editors:
```bash
pnpm skills sync all
```

Sync to a specific editor:
```bash
pnpm skills sync <editor>
```

Examples:
```bash
# Sync all skills to all editors
pnpm skills sync all

# Sync all skills to the Cursor editor
pnpm skills sync cursor
```

### Remove a Single Skill

Remove from all editors:
```bash
pnpm skills remove <skill-name>
```

Remove from a specific editor:
```bash
pnpm skills remove <skill-name> <editor>
```

Examples:
```bash
# Remove from all editors
pnpm skills remove project-architecture

# Remove from the Cursor editor only
pnpm skills remove project-architecture cursor
```

### Remove All Skills

Remove from all editors:
```bash
pnpm skills remove all
```

Remove from a specific editor:
```bash
pnpm skills remove all <editor>
```

Examples:
```bash
# Remove all skills from all editors
pnpm skills remove all

# Remove all skills from the Cursor editor
pnpm skills remove all cursor
```

### Supported Editors

Available editor names:
- `cursor` - Cursor Editor
- `trae` - Trae Editor
- `agent` - Agent Editor
- `agents` - Agents Editor
- `gemini` - Gemini Editor
- `kiro` - Kiro Editor
- `windsurf` - Windsurf Editor

## Skills Management Process

### Location of Existing Skills

All skills are stored in the `skills/` folder in the project root directory. Each skill is an independent folder.

### Process for Adding a New Skill

1.  Create a new skill folder under the `skills/` directory.
2.  Add skill-related files (e.g., `SKILL.md`, `references/`, etc.).
3.  Execute the sync command:
    ```bash
    # Sync to all editors
    pnpm skills sync <skill-name>

    # Or sync to a specific editor only
    pnpm skills sync <skill-name> <editor>

    # Or sync all skills
    pnpm skills sync all
    ```

### Process for Removing a Skill

1.  First, execute the remove command to remove it from the AI editor configuration directories:
    ```bash
    # Remove from all editors
    pnpm skills remove <skill-name>

    # Or remove from a specific editor
    pnpm skills remove <skill-name> <editor>

    # Or remove all
    pnpm skills remove all
    ```
2.  Then, manually delete the corresponding skill folder under the root directory's `skills/` folder.

## Finding and Adding Skills

You can find and discover more available skills at [https://skillsmp.com/](https://skillsmp.com/). After finding a suitable skill, follow these steps:
1.  When adding the skill via the terminal, choose to install to the project and select **copy** instead of a symbolic link download.
2.  After the download is complete, you can view the skill in any `.agent/skills/` folder.
3.  If this skill is only for your own AI application and not needed by other developers, you may choose **not** to copy it to the root directory's `skills` folder.
4.  If you want this skill to be available for others, you need to copy the downloaded skill files from `.agent/skills/<your-downloaded-skill>` to the root directory's `skills` folder, and then commit the changes.

## Description of Existing Skills

### ai-sdk

**Purpose**: Provides AI SDK-related documentation and assistance for building AI-driven features.

**Use Cases**:
- Inquiring about AI SDK functions (e.g., `generateText`, `streamText`, `ToolLoopAgent`, `tools`, etc.)
- Building AI agents, chatbots, or text generation features
- Understanding AI providers (OpenAI, Anthropic, etc.), streaming, tool calling, or structured outputs

### frontend-design

**Purpose**: Creates unique, production-grade frontend interfaces with high-quality design.

**Use Cases**:
- Building web components, pages, applications
- Designing websites, landing pages, dashboards, React components, HTML/CSS layouts
- Beautifying or styling any web UI

**Features**: Avoids generic AI aesthetics and generates UI designs with creative and polished code.

### postgresql-table-design

**Purpose**: Designs PostgreSQL-specific database schemas.

**Use Cases**:
- Designing database table structures
- Understanding PostgreSQL best practices
- Data type selection, indexing, constraints, performance patterns
- PostgreSQL advanced features

**Features**: Covers PostgreSQL-specific best practices, data types, indexing, constraints, performance patterns, and advanced features.

### project-architecture

**Purpose**: BuildingAI monorepo project structure and architecture guide.

**Use Cases**:
- Understanding project organizational structure
- Locating file positions
- Understanding package relationships and dependencies
- Finding the implementation location of specific features
- Navigating the codebase structure

**Features**: Crucial for any development task that requires understanding the project layout, import patterns, module organization, or cross-package dependencies.

### skill-creator

**Purpose**: Guide for creating effective skills.

**Use Cases**:
- Creating a new skill
- Updating an existing skill
- Extending Claude's capabilities by providing expertise, workflows, or tool integrations

**Features**: Provides guidance for creating modular, self-contained skill packages that extend Claude's capabilities by offering expertise, workflows, and tools.

### skill-developer

**Purpose**: Creates and manages Claude Code skills, following Anthropic best practices.

**Use Cases**:
- Creating new skills
- Modifying skill-rules.json
- Understanding trigger patterns
- Using hooks
- Debugging skill activation
- Implementing progressive disclosure

**Features**: Covers skill structure, YAML frontmatter, trigger types (keywords, intent patterns, file paths, content patterns), execution levels (block, suggest, warn), hook mechanisms (UserPromptSubmit, PreToolUse), session tracking, and the 500-line rule.

### skill-writer

**Purpose**: Guides users in creating Agent Skills for Claude Code.

**Use Cases**:
- Creating, writing, designing new Skills
- Handling SKILL.md files
- Designing skill structure and frontmatter
- Troubleshooting skill discovery issues

**Features**: Helps create well-structured Agent Skills, following best practices and validation requirements.