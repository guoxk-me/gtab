import type { QuickLinkLink } from "./quickLinkItems";
import { normalizeHttpUrl } from "./quickLinkItems";

function getBookmarkName(title: string, url: string): string {
  const trimmedTitle = title.trim();
  if (trimmedTitle) return trimmedTitle;

  try {
    return new URL(url).hostname.replace(/^www\./, "") || url;
  } catch {
    return url;
  }
}

function flattenBookmarkTree(nodes: ChromeBookmarkTreeNode[]): QuickLinkLink[] {
  const links: QuickLinkLink[] = [];
  const seenUrls = new Set<string>();

  const visit = (node: ChromeBookmarkTreeNode) => {
    const normalizedUrl = node.url ? normalizeHttpUrl(node.url) : null;
    if (normalizedUrl && !seenUrls.has(normalizedUrl)) {
      seenUrls.add(normalizedUrl);
      links.push({
        id: `bookmark-${node.id}`,
        type: "link",
        name: getBookmarkName(node.title ?? "", normalizedUrl),
        url: normalizedUrl,
      });
    }

    node.children?.forEach(visit);
  };

  nodes.forEach(visit);

  return links;
}

function getBookmarkTree(): Promise<ChromeBookmarkTreeNode[]> {
  return new Promise((resolve, reject) => {
    if (!isBookmarksApiAvailable()) {
      reject(new Error("Bookmarks API is unavailable"));
      return;
    }

    chrome.bookmarks.getTree((nodes) => {
      const runtimeError = chrome.runtime?.lastError;
      if (runtimeError) {
        reject(new Error(runtimeError.message));
        return;
      }

      resolve(nodes);
    });
  });
}

export function isBookmarksApiAvailable(): boolean {
  return typeof chrome !== "undefined" && typeof chrome.bookmarks?.getTree === "function";
}

export async function importBrowserBookmarks(): Promise<QuickLinkLink[]> {
  const tree = await getBookmarkTree();
  return flattenBookmarkTree(tree);
}
