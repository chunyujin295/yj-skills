#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'

const args = process.argv.slice(2)
const projectPath = args[0]
const mode = args.includes('--full') ? 'full' : 'fast'

if (!projectPath) {
  console.error('Usage: node validate-vue.mjs <project_path> [--fast|--full]')
  process.exit(2)
}

const errors = []
const warnings = []

function read(file) {
  return fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : ''
}

function fail(file, message) {
  errors.push(`${path.relative(projectPath, file)}: ${message}`)
}

function warn(file, message) {
  warnings.push(`${path.relative(projectPath, file)}: ${message}`)
}

function count(pattern, text) {
  return [...text.matchAll(pattern)].length
}

function listVuePages(dir) {
  if (!fs.existsSync(dir)) return []
  const result = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      const indexVue = path.join(full, 'index.vue')
      if (fs.existsSync(indexVue)) result.push(indexVue)
      result.push(...listVuePages(full))
    }
  }
  return result
}

function getBlock(source, tag) {
  const match = source.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`))
  return match ? match[1] : ''
}

function exportedNames(source) {
  const names = new Set()
  for (const match of source.matchAll(/export\s+function\s+([A-Za-z_$][\w$]*)\s*\(/g)) {
    names.add(match[1])
  }
  for (const match of source.matchAll(/export\s+const\s+([A-Za-z_$][\w$]*)\s*=/g)) {
    names.add(match[1])
  }
  return names
}

function importedNamesFrom(source, target) {
  const names = new Set()
  const re = new RegExp(`import\\s*\\{([^}]+)\\}\\s*from\\s*['"]${target.replace('.', '\\.')}['"]`, 'g')
  for (const match of source.matchAll(re)) {
    for (const raw of match[1].split(',')) {
      const name = raw.trim().split(/\s+as\s+/)[0].trim()
      if (name) names.add(name)
    }
  }
  return names
}

const srcDir = path.join(projectPath, 'src')
const viewsDir = path.join(srcDir, 'views')
const routerFile = path.join(srcDir, 'router', 'index.js')
const packageFile = path.join(projectPath, 'package.json')

if (!fs.existsSync(packageFile)) fail(packageFile, 'package.json 不存在')
if (!fs.existsSync(routerFile)) fail(routerFile, 'src/router/index.js 不存在')

const routerSource = read(routerFile)
if (routerSource) {
  if (/__SCAFFOLD_ROUTES__|__DEFAULT_ROUTE__|\{\{[A-Z0-9_]+\}\}/.test(routerSource)) {
    fail(routerFile, '路由文件存在未替换占位符')
  }
}

const pages = listVuePages(viewsDir)
if (pages.length === 0) fail(viewsDir, '未找到任何 src/views/**/index.vue 页面')

for (const vueFile of pages) {
  const source = read(vueFile)
  const dir = path.dirname(vueFile)
  const apiFile = path.join(dir, 'api.js')
  const mockFile = path.join(dir, 'mock.js')
  const apiSource = read(apiFile)
  const mockSource = read(mockFile)
  const template = getBlock(source, 'template')
  const script = getBlock(source, 'script')

  if (!source.trim()) {
    fail(vueFile, 'index.vue 为空')
    continue
  }
  if (!template) fail(vueFile, '缺少 <template>')
  if (!script) fail(vueFile, '缺少 <script>')
  if (!/<div\s+class=["']app-container["']/.test(template)) {
    fail(vueFile, '页面根业务容器必须是 .app-container')
  }

  if (/\{\{[A-Z0-9_]+\}\}|__SCAFFOLD_ROUTES__|__DEFAULT_ROUTE__/.test(source)) {
    fail(vueFile, '存在未替换占位符')
  }

  if (/<script\s+setup\b|setup\s*\(|\bref\s*\(|\breactive\s*\(|from\s+['"]vue['"]/.test(source)) {
    fail(vueFile, '禁止 Composition API，必须使用 Vue 2 Options API')
  }
  if (/element-plus|@element-plus/.test(source)) {
    fail(vueFile, '禁止 Element Plus，必须使用 Element UI 2')
  }
  if (!/export\s+default\s*\{/.test(script)) {
    fail(vueFile, '必须使用 export default Options API')
  }
  if (!/data\s*\(\)\s*\{/.test(script)) {
    fail(vueFile, '必须定义 data()')
  }
  if (!/methods\s*:\s*\{/.test(script)) {
    fail(vueFile, '必须定义 methods')
  }

  const rawControls = [
    ['原生 button', /<button\b/],
    ['原生 input', /<input\b/],
    ['原生 select', /<select\b/],
    ['原生 table', /<table\b/]
  ]
  for (const [label, pattern] of rawControls) {
    if (pattern.test(template)) fail(vueFile, `必须使用 Element UI 组件，不能出现${label}`)
  }

  if (!fs.existsSync(apiFile)) fail(apiFile, 'api.js 不存在')
  if (!fs.existsSync(mockFile)) fail(mockFile, 'mock.js 不存在')
  if (apiSource && !/from\s+['"]@\/utils\/request['"]/.test(apiSource)) {
    fail(apiFile, 'api.js 必须使用 @/utils/request')
  }
  if (mockSource && !/export\s+const\s+mockList\s*=/.test(mockSource)) {
    fail(mockFile, 'mock.js 必须导出 export const mockList')
  }

  const apiImports = importedNamesFrom(script, './api')
  const apiExports = exportedNames(apiSource)
  for (const name of apiImports) {
    if (!apiExports.has(name)) fail(apiFile, `index.vue 导入了 ${name}，但 api.js 未导出`)
  }
  if (/mockList/.test(script) && !/export\s+const\s+mockList\s*=/.test(mockSource)) {
    fail(mockFile, 'index.vue 使用 mockList，但 mock.js 未正确导出')
  }

  const isCrud = /<el-table\b/.test(template)
  const isConfig = /配置|<el-tabs\b|class=["']config-form["']/.test(source) && !isCrud
  const isStats = /echarts|chart/i.test(source)

  if (isCrud) {
    if (!/<el-form\b/.test(template)) fail(vueFile, 'CRUD 页必须有 el-form 搜索区')
    if (!/<el-button\b/.test(template)) fail(vueFile, 'CRUD 页必须有 el-button 操作按钮')
    if (!/<pagination\b/.test(template)) fail(vueFile, 'CRUD 页必须使用 <pagination> 组件')
    for (const method of ['getList', 'handleQuery', 'resetQuery']) {
      if (!new RegExp(`${method}\\s*\\(`).test(script)) fail(vueFile, `CRUD 页缺少 ${method} 方法`)
    }
    if (!/mockList/.test(script)) fail(vueFile, 'CRUD 页必须在接口失败时使用 mockList 兜底')
    if (!/catch\s*\(\s*error\s*\)/.test(script)) fail(vueFile, 'getList 必须 catch 错误并兜底')
  }

  if (isConfig) {
    const controls = count(/<el-(input|input-number|select|switch|date-picker)\b/g, template)
    if (controls < 4) fail(vueFile, '配置页至少需要 4 个真实 Element UI 控件')
    if (!/v-model=/.test(template)) fail(vueFile, '配置页控件必须绑定 v-model')
    if (!/handleSave\s*\(/.test(script)) fail(vueFile, '配置页必须有 handleSave')
    if (!/handleReset\s*\(/.test(script)) fail(vueFile, '配置页必须有 handleReset')
  }

  if (isStats) {
    if (!/echarts/.test(source)) fail(vueFile, '统计页必须引入或使用 echarts')
    if (!/mounted\s*\(\)/.test(script)) fail(vueFile, '统计页必须在 mounted 初始化图表')
    if (!/(beforeDestroy|destroyed)\s*\(\)/.test(script) && mode === 'full') {
      warn(vueFile, '统计页建议在 beforeDestroy/destroyed 清理图表或 resize 监听')
    }
  }

  if (mode === 'full') {
    if (count(/<el-button\b/g, template) > 0 && count(/@click=/g, template) === 0) {
      fail(vueFile, '存在按钮但没有任何 @click 绑定')
    }
    if (/<el-dialog\b/.test(template) && !/:visible\.sync=/.test(template)) {
      fail(vueFile, 'el-dialog 必须绑定 :visible.sync')
    }
  }
}

if (errors.length) {
  console.error(`Vue validation failed (${mode}):`)
  for (const error of errors) console.error(`- ${error}`)
  if (warnings.length) {
    console.error('Warnings:')
    for (const warning of warnings) console.error(`- ${warning}`)
  }
  process.exit(1)
}

if (warnings.length) {
  console.warn(`Vue validation passed with warnings (${mode}):`)
  for (const warning of warnings) console.warn(`- ${warning}`)
} else {
  console.log(`Vue validation passed (${mode}): ${pages.length} page(s)`)
}
