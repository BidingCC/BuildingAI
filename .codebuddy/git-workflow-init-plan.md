# Plan: Git 工作流初始化（重新 Clone + 迁移现有改动 + 双 Remote + codebuddy 分支）

> 目标：把当前「非 git 管理」的 `lifeos-BuildingAI-master` 源码，纳入基于你 fork（`piepiepie/BuildingAI`）的 git 管理，
> 并配置 `upstream` 指向官方（`BidingCC/BuildingAI`），建立 `codebuddy` 二次开发分支，
> 使「同步官方更新」与「合并二次开发」两件事都能长期做。

---

## 1. 前提确认

- [x] 用户已从官方 fork 到 `piepiepie/BuildingAI`（用户已确认）
- [ ] 本地 git 已配置 GitHub 凭证（ssh key 或 `gh auth login`），否则 push 会失败
- [ ] 当前运行的 Docker 服务（`lifeos-nodejs` / `lifeos-postgres` / `lifeos-redis`）可短暂停止用于目录切换

---

## 2. 目录与 Remote 规划

- **最终运行/源码目录**：`/Users/guoshenghui/Downloads/lifeos-BuildingAI-master`（保持原名 → Docker 挂载路径不变）
- **origin** = `https://github.com/piepiepie/BuildingAI.git`（你的 fork，可 push）
- **upstream** = `https://github.com/BidingCC/BuildingAI.git`（官方源，仅 fetch/merge，用于同步更新）
- **本次基线分支**：`feature/init-codebuddy`（承载当前已有的二次开发）
- **后续功能分支**：`feature/<模块>-codebuddy`（沿用你定的后缀规范）

---

## 3. 执行步骤

### 步骤 1：确认 GitHub 凭证
```bash
gh auth status            # 或 ssh -T git@github.com
```
> 若未登录，需你手动 `gh auth login` 或配置 ssh key。AI 无法代填凭证，此步阻塞后续 push。

### 步骤 2：clone fork 到临时目录，并加 upstream
```bash
cd /Users/guoshenghui/Downloads
git clone https://github.com/piepiepie/BuildingAI.git BuildingAI-tmp
cd BuildingAI-tmp
git remote add upstream https://github.com/BidingCC/BuildingAI.git
git remote -v            # 确认 origin + upstream 都在
git checkout -b feature/init-codebuddy
```
> clone 下来的是官方 26.1.1 干净源码（含 `.git` 历史），作为版本基准。

### 步骤 3：迁移现有二次开发（保留 `.git`，覆盖源码；停服务避免文件占用）
```bash
# 如需要，先停相关容器
cd /Users/guoshenghui/Downloads/lifeos-BuildingAI-master
# docker compose stop 相关服务（保持挂载定义不变）

rsync -a --delete \
  --exclude='.git' --exclude='node_modules' --exclude='.output' \
  --exclude='storage' --exclude='logs' --exclude='.turbo' \
  --exclude='.pnpm-store' --exclude='.playwright-cli' --exclude='.DS_Store' \
  /Users/guoshenghui/Downloads/lifeos-BuildingAI-master/ \
  /Users/guoshenghui/Downloads/BuildingAI-tmp/
```
> 说明：`.git`（来自 clone）保留；源码被你的二次开发覆盖；`node_modules/.output/storage` 等大目录不复制（稍后恢复）。

### 步骤 4：恢复运行所需、但不进 git 的目录
```bash
cp -r /Users/guoshenghui/Downloads/lifeos-BuildingAI-master/node_modules \
      /Users/guoshenghui/Downloads/BuildingAI-tmp/ 2>/dev/null
cp -r /Users/guoshenghui/Downloads/lifeos-BuildingAI-master/.output \
      /Users/guoshenghui/Downloads/BuildingAI-tmp/ 2>/dev/null
cp -r /Users/guoshenghui/Downloads/lifeos-BuildingAI-master/storage \
      /Users/guoshenghui/Downloads/BuildingAI-tmp/ 2>/dev/null
```
> 若复制后运行异常，回退用 pnpm 全路径重新 install（见风险项）。

### 步骤 5：提交二次开发基线并推送
```bash
cd /Users/guoshenghui/Downloads/BuildingAI-tmp
git add -A
git status                 # 复核变更范围（应仅为你的二次开发 vs 26.1.1）
git commit -m "chore: import lifeos local customizations as codebuddy baseline"
git push -u origin feature/init-codebuddy   # 需你 approve
```

### 步骤 6：切换运行目录（保持 Docker 挂载路径不变）
```bash
cd /Users/guoshenghui/Downloads
mv lifeos-BuildingAI-master lifeos-BuildingAI-master-bak
mv BuildingAI-tmp lifeos-BuildingAI-master
```
> 现在 `lifeos-BuildingAI-master` 既是运行目录又是 git 仓库，Docker 挂载绝对路径不变，服务无感。

### 步骤 7：重启服务并验证
```bash
cd /Users/guoshenghui/Downloads/lifeos-BuildingAI-master
# 若 node_modules 是复制的通常可直接用；否则用 pnpm 全路径重新 install
# PM2 重启：npx pm2 restart buildingai （Docker 内）
# 或 docker compose 重启相关容器
```
> 验证：浏览器打开 `localhost:4091`（API）/ `localhost:4090`（后台），确认正常；`git status` 应干净。

### 步骤 8（可选，你手动或授权）：GitHub 合并进 main
在 GitHub 对 `piepiepie/BuildingAI` 从 `feature/init-codebuddy` 向 `main` 提 PR 并合并。
验证无误后再做，AI 不自动操作。

---

## 4. 日常开发工作流（固化）

- **新功能**：`git checkout -b feature/xxx-codebuddy`（基于 main 或 feature/init-codebuddy）
- **提交后**：`git push -u origin feature/xxx-codebuddy` → GitHub PR 合并进主分支
- **同步官方更新**：
  ```bash
  git fetch upstream
  git checkout main
  git merge upstream/main
  git push origin main
  # 再把 main rebase/merge 进你的开发分支，解决冲突
  ```

---

## 5. 风险与回滚

- **风险1**：rsync 覆盖误删 clone 中需要的文件 → 用 `--exclude` 精确排除，且旧目录先保留为 `-bak` 备份。
- **风险2**：`node_modules` 复制不全导致运行异常 → 回退用 pnpm 全路径重新 `install`。
- **风险3**：Docker 挂载若写死绝对路径 → 因最终目录名不变，不受影响。
- **回滚**：若出问题，
  ```bash
  cd /Users/guoshenghui/Downloads
  rm -rf lifeos-BuildingAI-master
  mv lifeos-BuildingAI-master-bak lifeos-BuildingAI-master
  ```
  即可恢复原状。

---

## 6. 待你确认 / 授权项

- [ ] GitHub 凭证已就绪（步骤 1）
- [ ] 允许停止 Docker 服务做目录切换（步骤 3 / 6）
- [ ] 允许 `git push` 到你的 fork（步骤 5，需你 approve）
- [ ] 确认后由 AI 按本 plan 执行（或你自行按命令清单执行）
