import { computed, onMounted, onUnmounted, ref, shallowRef } from "vue";
import type { Ref } from "vue";

export interface UseSwipePagesOptions {
  pageCount: Ref<number>;
  currentPageIndex: Ref<number>;
  onPageChange: (index: number) => void;
  isDragActive: Ref<boolean>;
  cancelPendingDrag: () => void;
}

const SWIPE_ACTIVATION_DX = 40;
const SWIPE_DIRECTION_RATIO = 1.5;
const SWIPE_PAGE_THRESHOLD = 0.3;
const SWIPE_VELOCITY_THRESHOLD = 0.3;
const MAX_SWIPE_OFFSET_RATIO = 0.35;
const SNAP_DURATION_MS = 300;

export function useSwipePages(options: UseSwipePagesOptions) {
  const swipeOffsetPx = ref(0);
  const isSwiping = ref(false);
  const containerWidth = shallowRef(0);
  const containerEl = shallowRef<HTMLElement | null>(null);

  let pendingPointerId: number | null = null;
  let swipeStartX = 0;
  let swipeStartY = 0;
  let swipeLastX = 0;
  let swipeLastTime = 0;
  let swipeCommitted = false;

  const totalPages = computed(() => options.pageCount.value);
  const isSnapping = computed(() => swipeCommitted && !isSwiping.value);

  function getTrackTransformStyle(): { transform: string; transition: string } {
    const basePercent = -(options.currentPageIndex.value * 100);
    const width = containerWidth.value || 1;
    const offsetPercent = (swipeOffsetPx.value / width) * 100;

    return {
      transform: `translateX(${basePercent + offsetPercent}%)`,
      transition: isSnapping.value
        ? `transform ${SNAP_DURATION_MS}ms cubic-bezier(0.22, 1, 0.36, 1)`
        : "none",
    };
  }

  let resizeObserver: ResizeObserver | null = null;

  function clampPage(page: number): number {
    return Math.max(0, Math.min(page, totalPages.value - 1));
  }

  function goToPage(page: number) {
    const target = clampPage(page);
    if (target === options.currentPageIndex.value) {
      swipeOffsetPx.value = 0;
      return;
    }

    // Set the target page and animate the snap
    swipeCommitted = true;
    swipeOffsetPx.value = 0;
    options.onPageChange(target);
  }

  function snapToCurrentPage() {
    swipeCommitted = true;
    swipeOffsetPx.value = 0;
  }

  function isInsideQuickLinkItem(target: EventTarget | null): boolean {
    if (!target || !(target instanceof HTMLElement)) return false;
    return target.closest("[data-quick-link-id]") !== null;
  }

  function isInsideAddButton(target: EventTarget | null): boolean {
    if (!target || !(target instanceof HTMLElement)) return false;
    return (
      target.closest("button") !== null || target.tagName === "BUTTON" || target.tagName === "INPUT"
    );
  }

  function onContainerPointerDown(event: PointerEvent) {
    // Don't interfere with active drag
    if (options.isDragActive.value) return;

    // Don't start swipe when already snapping
    if (swipeCommitted) return;

    // Don't start swipe on interactive elements or quick link items
    if (isInsideAddButton(event.target) || isInsideQuickLinkItem(event.target)) return;

    if (totalPages.value <= 1) return;

    pendingPointerId = event.pointerId;
    swipeStartX = event.clientX;
    swipeStartY = event.clientY;
    swipeLastX = event.clientX;
    swipeLastTime = performance.now();
  }

  function onWindowPointerMove(event: PointerEvent) {
    if (pendingPointerId !== event.pointerId) return;

    if (options.isDragActive.value) {
      pendingPointerId = null;
      return;
    }

    const dx = event.clientX - swipeStartX;
    const dy = event.clientY - swipeStartY;

    // Not enough horizontal movement yet
    if (Math.abs(dx) < SWIPE_ACTIVATION_DX) return;

    // Direction check: horizontal must dominate
    if (Math.abs(dx) <= Math.abs(dy) * SWIPE_DIRECTION_RATIO) {
      // Vertical movement dominates — cancel pending swipe
      if (Math.abs(dy) > SWIPE_ACTIVATION_DX) {
        pendingPointerId = null;
      }
      return;
    }

    // Cancel any pending drag and commit to swipe
    options.cancelPendingDrag();
    isSwiping.value = true;
    swipeCommitted = false;

    // Apply rubber-band clamping
    const maxOffset = (containerWidth.value || window.innerWidth) * MAX_SWIPE_OFFSET_RATIO;
    const clampedDx = Math.max(-maxOffset, Math.min(maxOffset, dx));
    swipeOffsetPx.value = clampedDx;
    swipeLastX = event.clientX;
    swipeLastTime = performance.now();
  }

  function onWindowPointerUp(event: PointerEvent) {
    if (pendingPointerId !== event.pointerId) {
      // If we were swiping with a different pointer, ignore
      return;
    }

    pendingPointerId = null;

    if (!isSwiping.value) return;

    isSwiping.value = false;

    const dx = event.clientX - swipeStartX;
    const dt = performance.now() - swipeLastTime;
    const velocity = dt > 0 ? Math.abs(event.clientX - swipeLastX) / dt : 0;
    const width = containerWidth.value || window.innerWidth;
    const ratio = Math.abs(dx) / width;

    // Decide target page
    let targetPage = options.currentPageIndex.value;

    if (ratio >= SWIPE_PAGE_THRESHOLD || velocity >= SWIPE_VELOCITY_THRESHOLD) {
      if (dx > 0) {
        targetPage = options.currentPageIndex.value - 1; // swiped right → previous page
      } else {
        targetPage = options.currentPageIndex.value + 1; // swiped left → next page
      }
    }

    goToPage(targetPage);
  }

  function onWindowPointerCancel(event: PointerEvent) {
    if (pendingPointerId !== event.pointerId) return;
    pendingPointerId = null;
    if (isSwiping.value) {
      isSwiping.value = false;
      snapToCurrentPage();
    }
  }

  function onWindowBlur() {
    if (pendingPointerId !== null) {
      pendingPointerId = null;
      if (isSwiping.value) {
        isSwiping.value = false;
        snapToCurrentPage();
      }
    }
  }

  onMounted(() => {
    window.addEventListener("pointermove", onWindowPointerMove, true);
    window.addEventListener("pointerup", onWindowPointerUp, true);
    window.addEventListener("pointercancel", onWindowPointerCancel, true);
    window.addEventListener("blur", onWindowBlur);

    if (containerEl.value) {
      resizeObserver = new ResizeObserver((entries) => {
        const entry = entries[0];
        if (entry) {
          containerWidth.value = entry.contentRect.width;
        }
      });
      resizeObserver.observe(containerEl.value);
    }
  });

  onUnmounted(() => {
    window.removeEventListener("pointermove", onWindowPointerMove, true);
    window.removeEventListener("pointerup", onWindowPointerUp, true);
    window.removeEventListener("pointercancel", onWindowPointerCancel, true);
    window.removeEventListener("blur", onWindowBlur);
    resizeObserver?.disconnect();
  });

  return {
    swipeOffsetPx,
    isSwiping,
    containerEl,
    containerWidth,
    isSnapping,
    totalPages,
    goToPage,
    getTrackTransformStyle,
    onContainerPointerDown,
  };
}
