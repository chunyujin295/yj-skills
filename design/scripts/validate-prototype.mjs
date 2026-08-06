#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'

const targetDir = process.argv[2]

if (!targetDir) {
  console.error('Usage: node validate-prototype.mjs <docs/design-prototype>')
  process.exit(2)
}

const errors = []

function read(file) {
  return fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : ''
}

function fail(file, message) {
  errors.push(`${path.basename(file)}: ${message}`)
}

function count(pattern, text) {
  return [...text.matchAll(pattern)].length
}

const indexFile = path.join(targetDir, 'index.html')
const styleFile = path.join(targetDir, 'style.css')
const indexHtml = read(indexFile)
const styleCss = read(styleFile)

if (!indexHtml) fail(indexFile, 'index.html 不存在或为空')
if (!styleCss) fail(styleFile, 'style.css 不存在或为空')

if (indexHtml) {
  if (!/<iframe\b[^>]*class=["'][^"']*content-frame/.test(indexHtml)) {
    fail(indexFile, '主布局必须包含 iframe.content-frame')
  }
  if (!/menuPages\s*:/.test(indexHtml)) {
    fail(indexFile, '主布局必须包含 menuPages 映射')
  }
  if (count(/<div\s+id=["']app["']/g, indexHtml) !== 1) {
    fail(indexFile, '主布局只能有一个 #app')
  }
  if (/<table\b|<form\b|<button\b|<input\b|<select\b/.test(indexHtml)) {
    fail(indexFile, '主布局不能包含业务表单、表格或原生控件')
  }
}

if (styleCss) {
  if (!/\.sidebar\s*\{[\s\S]*?width\s*:\s*200px/.test(styleCss)) {
    fail(styleFile, '必须保留 .sidebar { width: 200px; }')
  }
  if (!/\.main-content\s*\{[\s\S]*?flex\s*:\s*1/.test(styleCss)) {
    fail(styleFile, '必须保留 .main-content { flex: 1; }')
  }
  if (!/\.main-content\s*\{[\s\S]*?min-width\s*:\s*0/.test(styleCss)) {
    fail(styleFile, '必须保留 .main-content { min-width: 0; }')
  }
}

const htmlFiles = fs.existsSync(targetDir)
  ? fs.readdirSync(targetDir).filter((name) => name.endsWith('.html') && name !== 'index.html')
  : []

for (const name of htmlFiles) {
  const file = path.join(targetDir, name)
  const html = read(file)
  if (!html.trim()) {
    fail(file, '子页面为空')
    continue
  }

  if (!/element-ui@2\.15\.8/.test(html)) {
    fail(file, '子页面必须引入 Element UI 2.15.8')
  }
  if (!/vue@2\.6/.test(html)) {
    fail(file, '子页面必须引入 Vue 2.6')
  }
  if (!/<div\s+class=["']app-container["']/.test(html)) {
    fail(file, '子页面 #app 内必须包含 .app-container')
  }

  const forbiddenLayout = [
    ['.navbar', /class=["'][^"']*\bnavbar\b/],
    ['.sidebar', /class=["'][^"']*\bsidebar\b/],
    ['.layout-body', /class=["'][^"']*\blayout-body\b/],
    ['.main-content', /class=["'][^"']*\bmain-content\b/],
    ['.content-frame', /class=["'][^"']*\bcontent-frame\b/],
    ['el-menu', /<el-menu\b/],
    ['el-menu-item', /<el-menu-item\b/],
    ['iframe', /<iframe\b/]
  ]

  for (const [label, pattern] of forbiddenLayout) {
    if (pattern.test(html)) fail(file, `子页面不能包含后台布局元素 ${label}`)
  }

  const rawControls = [
    ['原生 button', /<button\b/],
    ['原生 input', /<input\b/],
    ['原生 select', /<select\b/],
    ['原生 table', /<table\b/]
  ]

  for (const [label, pattern] of rawControls) {
    if (pattern.test(html)) fail(file, `业务页面必须使用 Element UI 组件，不能出现${label}`)
  }

  const isCrudLike = /查询|重置|导出|新增|详情|删除|编辑/.test(html)
  if (isCrudLike) {
    if (!/<el-form\b/.test(html)) fail(file, 'CRUD/查询页必须使用 el-form 搜索区')
    if (!/<el-table\b/.test(html)) fail(file, 'CRUD/查询页必须使用 el-table 表格')
    if (!/<el-button\b/.test(html)) fail(file, 'CRUD/查询页必须使用 el-button 按钮')
  }

  const isConfigLike = /配置/.test(html)
  if (isConfigLike) {
    const controls = count(/<el-(input|input-number|select|switch|date-picker)\b/g, html)
    if (controls < 4) fail(file, '配置页至少需要 4 个真实 Element UI 配置控件')
    if (!/v-model=/.test(html)) fail(file, '配置页控件必须绑定 v-model')
    if (/保存[^<]{0,8}配置[\s\S]*保存[^<]{0,8}配置[\s\S]*保存[^<]{0,8}配置/.test(html) && controls < 4) {
      fail(file, '配置页不能只有多个保存按钮和标题')
    }
  }

  if (/\{\{[A-Z0-9_]+\}\}|__SCAFFOLD_ROUTES__|__DEFAULT_ROUTE__/.test(html)) {
    fail(file, '存在未替换占位符')
  }
}

if (htmlFiles.length === 0) {
  fail(targetDir, '没有生成任何子页面 HTML')
}

if (errors.length) {
  console.error('HTML prototype validation failed:')
  for (const error of errors) console.error(`- ${error}`)
  process.exit(1)
}

console.log(`HTML prototype validation passed: ${htmlFiles.length} child page(s)`)
