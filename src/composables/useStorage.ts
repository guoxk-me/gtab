import { normalizeQuickLinkItems } from "./quickLinkItems";
import type {
  QuickLinkFolder,
  QuickLinkItem,
  QuickLinkLink,
  QuickLinkPage,
} from "./quickLinkItems";
import { sanitizePage } from "./quickLinkPages";

export type QuickLink = QuickLinkItem;
export type { QuickLinkPage, QuickLinkItem, QuickLinkLink, QuickLinkFolder };

export type LanguageSetting = "auto" | "zh-CN" | "en-US";

export interface Settings {
  language: LanguageSetting;
  searchEngine: "google" | "bing" | "baidu" | "duckduckgo";
  showClock: boolean;
  showSeconds: boolean;
  quickLinkPages: QuickLinkPage[];
  activePageIndex: number;
}

const STORAGE_KEY = "gtab_settings";

const defaultPage: QuickLinkPage = {
  id: "default-page",
  name: "Quick Links",
  items: [
    { id: "1", type: "link" as const, name: "GitHub", url: "https://github.com" },
    { id: "2", type: "link" as const, name: "YouTube", url: "https://youtube.com" },
    { id: "3", type: "link" as const, name: "Gmail", url: "https://mail.google.com" },
  ],
};

const defaults: Settings = {
  language: "auto",
  searchEngine: "google",
  showClock: true,
  showSeconds: true,
  quickLinkPages: [defaultPage],
  activePageIndex: 0,
};

// Unfreeze a page for mutation (deep copy)
function deepCloneSettings(s: Settings): Settings {
  return JSON.parse(JSON.stringify(s));
}

function migrateLegacyQuickLinks(raw: Record<string, unknown>): Record<string, unknown> {
  if (Array.isArray(raw.quickLinkPages)) return raw;

  const next = { ...raw };

  if (Array.isArray(raw.quickLinks)) {
    const items = normalizeQuickLinkItems(raw.quickLinks as unknown[]);
    next.quickLinkPages = [
      {
        id: "default-page",
        name: "Quick Links",
        items,
      },
    ];
    delete next.quickLinks;
    next.activePageIndex = 0;
    return next;
  }

  return next;
}

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return deepCloneSettings(defaults);

    const parsed = JSON.parse(raw);
    const migrated = migrateLegacyQuickLinks(parsed);

    const pages = Array.isArray(migrated.quickLinkPages)
      ? migrated.quickLinkPages.map((p: QuickLinkPage) => sanitizePage(p))
      : [deepCloneSettings(defaults).quickLinkPages[0]];

    const activePageIndex =
      typeof migrated.activePageIndex === "number"
        ? Math.max(0, Math.min(migrated.activePageIndex, pages.length - 1))
        : 0;

    return {
      ...deepCloneSettings(defaults),
      language:
        typeof migrated.language === "string" ? (migrated.language as LanguageSetting) : "auto",
      searchEngine:
        typeof migrated.searchEngine === "string"
          ? (migrated.searchEngine as Settings["searchEngine"])
          : "google",
      showClock: typeof migrated.showClock === "boolean" ? migrated.showClock : defaults.showClock,
      showSeconds:
        typeof migrated.showSeconds === "boolean" ? migrated.showSeconds : defaults.showSeconds,
      quickLinkPages: pages.length > 0 ? pages : deepCloneSettings(defaults).quickLinkPages,
      activePageIndex,
    };
  } catch {
    return deepCloneSettings(defaults);
  }
}

export function saveSettings(settings: Settings): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}
