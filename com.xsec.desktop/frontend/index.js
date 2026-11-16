// XSEC Frontend API v2, single-file ESM. Read-only view of the session's sub-agents.
// Colours, radii and spacing follow the Desktop design tokens the Host pushes as --xsec-* variables.
const LIST_METHOD = "xsec.subagents.list";
const GET_METHOD = "xsec.subagents.get";
const OPEN_TOOL_METHOD = "xsec.workspace.tool.open";
const TICK_INTERVAL_MS = 1_000;

// status → [label, tone, sort rank]. Tones follow Desktop: info = in progress, warning = waiting, danger = failed.
const STATUS = {
  running: ["运行中", "info", 0],
  starting: ["启动中", "info", 0],
  cancelling: ["取消收口中", "warning", 0],
  dispatched: ["排队中", "neutral", 1],
  vuln: ["发现漏洞", "danger", 2],
  failed: ["运行失败", "danger", 2],
  done: ["已完成", "success", 3],
  completed: ["已完成", "success", 3],
  cancelled: ["已取消", "neutral", 3],
};

export function statusMeta(status) {
  return STATUS[status] ?? [status || "未知", "neutral", 4];
}

export function isTerminalStatus(status) {
  return ["vuln", "failed", "done", "completed", "cancelled"].includes(status);
}

export function sortObservers(rows) {
  return [...rows].sort((left, right) => {
    const rank = statusMeta(left.status)[2] - statusMeta(right.status)[2];
    return rank || right.updated_at - left.updated_at || right.id.localeCompare(left.id);
  });
}

function toMillis(value) {
  return value < 10_000_000_000 ? value * 1000 : value;
}

export function formatDuration(startedAt, completedAt, now = Date.now()) {
  if (!startedAt) return "—";
  const seconds = Math.max(0, Math.floor((toMillis(completedAt ?? now) - toMillis(startedAt)) / 1000));
  if (seconds < 60) return `${seconds} 秒`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} 分 ${seconds % 60} 秒`;
  return `${Math.floor(minutes / 60)} 小时 ${minutes % 60} 分`;
}

// Local time to the minute, the same shape Desktop lists use: 2026-01-02 15:04.
export function formatTime(value) {
  if (!value) return "—";
  const date = new Date(toMillis(value));
  if (Number.isNaN(date.getTime())) return "—";
  const pad = (number) => String(number).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function formatRelative(value, now = Date.now()) {
  if (!value) return "—";
  const seconds = Math.floor((toMillis(now) - toMillis(value)) / 1000);
  if (seconds < 10) return "刚刚";
  if (seconds < 60) return `${seconds} 秒前`;
  if (seconds < 3_600) return `${Math.floor(seconds / 60)} 分钟前`;
  if (seconds < 86_400) return `${Math.floor(seconds / 3_600)} 小时前`;
  return formatTime(value);
}

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function icon(path) {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 16 16");
  svg.setAttribute("class", "x-icon");
  svg.setAttribute("aria-hidden", "true");
  const shape = document.createElementNS("http://www.w3.org/2000/svg", "path");
  shape.setAttribute("d", path);
  svg.append(shape);
  return svg;
}

const ICON_ALERT = "M8 5.2v3.4M8 11h.01M8 1.8l6.4 11.4H1.6z";
const ICON_CHEVRON = "M6 3.5 10.5 8 6 12.5";

const BASE_CSS = `
:root{--d-canvas:#f7f7f8;--d-surface:#fff;--d-subtle:#f0f0f2;--d-hover:#eaeaed;--d-text:#18181b;--d-muted:#62626b;--d-border:#dcdce1;--d-danger:#b42318;--d-success:#187344;--d-warning:#8a5700}
@media (prefers-color-scheme:dark){:root{--d-canvas:#111113;--d-surface:#19191c;--d-subtle:#232327;--d-hover:#2d2d33;--d-text:#f4f4f5;--d-muted:#a1a1aa;--d-border:#35353c;--d-danger:#ff938a;--d-success:#7ad6a0;--d-warning:#e9bd70}}
:root{--canvas:var(--xsec-window-background,var(--d-canvas));--surface:var(--xsec-content-surface,var(--d-surface));--subtle:var(--xsec-bg-subtle,var(--d-subtle));--hover:var(--xsec-bg-hover,var(--d-hover));--text:var(--xsec-text-primary,var(--d-text));--muted:var(--xsec-text-secondary,var(--d-muted));--border:var(--xsec-border-default,var(--d-border));--primary:var(--xsec-text-accent,var(--d-text));--danger:var(--xsec-status-error,var(--d-danger));--success:var(--xsec-status-success,var(--d-success));--warning:var(--xsec-status-warning,var(--d-warning));--info:color-mix(in srgb,#0169cc 68%,var(--text));--hairline:color-mix(in srgb,var(--text) 10%,transparent);--r-control:var(--xsec-radius-md,8px);--r-panel:var(--xsec-radius-lg,12px);--font:-apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC","Microsoft YaHei","Noto Sans CJK SC",system-ui,sans-serif;--mono:ui-monospace,"SF Mono","Cascadia Mono",Consolas,"Liberation Mono",monospace}
*,*::before,*::after{box-sizing:border-box}
html,body,[data-xsec-plugin-root]{width:100%;height:100%;margin:0}
body{overflow:hidden;background:var(--surface);color:var(--text);font:14px/1.45 var(--font);-webkit-font-smoothing:antialiased}
button,input,select{font:inherit;color:inherit}
[hidden]{display:none!important}
:focus-visible{outline:2px solid var(--info);outline-offset:1px}
.x-panel{display:flex;flex-direction:column;width:100%;height:100%;min-width:0;background:var(--surface)}
.x-head{display:flex;align-items:center;gap:12px;min-height:52px;padding:8px 12px;border-bottom:1px solid var(--hairline)}
.x-head-copy{display:grid;gap:2px;min-width:0;flex:1}
.x-title{overflow:hidden;font-size:14px;font-weight:600;text-overflow:ellipsis;white-space:nowrap}
.x-sub{overflow:hidden;color:var(--muted);font-size:12px;text-overflow:ellipsis;white-space:nowrap}
.x-body{display:flex;flex:1;flex-direction:column;gap:12px;min-height:0;padding:12px;overflow:auto}
.x-section{display:grid;gap:8px}
.x-section-title{display:flex;align-items:baseline;gap:8px;margin:0;padding:0 4px;color:var(--muted);font-size:12px;font-weight:600}
.x-count{font-weight:400;font-variant-numeric:tabular-nums}
.x-card{border:1px solid var(--hairline);border-radius:var(--r-panel);background:var(--surface);padding:16px}
.x-card.flush{padding:0;overflow:hidden}
.x-card-title{margin:0 0 8px;font-size:14px;font-weight:600;line-height:32px}
.x-row{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:4px 12px;width:100%;padding:10px 16px;border:0;border-top:1px solid var(--hairline);background:transparent;text-align:left;cursor:pointer;transition:background-color .12s}
.x-row:first-child{border-top:0}
.x-row:hover{background:var(--subtle)}
.x-row:active{background:var(--hover)}
.x-row:focus-visible{outline-offset:-2px}
.x-row-title{overflow:hidden;font-weight:600;text-overflow:ellipsis;white-space:nowrap}
.x-row-meta{display:flex;align-items:center;gap:8px;min-width:0;color:var(--muted);font-size:12px}
.x-row-meta>span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.x-badge{display:inline-flex;align-items:center;gap:6px;flex:none;padding:2px 8px;border-radius:999px;background:var(--subtle);color:var(--muted);font-size:12px;font-weight:600;line-height:18px;white-space:nowrap}
.x-badge.success{background:color-mix(in srgb,var(--success) 12%,var(--surface));color:var(--success)}
.x-badge.warning{background:color-mix(in srgb,var(--warning) 14%,var(--surface));color:var(--warning)}
.x-badge.danger{background:color-mix(in srgb,var(--danger) 12%,var(--surface));color:var(--danger)}
.x-badge.info{background:color-mix(in srgb,var(--info) 12%,var(--surface));color:var(--info)}
.x-pulse{width:6px;height:6px;border-radius:50%;background:currentColor;animation:x-pulse 1.6s ease-in-out infinite}
.x-tag{flex:none;padding:1px 6px;border-radius:6px;background:var(--subtle);color:var(--muted);font:12px/18px var(--mono)}
.x-kv{display:grid;grid-template-columns:minmax(88px,max-content) minmax(0,1fr);gap:8px 16px;margin:0}
.x-kv dt{color:var(--muted)}
.x-kv dd{min-width:0;margin:0;overflow-wrap:anywhere;user-select:text;-webkit-user-select:text}
.x-kv dd.mono,.x-mono{font-family:var(--mono);font-size:13px}
.x-notice{display:flex;align-items:flex-start;gap:8px;padding:8px 12px;border:1px solid color-mix(in srgb,var(--tone) 32%,transparent);border-radius:var(--r-control);background:color-mix(in srgb,var(--tone) 8%,var(--surface));--tone:var(--info)}
.x-notice.danger{--tone:var(--danger)}
.x-notice.warning{--tone:var(--warning)}
.x-notice svg{flex:none;margin-top:2px;color:var(--tone)}
.x-notice-text{flex:1;min-width:0;overflow-wrap:anywhere}
.x-notice .x-btn{margin:-3px -6px -3px 0}
.x-btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;flex:none;height:32px;padding:0 12px;border:0;border-radius:var(--r-control);background:var(--subtle);font-weight:500;white-space:nowrap;cursor:pointer;transition:background-color .12s}
.x-btn:hover{background:var(--hover)}
.x-btn:disabled{opacity:.5;cursor:default;pointer-events:none}
.x-btn.small{height:26px;padding:0 8px;font-size:12px}
.x-btn.ghost{background:transparent}
.x-btn.ghost:hover{background:var(--subtle)}
.x-btn.primary{background:var(--primary);color:var(--surface)}
.x-btn.primary:hover{background:color-mix(in srgb,var(--primary) 88%,var(--surface))}
.x-icon{flex:none;width:16px;height:16px;fill:none;stroke:currentColor;stroke-width:1.6;stroke-linecap:round;stroke-linejoin:round}
.x-empty{display:grid;flex:1;place-content:center;justify-items:center;gap:4px;padding:32px 24px;text-align:center}
.x-empty strong{font-weight:600}
.x-empty span{max-width:320px;color:var(--muted);font-size:13px}
.x-spinner{width:20px;height:20px;margin-bottom:8px;border:2px solid var(--hairline);border-top-color:var(--muted);border-radius:50%;animation:x-spin .8s linear infinite}
.x-num{font-variant-numeric:tabular-nums}
@keyframes x-spin{to{transform:rotate(360deg)}}
@keyframes x-pulse{50%{opacity:.35}}
@media (prefers-reduced-motion:reduce){.x-pulse,.x-spinner{animation:none}.x-row,.x-btn{transition:none}}
`;
const VIEW_CSS = `
.sa-row .x-icon{color:var(--muted);opacity:.55;transition:opacity .12s}
.sa-row:hover .x-icon,.sa-row:focus-visible .x-icon{opacity:1}
.sa-row-end{display:flex;align-items:center;gap:8px;grid-row:1/span 2;grid-column:2}
.sa-row.has-reason .sa-row-end{grid-row:1/span 3}
.sa-reason{grid-column:1;overflow:hidden;color:var(--danger);font-size:12px;text-overflow:ellipsis;white-space:nowrap}
.sa-dot{color:var(--hairline)}
@media (prefers-reduced-motion:reduce){.sa-row .x-icon{transition:none}}
`;

function installStyles() {
  if (document.getElementById("xsec-subagent-styles")) return;
  const style = document.createElement("style");
  style.id = "xsec-subagent-styles";
  style.textContent = BASE_CSS + VIEW_CSS;
  document.head.append(style);
}

// The Host pushes colours, not a mode. Native controls and scrollbars follow the surface's lightness.
function followSurface() {
  const probe = document.createElement("span");
  probe.style.cssText = "position:absolute;visibility:hidden;color:var(--surface)";
  document.body.append(probe);
  const channels = getComputedStyle(probe).color.match(/[\d.]+/g) ?? [];
  probe.remove();
  if (channels.length < 3) return;
  const [red, green, blue] = channels.map(Number);
  document.documentElement.style.colorScheme = red * 0.299 + green * 0.587 + blue * 0.114 < 128 ? "dark" : "light";
}

function contextValues(context) {
  return {
    visible: context?.visible !== false,
    kind: context?.tool?.kind ?? "sub-agent",
    entityId: context?.tool?.entityId ?? null,
    sessionId: context?.session?.session_id ?? context?.workspace?.binding?.sessionId ?? null,
  };
}

function badge(status) {
  const [label, tone] = statusMeta(status);
  const node = element("span", `x-badge ${tone}`);
  if (status === "running" || status === "starting") node.append(element("span", "x-pulse"));
  node.append(document.createTextNode(label));
  return node;
}

function rowTitle(row) {
  return row.node_title || row.role || String(row.id).slice(0, 10);
}

function attemptText(row) {
  return row.attempt > 1 ? `第 ${row.attempt} 次尝试` : "";
}

function createController(host) {
  let root = null;
  let context = contextValues(null);
  let rows = [];
  let detail = null;
  let error = null;
  let loading = false;
  let generation = 0;
  let disposed = false;
  let live = [];
  let ticker = null;
  const themeSubscription = host.onTheme(() => followSurface());

  // Texts that depend on the clock (elapsed time, last activity) refresh in place once a second.
  const liveText = (node, compute) => {
    node.textContent = compute();
    live.push([node, compute]);
    return node;
  };
  const tick = () => {
    if (document.visibilityState !== "visible") return;
    for (const [node, compute] of live) node.textContent = compute();
  };

  const empty = (title, description, spinner = false) => {
    const node = element("div", "x-empty");
    if (spinner) node.append(element("span", "x-spinner"));
    node.append(element("strong", "", title));
    if (description) node.append(element("span", "", description));
    return node;
  };

  const notice = (tone, message, action) => {
    const node = element("div", `x-notice ${tone}`);
    node.setAttribute("role", tone === "danger" ? "alert" : "status");
    node.append(icon(ICON_ALERT), element("span", "x-notice-text", message));
    if (action) node.append(action);
    return node;
  };

  const open = async (toolId, title, entityId) => {
    try {
      await host.request(OPEN_TOOL_METHOD, { toolId, title, entityId });
      error = null;
    } catch (value) {
      error = value instanceof Error ? value.message : String(value);
      render();
    }
  };

  const listRow = (row) => {
    const title = rowTitle(row);
    const reason = !isTerminalStatus(row.status) ? "" : row.status === "failed" || row.status === "vuln" ? row.status_reason || "" : "";
    const button = element("button", `x-row sa-row${reason ? " has-reason" : ""}`);
    button.type = "button";
    button.setAttribute("aria-label", `查看子 Agent ${title}`);
    const meta = element("span", "x-row-meta");
    meta.append(element("span", "x-tag", row.role || "sub"));
    const attempt = attemptText(row);
    if (attempt) meta.append(element("span", "", attempt));
    const timing = element("span", "x-num");
    if (isTerminalStatus(row.status)) timing.textContent = `结束于 ${formatTime(row.completed_at)}`;
    else if (row.status === "dispatched") timing.textContent = "等待调度";
    else liveText(timing, () => `已运行 ${formatDuration(row.started_at, null)}`);
    meta.append(timing);
    const end = element("span", "sa-row-end");
    end.append(badge(row.status), icon(ICON_CHEVRON));
    button.append(element("span", "x-row-title", title), end, meta);
    if (reason) {
      const line = element("span", "sa-reason", reason);
      line.title = reason;
      button.append(line);
    }
    button.addEventListener("click", () => void open("subagent-detail", row.node_title || row.role || "子 Agent 详情", row.id));
    return button;
  };

  const group = (title, items) => {
    const section = element("section", "x-section");
    const heading = element("h2", "x-section-title", title);
    heading.append(element("span", "x-count", String(items.length)));
    const card = element("div", "x-card flush");
    for (const row of items) card.append(listRow(row));
    section.append(heading, card);
    return section;
  };

  const renderList = (body) => {
    if (!context.sessionId) {
      body.append(empty("暂无子 Agent", "当前会话未绑定任务，或主 Agent 尚未派发子任务。"));
      return;
    }
    if (loading && !rows.length) {
      body.append(empty("正在读取子 Agent", "", true));
      return;
    }
    if (!rows.length) {
      if (!error) body.append(empty("暂无子 Agent", "主 Agent 派发子任务后会出现在这里。"));
      return;
    }
    const active = rows.filter((row) => !isTerminalStatus(row.status));
    const ended = rows.filter((row) => isTerminalStatus(row.status));
    if (active.length) body.append(group("进行中", active));
    if (ended.length) body.append(group("已结束", ended));
  };

  const keyValues = (pairs) => {
    const list = element("dl", "x-kv");
    for (const [label, value, className] of pairs) {
      const term = element("dt", "", label);
      const data = element("dd", className || "");
      if (typeof value === "function") liveText(data, value);
      else data.textContent = value;
      list.append(term, data);
    }
    return list;
  };

  const card = (title, content) => {
    const node = element("section", "x-card");
    node.append(element("h2", "x-card-title", title), content);
    return node;
  };

  const renderDetail = (body) => {
    if (loading && !detail) {
      body.append(empty("正在读取子 Agent", "", true));
      return;
    }
    if (!detail) {
      if (!error) body.append(empty("子 Agent 不存在", "无法读取对应的子 Agent 记录。"));
      return;
    }
    const current = detail;
    if (current.status_reason) {
      body.append(notice(current.status === "failed" || current.status === "vuln" ? "danger" : "warning", current.status_reason));
    }
    const ended = isTerminalStatus(current.status);
    const run = [
      ["运行耗时", ended ? formatDuration(current.started_at, current.completed_at) : () => formatDuration(current.started_at, null), "x-num"],
      ["开始时间", formatTime(current.started_at), "x-num"],
    ];
    if (ended) run.push(["结束时间", formatTime(current.completed_at), "x-num"]);
    const activity = current.heartbeat_at ?? current.updated_at;
    run.push(["最近活动", ended ? formatTime(activity) : () => formatRelative(activity), "x-num"]);
    body.append(
      card("运行", keyValues(run)),
      card("标识", keyValues([
        ["运行 ID", current.runner_run_id || "尚未创建", current.runner_run_id ? "mono" : ""],
        ["ACP 会话", current.acp_session_id || "尚未注册", current.acp_session_id ? "mono" : ""],
      ])),
    );
  };

  const summary = () => {
    if (!rows.length) return "";
    const active = rows.filter((row) => !isTerminalStatus(row.status)).length;
    return active ? `共 ${rows.length} 个，${active} 个进行中` : `共 ${rows.length} 个，均已结束`;
  };

  const render = () => {
    if (!root) return;
    live = [];
    const isDetail = context.kind === "subagent-detail";
    const shell = element("section", "x-panel");
    shell.setAttribute("aria-label", isDetail ? "子 Agent 运行详情" : "子 Agent");
    const head = element("header", "x-head");
    const copy = element("span", "x-head-copy");
    const title = isDetail ? detail?.node_title || detail?.role || "子 Agent 详情" : "子 Agent";
    const subtitle = isDetail
      ? detail ? [detail.role || "sub", attemptText(detail)].filter(Boolean).join(" · ") : ""
      : summary();
    copy.append(element("strong", "x-title", title));
    if (subtitle) copy.append(element("span", "x-sub", subtitle));
    head.append(copy);
    if (isDetail && detail) head.append(badge(detail.status));
    const body = element("div", "x-body");
    if (error) {
      const retry = element("button", "x-btn small", "重试");
      retry.type = "button";
      retry.addEventListener("click", () => void load());
      body.append(notice("danger", error, retry));
    }
    if (isDetail) renderDetail(body);
    else renderList(body);
    shell.append(head, body);
    root.replaceChildren(shell);
  };

  const load = async () => {
    if (disposed || loading || !context.visible) return;
    if (context.kind === "subagent-detail" && !context.entityId) {
      detail = null;
      render();
      return;
    }
    if (context.kind !== "subagent-detail" && !context.sessionId) {
      rows = [];
      render();
      return;
    }
    loading = true;
    const request = ++generation;
    render();
    try {
      if (context.kind === "subagent-detail") {
        const nextDetail = await host.request(GET_METHOD, { subagentId: context.entityId });
        if (request !== generation || disposed) return;
        detail = nextDetail;
      } else {
        const result = await host.request(LIST_METHOD, {});
        if (request !== generation || disposed) return;
        rows = sortObservers(Array.isArray(result?.subagents) ? result.subagents : []);
      }
      error = null;
    } catch (value) {
      if (request !== generation || disposed) return;
      error = value instanceof Error ? value.message : String(value);
    } finally {
      if (request === generation) {
        loading = false;
        render();
      }
    }
  };

  const update = (nextContext) => {
    const next = contextValues(nextContext);
    const bindingChanged = next.kind !== context.kind || next.entityId !== context.entityId || next.sessionId !== context.sessionId;
    context = next;
    if (bindingChanged) {
      generation += 1;
      loading = false;
      rows = [];
      detail = null;
      error = null;
    }
    render();
    if (context.visible) void load();
  };

  return {
    async mount(nextRoot, initialContext) {
      root = nextRoot;
      installStyles();
      followSurface();
      ticker = window.setInterval(tick, TICK_INTERVAL_MS);
      update(initialContext);
    },
    async update(nextContext) {
      update(nextContext);
    },
    async dispose() {
      disposed = true;
      generation += 1;
      window.clearInterval(ticker);
      live = [];
      themeSubscription.dispose();
      root?.replaceChildren();
    },
  };
}

export function activate(host) {
  return createController(host);
}
