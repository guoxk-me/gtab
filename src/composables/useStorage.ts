export interface QuickLink {
  id: string;
  name: string;
  url: string;
  icon?: string;
}

export interface Settings {
  searchEngine: "google" | "bing" | "baidu" | "duckduckgo";
  showClock: boolean;
  showSeconds: boolean;
  quickLinks: QuickLink[];
}

const STORAGE_KEY = "gtab_settings";

const defaults: Settings = {
  searchEngine: "google",
  showClock: true,
  showSeconds: true,
  quickLinks: [
    { id: "1", name: "GitHub", url: "https://github.com", icon: "https://github.com/favicon.ico" },
    { id: "2", name: "YouTube", url: "https://youtube.com", icon: "https://youtube.com/favicon.ico" },
    { id: "3", name: "Gmail", url: "https://mail.google.com", icon: "https://mail.google.com/favicon.ico" },
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
