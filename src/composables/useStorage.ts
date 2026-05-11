export interface QuickLink {
  id: string;
  name: string;
  url: string;
}

export type LanguageSetting = "auto" | "zh-CN" | "en-US";

export interface Settings {
  language: LanguageSetting;
  searchEngine: "google" | "bing" | "baidu" | "duckduckgo";
  showClock: boolean;
  showSeconds: boolean;
  quickLinks: QuickLink[];
}

const STORAGE_KEY = "gtab_settings";

const defaults: Settings = {
  language: "auto",
  searchEngine: "google",
  showClock: true,
  showSeconds: true,
  quickLinks: [
    { id: "1", name: "GitHub", url: "https://github.com" },
    { id: "2", name: "YouTube", url: "https://youtube.com" },
    { id: "3", name: "Gmail", url: "https://mail.google.com" },
  ],
};

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...defaults };
    return { ...defaults, ...JSON.parse(raw) };
  } catch {
    return { ...defaults };
  }
}

export function saveSettings(settings: Settings): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}
