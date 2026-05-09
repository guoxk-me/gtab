export interface QuickLink {
  id: string;
  name: string;
  url: string;
}

export interface LinkGroup {
  id: string;
  name: string;
  linkIds: string[];
}

export type LanguageSetting = "auto" | "zh-CN" | "en-US";

export interface Settings {
  language: LanguageSetting;
  searchEngine: "google" | "bing" | "baidu" | "duckduckgo";
  showClock: boolean;
  showSeconds: boolean;
  quickLinks: QuickLink[];
  linkGroups: LinkGroup[];
  pinnedLinkIds: string[];
}

const STORAGE_KEY = "gtab_settings";
export const HOME_PIN_LIMIT = 12;

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
  linkGroups: [],
  pinnedLinkIds: [],
};

function normalizeHttpUrl(raw: string): string | null {
  const value = raw.trim();
  if (!value) return null;

  const candidate = /^https?:\/\//i.test(value) ? value : `https://${value}`;

  try {
    const url = new URL(candidate);
    return /^https?:$/.test(url.protocol) ? url.toString() : null;
  } catch {
    return null;
  }
}

function normalizeQuickLinks(links: QuickLink[]): QuickLink[] {
  const seenIds = new Set<string>();

  return links.reduce<QuickLink[]>((result, link) => {
    const id = link.id?.trim();
    const name = link.name?.trim();
    const url = normalizeHttpUrl(link.url);
    if (!id || !name || !url || seenIds.has(id)) return result;

    seenIds.add(id);
    result.push({ id, name, url });
    return result;
  }, []);
}

export function normalizeSettings(raw: Settings): Settings {
  const quickLinks = normalizeQuickLinks(raw.quickLinks);
  const validIds = new Set(quickLinks.map((link) => link.id));

  const linkGroups = raw.linkGroups.reduce<LinkGroup[]>((result, group) => {
    const id = group.id?.trim();
    const name = group.name?.trim();
    if (!id || !name) return result;

    const seenLinkIds = new Set<string>();
    const linkIds = group.linkIds.filter((linkId) => {
      const isValid = validIds.has(linkId) && !seenLinkIds.has(linkId);
      if (isValid) seenLinkIds.add(linkId);
      return isValid;
    });

    result.push({ id, name, linkIds });
    return result;
  }, []);

  const seenPinnedIds = new Set<string>();
  const pinnedLinkIds = raw.pinnedLinkIds.filter((linkId) => {
    const isValid = validIds.has(linkId) && !seenPinnedIds.has(linkId);
    if (isValid) seenPinnedIds.add(linkId);
    return isValid;
  });

  return {
    language: raw.language,
    searchEngine: raw.searchEngine,
    showClock: raw.showClock,
    showSeconds: raw.showSeconds,
    quickLinks,
    linkGroups,
    pinnedLinkIds: pinnedLinkIds.slice(0, HOME_PIN_LIMIT),
  };
}

/**
 * Migrate legacy settings that lack linkGroups / pinnedLinkIds.
 * Creates a default group from all quickLinks and pins the first HOME_PIN_LIMIT links.
 */
function migrate(raw: Partial<Settings>): Settings {
  const quickLinks = raw.quickLinks ?? defaults.quickLinks;

  let linkGroups = raw.linkGroups;
  if (!linkGroups || linkGroups.length === 0) {
    linkGroups = [
      {
        id: "group-default",
        name: "默认",
        linkIds: quickLinks.map((l) => l.id),
      },
    ];
  }

  let pinnedLinkIds = raw.pinnedLinkIds;
  if (!pinnedLinkIds || pinnedLinkIds.length === 0) {
    pinnedLinkIds = quickLinks.slice(0, HOME_PIN_LIMIT).map((l) => l.id);
  }

  return normalizeSettings({
    language: raw.language ?? defaults.language,
    searchEngine: raw.searchEngine ?? defaults.searchEngine,
    showClock: raw.showClock ?? defaults.showClock,
    showSeconds: raw.showSeconds ?? defaults.showSeconds,
    quickLinks,
    linkGroups,
    pinnedLinkIds,
  });
}

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return migrate({});
    return migrate(JSON.parse(raw) as Partial<Settings>);
  } catch {
    return migrate({});
  }
}

export function saveSettings(settings: Settings): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizeSettings(settings)));
}
