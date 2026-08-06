# 设计令牌规范

## 颜色体系

| 变量名 | 值 | 用途 |
|--------|-----|------|
| $--color-primary | #1890ff | 主色（按钮、链接、选中状态、侧边栏激活边框） |
| $--color-success | #13ce66 | 成功状态 |
| $--color-warning | #ffba00 | 警告状态 |
| $--color-danger | #ff4949 | 危险状态 |
| $bg-page | #f5f5f5 | 页面背景 |
| $bg-card | #ffffff | 卡片/表单背景 |
| $table-header-bg | #e4eeff | 表格表头背景 |
| $border-color | #dfe6ec | 表格/表单边框 |
| $navbar-bg | #1f2227 | 顶部导航栏背景（深色） |
| $sidebar-bg | #ffffff | 侧边栏背景（白色） |
| $sidebar-active-border | #1890ff | 侧边栏激活项右边框 |
| $sidebar-active-bg | rgba(86,118,230,0.26) | 侧边栏激活项背景 |

## 状态标签颜色

| 状态 | 颜色 | 样式 |
|------|------|------|
| 已认证 / 已启用 | #13ce66 | 绿色描边胶囊 |
| 已设置 / 运行中 | #1890ff | 蓝色描边胶囊 |
| 已绑定 | #ffba00 | 橙色描边胶囊 |
| 未绑定 / 未认证 | #999999 | 灰色描边胶囊 |
| 已禁用 / 异常 | #ff4949 | 红色描边胶囊 |

## 字体规范

```scss
// 主字体栈
font-family: "Helvetica Neue", Helvetica, "PingFang SC", "Hiragino Sans GB",
             "Microsoft YaHei", Arial, sans-serif;
```

| 字号 | 值 | 用途 |
|------|-----|------|
| $font-size-base | 14px | 正文 |
| $font-size-small | 12px | 辅助文字、提示 |
| $font-size-medium | 14px | 表格内容 |
| $font-size-large | 16px | 页面标题、弹窗标题 |

## 间距系统

| 间距 | 值 | 用途 |
|------|-----|------|
| xs | 5px | 紧凑间距（margin / padding 工具类 mt5 mr5 等） |
| sm | 10px | 小间距（mt10 mr10 等） |
| md | 16px | 中间距 |
| lg | 20px | 内容区间距（el-row gutter） |
| xl | 30px | 表单/弹窗内边距 |
