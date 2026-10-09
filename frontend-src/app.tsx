import { useLayoutEffect, useRef, useSyncExternalStore } from "react";
import { ArrowLeft, ArrowUpRight, RefreshCw } from "lucide-react";
import { Badge, ControlButton, ControlIconButton, EmptyState, ErrorState, PageHeader, Spinner } from "@xsec/ui-react";
import { formatDuration, formatTime, isTerminalStatus, statusMeta, type Observer } from "./core";
import type { Controller } from "./controller";
function Status({ row }: { row: Observer }) { const [label, kind] = statusMeta(row.status); const tone = kind === "done" ? "success" : kind === "failed" || kind === "vuln" ? "danger" : kind === "warning" ? "warning" : "neutral"; return <Badge tone={tone} data-status={kind}>{label}</Badge>; }
function title(row: Observer): string { return row.node_title || row.role || row.id.slice(0, 10); }
export function SubAgentApp({ controller }: { controller: Controller }) {
  const state = useSyncExternalStore(controller.subscribe, controller.snapshot), heading = useRef<HTMLElement>(null), body = useRef<HTMLDivElement>(null), previous = useRef(""), lastOpened = useRef<{ id: string; sessionId: string | null; scrollTop: number } | null>(null);
  const { context, rows, detail, loading, opening, error, actionError } = state, isDetail = context.kind === "subagent-detail";
  const identity = `${context.sessionId}:${context.kind}:${context.entityId}`;
  useLayoutEffect(() => { if (previous.current && previous.current !== identity) heading.current?.focus(); previous.current = identity; }, [identity]);
  useLayoutEffect(() => { if (!isDetail && !loading && rows.length && lastOpened.current?.sessionId === context.sessionId) {
    const button = heading.current?.querySelector<HTMLButtonElement>(`[data-sa-id="${CSS.escape(lastOpened.current.id)}"]`);
    if (button) { button.focus({ preventScroll: true }); if (body.current) body.current.scrollTop = lastOpened.current.scrollTop; lastOpened.current = null; }
  } }, [isDetail, loading, rows, context.sessionId]);
  if (!state.contextValid) return <ErrorState title="子 Agent 上下文无效" description={error} />;
  if (!context.visible) return null;
  const refresh = <ControlIconButton label="刷新子 Agent" loading={loading} onClick={() => void controller.load()} disabled={!context.sessionId || (isDetail && !context.entityId)}><RefreshCw size={16} aria-hidden="true" /></ControlIconButton>;
  const running = rows.filter(row => !isTerminalStatus(row.status)).length;
  return <section className="sa-root" aria-label={isDetail ? "子 Agent 运行详情" : "子 Agent"} ref={heading} tabIndex={-1}>
    <PageHeader title={isDetail ? detail ? title(detail) : "子 Agent 详情" : "子 Agent"} description={isDetail && detail ? `${detail.role} · 第 ${detail.attempt} 次运行` : "当前会话的子任务运行状态"} actions={<>{isDetail ? <ControlButton variant="secondary" disabled={opening} onClick={() => void controller.open("sub-agent")}><ArrowLeft size={16} aria-hidden="true" />返回列表</ControlButton> : null}{refresh}</>} />
    <div className="sa-body" aria-busy={loading} ref={body}>
      {actionError ? <ErrorState title="工具跳转失败" description={actionError} /> : null}
      {!context.sessionId ? <EmptyState title="暂无子 Agent" description="选择受管会话后查看子任务运行状态。" /> : isDetail && !context.entityId ? <EmptyState title="选择子 Agent" description="从列表打开子任务的运行详情。" /> : loading ? <Spinner label={isDetail ? "正在读取运行详情…" : "正在读取子 Agent…"} /> : error ? <ErrorState title="子 Agent 读取失败" description={error} action={<ControlButton variant="secondary" onClick={() => void controller.load()}>重新读取</ControlButton>} /> : isDetail ? detail ? <>
        <dl className="sa-detail-grid">{[["状态", <Status row={detail} />], ["运行耗时", formatDuration(detail.started_at, detail.completed_at)], ["开始时间", formatTime(detail.started_at)], ["最近活动", formatTime(detail.heartbeat_at ?? detail.updated_at)], ["运行 ID", detail.runner_run_id || "尚未创建"], ["ACP 会话", detail.acp_session_id || "尚未注册"]].map(([label, value]) => <div key={String(label)}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
        {detail.status_reason ? <div className="sa-reason" role="note"><strong>状态说明</strong><p>{detail.status_reason}</p></div> : null}
      </> : <EmptyState title="子 Agent 不存在" description="当前绑定没有可读取的运行记录。" /> : rows.length ? <>
        <dl className="sa-summary" aria-label="运行统计">{[[rows.length, "全部"], [running, "进行中"], [rows.length - running, "已结束"]].map(([value, label]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
        <div className="sa-list">{rows.map(row => <ControlButton key={row.id} variant="ghost" className="sa-row" data-sa-id={row.id} disabled={opening} aria-label={`查看子 Agent ${title(row)}`} onClick={() => { lastOpened.current = { id: row.id, sessionId: context.sessionId, scrollTop: body.current?.scrollTop ?? 0 }; void controller.open("subagent-detail", row); }}>
          <span className="sa-row-copy"><strong>{title(row)}</strong><span className="sa-row-meta">{row.role}{row.attempt > 1 ? ` · 第 ${row.attempt} 次运行` : ""} · {isTerminalStatus(row.status) ? `结束于 ${formatTime(row.completed_at)}` : row.status === "dispatched" ? "等待调度" : `已运行 ${formatDuration(row.started_at, null)}`}</span></span><span className="sa-row-status"><Status row={row} /><ArrowUpRight size={16} aria-hidden="true" /></span>
        </ControlButton>)}</div>
      </> : <EmptyState title="暂无子 Agent" description="主 Agent 派发子任务后会出现在这里。" />}
    </div>
  </section>;
}
