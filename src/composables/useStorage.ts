import { normalizeQuickLinkItems } from "./quickLinkItems";
import type { QuickLinkFolder, QuickLinkItem, QuickLinkLink } from "./quickLinkItems";

export type QuickLink = QuickLinkItem;
export type { QuickLinkItem, QuickLinkLink, QuickLinkFolder };

export type LanguageSetting = "auto" | "zh-CN" | "en-US";

export interface Settings {
  language: LanguageSetting;
  searchEngine: "google" | "bing" | "baidu" | "duckduckgo";
  showClock: boolean;
  showSeconds: boolean;
  quickLinks: QuickLinkItem[];
}

const STORAGE_KEY = "gtab_settings";

const defaults: Settings = {
  language: "auto",
  searchEngine: "google",
  showClock: true,
  showSeconds: true,
  quickLinks: [
    { id: "1", type: "link", name: "GitHub", url: "https://github.com" },
    { id: "2", type: "link", name: "YouTube", url: "https://youtube.com" },
    { id: "3", type: "link", name: "Gmail", url: "https://mail.google.com" },
  ],
};

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...defaults };

    const parsed = JSON.parse(raw) as Partial<Settings>;
    return {
      ...defaults,
      ...parsed,
      quickLinks: normalizeQuickLinkItems(parsed.quickLinks ?? defaults.quickLinks),
    };
  } catch {
    return { ...defaults };
  }
}

export function saveSettings(settings: Settings): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}
