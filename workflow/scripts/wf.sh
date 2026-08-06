#!/bin/bash
# wf.sh — Workflow 状态管理 CLI
#
# 自包含的通用开发工作流状态管理脚本。
# 对标 comet 的 comet-state.sh + comet-guard.sh + comet-archive.sh + comet-env.sh，
# 合为一个文件，通过子命令分发。
#
# Usage:
#   wf.sh <subcommand> [args...]
#
# Subcommands:
#   state init <name> <workflow>           — 初始化 .workflow.yaml
#   state get <name> <field>               — 读取字段
#   state set <name> <field> <value>       — 写入字段
#   state check <name> <phase>             — 验证阶段入口条件
#   state check <name> <phase> --recover   — 输出恢复上下文
#   state transition <name> <event>        — 状态转换（带校验）
#   state scale <name>                     — 评估改动规模
#   state list                             — 列出所有活跃 change
#   guard <name> <phase>                   — 验证退出条件
#   guard <name> <phase> --apply           — 验证 + 自动流转
#   archive <name>                         — 执行归档
#   archive <name> --dry-run               — 预览归档
#   env                                    — 输出环境信息
#
# Workflows: full, hotfix, tweak
# Phases: open, design, build, verify, archive

set -euo pipefail

# ─── Bash 解析（从 comet-env.sh 移植） ─────────────────────

_resolve_bash() {
  local candidate

  # 已有 COMET_BASH 或 WF_BASH 环境变量
  if [ -n "${WF_BASH:-}" ]; then
    printf '%s\n' "$WF_BASH"
    return 0
  fi

  # 当前 $BASH
  if [ -n "${BASH:-}" ]; then
    case "$BASH" in
      */Windows/System32/bash.exe|*/windows/system32/bash.exe) ;;
      *) printf '%s\n' "$BASH"; return 0 ;;
    esac
  fi

  # 从 sh 路径推导
  candidate="$(command -v sh 2>/dev/null | awk '{ sub(/\/sh(\.exe)?$/, "/bash.exe"); print }')"
  if [ -n "$candidate" ] && "$candidate" -lc 'printf ok' >/dev/null 2>&1; then
    printf '%s\n' "$candidate"
    return 0
  fi

  # command -v bash
  candidate="$(command -v bash 2>/dev/null || true)"
  if [ -n "$candidate" ]; then
    case "$candidate" in
      */Windows/System32/bash.exe|*/windows/system32/bash.exe) ;;
      *) printf '%s\n' "$candidate"; return 0 ;;
    esac
  fi

  return 1
}

if ! WF_BASH="$(_resolve_bash)"; then
  echo "ERROR: usable bash not found. Install Git Bash or set WF_BASH." >&2
  exit 1
fi
export WF_BASH

# ─── 脚本位置 ──────────────────────────────────────────────

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" && pwd -P)"
PROJECT_ROOT=""  # 在首次需要时初始化

_find_project_root() {
  if [ -n "$PROJECT_ROOT" ]; then
    printf '%s\n' "$PROJECT_ROOT"
    return
  fi
  # 从当前目录向上查找 .git
  local dir="$PWD"
  while [ "$dir" != "/" ]; do
    if [ -d "$dir/.git" ]; then
      PROJECT_ROOT="$dir"
      printf '%s\n' "$PROJECT_ROOT"
      return
    fi
    dir="$(dirname "$dir")"
  done
  PROJECT_ROOT="$PWD"
  printf '%s\n' "$PROJECT_ROOT"
}

CHANGES_DIR=""  # 延迟初始化

_get_changes_dir() {
  if [ -n "$CHANGES_DIR" ]; then
    printf '%s\n' "$CHANGES_DIR"
    return
  fi
  CHANGES_DIR="$(_find_project_root)/workflow/changes"
  printf '%s\n' "$CHANGES_DIR"
}

# ─── 颜色 ──────────────────────────────────────────────────

red()   { printf '\033[31m%s\033[0m\n' "$1" >&2; }
green() { printf '\033[32m%s\033[0m\n' "$1" >&2; }
yellow(){ printf '\033[33m%s\033[0m\n' "$1" >&2; }

# ─── 输入验证 ──────────────────────────────────────────────

validate_change_name() {
  local name="$1"
  if [[ ! "$name" =~ ^[a-z0-9][a-z0-9-]*[a-z0-9]$ ]] && [[ ! "$name" =~ ^[a-z0-9]$ ]]; then
    red "ERROR: Invalid change name '$name'. Use kebab-case (lowercase, hyphens, start/end with alphanumeric)."
    return 1
  fi
}

validate_workflow() {
  local wf="$1"
  case "$wf" in
    full|hotfix|tweak) ;;
    *) red "ERROR: Invalid workflow '$wf'. Must be: full, hotfix, tweak"; return 1 ;;
  esac
}

validate_phase() {
  local phase="$1"
  case "$phase" in
    open|design|build|verify|archive) ;;
    *) red "ERROR: Invalid phase '$phase'. Must be: open, design, build, verify, archive"; return 1 ;;
  esac
}

validate_event() {
  local event="$1"
  case "$event" in
    open-complete|design-complete|build-complete|verify-pass|verify-fail|archived) ;;
    *) red "ERROR: Invalid event '$event'. Must be: open-complete, design-complete, build-complete, verify-pass, verify-fail, archived"; return 1 ;;
  esac
}

# ─── YAML 操作 ─────────────────────────────────────────────
# 简单的 key: value 格式，不支持嵌套。
# 行内注释（# ...）会被剥离。

_yaml_get() {
  local file="$1" key="$2"
  if [ ! -f "$file" ]; then
    return 1
  fi
  local line
  line="^${key}:[[:space:]]*"
  grep "$line" "$file" 2>/dev/null | head -1 | sed "s/^${key}:[[:space:]]*//" | sed 's/ [[:space:]]*#.*//' | sed 's/[[:space:]]*$//' | sed 's/^["'"'"']//' | sed 's/["'"'"']$//'
}

_yaml_set() {
  local file="$1" key="$2" value="$3"
  if [ ! -f "$file" ]; then
    red "ERROR: YAML file not found: $file"
    return 1
  fi
  # 使用 awk 做替换，避免 sed 对特殊字符（|、\）的注入
  local tmpfile="${file}.tmp.$$"
  awk -v key="$key" -v val="$value" '
    $0 ~ "^"key":" { print key ": " val; next }
    { print }
  ' "$file" > "$tmpfile"
  # 如果 key 不存在，追加
  if ! grep -q "^${key}:" "$file" 2>/dev/null; then
    echo "${key}: ${value}" >> "$tmpfile"
  fi
  mv "$tmpfile" "$file"
}

# ─── 辅助函数 ──────────────────────────────────────────────

_change_dir() {
  local name="$1"
  printf '%s/%s' "$(_get_changes_dir)" "$name"
}

_yaml_file() {
  local name="$1"
  printf '%s/%s/.workflow.yaml' "$(_get_changes_dir)" "$name"
}
_require_change() {
  local name="$1"
  validate_change_name "$name"
  local yaml_file
  yaml_file="$(_yaml_file "$name")"
  if [ ! -f "$yaml_file" ]; then
    red "ERROR: Change '$name' not found (no .workflow.yaml)"
    exit 1
  fi
}

_file_nonempty() {
  [ -f "$1" ] && [ -s "$1" ]
}

_tasks_all_done() {
  local tasks_file="$1"
  if [ ! -f "$tasks_file" ]; then
    return 1
  fi
  # 检查是否还有未勾选的任务
  if grep -q '^\- \[ \]' "$tasks_file" 2>/dev/null; then
    return 1
  fi
  # 至少有一个已勾选的任务
  grep -q '^\- \[x\]' "$tasks_file" 2>/dev/null
}

_tasks_count() {
  local tasks_file="$1"
  if [ ! -f "$tasks_file" ]; then
    echo "0"
    return
  fi
  local count
  count="$(grep -c '^\- \[' "$tasks_file" 2>/dev/null)" || true
  echo "${count:-0}"
}

_tasks_done_count() {
  local tasks_file="$1"
  if [ ! -f "$tasks_file" ]; then
    echo "0"
    return
  fi
  local count
  count="$(grep -c '^\- \[x\]' "$tasks_file" 2>/dev/null)" || true
  echo "${count:-0}"
}

# ─── state init ────────────────────────────────────────────

cmd_state_init() {
  local name="${1:-}"
  local workflow="${2:-}"

  if [ -z "$name" ] || [ -z "$workflow" ]; then
    red "Usage: wf.sh state init <name> <workflow>"
    exit 1
  fi

  validate_change_name "$name"
  validate_workflow "$workflow"

  local changes_dir
  changes_dir="$(_get_changes_dir)"
  local change_dir="$changes_dir/$name"
  local yaml_file="$change_dir/.workflow.yaml"

  if [ -d "$change_dir" ]; then
    yellow "WARNING: Change directory already exists: $change_dir"
    yellow "Continuing with existing directory."
  fi

  mkdir -p "$change_dir"

  # 创建 .gitignore（所有产物不进 git，它们是工具管理的运行时数据）
  local gitignore="$changes_dir/.gitignore"
  if [ ! -f "$gitignore" ]; then
    cat > "$gitignore" <<'EOF'
# Workflow 运行时数据，不进 git
*
!.gitignore
EOF
  fi

  # 写入 .workflow.yaml
  local today
  today="$(date +%Y-%m-%d)"
  cat > "$yaml_file" <<EOF
workflow: ${workflow}
phase: open
design_doc: null
plan: null
base_ref: null
build_mode: null
build_pause: null
isolation: null
direct_override: false
verify_mode: null
verify_result: pending
verification_report: null
branch_status: pending
created_at: ${today}
verified_at: null
archived: false
EOF

  green "Initialized change '$name' with workflow '$workflow'"
  printf '  Directory: %s\n' "$change_dir"
  printf '  State:     %s\n' "$yaml_file"
}

# ─── state get ─────────────────────────────────────────────

cmd_state_get() {
  local name="${1:-}"
  local field="${2:-}"

  if [ -z "$name" ] || [ -z "$field" ]; then
    red "Usage: wf.sh state get <name> <field>"
    exit 1
  fi

  _require_change "$name"
  local yaml_file
  yaml_file="$(_yaml_file "$name")"

  local value
  value="$(_yaml_get "$yaml_file" "$field")"
  if [ -z "$value" ]; then
    echo "null"
  else
    echo "$value"
  fi
}

# ─── state set ─────────────────────────────────────────────

cmd_state_set() {
  local name="${1:-}"
  local field="${2:-}"
  local value="${3:-}"

  if [ -z "$name" ] || [ -z "$field" ] || [ -z "$value" ]; then
    red "Usage: wf.sh state set <name> <field> <value>"
    exit 1
  fi

  _require_change "$name"
  local yaml_file
  yaml_file="$(_yaml_file "$name")"

  _yaml_set "$yaml_file" "$field" "$value"
}

# ─── state check ───────────────────────────────────────────

_check_pass() { green "  ✓ $1"; }
_check_fail() { red   "  ✗ $1"; CHECK_BLOCK=1; }

cmd_state_check() {
  local name="${1:-}"
  local phase="${2:-}"
  local recover=0

  if [ -z "$name" ] || [ -z "$phase" ]; then
    red "Usage: wf.sh state check <name> <phase> [--recover]"
    exit 1
  fi

  # 检查 --recover 标志
  shift 2
  while [ $# -gt 0 ]; do
    case "$1" in
      --recover) recover=1 ;;
    esac
    shift
  done

  validate_phase "$phase"

  _require_change "$name"
  local yaml_file
  yaml_file="$(_yaml_file "$name")"

  if [ "$recover" -eq 1 ]; then
    cmd_recover "$name" "$phase"
    return
  fi

  local change_dir
  change_dir="$(_change_dir "$name")"
  CHECK_BLOCK=0

  printf 'Checking entry for phase: %s (change: %s)\n' "$phase" "$name"

  case "$phase" in
    open)
      _check_pass "open — no entry requirements"
      ;;
    design)
      if _file_nonempty "$change_dir/proposal.md"; then
        _check_pass "proposal.md exists and is non-empty"
      else
        _check_fail "proposal.md missing or empty"
      fi
      ;;
    build)
      if _file_nonempty "$change_dir/design.md"; then
        _check_pass "design.md exists and is non-empty"
      else
        _check_fail "design.md missing or empty"
      fi
      if _file_nonempty "$change_dir/tasks.md"; then
        _check_pass "tasks.md exists and is non-empty"
      else
        _check_fail "tasks.md missing or empty"
      fi
      ;;
    verify)
      local tasks_file="$change_dir/tasks.md"
      if _tasks_all_done "$tasks_file"; then
        _check_pass "all tasks completed"
      else
        local total done
        total="$(_tasks_count "$tasks_file")"
        done="$(_tasks_done_count "$tasks_file")"
        _check_fail "tasks not all done ($done/$total)"
      fi
      ;;
    archive)
      local verify_result
      verify_result="$(_yaml_get "$yaml_file" "verify_result")"
      if [ "$verify_result" = "pass" ]; then
        _check_pass "verify_result: pass"
      else
        _check_fail "verify_result is '$verify_result', expected 'pass'"
      fi
      ;;
  esac

  if [ "$CHECK_BLOCK" -ne 0 ]; then
    red "Entry check FAILED for phase '$phase'"
    return 1
  fi
  green "Entry check PASSED for phase '$phase'"
}

# ─── state check --recover ─────────────────────────────────

cmd_recover() {
  local name="$1"
  local phase="$2"
  local yaml_file
  yaml_file="$(_yaml_file "$name")"
  local change_dir
  change_dir="$(_change_dir "$name")"
  local tasks_file="$change_dir/tasks.md"

  printf 'Phase: %s\n' "$phase"
  printf 'Workflow: %s\n' "$(_yaml_get "$yaml_file" "workflow")"

  case "$phase" in
    build)
      printf 'Isolation: %s\n' "$(_yaml_get "$yaml_file" "isolation")"
      printf 'Build mode: %s\n' "$(_yaml_get "$yaml_file" "build_mode")"
      printf 'Plan: %s\n' "$(_yaml_get "$yaml_file" "plan")"
      printf 'Base ref: %s\n' "$(_yaml_get "$yaml_file" "base_ref")"
      local total done
      total="$(_tasks_count "$tasks_file")"
      done="$(_tasks_done_count "$tasks_file")"
      printf 'Tasks: %s/%s complete\n' "$done" "$total"
      # 找到下一个未完成任务
      local next_task
      next_task="$(grep '^\- \[ \]' "$tasks_file" 2>/dev/null | head -1 | sed 's/^- \[ \] //')"
      if [ -n "$next_task" ]; then
        printf 'Next task: %s\n' "$next_task"
      else
        printf 'Next task: (all done)\n'
      fi
      printf 'Build pause: %s\n' "$(_yaml_get "$yaml_file" "build_pause")"
      printf 'Recovery action: Continue from next incomplete task\n'
      ;;
    verify)
      printf 'Verify mode: %s\n' "$(_yaml_get "$yaml_file" "verify_mode")"
      printf 'Verify result: %s\n' "$(_yaml_get "$yaml_file" "verify_result")"
      printf 'Branch status: %s\n' "$(_yaml_get "$yaml_file" "branch_status")"
      printf 'Recovery action: Re-run verification\n'
      ;;
    *)
      printf 'Recovery action: Continue from start of phase %s\n' "$phase"
      ;;
  esac
}

# ─── state transition ──────────────────────────────────────

cmd_state_transition() {
  local name="${1:-}"
  local event="${2:-}"

  if [ -z "$name" ] || [ -z "$event" ]; then
    red "Usage: wf.sh state transition <name> <event>"
    exit 1
  fi

  validate_event "$event"

  local yaml_file
  yaml_file="$(_yaml_file "$name")"
  if [ ! -f "$yaml_file" ]; then
    red "ERROR: Change '$name' not found"
    exit 1
  fi

  local current_phase
  current_phase="$(_yaml_get "$yaml_file" "phase")"

  case "$event" in
    open-complete)
      if [ "$current_phase" != "open" ]; then
        red "ERROR: Cannot transition from '$current_phase' via open-complete (expected: open)"
        return 1
      fi
      _yaml_set "$yaml_file" "phase" "design"
      green "Transitioned: open → design"
      ;;
    design-complete)
      if [ "$current_phase" != "design" ]; then
        red "ERROR: Cannot transition from '$current_phase' via design-complete (expected: design)"
        return 1
      fi
      _yaml_set "$yaml_file" "phase" "build"
      green "Transitioned: design → build"
      ;;
    build-complete)
      if [ "$current_phase" != "build" ]; then
        red "ERROR: Cannot transition from '$current_phase' via build-complete (expected: build)"
        return 1
      fi
      # 硬约束：isolation 和 build_mode 必须已设置
      local isolation build_mode
      isolation="$(_yaml_get "$yaml_file" "isolation")"
      build_mode="$(_yaml_get "$yaml_file" "build_mode")"
      if [ "$isolation" = "null" ] || [ -z "$isolation" ]; then
        red "ERROR: isolation must be set before build → verify transition"
        return 1
      fi
      if [ "$build_mode" = "null" ] || [ -z "$build_mode" ]; then
        red "ERROR: build_mode must be set before build → verify transition"
        return 1
      fi
      # direct 模式检查
      if [ "$build_mode" = "direct" ]; then
        local workflow direct_override
        workflow="$(_yaml_get "$yaml_file" "workflow")"
        direct_override="$(_yaml_get "$yaml_file" "direct_override")"
        if [ "$workflow" = "full" ] && [ "$direct_override" != "true" ]; then
          red "ERROR: full workflow with build_mode=direct requires direct_override: true"
          return 1
        fi
      fi
      _yaml_set "$yaml_file" "phase" "verify"
      _yaml_set "$yaml_file" "verify_result" "pending"
      green "Transitioned: build → verify"
      ;;
    verify-pass)
      if [ "$current_phase" != "verify" ]; then
        red "ERROR: Cannot transition from '$current_phase' via verify-pass (expected: verify)"
        return 1
      fi
      local today
      today="$(date +%Y-%m-%d)"
      _yaml_set "$yaml_file" "phase" "archive"
      _yaml_set "$yaml_file" "verify_result" "pass"
      _yaml_set "$yaml_file" "verified_at" "$today"
      green "Transitioned: verify → archive (verify_result: pass)"
      ;;
    verify-fail)
      if [ "$current_phase" != "verify" ]; then
        red "ERROR: Cannot transition from '$current_phase' via verify-fail (expected: verify)"
        return 1
      fi
      _yaml_set "$yaml_file" "phase" "build"
      _yaml_set "$yaml_file" "verify_result" "fail"
      green "Transitioned: verify → build (verify_result: fail)"
      ;;
    archived)
      _yaml_set "$yaml_file" "archived" "true"
      green "Marked as archived"
      ;;
  esac
}

# ─── state scale ───────────────────────────────────────────

cmd_state_scale() {
  local name="${1:-}"

  if [ -z "$name" ]; then
    red "Usage: wf.sh state scale <name>"
    exit 1
  fi

  local yaml_file change_dir tasks_file
  yaml_file="$(_yaml_file "$name")"
  change_dir="$(_change_dir "$name")"
  tasks_file="$change_dir/tasks.md"

  if [ ! -f "$yaml_file" ]; then
    red "ERROR: Change '$name' not found"
    exit 1
  fi

  local task_count file_count
  task_count="$(_tasks_count "$tasks_file")"

  # 统计 git diff 文件数
  local base_ref
  base_ref="$(_yaml_get "$yaml_file" "base_ref")"
  if [ -n "$base_ref" ] && [ "$base_ref" != "null" ]; then
    file_count="$(git diff --stat "$base_ref"...HEAD 2>/dev/null | tail -1 | grep -oE '^[0-9]+ file' | grep -oE '^[0-9]+' || echo "0")"
  else
    file_count="$(git diff --stat 2>/dev/null | tail -1 | grep -oE '^[0-9]+ file' | grep -oE '^[0-9]+' || echo "0")"
  fi

  printf 'Tasks: %s\n' "$task_count"
  printf 'Files changed: %s\n' "$file_count"

  local verify_mode
  if [ "$task_count" -le 3 ] && [ "$file_count" -le 4 ]; then
    verify_mode="light"
  else
    verify_mode="full"
  fi

  _yaml_set "$yaml_file" "verify_mode" "$verify_mode"
  printf 'Verify mode: %s\n' "$verify_mode"
}

# ─── state list ────────────────────────────────────────────

cmd_state_list() {
  local changes_dir
  changes_dir="$(_get_changes_dir)"

  if [ ! -d "$changes_dir" ]; then
    echo "No active changes."
    return
  fi

  local count=0
  for dir in "$changes_dir"/*/; do
    [ -d "$dir" ] || continue
    local yaml="$dir/.workflow.yaml"
    if [ ! -f "$yaml" ]; then
      continue
    fi
    local archived
    archived="$(_yaml_get "$yaml" "archived")"
    if [ "$archived" = "true" ]; then
      continue
    fi
    local name phase workflow
    name="$(basename "$dir")"
    phase="$(_yaml_get "$yaml" "phase")"
    workflow="$(_yaml_get "$yaml" "workflow")"
    printf '  %s (%s) — phase: %s\n' "$name" "$workflow" "$phase"
    count=$((count + 1))
  done

  if [ "$count" -eq 0 ]; then
    echo "No active changes."
  fi
}

# ─── guard ─────────────────────────────────────────────────

GUARD_BLOCK=0

_guard_pass() { green "  ✓ $1"; }
_guard_fail() { red   "  ✗ $1"; GUARD_BLOCK=1; }

_guard_nonempty() {
  local file="$1" label="$2"
  if _file_nonempty "$file"; then
    _guard_pass "$label exists and is non-empty"
  else
    _guard_fail "$label missing or empty"
  fi
}

cmd_guard() {
  local name="${1:-}"
  local phase="${2:-}"
  local apply=0

  if [ -z "$name" ] || [ -z "$phase" ]; then
    red "Usage: wf.sh guard <name> <phase> [--apply]"
    exit 1
  fi

  shift 2
  while [ $# -gt 0 ]; do
    case "$1" in
      --apply) apply=1 ;;
    esac
    shift
  done

  validate_phase "$phase"

  _require_change "$name"
  local yaml_file change_dir
  yaml_file="$(_yaml_file "$name")"
  change_dir="$(_change_dir "$name")"

  GUARD_BLOCK=0
  printf 'Guard check for phase: %s (change: %s)\n' "$phase" "$name"

  case "$phase" in
    open)
      _guard_nonempty "$change_dir/proposal.md" "proposal.md"
      _guard_nonempty "$change_dir/design.md" "design.md"
      _guard_nonempty "$change_dir/tasks.md" "tasks.md"
      ;;
    design)
      local design_doc
      design_doc="$(_yaml_get "$yaml_file" "design_doc")"
      if [ -n "$design_doc" ] && [ "$design_doc" != "null" ]; then
        _guard_pass "design_doc is set: $design_doc"
      else
        _guard_fail "design_doc not set in .workflow.yaml"
      fi
      ;;
    build)
      # 运行 build_command（如果配置了）
      local build_cmd
      build_cmd="$(_read_config "$name" "build_command")"
      if [ -n "$build_cmd" ]; then
        printf 'Running build_command: %s\n' "$build_cmd"
        if ! eval "$build_cmd"; then
          _guard_fail "build_command failed: $build_cmd"
        else
          _guard_pass "build_command passed"
        fi
      fi
      local tasks_file="$change_dir/tasks.md"
      if _tasks_all_done "$tasks_file"; then
        _guard_pass "all tasks completed"
      else
        local total done
        total="$(_tasks_count "$tasks_file")"
        done="$(_tasks_done_count "$tasks_file")"
        _guard_fail "tasks not all done ($done/$total)"
      fi
      local isolation
      isolation="$(_yaml_get "$yaml_file" "isolation")"
      if [ "$isolation" = "branch" ] || [ "$isolation" = "worktree" ]; then
        _guard_pass "isolation: $isolation"
      else
        _guard_fail "isolation not set (got: $isolation)"
      fi
      local build_mode
      build_mode="$(_yaml_get "$yaml_file" "build_mode")"
      case "$build_mode" in
        subagent|sequential|direct)
          _guard_pass "build_mode: $build_mode"
          ;;
        *)
          _guard_fail "build_mode not set (got: $build_mode)"
          ;;
      esac
      ;;
    verify)
      # 运行 verify_command（如果配置了）
      local verify_cmd
      verify_cmd="$(_read_config "$name" "verify_command")"
      if [ -z "$verify_cmd" ]; then
        # verify_command 未配置时回退到 build_command
        verify_cmd="$(_read_config "$name" "build_command")"
      fi
      if [ -n "$verify_cmd" ]; then
        printf 'Running verify_command: %s\n' "$verify_cmd"
        if ! eval "$verify_cmd"; then
          _guard_fail "verify_command failed: $verify_cmd"
        else
          _guard_pass "verify_command passed"
        fi
      fi
      local verification_report
      verification_report="$(_yaml_get "$yaml_file" "verification_report")"
      if [ -n "$verification_report" ] && [ "$verification_report" != "null" ] && [ -f "$verification_report" ]; then
        _guard_pass "verification_report: $verification_report"
      else
        _guard_fail "verification_report not set or file missing"
      fi
      local branch_status
      branch_status="$(_yaml_get "$yaml_file" "branch_status")"
      if [ "$branch_status" = "handled" ]; then
        _guard_pass "branch_status: handled"
      else
        _guard_fail "branch_status is '$branch_status', expected 'handled'"
      fi
      ;;
    archive)
      local archived
      archived="$(_yaml_get "$yaml_file" "archived")"
      if [ "$archived" = "true" ]; then
        _guard_pass "archived: true"
      else
        _guard_fail "archived is not true"
      fi
      ;;
  esac

  if [ "$GUARD_BLOCK" -ne 0 ]; then
    red "Guard FAILED for phase '$phase'"
    return 1
  fi

  green "Guard PASSED for phase '$phase'"

  # --apply: 自动流转
  if [ "$apply" -eq 1 ]; then
    case "$phase" in
      open)
        if ! cmd_state_transition "$name" "open-complete"; then
          red "Transition failed: open-complete"
          return 1
        fi
        ;;
      design)
        if ! cmd_state_transition "$name" "design-complete"; then
          red "Transition failed: design-complete"
          return 1
        fi
        ;;
      build)
        if ! cmd_state_transition "$name" "build-complete"; then
          red "Transition failed: build-complete"
          return 1
        fi
        ;;
      verify)
        # guard 已验证退出条件（verification_report + branch_status）
        # 直接执行 verify-pass 转换，它会设置 verify_result: pass
        if ! cmd_state_transition "$name" "verify-pass"; then
          red "Transition failed: verify-pass"
          return 1
        fi
        ;;
      archive)
        if ! cmd_state_transition "$name" "archived"; then
          red "Transition failed: archived"
          return 1
        fi
        ;;
    esac
  fi
}

# ─── archive ───────────────────────────────────────────────

cmd_archive() {
  local name="${1:-}"
  local dry_run=0

  if [ -z "$name" ]; then
    red "Usage: wf.sh archive <name> [--dry-run]"
    exit 1
  fi

  shift
  while [ $# -gt 0 ]; do
    case "$1" in
      --dry-run) dry_run=1 ;;
    esac
    shift
  done

  _require_change "$name"
  local yaml_file change_dir changes_dir
  yaml_file="$(_yaml_file "$name")"
  change_dir="$(_change_dir "$name")"
  changes_dir="$(_get_changes_dir)"

  local phase verify_result archived
  phase="$(_yaml_get "$yaml_file" "phase")"
  verify_result="$(_yaml_get "$yaml_file" "verify_result")"
  archived="$(_yaml_get "$yaml_file" "archived")"

  if [ "$phase" != "archive" ]; then
    red "ERROR: Cannot archive — current phase is '$phase', expected 'archive'"
    exit 1
  fi
  if [ "$verify_result" != "pass" ]; then
    red "ERROR: Cannot archive — verify_result is '$verify_result', expected 'pass'"
    exit 1
  fi
  if [ "$archived" = "true" ]; then
    yellow "Change '$name' is already archived."
    return 0
  fi

  # 生成目标名
  local today target_name target_dir
  today="$(date +%Y-%m-%d)"
  target_name="${today}-${name}"
  target_dir="$changes_dir/archive/$target_name"

  # 检查目标是否已存在
  if [ -d "$target_dir" ]; then
    red "ERROR: Archive target already exists: $target_dir"
    exit 1
  fi

  if [ "$dry_run" -eq 1 ]; then
    printf '[dry-run] Would move: %s → %s\n' "$change_dir" "$target_dir"
    printf '[dry-run] Would set archived: true\n'
    return 0
  fi

  # 创建 archive 目录
  mkdir -p "$changes_dir/archive"

  # 移动
  mv "$change_dir" "$target_dir"

  # 更新 archived 状态
  _yaml_set "$target_dir/.workflow.yaml" "archived" "true"

  green "Archived change '$name'"
  printf '  From: %s\n' "$change_dir"
  printf '  To:   %s\n' "$target_dir"
}

# ─── spec sync ─────────────────────────────────────────────

cmd_spec_sync() {
  local name="${1:-}"
  local dry_run=0

  if [ -z "$name" ]; then
    red "Usage: wf.sh spec sync <name> [--dry-run]"
    exit 1
  fi

  shift
  while [ $# -gt 0 ]; do
    case "$1" in
      --dry-run) dry_run=1 ;;
    esac
    shift
  done

  _require_change "$name"
  local change_dir
  change_dir="$(_change_dir "$name")"
  local specs_dir="$change_dir/specs"

  if [ ! -d "$specs_dir" ]; then
    printf 'No delta specs found in %s\n' "$specs_dir"
    return 0
  fi

  local project_root
  project_root="$(_find_project_root)"
  local main_specs_dir="$project_root/workflow/specs"
  local count=0

  # 遍历 delta specs
  for spec_file in "$specs_dir"/*/spec.md; do
    [ -f "$spec_file" ] || continue
    local capability
    capability="$(basename "$(dirname "$spec_file")")"
    local main_spec="$main_specs_dir/$capability/spec.md"

    if [ "$dry_run" -eq 1 ]; then
      printf '[dry-run] Would sync: %s → %s\n' "$spec_file" "$main_spec"
    else
      mkdir -p "$main_specs_dir/$capability"
      cp "$spec_file" "$main_spec"
      printf '  Synced: %s → %s\n' "$spec_file" "$main_spec"
    fi
    count=$((count + 1))
  done

  if [ "$count" -eq 0 ]; then
    printf 'No delta specs to sync.\n'
  else
    green "Synced $count delta spec(s) to main specs"
  fi
}

# ─── build/verify command config ───────────────────────────

# 读取 build_command / verify_command 配置
# 优先级：change .workflow.yaml > 项目根 .workflow.yaml / workflow.yaml
_read_config() {
  local name="$1" field="$2"
  local change_yaml project_root

  # 先查 change 级配置
  change_yaml="$(_yaml_file "$name")"
  local value
  value="$(_yaml_get "$change_yaml" "$field")"
  if [ -n "$value" ] && [ "$value" != "null" ]; then
    echo "$value"
    return
  fi

  # 再查项目根配置
  project_root="$(_find_project_root)"
  for candidate in "$project_root/.workflow.yaml" "$project_root/workflow.yaml" "$project_root/.workflow.yml" "$project_root/workflow.yml"; do
    if [ -f "$candidate" ]; then
      value="$(_yaml_get "$candidate" "$field")"
      if [ -n "$value" ] && [ "$value" != "null" ]; then
        echo "$value"
        return
      fi
    fi
  done

  # 没有配置
  echo ""
}


# ─── env ───────────────────────────────────────────────────

cmd_env() {
  printf 'WF_BASH=%s\n' "$WF_BASH"
  printf 'SCRIPT_DIR=%s\n' "$SCRIPT_DIR"
  printf 'PROJECT_ROOT=%s\n' "$(_find_project_root)"
  printf 'CHANGES_DIR=%s\n' "$(_get_changes_dir)"
}

# ─── Main ──────────────────────────────────────────────────

SUBCOMMAND="${1:-}"
shift || true

case "$SUBCOMMAND" in
  state)
    STATE_CMD="${1:-}"
    shift || true
    case "$STATE_CMD" in
      init)       cmd_state_init "$@" ;;
      get)        cmd_state_get "$@" ;;
      set)        cmd_state_set "$@" ;;
      check)      cmd_state_check "$@" ;;
      transition) cmd_state_transition "$@" ;;
      scale)      cmd_state_scale "$@" ;;
      list)       cmd_state_list ;;
      *)
        red "Unknown state subcommand: $STATE_CMD"
        red "Usage: wf.sh state {init|get|set|check|transition|scale|list} [args...]"
        exit 1
        ;;
    esac
    ;;
  guard)    cmd_guard "$@" ;;
  archive)
    # archive 前自动执行 spec sync
    ARCHIVE_NAME="${1:-}"
    if [ -n "$ARCHIVE_NAME" ] && [ "$ARCHIVE_NAME" != "--dry-run" ]; then
      cmd_spec_sync "$ARCHIVE_NAME" || true
    fi
    cmd_archive "$@"
    unset ARCHIVE_NAME
    ;;
  spec)
    SPEC_CMD="${1:-}"
    shift || true
    case "$SPEC_CMD" in
      sync) cmd_spec_sync "$@" ;;
      *)
        red "Unknown spec subcommand: $SPEC_CMD"
        red "Usage: wf.sh spec sync <name> [--dry-run]"
        exit 1
        ;;
    esac
    unset SPEC_CMD
    ;;
  env)      cmd_env ;;
  ""|help|-h|--help)
    cat <<'USAGE'
wf.sh — Workflow 状态管理 CLI

Usage: wf.sh <subcommand> [args...]

State management:
  state init <name> <workflow>           Initialize .workflow.yaml
  state get <name> <field>               Read a field value
  state set <name> <field> <value>       Write a field value
  state check <name> <phase>             Verify phase entry requirements
  state check <name> <phase> --recover   Output recovery context
  state transition <name> <event>        Apply a state transition
  state scale <name>                     Assess change size, set verify_mode
  state list                             List all active changes

Phase guards:
  guard <name> <phase>                   Verify phase exit conditions
  guard <name> <phase> --apply           Verify + auto-transition

Spec:
  spec sync <name>                      Sync delta specs to main specs
  spec sync <name> --dry-run            Preview spec sync

Archive:
  archive <name>                         Archive (auto-runs spec sync first)
  archive <name> --dry-run               Preview archive

Environment:
  env                                    Show environment info

Config (optional, in .workflow.yaml or project root):
  build_command: <command>               Guard runs this before build → verify
  verify_command: <command>              Guard runs this before verify → archive

Workflows: full, hotfix, tweak
Phases: open, design, build, verify, archive
Events: open-complete, design-complete, build-complete, verify-pass, verify-fail, archived
USAGE
    ;;
  *)
    red "Unknown subcommand: $SUBCOMMAND"
    red "Run 'wf.sh help' for usage."
    exit 1
    ;;
esac
