# 接口与 Mock 规范

## 后端 API 路径约定

```
/api/v1/{模块}/{资源}/{操作}
```

示例：
```
GET    /api/v1/auth/face/result?authId=xxx      # 查询结果
POST   /api/v1/auth/face/init                    # 初始化认证
GET    /api/v1/providers                         # 服务商列表
POST   /api/v1/providers                         # 新增服务商
PUT    /api/v1/providers/{id}                    # 更新服务商
DELETE /api/v1/providers/{id}                    # 删除服务商
```

## api.js 生成模板

```javascript
import request from '@/utils/request'

// 列表查询
export function getList(params) {
  return request({
    url: '/api/v1/{module}',
    method: 'get',
    params
  })
}

// 新增
export function add(data) {
  return request({
    url: '/api/v1/{module}',
    method: 'post',
    data
  })
}

// 更新
export function update(id, data) {
  return request({
    url: `/api/v1/{module}/${id}`,
    method: 'put',
    data
  })
}

// 删除
export function remove(id) {
  return request({
    url: `/api/v1/{module}/${id}`,
    method: 'delete'
  })
}
```

## mock.js 生成模板

Vue 页面生成的 `mock.js` 必须使用 ES Module 导出，保证 `index.vue` 可以直接 `import { mockList } from './mock'`，后端接口未启动时页面也能用本地数据兜底运行。

```javascript
export const mockList = [
  { id: 1, name: '示例数据一', status: '启用', createTime: '2026-05-20 09:30:00' },
  { id: 2, name: '示例数据二', status: '启用', createTime: '2026-05-20 10:15:00' },
  { id: 3, name: '示例数据三', status: '禁用', createTime: '2026-05-21 11:20:00' },
  { id: 4, name: '示例数据四', status: '启用', createTime: '2026-05-22 14:05:00' },
  { id: 5, name: '示例数据五', status: '禁用', createTime: '2026-05-23 16:40:00' }
]

export default {
  list: {
    data: {
      list: mockList,
      total: mockList.length
    }
  },
  add: { message: '操作成功' },
  update: { message: '操作成功' },
  remove: { message: '操作成功' }
}
```

---

## API 信息提取

### 信息来源

| 来源 | 说明 | 处理方式 |
|------|------|---------|
| 接口文档 | docs/api/*.md — api-doc skill 输出 | 直接读取 |
| 需求文档 | docs/prd/*.md — probe-me skill 输出 | 从接口定义表格提取 |
| 用户自然语言 | 用户口头描述 | 追问缺失信息后生成 |

接口来源优先级与 `design/SKILL.md` 保持一致：本轮 `@` 指定的接口文档 > 当前项目 `docs/api/` 最新匹配文档 > PRD 接口能力需求 > 用户自然语言。api-doc 输出的真实接口文档优先于 PRD 中的接口草案。

### 提取流程

```
Step 1: 检查输入来源
  - 有接口文档 → 直接读取，提取接口定义
  - 有需求文档 → 从"接口定义"表格提取
  - 只有用户描述 → 追问具体信息

Step 2: 解析接口定义
  每个接口需要：
  - 接口名称（如：获取用户列表）
  - 请求方法（GET / POST / PUT / DELETE）
  - 接口路径（如：/api/v1/users）
  - 请求参数（query 参数或 body 参数）
  - 响应格式（JSON 结构）

Step 3: 缺失信息追问
  如果缺少关键信息，必须追问：
  - 接口路径不完整 → "这个接口的完整路径是什么？"
  - 参数不清楚 → "请求参数有哪些？类型是什么？"
  - 响应格式未知 → "响应格式是什么？直接返回数据还是 { code, data } 包装？"
```

### 追问模板

```
我需要补充以下信息来生成 API 对接代码：

1. 接口路径是什么？
   - 示例：GET /api/v1/users

2. 请求参数有哪些？
   - 示例：pageNum (number), pageSize (number), keyword (string)

3. 响应格式是什么？
   - 示例：{ code: 0, data: { list: [...], total: 100 } }
   - 或者：直接返回数据，如 { list: [...], total: 100 }
```

### api.js 生成规则

根据提取的接口定义生成：

```javascript
import request from '@/utils/request'

// 接口定义：GET /api/v1/users — 获取用户列表
// 参数：pageNum, pageSize, keyword
// 响应：{ list: [...], total: 100 }
export function getUserList(params) {
  return request({
    url: '/api/v1/users',
    method: 'get',
    params
  })
}

// 接口定义：POST /api/v1/users — 新增用户
// 参数：{ name, phone, status }
// 响应：{ message: "操作成功" }
export function addUser(data) {
  return request({
    url: '/api/v1/users',
    method: 'post',
    data
  })
}
```

### mock.js 生成规则

根据接口响应格式生成 ES Module 静态 Mock 数据。不要引入 `mockjs`，不要使用 `require` 或 `module.exports`，否则会和 Vue 页面导入方式及校验脚本冲突。

```javascript
export const mockList = [
  { id: 1, name: '张三', phone: '138****1234', status: '启用', createTime: '2026-05-20 09:30:00' },
  { id: 2, name: '李四', phone: '139****5678', status: '禁用', createTime: '2026-05-21 10:15:00' },
  { id: 3, name: '王五', phone: '137****9012', status: '启用', createTime: '2026-05-22 11:20:00' }
]

export default {
  // GET /api/v1/users 响应
  getUserList: {
    data: {
      list: mockList,
      total: mockList.length
    }
  },
  // POST /api/v1/users 响应
  addUser: {
    code: 0,
    message: '操作成功'
  }
}
```
