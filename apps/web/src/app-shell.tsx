import React from "react";
import type { ThemePref } from "./theme.js";

export type NavId = "chat" | "memory" | "search";

const labels: Record<NavId, string> = {
  chat: "对话",
  memory: "记忆库",
  search: "检索",
};

export function AppShell(props: {
  active: NavId;
  onNav: (id: NavId) => void;
  themePref: ThemePref;
  onThemePref: (pref: ThemePref) => void;
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <div className="shell">
      <nav className="topnav" aria-label="主导航">
        <div className="topnav-links">
          {(Object.keys(labels) as NavId[]).map((id) => (
            <button
              key={id}
              type="button"
              className={props.active === id ? "navbtn navbtn-active" : "navbtn"}
              onClick={() => props.onNav(id)}
            >
              {labels[id]}
            </button>
          ))}
        </div>
        <div className="topnav-end">
          <label className="theme-label" htmlFor="mind-theme-select">
            外观
          </label>
          <select
            id="mind-theme-select"
            className="theme-select"
            value={props.themePref}
            onChange={(e) => props.onThemePref(e.target.value as ThemePref)}
          >
            <option value="dark">深色</option>
            <option value="light">浅色</option>
            <option value="system">跟随系统</option>
          </select>
        </div>
      </nav>
      <div className="shell-body">{props.children}</div>
    </div>
  );
}
