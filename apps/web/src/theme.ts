export type ThemePref = "dark" | "light" | "system";

const STORAGE_KEY = "mind_theme";

export function readThemePref(): ThemePref {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === "dark" || v === "light" || v === "system") return v;
  } catch {
    /* ignore */
  }
  return "system";
}

export function resolveTheme(pref: ThemePref): "dark" | "light" {
  if (pref === "dark") return "dark";
  if (pref === "light") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

/** 将已解析的 dark | light 写入 `document.documentElement.dataset.theme`（供 CSS 使用）。 */
export function applyResolvedTheme(resolved: "dark" | "light"): void {
  document.documentElement.dataset.theme = resolved;
}

export function persistThemePref(pref: ThemePref): void {
  try {
    localStorage.setItem(STORAGE_KEY, pref);
  } catch {
    /* ignore */
  }
}

/** 首屏前调用：按 localStorage / 系统偏好设置 `data-theme`。 */
export function initTheme(): void {
  const pref = readThemePref();
  applyResolvedTheme(resolveTheme(pref));
}

if (typeof document !== "undefined") {
  initTheme();
}
