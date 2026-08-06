---
name: devpack-init
description: 项目初始化 — 检测 AI Agent 平台，生成规则文件，注入代码打标规范
trigger: /devpack-init
---

# Init（项目初始化）

<what-to-do>

检测当前项目使用的是哪个 AI Agent 平台，在项目根目录生成对应的规则文件，并注入代码打标规范。

**执行一次即可，重复执行会覆盖规则文件。**

**行为规则：**

1. **先检测平台。** 不要问用户用的什么平台，通过项目文件自动判断。
2. **生成规则文件。** 根据平台生成对应的配置文件（CLAUDE.md / AGENTS.md / Cursor rules 等）。
3. **注入打标规范。** 在规则文件中写入代码标注规则，后续 AI 写代码时自动遵循。
4. **不覆盖已有内容。** 如果规则文件已存在且包含 `AI_ASSISTED` 标记，说明已经初始化过，提示用户确认是否覆盖。

</what-to-do>

<supporting-info>

## 使用方式

```
/devpack-init              # 自动检测平台，生成规则文件
/devpack-init --dry-run    # 只展示会生成什么，不实际写入
```

## 平台检测

按以下顺序检测，命中第一个即停止：

| 平台 | 检测方式 |
|------|---------|
| Claude Code | 项目根目录存在 `.claude/` 或 `CLAUDE.md` |
| Codex | 项目根目录存在 `.codex/` 或 `AGENTS.md` |
| Cursor | 项目根目录存在 `.cursor/` 或 `.cursorrules` |
| OpenCode | 项目根目录存在 `opencode.json` 或 `.config/opencode/` |
| Trae | 项目根目录存在 `.trae/` |

如果无法自动检测，列出候选让用户选择。支持多平台共存（用户可以指定多个）。

</supporting-info>

<file-generation>

## 规则文件生成

### Claude Code → `CLAUDE.md`

写入项目根目录。如果已存在，追加打标规范章节（不覆盖已有内容）。

```markdown
# 项目规范

<!-- 以下内容由 sc-devpack devpack-init 生成 -->

## 代码标注规范

所有由 AI 新建或生成的代码（新建文件、新增函数/方法/类/组件），必须添加标注注释。

### 标注模板

文件级标注（放在文件头，package/import 声明之前）：

```java
/**
 * AI_ASSISTED
 * tool: {tool}
 * model: {model}
 */
```

函数/方法级标注（放在函数/方法定义之前，紧贴 def/func/void/async function 等）：

```java
/**
 * AI_ASSISTED
 * tool: {tool}
 * model: {model}
 */
public void createUser() { }
```

### 标注规则

- **新建文件**：文件头必须加文件级标注
- **新增函数/方法/类/组件**：必须加函数/方法级标注
- **修改已有代码**：不加标注（已有代码的归属不变）
- **tool**：填写本次使用的 AI 工具名（如 Cursor、Claude Code、GitHub Copilot、Windsurf、通义灵码），未知时填 `unknown`
- **model**：填写本次使用的模型名（如 claude-sonnet-4-20250514、gpt-4o），未知时填 `unknown`
- **注释格式**：遵循项目已有注释风格（`//`、`/* */`、`#` 等），不要在文件类型不支持块注释时硬加（如 YAML 用 `#`）

### 统计方式

```bash
# 统计所有 AI 辅助生成的代码
grep -r "AI_ASSISTED" --include="*.java" --include="*.kt" --include="*.py" --include="*.js" --include="*.ts" --include="*.vue" --include="*.c" --include="*.cpp" --include="*.go" --include="*.rs" -l

# 按工具统计
grep -r "tool: Cursor" --include="*.java" -l | wc -l
grep -r "tool: Claude Code" --include="*.java" -l | wc -l

# 按模型统计
grep -r "model: claude" --include="*.java" -l | wc -l
grep -r "model: gpt" --include="*.java" -l | wc -l
```
```

### Codex → `AGENTS.md`

写入项目根目录。如果已存在，追加打标规范章节。

内容结构和 Claude Code 相同，只是文件名不同。

### Cursor → `.cursor/rules/ai-labeling.mdc`

写入 `.cursor/rules/` 目录。如果 `.cursor/` 不存在则创建。

```mdc
---
description: "AI 代码标注规范"
globs: "*"
---

## 代码标注规范

{同上标注内容}
```

### OpenCode → `AGENTS.md` + `opencode.json`

写入项目根目录。如果已存在 AGENTS.md，追加打标规范章节。

`opencode.json` 中追加 instructions 引用（如果文件已存在则合并）。

### Trae → `.trae/rules/ai-labeling.md`

写入 `.trae/rules/` 目录。如果 `.trae/` 不存在则创建。

```md
---
description: "AI 代码标注规范"
---

## 代码标注规范

{同上标注内容}
```

</file-generation>

<injection-rules>

## 打标规范注入

打标规范的核心内容（写入规则文件的部分）：

### 标注时机

| 场景 | 标注方式 |
|------|---------|
| AI 新建整个文件 | 文件头 + 每个函数/方法级 |
| AI 在已有文件中新增函数/方法/类 | 只标新增的函数/方法/类 |
| AI 修改已有函数/方法 | 不标注（归属不变） |
| AI 生成配置文件（JSON、YAML、XML） | 文件头用注释标注（如果该格式支持注释） |
| AI 生成不支持注释的文件（如 .txt） | 不标注，在 commit message 中注明 |

### 注释风格适配

| 语言 | 文件级 | 函数级 |
|------|--------|--------|
| Java / Kotlin / C / C++ / Go / JS / TS / Vue | `/** AI_ASSISTED ... */` | `/** AI_ASSISTED ... */` |
| Python | `# AI_ASSISTED` 三行 | `# AI_ASSISTED` 三行 |
| Shell / YAML / TOML | `# AI_ASSISTED` 三行 | — |

### tool 和 model 预配置

规则文件中预配置当前平台和模型信息，AI 直接使用，不需要猜：

| 平台 | tool 预填 | model 预填 |
|------|-----------|-----------|
| Claude Code | `Claude Code` | `{当前模型名，如 claude-sonnet-4-20250514}` |
| Codex | `Codex` | `{当前模型名}` |
| Cursor | `Cursor` | `unknown`（Cursor 不暴露模型信息） |
| OpenCode | `OpenCode` | `unknown` |
| Trae | `Trae` | `unknown` |

如果 AI 能确认实际模型，可以用实际值覆盖预配置值。

</injection-rules>

<existing-files>

## 已有规则文件处理

| 场景 | 处理方式 |
|------|---------|
| 规则文件不存在 | 新建，写入完整内容 |
| 规则文件存在，无 `AI_ASSISTED` | 追加打标规范章节到文件末尾 |
| 规则文件存在，已有 `AI_ASSISTED` | 提示"已初始化过，是否覆盖打标规范？" |
| 规则文件存在，用户拒绝覆盖 | 跳过，只输出当前打标状态 |

### 追加时的章节标记

用注释标记打标规范的范围，方便后续识别和替换：

```
<!-- SC-DEVPACK:AI-LABELING:START -->
{打标规范内容}
<!-- SC-DEVPACK:AI-LABELING:END -->
```

重复执行时只替换 `START` 和 `END` 之间的内容。

</existing-files>

<output>

## 执行输出

```
┌─ sc-devpack devpack-init ─────────────────────────┐
│                                                    │
│  检测到平台：Claude Code                            │
│  生成文件：CLAUDE.md（追加打标规范）                  │
│                                                    │
│  打标规范已注入，后续 AI 生成的代码将自动添加标注：    │
│                                                    │
│  /**                                               │
│   * AI_ASSISTED                                    │
│   * tool: Claude Code                              │
│   * model: claude-sonnet-4-20250514                │
│   */                                               │
│                                                    │
│  统计方式：                                         │
│  grep -r "AI_ASSISTED" {项目根目录}                  │
│                                                    │
└────────────────────────────────────────────────────┘
```

</output>
