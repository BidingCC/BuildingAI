# LifeOS / BuildingAI 项目长期记忆

## Git 仓库管理（2026-08-16 建立）
- 本地目录 `/Users/guoshenghui/Downloads/lifeos-BuildingAI-master` **现在是 git 仓库**
- `origin` = `git@github.com:piepiepie/BuildingAI.git`（用户从官方 BidingCC fork 的）
- `upstream` = `git@github.com:BidingCC/BuildingAI.git`（官方源，仅 fetch/merge，用于同步更新）
- 主分支名：**`master`**（不是 main）
- 基线版本：clone 自官方 26.1.2
- 初始基线提交：`e62a4167 chore: import lifeos local customizations as codebuddy baseline`
  - 分支 `feature/init-codebuddy`，已 push 到 origin（GitHub 可提 PR 合并进 master）
- 分支规范：二次开发开新分支，**后缀 `-codebuddy`**（如 `feature/xxx-codebuddy`），不在 master 直改
- 日常同步官方更新：
  ```bash
  git fetch upstream
  git checkout master
  git merge upstream/master
  git push origin master
  ```
- 备份旧目录：`lifeos-BuildingAI-master-bak`（切换前备份，验证无误后可删）
- `.gitignore` 已追加忽略：根目录散落截图/草稿（`JourneyMap_*.md`、`_tmp_*`、`*.png`、`bazi-*.png` 等）+ 构建产物 `public/web/assets/`、`public/web/extensions/`（这些是本地 `pnpm build` 生成，upstream 未跟踪）

## 关键运行时环境
- Docker 容器：`lifeos-nodejs`(4091) / `lifeos-postgres`(→5432) / `lifeos-redis`(→6379)
- PM2 进程名：`buildingai`（运行在 lifeos-nodejs 容器内，从 packages/api 启动；宿主 pm2 无效，PM2 在容器内）
- 数据库名：`lifeos`
- API 端口：**4091**（控制台/后台在 4091 的 `/console` 路径；memory 曾记 4090 是旧认知，实际用户用 4091）
- `node_modules` / `.output` / `storage` 等运行大目录**不进 git**（已忽略），迁移时用同盘 `mv` 恢复
- Git 认证：ssh key 已配置（`ssh -T git@github.com` 认证为 piepiepie），无需 https 凭证
- 注意：macOS 自带 rsync 是 2.6.9，不支持 `--info=progress2`，用 `-aP` 替代

## 扩展前端路由机制与坑（2026-08-16 排查 life-coach 打不开）
- 访问扩展应用：前端 `/apps/[identifier]` 页面用 iframe 加载 `${origin}/extension/${identifier}`（单数前缀，代码在 `packages/client/src/pages/apps/[identifier].tsx` 第 44 行）。
- 后端路由注册在 `packages/api/src/common/utils/system.ts`：启动时扫描 `extensions/<id>/.output/public/`，把 `index.html` 读入内存缓存，并用 `app.useStaticAssets` 挂到 `/extension/<id>` 前缀（index:false）。同时 `app.module.ts` 把 `/extension/<id>` 从默认静态服务排除，交给该逻辑。
- **坑**：Nuxt 多应用构建的扩展前端产物输出在 `public/web/extensions/<id>/`（复数路径），不在 `extensions/<id>/.output/public/` 下 → 启动时扫不到 → `/extension/<id>` 路由未注册 → 请求返回 404「Cannot GET」。
- **临时修复（已做，运行层，不进 git）**：`ln -s ../../../public/web/extensions/life-coach extensions/life-coach/.output/public`，然后 `docker exec lifeos-nodejs pm2 restart buildingai` 生效。`.output` 已被 gitignore，不影响仓库。
- **长期修复建议**：改 `system.ts` 的 `extensionsMain`，当 `.output/public` 不存在时回退到 `public/web/extensions/<id>`，让所有 Nuxt 扩展自动工作；可提交到 codebuddy 分支。
- 验证命令：`curl -o /dev/null -w "%{http_code}" http://localhost:4091/extension/life-coach/`（应 200）

## 官方开发文档：离线知识库 + 专属技能（2026-08-16 已建）
- **已把 `https://doc.buildingai.cc/llms.txt` 全部 319 篇 `*.md` 镜像到本地**，离线可用，无需联网。
- **语料目录**：`/Users/guoshenghui/Downloads/lifeos-BuildingAI-master/.codebuddy/knowledge/buildingai-help/`
  - `*.md`：319 篇文档（文件名=文档 ID，如 `8555126m0.md`）
  - `_index.md`：带层级的标题→文件名索引（开发前先查它定位）
  - `_llms_index.txt`：官方 llms.txt 原始副本（核对在线更新用）
- **专属技能 `buildingai-docs`**：位于 `~/.codebuddy/skills/buildingai-docs/SKILL.md`，触发词「BuildingAI 文档/LifeOS 开发/插件开发/扩展 SDK/接口文档/框架约定/计费接入/部署教程」。技能内已写明检索流程。
- **自动使用约定（开发时务必遵守）**：
  1. 做任何 BuildingAI/LifeOS 二次开发、插件/扩展、接口、部署、计费任务时，**先用 `search_content` 检索上述本地语料目录**（或 grep `_index.md` 找标题），再 `read_file` 读原文——**不要靠记忆猜框架约定**。
  2. 联网 `web_fetch https://doc.buildingai.cc/<docid>.md` 仅作兜底（镜像缺篇/需确认在线最新版）。
  3. 文档约定与 `packages/`、`extensions/` 实际代码交叉验证后再动手。
- 语料为 2026-08-16 快照，已在 `.gitignore` 忽略 `.codebuddy/knowledge/`，不污染 git。
- 高频 doc id：框架总览 `75445077f0` / 目录结构 `7977727m0` / 启动链路 `8554794m0` / 请求链路 `8554940m0` / BaseController `8554961m0` / 插件前端 `8555121m0` / 插件后端 `8555116m0` / Extension SDK `8555126m0` / 计费主程序 `8555097m0` / 计费插件 `8555133m0` / 应用二开 `8849389m0`

## 通用排查流程（沿用）
- 应用专属记忆见 `extensions/<ext>/docs/fix-record.md`
- 生产环境改动后：`docker exec lifeos-nodejs pm2 restart buildingai`（API 变更需重启；静态资源变更也需，因 server 读 index.html 进内存缓存）
- 浏览器缓存：硬刷新 `Cmd+Shift+R`
