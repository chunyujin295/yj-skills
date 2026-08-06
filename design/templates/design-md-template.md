# 前端设计基因

> 自动生成于 {日期}，可手动补充。修改代码前必须先读取此文件。
> 生成规则：只记录扫描到的真实项目约定。未扫描到的全局方法、组件、指令必须写“未检测到”，不得保留示例内容。
> 脱敏规则：不得记录项目名称、路由、模块列表、菜单、真实接口路径或业务字段。

## 技术栈

- 框架：Vue {版本} + Options API
- UI 库：Element UI {版本}
- 样式：SCSS
- 图表：ECharts {版本}
- 路由：Vue Router {版本}
- 状态管理：Vuex {版本}

## 全局方法（Vue.prototype）

| 方法 | 说明 | 示例 |
|------|------|------|
| 未检测到 | - | - |

## 插件方法

| 方法 | 说明 | 示例 |
|------|------|------|
| 未检测到 | - | - |

## 全局组件（无需 import）

| 组件 | 说明 | 用法 |
|------|------|------|
| 未检测到 | - | - |

## 自定义指令

| 指令 | 说明 | 用法 |
|------|------|------|
| 未检测到 | - | - |

## 代码风格

| 规则 | 值 |
|------|-----|
| 缩进 | {N} 空格 |
| 引号 | 单引号 / 双引号 |
| 分号 | 无分号 / 有分号 |
| 相等 | 全等（===） |
| 深度选择器 | `::v-deep` |
| 样式块 | `<style lang="scss" scoped>` |

> 以上为示例，请根据实际 .eslintrc.js 扫描结果替换。

## API 模式

```javascript
import request from '@/utils/request'

// 列表查询
export function getList(params) {
  return request({ url: '<由接口文档提供>', method: 'get', params })
}

// 新增
export function add(data) {
  return request({ url: '<由接口文档提供>', method: 'post', data })
}

// 更新
export function update(id, data) {
  return request({ url: '<由接口文档提供>', method: 'put', data })
}

// 删除
export function remove(id) {
  return request({ url: '<由接口文档提供>', method: 'delete' })
}
```

## 页面模式

从采样的 Vue 组件中提取的模式。未采样到页面时写“未检测到”，不得保留示例：

- 根类名：未检测到
- 搜索栏：未检测到
- 操作栏：未检测到
- 表格：未检测到
- 分页：未检测到
- 弹窗：未检测到
