declare module "*.vue" {
  import type { DefineComponent } from "vue";

  const component: DefineComponent<object, object, unknown>;
  export default component;
}

interface ChromeRuntimeLastError {
  message: string;
}

interface ChromeRuntime {
  lastError?: ChromeRuntimeLastError;
}

interface ChromeBookmarkTreeNode {
  id: string;
  title?: string;
  url?: string;
  children?: ChromeBookmarkTreeNode[];
}

interface ChromeBookmarksApi {
  getTree(callback: (results: ChromeBookmarkTreeNode[]) => void): void;
}

interface Chrome {
  bookmarks: ChromeBookmarksApi;
  runtime?: ChromeRuntime;
}

declare const chrome: Chrome;
