import { useLayoutEffect, useState, type ReactNode } from "react";
import { ControlThemeProvider, ErrorState } from "@xsec/ui-react";
import { themeAttributes, type ThemeSettings } from "@xsec/design-tokens";
import type { PluginHost } from "./controller";
import { errorMessage } from "./core";

function parseTheme(theme: Record<string, string>): ThemeSettings {
  const colorMode = theme["color-mode"], density = theme["ui-density"], motion = theme["reduce-motion"], size = theme["ui-font-size"];
  if (colorMode !== "light" && colorMode !== "dark") throw new Error("Host color mode is invalid");
  if (density !== "compact" && density !== "comfortable") throw new Error("Host UI density is invalid");
  if (motion !== "true" && motion !== "false") throw new Error("Host reduced motion preference is invalid");
  if (typeof size !== "string" || !/^\d+(?:\.\d+)?px$/.test(size)) throw new Error("Host UI font size is invalid");
  const settings: ThemeSettings = { colorMode, density, reducedMotion: motion === "true", fontScale: Number(size.slice(0, -2)) / 14, locale: "zh-CN" };
  themeAttributes(settings);
  return settings;
}
function readInitialTheme(): ThemeSettings {
  const style = getComputedStyle(document.documentElement);
  return parseTheme(Object.fromEntries(["color-mode", "ui-density", "reduce-motion", "ui-font-size"].map(name => [name, style.getPropertyValue("--xsec-" + name).trim()])));
}
export function PluginTheme({ host, children }: { host: PluginHost; children: ReactNode }) {
  const [state, setState] = useState<{ settings: ThemeSettings; error?: never } | { settings?: never; error: string }>(() => {
    try { return { settings: readInitialTheme() }; } catch (error) { return { error: errorMessage(error) }; }
  });
  useLayoutEffect(() => {
    const subscription = host.onTheme(theme => {
      try { setState({ settings: parseTheme(theme) }); } catch (error) { console.error("sub-agent.theme.invalid", { error_code: "THEME_INVALID" }); setState({ error: errorMessage(error) }); }
    });
    return () => subscription.dispose();
  }, [host]);
  return state.settings ? <ControlThemeProvider settings={state.settings} className="sa-theme">{children}</ControlThemeProvider> : <ErrorState title="子 Agent 主题无效" description={state.error} />;
}
