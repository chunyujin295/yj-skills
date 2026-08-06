# Vue 组件规范

## 技术栈（强制）

- **Vue 2.6** + Options API（禁止 Composition API）
- **Element UI 2.15.8**（禁止 Element Plus）
- **SCSS** 样式预处理
- **ECharts 4.9** 图表
- **Vue Router 3** + **Vuex 3**

## 重要：遵循项目 design.md

**本文件提供通用规范和模板参考。具体项目的全局方法、组件、指令、代码风格，必须以项目根目录的 `design.md` 为准。**

例如：
- 成功提示：design.md 中定义的是 `this.$modal.msgSuccess()` 就用 `$modal.msgSuccess()`，而不是写死用 `$message.success()`
- 删除确认：design.md 中定义的是 `this.$modal.confirm()` 就用 `$modal.confirm()`
- 权限指令：design.md 中定义了 `v-hasPermi` 就必须加
- 分页组件：design.md 中定义了 `<pagination>` 就用 `<pagination>` 而非 `<el-pagination>`

## 通用代码规范

1. **Vue 版本** — Vue 2.x + Options API，禁止 Composition API
2. **样式** — `<style lang="scss" scoped>`，颜色用变量不硬编码
3. **深度选择器** — 使用 `::v-deep`（不用 `/deep/`）
4. **组件库** — Element UI 2.15.8，禁止 Element Plus
5. **请求封装** — `@/utils/request` 封装 axios
6. **页面根类名** — 统一用 `.app-container`
7. **表格** — 根据项目实际情况决定是否加 `border` 和 `stripe`
8. **搜索输入框** — width: 240px, size: small
9. **操作列按钮** — 用 `type="text" size="mini"`

## Vue 组件模板（参考）

> 注意：以下模板中的 `this.$message.success`、`this.$confirm` 等是通用写法。
> 实际生成时，必须替换为 design.md 中定义的项目实际方法。

```vue
<template>
  <div class="app-container">
    <!-- 搜索栏 -->
    <el-form :model="queryParams" ref="queryForm" :inline="true" size="small">
      <el-form-item label="关键词">
      <el-input v-model="queryParams.keyword" placeholder="请输入" clearable
                style="width: 240px" @keyup.enter.native="handleQuery"></el-input>
      </el-form-item>
      <el-form-item>
        <el-button type="primary" icon="el-icon-search" @click="handleQuery">查询</el-button>
        <el-button icon="el-icon-refresh" @click="resetQuery">重置</el-button>
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
    <el-table v-loading="loading" :data="tableData" border stripe>
      <el-table-column label="ID" prop="id" width="80"></el-table-column>
      <el-table-column label="名称" prop="name"></el-table-column>
      <el-table-column label="状态">
        <template slot-scope="scope">
          <el-tag :type="scope.row.status === '启用' ? 'success' : 'danger'" size="small" effect="plain">
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
    <pagination v-show="total > 0" :total="total" :page.sync="queryParams.pageNum"
                :limit.sync="queryParams.pageSize" @pagination="getList"></pagination>

    <!-- 新增/编辑弹窗 -->
    <el-dialog :title="dialogTitle" :visible.sync="dialogVisible" width="600px" :close-on-click-modal="false">
      <el-form :model="form" :rules="rules" ref="form" label-width="120px" size="small">
        <el-form-item label="名称" prop="name">
        <el-input v-model="form.name" placeholder="请输入" style="width: 300px;"></el-input>
        </el-form-item>
      </el-form>
      <span slot="footer">
        <el-button size="small" @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" size="small" @click="handleSave">保存</el-button>
      </span>
    </el-dialog>
  </div>
</template>

<script>
import { getList, add, update, remove } from './api'
import { mockList } from './mock'

export default {
  name: 'ModuleName',
  data() {
    return {
      loading: false,
      tableData: [],
      total: 0,
      queryParams: {
        keyword: '',
        pageNum: 1,
        pageSize: 10
      },
      dialogVisible: false,
      dialogTitle: '',
      form: {},
      rules: {
        name: [{ required: true, message: '请输入名称', trigger: 'blur' }]
      }
    }
  },
  created() {
    this.getList()
  },
  methods: {
    async getList() {
      this.loading = true
      try {
        const res = await getList(this.queryParams)
        const payload = res && res.data ? res.data : res
        const list = Array.isArray(payload) ? payload : (payload && (payload.list || payload.rows)) || []
        this.tableData = list
        this.total = payload && typeof payload.total === 'number' ? payload.total : list.length
      } catch (error) {
        this.tableData = mockList
        this.total = mockList.length
      } finally {
        this.loading = false
      }
    },
    handleQuery() {
      this.queryParams.pageNum = 1
      this.getList()
    },
    resetQuery() {
      this.queryParams = { keyword: '', pageNum: 1, pageSize: 10 }
      this.getList()
    },
    handleAdd() {
      this.dialogTitle = '新增'
      this.form = { name: '' }
      this.dialogVisible = true
      this.$nextTick(() => { this.$refs.form && this.$refs.form.clearValidate() })
    },
    handleEdit(row) {
      this.dialogTitle = '编辑'
      this.form = { ...row }
      this.dialogVisible = true
      this.$nextTick(() => { this.$refs.form && this.$refs.form.clearValidate() })
    },
    handleSave() {
      this.$refs.form.validate(async (valid) => {
        if (!valid) return
        if (this.form.id) {
          await update(this.form.id, this.form).catch(() => null)
        } else {
          await add(this.form).catch(() => null)
        }
        this.showSuccess('保存成功')
        this.dialogVisible = false
        this.getList()
      })
    },
    handleDelete(row) {
      this.confirmAction('确认删除 ' + row.name + '？')
        .then(async () => {
          await remove(row.id).catch(() => null)
          this.showSuccess('删除成功')
          this.getList()
        })
        .catch(() => {})
    },
    showSuccess(message) {
      if (this.$modal && this.$modal.msgSuccess) {
        this.$modal.msgSuccess(message)
        return
      }
      this.$message.success(message)
    },
    confirmAction(message) {
      if (this.$modal && this.$modal.confirm) {
        return this.$modal.confirm(message)
      }
      return this.$confirm(message, '系统提示', { type: 'warning' })
    }
  }
}
</script>

<style lang="scss" scoped>
.app-container {
  padding: 20px;
}
</style>
```
