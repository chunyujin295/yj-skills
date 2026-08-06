# HTML 原型规范

## 主布局页面要求

**HTML 原型必须生成一个主布局页面 `index.html`**，包含：
- 顶部导航栏（深色背景 #1f2227，白色 logo + 平台名称）
- 左侧菜单栏（白色背景，蓝色激活边框 #1890ff，只放菜单项，不放二级标题/模块标题）
- 右侧内容区（灰色背景 #f5f5f5）
- 点击左侧菜单切换 iframe 的 src，显示对应子页面

### 侧边栏菜单结构

```html
<div class="sidebar">
  <el-menu :default-active="activeMenu" @select="handleMenuSelect">
    <el-menu-item index="record">
      <i class="el-icon-document"></i>
      <span>认证记录</span>
    </el-menu-item>
    <el-menu-item index="provider">
      <i class="el-icon-office-building"></i>
      <span>服务商管理</span>
    </el-menu-item>
    <el-menu-item index="config">
      <i class="el-icon-setting"></i>
      <span>系统配置</span>
    </el-menu-item>
    <el-menu-item index="alert">
      <i class="el-icon-warning"></i>
      <span>预警记录</span>
    </el-menu-item>
    <el-menu-item index="audit">
      <i class="el-icon-tickets"></i>
      <span>审计日志</span>
    </el-menu-item>
    <el-menu-item index="stats">
      <i class="el-icon-data-analysis"></i>
      <span>统计报表</span>
    </el-menu-item>
  </el-menu>
</div>
```

### 布局样式要求

```scss
// 顶部导航栏
.navbar {
  height: 50px;
  background: #1f2227;
  display: flex;
  align-items: center;
  padding: 0 20px;
  color: #fff;
  font-size: 16px;
  font-weight: 600;
}

// 侧边栏
.sidebar {
  width: 200px;
  background: #fff;
  border-right: 1px solid #e8e8e8;
  height: calc(100vh - 50px);
}

// 侧边栏激活项
.el-menu-item.is-active {
  background: rgba(86,118,230,0.26) !important;
  border-right: 3px solid #1890ff;
}

// 内容区
.main-content {
  flex: 1;
  background: #f5f5f5;
  overflow-y: auto;
  height: calc(100vh - 50px);
}
```

## 页面布局规则

### iframe 子页面边界（强制）

除 `index.html` 外，所有模块页面都是 iframe 子页面，只负责业务内容。

子页面必须遵守：
- `#app` 内只能放业务内容容器 `.app-container` 和必要的 `el-dialog`
- 不生成顶部导航、侧边栏、菜单、平台标题、用户信息
- 不使用 `.navbar`、`.sidebar`、`.layout-body`、`.main-content`、`.content-frame`
- 不使用 `<el-menu>`、`<el-menu-item>`、`<iframe>`

错误示例：
```html
<div id="app">
  <div class="navbar">平台标题</div>
  <div class="layout-body">
    <div class="sidebar">菜单</div>
    <div class="main-content">业务内容</div>
  </div>
</div>
```

正确示例：
```html
<div id="app">
  <div class="app-container">
    <!-- 搜索栏、表格、表单、图表等业务内容 -->
  </div>
  <el-dialog></el-dialog>
</div>
```

### 标准 CRUD 页面结构

```html
<div class="app-container">
  <!-- 搜索栏 -->
  <el-form :model="queryParams" ref="queryForm" :inline="true" size="small">
    <el-form-item label="关键词">
      <el-input v-model="queryParams.keyword" placeholder="请输入" clearable
              style="width: 240px" @keyup.enter.native="handleSearch"></el-input>
    </el-form-item>
    <el-form-item>
      <el-button type="primary" icon="el-icon-search" @click="handleSearch">查询</el-button>
      <el-button icon="el-icon-refresh" @click="handleReset">重置</el-button>
    </el-form-item>
  </el-form>

  <!-- 操作栏 -->
  <el-row :gutter="10" class="mb8">
    <el-col :span="1.5">
      <el-button type="primary" icon="el-icon-plus" size="mini"
                 @click="handleAdd">新增</el-button>
    </el-col>
  </el-row>

  <!-- 数据表格 -->
  <el-table v-loading="loading" :data="tableData" border>
    <el-table-column label="ID" prop="id" width="80"></el-table-column>
    <el-table-column label="名称" prop="name"></el-table-column>
    <el-table-column label="状态">
      <template slot-scope="scope">
        <el-tag :type="scope.row.status === '启用' ? 'success' : 'danger'" size="small">
          {{ scope.row.status }}
        </el-tag>
      </template>
    </el-table-column>
    <el-table-column label="操作" width="180">
      <template slot-scope="scope">
        <el-button type="text" size="mini" @click="handleEdit(scope.row)">编辑</el-button>
        <el-button type="text" size="mini" style="color: #ff4949"
                   @click="handleDelete(scope.row)">删除</el-button>
      </template>
    </el-table-column>
  </el-table>

  <!-- 分页 -->
  <div class="pagination-container">
    <el-pagination background layout="total, sizes, prev, pager, next, jumper"
                   :total="total" :page-sizes="[10, 20, 50]"
                   :page-size.sync="queryParams.pageSize"
                   :current-page.sync="queryParams.pageNum">
    </el-pagination>
  </div>
</div>
```

### 标准配置页结构

表单/系统配置页必须可直接使用，不能只是分组标题和保存按钮。

强制规则：
- 使用 `el-tabs type="border-card"` 或多个 `el-card` 做分组
- 每个分组至少 2 个真实配置控件
- 控件必须绑定 `v-model`
- 数字类配置使用 `el-input-number`
- 开关类配置使用 `el-switch`
- 枚举类配置使用 `el-select`
- 保存/重置按钮统一放在底部 `.form-actions`，不得分散到每行最右侧

推荐结构：
```html
<div class="app-container">
  <el-tabs v-model="activeTab" type="border-card">
    <el-tab-pane label="认证配置" name="auth">
      <el-form :model="form.auth" ref="authForm" label-width="140px" size="small" class="config-form">
        <el-row :gutter="24">
          <el-col :span="12">
            <el-form-item label="认证有效期">
              <el-input-number v-model="form.auth.expireMinutes" :min="1" :max="1440"></el-input-number>
              <span class="form-unit">分钟</span>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="活体检测">
              <el-switch v-model="form.auth.livenessEnabled"></el-switch>
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
    </el-tab-pane>
  </el-tabs>
  <div class="form-actions">
    <el-button type="primary" size="small" @click="handleSave">保存配置</el-button>
    <el-button size="small" @click="handleReset">重置</el-button>
  </div>
</div>
```

### 关键样式约定

```scss
.app-container {
  padding: 20px;
}

// 搜索表单白色背景
.el-form--inline .el-form-item {
  margin-bottom: 10px;
}

// 表格表头蓝色背景
.el-table th {
  background-color: #e4eeff !important;
}

// 表格斑马纹
.el-table--striped .el-table__body tr.el-table__row--striped td {
  background: #fafafa;
}

// 操作列按钮间距
.el-button + .el-button {
  margin-left: 10px;
}

// 分页居右
.pagination-container {
  text-align: right;
  margin-top: 16px;
}

// 表格容器（防止列挤压）
.table-wrap {
  overflow-x: auto;
}
.table-wrap .el-table {
  min-width: 1100px;
}
.table-wrap .el-table th .cell,
.table-wrap .el-table td .cell {
  white-space: nowrap;
}

// 图表容器（必须设置 width: 100%）
.chart-container {
  width: 100%;
  height: 350px;
}
```

## 组件选择规则

| 需求场景 | 使用组件 | 说明 |
|---------|---------|------|
| 输入短文本 | `el-input` | 单行，width: 240px |
| 输入长文本 | `el-input type="textarea"` | 多行 |
| 选择一项 | `el-select` | 下拉，配合 `el-option` |
| 选择多项 | `el-checkbox-group` | 复选框 |
| 开启/关闭 | `el-switch` | 开关 |
| 选择日期 | `el-date-picker` | 日期范围用 `type="daterange"` |
| 展示表格数据 | `el-table` | 加 `border`、`stripe` |
| HTML 原型分页 | `el-pagination` | 原型可独立运行，不依赖项目全局组件 |
| Vue 组件分页 | 自定义 `<pagination>` 组件 | 以 `design.md` 为准，脚手架默认提供 |
| 弹窗操作 | `el-dialog` | padding: 30px 50px |
| 操作反馈 | `this.$message` | 成功/警告/错误 |
| 确认操作 | `this.$confirm` | 删除确认 |
| 状态标签 | `el-tag` + `size="small"` | 用描边样式 `effect="plain"` |
| 加载状态 | `v-loading` | 表格/卡片加载 |

## 按钮使用规则

| 操作类型 | 按钮样式 | 示例 |
|---------|---------|------|
| 主要操作 | `type="primary" size="small"` | 保存、提交、查询、新增 |
| 次要操作 | `size="small"` 默认样式 | 重置、取消 |
| 危险操作 | `type="danger" size="small" plain` | 删除、注销、禁用 |
| 文本操作 | `type="text" size="mini"` | 编辑、查看详情、更多 |

## Mock 数据规范

**每个页面必须生成 Mock 数据**，确保前端可独立测试。

### HTML 原型中的 Mock 数据

HTML 原型必须内嵌完整的模拟数据，让用户预览时能看到真实的表格/表单效果：

```html
<script>
// 内嵌 Mock 数据，让原型可独立预览
const MOCK_DATA = {
  tableData: [
    { id: 1, name: '百度AI', type: 'BAIDU', status: '启用', quota: 1000, used: 356 },
    { id: 2, name: '阿里云', type: 'ALIYUN', status: '启用', quota: 2000, used: 128 },
    { id: 3, name: '腾讯云', type: 'TENCENT', status: '禁用', quota: 500, used: 0 },
  ],
  stats: {
    totalAuth: 12580,
    successRate: 96.8,
    todayCount: 328,
    activeProviders: 3
  }
}
</script>
```

## 交互规范（强制 — HTML 原型必须实现）

**HTML 原型不仅要展示静态数据，必须包含完整的交互功能**，让用户能真实体验操作流程。

### 必须实现的交互

| 页面类型 | 必须实现的交互 |
|---------|--------------|
| **CRUD 表格页** | 查询、重置、新增弹窗、编辑弹窗（回填数据）、删除确认、详情查看 |
| **表单配置页** | 保存配置、重置配置 |
| **统计报表页** | 时间范围切换、图表渲染（ECharts） |
| **所有页面** | 侧边栏菜单切换、分页（可选） |

### 弹窗交互规范

**新增/编辑弹窗**必须包含：
- 弹窗标题根据操作类型切换（"新增XXX" / "编辑XXX"）
- 表单字段回填（编辑时从行数据取值）
- 表单校验（必填项提示）
- 保存后关闭弹窗 + 成功提示

```html
<!-- 弹窗定义在 content 外部（el-dialog 不在 v-show 容器内） -->
<el-dialog :title="dialogTitle" :visible.sync="dialogVisible" width="600px" :close-on-click-modal="false">
  <el-form :model="form" label-width="120px" size="small">
    <el-form-item label="名称">
      <el-input v-model="form.name" placeholder="请输入" style="width:300px;"></el-input>
    </el-form-item>
  </el-form>
  <span slot="footer">
    <el-button size="small" @click="dialogVisible = false">取消</el-button>
    <el-button type="primary" size="small" @click="handleSave">保存</el-button>
  </span>
</el-dialog>
```

**删除确认弹窗**必须使用 `this.$confirm`：
```javascript
handleDelete(row) {
  this.$confirm('确认删除 ' + row.name + '？', '警告', { type: 'warning' })
    .then(() => { this.$message.success('删除成功'); })
    .catch(() => {});
}
```

### 按钮 @click 绑定规范

**HTML 原型中每个操作按钮都必须绑定 @click 事件**，不允许有"死按钮"：

```html
<!-- 搜索栏按钮 -->
<el-button type="primary" icon="el-icon-search" @click="handleSearch">查询</el-button>
<el-button icon="el-icon-refresh" @click="handleReset">重置</el-button>

<!-- 操作栏按钮 -->
<el-button type="primary" icon="el-icon-plus" size="mini" @click="handleAdd">新增</el-button>
<el-button icon="el-icon-download" size="mini" @click="handleExport">导出</el-button>

<!-- 表格操作列按钮（注意 slot-scope） -->
<el-button type="text" size="mini" @click="handleEdit(scope.row)">编辑</el-button>
<el-button type="text" size="mini" style="color:#ff4949" @click="handleDelete(scope.row)">删除</el-button>
```

### Vue 方法模板

每个页面的 methods 必须包含完整的交互方法：

```javascript
methods: {
  // 搜索/重置
  handleSearch() { this.$message.success('查询条件已应用'); },
  handleReset() { this.$message.info('已重置查询条件'); },

  // 新增 — 打开空表单弹窗
  handleAdd() {
    this.dialogTitle = '新增XXX';
    this.form = { name: '', type: '' };  // 重置为空
    this.dialogVisible = true;
  },

  // 编辑 — 打开并回填数据
  handleEdit(row) {
    this.dialogTitle = '编辑XXX';
    this.form = { ...row };  // 浅拷贝回填
    this.dialogVisible = true;
  },

  // 保存 — 校验 + 提示
  handleSave() {
    if (!this.form.name) { this.$message.warning('请填写必填项'); return; }
    this.$message.success('保存成功');
    this.dialogVisible = false;
  },

  // 删除 — 二次确认
  handleDelete(row) {
    this.$confirm('确认删除 ' + row.name + '？', '警告', { type: 'warning' })
      .then(() => { this.$message.success('删除成功'); })
      .catch(() => {});
  },

  // 导出
  handleExport() { this.$message.success('正在导出...'); },
}
```

### 弹窗放置位置

**`el-dialog` 必须放在主内容区外部**（与 `#app` 同级或在 layout-body 之后），不要放在 `v-show` 容器内，否则切换页面时弹窗状态可能异常。

```html
<div id="app">
  <!-- 导航栏 -->
  <!-- 侧边栏 + 内容区（v-show 切换） -->

  <!-- 弹窗统一放在内容区外部 -->
  <el-dialog ...>...</el-dialog>
</div>
```

## ⚠️ Vue 2 DOM 模板自闭合标签规则（强制）

**Vue 2 的 DOM 模板（直接在 HTML 中写模板）中，自定义组件禁止使用自闭合标签 `/>`。**

浏览器 HTML 解析器不认自定义标签为 void 元素，会把后续兄弟元素解析为当前元素的子元素，导致布局错乱。

**错误示例**：
```html
<!-- ❌ 浏览器会把 el-table-column-2 解析为 el-table-column-1 的子元素 -->
<el-table-column label="认证ID" prop="authId" width="180"/>
<el-table-column label="订单号" prop="orderId" width="180"/>
```

**正确示例**：
```html
<!-- ✅ 必须使用开放/闭合标签对 -->
<el-table-column label="认证ID" prop="authId" width="180"></el-table-column>
<el-table-column label="订单号" prop="orderId" width="180"></el-table-column>
```

**受影响的 Element UI 组件**（HTML 原型中必须全部使用开放/闭合标签）：
- `<el-table-column>` — 表格列
- `<el-input>` — 输入框
- `<el-option>` — 下拉选项
- `<el-select>` — 下拉选择
- `<el-date-picker>` — 日期选择
- `<el-switch>` — 开关
- `<el-pagination>` — 分页
- `<el-form-item>` — 表单项
- `<el-radio-button>` — 单选按钮

**注意**：Vue 单文件组件（`.vue` 文件）不受此限制，可以使用自闭合标签。此规则仅针对 HTML 原型文件。
