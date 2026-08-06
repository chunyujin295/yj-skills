---
name: workflow-verify
description: "Workflow 阶段 4：验证与收尾。用 /workflow-verify 调用。验证实现符合设计，处理开发分支。"
trigger: /workflow-verify
publish: true
---

# Workflow 阶段 4：验证与收尾（Verify）

验证实现质量，处理开发分支。

## 前置条件

- 代码已提交（阶段 3 完成）
- tasks.md 全部任务已完成

## 脚本定位

```bash
WF_SCRIPT="${WF_SCRIPT:-$(find . "$HOME"/.*/skills "$HOME/.config" "$HOME/.trae" \
  -path '*/workflow/scripts/wf.sh' -type f -print -quit 2>/dev/null)}"
if [ -z "$WF_SCRIPT" ]; then
  echo "ERROR: wf.sh not found. Ensure the workflow skill is installed." >&2
  exit 1
fi
```

---

## Step 0: 入口状态验证

```bash
"$WF_SCRIPT" state check <name> verify
```

**幂等性**：verify 阶段所有检查可安全重复执行。如 `verify_result` 已为 `pass` 且 `branch_status` 已为 `handled`，直接执行 guard 流转。

---

## Step 1: 改动规模评估

```bash
"$WF_SCRIPT" state scale <name>
```

自动统计任务数、文件数，设置 `verify_mode: light / full`。

---

## Step 1b: Dirty Worktree 检查

**必须按 `workflow/reference/dirty-worktree.md` 共享协议执行。**

验证阶段的特殊处理规则见协议第 4 节「verify 阶段出现未提交改动」。
---

## Step 2a: 轻量验证（verify_mode: light）

当规模评估结果为"light"时，执行 5 项快速检查：

1. ✅ tasks.md 全部任务已完成 `[x]`
2. ✅ 改动与 tasks.md 描述一致（`git diff` 对照 tasks 内容）
3. ✅ 编译通过（执行项目对应的构建命令）
4. ✅ 相关测试通过
5. ✅ 无硬编码密钥、无新增 unsafe 操作

**通过标准**：5 项全部 OK，无 CRITICAL 问题。

**报告格式**：简表列出 5 项检查结果 + PASS/FAIL。

---

## Step 2b: 完整验证（verify_mode: full）

当规模评估结果为"full"时，执行深度验证：

1. ✅ tasks.md 全部任务已完成
2. ✅ 实现符合 design.md 高层设计决策
3. ✅ 实现符合 proposal.md 目标
4. ✅ 编译通过 + 全部测试通过
5. ✅ 无安全问题
6. ✅ design.md 与实际实现无矛盾（Spec 漂移检测）

### Spec 漂移处理（用户决策点）

若检查项 6 发现矛盾，**必须用 AskUserQuestion 暂停**：

**选项**：
- A：在 design.md 追加 "Implementation Divergence" 章节记录偏差原因
- B：回到 build 阶段，更新 design.md + 代码对齐
- C：确认偏差可接受，继续验证

---

## Step 2c: 验证失败决策（阻塞点）

验证不通过时**必须用 AskUserQuestion 暂停**。

暂停时列出：
- 失败项
- 严重程度（CRITICAL / WARNING / SUGGESTION）
- 推荐处理方式

**不确定性原则**：无法确定严重程度时降级处理。仅对构建失败、测试失败、安全问题使用 CRITICAL。

**选项**：
- 「全部修复」→ 运行 `"$WF_SCRIPT" state transition <name> verify-fail`，回到 build
- 「逐项处理」→ CRITICAL 必须修复，非 CRITICAL 可接受偏差

---

## Step 3: 分支收尾

验证通过后，处理开发分支。

### 验证测试

```bash
# 运行项目测试套件（自动检测）
npm test / cargo test / pytest / go test ./...
```

测试失败 → 停止，不能进入收尾。

### 检测环境

```bash
GIT_DIR=$(cd "$(git rev-parse --git-dir)" 2>/dev/null && pwd -P)
GIT_COMMON=$(cd "$(git rev-parse --git-common-dir)" 2>/dev/null && pwd -P)
```

- `GIT_DIR == GIT_COMMON` → 普通仓库
- `GIT_DIR != GIT_COMMON` + 命名分支 → worktree
- `GIT_DIR != GIT_COMMON` + detached HEAD → 外部管理的工作区

### 确定 base 分支

```bash
git merge-base HEAD main 2>/dev/null || git merge-base HEAD master 2>/dev/null
```

### 4 个选项（阻塞点，必须用 AskUserQuestion 暂停等待用户选择）

```
实现完成。你想怎么处理？

1. 合并回 <base-branch> 本地
2. 推送并创建 Pull Request
3. 保持分支（稍后处理）
4. 丢弃工作

选哪个？
```

**Detached HEAD 时只展示 3 个选项**（无合并选项）。

### 执行选择

**选项 1：合并本地**
```bash
MAIN_ROOT=$(git -C "$(git rev-parse --git-common-dir)/.." rev-parse --show-toplevel)
cd "$MAIN_ROOT"
git checkout <base-branch>
git pull
git merge <feature-branch>
# 验证测试
# 清理 worktree（如果需要）
git branch -d <feature-branch>
```

**选项 2：推送 PR**
```bash
git push -u origin <feature-branch>
gh pr create --title "<title>" --body "$(cat <<'EOF'
## Summary
<变更摘要>

## Test Plan
- [ ] <验证步骤>
EOF
)"
```
保留 worktree（用户需要迭代 PR 反馈）。

**选项 3：保持** — 报告分支和 worktree 路径，不做操作。

**选项 4：丢弃** — 确认（需输入 'discard'）→ 清理 → `git branch -D <feature-branch>`

### Worktree 清理规则（仅选项 1 和 4）

```bash
GIT_DIR=$(cd "$(git rev-parse --git-dir)" 2>/dev/null && pwd -P)
GIT_COMMON=$(cd "$(git rev-parse --git-common-dir)" 2>/dev/null && pwd -P)
```

- `GIT_DIR == GIT_COMMON` → 普通仓库，无 worktree
- worktree 路径在 `.worktrees/` 或 `worktrees/` 下 → 我们创建的，清理
- 其他路径 → 不清理（外部管理的）

清理前必须 cd 到主仓库根目录：
```bash
MAIN_ROOT=$(git -C "$(git rev-parse --git-common-dir)/.." rev-parse --show-toplevel)
cd "$MAIN_ROOT"
git worktree remove <worktree-path>
git worktree prune
```

---

## Step 4: 记录验证证据

```bash
mkdir -p workflow/changes/<name>/
# 写验证报告
echo "# Verify Report" > workflow/changes/<name>/verify-report.md
"$WF_SCRIPT" state set <name> verification_report workflow/changes/<name>/verify-report.md
"$WF_SCRIPT" state set <name> branch_status handled
```

---

## Step 5: 退出守卫

```bash
"$WF_SCRIPT" guard <name> verify --apply
```

Guard 检查：
- verification_report 路径存在
- branch_status == handled

全部 PASS 后自动流转到 `phase: archive`。

---

## 退出条件

- 验证通过
- 分支已处理
- verification_report 已记录
- branch_status == handled
- **阶段守卫**：`"$WF_SCRIPT" guard <name> verify --apply`

## 自动流转

> **REQUIRED NEXT SKILL:** 调用 `/workflow-archive` skill 进入归档阶段。
