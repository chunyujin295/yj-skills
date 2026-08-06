---
name: design
description: 前端工程师 — 生成新页面、给现有页面增加功能、修改功能、修复 Bug
trigger: /design
---

# Design Skill（全能前端工程师）

## 使用方式

```
/design init                           # 扫描存量项目风格，生成 design.md
/design @docs/account-management.md    # 读需求文档（新建或修改页面）
/design 给用户管理增加导出按钮          # 自然语言描述
/design 把手机号列改为可编辑            # 自然语言描述
/design 点击删除按钮没反应             # 修复 Bug
```

## 路径解析

执行前必须先解析以下路径：

- `{skill_path}` = 本 skill 所在目录的绝对路径（即 SKILL.md 所在目录）
- `{project_path}` = 用户当前工作目录（即 pwd 的输出）

所有规范文件和模板文件的引用都使用 `{skill_path}` 前缀，所有输出文件都使用 `{project_path}` 前缀。

## 技术栈（强制）

- **Vue 2.6** + Options API（禁止 Composition API）
- **Element UI 2.15.8**（禁止 Element Plus）
- **SCSS** 样式预处理
- **ECharts 4.9** 图表
- **Vue Router 3** + **Vuex 3**

## 规范文件

| 文件 | 内容 |
|------|------|
| `specs/design-tokens.md` | 颜色/字体/间距/状态标签 |
| `specs/html-prototype.md` | HTML 原型布局/交互/Mock/组件选择 |
| `specs/vue-component.md` | Vue 2 代码规范/组件模板（遵循 design.md） |
| `specs/api-mock.md` | API 路径约定/api.js/mock.js 模板 |
| `specs/code-modification.md` | 代码修改通用规范 |

模板文件：
- `templates/design-md-template.md` — design.md 生成模板
- `templates/prototype-style.css` — HTML 原型共享样式模板
- `templates/prototype-index.html` — HTML 原型 iframe 主布局模板
- `templates/crud-page.html` — CRUD 页面 HTML 模板
- `templates/form-page.html` — 表单配置页 HTML 模板
- `templates/stats-page.html` — 统计报表页 HTML 模板
- `templates/login-page.html` — 登录页面 HTML 模板
- `templates/vue-component.vue` — Vue 组件模板
- `templates/vue-api.js` — Vue 页面 API 模板
- `templates/vue-mock.js` — Vue 页面 Mock 数据模板
- `templates/scaffold-package.json` — package.json 脚手架模板
- `templates/scaffold-vue.config.js` — webpack 配置模板
- `templates/scaffold-babel.config.js` — babel 配置模板
- `templates/scaffold-index.html` — HTML 入口模板
- `templates/scaffold-main.js` — Vue 启动文件模板
- `templates/scaffold-app.vue` — 根组件模板
- `templates/scaffold-router-index.js` — 路由配置模板
- `templates/scaffold-request.js` — Axios 封装模板
- `templates/scaffold-common.js` — 全局方法模板（parseTime/resetForm/addDateRange）
- `templates/scaffold-layout-index.vue` — 布局组件模板
- `templates/scaffold-sidebar.vue` — 侧边栏组件模板
- `templates/scaffold-plugins-index.js` — 插件注册模板
- `templates/scaffold-modal.js` — $modal 插件模板
- `templates/scaffold-pagination.vue` — 分页组件模板
- `scripts/validate-prototype.mjs` — HTML 原型硬校验脚本（必须执行）
- `scripts/validate-vue.mjs` — Vue 代码硬校验脚本（必须执行）
- `scripts/init-design.mjs` — `/design init` 存量项目扫描脚本（必须执行）

## 文档路径约定

| 文档类型 | 路径 | 说明 |
|---------|------|------|
| 前端 PRD | `docs/prd/` | probe-me skill 输出 |
| 接口文档 | `docs/api/` | api-doc skill 输出 |
| 设计原型 | `docs/design-prototype/` | 本 skill 输出 |

**读取规则**：
- 优先读取用户 @指定 的文档
- 如果没有指定，搜索 docs/prd/ 和 docs/api/ 目录
- 如果都找不到，询问用户

## PRD 消费规则

### PRD 识别

probe-me 生成的 PRD 文件在 `docs/prd/` 目录下，文件头包含 `source: probe-me` 标识：

```markdown
---
source: probe-me
version: {devpack_version}
generated_at: {timestamp}
---
```

**读取 PRD 时**：
1. 搜索 `docs/prd/` 目录下的 `.md` 文件
2. 检查文件头是否有 `source: probe-me` 标识
3. 有标识的文件作为 PRD 消费，解析"架构决策"和"技术方案预判"章节
4. 无标识的文件作为普通需求文档消费，不强制要求架构决策和预判方案
5. 多个 PRD 文件时，优先使用与当前模块名匹配的，其次用最新的

### 新增章节消费

probe-me 输出的 PRD 除了字段定义、搜索条件、操作功能、接口能力需求外，还包含以下新增章节。design 必须读取并使用：

### 架构决策章节

PRD 中的"架构决策"记录了用户确认的技术决策（数据获取策略、表单校验、导出方式等），每条包含选择、理由和放弃的方案。

**design 必须遵守架构决策**：
- 如果决策是"后端分页"，列表组件必须实现分页参数传递，不能改成前端一次性加载
- 如果决策是"前端生成 Excel"，导出功能用前端方案，不能调后端接口
- 如果决策是"详情接口返回原始手机号"，编辑回填时调详情接口，不能从列表数据取

**偏离决策时**：如果代码实现需要偏离某个架构决策，必须向用户说明原因并确认，不能自行偏离。

### 技术方案预判章节

PRD 中的"技术方案预判"包含组件拆分建议、状态变量、API 封装、数据流和潜在难点。

**design 优先使用预判方案**：
- 组件拆分：按 PRD 建议的组件结构生成文件（如 UserSearch.vue、UserTable.vue、UserDialog.vue）
- 状态变量：按 PRD 建议的变量名和类型定义 data()
- API 封装：按 PRD 建议的函数名和方法生成 api.js
- 数据流：按 PRD 建议的数据流向实现组件间通信

**可以优化但不能跳过**：如果预判方案有明显问题（如组件拆分过细），可以向用户提出优化建议，但不能直接忽略预判方案。

## 接口文档消费规则

`api-doc` 通常在后端项目执行，生成的 `docs/api/*.md` 可能被复制到前端项目，也可能通过绝对路径直接引用。`design` 只消费接口契约，不要求接口文档来自当前项目。

### 接口来源优先级

当 PRD 和 API 文档都包含接口信息时，按以下优先级处理：

1. 用户本轮 `@` 指定的接口文档（包括绝对路径）。
2. 当前项目 `docs/api/` 中与模块名匹配且时间最新的接口文档。
3. PRD 中的“接口能力需求”或“接口定义”草案。
4. 用户自然语言补充。

真实接口路径、请求参数、响应结构以 `api-doc` 输出的接口文档为准。PRD 只决定页面能力、字段、交互和业务期望，不覆盖真实接口。

### 跨项目 API 文档

读取接口文档时：

- 支持 `@docs/api/user.md` 这类当前前端项目内路径。
- 支持 `@/absolute/path/to/backend/docs/api/user.md` 这类后端项目绝对路径。
- 如果文档元信息显示后端项目与当前目录不同，不报错；正常作为接口契约使用。
- 如果没有找到接口文档，提示用户将后端项目生成的 `docs/api/*.md` 复制到前端项目 `docs/api/`，或直接提供绝对路径。

### 真实接口接入模式

当用户说“对接真实接口 / 替换 mock / 接口文档复制过来了 / 使用 api-doc 文档”时，进入真实接口接入模式：

1. 读取 PRD、现有 Vue 页面、现有 `api.js`、`mock.js`、接口文档。
2. 用接口文档重写或补齐 `api.js` 中的真实请求函数。
3. 按真实响应结构调整 `index.vue` 的请求参数映射和响应解析。
4. 保留 `mock.js` 作为接口失败兜底，除非用户明确要求删除 mock。
5. 不重新生成 HTML 原型，不重做页面布局，不无关重构 UI。
6. 执行 `node {skill_path}/scripts/validate-vue.mjs {project_path} --fast`，能构建时再执行项目构建命令。

---

## 空目录/新项目处理（禁止反问）

当用户提供 `@PRD.md`、`@docs/prd/*.md` 或其他需求文档，且 `{project_path}` 下不存在 `src/views/`、`src/main.js`、`package.json` 等前端项目文件时：

1. 不要询问“是否创建新的前端 Vue 项目”
2. 默认按新前端项目处理，直接进入流程 B（新建页面）
3. Phase 0 的 `design.md` 使用 `{skill_path}/templates/design-md-template.md` 生成，并写入“未检测到”的项目约定
4. Phase 3 先生成 HTML 原型，不生成 Vue 脚手架
5. 必须在 Phase 5 等用户确认原型后，才进入 Phase 6 生成 Vue 脚手架和 Vue 组件

只有以下情况才询问用户：
- 用户没有提供任何需求文档，也没有自然语言需求
- PRD 无法解析出页面/模块
- 用户明确要求接入已有前端项目，但当前目录不是该项目
- 用户要求“对接真实接口”，但当前目录没有前端项目结构且没有提供目标前端项目路径

---

## Phase 0：确保 design.md 存在（每次执行必须）

**任何 `/design` 操作前，先检查项目根目录是否有 `design.md`。**

```
1. 检查 {project_path}/design.md 是否存在
2. 如果存在 → 读取，提取项目约定
   - 检查新鲜度：读取 design.md 中的生成日期
   - 如果超过 30 天，提示用户："design.md 已超过 30 天，建议重新生成。是否继续使用现有文件？"
   - 用户确认后继续
3. 如果不存在 → 执行以下自动生成流程：
   a. 扫描 src/main.js → 提取全局挂载的方法和组件
   b. 扫描 src/utils/*.js → 提取工具函数
   c. 扫描 src/plugins/*.js → 提取插件方法（$modal 等）
   d. 扫描 src/directive/*.js → 提取自定义指令
   e. 扫描 src/components/*.vue → 提取全局组件
   f. 读取 .eslintrc.js → 提取代码风格
   g. 采样 src/views/*/index.vue → 提取页面模式
   h. 按照 {skill_path}/templates/design-md-template.md 的格式生成 {project_path}/design.md
4. 将 design.md 中的约定作为后续所有操作的约束
```

### Init 流程（/design init）

提取存量项目**可复用的风格约定**，生成便携的 `design.md`，供新项目使用。

与 Phase 0 的隐式生成不同，Init 流程是**显式触发**（`/design init`），目标是产出通用的约定文档，不包含项目名称、路由、模块列表、接口路径等特定信息。

执行 `/design init` 时必须先运行：

```bash
node {skill_path}/scripts/init-design.mjs {project_path}
```

脚本会扫描 `{project_path}` 并写入 `{project_path}/design.md`。如果脚本无法运行，才允许按下面步骤手动提取；手动提取也必须遵守同样的脱敏规则。

```
1. 提取代码风格
   a. 读取 .eslintrc.js / .editorconfig → 缩进、引号、分号
   b. 采样 2-3 个 index.vue → 命名风格（PascalCase / camelCase）、模板写法
   c. 记录 style scoped 使用方式、class 命名约定（BEM / 短横线 / 下划线）

2. 提取全局方法
   a. 扫描 src/main.js → 所有 Vue.prototype.$xxx 注入，记录方法名和签名
      grep "Vue.prototype" src/main.js
   b. 扫描 src/utils/*.js → 每个工具函数的函数名、参数、返回值
      采样 1-2 个典型实现，不复制完整代码
   c. 扫描 src/plugins/*.js → 插件注入的方法签名
   d. 输出格式：方法名 | 参数 | 返回值 | 用途

3. 提取全局组件
   a. 扫描 src/components/ 下的所有 .vue 文件
   b. 对每个组件：记录组件名、props 签名、emit 事件
   c. 输出格式：组件名 | props | events | 用途

4. 提取自定义指令
   a. 扫描 src/directive/*.js
   b. 对每个指令：记录指令名、参数、使用方式
   c. 输出格式：指令名 | 参数 | 使用示例

5. 提取页面模式
   a. 扫描 src/views/ 下各模块目录
   b. 识别常见模式：index.vue + api.js + mock.js 目录结构
   c. 采样 1-2 个 index.vue → 记录 template / script / style 的组织顺序
   d. 不记录具体业务字段、接口 URL、mock 数据

6. 写入 design.md
   由 `scripts/init-design.mjs` 生成，或照 {skill_path}/templates/design-md-template.md 的格式手动生成。
   只写入通用约定（无项目名称/路由/模块/接口路径），并注明：
   "此文件由 /design init 从存量项目提取，已脱敏"

7. 输出总结
   - 已提取 N 个全局方法、M 个组件、L 个指令
   - 复制 design.md 到新项目后直接可使用
```

---

## Phase 0.5：项目脚手架检测

**仅在流程 B（新建页面）的 Phase 6 中执行，与 Vue 组件生成并行。流程 A/C 跳过此阶段。**

### 检测逻辑

```
1. 检查 {project_path}/.scaffolded 是否存在
2. 存在 → 跳过脚手架生成，进入流程 B
3. 不存在 → 执行脚手架生成（见下方文件清单）
```

### 脚手架生成

按顺序生成以下文件（使用 Write 工具，模板来自 `{skill_path}/templates/`）：

| 目标文件 | 模板文件 | 说明 |
|---------|---------|------|
| `package.json` | `scaffold-package.json` | 替换 `{{PROJECT_NAME}}` 为项目目录名 |
| `vue.config.js` | `scaffold-vue.config.js` | 直接复制 |
| `babel.config.js` | `scaffold-babel.config.js` | 直接复制 |
| `public/index.html` | `scaffold-index.html` | 替换 `{{PROJECT_TITLE}}` 为项目名称 |
| `src/main.js` | `scaffold-main.js` | 直接复制 |
| `src/App.vue` | `scaffold-app.vue` | 直接复制 |
| `src/router/index.js` | `scaffold-router-index.js` | 直接复制（含 `__SCAFFOLD_ROUTES__` 占位符） |
| `src/utils/request.js` | `scaffold-request.js` | 直接复制 |
| `src/utils/common.js` | `scaffold-common.js` | 直接复制 |
| `src/layout/index.vue` | `scaffold-layout-index.vue` | 替换 `{{PROJECT_TITLE}}` |
| `src/layout/components/Sidebar.vue` | `scaffold-sidebar.vue` | 直接复制 |
| `src/plugins/index.js` | `scaffold-plugins-index.js` | 直接复制 |
| `src/plugins/modal.js` | `scaffold-modal.js` | 直接复制 |
| `src/components/Pagination/index.vue` | `scaffold-pagination.vue` | 直接复制 |

### 幂等性

生成完成后，创建 `{project_path}/.scaffolded` 文件（内容为空），标记脚手架已生成。

### 脚手架已存在时的处理

如果检测到脚手架已存在，但发现 `main.js` 中缺少某些全局方法注册（通过 grep 检查 `Vue.prototype`），则提示用户：
"检测到项目已有脚手架，但缺少以下全局方法注册：{缺失方法列表}。是否需要补充注册？"

---

## 场景判断

```
用户输入 → 分析意图
  ↓
是否是 init？
  ├── 是 → 进入 Init 流程（扫描存量项目风格，生成 portable design.md）
  └── 否 → 是 @文档 引用？
              ├── 是 → 读取需求文档 → 提取目标页面
              │         → 如当前目录无前端项目结构，直接按新项目进入流程 B，不询问
              │         → 搜索 src/views/ 是否已存在
              │         ├── 已存在 → 流程 A（修改现有页面）
              │         └── 不存在 → 流程 B（新建页面）
              └── 否 → 自然语言分析
                        → 提取动作 + 目标
                        → 流程 C（增加/修改/修复）
```

### 直接调用时检索 PRD

当用户直接调用 `/design` 而没有提供 @文档 时：

```
Step 1: 检查输入
  - 用户提供了 @文档 → 读取文档，继续正常流程
  - 用户提供了自然语言 → 分析需求
  - 用户什么都没提供 → 问用户要做什么

Step 2: 检索 PRD 文档
  - 搜索 docs/prd/ 目录下是否有相关的 PRD
  - 如果有 → 读取 PRD，并按接口来源优先级查找 docs/api/ 中的真实接口文档
  - 如果没有 → 进入 Step 3

Step 3: 询问用户
  - "docs/prd/ 下没有找到相关 PRD 文档，你想："
  - "1. 先运行 /probe-me 生成 PRD"
  - "2. 直接告诉我需求，我来处理"
  - "3. 提供需求文档路径"

Step 4: 根据用户选择继续
  - 选择 1 → 提示用户先运行 /probe-me
  - 选择 2 → 进入追问模式，收集需求后直接生成代码
  - 选择 3 → 读取用户提供的文档
```

### 需求描述模糊时的处理

当用户描述不够清晰时（如"改一下那个按钮"），必须追问：

```
我需要更多信息来完成这个任务：
1. 目标页面是哪个？（如：用户管理、登录页）
2. 具体要改什么？（如：按钮颜色、点击事件、位置）
3. 期望的效果是什么？
```

---

## 流程 A：修改现有页面（增加功能）

**触发**：需求文档中的目标页面已存在于 `src/views/`

```
Phase 1: 读取 design.md + 解析需求文档
Phase 2: 读取现有页面代码
Phase 3: 判断改动大小
  - 小改动（单文件内）→ 直接修改代码
  - 大改动（新增模块/Tab）→ 先生成原型确认
Phase 4: 应用修改
  - 使用 Edit 工具精确修改
  - 遵循 design.md 中的所有约定
  - 使用项目实际的全局方法和组件
Phase 5: 验证（见「代码验证」章节）
```

## 流程 B：新建页面

**触发**：需求文档中的目标页面不存在于 `src/views/`

```
Phase 1: 读取 design.md + 解析需求文档
Phase 2: 解析出模块列表
  - name：模块英文名
  - label：模块中文名
  - type：页面类型（crud / form / stats / login）
  - fields：字段列表
  - apis：接口列表
Phase 3: 生成共享文件（style.css + index.html）
  - index.html 只负责主布局和 iframe 菜单切换
  - style.css 只负责共享布局、表格、卡片、分页、图表样式
  - style.css 必须先完整复制 `{skill_path}/templates/prototype-style.css`，再按需追加页面样式
  - index.html 必须先完整复制 `{skill_path}/templates/prototype-index.html`，只替换标题、菜单项、menuPages 和默认页
  - 不得重写主布局 CSS，不得删除 `.sidebar { width: 200px; }` 和 `.main-content { flex: 1; min-width: 0; }`
  - 不得额外生成右上角用户信息、二级标题、侧边栏标题或重复平台名
Phase 4: 并行生成 HTML 原型（每个模块一个 subagent，输出独立的 xxx.html）
Phase 4.5: HTML 原型逐项检查（主 agent 执行）
对每个生成的 HTML 文件，必须逐项验证以下所有条目（来自 specs/html-prototype.md）：

先执行硬校验脚本：

```bash
node {skill_path}/scripts/validate-prototype.mjs {project_path}/docs/design-prototype
```

如果脚本失败，必须按错误逐项修复后重新执行，直到通过。脚本通过前不得进入 Phase 5 预览。

【0】子页面边界检查（防止后台布局套娃）
  □ 除 index.html 外，所有 `{module.name}.html` 都是 iframe 子页面
  □ 子页面的 `#app` 内只能包含 `.app-container` 和必要的 `el-dialog`
  □ 子页面不得出现 `.navbar`、`.sidebar`、`.layout-body`、`.main-content`、`.content-frame`
  □ 子页面不得出现 `<el-menu>`、`<el-menu-item>`、`<iframe>`
  □ 子页面不得生成平台标题、左侧导航、顶部导航、用户信息
  □ 如发现子页面包含后台布局，必须删除布局外壳，只保留业务内容区

【A】ECharts 图表容器检查
  □ 图表容器同时设置了 width 和 height（正确：style="width: 100%; height: 350px;"）
  □ 没有只写 height 不写 width 的容器（错误：style="height: 350px;"）

【B】自闭合标签检查（Vue 2 DOM 模板强制规则）
  □ <el-table-column> 使用开放/闭合标签对，不使用 />
  □ <el-input> 使用开放/闭合标签对，不使用 />
  □ <el-option> 使用开放/闭合标签对，不使用 />
  □ <el-select> 使用开放/闭合标签对，不使用 />
  □ <el-form-item> 使用开放/闭合标签对，不使用 />
  □ <el-date-picker> 使用开放/闭合标签对，不使用 />
  □ <el-switch> 使用开放/闭合标签对，不使用 />
  □ <el-pagination> 使用开放/闭合标签对，不使用 />

【C】Mock 数据完整性检查
  □ 表格有 5-10 行数据
  □ 数字在合理范围内（非极端值）
  □ 状态字段使用真实状态值（启用/禁用等，非 0/1）

【D】按钮 @click 绑定检查
  □ 搜索按钮绑定了 @click="handleSearch"
  □ 重置按钮绑定了 @click="handleReset"
  □ 新增按钮绑定了 @click="handleAdd"
  □ 导出按钮绑定了 @click="handleExport"
  □ 表格操作列的编辑按钮绑定了 @click="handleEdit(scope.row)"
  □ 表格操作列的删除按钮绑定了 @click="handleDelete(scope.row)"
  □ 所有按钮都没有"死按钮"（没有 @click 的操作按钮）

【E】交互完整性检查（统计报表页）
  □ ECharts 图表有完整的数据配置（不只是空容器）
  □ 时间范围切换器绑定了 @change 或查询按钮

【F】表单/配置页完整性检查
  □ 表单配置页不能只有分组标题和保存按钮
  □ 每个配置分组至少包含 2 个真实控件（el-input / el-input-number / el-select / el-switch / el-date-picker 等）
  □ 每个控件都有对应的 v-model 数据
  □ 保存/重置按钮放在表单底部或分组底部，不得被 flex/float 推到页面最右侧
  □ 配置项使用 el-tabs 或 el-card 分组，内容区域紧凑可扫读
  □ 不生成空白大间距行，不生成只有标题没有字段的配置块

【G】el-dialog 放置位置检查
  □ el-dialog 放在主内容区外部，不在 v-show 容器内

检查逻辑：
1. 读取生成的 HTML 文件
2. 对照上述条目逐一验证（可使用 grep 辅助搜索关键模式）
3. 执行 `node {skill_path}/scripts/validate-prototype.mjs {project_path}/docs/design-prototype`
4. 发现问题 → 用 Edit 工具修复
5. 修复后重新执行脚本和对应条目
6. 所有条目通过 → 进入 Phase 5

如发现无法自动修复的问题 → 记录到 .ccg/tasks/{task}/issues.txt 并告知用户

Phase 4.6: 主布局自检（主 agent 执行）
index.html 采用 iframe 架构，不合并子页面 DOM。必须验证以下条目：

【A】iframe 架构检查
  □ index.html 只有一个 <div id="app">
  □ index.html 包含一个 iframe.content-frame
  □ 菜单切换只改变 currentUrl，不嵌入子页面 HTML

【B】菜单与页面映射检查
  □ menuPages 中每个 key 都指向实际生成的 xxx.html
  □ activeMenu 默认值与第一个菜单 key 一致
  □ currentUrl 默认加载第一个页面

【C】样式检查
  □ iframe 宽度 100%，高度 calc(100vh - 50px)，border none
  □ 主布局不出现 v-show 子页面容器
  □ `.sidebar` 有固定宽度
  □ `.main-content` 有 `flex: 1` 和 `min-width: 0`
  □ 顶部导航不额外生成 `admin`、用户名或无来源的用户区

检查逻辑：
1. 读取 index.html 文件
2. 对照上述条目逐一验证
3. 发现问题 → 用 Edit 工具修复
4. 修复后重新验证对应条目
5. 所有条目通过 → 进入 Phase 5

Phase 5: 用户预览 + 反馈（HARD STOP — 必须等用户确认）

⚠️ 此阶段是强制门控，agent 必须停下来等待用户反馈，不能自动跳到 Phase 6。

执行步骤：
1. 打开生成的 HTML 原型文件（open {project_path}/docs/design-prototype/index.html）
2. 告知用户："HTML 原型已生成，请预览。如果满意，告诉我'继续'或'可以'，我会进入 Vue 组件生成阶段。如果有问题，请描述需要修改的地方。"
3. 等待用户回复
4. 用户确认满意 → 进入 Phase 6
5. 用户有反馈 → 记录修改意见，回到 Phase 4（重新生成受影响的子页面），完成后再次进入 Phase 5

⚠️ 禁止行为：
- 不得在用户未确认的情况下自动进入 Phase 6
- 不得跳过预览步骤直接生成 Vue 组件
- 即使自检全部通过，也必须等待用户亲口确认

Phase 6: 并行生成脚手架 + Vue 组件（见「Phase 0.5」和「Subagent Prompt 模板」章节）
Phase 6.5: Vue 组件逐项检查（主 agent 执行）
对每个生成的 Vue 组件文件，必须逐项验证以下所有条目（来自 specs/vue-component.md）：

先执行 Vue 硬校验脚本：

```bash
node {skill_path}/scripts/validate-vue.mjs {project_path} --fast
```

如果脚本失败，必须按错误逐项修复后重新执行，直到通过。脚本通过前不得进入 Phase 7。

【A】模板语法检查
  □ 标签正确闭合（<el-table-column>...</el-table-column>，不使用 />）
  □ 指令语法正确（v-if, v-for, :prop, @event）
  □ 插值语法正确（{{ xxx }}）
  □ slot-scope 写法正确（slot-scope="scope"，不用 v-slot）

【B】JavaScript 语法检查
  □ import 路径正确（@/views/... 或 ./api 或 ./mock）
  □ data() 返回对象格式正确
  □ methods 中方法拼写正确

【C】完整性检查
  □ 所有按钮都绑定了 @click（搜索、重置、新增、导出、编辑、删除）
  □ 所有表单字段都有对应的 data 属性
  □ 所有 methods 中定义的方法都有实际调用
  □ API 调用都正确导入了对应函数（import { xxx } from './api'）

【D】风格一致性检查（基于 design.md）
  □ 使用 design.md 中定义的全局成功/提示方法（非硬编码 $message）
  □ 使用 design.md 中定义的删除确认方法（非硬编码 $confirm）
  □ 如有权限指令（v-hasPermi），已正确添加
  □ 分页使用 design.md 中定义的 <pagination> 组件（非 el-pagination）
  □ 缩进、引号、分号与现有代码一致

【E】运行稳定性检查
  □ index.vue 导入的 `./api` 和 `./mock` 均存在
  □ getList 失败时使用 mockList 兜底，不让页面空白或出现未处理异常
  □ 所有 `{{PLACEHOLDER}}`、`__SCAFFOLD_ROUTES__`、`__DEFAULT_ROUTE__` 占位符都已替换
  □ `npm run build` 或项目现有构建命令可以通过

【F】Vue 硬校验检查
  □ 执行 `node {skill_path}/scripts/validate-vue.mjs {project_path} --fast`
  □ index.vue / api.js / mock.js 文件完整
  □ index.vue 导入的 API 函数都在 api.js 中真实导出
  □ mock.js 导出 `mockList`
  □ 没有 Composition API、Element Plus、原生 button/input/select/table
  □ CRUD 页有 el-form / el-table / el-button / pagination / getList 兜底
  □ 配置页有真实 Element UI 控件和 v-model

检查逻辑：
1. 读取生成的 Vue 组件文件
2. 对照上述条目逐一验证
3. 执行 `node {skill_path}/scripts/validate-vue.mjs {project_path} --fast`
4. 发现问题 → 用 Edit 工具修复
5. 修复后重新执行脚本和对应条目
6. 所有条目通过 → 进入 Phase 7

如发现无法自动修复的问题 → 记录到 .ccg/tasks/{task}/issues.txt 并告知用户
Phase 7: 集成路由和菜单（见「路由集成」章节）
Phase 8: 代码验证（见「代码验证」章节）
```

### 关键要求

**index.html 使用 iframe 加载子页面，不合并文件！**

- index.html 只包含侧边栏导航和 iframe 容器
- 点击菜单切换 iframe 的 src 属性
- 每个子页面是独立的 HTML 文件
- 用户可以单独打开每个子页面预览
- 严禁把子页面 HTML、Mock 数据、methods 合并到 index.html

**文件角色必须分清：**

| 文件 | 允许内容 | 禁止内容 |
|------|----------|----------|
| `index.html` | 顶部导航、侧边栏菜单、iframe、菜单切换逻辑 | 业务表单、业务表格、业务弹窗 |
| `{module}.html` | `.app-container` 业务内容、Mock 数据、业务交互、业务弹窗 | 顶部导航、侧边栏菜单、iframe、平台标题、用户区 |

生成任何 HTML 前先判断文件角色。`index.html` 和 `{module}.html` 的职责不得混用。

### Subagent Prompt 模板（HTML 原型）

```
你是一个前端原型生成专家。请为以下模块生成 HTML 原型页面。

## 设计规范
请先读取以下规范文件：
- {skill_path}/specs/design-tokens.md
- {skill_path}/specs/html-prototype.md
- {skill_path}/templates/prototype-index.html
- {skill_path}/templates/prototype-style.css

## 模板参考
请读取对应的模板文件：
- CRUD: {skill_path}/templates/crud-page.html
- 表单: {skill_path}/templates/form-page.html
- 统计: {skill_path}/templates/stats-page.html
- 登录: {skill_path}/templates/login-page.html

注意：生成模块子页面时禁止读取或套用 `{skill_path}/templates/prototype-index.html`。该模板只能用于主布局 index.html。

## 目标模块
- 模块名：{module.name}
- 页面类型：{module.type}
- 页面标签：{module.label}
- 字段列表：{fields_json}
- 接口定义：{apis_json}

## 输出要求
- 输出文件：{project_path}/docs/design-prototype/{module.name}.html
- 必须引用 style.css
- 必须包含完整的 Mock 数据
- 所有按钮必须绑定 @click 事件
- Vue 2 DOM 模板中自定义组件禁止使用自闭合标签 />
- CRUD 页方法名固定为 handleSearch / handleReset / handleAdd / handleEdit / handleDelete / handleExport
- 图表页必须生成完整 ECharts option，不得只留空 initCharts 注释
- 这是 iframe 子页面，不是后台主布局；禁止生成顶部导航、侧边栏、菜单、iframe、用户信息
- 子页面 `#app` 内的第一个业务容器必须是 `<div class="app-container">`
- 表单/配置页必须生成真实表单控件。禁止只生成“认证配置/存储配置/邮件配置”等标题和“保存配置”按钮
- 如果字段列表不完整，按业务语义补足合理控件：文本输入、数字输入、下拉选择、开关、日期/时间配置

## 图表容器要求（重要！）

ECharts 图表容器必须同时设置 width 和 height：

```html
<!-- ✅ 正确 -->
<div id="chart1" style="width: 100%; height: 350px;"></div>

<!-- ❌ 错误：没有设置 width -->
<div id="chart1" style="height: 350px;"></div>
```

如果不设置 width: 100%，图表会挤在左边。
```

### Subagent Prompt 模板（生成 index.html）

```
你是一个前端原型生成专家。请生成主布局页面 index.html。

## 设计规范
请先读取以下规范文件：
- {skill_path}/specs/design-tokens.md
- {skill_path}/specs/html-prototype.md

## 目标页面

生成一个主布局页面，包含：
- 顶部导航栏（深色背景 #1f2227）
- 左侧菜单栏（白色背景，蓝色激活边框 #1890ff，只放菜单项，不要重复生成平台名、模块名或“功能菜单”标题）
- 右侧内容区（灰色背景 #f5f5f5）
- 使用 iframe 加载子页面

## 菜单结构

{menus_json}

## 输出要求
- 输出文件：{project_path}/docs/design-prototype/index.html
- 同时生成 {project_path}/docs/design-prototype/style.css
- 使用 iframe 加载子页面，不合并内容
- 点击菜单切换 iframe 的 src 属性
- iframe 默认加载第一个菜单项对应的页面

## iframe 切换逻辑

```javascript
methods: {
  handleMenuSelect(index) {
    this.activeMenu = index;
    this.currentUrl = this.menuPages[index];
  }
}
```

## iframe 样式

```css
.content-frame {
  width: 100%;
  height: calc(100vh - 50px);
  border: none;
}
```

## 任务说明

生成一个可以预览所有子页面的 iframe 主布局。不要读取或合并子页面 HTML 内容。

## 输出要求

- 输出文件：{project_path}/docs/design-prototype/index.html
- 只包含主布局、菜单、iframe 和菜单切换 Vue 实例
- 不出现 v-show 子页面容器
- 不合并任何子页面 Mock 数据或 methods
- 每个菜单项的 iframe 地址必须指向对应的 `{module.name}.html`
- 主布局 CSS 必须来自 prototype-style.css；不要自己发明另一套布局样式
- 顶部只显示平台名，不生成右侧用户信息
```

### Subagent Prompt 模板（Vue 组件）

```
你是一个 Vue 2 前端开发专家。请为以下模块生成 Vue 组件。

## 开发规范
请先读取以下文件：
- {project_path}/design.md（项目约定，必须严格遵循）
- {skill_path}/specs/design-tokens.md
- {skill_path}/specs/vue-component.md
- {skill_path}/specs/api-mock.md

## 模板参考
- {skill_path}/templates/vue-component.vue
- {skill_path}/templates/vue-api.js
- {skill_path}/templates/vue-mock.js

## 目标模块
- 模块名：{module.name}
- 页面标签：{module.label}
- 字段列表：{fields_json}
- 接口定义：{apis_json}

## 输出要求（共 3 个文件）
1. {project_path}/src/views/{module.name}/index.vue
2. {project_path}/src/views/{module.name}/api.js
3. {project_path}/src/views/{module.name}/mock.js
```

---

## 流程 C：自然语言描述（增加/修改/修复）

```
Phase 1: 读取 design.md（了解项目约定）
Phase 2: 分析用户意图
  - 动作：增加 / 修改 / 修复
  - 目标：页面名 / 组件名 / 功能名
Phase 3: 定位目标文件
  - 搜索 src/views/ 下的 Vue 组件
  - 如找不到，询问用户提供文件路径
Phase 4: 读取现有代码 + 判断改动大小
  - 小改动 → 直接修改代码
  - 大改动 → 先生成原型预览
Phase 5: 应用修改
  - 使用 Edit 工具精确修改
  - 遵循 design.md 中的所有约定
  - 确保代码风格与现有代码一致
Phase 6: 代码验证（见「代码验证」章节）
```

## 流程 D：对接真实接口（替换 mock）

**触发**：用户提供或当前项目能找到 `api-doc` 生成的接口文档，并要求对接真实接口、替换 mock、使用真实接口。

```
Phase 1: 读取 design.md + PRD + 接口文档
  - 接口文档可以来自当前项目 docs/api/
  - 接口文档也可以来自后端项目绝对路径
  - API 文档优先于 PRD 中的接口草案

Phase 2: 定位目标页面
  - 优先通过 PRD 页面名称/模块名定位 src/views/{module}/index.vue
  - 找不到时搜索 src/views/ 下相关页面
  - 仍找不到则询问用户页面路径

Phase 3: 读取现有文件
  - src/views/{module}/index.vue
  - src/views/{module}/api.js
  - src/views/{module}/mock.js

Phase 4: 接口替换
  - 根据接口文档生成真实请求函数
  - 保持函数命名与 index.vue 调用一致，或同步更新 import 和调用点
  - 调整 query 参数、path 参数、body 参数
  - 按真实响应结构解析列表、总数、详情、操作结果
  - 保留 mockList catch 兜底

Phase 5: 验证
  - 执行 validate-vue --fast
  - 如项目有 build 脚本，执行 npm run build
```

禁止行为：
- 不因对接接口而重新生成 HTML 原型。
- 不因对接接口而重写页面布局。
- 不删除 mock 兜底，除非用户明确要求。
- 不用 PRD 中的路径覆盖 api-doc 的真实路径。

---

## 改动大小判断

| 类型 | 判断标准 | 处理方式 |
|------|---------|---------|
| 小改动 | 单个文件内的修改（加按钮、改字段、修 bug） | 直接修改代码 |
| 大改动 | 需要新增页面/路由/模块（新增 Tab、新增表单页） | 先生成原型确认 |

---

## 路由集成（新建页面时必须）

新建页面后，必须将页面集成到项目中：

### 首次创建（脚手架刚生成）

生成的 `router/index.js` 中 `// __SCAFFOLD_ROUTES__` 占位符需替换为实际路由。
同时必须替换 `__DEFAULT_ROUTE__` 为第一个页面模块名。

### 新增模块时的路由更新

读取 `{project_path}/src/router/index.js`，在 `constantRoutes[0].children` 数组中插入新路由：

```javascript
{
  path: '{module_name}',
  name: '{ModuleName}',
  component: () => import('@/views/{module_name}/index'),
  meta: { title: '{模块中文名}', icon: '{图标名}' }
}
```

图标选择规则：
- CRUD 页：`document`
- 表单页：`edit`
- 统计页：`data-analysis`
- 登录页：`s-check`

### Sidebar 自动更新

Sidebar 组件通过读取 `router.options.routes` 动态渲染菜单，无需手动修改。新增路由后菜单自动出现。

### 2. 添加菜单权限（如果项目有权限系统）

在后端菜单管理中添加对应的菜单记录，确保路由能正常显示。

### 3. 检查是否需要 Vuex Store

如果页面涉及全局状态（如用户信息、字典数据），需要在 `{project_path}/src/store/modules/` 中注册模块。

---

## 代码验证（每次修改后必须）

修改代码后，执行以下检查：

### 硬校验命令（必须）

HTML 原型阶段：

```bash
node {skill_path}/scripts/validate-prototype.mjs {project_path}/docs/design-prototype
```

Vue 代码阶段：

```bash
node {skill_path}/scripts/validate-vue.mjs {project_path} --fast
```

最终交付前：

```bash
node {skill_path}/scripts/validate-vue.mjs {project_path} --full
npm run build
```

如果项目没有 `package.json` 或没有 `build` 脚本，必须说明无法执行构建；否则构建失败必须修复后再交付。

### 语法检查

```
1. 检查 Vue 模板语法：
   - 标签是否正确闭合
   - 指令语法是否正确（v-if, v-for, :prop, @event）
   - 插值语法是否正确（{{ xxx }}）

2. 检查 JavaScript 语法：
   - import 路径是否正确
   - 方法名是否拼写正确
   - data() 返回的对象格式是否正确

3. 检查样式：
   - SCSS 变量是否已定义
   - 选择器是否正确
```

### 风格一致性检查

```
1. 新代码是否使用了 design.md 中定义的全局方法
2. 新代码是否使用了 design.md 中定义的全局组件
3. 新代码是否使用了 design.md 中定义的指令
4. 缩进、引号、分号是否与现有代码一致
```

### 完整性检查

```
1. 新增的按钮是否都绑定了 @click 事件
2. 新增的表单字段是否都有对应的 data 属性
3. 新增的方法是否都在 methods 中定义
4. 新增的 API 调用是否都导入了对应的函数
```

---

## 输出结构（新建页面时）

### 脚手架文件（Phase 6 并行生成，仅首次）

```
├── package.json
├── vue.config.js
├── babel.config.js
├── .scaffolded
├── public/
│   └── index.html
└── src/
    ├── main.js
    ├── App.vue
    ├── router/
    │   └── index.js
    ├── utils/
    │   ├── request.js
    │   └── common.js
    ├── plugins/
    │   ├── index.js
    │   └── modal.js
    ├── layout/
    │   ├── index.vue
    │   └── components/
    │       └── Sidebar.vue
    └── components/
        └── Pagination/
            └── index.vue
```

### 页面文件（每次生成）

```
docs/design-prototype/
├── index.html              # 主布局页面
├── style.css               # 共享样式
├── login.html              # 登录页面
├── record.html             # 子页面 1
└── ...

src/views/
├── login/
│   └── index.vue           # 登录页面
├── record/
│   ├── index.vue
│   ├── api.js
│   └── mock.js
└── ...
```
