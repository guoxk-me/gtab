import { computed, onMounted, onUnmounted, ref } from "vue";
import type { Ref } from "vue";

export interface UseSwipePagesOptions {
  pageCount: Ref<number>;
  currentPageIndex: Ref<number>;
  onPageChange: (index: number) => void;
  isDragActive: Ref<boolean>;
  cancelPendingDrag: () => void;
}

const SWIPE_ACTIVATION_DY = 40;
const SWIPE_DIRECTION_RATIO = 1.5;
const SWIPE_PAGE_THRESHOLD = 0.3;
const SWIPE_VELOCITY_THRESHOLD = 0.3;
const MAX_SWIPE_OFFSET_RATIO = 0.35;
const SNAP_DURATION_MS = 300;
const WHEEL_IDLE_MS = 150;

function isInteractiveTarget(target: EventTarget | null): boolean {
  if (!target || !(target instanceof HTMLElement)) return false;
  if (target.closest("button, input, textarea, select, a, [data-quick-link-id]")) return true;
  return false;
}

export function useSwipePages(options: UseSwipePagesOptions) {
  const swipeOffsetPx = ref(0);
  const isSwiping = ref(false);

  let pendingPointerId: number | null = null;
  let swipeStartY = 0;
  let swipeStartX = 0;
  let swipeLastY = 0;
  let swipeLastTime = 0;
  let swipeCommitted = false;

  let wheelAccumulated = 0;
  let wheelIdleTimer: ReturnType<typeof setTimeout> | null = null;

  const totalPages = computed(() => options.pageCount.value);
  const isSnapping = computed(() => swipeCommitted && !isSwiping.value);

  function getViewHeight(): number {
    return window.innerHeight;
  }

  function getTrackTransformStyle(): { transform: string; transition: string } {
    const basePercent = -(options.currentPageIndex.value * 100);
    const height = getViewHeight() || 1;
    const offsetPercent = (swipeOffsetPx.value / height) * 100;

    return {
      transform: `translateY(${basePercent + offsetPercent}%)`,
      transition: isSnapping.value
        ? `transform ${SNAP_DURATION_MS}ms cubic-bezier(0.22, 1, 0.36, 1)`
        : "none",
    };
  }

  function clampPage(page: number): number {
    return Math.max(0, Math.min(page, totalPages.value - 1));
  }

  function goToPage(page: number) {
    const target = clampPage(page);
    if (target === options.currentPageIndex.value) {
      swipeOffsetPx.value = 0;
      return;
    }

    swipeCommitted = true;
    swipeOffsetPx.value = 0;
    options.onPageChange(target);
  }

  function snapToCurrentPage() {
    swipeCommitted = true;
    swipeOffsetPx.value = 0;
  }

  // --- Pointer Events ---

  function onWindowPointerDown(event: PointerEvent) {
    if (options.isDragActive.value) return;
    if (swipeCommitted) return;
    if (isInteractiveTarget(event.target)) return;
    if (totalPages.value <= 1) return;
    if (wheelIdleTimer !== null) return;

    pendingPointerId = event.pointerId;
    swipeStartY = event.clientY;
    swipeStartX = event.clientX;
    swipeLastY = event.clientY;
    swipeLastTime = performance.now();
  }

  function onWindowPointerMove(event: PointerEvent) {
    if (pendingPointerId !== event.pointerId) return;

    if (options.isDragActive.value) {
      pendingPointerId = null;
      return;
    }

    const dy = event.clientY - swipeStartY;
    const dx = event.clientX - swipeStartX;

    if (Math.abs(dy) < SWIPE_ACTIVATION_DY) return;

    // Vertical must dominate horizontal
    if (Math.abs(dy) <= Math.abs(dx) * SWIPE_DIRECTION_RATIO) {
      if (Math.abs(dx) > SWIPE_ACTIVATION_DY) {
        pendingPointerId = null;
      }
      return;
    }

    options.cancelPendingDrag();
    isSwiping.value = true;
    swipeCommitted = false;

    const maxOffset = getViewHeight() * MAX_SWIPE_OFFSET_RATIO;
    const clampedDy = Math.max(-maxOffset, Math.min(maxOffset, dy));
    swipeOffsetPx.value = clampedDy;
    swipeLastY = event.clientY;
    swipeLastTime = performance.now();
  }

  function onWindowPointerUp(event: PointerEvent) {
    if (pendingPointerId !== event.pointerId) return;
    pendingPointerId = null;

    if (!isSwiping.value) return;

    isSwiping.value = false;

    const dy = event.clientY - swipeStartY;
    const dt = performance.now() - swipeLastTime;
    const velocity = dt > 0 ? Math.abs(event.clientY - swipeLastY) / dt : 0;
    const height = getViewHeight();
    const ratio = Math.abs(dy) / height;

    let targetPage = options.currentPageIndex.value;

    if (ratio >= SWIPE_PAGE_THRESHOLD || velocity >= SWIPE_VELOCITY_THRESHOLD) {
      if (dy > 0) {
        targetPage = options.currentPageIndex.value - 1; // swiped down → previous page
      } else {
        targetPage = options.currentPageIndex.value + 1; // swiped up → next page
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
    if (wheelIdleTimer !== null) {
      clearTimeout(wheelIdleTimer);
      wheelIdleTimer = null;
      finishWheelGesture();
    }
  }

  // --- Wheel Events ---

  function onWindowWheel(event: WheelEvent) {
    if (pendingPointerId !== null || isSwiping.value) return;
    if (options.isDragActive.value) return;
    if (totalPages.value <= 1) return;

    if (event.target instanceof HTMLElement) {
      const scrollable = event.target.closest("[data-quick-link-folder-panel]");
      if (scrollable) return;
    }

    wheelAccumulated += event.deltaY;

    options.cancelPendingDrag();

    const maxOffset = getViewHeight() * MAX_SWIPE_OFFSET_RATIO;
    const clamped = Math.max(-maxOffset, Math.min(maxOffset, wheelAccumulated));
    swipeOffsetPx.value = clamped;
    isSwiping.value = true;
    swipeCommitted = false;

    if (wheelIdleTimer !== null) clearTimeout(wheelIdleTimer);
    wheelIdleTimer = setTimeout(() => {
      wheelIdleTimer = null;
      finishWheelGesture();
    }, WHEEL_IDLE_MS);
  }

  function finishWheelGesture() {
    isSwiping.value = false;

    const height = getViewHeight();
    const ratio = Math.abs(wheelAccumulated) / height;

    let targetPage = options.currentPageIndex.value;

    if (ratio >= SWIPE_PAGE_THRESHOLD) {
      if (wheelAccumulated > 0) {
        targetPage = options.currentPageIndex.value - 1; // scroll down → previous
      } else {
        targetPage = options.currentPageIndex.value + 1; // scroll up → next
      }
    }

    wheelAccumulated = 0;
    goToPage(targetPage);
  }

  // --- Lifecycle ---

  onMounted(() => {
    window.addEventListener("pointerdown", onWindowPointerDown, true);
    window.addEventListener("pointermove", onWindowPointerMove, true);
    window.addEventListener("pointerup", onWindowPointerUp, true);
    window.addEventListener("pointercancel", onWindowPointerCancel, true);
    window.addEventListener("blur", onWindowBlur);
    window.addEventListener("wheel", onWindowWheel, { passive: true });
  });

  onUnmounted(() => {
    window.removeEventListener("pointerdown", onWindowPointerDown, true);
    window.removeEventListener("pointermove", onWindowPointerMove, true);
    window.removeEventListener("pointerup", onWindowPointerUp, true);
    window.removeEventListener("pointercancel", onWindowPointerCancel, true);
    window.removeEventListener("blur", onWindowBlur);
    window.removeEventListener("wheel", onWindowWheel);
    if (wheelIdleTimer !== null) clearTimeout(wheelIdleTimer);
  });

  return {
    swipeOffsetPx,
    isSwiping,
    isSnapping,
    totalPages,
    goToPage,
    getTrackTransformStyle,
  };
}
