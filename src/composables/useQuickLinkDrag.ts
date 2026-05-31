import { computed, shallowRef } from "vue";
import {
  cloneQuickLinkItems,
  isQuickLinkFolder,
  isQuickLinkLink,
  reorderQuickLinkItems,
} from "./quickLinkItems";
import type { QuickLinkItem, QuickLinkLink } from "./quickLinkItems";

type DragMode = "reorder" | "group" | "folder-reorder";

interface DragPointerPosition {
  pointerId: number;
  clientX: number;
  clientY: number;
}

interface DropTargetSnapshot {
  id: string;
  rect: DOMRect;
  iconRect?: DOMRect;
}

export type QuickLinkDragSource =
  | { type: "top-level"; itemId: string }
  | { type: "folder-link"; folderId: string; link: QuickLinkLink };

interface UseQuickLinkDragOptions {
  getLinks: () => QuickLinkItem[];
  onDragFolderLinkStart?: () => void;
  onGroup: (source: QuickLinkDragSource, targetId: string) => void;
  onReorderFolderLink: (folderId: string, linkId: string, toIndex: number) => void;
  onReorder: (source: QuickLinkDragSource, toIndex: number) => void;
}

type PendingDragSource =
  | { type: "top-level"; index: number }
  | { type: "folder-link"; folderId: string; link: QuickLinkLink };

const dragStartDistancePx = 5;
const dropBoundaryPaddingPx = 36;
const groupZoneWidthRatio = 0.72;
const groupZoneHeightRatio = 0.72;
const groupIconZonePaddingPx = 16;
const ghostEdgeInsetPx = 44;
const nearestSnapRadiusPx = 92;
const suppressClickDurationMs = 250;

export function useQuickLinkDrag(options: UseQuickLinkDragOptions) {
  const suppressClickUntil = shallowRef(0);
  const activePointerId = shallowRef<number | null>(null);
  const draggedId = shallowRef<string | null>(null);
  const dragSource = shallowRef<QuickLinkDragSource | null>(null);
  const previewLinks = shallowRef<QuickLinkItem[]>([]);
  const previewFolderLinks = shallowRef<QuickLinkLink[]>([]);
  const hoverTargetId = shallowRef<string | null>(null);
  const dropMode = shallowRef<DragMode | null>(null);
  const isDragging = shallowRef(false);
  const ghostX = shallowRef(0);
  const ghostY = shallowRef(0);

  let pendingPointerMove: DragPointerPosition | null = null;
  let pendingDragSource: PendingDragSource | null = null;
  let pointerMoveFrame = 0;
  let dropTargetSnapshots: DropTargetSnapshot[] = [];
  let dragStartX = 0;
  let dragStartY = 0;

  const displayLinks = computed(() => (isDragging.value ? previewLinks.value : options.getLinks()));
  const displayFolderLinks = computed(() => previewFolderLinks.value);
  const draggedItem = computed(
    () =>
      previewLinks.value.find((item) => item.id === draggedId.value) ??
      previewFolderLinks.value.find((item) => item.id === draggedId.value) ??
      null,
  );
  const ghostStyle = computed(() => ({
    transform: `translate3d(${ghostX.value}px, ${ghostY.value}px, 0) translate(-50%, -50%) rotate(3deg) scale(1.05)`,
  }));

  function cancelPointerMoveFrame() {
    if (pointerMoveFrame) {
      window.cancelAnimationFrame(pointerMoveFrame);
      pointerMoveFrame = 0;
    }

    pendingPointerMove = null;
  }

  function resetDropTargetSnapshots() {
    dropTargetSnapshots = [];
  }

  function readDropTargetSnapshot(element: HTMLElement): DropTargetSnapshot | null {
    const id = element.dataset.quickLinkId;
    if (!id) return null;

    return {
      id,
      rect: element.getBoundingClientRect(),
      iconRect: element
        .querySelector<HTMLElement>("[data-quick-link-icon-hitbox]")
        ?.getBoundingClientRect(),
    };
  }

  function refreshDropTargetSnapshots() {
    const activePage = document.querySelector<HTMLElement>('[data-quick-link-page="active"]');
    const root = activePage ?? document;
    dropTargetSnapshots = Array.from(
      root.querySelectorAll<HTMLElement>("[data-quick-link-id]"),
    ).flatMap((element) => {
      const snapshot = readDropTargetSnapshot(element);
      return snapshot ? [snapshot] : [];
    });
  }

  function cancelPendingDrag() {
    if (isDragging.value) return;
    pendingDragSource = null;
    activePointerId.value = null;
  }

  function resetDragState() {
    cancelPointerMoveFrame();
    pendingDragSource = null;
    activePointerId.value = null;
    draggedId.value = null;
    dragSource.value = null;
    hoverTargetId.value = null;
    dropMode.value = null;
    isDragging.value = false;
    previewLinks.value = [];
    previewFolderLinks.value = [];
    resetDropTargetSnapshots();
  }

  function getCurrentDropTargetIndex() {
    return previewLinks.value.findIndex((item) => item.id === draggedId.value);
  }

  function getCurrentFolderDropTargetIndex() {
    return previewFolderLinks.value.findIndex((link) => link.id === draggedId.value);
  }

  function finishDrag(commit = true) {
    if (isDragging.value) {
      suppressClickUntil.value = window.performance.now() + suppressClickDurationMs;

      if (commit && dragSource.value && hoverTargetId.value && dropMode.value) {
        if (dropMode.value === "group") {
          options.onGroup(dragSource.value, hoverTargetId.value);
        } else if (dropMode.value === "folder-reorder" && dragSource.value.type === "folder-link") {
          const toIndex = getCurrentFolderDropTargetIndex();
          if (toIndex >= 0) {
            options.onReorderFolderLink(
              dragSource.value.folderId,
              dragSource.value.link.id,
              toIndex,
            );
          }
        } else {
          const toIndex = getCurrentDropTargetIndex();
          if (toIndex >= 0) options.onReorder(dragSource.value, toIndex);
        }
      }
    }

    resetDragState();
  }

  function updatePreviewInsertion(targetId: string, placeAfter: boolean) {
    const fromIndex = previewLinks.value.findIndex((item) => item.id === draggedId.value);
    const targetIndex = previewLinks.value.findIndex((item) => item.id === targetId);
    if (fromIndex < 0 || targetIndex < 0) return;

    const toIndex = placeAfter
      ? fromIndex < targetIndex
        ? targetIndex
        : targetIndex + 1
      : fromIndex < targetIndex
        ? targetIndex - 1
        : targetIndex;

    if (toIndex < 0 || toIndex >= previewLinks.value.length || fromIndex === toIndex) return;

    previewLinks.value = reorderQuickLinkItems(previewLinks.value, fromIndex, toIndex);
    window.requestAnimationFrame(refreshDropTargetSnapshots);
  }

  function updatePreviewFolderInsertion(targetId: string, placeAfter: boolean) {
    const fromIndex = previewFolderLinks.value.findIndex((link) => link.id === draggedId.value);
    const targetIndex = previewFolderLinks.value.findIndex((link) => link.id === targetId);
    if (fromIndex < 0 || targetIndex < 0) return;

    const toIndex = placeAfter
      ? fromIndex < targetIndex
        ? targetIndex
        : targetIndex + 1
      : fromIndex < targetIndex
        ? targetIndex - 1
        : targetIndex;

    if (toIndex < 0 || toIndex >= previewFolderLinks.value.length || fromIndex === toIndex) {
      return;
    }

    previewFolderLinks.value = reorderQuickLinkItems(
      previewFolderLinks.value,
      fromIndex,
      toIndex,
    ) as QuickLinkLink[];
    window.requestAnimationFrame(refreshDropTargetSnapshots);
  }

  function createFolderLinkPreview(folderId: string, link: QuickLinkLink): QuickLinkItem[] {
    const nextItems = cloneQuickLinkItems(options.getLinks());
    const folderIndex = nextItems.findIndex((item) => item.id === folderId);
    const folder = nextItems[folderIndex];
    if (!folder || !isQuickLinkFolder(folder)) return nextItems;

    folder.links = folder.links.filter((folderLink) => folderLink.id !== link.id);
    if (folder.links.length === 0) {
      nextItems.splice(folderIndex, 1);
      nextItems.splice(folderIndex, 0, { ...link });
      return nextItems;
    }

    if (folder.links.length === 1) {
      const [remainingLink] = folder.links;
      if (remainingLink) {
        nextItems.splice(folderIndex, 1, { ...remainingLink });
        nextItems.splice(folderIndex + 1, 0, { ...link });
        return nextItems;
      }
    }

    nextItems.splice(folderIndex + 1, 0, { ...link });
    return nextItems;
  }

  function createFolderLinksPreview(folderId: string): QuickLinkLink[] {
    const folder = options.getLinks().find((item) => item.id === folderId);
    return folder && isQuickLinkFolder(folder) ? folder.links.map((link) => ({ ...link })) : [];
  }

  function getDirectFolderDropTarget(x: number, y: number): DropTargetSnapshot | null {
    const element = document
      .elementFromPoint(x, y)
      ?.closest<HTMLElement>("[data-quick-link-folder-link-id]");
    const id = element?.dataset.quickLinkFolderLinkId;
    if (!element || !id) return null;

    return {
      id,
      rect: element.getBoundingClientRect(),
    };
  }

  function isInsideOpenFolderPanel(x: number, y: number): boolean {
    const panel = document.querySelector<HTMLElement>("[data-quick-link-folder-panel]");
    if (!panel) return false;

    return isInsideRect(x, y, panel.getBoundingClientRect());
  }

  function switchFolderLinkDragToTopLevel() {
    if (!dragSource.value || dragSource.value.type !== "folder-link") return;

    previewFolderLinks.value = [];
    previewLinks.value = createFolderLinkPreview(dragSource.value.folderId, dragSource.value.link);
    hoverTargetId.value = dragSource.value.link.id;
    dropMode.value = "reorder";
    options.onDragFolderLinkStart?.();
    window.requestAnimationFrame(refreshDropTargetSnapshots);
  }

  function shouldPlaceAfterTarget(pointer: DragPointerPosition, rect: DOMRect): boolean {
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const deltaX = pointer.clientX - centerX;
    const deltaY = pointer.clientY - centerY;
    const rowThreshold = rect.height * 0.4;

    return Math.abs(deltaY) < rowThreshold ? deltaX >= 0 : deltaY > 0;
  }

  function isInsideRect(x: number, y: number, rect: DOMRect): boolean {
    return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
  }

  function clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max);
  }

  function updateGhostPosition(x: number, y: number) {
    ghostX.value = clamp(
      x,
      ghostEdgeInsetPx,
      Math.max(ghostEdgeInsetPx, window.innerWidth - ghostEdgeInsetPx),
    );
    ghostY.value = clamp(
      y,
      ghostEdgeInsetPx,
      Math.max(ghostEdgeInsetPx, window.innerHeight - ghostEdgeInsetPx),
    );
  }

  function hasPassedDragStartDistance(x: number, y: number): boolean {
    return Math.hypot(x - dragStartX, y - dragStartY) >= dragStartDistancePx;
  }

  function isInsideDropBoundary(x: number, y: number): boolean {
    if (dropTargetSnapshots.length === 0) return false;

    const bounds = dropTargetSnapshots.reduce(
      (result, target) => ({
        left: Math.min(result.left, target.rect.left),
        right: Math.max(result.right, target.rect.right),
        top: Math.min(result.top, target.rect.top),
        bottom: Math.max(result.bottom, target.rect.bottom),
      }),
      {
        left: Infinity,
        right: -Infinity,
        top: Infinity,
        bottom: -Infinity,
      },
    );

    return (
      x >= bounds.left - dropBoundaryPaddingPx &&
      x <= bounds.right + dropBoundaryPaddingPx &&
      y >= bounds.top - dropBoundaryPaddingPx &&
      y <= bounds.bottom + dropBoundaryPaddingPx
    );
  }

  function isInsideGroupZone(x: number, y: number, rect: DOMRect, iconRect?: DOMRect): boolean {
    if (iconRect) {
      const iconZone = {
        left: iconRect.left - groupIconZonePaddingPx,
        right: iconRect.right + groupIconZonePaddingPx,
        top: iconRect.top - groupIconZonePaddingPx,
        bottom: iconRect.bottom + groupIconZonePaddingPx,
      };

      if (x >= iconZone.left && x <= iconZone.right && y >= iconZone.top && y <= iconZone.bottom) {
        return true;
      }
    }

    const zoneWidth = rect.width * groupZoneWidthRatio;
    const zoneHeight = rect.height * groupZoneHeightRatio;
    const left = rect.left + (rect.width - zoneWidth) / 2;
    const top = rect.top + (rect.height - zoneHeight) / 2;

    return x >= left && x <= left + zoneWidth && y >= top && y <= top + zoneHeight;
  }

  function findNearestDropTarget(x: number, y: number): DropTargetSnapshot | null {
    if (!isInsideDropBoundary(x, y)) return null;

    let nearest: DropTargetSnapshot | null = null;
    let minDistance = Infinity;

    for (const target of dropTargetSnapshots) {
      if (target.id === draggedId.value) continue;

      const centerX = target.rect.left + target.rect.width / 2;
      const centerY = target.rect.top + target.rect.height / 2;
      const distance = Math.hypot(x - centerX, y - centerY);
      if (distance < minDistance) {
        minDistance = distance;
        nearest = target;
      }
    }

    return minDistance <= nearestSnapRadiusPx ? nearest : null;
  }

  function getDirectDropTarget(x: number, y: number): DropTargetSnapshot | null {
    const element = document.elementFromPoint(x, y)?.closest<HTMLElement>("[data-quick-link-id]");

    return element ? readDropTargetSnapshot(element) : null;
  }

  function processPointerMove(pointer: DragPointerPosition) {
    if (activePointerId.value !== pointer.pointerId || !isDragging.value || !draggedId.value)
      return;

    updateGhostPosition(pointer.clientX, pointer.clientY);

    if (dropMode.value === "folder-reorder" && dragSource.value?.type === "folder-link") {
      const folderTarget = getDirectFolderDropTarget(pointer.clientX, pointer.clientY);
      if (folderTarget) {
        const targetId = folderTarget.id;
        if (targetId === draggedId.value) {
          hoverTargetId.value = draggedId.value;
          return;
        }

        hoverTargetId.value = targetId;
        updatePreviewFolderInsertion(targetId, shouldPlaceAfterTarget(pointer, folderTarget.rect));
        return;
      }

      if (!isInsideOpenFolderPanel(pointer.clientX, pointer.clientY)) {
        switchFolderLinkDragToTopLevel();
      } else {
        hoverTargetId.value = null;
        return;
      }
    }

    const directTarget = getDirectDropTarget(pointer.clientX, pointer.clientY);
    const hoveredTarget = directTarget ?? findNearestDropTarget(pointer.clientX, pointer.clientY);
    if (!hoveredTarget) {
      if (dragSource.value?.type === "folder-link" && dropMode.value === "reorder") {
        hoverTargetId.value = draggedId.value;
        return;
      }
      hoverTargetId.value = null;
      dropMode.value = null;
      return;
    }

    const targetId = hoveredTarget.id;
    if (targetId === draggedId.value) {
      hoverTargetId.value = draggedId.value;
      dropMode.value = "reorder";
      return;
    }

    const targetItem = previewLinks.value.find((item) => item.id === targetId) ?? null;
    const draggedLink = previewLinks.value.find((item) => item.id === draggedId.value) ?? null;
    const canGroup =
      !!draggedLink &&
      !!targetItem &&
      isQuickLinkLink(draggedLink) &&
      (isQuickLinkLink(targetItem) || isQuickLinkFolder(targetItem)) &&
      !!directTarget &&
      isInsideRect(pointer.clientX, pointer.clientY, hoveredTarget.rect);

    if (
      canGroup &&
      isInsideGroupZone(
        pointer.clientX,
        pointer.clientY,
        hoveredTarget.rect,
        hoveredTarget.iconRect,
      )
    ) {
      hoverTargetId.value = targetId;
      dropMode.value = "group";
      return;
    }

    hoverTargetId.value = targetId;
    dropMode.value = "reorder";
    updatePreviewInsertion(targetId, shouldPlaceAfterTarget(pointer, hoveredTarget.rect));
  }

  function flushPendingPointerMove() {
    pointerMoveFrame = 0;

    const pointer = pendingPointerMove;
    pendingPointerMove = null;
    if (!pointer) return;

    processPointerMove(pointer);
  }

  function queuePointerMove(event: PointerEvent) {
    pendingPointerMove = {
      pointerId: event.pointerId,
      clientX: event.clientX,
      clientY: event.clientY,
    };

    if (!pointerMoveFrame) {
      pointerMoveFrame = window.requestAnimationFrame(flushPendingPointerMove);
    }
  }

  function startPendingDrag() {
    if (!pendingDragSource || isDragging.value) return;

    if (pendingDragSource.type === "top-level") {
      const nextDraggedId = options.getLinks()[pendingDragSource.index]?.id ?? null;
      if (!nextDraggedId) {
        resetDragState();
        return;
      }

      draggedId.value = nextDraggedId;
      dragSource.value = { type: "top-level", itemId: nextDraggedId };
      previewLinks.value = cloneQuickLinkItems(options.getLinks());
      hoverTargetId.value = nextDraggedId;
      dropMode.value = "reorder";
      isDragging.value = true;
      pendingDragSource = null;
      window.requestAnimationFrame(refreshDropTargetSnapshots);
      return;
    }

    const source = {
      type: "folder-link",
      folderId: pendingDragSource.folderId,
      link: { ...pendingDragSource.link },
    } satisfies QuickLinkDragSource;

    draggedId.value = pendingDragSource.link.id;
    dragSource.value = source;
    previewLinks.value = cloneQuickLinkItems(options.getLinks());
    previewFolderLinks.value = createFolderLinksPreview(pendingDragSource.folderId);
    hoverTargetId.value = pendingDragSource.link.id;
    dropMode.value = "folder-reorder";
    isDragging.value = true;
    pendingDragSource = null;
    window.requestAnimationFrame(refreshDropTargetSnapshots);
  }

  function onPointerDown(event: PointerEvent, index: number) {
    if (event.button !== 0) return;

    activePointerId.value = event.pointerId;
    pendingDragSource = { type: "top-level", index };
    dragStartX = event.clientX;
    dragStartY = event.clientY;
    updateGhostPosition(event.clientX, event.clientY);
  }

  function onFolderLinkPointerDown(event: PointerEvent, folderId: string, link: QuickLinkLink) {
    if (event.button !== 0) return;

    activePointerId.value = event.pointerId;
    pendingDragSource = { type: "folder-link", folderId, link: { ...link } };
    dragStartX = event.clientX;
    dragStartY = event.clientY;
    updateGhostPosition(event.clientX, event.clientY);
  }

  function onWindowPointerMove(event: PointerEvent) {
    if (activePointerId.value !== event.pointerId) return;

    if (!isDragging.value) {
      if (!pendingDragSource || !hasPassedDragStartDistance(event.clientX, event.clientY)) return;
      startPendingDrag();
    }

    event.preventDefault();
    queuePointerMove(event);
  }

  function onWindowPointerUp(event: PointerEvent) {
    if (activePointerId.value !== event.pointerId) return;
    if (pendingPointerMove) {
      processPointerMove(pendingPointerMove);
      cancelPointerMoveFrame();
    }

    finishDrag(true);
  }

  function onPointerCancel(event: PointerEvent) {
    if (activePointerId.value !== event.pointerId) return;
    finishDrag(false);
  }

  function onWindowBlur() {
    finishDrag(false);
  }

  function onNativeDragStart(event: DragEvent) {
    event.preventDefault();
  }

  function suppressesClick() {
    return isDragging.value || window.performance.now() < suppressClickUntil.value;
  }

  return {
    displayLinks,
    displayFolderLinks,
    draggedId,
    draggedItem,
    dropMode,
    ghostStyle,
    hoverTargetId,
    isDragging,
    cancelPendingDrag,
    onNativeDragStart,
    onFolderLinkPointerDown,
    onPointerCancel,
    onPointerDown,
    onWindowBlur,
    onWindowPointerMove,
    onWindowPointerUp,
    resetDragState,
    suppressesClick,
  };
}
