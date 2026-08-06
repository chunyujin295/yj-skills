#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'

const projectPath = path.resolve(process.argv[2] || process.cwd())
const outputPath = path.join(projectPath, 'design.md')

function exists(file) {
  return fs.existsSync(file)
}

function read(file) {
  return exists(file) ? fs.readFileSync(file, 'utf8') : ''
}

function walk(dir, predicate, out = []) {
  if (!exists(dir)) return out
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['node_modules', 'dist', 'build', '.git'].includes(entry.name)) continue
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) walk(fullPath, predicate, out)
    else if (!predicate || predicate(fullPath)) out.push(fullPath)
  }
  return out
}

function rel(file) {
  return path.relative(projectPath, file).replaceAll(path.sep, '/')
}

function pkgVersion(pkg, name) {
  return pkg.dependencies?.[name] || pkg.devDependencies?.[name] || '未检测到'
}

function loadPackage() {
  try {
    return JSON.parse(read(path.join(projectPath, 'package.json')) || '{}')
  } catch {
    return {}
  }
}

function detectCodeStyle() {
  const eslintrc = read(path.join(projectPath, '.eslintrc.js'))
  const editorconfig = read(path.join(projectPath, '.editorconfig'))
  const indent = (editorconfig.match(/indent_size\s*=\s*(\d+)/) || eslintrc.match(/['"]indent['"]:\s*\[[^\]]*,\s*(\d+)/) || [])[1] || '未检测到'
  const quotes = /['"]quotes['"]:\s*\[[^\]]*,\s*['"]single['"]/.test(eslintrc) ? '单引号' : (/['"]quotes['"]:\s*\[[^\]]*,\s*['"]double['"]/.test(eslintrc) ? '双引号' : '未检测到')
  const semi = /['"]semi['"]:\s*\[[^\]]*,\s*['"]never['"]/.test(eslintrc) ? '无分号' : (/['"]semi['"]:\s*\[[^\]]*,\s*['"]always['"]/.test(eslintrc) ? '有分号' : '未检测到')
  const nameCase = /vue\/name-property-casing['"]:\s*\[[^\]]*['"]PascalCase['"]/.test(eslintrc) ? 'PascalCase' : '未检测到'
  return { indent, quotes, semi, nameCase }
}

function inferPurpose(name) {
  const lower = name.toLowerCase()
  if (lower.includes('list')) return '列表查询'
  if (lower.includes('get') || lower.includes('detail')) return '详情查询'
  if (lower.includes('add') || lower.includes('create')) return '新增'
  if (lower.includes('update') || lower.includes('edit')) return '修改'
  if (lower.includes('del') || lower.includes('delete') || lower.includes('remove')) return '删除'
  if (lower.includes('export') || lower.includes('download')) return '导出/下载'
  if (lower.includes('parse') || lower.includes('format')) return '格式化/解析'
  if (lower.includes('select') || lower.includes('dict')) return '字典处理'
  if (lower.includes('valid') || lower.includes('check')) return '校验'
  if (lower.includes('tree')) return '树结构处理'
  if (lower.includes('token')) return '登录令牌处理'
  return '项目工具方法'
}

function functionRowsFromSource(source) {
  const rows = []
  const re = /export\s+(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(([^)]*)\)/g
  let match
  while ((match = re.exec(source))) {
    rows.push({
      name: match[1],
      params: match[2].replace(/\s+/g, ' ').trim() || '-',
      purpose: inferPurpose(match[1])
    })
  }
  return rows
}

function extractGlobalMethods() {
  const mainSource = read(path.join(projectPath, 'src/main.js'))
  const rows = []
  const re = /Vue\.prototype\.([A-Za-z_$][\w$]*)\s*=\s*([A-Za-z_$][\w$]*)/g
  let match
  while ((match = re.exec(mainSource))) {
    rows.push({
      method: match[1],
      source: match[2],
      purpose: inferPurpose(match[1]),
      usage: `this.${match[1]}(...)`
    })
  }
  return unique(rows, row => row.method)
}

function extractPlugins() {
  const pluginIndex = read(path.join(projectPath, 'src/plugins/index.js'))
  const pluginDir = path.join(projectPath, 'src/plugins')
  const rows = []
  const re = /Vue\.prototype\.([A-Za-z_$][\w$]*)\s*=\s*([A-Za-z_$][\w$]*)/g
  let match
  while ((match = re.exec(pluginIndex))) {
    const pluginName = match[2]
    const source = read(path.join(pluginDir, `${pluginName}.js`))
    const methods = []
    const methodRe = /^\s{2,}([A-Za-z_$][\w$]*)\s*\(([^)]*)\)\s*\{/gm
    let methodMatch
    while ((methodMatch = methodRe.exec(source))) {
      if (['if', 'for', 'while', 'switch', 'catch', 'function'].includes(methodMatch[1])) continue
      methods.push(`${methodMatch[1]}(${methodMatch[2].replace(/\s+/g, ' ').trim()})`)
    }
    rows.push({
      method: match[1],
      source: `src/plugins/${pluginName}.js`,
      signatures: methods.slice(0, 12).join('; ') || '对象插件',
      usage: `this.${match[1]}.${methods[0]?.replace(/\(.*/, '(...)') || 'method(...)'}`
    })
  }
  return unique(rows, row => row.method)
}

function extractVueComponent(file) {
  const source = read(file)
  const name = (source.match(/name:\s*['"]([^'"]+)['"]/) || [])[1] || path.basename(path.dirname(file))
  const props = extractProps(source)
  const events = [...new Set([...source.matchAll(/\$emit\(['"]([^'"]+)/g)].map(item => item[1]))]
  return { name, file: rel(file), props: props.join(', ') || '-', events: events.join(', ') || '-' }
}

function extractProps(source) {
  const start = source.indexOf('props:')
  if (start === -1) return []
  const open = source.indexOf('{', start)
  if (open === -1) return []
  let depth = 0
  let end = open
  for (; end < source.length; end++) {
    if (source[end] === '{') depth++
    if (source[end] === '}') depth--
    if (depth === 0) break
  }
  const block = source.slice(open + 1, end)
  const props = []
  const re = /\n\s{4}([A-Za-z_$][\w$-]*)\s*:\s*([\s\S]*?)(?=\n\s{4}[A-Za-z_$][\w$-]*\s*:|\n\s*$)/g
  let match
  while ((match = re.exec(block))) {
    const value = match[2].trim()
    const type = (value.match(/type:\s*(\[[^\]]+\]|[^,\n]+)/) || [])[1] || value.split('\n')[0].replace(/,$/, '')
    props.push(`${match[1]}:${type.replace(/\s+/g, ' ').trim()}`)
  }
  return props
}

function extractComponents() {
  const mainSource = read(path.join(projectPath, 'src/main.js'))
  const registered = []
  const re = /Vue\.component\(['"]([^'"]+)['"],\s*([A-Za-z_$][\w$]*)\)/g
  let match
  while ((match = re.exec(mainSource))) registered.push(match[1])
  const files = walk(path.join(projectPath, 'src/components'), file => file.endsWith('.vue'))
  const components = files.map(extractVueComponent)
  const globallyRegistered = components.filter(item => registered.includes(item.name))
  return globallyRegistered.length > 0 ? globallyRegistered : components.slice(0, 20)
}

function extractDirectives() {
  const source = read(path.join(projectPath, 'src/directive/index.js'))
  const rows = []
  const re = /Vue\.directive\(['"]([^'"]+)['"],\s*([A-Za-z_$][\w$]*)\)/g
  let match
  while ((match = re.exec(source))) {
    const name = match[1]
    const usage = name.startsWith('has') ? `v-${name}="['permission:code']"` : `v-${name}`
    rows.push({ name: `v-${name}`, arg: 'binding.value', usage })
  }
  return rows
}

function extractUtilities() {
  const utilFiles = walk(path.join(projectPath, 'src/utils'), file => file.endsWith('.js'))
  const rows = []
  for (const file of utilFiles) {
    for (const item of functionRowsFromSource(read(file))) {
      rows.push({ ...item, file: rel(file) })
    }
  }
  return unique(rows, row => `${row.file}:${row.name}`).slice(0, 80)
}

function extractApiPattern() {
  const files = walk(path.join(projectPath, 'src/api'), file => file.endsWith('.js')).slice(0, 30)
  let source = ''
  for (const file of files) source += `\n${read(file)}`
  const methods = [...new Set([...source.matchAll(/method:\s*['"]([^'"]+)['"]/g)].map(item => item[1]))]
  const hasParams = /params:\s*[A-Za-z_$]/.test(source)
  const hasData = /data:\s*[A-Za-z_$]/.test(source)
  return {
    importRequest: /import\s+request\s+from\s+['"]@\/utils\/request['"]/.test(source),
    methods: methods.join(', ') || '未检测到',
    hasParams,
    hasData
  }
}

function extractPagePattern() {
  const views = walk(path.join(projectPath, 'src/views'), file => file.endsWith('.vue')).slice(0, 80)
  const sampleSources = views.map(file => read(file)).join('\n')
  const roots = [...new Set([...sampleSources.matchAll(/<div\s+class=["']([^"']+)["']/g)].map(item => item[1]))]
  return {
    rootClass: roots.find(item => item.includes('app-container')) || roots[0] || '未检测到',
    search: /<el-form[\s\S]*queryParams|ref=["']queryForm["']/.test(sampleSources),
    toolbar: /class=["']mb8["']|<right-toolbar/i.test(sampleSources),
    table: /<el-table/.test(sampleSources),
    pagination: /<pagination/.test(sampleSources),
    dialog: /<el-dialog/.test(sampleSources),
    structure: sampleSources ? 'template -> script -> style，Options API 中 data / created / methods 组织页面状态和动作' : '未检测到'
  }
}

function unique(rows, getKey) {
  const seen = new Set()
  return rows.filter(row => {
    const key = getKey(row)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function table(headers, rows, emptyCols) {
  const header = `| ${headers.join(' | ')} |\n| ${headers.map(() => '---').join(' | ')} |`
  if (!rows.length) return `${header}\n| 未检测到 | ${Array(emptyCols - 1).fill('-').join(' | ')} |`
  return `${header}\n${rows.join('\n')}`
}

function generate() {
  const pkg = loadPackage()
  const style = detectCodeStyle()
  const globals = extractGlobalMethods()
  const plugins = extractPlugins()
  const components = extractComponents()
  const directives = extractDirectives()
  const utilities = extractUtilities()
  const api = extractApiPattern()
  const page = extractPagePattern()
  const now = new Date().toISOString().slice(0, 10)

  const lines = []
  lines.push('# 前端设计基因')
  lines.push('')
  lines.push(`> Generated: ${now}`)
  lines.push(`> Source: /design init 从存量项目提取，已脱敏。`)
  lines.push('> 用途：复制到新项目根目录后，后续 `/design` 必须优先遵循本文件中的全局方法、组件、插件、指令和代码风格。')
  lines.push('')
  lines.push('## 技术栈')
  lines.push('')
  lines.push(`- 框架：Vue ${pkgVersion(pkg, 'vue')} + Options API`)
  lines.push(`- UI 库：Element UI ${pkgVersion(pkg, 'element-ui')}`)
  lines.push('- 样式：SCSS')
  lines.push(`- 图表：ECharts ${pkgVersion(pkg, 'echarts')}`)
  lines.push(`- 路由：Vue Router ${pkgVersion(pkg, 'vue-router')}`)
  lines.push(`- 状态管理：Vuex ${pkgVersion(pkg, 'vuex')}`)
  lines.push('')
  lines.push('## 全局方法（Vue.prototype）')
  lines.push('')
  lines.push(table(['方法', '来源', '用途', '用法'], globals.map(row => `| \`${row.method}\` | \`${row.source}\` | ${row.purpose} | \`${row.usage}\` |`), 4))
  lines.push('')
  lines.push('## 插件方法')
  lines.push('')
  lines.push(table(['插件', '来源', '方法签名', '用法'], plugins.map(row => `| \`${row.method}\` | \`${row.source}\` | \`${row.signatures}\` | \`${row.usage}\` |`), 4))
  lines.push('')
  lines.push('## 工具函数')
  lines.push('')
  lines.push(table(['函数', '参数', '用途', '来源'], utilities.map(row => `| \`${row.name}\` | \`${row.params}\` | ${row.purpose} | \`${row.file}\` |`), 4))
  lines.push('')
  lines.push('## 全局组件（无需 import）')
  lines.push('')
  lines.push(table(['组件', 'Props', 'Events', '用法'], components.map(row => `| \`${row.name}\` | \`${row.props}\` | \`${row.events}\` | \`<${kebab(row.name)} />\` |`), 4))
  lines.push('')
  lines.push('## 自定义指令')
  lines.push('')
  lines.push(table(['指令', '参数', '用法'], directives.map(row => `| \`${row.name}\` | \`${row.arg}\` | \`${row.usage}\` |`), 3))
  lines.push('')
  lines.push('## 代码风格')
  lines.push('')
  lines.push('| 规则 | 值 |')
  lines.push('| --- | --- |')
  lines.push(`| 缩进 | ${style.indent === '未检测到' ? style.indent : `${style.indent} 空格`} |`)
  lines.push(`| 引号 | ${style.quotes} |`)
  lines.push(`| 分号 | ${style.semi} |`)
  lines.push('| 相等 | 全等（`===`），允许 `null` 特例时以 ESLint 为准 |')
  lines.push(`| 组件 name | ${style.nameCase} |`)
  lines.push('| Vue 写法 | Options API，避免 Composition API |')
  lines.push('| 样式块 | 优先 `<style lang="scss" scoped>`，深度选择器按存量项目使用 `::v-deep` |')
  lines.push('')
  lines.push('## API 模式')
  lines.push('')
  lines.push(`- 请求封装：${api.importRequest ? '`@/utils/request`' : '未检测到统一 request 封装'}`)
  lines.push(`- 方法类型：${api.methods}`)
  lines.push(`- 查询参数：${api.hasParams ? '`params`' : '未检测到'}`)
  lines.push(`- 请求体：${api.hasData ? '`data`' : '未检测到'}`)
  lines.push('- 接口文件导出具名函数；本文件不记录任何真实接口路径。')
  lines.push('')
  lines.push('```javascript')
  lines.push("import request from '@/utils/request'")
  lines.push('')
  lines.push('export function listExample(query) {')
  lines.push('  return request({')
  lines.push("    url: '<由接口文档提供>',")
  lines.push("    method: 'get',")
  lines.push('    params: query')
  lines.push('  })')
  lines.push('}')
  lines.push('```')
  lines.push('')
  lines.push('## 页面模式')
  lines.push('')
  lines.push(`- 根类名：${page.rootClass === '未检测到' ? page.rootClass : `\`${page.rootClass}\``}`)
  lines.push(`- 搜索栏：${page.search ? '`el-form` + `queryParams` + `showSearch`' : '未检测到'}`)
  lines.push(`- 操作栏：${page.toolbar ? '`el-row.mb8`，右侧工具可用 `<right-toolbar>`' : '未检测到'}`)
  lines.push(`- 表格：${page.table ? '`el-table` + `v-loading` + `el-table-column`' : '未检测到'}`)
  lines.push(`- 分页：${page.pagination ? '全局 `<pagination>`，使用 `page.sync` / `limit.sync` / `@pagination`' : '未检测到'}`)
  lines.push(`- 弹窗：${page.dialog ? '`el-dialog` + `el-form` + footer `dialog-footer`' : '未检测到'}`)
  lines.push(`- 组织顺序：${page.structure}`)
  lines.push('')
  lines.push('## 脱敏约束')
  lines.push('')
  lines.push('- 本文件只记录可复用前端约定，不记录路由、模块名、菜单、真实接口路径或业务字段。')
  lines.push('- 新项目使用时，如本文件与新项目真实代码冲突，以新项目已存在代码为准，并重新执行 `/design init` 更新。')

  fs.writeFileSync(outputPath, `${lines.join('\n')}\n`)
  console.log(`design.md generated: ${outputPath}`)
  console.log(`global methods: ${globals.length}, plugins: ${plugins.length}, utilities: ${utilities.length}, components: ${components.length}, directives: ${directives.length}`)
}

function kebab(name) {
  return name
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/_/g, '-')
    .toLowerCase()
}

generate()
