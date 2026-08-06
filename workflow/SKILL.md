---
name: workflow
description: 通用开发工作流 — 自包含的五阶段流程编排器，自动检测阶段并路由到子命令。五阶段：开启 → 深度设计 → 计划与构建 → 验证与收尾 → 归档
trigger: /workflow
publish: true
---

# Workflow — 通用开发工作流

自包含的五阶段开发流程，不依赖外部工具。

```
/open → /design → /build → /verify → /archive

/workflow-hotfix（预设路径，跳过设计）
  open → build → verify → archive

/workflow-tweak（预设路径，跳过设计 + 轻量构建/验证）
  open → lightweight build → light verify → archive
```

---

## 脚本定位

**首次执行时定位一次，后续全程复用。** 所有子 skill 通过 `"$WF_SCRIPT"` 调用。

```bash
WF_SCRIPT="${WF_SCRIPT:-$(find . "$HOME"/.*/skills "$HOME/.config" "$HOME/.trae" \
  -path '*/workflow/scripts/wf.sh' -type f -print -quit 2>/dev/null)}"
if [ -z "$WF_SCRIPT" ]; then
  echo "ERROR: wf.sh not found. Ensure the workflow skill is installed." >&2
  exit 1
fi
```

定位失败时停止流程。定位成功后缓存到环境变量，后续所有子命令使用 `"$WF_SCRIPT"` 调用。

---

## 决策核心（Decision Core）

agent 做决策只需读本节。

### Step 0: Preset 检测（优先级最高）

- 用户明确描述为 bug fix / 热修复 → 直接 `/workflow-hotfix`
- 用户明确描述为文案/配置/文档小调整 → 直接 `/workflow-tweak`
- 未命中 preset → 按下表处理

### Step 1: 活跃 Change 发现

运行 `"$WF_SCRIPT" state list` 获取所有活跃 change。

| 活跃 change | 用户输入 | 行为 |
|-------------|---------|------|
| 无 | 任何输入 | → `/workflow-open` |
| 恰好 1 个 | `/workflow <描述>` | → 询问：继续该变更 or 创建新变更 |
| 多个 | `/workflow <描述>` | → 询问：继续现有 or 创建新；若选继续 → 列出清单让用户选择 |
| 恰好 1 个 | `/workflow`（无描述） | → 自动选中，进入 Step 2 |
| 多个 | `/workflow`（无描述） | → 列出清单让用户选择 |

### Step 2: 读取 `.workflow.yaml` 状态

优先读取 `workflow/changes/<name>/.workflow.yaml`。

### Step 3: 阶段判定

按顺序匹配，命中即停：

```
1. archived: true             → 流程已完成
2. verify_result: pass        → /workflow-archive
3. verify_result: fail        → 验证失败决策阻塞点（见下文）
4. phase: verify              → /workflow-verify
5. phase: build               → /workflow-build
6. phase: design              → /workflow-design
7. phase: open                → /workflow-open
8. 无 .workflow.yaml          → /workflow-open
```

### 断点恢复规则

每次恢复上下文时，**先重新执行 Step 0 和 Step 1**，不依赖对话历史判断阶段。

- **phase: build** 时，先检查 `build_pause`、`plan`、`build_mode`、`isolation`：
  - `build_pause: plan-ready` + plan 文件存在 → 回到 `/workflow-build` 的 plan-ready 恢复点
  - `build_pause: plan-ready` + plan 文件缺失 → 回到 `/workflow-build` 重新生成 plan
  - `build_mode` 或 `isolation` 未设置 → 回到 `/workflow-build` 对应步骤补充
  - 均已设置 → 读 tasks.md 下一个未勾选任务继续
- **phase: verify** + `verify_result: fail` → 验证失败决策阻塞点
- **phase: open** 但 proposal/design/tasks 已完整 → 先运行 `"$WF_SCRIPT" guard <name> open --apply` 修正状态

---

## 预设升级条件

**hotfix → full**（满足任一即升级）：
- 改动涉及 **3+ 文件**
- 涉及架构变更（新模块、新接口、新依赖）
- 涉及数据库 schema 变更
- 修复引入新的 public API
- 修复范围超出单一函数/模块

**tweak → full**（满足任一即升级）：
- 改动涉及 **5+ 文件**
- 涉及多个模块的协调修改
- 需要新增测试用例 **5+**
- 涉及配置项的新增或删除（非值修改）
- 需要新增 capability

升级时**必须用 AskUserQuestion 暂停等待用户确认**。确认后：
```bash
"$WF_SCRIPT" state set <name> workflow full
```
然后补充 Design Doc（加载 `/workflow-design`），后续走完整流程。

---

## 决策阻塞点

**以下节点必须用 AskUserQuestion 暂停等待用户明确回复，不得用推荐规则、默认值或历史偏好代替：**

1. open 阶段 proposal/design/tasks 审视确认
2. brainstorming 确认设计方案
3. build 阶段 plan-ready 暂停选择 + 工作方式选择（隔离方式 + 执行方式）
4. verify 不通过时决定修复或接受偏差
5. finishing-branch 选择分支处理方式
6. 遇到升级条件（hotfix/tweak → full）
7. build 阶段范围扩张需重新设计或拆分新 change

agent 不应跳过这些决策点。到达决策点时，**禁止以文字输出代替工具等待——必须通过 AskUserQuestion 明确获取用户选择后才能继续**。

---

## 红旗清单

| Agent 心理 | 实际风险 |
|-----------|---------|
| "用户应该会同意这个方案" | 不能替用户决策，用 AskUserQuestion |
| "这只是个小改动，不需要确认" | 决策点无大小之分，阻塞点必须等待 |
| "用户之前选过 A，这次也选 A" | 历史偏好不能替代当前确认 |
| "我已经解释了方案，用户没反对" | 没反对 ≠ 同意，必须用工具获取明确选择 |
| "流程走到这里应该没问题了" | 验证不通过 ≠ 通过，检查 verify_result |

---

## Commit Message 规范

子 skill 引用本规范：

| 工作流 | 格式 | 示例 |
|--------|------|------|
| full | `feat: <描述>` 或按性质使用 `refactor:` / `fix:` / `chore:` | `feat: add user export endpoint` |
| hotfix | `fix: <描述>` | `fix: null pointer on login` |
| tweak | `tweak: <描述>` | `tweak: update button label` |

---

## 子命令速查

| 命令 | 阶段 | 产物 |
|------|------|------|
| `/workflow-open` | 1. 开启 | proposal.md、design.md（框架）、tasks.md |
| `/workflow-design` | 2. 深度设计 | design.md（完整） |
| `/workflow-build` | 3. 计划与构建 | plan.md、代码提交 |
| `/workflow-verify` | 4. 验证与收尾 | verify-report.md、分支处理 |
| `/workflow-archive` | 5. 归档 | 归档目录 |
| `/workflow-hotfix` | 预设路径 | 快速修复（跳过设计） |
| `/workflow-tweak` | 预设路径 | 小改动（跳过设计 + 轻量构建/验证） |

```
/workflow
  ↓ 自动检测
/workflow-open ──→ /workflow-design ──→ /workflow-build ──→ /workflow-verify ──→ /workflow-archive

/workflow-hotfix（预设路径）
  open ──→ build ──→ verify ──→ archive

/workflow-tweak（预设路径）
  open ──→ lightweight build ──→ light verify ──→ archive
```

---

## 错误处理速查

| 场景 | 处理方式 |
|------|---------|
| `wf.sh state list` 失败 | 检查 wf.sh 是否已安装 |
| 子 skill 不可用 | 停止流程，提示安装或启用对应 skill |
| `.workflow.yaml` 格式异常或缺失 | 以文件状态为准，用 `"$WF_SCRIPT" state set` 修正后继续 |
| 构建/测试失败 | 返回 build 阶段修复，不进入 verify |
| change 目录结构不完整 | 按 workflow-open 产物要求补齐 |

---

## .workflow.yaml 字段说明

```yaml
workflow: full              # full / hotfix / tweak
phase: build                # open / design / build / verify / archive
design_doc: null            # design.md 路径
plan: null                  # plan.md 路径
base_ref: null              # git commit SHA
build_mode: null            # subagent / sequential / direct
build_pause: null           # null / plan-ready
isolation: null             # branch / worktree
direct_override: false      # full workflow 使用 direct 时必须显式设为 true
verify_mode: null           # light / full
verify_result: pending      # pending / pass / fail
verification_report: null   # 验证报告路径
branch_status: pending      # pending / handled
created_at: null            # YYYY-MM-DD
verified_at: null           # YYYY-MM-DD
archived: false
```

状态机硬约束：
- `build → verify` 前，`isolation` 必须是 `branch` 或 `worktree`
- `build → verify` 前，`build_mode` 必须已选择
- `build_mode: direct` 默认只允许 `hotfix` / `tweak`；full workflow 需要 `direct_override: true`

---

## 文件结构

```
workflow/changes/                      ← 运行时数据（不进 git）
├── <name>/                            ← 活跃变更
│   ├── .workflow.yaml                 ← 状态文件
│   ├── proposal.md                    ← WHY + WHAT
│   ├── design.md                      ← HOW
│   ├── tasks.md                       ← 任务清单
│   ├── plan.md                        ← 实施计划（build 阶段生成）
│   └── verify-report.md              ← 验证报告（verify 阶段生成）
└── archive/YYYY-MM-DD-<name>/         ← 已归档
```

---

## 最佳实践

1. **brainstorming 不可跳过** — 每次变更必须经过深度设计（hotfix/tweak 除外）
2. **保持 tasks.md 同步** — 完成一个勾一个
3. **频繁提交** — 每个任务一次提交，message 体现设计意图
4. **先验证再归档** — verify 通过后才执行 archive
5. **断点恢复** — 上下文丢失时，重新执行 `/workflow`，它会自动检测阶段并恢复
