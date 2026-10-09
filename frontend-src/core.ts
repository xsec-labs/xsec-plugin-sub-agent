const STATUS: Record<string, readonly [string, string, number]> = {
  running: ["运行中", "running", 0], starting: ["启动中", "running", 0],
  cancelling: ["取消收口中", "warning", 0], dispatched: ["排队中", "default", 1],
  vuln: ["发现漏洞", "vuln", 2], failed: ["运行失败", "failed", 2],
  done: ["已完成", "done", 3], completed: ["已完成", "done", 3], cancelled: ["已取消", "default", 3],
};
export function statusMeta(status: string): readonly [string, string, number] { return STATUS[status] ?? [status || "未知", "default", 4]; }
export function isTerminalStatus(status: string): boolean { return ["vuln", "failed", "done", "completed", "cancelled"].includes(status); }
export function sortObservers<T extends { status: string; updated_at: number; id: string }>(rows: T[]): T[] {
  return [...rows].sort((left, right) => statusMeta(left.status)[2] - statusMeta(right.status)[2] || right.updated_at - left.updated_at || right.id.localeCompare(left.id));
}
export function formatDuration(startedAt: number | null, completedAt: number | null, now = Date.now()): string {
  if (!startedAt) return "—";
  const start = startedAt < 10_000_000_000 ? startedAt * 1000 : startedAt, rawEnd = completedAt ?? now;
  const end = rawEnd < 10_000_000_000 ? rawEnd * 1000 : rawEnd, seconds = Math.max(0, Math.floor((end - start) / 1000));
  if (seconds < 60) return `${seconds} 秒`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} 分 ${seconds % 60} 秒`;
  return `${Math.floor(minutes / 60)} 小时 ${minutes % 60} 分`;
}
export function formatTime(value: number | null): string { return value ? new Date(value < 10_000_000_000 ? value * 1000 : value).toLocaleString("zh-CN", { hour12: false }) : "—"; }

export interface Observer {
  id: string; assignment_id: string; node_id: string | null; node_title: string | null;
  role: string; status: string; runner_run_id: string | null; acp_session_id: string | null; parent_run_id: string | null;
  attempt: number; status_reason: string | null; started_at: number | null; heartbeat_at: number | null;
  cancel_requested_at: number | null; completed_at: number | null; exit_code: number | null; updated_at: number;
  detail_mode: string; has_session_snapshot: boolean; has_protocol_log: boolean; has_stderr_log: boolean;
}
export interface Context { visible: boolean; kind: "sub-agent" | "subagent-detail"; entityId: string | null; sessionId: string | null; }
export function record(value: unknown): Record<string, unknown> { if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Host 返回对象格式无效"); return value as Record<string, unknown>; }
function text(value: unknown, name: string, limit = 16384): string { if (typeof value !== "string" || !value || value.length > limit) throw new Error(name + "格式无效"); return value; }
function nullableText(value: unknown, name: string, limit = 16384): string | null { if (value === null) return null; if (typeof value !== "string" || value.length > limit) throw new Error(name + "格式无效"); return value; }
function integer(value: unknown, name: string): number { if (typeof value !== "number" || !Number.isSafeInteger(value)) throw new Error(name + "格式无效"); return value; }
function time(value: unknown, name: string): number { const result = integer(value, name); if (result < 0 || Number.isNaN(new Date(result).getTime())) throw new Error(name + "格式无效"); return result; }
function nullableTime(value: unknown, name: string): number | null { return value === null ? null : time(value, name); }
function boolean(value: unknown, name: string): boolean { if (typeof value !== "boolean") throw new Error(name + "格式无效"); return value; }
export function parseObserver(value: unknown): Observer {
  const row = record(value), attempt = integer(row.attempt, "运行次数"); if (attempt < 1) throw new Error("运行次数格式无效");
  return { id: text(row.id, "子 Agent ID", 256), assignment_id: text(row.assignment_id, "任务 ID", 256), node_id: nullableText(row.node_id, "节点 ID", 256), node_title: nullableText(row.node_title, "节点标题"),
    role: text(row.role, "角色", 256), status: text(row.status, "状态", 256), runner_run_id: nullableText(row.runner_run_id, "运行 ID", 256), acp_session_id: nullableText(row.acp_session_id, "ACP 会话", 256), parent_run_id: nullableText(row.parent_run_id, "父运行 ID", 256),
    attempt, status_reason: nullableText(row.status_reason, "状态原因", 65536), started_at: nullableTime(row.started_at, "开始时间"), heartbeat_at: nullableTime(row.heartbeat_at, "活动时间"), cancel_requested_at: nullableTime(row.cancel_requested_at, "取消时间"), completed_at: nullableTime(row.completed_at, "结束时间"), exit_code: row.exit_code === null ? null : integer(row.exit_code, "退出码"), updated_at: time(row.updated_at, "更新时间"),
    detail_mode: text(row.detail_mode, "详情模式", 256), has_session_snapshot: boolean(row.has_session_snapshot, "会话记录状态"), has_protocol_log: boolean(row.has_protocol_log, "协议记录状态"), has_stderr_log: boolean(row.has_stderr_log, "诊断记录状态") };
}
export function parseList(value: unknown): Observer[] {
  const response = record(value); if (!Array.isArray(response.subagents)) throw new Error("子 Agent 列表格式无效");
  const ids = new Set<string>(); return sortObservers(response.subagents.map(value => { const row = parseObserver(value); if (ids.has(row.id)) throw new Error("子 Agent 列表 ID 重复"); ids.add(row.id); return row; }));
}
export function parseDetail(value: unknown, entityId: string): Observer { const row = parseObserver(value); if (row.id !== entityId) throw new Error("子 Agent 详情与当前绑定不匹配"); return row; }
export function parseContext(value: unknown): Context {
  const context = record(value), tool = context.tool == null ? {} : record(context.tool);
  const kind = tool.kind ?? "sub-agent"; if (kind !== "sub-agent" && kind !== "subagent-detail") throw new Error("工作区工具类型无效");
  const session = context.session == null ? {} : record(context.session), workspace = context.workspace == null ? {} : record(context.workspace);
  const binding = workspace.binding == null ? {} : record(workspace.binding);
  const sessionId = session.session_id ?? binding.sessionId ?? null;
  if (session.session_id != null && binding.sessionId != null && session.session_id !== binding.sessionId) throw new Error("会话绑定不一致");
  return { visible: context.visible === undefined ? true : boolean(context.visible, "可见状态"), kind, entityId: tool.entityId == null ? null : text(tool.entityId, "实体绑定", 256), sessionId: sessionId === null ? null : text(sessionId, "会话绑定", 256) };
}
export function errorMessage(value: unknown): string { return value instanceof Error ? value.message : typeof value === "string" && value ? value : "Host 错误返回格式无效"; }
