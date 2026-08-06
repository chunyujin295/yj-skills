---
name: workflow-open
description: "Workflow 阶段 1：开启。用 /workflow-open 调用。通过结构化探索理解需求，创建 change 结构（proposal + design + tasks）。"
trigger: /workflow-open
publish: true
---

# Workflow 阶段 1：开启（Open）

理解问题，创建变更结构。

## 前置条件

- 无活跃 change，或用户希望创建新 change

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

## Step 1: 探索想法

**这是一个思维方式，不是流程。** 没有固定步骤、没有必须序列、没有强制产出。你是用户的思考伙伴。

### 探索姿态

- **好奇，不教条** — 自然地提问，不走脚本
- **开放线索，不审讯** — 暴露多个有趣方向，让用户跟着感兴趣的走
- **可视化** — 大量使用 ASCII 图表辅助思考
- **适应性** — 跟着有趣线索走，新信息出现时及时转向
- **耐心** — 不急于下结论，让问题的形状自然浮现
- **接地气** — 探索实际代码库，不空谈理论

### 可能做的事

根据用户带来的话题，你可能：

**探索问题空间**
- 从用户说的内容中自然提问
- 挑战假设
- 重新框定问题
- 找类比

**调查代码库**
- 映射与讨论相关的现有架构
- 找集成点
- 识别已在使用的模式
- 暴露隐藏的复杂性

**比较方案**
- 头脑风暴多种方法
- 建对比表
- 勾画权衡
- 推荐路径（如果被要求）

**可视化**
```
┌─────────────────────────────────────────┐
│     大量使用 ASCII 图表                   │
├─────────────────────────────────────────┤
│                                         │
│      ┌────────┐         ┌────────┐      │
│      │ State  │────────▶│ State  │      │
│      │   A    │         │   B    │      │
│      └────────┘         └────────┘      │
│                                         │
│   系统图、状态机、数据流、架构草图、       │
│   依赖图、对比表                          │
│                                         │
└─────────────────────────────────────────┘
```

**暴露风险和未知**
- 识别什么可能出错
- 发现理解上的空白
- 建议 spike 或调查

### 代码库探索

探索开始时，快速扫描项目：
- 文件结构（目录树）
- README / docs/ 目录
- recent commits（`git log --oneline -10`）
- 技术栈（package.json / pom.xml / Cargo.toml 等）

### 提问策略

- **一次一个问题** — 不要用多个问题淹没用户
- **优先选择题** — 比开放式更容易回答
- **评估范围**：如果请求描述了多个独立子系统（如"做一个有聊天、文件存储、计费和分析的平台"），立即标记。不要花时间细化一个需要先拆分的项目。

### 探索不需要做的事

- 走脚本
- 每次问同样的问题
- 产出特定的产物
- 得出结论
- 简短（这是思考时间）

---

## Step 2: 创建 Change 结构

当想法足够清晰时，创建变更结构。

### 命名

- change name 必须使用 kebab-case
- 用户指定 → 使用用户指定的名称
- 用户未指定 → 从描述中推导，**用 AskUserQuestion 确认**

### 初始化

```bash
"$WF_SCRIPT" state init <name> full
```

### 创建三文件

在 `workflow/changes/<name>/` 目录下创建：

#### proposal.md（WHY + WHAT）

```markdown
# <Change Name>

## 问题背景

<!-- 为什么要做这个变更？当前有什么问题？ -->

## 目标

<!-- 这个变更要达成什么？ -->

## 范围

<!-- 包含什么 -->

## 非目标

<!-- 不包含什么，明确边界 -->
```

#### design.md（HOW — 框架版，design 阶段填充细节）

```markdown
# <Change Name> — 技术设计

## 架构决策

<!-- 高层方案选型，design 阶段会展开 -->

## 方案约束

<!-- 技术约束、性能约束、兼容性约束 -->
```

#### tasks.md（任务清单）

```markdown
# <Change Name> — 任务清单

- [ ] <任务 1 描述>
- [ ] <任务 2 描述>
- [ ] <任务 3 描述>
```

---

## Step 3: 入口状态验证

```bash
"$WF_SCRIPT" state check <name> open
```

验证通过后继续。验证失败时报告具体原因。

---

## Step 4: 内容完整性检查

逐个确认三个文档内容完整：

| 文件 | 必须包含 |
|------|---------|
| proposal.md | 问题背景、目标、范围、非目标 |
| design.md | 至少有架构决策和方案约束的框架 |
| tasks.md | 任务列表，每个任务有明确描述 |

**文件存在性验证**：逐个确认文件路径存在且非空。任一文件缺失或为空时，不得进入 Step 5，必须回到创建步骤补充。

---

## Step 5: 用户审视确认（阻塞点）

三个文档创建完成且内容完整性检查通过后，**必须使用 AskUserQuestion 暂停并等待用户确认**。不得在用户确认前执行阶段守卫或自动流转。

AskUserQuestion 必须以单选题形式呈现，包含以下摘要和选项：

**摘要内容**：
- **proposal.md**：问题背景、目标、范围
- **design.md**：高层架构决策、方案选型
- **tasks.md**：任务数量和关键任务描述

**选项**：
- 「确认，继续下一阶段」— 产物符合预期，执行阶段守卫流转
- 「需要调整」— 附带调整说明，修改后重新请求确认

用户选择「确认」后继续执行退出条件。用户选择「需要调整」时，按其说明修改对应文件，然后重新使用 AskUserQuestion 请求确认。

---

## 退出条件

- proposal.md、design.md、tasks.md 均已创建且内容完整
- **用户已确认** proposal、design、tasks 内容符合预期
- **阶段守卫**：运行 `"$WF_SCRIPT" guard <name> open --apply`，全部 PASS 后自动流转到下一阶段

```bash
"$WF_SCRIPT" guard <name> open --apply
```

## 自动流转

退出条件满足后，自动流转到下一阶段：

> **REQUIRED NEXT SKILL:** 调用 `/workflow-design` skill 进入深度设计阶段。
