import { errorMessage, parseContext, parseDetail, parseList, record, type Context, type Observer } from "./core";
export interface PluginHost { readonly context: unknown; request(method: string, params?: Record<string, unknown>): Promise<unknown>; onTheme(listener: (theme: Record<string, string>) => void): { dispose(): void }; }
export interface State { context: Context; contextValid: boolean; rows: Observer[]; detail: Observer | null; loading: boolean; opening: boolean; error: string | null; actionError: string | null; }
export class Controller {
  private listeners = new Set<() => void>(); private generation = 0; private disposed = false;
  private state: State = { context: { visible: false, kind: "sub-agent", entityId: null, sessionId: null }, contextValid: false, rows: [], detail: null, loading: false, opening: false, error: null, actionError: null };
  constructor(private host: PluginHost) {}
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  snapshot = () => this.state;
  private publish(change: Partial<State>) { this.state = { ...this.state, ...change }; for (const listener of this.listeners) listener(); }
  update(value: unknown) {
    if (this.disposed) throw new Error("子 Agent 控制器已释放");
    let context: Context; try { context = parseContext(value); } catch (error) { this.generation++; this.publish({ contextValid: false, rows: [], detail: null, loading: false, opening: false, error: errorMessage(error) }); return; }
    const old = this.state.context, changed = context.sessionId !== old.sessionId || context.kind !== old.kind || context.entityId !== old.entityId;
    if (changed || !context.visible) { this.generation++; this.publish({ context, contextValid: true, rows: [], detail: null, loading: false, opening: false, error: null, actionError: null }); }
    else this.publish({ context, contextValid: true });
    if (context.visible) void this.load();
  }
  private async request<T>(method: string, params: Record<string, unknown>, parse: (value: unknown) => T): Promise<T> {
    const operationId = crypto.randomUUID(), start = performance.now(); let received = false;
    console.info("sub-agent.operation.started", { operationId, method });
    try { const value = await this.host.request(method, params); received = true; const result = parse(value); console.info("sub-agent.operation.completed", { operationId, method, elapsedMs: Math.round(performance.now() - start) }); return result; }
    catch (error) { const cancelled = error instanceof Error && error.message === "plugin frontend disposed";
      console[cancelled ? "debug" : "error"](cancelled ? "sub-agent.operation.cancelled" : "sub-agent.operation.failed", { operationId, method, outcome: cancelled ? "cancelled" : "failed", error_code: cancelled ? "FRONTEND_DISPOSED" : received ? "RESPONSE_INVALID" : "HOST_REQUEST_FAILED", elapsedMs: Math.round(performance.now() - start) }); throw error; }
  }
  load = async () => {
    const context = this.state.context;
    if (this.disposed || !this.state.contextValid || this.state.loading || !context.visible || !context.sessionId || (context.kind === "subagent-detail" && !context.entityId)) return;
    const generation = ++this.generation; this.publish({ loading: true, rows: [], detail: null, error: null, actionError: null });
    try {
      const detail = context.kind === "subagent-detail";
      const result = detail ? await this.request("xsec.subagents.get", { subagentId: context.entityId }, value => parseDetail(value, context.entityId!)) : await this.request("xsec.subagents.list", {}, parseList);
      if (generation !== this.generation || this.disposed) return;
      this.publish(detail ? { detail: result as Observer, loading: false } : { rows: result as Observer[], loading: false });
    } catch (error) { if (generation === this.generation && !this.disposed) this.publish({ loading: false, rows: [], detail: null, error: errorMessage(error) }); }
  };
  open = async (kind: Context["kind"], row?: Observer) => {
    if (this.disposed || !this.state.contextValid || this.state.opening || !this.state.context.visible || !this.state.context.sessionId) return;
    const generation = this.generation; this.publish({ opening: true, actionError: null });
    try { await this.request("xsec.workspace.tool.open", { toolId: kind, title: row ? (row.node_title || row.role || "子 Agent 详情").slice(0, 256) : "子 Agent", ...(row ? { entityId: row.id } : {}) }, value => { if (record(value).ok !== true) throw new Error("Host 未确认工具跳转成功"); });
      if (generation === this.generation && !this.disposed) this.publish({ opening: false });
    } catch (error) { if (generation === this.generation && !this.disposed) this.publish({ opening: false, actionError: errorMessage(error) }); }
  };
  dispose() { this.disposed = true; this.generation++; this.listeners.clear(); }
}
