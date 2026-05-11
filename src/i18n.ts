import { createI18n } from "vue-i18n";
import type { LanguageSetting } from "./composables/useStorage";

export const supportedLocales = ["zh-CN", "en-US"] as const;
export type AppLocale = (typeof supportedLocales)[number];

const messages = {
  "zh-CN": {
    common: {
      cancel: "取消",
      save: "保存",
      add: "添加",
      merge: "合并",
      replace: "替换",
    },
    appearance: {
      title: "外观",
      dark: "深色",
      light: "浅色",
      system: "跟随系统",
    },
    language: {
      title: "语言",
      auto: "跟随浏览器",
      zhCN: "中文",
      enUS: "English",
    },
    settings: {
      title: "设置",
      open: "打开设置",
      searchEngine: "搜索引擎",
      clock: "时钟",
      quickLinks: "快捷链接",
      importBookmarks: "导入浏览器收藏夹",
      importUnavailable: "当前环境不支持直接读取浏览器收藏夹。",
      importMode: "导入方式",
      importSuccess: "已导入 {count} 个收藏。",
      importEmpty: "没有找到可导入的网页收藏。",
      importError: "导入失败：{message}",
      manageLinks: "管理链接",
      showClock: "显示时钟",
      showSeconds: "显示秒钟",
      addLink: "添加链接",
      linkName: "名称",
      linkUrl: "链接（例如 github.com）",
      removeLink: "删除链接",
      moveUp: "上移",
      moveDown: "下移",
    },
    search: {
      placeholder: "搜索...",
      submit: "搜索",
    },
    quickLinks: {
      edit: "编辑链接",
    },
    theme: {
      selector: "主题切换",
    },
  },
  "en-US": {
    common: {
      cancel: "Cancel",
      save: "Save",
      add: "Add",
      merge: "Merge",
      replace: "Replace",
    },
    appearance: {
      title: "Appearance",
      dark: "Dark",
      light: "Light",
      system: "System",
    },
    language: {
      title: "Language",
      auto: "Browser Default",
      zhCN: "中文",
      enUS: "English",
    },
    settings: {
      title: "Settings",
      open: "Open settings",
      searchEngine: "Search Engine",
      clock: "Clock",
      quickLinks: "Quick Links",
      importBookmarks: "Import browser bookmarks",
      importUnavailable: "Browser bookmark import is unavailable in this environment.",
      importMode: "Import mode",
      importSuccess: "Imported {count} bookmarks.",
      importEmpty: "No webpage bookmarks were found to import.",
      importError: "Import failed: {message}",
      manageLinks: "Manage links",
      showClock: "Show clock",
      showSeconds: "Show seconds",
      addLink: "Add link",
      linkName: "Name",
      linkUrl: "URL (e.g. github.com)",
      removeLink: "Remove link",
      moveUp: "Move up",
      moveDown: "Move down",
    },
    search: {
      placeholder: "Search...",
      submit: "Search",
    },
    quickLinks: {
      edit: "Edit links",
    },
    theme: {
      selector: "Theme selector",
    },
  },
} as const;

function detectBrowserLocale(): AppLocale {
  if (typeof navigator !== "undefined" && navigator.language.toLowerCase().startsWith("zh")) {
    return "zh-CN";
  }

  return "en-US";
}

function applyDocumentLocale(locale: AppLocale): void {
  if (typeof document !== "undefined") {
    document.documentElement.lang = locale;
  }
}

export function resolveLocale(language: LanguageSetting): AppLocale {
  return language === "auto" ? detectBrowserLocale() : language;
}

export function setLocale(language: LanguageSetting): AppLocale {
  const locale = resolveLocale(language);
  i18n.global.locale.value = locale;
  applyDocumentLocale(locale);
  return locale;
}

export const i18n = createI18n({
  legacy: false,
  locale: resolveLocale("auto"),
  fallbackLocale: "en-US",
  messages,
});

applyDocumentLocale(i18n.global.locale.value);
