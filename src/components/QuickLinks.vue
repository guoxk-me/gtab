<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";
import { useI18n } from "vue-i18n";
import { getKnownQuickLinkIcon } from "../composables/quickLinkIcons";
import {
  cloneQuickLinkItems,
  isQuickLinkFolder,
  isQuickLinkLink,
  reorderQuickLinkItems,
} from "../composables/quickLinkItems";
import type { QuickLinkItem } from "../composables/useStorage";

const props = defineProps<{ links: QuickLinkItem[] }>();
const emit = defineEmits<{
  edit: [];
  reorder: [draggedId: string, toIndex: number];
  group: [draggedId: string, targetId: string];
}>();

const { t } = useI18n();

type DragMode = "reorder" | "group";

const reorderActivationDelayMs = 55;
const groupThresholdRatio = 0.15;
const groupActivationDelayMs = 220;

const dragIntentTimer = ref<number | null>(null);
const pressedIndex = ref<number | null>(null);
const suppressClickUntil = ref(0);
const activePointerId = ref<number | null>(null);
const draggedId = ref<string | null>(null);
const previewLinks = ref<QuickLinkItem[]>([]);
const hoverTargetId = ref<string | null>(null);
const dropMode = ref<DragMode | null>(null);
const isDragging = ref(false);
const ghostX = ref(0);
const ghostY = ref(0);
const folderOpenId = ref<string | null>(null);
const reorderCandidateId = ref<string | null>(null);
const reorderCandidateSince = ref(0);
const groupCandidateId = ref<string | null>(null);
const groupCandidateSince = ref(0);

const displayLinks = computed(() => (isDragging.value ? previewLinks.value : props.links));
const draggedItem = computed(() => props.links.find((item) => item.id === draggedId.value) ?? null);
const openFolder = computed(() => {
  const item = props.links.find((entry) => entry.id === folderOpenId.value);
  return item && isQuickLinkFolder(item) ? item : null;
});

function getIconClass(item: QuickLinkItem): string {
  if (isQuickLinkFolder(item)) return "icon-[solar--folder-with-files-linear]";
  return getKnownQuickLinkIcon(item.url);
}

function getInitial(name: string): string {
  return name.charAt(0).toUpperCase();
}

function getFolderPreview(item: QuickLinkItem): string {
  return isQuickLinkFolder(item)
    ? t("quickLinks.folderContains", { count: item.links.length })
    : "";
}

function clearDragIntentTimer() {
  if (dragIntentTimer.value !== null) {
    window.clearTimeout(dragIntentTimer.value);
    dragIntentTimer.value = null;
  }
}

function resetDragState() {
  clearDragIntentTimer();
  pressedIndex.value = null;
  activePointerId.value = null;
  draggedId.value = null;
  hoverTargetId.value = null;
  dropMode.value = null;
  isDragging.value = false;
  previewLinks.value = [];
  reorderCandidateId.value = null;
  reorderCandidateSince.value = 0;
  groupCandidateId.value = null;
  groupCandidateSince.value = 0;
}

function finishDrag(commit = true) {
  if (isDragging.value) {
    suppressClickUntil.value = window.performance.now() + 250;

    if (commit && draggedId.value && hoverTargetId.value && dropMode.value) {
      if (dropMode.value === "group") {
        emit("group", draggedId.value, hoverTargetId.value);
      } else {
        const toIndex = previewLinks.value.findIndex((item) => item.id === draggedId.value);
        if (toIndex >= 0) emit("reorder", draggedId.value, toIndex);
      }
    }
  }

  resetDragState();
}

function onPointerDown(event: PointerEvent, index: number) {
  if (event.button !== 0) return;

  clearDragIntentTimer();
  pressedIndex.value = index;
  activePointerId.value = event.pointerId;
  ghostX.value = event.clientX;
  ghostY.value = event.clientY;

  dragIntentTimer.value = window.setTimeout(() => {
    if (pressedIndex.value !== index || activePointerId.value !== event.pointerId) return;

    const nextDraggedId = props.links[index]?.id ?? null;
    if (!nextDraggedId) return;

    draggedId.value = nextDraggedId;
    previewLinks.value = cloneQuickLinkItems(props.links);
    hoverTargetId.value = nextDraggedId;
    dropMode.value = "reorder";
    isDragging.value = true;
  }, 180);
}

function updatePreviewOrder(targetId: string) {
  const fromIndex = previewLinks.value.findIndex((item) => item.id === draggedId.value);
  const toIndex = previewLinks.value.findIndex((item) => item.id === targetId);
  if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) return;

  previewLinks.value = reorderQuickLinkItems(previewLinks.value, fromIndex, toIndex);
}

function updatePreviewInsertion(targetId: string, placeAfter: boolean) {
  const fromIndex = previewLinks.value.findIndex((item) => item.id === draggedId.value);
  const targetIndex = previewLinks.value.findIndex((item) => item.id === targetId);
  if (fromIndex < 0 || targetIndex < 0) return;

  let toIndex = targetIndex;

  if (placeAfter) {
    toIndex = fromIndex < targetIndex ? targetIndex : targetIndex + 1;
  } else {
    toIndex = fromIndex < targetIndex ? targetIndex - 1 : targetIndex;
  }

  if (toIndex < 0 || toIndex >= previewLinks.value.length || fromIndex === toIndex) return;
  previewLinks.value = reorderQuickLinkItems(previewLinks.value, fromIndex, toIndex);
}

function resetReorderCandidate() {
  reorderCandidateId.value = null;
  reorderCandidateSince.value = 0;
}

function resetGroupCandidate() {
  groupCandidateId.value = null;
  groupCandidateSince.value = 0;
}

function shouldPlaceAfterTarget(event: PointerEvent, rect: DOMRect): boolean {
  // Center of the target element
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;

  // Vector from target center to pointer
  const dx = event.clientX - cx;
  const dy = event.clientY - cy;

  // Determine dominant axis: if items are on the same row (small dy), use x;
  // otherwise use y to decide row-level placement.
  const rowThreshold = rect.height * 0.4;
  if (Math.abs(dy) < rowThreshold) {
    // Same row: place after if pointer is right of center
    return dx >= 0;
  }

  // Different rows: place after if pointer is below center
  return dy > 0;
}

function findNearestLinkElement(x: number, y: number): HTMLElement | null {
  const allItems = Array.from(document.querySelectorAll<HTMLElement>("[data-quick-link-id]"));
  if (allItems.length === 0) return null;

  // Only snap to nearest if pointer is within ~1.5 item-widths of it
  const snapRadius = 120;

  let nearest: HTMLElement | null = null;
  let minDist = Infinity;

  for (const el of allItems) {
    const r = el.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    const dist = Math.hypot(x - cx, y - cy);
    if (dist < minDist) {
      minDist = dist;
      nearest = el;
    }
  }

  return minDist <= snapRadius ? nearest : null;
}

function onWindowPointerMove(event: PointerEvent) {
  if (activePointerId.value !== event.pointerId || !isDragging.value || !draggedId.value) return;

  event.preventDefault();
  ghostX.value = event.clientX;
  ghostY.value = event.clientY;

  const directHit = document
    .elementFromPoint(event.clientX, event.clientY)
    ?.closest<HTMLElement>("[data-quick-link-id]");
  const mergeZoneElement = document
    .elementFromPoint(event.clientX, event.clientY)
    ?.closest<HTMLElement>("[data-quick-link-merge-zone]");

  // If pointer is in a gap between items, fall back to nearest item
  const hoveredElement = directHit ?? findNearestLinkElement(event.clientX, event.clientY);
  const targetId = hoveredElement?.dataset.quickLinkId ?? null;
  if (!targetId) {
    resetReorderCandidate();
    resetGroupCandidate();
    return;
  }

  if (targetId === draggedId.value) {
    hoverTargetId.value = draggedId.value;
    dropMode.value = "reorder";
    resetReorderCandidate();
    resetGroupCandidate();
    return;
  }

  const rect = hoveredElement?.getBoundingClientRect();
  if (!rect) return;

  const mergeTargetId = mergeZoneElement?.dataset.quickLinkMergeZone ?? null;

  const centerDistance = Math.hypot(
    event.clientX - (rect.left + rect.width / 2),
    event.clientY - (rect.top + rect.height / 2),
  );
  const groupThreshold = Math.min(rect.width, rect.height) * groupThresholdRatio;
  const targetItem = previewLinks.value.find((item) => item.id === targetId) ?? null;
  const draggedLink = previewLinks.value.find((item) => item.id === draggedId.value) ?? null;
  const canGroup =
    !!draggedLink &&
    !!targetItem &&
    isQuickLinkLink(draggedLink) &&
    (isQuickLinkLink(targetItem) || isQuickLinkFolder(targetItem)) &&
    mergeTargetId === targetId;

  if (canGroup && centerDistance <= groupThreshold) {
    if (groupCandidateId.value !== targetId) {
      groupCandidateId.value = targetId;
      groupCandidateSince.value = window.performance.now();
      resetReorderCandidate();
      return;
    }

    if (window.performance.now() - groupCandidateSince.value < groupActivationDelayMs) return;

    hoverTargetId.value = targetId;
    dropMode.value = "group";
    return;
  }

  resetGroupCandidate();

  if (mergeTargetId === targetId) {
    resetReorderCandidate();
    return;
  }

  if (hoverTargetId.value === targetId && dropMode.value === "reorder") {
    resetReorderCandidate();
    return;
  }

  if (reorderCandidateId.value !== targetId) {
    reorderCandidateId.value = targetId;
    reorderCandidateSince.value = window.performance.now();
    return;
  }

  if (window.performance.now() - reorderCandidateSince.value < reorderActivationDelayMs) return;

  hoverTargetId.value = targetId;
  dropMode.value = "reorder";
  updatePreviewInsertion(targetId, shouldPlaceAfterTarget(event, rect));
  resetReorderCandidate();
}

function onWindowPointerUp(event: PointerEvent) {
  if (activePointerId.value !== event.pointerId) return;
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

function onLinkClick(event: MouseEvent, item: QuickLinkItem) {
  if (isDragging.value || window.performance.now() < suppressClickUntil.value) {
    event.preventDefault();
    event.stopPropagation();
    return;
  }

  if (isQuickLinkFolder(item)) {
    event.preventDefault();
    folderOpenId.value = folderOpenId.value === item.id ? null : item.id;
  }
}

function closeFolder() {
  folderOpenId.value = null;
}

onMounted(() => {
  window.addEventListener("pointermove", onWindowPointerMove);
  window.addEventListener("pointerup", onWindowPointerUp);
  window.addEventListener("pointercancel", onPointerCancel);
  window.addEventListener("blur", onWindowBlur);
});

onUnmounted(() => {
  window.removeEventListener("pointermove", onWindowPointerMove);
  window.removeEventListener("pointerup", onWindowPointerUp);
  window.removeEventListener("pointercancel", onPointerCancel);
  window.removeEventListener("blur", onWindowBlur);
  resetDragState();
});
</script>

<template>
  <Teleport to="body">
    <Transition name="ghost">
      <div
        v-if="isDragging && draggedItem"
        class="pointer-events-none fixed z-[9999] flex flex-col items-center gap-2 transition-transform duration-75"
        :style="{
          left: `${ghostX}px`,
          top: `${ghostY}px`,
          transform: 'translate(-50%, -50%) rotate(3deg) scale(1.05)',
        }"
      >
        <div
          class="relative w-14 h-14 sm:w-16 sm:h-16 rounded-[18px] backdrop-blur-xl flex items-center justify-center overflow-hidden border bg-white/24 border-white/35 dark:bg-white/24 dark:border-white/35 light:bg-white/88 light:border-white/95 shadow-[0_20px_50px_rgba(0,0,0,0.38)] light:[box-shadow:0_20px_50px_rgba(100,130,180,0.28)]"
        >
          <span
            v-if="getIconClass(draggedItem)"
            :class="[getIconClass(draggedItem), 'h-7 w-7 sm:h-8 sm:w-8 relative z-10']"
          />
          <span
            v-else
            class="absolute text-[1.2rem] font-semibold text-white/80 dark:text-white/80 light:text-slate-600"
          >
            {{ getInitial(draggedItem.name) }}
          </span>
        </div>
        <span
          class="text-xs text-center max-w-20 truncate text-white/85 dark:text-white/85 light:text-slate-700"
        >
          {{ draggedItem.name }}
        </span>
        <span
          v-if="dropMode === 'group' && hoverTargetId && hoverTargetId !== draggedId"
          class="rounded-full px-2.5 py-1 text-[11px] font-medium bg-accent/85 text-slate-950 shadow-[0_10px_24px_rgba(0,0,0,0.22)] dark:bg-accent/85 light:bg-accent-light light:text-white"
        >
          {{ t("quickLinks.dropToCreateFolder") }}
        </span>
      </div>
    </Transition>
  </Teleport>

  <div class="flex flex-wrap justify-center max-w-[1080px] px-4 sm:px-2">
    <TransitionGroup name="ql-item" tag="div" class="contents">
      <div
        v-for="(item, index) in displayLinks"
        :key="item.id"
        :data-quick-link-id="item.id"
        class="group relative flex flex-col items-center gap-2 bg-transparent border-0 px-4 py-4 sm:px-5 sm:py-5"
        :class="{
          'cursor-grab': !isDragging,
          'cursor-grabbing': isDragging,
        }"
        :title="item.name"
        @pointerdown="onPointerDown($event, index)"
        @dragstart="onNativeDragStart"
      >
        <a
          :href="isQuickLinkLink(item) ? item.url : '#'"
          class="flex flex-col items-center gap-2 no-underline bg-transparent border-0 p-0"
          draggable="false"
          @click="onLinkClick($event, item)"
        >
          <div
            :data-quick-link-merge-zone="item.id"
            class="relative w-14 h-14 sm:w-16 sm:h-16 rounded-[18px] backdrop-blur-xl flex items-center justify-center overflow-hidden border transition-[transform,box-shadow,background-color,border-color,opacity] duration-180 will-change-transform bg-white/[0.11] border-white/[0.13] dark:bg-white/[0.11] dark:border-white/[0.13] light:bg-[rgba(255,255,255,0.70)] light:border-[rgba(255,255,255,0.80)] light:[box-shadow:var(--light-shadow-soft)] group-hover:bg-white/[0.18] group-hover:-translate-y-1 group-hover:shadow-[0_12px_28px_rgba(0,0,0,0.28)] dark:group-hover:bg-white/[0.18] light:group-hover:bg-[rgba(255,255,255,0.88)] light:group-hover:border-[rgba(255,255,255,0.92)] light:group-hover:[box-shadow:0_18px_34px_rgba(117,144,187,0.22),inset_0_1px_0_rgba(255,255,255,0.84)]"
            :class="{
              'scale-80 opacity-20': draggedId === item.id,
              'scale-112 -translate-y-1.5 shadow-[0_0_0_2px_rgba(99,179,237,0.78),0_10px_28px_rgba(0,0,0,0.35)] dark:shadow-[0_0_0_2px_rgba(99,179,237,0.78),0_10px_28px_rgba(0,0,0,0.35)] light:shadow-[0_0_0_2px_rgba(74,122,255,0.55),0_10px_28px_rgba(100,130,180,0.3)]':
                hoverTargetId === item.id && draggedId !== item.id && dropMode === 'reorder',
              'scale-120 shadow-[0_0_0_3px_rgba(99,179,237,0.9),0_18px_40px_rgba(0,0,0,0.42)] dark:shadow-[0_0_0_3px_rgba(99,179,237,0.9),0_18px_40px_rgba(0,0,0,0.42)] light:shadow-[0_0_0_3px_rgba(74,122,255,0.66),0_18px_40px_rgba(100,130,180,0.34)]':
                hoverTargetId === item.id && draggedId !== item.id && dropMode === 'group',
            }"
          >
            <span
              v-if="isQuickLinkFolder(item)"
              class="absolute inset-x-2 bottom-2 h-2 rounded-full bg-white/18 dark:bg-white/18 light:bg-[rgba(118,146,194,0.14)]"
            />
            <span
              v-if="getIconClass(item)"
              :class="[getIconClass(item), 'h-7 w-7 sm:h-8 sm:w-8 relative z-10']"
            />
            <span
              v-else
              class="absolute text-[1.2rem] font-semibold transition-colors duration-500 text-white/60 dark:text-white/60 light:text-slate-600"
            >
              {{ getInitial(item.name) }}
            </span>
            <div
              v-if="isQuickLinkFolder(item)"
              class="absolute right-1.5 top-1.5 min-w-4 h-4 px-1 rounded-full flex items-center justify-center text-[10px] font-semibold bg-white/18 text-white/90 dark:bg-white/18 dark:text-white/90 light:bg-[rgba(118,146,194,0.16)] light:text-slate-700"
            >
              {{ item.links.length }}
            </div>
          </div>
          <span
            class="text-[0.72rem] text-center max-w-[4.5rem] truncate transition-[color,opacity,transform] duration-180 text-white/65 group-hover:text-white/95 dark:text-white/65 dark:group-hover:text-white/95 light:text-slate-500 light:group-hover:text-slate-800"
            :class="{ 'opacity-20': draggedId === item.id }"
          >
            {{ item.name }}
          </span>
          <span
            v-if="isQuickLinkFolder(item)"
            class="-mt-1 text-[10px] text-center max-w-20 truncate text-white/38 dark:text-white/38 light:text-slate-500"
          >
            {{ getFolderPreview(item) }}
          </span>
        </a>
      </div>
    </TransitionGroup>

    <button
      class="group flex flex-col items-center gap-2 bg-transparent border-0 px-4 py-4 sm:px-5 sm:py-5 cursor-pointer"
      :title="t('quickLinks.edit')"
      @click="emit('edit')"
    >
      <div
        class="relative w-14 h-14 sm:w-16 sm:h-16 rounded-[18px] backdrop-blur-xl flex items-center justify-center transition-all duration-200 border-dashed border text-white/35 border-white/18 dark:text-white/35 dark:border-white/18 light:bg-[rgba(255,255,255,0.48)] light:text-slate-400 light:border-[rgba(159,179,212,0.5)] light:[box-shadow:0_14px_28px_rgba(125,148,186,0.10)] group-hover:border-white/45 group-hover:text-white/80 group-hover:-translate-y-1 dark:group-hover:border-white/45 dark:group-hover:text-white/80 light:group-hover:bg-[rgba(255,255,255,0.78)] light:group-hover:border-[rgba(118,146,194,0.62)] light:group-hover:text-slate-700 light:group-hover:[box-shadow:0_18px_34px_rgba(117,144,187,0.18)]"
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <path d="M12 5v14M5 12h14" />
        </svg>
      </div>
      <span
        class="text-[0.72rem] text-center max-w-[4.5rem] truncate transition-colors duration-500 text-white/50 group-hover:text-white/90 dark:text-white/50 dark:group-hover:text-white/90 light:text-slate-500 light:group-hover:text-slate-800"
      >
        {{ t("common.add") }}
      </span>
    </button>
  </div>

  <Transition name="folder-fade">
    <div
      v-if="folderOpenId"
      class="fixed inset-0 z-[150] flex items-center justify-center bg-black/45 backdrop-blur-sm px-4"
      @click.self="closeFolder"
    >
      <div
        class="w-full max-w-md rounded-[24px] border p-5 shadow-[0_24px_64px_rgba(0,0,0,0.45)] transition-colors duration-500 bg-slate-950/94 border-white/10 dark:bg-slate-950/94 dark:border-white/10 light:bg-[rgba(247,250,255,0.95)] light:border-[rgba(255,255,255,0.85)]"
      >
        <div class="flex items-start justify-between gap-3">
          <div>
            <h3 class="text-base font-semibold text-white dark:text-white light:text-slate-900">
              {{ openFolder?.name }}
            </h3>
            <p class="mt-1 text-xs text-white/45 dark:text-white/45 light:text-slate-500">
              {{ t("quickLinks.openFolder") }}
            </p>
          </div>
          <button
            class="flex h-8 w-8 items-center justify-center rounded-lg text-white/55 hover:bg-white/8 hover:text-white dark:text-white/55 dark:hover:bg-white/8 dark:hover:text-white light:text-slate-500 light:hover:bg-[rgba(109,141,196,0.08)] light:hover:text-slate-800"
            @click="closeFolder"
          >
            <span class="icon-[solar--close-circle-linear] h-[18px] w-[18px]" aria-hidden="true" />
          </button>
        </div>

        <div class="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-4">
          <a
            v-for="link in openFolder?.links ?? []"
            :key="link.id"
            :href="link.url"
            class="group flex flex-col items-center gap-2 rounded-2xl border px-2 py-3 no-underline transition-all duration-180 bg-white/4 border-white/8 hover:-translate-y-0.5 hover:bg-white/8 dark:bg-white/4 dark:border-white/8 dark:hover:bg-white/8 light:bg-[rgba(255,255,255,0.72)] light:border-[rgba(206,218,239,0.82)] light:hover:bg-white"
          >
            <div
              class="flex h-11 w-11 items-center justify-center rounded-2xl border bg-white/8 border-white/12 dark:bg-white/8 dark:border-white/12 light:bg-[rgba(255,255,255,0.82)] light:border-[rgba(210,221,239,0.82)]"
            >
              <span
                v-if="getKnownQuickLinkIcon(link.url)"
                :class="[getKnownQuickLinkIcon(link.url), 'h-5 w-5']"
              />
              <span
                v-else
                class="text-sm font-semibold text-white/70 dark:text-white/70 light:text-slate-600"
              >
                {{ getInitial(link.name) }}
              </span>
            </div>
            <span
              class="max-w-full truncate text-center text-xs text-white/65 dark:text-white/65 light:text-slate-700"
            >
              {{ link.name }}
            </span>
          </a>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.ghost-enter-active,
.ghost-leave-active {
  transition:
    opacity 0.14s ease,
    transform 0.14s ease;
}

.ghost-enter-from,
.ghost-leave-to {
  opacity: 0;
  transform: translate(-50%, -50%) scale(0.92);
}

.ql-item-move {
  transition: transform 0.2s cubic-bezier(0.22, 1, 0.36, 1);
}

.folder-fade-enter-active,
.folder-fade-leave-active {
  transition: opacity 0.18s ease;
}

.folder-fade-enter-from,
.folder-fade-leave-to {
  opacity: 0;
}
</style>
