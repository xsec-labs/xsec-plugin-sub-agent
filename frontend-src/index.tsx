import {createRoot, type Root} from "react-dom/client";
import tokenStyles from "@xsec/design-tokens/styles.css";
import componentStyles from "@xsec/ui-react/styles.css";
import styles from "./styles.css";
import {Controller, type PluginHost} from "./controller";
import {SubAgentApp} from "./app";
import {PluginTheme} from "./theme";
export {statusMeta, isTerminalStatus, sortObservers, formatDuration, formatTime} from "./core";
export function activate(host: PluginHost) {
  let root: Root | undefined, disposed = false; const controller = new Controller(host);
  console.debug("sub-agent.activate");
  return {
    mount(element: HTMLElement, context = host.context) { if (root || disposed) throw new Error("子 Agent 控制器不可挂载"); root = createRoot(element); controller.update(context); root.render(<><style>{tokenStyles + componentStyles + styles}</style><PluginTheme host={host}><SubAgentApp controller={controller} /></PluginTheme></>); console.info("sub-agent.mount"); },
    update(context = host.context) { if (disposed) throw new Error("子 Agent 控制器已释放"); controller.update(context); },
    dispose() { if (disposed) return; disposed = true; controller.dispose(); root?.unmount(); root = undefined; console.debug("sub-agent.dispose"); },
  };
}
