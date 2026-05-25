export interface QuickLinkLink {
  id: string;
  type: "link";
  name: string;
  url: string;
}

export interface QuickLinkFolder {
  id: string;
  type: "folder";
  name: string;
  links: QuickLinkLink[];
}

export type QuickLinkItem = QuickLinkLink | QuickLinkFolder;

export function isQuickLinkLink(item: QuickLinkItem): item is QuickLinkLink {
  return item.type === "link";
}

export function isQuickLinkFolder(item: QuickLinkItem): item is QuickLinkFolder {
  return item.type === "folder";
}

export function createQuickLinkId(prefix = "link"): string {
  return typeof crypto.randomUUID === "function"
    ? `${prefix}-${crypto.randomUUID()}`
    : `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function normalizeHttpUrl(raw: string): string | null {
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

export function cloneQuickLinkItems(items: QuickLinkItem[]): QuickLinkItem[] {
  return items.map((item) =>
    isQuickLinkFolder(item)
      ? {
          ...item,
          links: item.links.map((link) => ({ ...link })),
        }
      : { ...item },
  );
}

function sanitizeLink(link: Partial<QuickLinkLink>, seenUrls: Set<string>): QuickLinkLink | null {
  const name = typeof link.name === "string" ? link.name.trim() : "";
  const url = typeof link.url === "string" ? normalizeHttpUrl(link.url) : null;
  if (!name || !url || seenUrls.has(url)) return null;

  seenUrls.add(url);
  return {
    id: typeof link.id === "string" && link.id ? link.id : createQuickLinkId(),
    type: "link",
    name,
    url,
  };
}

export function sanitizeQuickLinkLinks(
  links: Partial<QuickLinkLink>[],
  seenUrls = new Set<string>(),
): QuickLinkLink[] {
  return links.reduce<QuickLinkLink[]>((result, link) => {
    const nextLink = sanitizeLink(link, seenUrls);
    if (nextLink) result.push(nextLink);
    return result;
  }, []);
}

export function sanitizeQuickLinkItems(items: Partial<QuickLinkItem>[]): QuickLinkItem[] {
  const seenUrls = new Set<string>();

  return items.reduce<QuickLinkItem[]>((result, item) => {
    if (!item || typeof item !== "object") return result;

    if (Array.isArray((item as QuickLinkFolder).links)) {
      const name = typeof item.name === "string" && item.name.trim() ? item.name.trim() : "Folder";
      const links = sanitizeQuickLinkLinks((item as QuickLinkFolder).links, seenUrls);
      if (links.length === 0) return result;

      result.push({
        id: typeof item.id === "string" && item.id ? item.id : createQuickLinkId("folder"),
        type: "folder",
        name,
        links,
      });
      return result;
    }

    const nextLink = sanitizeLink(item as Partial<QuickLinkLink>, seenUrls);
    if (nextLink) result.push(nextLink);
    return result;
  }, []);
}

export function normalizeQuickLinkItems(raw: unknown): QuickLinkItem[] {
  if (!Array.isArray(raw)) return [];

  const items = raw.flatMap<Partial<QuickLinkItem>>((entry) => {
    if (!entry || typeof entry !== "object") return [];

    const record = entry as Record<string, unknown>;
    if (Array.isArray(record.links)) {
      return [
        {
          id: typeof record.id === "string" ? record.id : createQuickLinkId("folder"),
          type: "folder",
          name: typeof record.name === "string" ? record.name : "Folder",
          links: record.links,
        } satisfies Partial<QuickLinkFolder>,
      ];
    }

    if (typeof record.url === "string") {
      return [
        {
          id: typeof record.id === "string" ? record.id : createQuickLinkId(),
          type: "link",
          name: typeof record.name === "string" ? record.name : "",
          url: record.url,
        } satisfies Partial<QuickLinkLink>,
      ];
    }

    return [];
  });

  return sanitizeQuickLinkItems(items);
}

export function reorderQuickLinkItems(
  items: QuickLinkItem[],
  fromIndex: number,
  toIndex: number,
): QuickLinkItem[] {
  if (
    fromIndex === toIndex ||
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= items.length ||
    toIndex >= items.length
  ) {
    return items;
  }

  const nextItems = [...items];
  const [movedItem] = nextItems.splice(fromIndex, 1);
  nextItems.splice(toIndex, 0, movedItem);
  return nextItems;
}

export function reorderQuickLinkFolderLinks(
  items: QuickLinkItem[],
  folderId: string,
  linkId: string,
  toIndex: number,
): QuickLinkItem[] {
  const nextItems = cloneQuickLinkItems(items);
  const folder = nextItems.find((item) => item.id === folderId);
  if (!folder || !isQuickLinkFolder(folder)) return items;

  const fromIndex = folder.links.findIndex((link) => link.id === linkId);
  if (
    fromIndex === toIndex ||
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= folder.links.length ||
    toIndex >= folder.links.length
  ) {
    return items;
  }

  folder.links = reorderQuickLinkItems(folder.links, fromIndex, toIndex) as QuickLinkLink[];
  return sanitizeQuickLinkItems(nextItems);
}

export function moveQuickLinkItemIntoTarget(
  items: QuickLinkItem[],
  draggedId: string,
  targetId: string,
  folderName: string,
): QuickLinkItem[] {
  if (draggedId === targetId) return items;

  const nextItems = cloneQuickLinkItems(items);
  const draggedIndex = nextItems.findIndex((item) => item.id === draggedId);
  const targetIndex = nextItems.findIndex((item) => item.id === targetId);
  if (draggedIndex < 0 || targetIndex < 0) return items;

  const draggedItem = nextItems[draggedIndex];
  const targetItem = nextItems[targetIndex];
  if (!draggedItem || !targetItem) return items;

  if (!isQuickLinkLink(draggedItem)) return items;
  if (isQuickLinkFolder(targetItem)) {
    targetItem.links = sanitizeQuickLinkLinks([...targetItem.links, draggedItem]);
    nextItems.splice(draggedIndex, 1);
    return sanitizeQuickLinkItems(nextItems);
  }

  nextItems.splice(Math.max(draggedIndex, targetIndex), 1);
  nextItems.splice(Math.min(draggedIndex, targetIndex), 1);
  nextItems.splice(Math.min(draggedIndex, targetIndex), 0, {
    id: createQuickLinkId("folder"),
    type: "folder",
    name: folderName.trim() || "Folder",
    links: sanitizeQuickLinkLinks([targetItem, draggedItem]),
  });

  return sanitizeQuickLinkItems(nextItems);
}

export function moveQuickLinkOutOfFolder(
  items: QuickLinkItem[],
  folderId: string,
  linkId: string,
  toIndex: number,
): QuickLinkItem[] {
  const nextItems = cloneQuickLinkItems(items);
  const folderIndex = nextItems.findIndex((item) => item.id === folderId);
  const folder = nextItems[folderIndex];
  if (!folder || !isQuickLinkFolder(folder)) return items;

  const linkIndex = folder.links.findIndex((link) => link.id === linkId);
  const movedLink = folder.links[linkIndex];
  if (!movedLink) return items;

  folder.links.splice(linkIndex, 1);
  if (folder.links.length === 0) {
    nextItems.splice(folderIndex, 1);
  }

  const safeIndex = Math.min(Math.max(toIndex, 0), nextItems.length);
  nextItems.splice(safeIndex, 0, movedLink);
  return sanitizeQuickLinkItems(nextItems);
}

export function moveFolderLinkIntoTarget(
  items: QuickLinkItem[],
  folderId: string,
  linkId: string,
  targetId: string,
  folderName: string,
): QuickLinkItem[] {
  if (linkId === targetId) return items;

  const topLevelItems = moveQuickLinkOutOfFolder(items, folderId, linkId, items.length);
  if (topLevelItems === items) return items;

  return moveQuickLinkItemIntoTarget(topLevelItems, linkId, targetId, folderName);
}
