import type { QuickLinkLink, QuickLinkPage } from "./quickLinkItems";
import {
  cloneQuickLinkItems,
  createQuickLinkId,
  isQuickLinkFolder,
  moveQuickLinkItemIntoTarget,
  moveQuickLinkOutOfFolder,
  reorderQuickLinkFolderLinks,
  reorderQuickLinkItems,
  sanitizeQuickLinkItems,
} from "./quickLinkItems";

export function createPage(name: string): QuickLinkPage {
  const trimmed = name.trim();
  return {
    id: createQuickLinkId("page"),
    name: trimmed || "New Page",
    items: [],
  };
}

export function reorderPages(
  pages: QuickLinkPage[],
  fromIndex: number,
  toIndex: number,
): QuickLinkPage[] {
  if (
    fromIndex === toIndex ||
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= pages.length ||
    toIndex >= pages.length
  ) {
    return pages;
  }

  const next = [...pages];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  return next;
}

// --- Page-scoped wrappers (delegate to existing flat-array functions) ---

export function reorderLinksInPage(
  page: QuickLinkPage,
  fromIndex: number,
  toIndex: number,
): QuickLinkPage {
  const items = reorderQuickLinkItems(page.items, fromIndex, toIndex);
  if (items === page.items) return page;
  return { ...page, items };
}

export function reorderFolderLinksInPage(
  page: QuickLinkPage,
  folderId: string,
  linkId: string,
  toIndex: number,
): QuickLinkPage {
  const items = reorderQuickLinkFolderLinks(page.items, folderId, linkId, toIndex);
  if (items === page.items) return page;
  return { ...page, items };
}

export function groupLinksInPage(
  page: QuickLinkPage,
  draggedId: string,
  targetId: string,
  folderName: string,
): QuickLinkPage {
  const items = moveQuickLinkItemIntoTarget(page.items, draggedId, targetId, folderName);
  if (items === page.items) return page;
  return { ...page, items };
}

export function moveLinkOutOfFolderInPage(
  page: QuickLinkPage,
  folderId: string,
  linkId: string,
  toIndex: number,
): QuickLinkPage {
  const items = moveQuickLinkOutOfFolder(page.items, folderId, linkId, toIndex);
  if (items === page.items) return page;
  return { ...page, items };
}

export function addLinkToPage(page: QuickLinkPage, link: QuickLinkLink): QuickLinkPage {
  return {
    ...page,
    items: sanitizeQuickLinkItems([...page.items, link]),
  };
}

export function addLinksToPage(page: QuickLinkPage, links: QuickLinkLink[]): QuickLinkPage {
  if (links.length === 0) return page;
  return {
    ...page,
    items: sanitizeQuickLinkItems([...page.items, ...links]),
  };
}

export function removeLinkFromPage(page: QuickLinkPage, linkId: string): QuickLinkPage {
  const items = page.items.filter((item) => {
    if (item.id === linkId) return false;
    if (isQuickLinkFolder(item)) {
      return item.links.some((link) => link.id === linkId) ? false : true;
    }
    return true;
  });
  if (items === page.items) return page;
  return { ...page, items };
}

export function moveLinkBetweenPages(
  pages: QuickLinkPage[],
  linkId: string,
  fromPageId: string,
  toPageId: string,
): QuickLinkPage[] {
  if (fromPageId === toPageId) return pages;

  const fromIndex = pages.findIndex((p) => p.id === fromPageId);
  const toIndex = pages.findIndex((p) => p.id === toPageId);
  if (fromIndex < 0 || toIndex < 0) return pages;

  const fromPage = pages[fromIndex];
  const toPage = pages[toIndex];

  // Find the link to move — could be top-level or inside a folder
  let movedLink: QuickLinkLink | null = null;

  for (const item of fromPage.items) {
    if (isQuickLinkFolder(item)) {
      const idx = item.links.findIndex((l) => l.id === linkId);
      if (idx >= 0) {
        movedLink = { ...item.links[idx] };
        break;
      }
    } else if (item.id === linkId) {
      movedLink = { ...item };
      break;
    }
  }

  if (!movedLink) return pages;

  const next = [...pages];
  next[fromIndex] = removeLinkFromPage(fromPage, linkId);
  next[toIndex] = addLinkToPage(toPage, movedLink);
  return next;
}

export function sanitizePage(page: QuickLinkPage): QuickLinkPage {
  const items = sanitizeQuickLinkItems(cloneQuickLinkItems(page.items));
  if (items === page.items) return page;
  return { ...page, items };
}
