---
name: workflow-archive
description: "Workflow 阶段 5：归档。用 /workflow-archive 调用。归档已完成的变更。"
trigger: /workflow-archive
publish: true
---

# Workflow 阶段 5：归档（Archive）

归档已完成的变更。

## 前置条件

- 验证已通过（阶段 4 完成）
- 分支已处理
- `workflow/changes/<name>/.workflow.yaml` 中 `verify_result: pass`

## 脚本定位

```bash
WF_SCRIPT="${WF_SCRIPT:-$(find . "$HOME"/.*/skills "$HOME/.config" "$HOME/.trae" \
  -path '*/workflow/scripts/wf.sh' -type f -print -quit 2>/dev/null)}"
if [ -z "$WF_SCRIPT" ]; then
  echo "ERROR: wf.sh not found. Ensure the workflow skill is installed." >&2
  exit 1
fi
```

---

## Step 0: 入口状态验证

```bash
"$WF_SCRIPT" state check <name> archive
```

验证通过后继续。

---

## Step 1: 执行归档

```bash
"$WF_SCRIPT" archive <name>
```

脚本自动完成：
1. 入口验证（phase == archive, verify_result == pass, archived == false）
2. 创建 `workflow/changes/archive/` 目录
3. 移动 change 目录到 `workflow/changes/archive/YYYY-MM-DD-<name>/`
4. 更新 .workflow.yaml（archived: true）

如需预览而不实际执行：
```bash
"$WF_SCRIPT" archive <name> --dry-run
```

如脚本返回非零退出码，报告错误并停止。

---

## Step 2: 生命周期闭环

```
探索 → 设计 → 构建 → 验证 → 归档
```

流程全部完成。

---

## 退出条件

- 归档脚本执行成功（退出码 0）
- 归档目录 `workflow/changes/archive/YYYY-MM-DD-<name>/` 存在
- archived: true

归档成功后**不要再对原 change 名运行** guard，因为原活跃目录已经不存在。

## 完成

Workflow 流程全部完成。如需开始新工作，调用 `/workflow` 或 `/workflow-open`。
