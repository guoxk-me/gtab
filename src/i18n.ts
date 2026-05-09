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
      delete: "删除",
      rename: "重命名",
      confirm: "确认",
      search: "搜索",
      more: "更多",
      all: "全部",
      move: "移动到",
      noResults: "没有找到匹配的链接",
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
      openLinksManager: "打开链接管理器",
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
      showMore: "查看全部 {count} 个链接",
      pinned: "置顶",
    },
    theme: {
      selector: "主题切换",
    },
    linksManager: {
      title: "链接管理",
      groups: "分组",
      allLinks: "全部链接",
      ungrouped: "未分组",
      newGroup: "新建分组",
      groupName: "分组名称",
      addGroup: "添加分组",
      deleteGroup: "删除分组",
      deleteGroupConfirm: "确认删除分组「{name}」？其中的链接将移至未分组。",
      renameGroup: "重命名分组",
      moveToGroup: "移动到分组",
      searchLinks: "搜索链接...",
      addLink: "添加链接",
      linkCount: "{count} 个链接",
      pinToHome: "置顶到主页",
      unpinFromHome: "取消置顶",
      pinnedCount: "已置顶 {count}/12",
      pinLimitReached: "主页最多置顶 12 个链接",
      noLinksInGroup: "此分组暂无链接",
      dragToReorder: "拖拽可调整顺序",
    },
  },
  "en-US": {
    common: {
      cancel: "Cancel",
      save: "Save",
      add: "Add",
      merge: "Merge",
      replace: "Replace",
      delete: "Delete",
      rename: "Rename",
      confirm: "Confirm",
      search: "Search",
      more: "More",
      all: "All",
      move: "Move to",
      noResults: "No matching links found",
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
      openLinksManager: "Open links manager",
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
      showMore: "View all {count} links",
      pinned: "Pinned",
    },
    theme: {
      selector: "Theme selector",
    },
    linksManager: {
      title: "Links Manager",
      groups: "Groups",
      allLinks: "All Links",
      ungrouped: "Ungrouped",
      newGroup: "New Group",
      groupName: "Group name",
      addGroup: "Add group",
      deleteGroup: "Delete group",
      deleteGroupConfirm: 'Delete group "{name}"? Links will be moved to ungrouped.',
      renameGroup: "Rename group",
      moveToGroup: "Move to group",
      searchLinks: "Search links...",
      addLink: "Add link",
      linkCount: "{count} links",
      pinToHome: "Pin to home",
      unpinFromHome: "Unpin from home",
      pinnedCount: "{count}/12 pinned",
      pinLimitReached: "Home page limit is 12 pinned links",
      noLinksInGroup: "No links in this group",
      dragToReorder: "Drag to reorder",
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
