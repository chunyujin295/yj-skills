---
name: workflow-tweak
description: "Workflow 预设路径：非 bug 的小改动（tweak）。跳过设计，直接 open → lightweight build → light verify → archive。适用于文案、配置、文档或 prompt 的局部优化。"
trigger: /workflow-tweak
publish: true
---

# Workflow 预设路径：Tweak

小改动工作流：open → lightweight build → light verify → archive。跳过设计 brainstorming 和完整 plan，适用于文案调整、配置调整、文档或 prompt 的局部优化。

**适用条件**（必须全部满足）：
1. 不新增 capability
2. 不改变架构
3. 不涉及接口变化
4. 通常不超过 3 个 tasks、4 个 files

**不适用**：如变更过程中发现需要 capability、架构或接口调整，应升级为完整 `/workflow` 流程。

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
open → lightweight build → light verify → archive
```

### 1. 快速开启

跳过长探索，直接创建精简版产物：
- `proposal.md` — 变更动机 + 目标 + 范围
- `design.md` — 简短实现说明（无需方案对比）
- `tasks.md` — 不超过 3 个任务

```bash
"$WF_SCRIPT" state init <name> tweak
"$WF_SCRIPT" guard <name> open --apply
```

### 2. 轻量构建

使用 tweak 默认值：`build_mode: direct`。

逐任务执行：
1. 读取 tasks.md 未完成任务
2. 对每个任务：
   - 修改代码
   - 运行格式化命令
   - 运行相关测试
   - 勾选 `- [ ]` → `- [x]`
   - 提交，commit message：`tweak: <描述>`
3. 全部完成后运行项目测试和构建命令

```bash
"$WF_SCRIPT" state set <name> isolation branch
"$WF_SCRIPT" state set <name> build_mode direct
"$WF_SCRIPT" guard <name> build --apply
```

### 3. 轻量验证

复用 `/workflow-verify`。Tweak 必须保持轻量验证条件（≤ 3 tasks、≤ 4 files）。

**立即执行：** 加载 workflow-verify skill。

### 4. 归档

复用 `/workflow-archive`。

**立即执行：** 加载 workflow-archive skill。

---

## 连续执行模式

Tweak 流程为**一次性连续执行**。调用后在 tweak 自有步骤间自动推进。但以下情况必须暂停：
1. 遇到升级条件 → 用 AskUserQuestion 确认
2. 验证阶段的验证失败决策和分支处理决策

---

## 升级条件

满足以下**任一**条件时，停止 tweak，升级为完整 `/workflow`：

| 条件 | 说明 |
|------|------|
| 改动涉及 **5+ 文件** | 超出小改动范围 |
| 多模块协调修改 | 需要跨组件协调 |
| 需要新增测试用例 **5+** | 变更复杂度上升 |
| 配置项新增或删除 | 非值修改的配置变更 |
| 需要新增 capability | 超出局部优化 |

升级时**必须用 AskUserQuestion 暂停等待用户确认**。确认后：
```bash
"$WF_SCRIPT" state set <name> workflow full
```
然后加载 `/workflow-design` skill 补充设计。

---

## 退出条件

- 小改动已完成，测试通过
- change 已归档
- **阶段守卫**：build → verify 前运行 guard，verify → archive 前按 verify 规则运行 guard
