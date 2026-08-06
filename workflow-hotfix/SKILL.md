---
name: workflow-hotfix
description: "Workflow 预设路径：Bug fix / 热修复。跳过设计，直接 open → build → verify → archive。适用于行为修复、不涉及新 capability 设计的场景。"
trigger: /workflow-hotfix
publish: true
---

# Workflow 预设路径：Hotfix

快速 bug fix 工作流：open → build → verify → archive。跳过设计 brainstorming，适用于行为修复、不涉及新 capability 设计的场景。

**适用条件**（必须全部满足）：
1. 修复已有功能的 bug，不新增 capability
2. 不涉及接口变更或架构调整
3. 改动范围可预估（通常 ≤ 2 个文件）

**不适用**：如修复过程发现需要架构调整，应升级为完整 `/workflow` 流程。

---

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

## 流程（4 阶段）

```
open → build → verify → archive
```

### 1. 快速开启

复用 workflow-open 的 change 创建能力，但使用 hotfix 默认值：不执行长探索，直接进入精简 change 创建。

创建精简版产物：
- `proposal.md` — 问题描述 + 根因分析 + 修复目标（无需方案对比）
- `design.md` — 修复方案（1 个即可，无需多方案对比）
- `tasks.md` — 修复任务清单

初始化状态：
```bash
"$WF_SCRIPT" state init <name> hotfix
```

验证并流转：
```bash
"$WF_SCRIPT" guard <name> open --apply
```

### 2. 直接构建

使用 hotfix 默认值：`build_mode: direct`。

逐任务执行：
1. 读取 `workflow/changes/<name>/tasks.md`，获取未完成任务列表
2. 对每个未完成任务：
   - 根据任务描述修改代码
   - 运行项目格式化命令
   - 运行相关测试确认通过
   - 将 tasks.md 中对应 `- [ ]` 勾选为 `- [x]`
   - 提交代码，commit message：`fix: <描述>`
3. 全部任务完成后，运行项目相关测试和构建命令

**根因消除检查**：确认问题代码不再存在。如根因未消除，继续修复。

```bash
"$WF_SCRIPT" state set <name> isolation branch
"$WF_SCRIPT" state set <name> build_mode direct
```

完成后：
```bash
"$WF_SCRIPT" guard <name> build --apply
```

### 3. 验证

复用 `/workflow-verify`。由规模评估决定轻量或完整验证。

**立即执行：** 加载 workflow-verify skill。

### 4. 归档

复用 `/workflow-archive`。

**立即执行：** 加载 workflow-archive skill。

---

## 连续执行模式

Hotfix 流程为**一次性连续执行**。调用后在 hotfix 自有步骤间自动推进，不主动停顿。但以下情况必须暂停：
1. 遇到升级条件 → 用 AskUserQuestion 确认
2. 验证阶段的验证失败决策和分支处理决策

---

## 升级条件

满足以下**任一**条件时，停止 hotfix，升级为完整 `/workflow`：

| 条件 | 说明 |
|------|------|
| 改动涉及 **3+ 文件** | 超出单点修复范围 |
| 架构变更 | 新模块、新接口、新依赖 |
| 数据库 schema 变更 | 结构性调整 |
| 引入新的 public API | 修复产生了新的对外接口 |
| 修复范围超出单一函数/模块 | 需要多处协调修改 |

升级时**必须用 AskUserQuestion 暂停等待用户确认**。确认后：
```bash
"$WF_SCRIPT" state set <name> workflow full
```
然后加载 `/workflow-design` skill 补充设计，后续正常走完整流程。

---

## 退出条件

- Bug 已修复，测试通过
- change 已归档
- **阶段守卫**：build → verify 前运行 guard，verify → archive 前按 verify 规则运行 guard
