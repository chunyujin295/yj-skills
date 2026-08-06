---
name: api-doc
description: 接口文档生成 — 读取后端代码，提取 API 接口定义，生成精简的接口文档
trigger: /api-doc
---

# Api-doc Skill（接口文档生成）

## 使用方式

```
/api-doc @src/main/java/com/example/controller/UserController.java  # 指定控制器文件
/api-doc @docs/prd/user.md                                          # 根据 PRD 定位接口需求，再扫描后端代码
/api-doc 用户管理模块的接口                                           # 自然语言描述
```

## 路径解析

执行前必须先解析以下路径：

- `{skill_path}` = 本 skill 所在目录的绝对路径
- `{project_path}` = 用户当前工作目录

## 文档路径约定

| 文档类型 | 路径 | 说明 |
|---------|------|------|
| 前端 PRD | `docs/prd/` | probe-me skill 输出 |
| 接口文档 | `docs/api/` | 本 skill 输出 |
| 设计原型 | `docs/design-prototype/` | design skill 输出 |

**写入前自动创建目录**：如果目录不存在，使用 `mkdir -p` 创建。

## 跨项目约定

`api-doc` 大概率在后端项目中执行，生成的接口文档需要复制到前端项目后给 `design` 使用。因此接口文档必须是**可搬运 artifact**：

- 文档中必须包含来源元信息：后端项目名、扫描路径、Controller、DTO/VO、生成时间、可信度。
- 文档中的接口定义必须能脱离后端源码独立阅读。
- 不假设当前 `{project_path}` 是前端项目。
- 生成完成后，提示用户将 `docs/api/{模块名}-{时间戳}.md` 复制到前端项目的 `docs/api/` 目录，或在前端项目中用绝对路径 `@` 引用该文档。

---

## 核心原则

### 读代码，不猜

**通过扫描后端代码提取接口定义，不猜测接口信息。**

```
❌ 错误做法：
用户说"用户管理的接口"
AI 直接猜测：GET /api/v1/users, POST /api/v1/users...
（可能后端用的是 /api/v2/user 或其他路径）

✅ 正确做法：
用户说"用户管理的接口"
AI：我来扫描后端代码，找到 UserController...
    [扫描代码，提取真实接口定义]
```

### 不确定就问

| 场景 | 处理方式 |
|------|---------|
| 找不到 Controller | 询问用户控制器文件路径 |
| 接口信息不完整 | 追问缺失的部分 |
| 多个相关接口 | 列出让用户选择需要哪些 |

---

## 执行流程

### Phase 1：定位后端代码

```
1. 检查用户输入：
   - 提供了文件路径 → 直接读取
   - 提供了 PRD → 读取 PRD 中的"接口能力需求"，再搜索匹配的 Controller
   - 提供了模块名 → 搜索对应的 Controller
   - 只有描述 → 搜索 src/ 目录下的 Controller

2. 搜索策略：
   - 搜索 *Controller.java 或 *Controller.kt 文件
   - 搜索 @RestController / @Controller 注解
   - 根据模块名模糊匹配（如"用户" → UserController）
```

### Phase 2：扫描控制器代码

```
扫描规则（Spring Boot）：

1. 类级别注解：
   - @RestController / @Controller
   - @RequestMapping("/api/v1/users") → 类基础路径

2. 方法级别注解：
   - @GetMapping("/list") → GET /api/v1/users/list
   - @PostMapping("") → POST /api/v1/users
   - @PutMapping("/{id}") → PUT /api/v1/users/{id}
   - @DeleteMapping("/{id}") → DELETE /api/v1/users/{id}

3. 参数注解：
   - @RequestParam → query 参数
   - @PathVariable → 路径参数
   - @RequestBody → body 参数

4. 返回类型：
   - ResponseEntity<T> → 提取 T 的结构
   - 自定义 VO → 读取 VO 类定义
```

### Phase 3：追问确认

```
AI：我在 UserController 中找到了 5 个接口：
    1. GET /api/v1/users — 获取用户列表
    2. POST /api/v1/users — 新增用户
    3. PUT /api/v1/users/{id} — 更新用户
    4. DELETE /api/v1/users/{id} — 删除用户
    5. GET /api/v1/users/{id} — 获取用户详情

    你的页面需要哪些接口？还是全部都要？

用户：全部都要，但是详情接口不需要

AI：好的。我还想确认：
    1. 列表接口的分页参数是什么？（pageNum/pageSize 还是 page/size）
    2. 搜索参数是 keyword 还是分开的 name/phone？
    3. 响应格式是什么？（直接返回数据还是 { code, data, message } 包装）

用户：pageNum/pageSize，keyword，直接返回数据

AI：明白了，我来生成接口文档。
```

### Phase 4：生成接口文档

```
1. 汇总扫描结果和用户确认的信息
2. 按照输出文档格式生成可搬运接口文档
3. 写入 docs/api/{模块名}-{时间戳}.md
4. 告知用户：
   - 如果前端项目就是当前目录，可以直接调用 /design
   - 如果当前目录是后端项目，请把该文件复制到前端项目 docs/api/ 下
   - 或在前端项目中用绝对路径 @ 引用该接口文档
```

---

## 扫描规则详解

### Spring Boot 控制器扫描

```java
@RestController
@RequestMapping("/api/v1/users")  // → 类基础路径
public class UserController {

    @GetMapping("")  // → GET /api/v1/users
    public ResponseEntity<List<User>> list(
        @RequestParam(defaultValue = "1") Integer pageNum,  // → query 参数
        @RequestParam(defaultValue = "10") Integer pageSize,
        @RequestParam(required = false) String keyword
    ) { ... }

    @PostMapping("")  // → POST /api/v1/users
    public ResponseEntity<Void> add(
        @RequestBody UserDTO dto  // → body 参数
    ) { ... }

    @PutMapping("/{id}")  // → PUT /api/v1/users/{id}
    public ResponseEntity<Void> update(
        @PathVariable Long id,  // → 路径参数
        @RequestBody UserDTO dto
    ) { ... }

    @DeleteMapping("/{id}")  // → DELETE /api/v1/users/{id}
    public ResponseEntity<Void> delete(
        @PathVariable Long id
    ) { ... }
}
```

### Kotlin 控制器扫描

```kotlin
@RestController
@RequestMapping("/api/v1/users")
class UserController {

    @GetMapping("")  // → GET /api/v1/users
    fun list(
        @RequestParam(defaultValue = "1") pageNum: Int,
        @RequestParam(defaultValue = "10") pageSize: Int,
        @RequestParam(required = false) keyword: String?
    ): ResponseEntity<List<User>> { ... }

    @PostMapping("")  // → POST /api/v1/users
    fun add(@RequestBody dto: UserDTO): ResponseEntity<Void> { ... }
}
```

---

## 文档命名规则

```
docs/api/{模块名}-{时间戳}.md

时间戳格式：yyyyMMddHHmm（如 202605231430）
```

示例：
- `docs/api/user-202605231430.md`
- `docs/api/order-202605231500.md`

---

## 输出文档格式

````markdown
# {模块名} 接口文档

## 文档元信息

- 生成来源：后端代码扫描
- 后端项目：{backendProjectName}
- 扫描根目录：{project_path}
- 扫描文件：
  - src/main/kotlin/.../UserController.kt
  - src/main/kotlin/.../UserRequest.kt
  - src/main/kotlin/.../UserResponse.kt
- Controller：UserController
- DTO/VO：UserCreateRequest, UserUpdateRequest, UserVO
- 生成时间：{yyyyMMddHHmm}
- 接口可信度：真实代码扫描
- 前端使用方式：复制本文件到前端项目 `docs/api/`，或在 `/design` 中通过绝对路径 `@` 引用

## 接口列表

### 获取用户列表
- 路径：GET /api/v1/users
- 参数：
  - pageNum (number, 必填) — 页码，默认 1
  - pageSize (number, 必填) — 每页条数，默认 10
  - keyword (string, 可选) — 搜索关键词
- 响应：
```json
{
  "list": [
    { "id": 1, "name": "张三", "phone": "138****1234", "status": "启用" }
  ],
  "total": 100
}
```

### 新增用户
- 路径：POST /api/v1/users
- 参数：
  - name (string, 必填) — 用户姓名
  - phone (string, 必填) — 手机号
  - status (string, 必填) — 状态：启用/禁用
- 响应：
```json
{ "message": "操作成功" }
```

### 更新用户
- 路径：PUT /api/v1/users/{id}
- 参数：
  - id (path, 必填) — 用户ID
  - name (string, 必填) — 用户姓名
  - phone (string, 必填) — 手机号
  - status (string, 必填) — 状态
- 响应：
```json
{ "message": "操作成功" }
```

### 删除用户
- 路径：DELETE /api/v1/users/{id}
- 参数：
  - id (path, 必填) — 用户ID
- 响应：
```json
{ "message": "操作成功" }
```
````

---

## 与 design skill 的衔接

```
/api-doc → 在后端项目输出 docs/api/{模块名}-{时间戳}.md（可复制）

复制到前端项目 docs/api/ 后：
/design @docs/prd/{模块名}-{时间戳}.md @docs/api/{模块名}-{时间戳}.md
         → 读取 PRD + 接口文档 → 生成代码

或不复制，直接在前端项目中引用绝对路径：
/design @docs/prd/{模块名}-{时间戳}.md @/path/to/backend/docs/api/{模块名}-{时间戳}.md
```

---

## 错误处理

| 场景 | 处理方式 |
|------|---------|
| 找不到 Controller | 询问用户控制器文件路径；不要根据 PRD 生成伪真实接口 |
| 接口注解不标准 | 尽力解析，无法解析时追问用户 |
| 多个相关 Controller | 列出所有匹配的，让用户选择 |
| 参数类型不确定 | 追问用户确认 |
| 只提供 PRD 但找不到后端代码 | 输出接口缺失报告，不生成真实接口文档 |

---

## 示例对话

```
用户：/api-doc 用户管理的接口

AI：我来搜索用户管理相关的控制器...
    [搜索 src/ 目录]
    
    找到 UserController.java，我来扫描接口定义。
    
    找到以下接口：
    1. GET /api/v1/users — 获取用户列表
    2. POST /api/v1/users — 新增用户
    3. PUT /api/v1/users/{id} — 更新用户
    4. DELETE /api/v1/users/{id} — 删除用户
    5. GET /api/v1/users/{id} — 获取用户详情

    你的页面需要哪些接口？还是全部都要？

用户：全部都要，但是详情接口不需要

AI：好的。我还想确认：
    1. 列表接口的分页参数是 pageNum/pageSize 对吗？
    2. 搜索参数是 keyword 还是分开的 name/phone？
    3. 响应格式是什么？（直接返回数据还是 { code, data } 包装）

用户：pageNum/pageSize，keyword，直接返回数据

AI：明白了，我来生成接口文档。
    [生成 docs/api/user-202605231430.md]

接口文档已生成：docs/api/user-202605231430.md
如果前端项目不在当前目录，请将该文件复制到前端项目的 docs/api/ 下，然后在前端项目中执行：
/design @docs/prd/user-202605231430.md @docs/api/user-202605231430.md
```
