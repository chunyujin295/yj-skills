---
name: workflow-build
description: "Workflow 阶段 3：计划与构建。用 /workflow-build 调用。制定计划并选择执行方式（subagent 或 sequential）实施。"
trigger: /workflow-build
publish: true
---

# Workflow 阶段 3：计划与构建（Build）

制定实施计划，选择执行方式，逐任务构建。

## 前置条件

- design.md 已创建（阶段 2 完成）
- 活跃 change 存在

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
"$WF_SCRIPT" state check <name> build
```

验证通过后继续。验证失败时报告具体原因。

**幂等性**：build 阶段所有操作可安全重复执行。读取 `.workflow.yaml` 的 `phase` 字段确认仍在 build 阶段，读取 tasks.md 找到第一个未勾选任务继续执行。已提交的任务不得重复提交。

---

## Step 1: 制定计划

**立即执行：** 制定详细实施计划。

### 文件结构映射

读取 design.md 后，先映射哪些文件将被创建或修改：
- 设计边界清晰、接口定义良好的单元
- 文件变更相关的应放在一起
- 已有代码库遵循现有模式

### Bite-Sized Task 粒度

**每个步骤是一个原子操作（2-5 分钟）：**
- "写失败的测试" → 步骤
- "运行确认失败" → 步骤
- "写最小实现" → 步骤
- "运行确认通过" → 步骤
- "提交" → 步骤

### 计划格式

```markdown
# <Feature Name> 实施计划

**目标：** <一句话描述>
**架构：** <2-3 句话>
**技术栈：** <关键技术/库>

---

### Task 1: <组件名>

**文件：**
- Create: `exact/path/to/file`
- Modify: `exact/path/to/existing:123-145`
- Test: `tests/exact/path/to/test`

- [ ] **Step 1: 写失败的测试**

\```python
def test_specific_behavior():
    result = function(input)
    assert result == expected
\```

- [ ] **Step 2: 运行确认失败**

Run: `pytest tests/path/test.py::test_name -v`
Expected: FAIL with "function not defined"

- [ ] **Step 3: 写最小实现**

\```python
def function(input):
    return expected
\```

- [ ] **Step 4: 运行确认通过**

Run: `pytest tests/path/test.py::test_name -v`
Expected: PASS

- [ ] **Step 5: 提交**

\```bash
git add tests/path/test.py src/path/file.py
git commit -m "feat: add specific feature"
\```
```

### 零占位符

每个步骤必须包含工程师需要的实际内容。这些是**计划失败**——绝不写：
- "TBD"、"TODO"、"稍后实现"、"补充细节"
- "添加适当的错误处理" / "添加验证" / "处理边界情况"
- "为上面的代码写测试"（没有实际测试代码）
- "类似 Task N"（重复代码——工程师可能乱序阅读任务）
- 描述做什么但不展示怎么做的步骤（代码步骤需要代码块）

### 自检

写完计划后，用全新的眼光审视：

1. **Spec 覆盖率**：扫 design.md 每个章节/需求。能指向实现它的任务吗？列出差距。
2. **占位符扫描**：搜索上面的红旗模式。修复。
3. **类型一致性**：后面任务中使用的类型、方法签名、属性名是否与前面定义的一致？

发现差距 → 补充任务。发现占位符 → 替换为实际内容。发现不一致 → 修复。

### 记录 base_ref

```bash
git rev-parse HEAD
```

### 保存计划

保存到 `workflow/changes/<name>/plan.md`。

```bash
"$WF_SCRIPT" state set <name> plan workflow/changes/<name>/plan.md
"$WF_SCRIPT" state set <name> base_ref <git-rev-parse-HEAD>
```

---

## Step 2: plan-ready 暂停点（阻塞点）

计划写入后，**必须使用 AskUserQuestion 暂停**：

| 选项 | 行为 | 说明 |
|------|------|------|
| A | 继续执行 | 保持在当前模型中，进入 Step 3 |
| B | 暂停切换模型 | 记录 `build_pause: plan-ready`，本次停止 |

用户选择继续：
```bash
"$WF_SCRIPT" state set <name> build_pause null
```

用户选择暂停：
```bash
"$WF_SCRIPT" state set <name> build_pause plan-ready
```

设置 `build_pause: plan-ready` 后，当前调用停止。不要选择 `isolation` 或 `build_mode`。

### plan-ready 恢复点

如果恢复时检测到 `build_pause: plan-ready` + plan 文件存在：
1. 告知用户当前停在 plan-ready 暂停点
2. 用户确认继续后：
```bash
"$WF_SCRIPT" state set <name> build_pause null
```
3. 继续 Step 3

---

## Step 3: 选择工作方式（阻塞点）

**一次性询问用户**选择工作区隔离方式和执行方式。

### 工作区隔离

| 选项 | 方式 | 说明 |
|------|------|------|
| A | 创建分支 | `git checkout -b <name>`，简单快速 |
| B | 创建 Worktree | 隔离工作区，完全独立，适合并行开发 |

推荐规则（仅用于说明建议，不能替代用户确认）：
- ≤ 3 个文件 → 推荐 A
- 需要并行开发 → 推荐 B

### 执行方式

| 选项 | 方式 | 适用场景 |
|------|------|---------|
| A | subagent | 任务独立、复杂度高、需要双阶段审查 |
| B | sequential | 任务简单、轻量快速 |

推荐规则：
- 任务数 ≥ 3 → 推荐 A
- 任务数 ≤ 2 且无跨模块依赖 → 推荐 B
- 来自 hotfix/tweak → 推荐 B（但 preset 使用 direct，不经过此步骤）

**必须使用 AskUserQuestion 暂停等待选择。**

用户选择后更新状态：
```bash
"$WF_SCRIPT" state set <name> isolation <branch|worktree>
"$WF_SCRIPT" state set <name> build_mode <subagent|sequential>
```

`isolation` 是硬约束。保持 `null` 时，`build → verify` 的 guard 会失败。

---

## Step 4: 创建隔离

### 分支方式

```bash
git checkout -b <name>
```

### Worktree 方式

#### 0. 检测已有隔离

```bash
GIT_DIR=$(cd "$(git rev-parse --git-dir)" 2>/dev/null && pwd -P)
GIT_COMMON=$(cd "$(git rev-parse --git-common-dir)" 2>/dev/null && pwd -P)
```

`GIT_DIR != GIT_COMMON`（且非 submodule）→ 已在 worktree 中，跳过创建。

检测 submodule：
```bash
git rev-parse --show-superproject-working-tree 2>/dev/null
```
有输出 → 在 submodule 中，视为普通仓库。

#### 1. 创建 Worktree

目录选择优先级：`.worktrees/` > `worktrees/` > 默认 `.worktrees/`

验证 .gitignore：
```bash
git check-ignore -q .worktrees 2>/dev/null || git check-ignore -q worktrees 2>/dev/null
```
未忽略 → 先添加到 .gitignore 并提交。

创建：
```bash
project=$(basename "$(git rev-parse --show-toplevel)")
git worktree add ".worktrees/<name>" -b "<name>"
cd ".worktrees/<name>"
```

#### 2. 项目设置

```bash
if [ -f package.json ]; then npm install; fi
if [ -f Cargo.toml ]; then cargo build; fi
if [ -f requirements.txt ]; then pip install -r requirements.txt; fi
if [ -f pyproject.toml ]; then poetry install; fi
if [ -f go.mod ]; then go mod download; fi
```

#### 3. 验证基线测试

```bash
# 使用项目对应的测试命令
npm test / cargo test / pytest / go test ./...
```

测试失败 → 报告失败，询问是否继续。

创建隔离后，确认 plan.md 可访问（分支方式天然可访问；worktree 方式需确认 plan 已提交）。

---

## Step 5: 执行任务

### sequential 模式

1. 读取 `workflow/changes/<name>/plan.md` 和 `workflow/changes/<name>/tasks.md`
2. 逐任务执行：
   - 读取当前未完成任务的全部文本和上下文
   - 按步骤执行（写测试 → 运行 → 写实现 → 运行 → 提交）
   - 完成后勾选 tasks.md（`- [ ]` → `- [x]`）
   - commit message 格式：引用主编排器的 commit message 规范
3. 遇到阻塞 → 停止，报告问题
4. 全部完成 → 进入 Step 7

**关键原则**：
- 严格按计划步骤执行
- 不跳过验证
- 遇到阻塞时停止并询问，不猜测
- 每个任务完成后立即提交

### subagent 模式

#### 平台检测

尝试使用平台的子 agent / Task 工具。如果工具不可用或首次派遣失败：
- 降级为 sequential 模式
- 告知用户："当前平台不支持子 agent 模式，已降级为顺序执行"
- 继续执行

#### 逐任务派遣

读取 plan.md，提取所有任务。对每个任务：

1. **派遣 implementer 子 agent**
   - 读取 `skills/workflow-build/prompts/implementer.md` 作为 prompt
   - 提供：任务全文、项目上下文、相关文件路径、测试命令
   - 不要让子 agent 读取 plan 文件——提供完整文本

2. **处理 implementer 状态**
   - **DONE** → 进入 spec 审查
   - **DONE_WITH_CONCERNS** → 评估关注点后进入审查（如果关注点关于正确性或范围，在审查前处理）
   - **NEEDS_CONTEXT** → 补充缺失上下文，重新派遣
   - **BLOCKED** → 评估阻塞原因：
     - 上下文问题 → 补充上下文重新派遣
     - 任务需要更多推理 → 用更强的模型重新派遣
     - 任务太大 → 拆分为更小的部分
     - 计划本身有误 → 上报用户
   - **绝不**忽略上报或不做改变就重试

3. **Spec 合规审查**
   - 派遣 spec-reviewer 子 agent
   - 读取 `skills/workflow-build/prompts/spec-reviewer.md` 作为 prompt
   - 提供：任务描述、实现的 git diff、design.md 相关章节
   - 审查通过 → 进入代码质量审查
   - 审查不通过 → implementer 修复 → 重新审查

4. **代码质量审查**
   - 派遣 code-quality-reviewer 子 agent
   - 读取 `skills/workflow-build/prompts/code-quality-reviewer.md` 作为 prompt
   - 审查通过 → 标记任务完成
   - 审查不通过 → implementer 修复 → 重新审查

5. **连续执行**：不在任务间暂停检查，只在 BLOCKED 或全部完成时停止

#### 最终审查

全部任务完成后，派遣最终代码审查（整个实现的 end-to-end 审查）。

---

## Step 6: Spec 增量更新

实施过程中发现初版设计不完整时，按变更规模分级处理：

| 规模 | 触发条件 | 做法 |
|------|---------|------|
| 小 | 遗漏验收场景、边界条件 | 直接编辑 design.md + tasks.md，追加任务 |
| 中 | 接口变更、新增组件、数据流变化 | **用 AskUserQuestion 确认后**，重新 brainstorming 更新 design.md |
| 大 | 全新需求 | **用 AskUserQuestion 确认拆分**，通过 `/workflow-open` 创建独立 change |

**50% 阈值**：新增任务超过 tasks.md 初始任务总数一半 → 询问是否拆分为新 change。

**原则**：
- 设计是活文档，本阶段期间随时可修改
- 每次更新应提交，commit message 说明变更原因
- 小规模增量直接改设计时，在 commit message 中注明

---

## Step 7: 上下文管理

Build 是最长阶段，可能跨越大量任务。

- **每完成一个 task**：立即勾选 tasks.md 并提交代码，确保状态持久化
- **上下文压缩后恢复**：先运行 `"$WF_SCRIPT" state check <name> build --recover`，按输出的 Recovery action 决定下一步
- **恢复或继续时的 dirty worktree**：按 `workflow/reference/dirty-worktree.md` 共享协议处理未提交改动
- **长任务拆分**：单任务超过 200 行代码变更时，考虑拆分为多个子任务

---

## Step 8: 退出守卫

退出条件满足后运行：

```bash
"$WF_SCRIPT" guard <name> build --apply
```

Guard 检查：
- tasks.md 全部勾选
- isolation 已设置（branch / worktree）
- build_mode 已设置（subagent / sequential）

全部 PASS 后自动流转到 `phase: verify`。

---

## 退出条件

- tasks.md 全部勾选
- 代码已提交
- isolation 已设置
- build_mode 已设置
- **阶段守卫**：`"$WF_SCRIPT" guard <name> build --apply`

## 自动流转

> **REQUIRED NEXT SKILL:** 调用 `/workflow-verify` skill 进入验证与收尾阶段。
