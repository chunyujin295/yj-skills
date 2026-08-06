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
        <el-button type="primary" icon="el-icon-plus" size="mini" @click="handleAdd">新增</el-button>
      </el-col>
      <el-col :span="1.5">
        <el-button icon="el-icon-download" size="mini" @click="handleExport">导出</el-button>
      </el-col>
    </el-row>

    <!-- 数据表格 -->
    <el-table v-loading="loading" :data="tableData" border stripe>
      <el-table-column label="ID" prop="id" width="80"></el-table-column>
      <el-table-column label="名称" prop="name" min-width="160"></el-table-column>
      <el-table-column label="状态">
        <template slot-scope="scope">
          <el-tag :type="scope.row.status === '启用' ? 'success' : 'danger'" size="small" effect="plain">
            {{ scope.row.status }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="创建时间" prop="createTime" width="180"></el-table-column>
      <el-table-column label="操作" width="180">
        <template slot-scope="scope">
          <el-button type="text" size="mini" @click="handleEdit(scope.row)">编辑</el-button>
          <el-button type="text" size="mini" style="color: #ff4949" @click="handleDelete(scope.row)">删除</el-button>
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
        <el-form-item label="状态" prop="status">
          <el-select v-model="form.status" placeholder="请选择" style="width: 300px;">
            <el-option label="启用" value="启用"></el-option>
            <el-option label="禁用" value="禁用"></el-option>
          </el-select>
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
  name: '{{COMPONENT_NAME}}',
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
      this.form = { name: '', status: '启用' }
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
    handleExport() {
      this.showSuccess('正在导出...')
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
