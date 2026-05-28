<script setup lang="ts">
import { reactive, ref } from "vue";
import type { BasicColorSchema } from "@vueuse/core";
import { useI18n } from "vue-i18n";
import type {
  LanguageSetting,
  QuickLinkFolder,
  QuickLinkItem,
  QuickLinkLink,
  QuickLinkPage,
  Settings,
} from "../composables/useStorage";
import { importBrowserBookmarks, isBookmarksApiAvailable } from "../composables/useBookmarkImport";
import {
  createQuickLinkId,
  isQuickLinkFolder,
  reorderQuickLinkItems,
  sanitizeQuickLinkItems,
  sanitizeQuickLinkLinks,
} from "../composables/quickLinkItems";
import {
  addLinksToPage,
  createPage,
  moveLinkBetweenPages,
  reorderPages,
  sanitizePage,
} from "../composables/quickLinkPages";
import { useSearchHistory } from "../composables/useSearchHistory";

const props = defineProps<{
  settings: Settings;
  colorMode: BasicColorSchema;
}>();

const emit = defineEmits<{
  save: [settings: Settings];
  close: [];
  "update:language": [value: LanguageSetting];
  "update:colorMode": [value: BasicColorSchema];
}>();

const { t } = useI18n();

const local = reactive<Settings>(JSON.parse(JSON.stringify(props.settings)));
const editingPageIndex = ref(props.settings.activePageIndex ?? 0);

// Normalize after load if pages array is empty
if (local.quickLinkPages.length === 0) {
  local.quickLinkPages = [createPage("Quick Links")];
}

// Search history
const { history: searchHistory, clearHistory: clearSearchHistory } = useSearchHistory();
const confirmingClearHistory = ref(false);

function handleClearHistory() {
  if (confirmingClearHistory.value) {
    clearSearchHistory();
    confirmingClearHistory.value = false;
  } else {
    confirmingClearHistory.value = true;
    setTimeout(() => {
      confirmingClearHistory.value = false;
    }, 3000);
  }
}

const newLink = ref({ name: "", url: "" });
const addingLink = ref(false);
const importMode = ref<"merge" | "replace">("merge");
const importingBookmarks = ref(false);
const bookmarksApiAvailable = isBookmarksApiAvailable();
const importFeedback = ref<{ type: "success" | "error"; message: string } | null>(null);
const dragSourceIndex = ref<number | null>(null);
const dragTargetIndex = ref<number | null>(null);

// Page management state
const addingPage = ref(false);
const newPageName = ref("");
const renamingPageIndex = ref<number | null>(null);
const renamePageValue = ref("");
const deletingPageIndex = ref<number | null>(null);
const deleteConfirmActive = ref(false);
const moveLinkPageTarget = ref<Record<string, string>>({});

// Computed helpers for current editing page
function currentPageItems(): QuickLinkItem[] {
  if (editingPageIndex.value >= local.quickLinkPages.length) {
    editingPageIndex.value = Math.max(0, local.quickLinkPages.length - 1);
  }
  return local.quickLinkPages[editingPageIndex.value]?.items ?? [];
}

function updateCurrentPageItems(items: QuickLinkItem[]) {
  if (editingPageIndex.value < local.quickLinkPages.length) {
    local.quickLinkPages[editingPageIndex.value] = {
      ...local.quickLinkPages[editingPageIndex.value],
      items,
    };
  }
}

// Clamp editing page index when pages change
function clampEditingIndex() {
  if (local.quickLinkPages.length === 0) {
    local.quickLinkPages = [createPage("Quick Links")];
  }
  editingPageIndex.value = Math.max(
    0,
    Math.min(editingPageIndex.value, local.quickLinkPages.length - 1),
  );
}

// --- Page CRUD ---

function addPage() {
  const name = newPageName.value.trim();
  if (!name) return;
  local.quickLinkPages = [...local.quickLinkPages, createPage(name)];
  editingPageIndex.value = local.quickLinkPages.length - 1;
  newPageName.value = "";
  addingPage.value = false;
  deleteConfirmActive.value = false;
}

function startRenamePage(index: number) {
  renamingPageIndex.value = index;
  renamePageValue.value = local.quickLinkPages[index]?.name ?? "";
}

function confirmRenamePage() {
  if (renamingPageIndex.value === null) return;
  const name = renamePageValue.value.trim();
  if (name && renamingPageIndex.value < local.quickLinkPages.length) {
    const pages = [...local.quickLinkPages];
    pages[renamingPageIndex.value] = { ...pages[renamingPageIndex.value], name };
    local.quickLinkPages = pages;
  }
  renamingPageIndex.value = null;
}

function cancelRenamePage() {
  renamingPageIndex.value = null;
}

function onRenameKeydown(event: KeyboardEvent) {
  if (event.key === "Enter") confirmRenamePage();
  else if (event.key === "Escape") cancelRenamePage();
}

function requestDeletePage(index: number) {
  if (local.quickLinkPages.length <= 1) return;
  deletingPageIndex.value = index;
  deleteConfirmActive.value = true;
}

function confirmDeletePage() {
  if (deletingPageIndex.value === null) return;
  const pages = [...local.quickLinkPages];
  pages.splice(deletingPageIndex.value, 1);
  local.quickLinkPages = pages;
  deletingPageIndex.value = null;
  deleteConfirmActive.value = false;
  clampEditingIndex();
}

function cancelDeletePage() {
  deletingPageIndex.value = null;
  deleteConfirmActive.value = false;
}

function movePageUp(index: number) {
  if (index <= 0) return;
  local.quickLinkPages = reorderPages(local.quickLinkPages, index, index - 1);
  if (editingPageIndex.value === index) editingPageIndex.value = index - 1;
  else if (editingPageIndex.value === index - 1) editingPageIndex.value = index;
}

function movePageDown(index: number) {
  if (index >= local.quickLinkPages.length - 1) return;
  local.quickLinkPages = reorderPages(local.quickLinkPages, index, index + 1);
  if (editingPageIndex.value === index) editingPageIndex.value = index + 1;
  else if (editingPageIndex.value === index + 1) editingPageIndex.value = index;
}

function moveLinkToPage(linkId: string, toPageId: string) {
  const fromPageId = local.quickLinkPages[editingPageIndex.value]?.id;
  if (!fromPageId || fromPageId === toPageId) {
    moveLinkPageTarget.value[linkId] = "";
    return;
  }
  local.quickLinkPages = moveLinkBetweenPages(local.quickLinkPages, linkId, fromPageId, toPageId);
  moveLinkPageTarget.value[linkId] = "";
}

// --- Link CRUD (page-scoped) ---

function addLink() {
  updateCurrentPageItems(
    sanitizeQuickLinkItems([
      ...currentPageItems(),
      {
        id: createQuickLinkId(),
        type: "link",
        name: newLink.value.name,
        url: newLink.value.url,
      },
    ]),
  );
  newLink.value = { name: "", url: "" };
  addingLink.value = false;
}

function removeItem(id: string) {
  updateCurrentPageItems(currentPageItems().filter((item) => item.id !== id));
}

function removeFolderLink(folderId: string, linkId: string) {
  updateCurrentPageItems(
    currentPageItems().flatMap((item) => {
      if (item.id !== folderId || !isQuickLinkFolder(item)) return [item];

      const links = item.links.filter((link) => link.id !== linkId);
      if (links.length === 0) return [];
      if (links.length === 1) return [links[0]];
      return [{ ...item, links }];
    }),
  );
}

function moveLink(index: number, offset: -1 | 1) {
  const items = currentPageItems();
  const nextIndex = index + offset;
  if (nextIndex < 0 || nextIndex >= items.length) return;

  updateCurrentPageItems(reorderQuickLinkItems(items, index, nextIndex));
}

function onDragStart(event: DragEvent, index: number) {
  dragSourceIndex.value = index;
  dragTargetIndex.value = index;

  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", currentPageItems()[index]?.id ?? String(index));
  }
}

function onDragOver(event: DragEvent, index: number) {
  if (dragSourceIndex.value === null || dragSourceIndex.value === index) return;

  event.preventDefault();
  dragTargetIndex.value = index;

  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = "move";
  }
}

function onDrop(event: DragEvent, index: number) {
  if (dragSourceIndex.value === null) return;

  event.preventDefault();
  updateCurrentPageItems(reorderQuickLinkItems(currentPageItems(), dragSourceIndex.value, index));
  resetDragState();
}

function resetDragState() {
  dragSourceIndex.value = null;
  dragTargetIndex.value = null;
}

async function importBookmarks() {
  importingBookmarks.value = true;
  importFeedback.value = null;

  try {
    const importedLinks = await importBrowserBookmarks();
    if (importedLinks.length === 0) {
      importFeedback.value = { type: "success", message: t("settings.importEmpty") };
      return;
    }

    if (importMode.value === "replace") {
      updateCurrentPageItems(sanitizeQuickLinkItems(importedLinks));
    } else {
      const page = local.quickLinkPages[editingPageIndex.value];
      if (page) {
        local.quickLinkPages[editingPageIndex.value] = addLinksToPage(page, importedLinks);
      }
    }

    importFeedback.value = {
      type: "success",
      message: t("settings.importSuccess", { count: importedLinks.length }),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    importFeedback.value = { type: "error", message: t("settings.importError", { message }) };
  } finally {
    importingBookmarks.value = false;
  }
}

function save() {
  local.quickLinkPages = local.quickLinkPages.map((page) => sanitizePage(page));
  if (local.quickLinkPages.length === 0) {
    local.quickLinkPages = [createPage("Quick Links")];
  }
  emit("save", JSON.parse(JSON.stringify(local)));
}

function normalizeFolderLinks(item: QuickLinkItem): QuickLinkItem {
  if (!isQuickLinkFolder(item)) return item;

  const links = sanitizeQuickLinkLinks(item.links);
  if (links.length <= 1) return links[0] ?? item;
  return { ...item, links };
}

function onFolderFieldBlur(folderId: string) {
  updateCurrentPageItems(
    currentPageItems().map((item) => {
      if (item.id !== folderId) return item;
      return normalizeFolderLinks(item);
    }),
  );
}

function isFolder(item: QuickLinkItem): item is QuickLinkFolder {
  return isQuickLinkFolder(item);
}

function asFolderLinks(item: QuickLinkItem): QuickLinkLink[] {
  return isQuickLinkFolder(item) ? item.links : [];
}

function previewLanguage(language: LanguageSetting) {
  local.language = language;
  emit("update:language", language);
}

const engineLabels: Record<string, string> = {
  google: "Google",
  bing: "Bing",
  baidu: "Baidu",
  duckduckgo: "DuckDuckGo",
};

const colorModeOptions: { value: BasicColorSchema; label: string; icon: string }[] = [
  { value: "dark", label: "appearance.dark", icon: "icon-[solar--moon-linear]" },
  { value: "light", label: "appearance.light", icon: "icon-[solar--sun-2-linear]" },
  { value: "auto", label: "appearance.system", icon: "icon-[solar--monitor-linear]" },
];

const languageOptions: { value: LanguageSetting; label: string }[] = [
  { value: "auto", label: "language.auto" },
  { value: "zh-CN", label: "language.zhCN" },
  { value: "en-US", label: "language.enUS" },
];

const closeIconClass = "icon-[solar--close-circle-linear]";
</script>

<template>
  <!-- Overlay -->
  <div
    class="fixed inset-0 bg-black/50 backdrop-blur-sm z-[200] flex items-center justify-center p-4 sm:p-5 transition-colors duration-500 light:bg-[rgba(226,235,247,0.55)]"
    @click.self="emit('close')"
  >
    <!-- Panel -->
    <div
      class="w-full max-w-[520px] max-h-[90vh] sm:max-h-[80vh] flex flex-col rounded-[20px] shadow-[0_24px_64px_rgba(0,0,0,0.6)] border transition-colors duration-500 bg-slate-950/97 border-white/10 dark:bg-slate-950/97 dark:border-white/10 light:bg-[rgba(247,250,255,0.92)] light:border-[rgba(255,255,255,0.82)] light:[box-shadow:var(--light-shadow-panel)]"
    >
      <!-- Header -->
      <div
        class="flex items-center justify-between px-4 sm:px-6 py-4 sm:py-5 border-b transition-colors duration-500 border-white/8 dark:border-white/8 light:border-[rgba(194,208,231,0.72)]"
      >
        <h2
          class="text-[1.1rem] font-medium transition-colors duration-500 text-white dark:text-white light:text-slate-900"
        >
          {{ t("settings.title") }}
        </h2>
        <button
          class="flex items-center justify-center w-8 h-8 bg-transparent border-none rounded-lg cursor-pointer transition-all duration-150 transition-colors duration-500 text-white/50 hover:bg-white/8 hover:text-white dark:text-white/50 dark:hover:bg-white/8 dark:hover:text-white light:text-slate-500 light:hover:bg-[rgba(109,141,196,0.08)] light:hover:text-slate-800"
          @click="emit('close')"
        >
          <span :class="[closeIconClass, 'h-[18px] w-[18px]']" aria-hidden="true" />
        </button>
      </div>

      <!-- Body -->
      <div class="flex-1 overflow-y-auto px-4 sm:px-6 py-4 flex flex-col gap-6 scrollbar-thin">
        <!-- Appearance -->
        <section class="flex flex-col gap-3">
          <h3
            class="text-xs font-semibold uppercase tracking-[0.1em] transition-colors duration-500 text-white/40 dark:text-white/40 light:text-slate-500"
          >
            {{ t("appearance.title") }}
          </h3>
          <div class="flex gap-2 flex-wrap">
            <button
              v-for="opt in colorModeOptions"
              :key="opt.value"
              class="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border text-sm cursor-pointer transition-all duration-150 transition-colors duration-500 bg-transparent"
              :class="
                colorMode === opt.value
                  ? 'bg-accent/15 border-accent/50 text-accent dark:bg-accent/15 dark:border-accent/50 dark:text-accent light:bg-[rgba(74,122,255,0.1)] light:border-[rgba(120,155,231,0.46)] light:text-accent-light light:[box-shadow:inset_0_1px_0_rgba(255,255,255,0.72)]'
                  : 'border-white/12 text-white/60 hover:border-white/25 hover:text-white/90 dark:border-white/12 dark:text-white/60 dark:hover:border-white/25 dark:hover:text-white/90 light:border-[rgba(194,208,231,0.82)] light:text-slate-600 light:hover:border-[rgba(133,162,214,0.62)] light:hover:bg-[rgba(255,255,255,0.62)] light:hover:text-slate-800'
              "
              @click="emit('update:colorMode', opt.value)"
            >
              <span :class="[opt.icon, 'h-4 w-4']" aria-hidden="true" />
              <span>{{ t(opt.label) }}</span>
            </button>
          </div>
        </section>

        <section class="flex flex-col gap-3">
          <h3
            class="text-xs font-semibold uppercase tracking-[0.1em] transition-colors duration-500 text-white/40 dark:text-white/40 light:text-slate-500"
          >
            {{ t("language.title") }}
          </h3>
          <div class="flex gap-2 flex-wrap">
            <label
              v-for="option in languageOptions"
              :key="option.value"
              class="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border text-sm cursor-pointer transition-all duration-150 transition-colors duration-500"
              :class="
                local.language === option.value
                  ? 'bg-accent/15 border-accent/50 text-accent dark:bg-accent/15 dark:border-accent/50 dark:text-accent light:bg-[rgba(74,122,255,0.1)] light:border-[rgba(120,155,231,0.46)] light:text-accent-light light:[box-shadow:inset_0_1px_0_rgba(255,255,255,0.72)]'
                  : 'border-white/12 text-white/60 hover:border-white/25 hover:text-white/90 dark:border-white/12 dark:text-white/60 dark:hover:border-white/25 dark:hover:text-white/90 light:border-[rgba(194,208,231,0.82)] light:text-slate-600 light:hover:border-[rgba(133,162,214,0.62)] light:hover:bg-[rgba(255,255,255,0.62)] light:hover:text-slate-800'
              "
            >
              <input
                :checked="local.language === option.value"
                type="radio"
                :value="option.value"
                class="hidden"
                @change="previewLanguage(option.value)"
              />
              {{ t(option.label) }}
            </label>
          </div>
        </section>

        <!-- Search Engine -->
        <section class="flex flex-col gap-3">
          <h3
            class="text-xs font-semibold uppercase tracking-[0.1em] transition-colors duration-500 text-white/40 dark:text-white/40 light:text-slate-500"
          >
            {{ t("settings.searchEngine") }}
          </h3>
          <div class="flex gap-2 flex-wrap">
            <label
              v-for="(label, key) in engineLabels"
              :key="key"
              class="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border text-sm cursor-pointer transition-all duration-150 transition-colors duration-500"
              :class="
                local.searchEngine === key
                  ? 'bg-accent/15 border-accent/50 text-accent dark:bg-accent/15 dark:border-accent/50 dark:text-accent light:bg-[rgba(74,122,255,0.1)] light:border-[rgba(120,155,231,0.46)] light:text-accent-light light:[box-shadow:inset_0_1px_0_rgba(255,255,255,0.72)]'
                  : 'border-white/12 text-white/60 hover:border-white/25 hover:text-white/90 dark:border-white/12 dark:text-white/60 dark:hover:border-white/25 dark:hover:text-white/90 light:border-[rgba(194,208,231,0.82)] light:text-slate-600 light:hover:border-[rgba(133,162,214,0.62)] light:hover:bg-[rgba(255,255,255,0.62)] light:hover:text-slate-800'
              "
            >
              <input v-model="local.searchEngine" type="radio" :value="key" class="hidden" />
              {{ label }}
            </label>
          </div>
        </section>

        <!-- Search History -->
        <section class="flex flex-col gap-3">
          <h3
            class="text-xs font-semibold uppercase tracking-[0.1em] transition-colors duration-500 text-white/40 dark:text-white/40 light:text-slate-500"
          >
            {{ t("settings.searchHistory") }}
          </h3>
          <div class="flex items-center justify-between">
            <span
              class="text-[0.875rem] transition-colors duration-500 text-white/60 dark:text-white/60 light:text-slate-600"
            >
              {{
                searchHistory.length > 0
                  ? `${searchHistory.length} ${t("search.history").toLowerCase()}`
                  : t("search.noHistory")
              }}
            </span>
            <button
              class="px-3.5 py-1.5 rounded-full border text-sm cursor-pointer transition-all duration-150 transition-colors duration-500 bg-transparent"
              :class="
                confirmingClearHistory
                  ? 'border-red-400/60 text-red-400 bg-red-500/10 dark:border-red-400/60 dark:text-red-400 dark:bg-red-500/10 light:border-red-400/60 light:text-red-500 light:bg-red-500/8'
                  : searchHistory.length === 0
                    ? 'border-white/8 text-white/25 cursor-not-allowed dark:border-white/8 dark:text-white/25 light:border-[rgba(194,208,231,0.5)] light:text-slate-400'
                    : 'border-white/12 text-white/60 hover:border-red-400/40 hover:text-red-400 dark:border-white/12 dark:text-white/60 dark:hover:border-red-400/40 dark:hover:text-red-400 light:border-[rgba(194,208,231,0.82)] light:text-slate-600 light:hover:border-red-400/40 light:hover:text-red-500'
              "
              :disabled="searchHistory.length === 0"
              @click="handleClearHistory"
            >
              {{
                confirmingClearHistory
                  ? t("settings.clearSearchHistoryConfirm")
                  : t("settings.clearSearchHistory")
              }}
            </button>
          </div>
        </section>

        <!-- Clock -->
        <section class="flex flex-col gap-1">
          <h3
            class="text-xs font-semibold uppercase tracking-[0.1em] mb-2 transition-colors duration-500 text-white/40 dark:text-white/40 light:text-slate-500"
          >
            {{ t("settings.clock") }}
          </h3>
          <div
            class="flex items-center justify-between py-2 text-[0.9rem] transition-colors duration-500 text-white/70 dark:text-white/70 light:text-slate-700"
          >
            <span>{{ t("settings.showClock") }}</span>
            <label class="relative cursor-pointer">
              <input v-model="local.showClock" type="checkbox" class="sr-only peer" />
              <span
                class="block w-10 h-[22px] rounded-full transition-colors duration-500 relative bg-white/15 peer-checked:bg-accent dark:bg-white/15 dark:peer-checked:bg-accent light:bg-[rgba(205,218,238,0.92)] light:peer-checked:bg-accent-light light:[box-shadow:inset_0_1px_1px_rgba(140,160,190,0.25)] after:content-[''] after:absolute after:top-[3px] after:left-[3px] after:w-4 after:h-4 after:bg-white after:rounded-full after:transition-transform after:duration-200 after:shadow-[0_2px_8px_rgba(97,120,162,0.24)] peer-checked:after:translate-x-[18px]"
              />
            </label>
          </div>
          <div
            v-if="local.showClock"
            class="flex items-center justify-between py-2 text-[0.9rem] transition-colors duration-500 text-white/70 dark:text-white/70 light:text-slate-700"
          >
            <span>{{ t("settings.showSeconds") }}</span>
            <label class="relative cursor-pointer">
              <input v-model="local.showSeconds" type="checkbox" class="sr-only peer" />
              <span
                class="block w-10 h-[22px] rounded-full transition-colors duration-500 relative bg-white/15 peer-checked:bg-accent dark:bg-white/15 dark:peer-checked:bg-accent light:bg-[rgba(205,218,238,0.92)] light:peer-checked:bg-accent-light light:[box-shadow:inset_0_1px_1px_rgba(140,160,190,0.25)] after:content-[''] after:absolute after:top-[3px] after:left-[3px] after:w-4 after:h-4 after:bg-white after:rounded-full after:transition-transform after:duration-200 after:shadow-[0_2px_8px_rgba(97,120,162,0.24)] peer-checked:after:translate-x-[18px]"
              />
            </label>
          </div>
        </section>

        <!-- Pages Management -->
        <section class="flex flex-col gap-3">
          <h3
            class="text-xs font-semibold uppercase tracking-[0.1em] transition-colors duration-500 text-white/40 dark:text-white/40 light:text-slate-500"
          >
            {{ t("pages.title") }}
          </h3>

          <!-- Page list with reorder controls -->
          <div class="flex flex-col gap-1.5">
            <div
              v-for="(page, index) in local.quickLinkPages"
              :key="page.id"
              class="flex items-center gap-2 px-3 py-2 rounded-lg transition-colors duration-500"
              :class="
                editingPageIndex === index
                  ? 'bg-white/8 dark:bg-white/8 light:bg-[rgba(255,255,255,0.6)] light:ring-1 light:ring-[rgba(120,155,231,0.3)]'
                  : 'bg-white/3 dark:bg-white/3 light:bg-[rgba(255,255,255,0.3)]'
              "
            >
              <button
                v-if="renamingPageIndex === index"
                class="flex-1 flex items-center gap-2 min-w-0"
                @click.stop
              >
                <input
                  v-model="renamePageValue"
                  type="text"
                  class="flex-1 min-w-0 px-2 py-1 rounded text-sm border bg-white/8 border-white/12 text-white/90 outline-none focus:border-accent/50 dark:bg-white/8 dark:border-white/12 dark:text-white/90 light:bg-white light:border-[rgba(200,214,237,0.84)] light:text-slate-900"
                  @keydown="onRenameKeydown"
                  @blur="confirmRenamePage"
                />
              </button>
              <button
                v-else
                class="flex-1 text-left text-sm transition-colors duration-500 text-white/75 hover:text-white dark:text-white/75 dark:hover:text-white light:text-slate-700 light:hover:text-slate-900 cursor-pointer"
                @click="editingPageIndex = index"
              >
                {{ page.name }}
                <span class="text-xs text-white/40 dark:text-white/40 light:text-slate-500">
                  ({{ page.items.length }})
                </span>
              </button>

              <div class="flex items-center gap-0.5">
                <button
                  class="flex items-center justify-center w-6 h-6 bg-transparent border-none rounded cursor-pointer text-white/30 hover:bg-white/10 hover:text-white/80 disabled:opacity-20 disabled:cursor-not-allowed dark:text-white/30 dark:hover:bg-white/10 dark:hover:text-white/80 light:text-slate-400 light:hover:bg-[rgba(109,141,196,0.08)] light:hover:text-slate-700"
                  :disabled="index === 0"
                  :title="t('settings.moveUp')"
                  @click="movePageUp(index)"
                >
                  ↑
                </button>
                <button
                  class="flex items-center justify-center w-6 h-6 bg-transparent border-none rounded cursor-pointer text-white/30 hover:bg-white/10 hover:text-white/80 disabled:opacity-20 disabled:cursor-not-allowed dark:text-white/30 dark:hover:bg-white/10 dark:hover:text-white/80 light:text-slate-400 light:hover:bg-[rgba(109,141,196,0.08)] light:hover:text-slate-700"
                  :disabled="index === local.quickLinkPages.length - 1"
                  :title="t('settings.moveDown')"
                  @click="movePageDown(index)"
                >
                  ↓
                </button>
                <button
                  class="flex items-center justify-center w-6 h-6 bg-transparent border-none rounded cursor-pointer text-white/30 hover:bg-white/10 hover:text-white/80 dark:text-white/30 dark:hover:bg-white/10 dark:hover:text-white/80 light:text-slate-400 light:hover:bg-[rgba(109,141,196,0.08)] light:hover:text-slate-700"
                  :title="t('pages.rename')"
                  @click="startRenamePage(index)"
                >
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                  >
                    <path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                  </svg>
                </button>
                <button
                  v-if="local.quickLinkPages.length > 1"
                  class="flex items-center justify-center w-6 h-6 bg-transparent border-none rounded cursor-pointer transition-all duration-150 text-white/30 hover:bg-red-500/15 hover:text-red-400 dark:text-white/30 dark:hover:bg-red-500/15 dark:hover:text-red-400 light:text-slate-400 light:hover:bg-red-500/10 light:hover:text-red-500"
                  :title="t('pages.delete')"
                  @click="requestDeletePage(index)"
                >
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                  >
                    <path d="M18 6 6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          <!-- Delete confirmation -->
          <div
            v-if="deleteConfirmActive && deletingPageIndex !== null"
            class="flex items-center gap-2 text-xs"
          >
            <span class="text-red-400 dark:text-red-400 light:text-red-600">
              {{
                t("pages.deleteConfirm", {
                  name: local.quickLinkPages[deletingPageIndex]?.name ?? "",
                  count: local.quickLinkPages[deletingPageIndex]?.items.length ?? 0,
                })
              }}
            </span>
            <button
              class="px-2 py-0.5 rounded text-xs border-none cursor-pointer bg-red-500/20 text-red-400 hover:bg-red-500/30 dark:bg-red-500/20 dark:text-red-400 dark:hover:bg-red-500/30 light:bg-red-500/15 light:text-red-600"
              @click="confirmDeletePage"
            >
              {{ t("common.save") }}
            </button>
            <button
              class="px-2 py-0.5 rounded text-xs border-none cursor-pointer bg-white/8 text-white/60 hover:bg-white/12 dark:bg-white/8 dark:text-white/60 dark:hover:bg-white/12 light:bg-[rgba(255,255,255,0.6)] light:text-slate-600"
              @click="cancelDeletePage"
            >
              {{ t("common.cancel") }}
            </button>
          </div>

          <!-- Add page -->
          <div v-if="addingPage" class="flex gap-2 items-center">
            <input
              v-model="newPageName"
              type="text"
              class="flex-1 min-w-0 px-3 py-1.5 rounded-lg text-sm border bg-white/8 border-white/12 text-white/90 outline-none focus:border-accent/50 dark:bg-white/8 dark:border-white/12 dark:text-white/90 light:bg-white light:border-[rgba(200,214,237,0.84)] light:text-slate-900"
              :placeholder="t('pages.pageName')"
              @keydown.enter="addPage"
              @keydown.escape="addingPage = false"
            />
            <button
              class="px-3 py-1.5 rounded-lg text-xs font-semibold border-none cursor-pointer bg-accent text-slate-950 dark:bg-accent dark:text-slate-950 light:bg-accent-light light:text-white"
              @click="addPage"
            >
              {{ t("common.add") }}
            </button>
            <button
              class="px-3 py-1.5 rounded-lg text-xs border cursor-pointer bg-white/8 border-white/12 text-white/70 dark:bg-white/8 dark:border-white/12 dark:text-white/70 light:bg-[rgba(255,255,255,0.7)] light:text-slate-600"
              @click="addingPage = false"
            >
              {{ t("common.cancel") }}
            </button>
          </div>
          <button
            v-else
            class="py-1.5 bg-transparent border-none text-sm cursor-pointer text-left text-accent/70 hover:text-accent dark:text-accent/70 dark:hover:text-accent light:text-accent-light/80 light:hover:text-accent-light"
            @click="addingPage = true"
          >
            + {{ t("pages.addPage") }}
          </button>
        </section>

        <!-- Quick Links (page-scoped) -->
        <section class="flex flex-col gap-2">
          <h3
            class="text-xs font-semibold uppercase tracking-[0.1em] mb-1 transition-colors duration-500 text-white/40 dark:text-white/40 light:text-slate-500"
          >
            {{ t("settings.quickLinks") }}
            <template v-if="local.quickLinkPages[editingPageIndex]">
              — {{ local.quickLinkPages[editingPageIndex].name }}
            </template>
          </h3>

          <div
            class="flex flex-col gap-3 p-3 rounded-[10px] border transition-colors duration-500 bg-white/4 border-white/8 dark:bg-white/4 dark:border-white/8 light:bg-[rgba(255,255,255,0.5)] light:border-[rgba(206,218,239,0.82)]"
          >
            <div class="flex items-center justify-between gap-3 flex-wrap">
              <span
                class="text-[0.875rem] transition-colors duration-500 text-white/75 dark:text-white/75 light:text-slate-700"
              >
                {{ t("settings.importMode") }}
              </span>
              <div class="flex gap-2 flex-wrap">
                <button
                  class="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border text-sm cursor-pointer transition-all duration-150 transition-colors duration-500 bg-transparent"
                  :class="
                    importMode === 'merge'
                      ? 'bg-accent/15 border-accent/50 text-accent dark:bg-accent/15 dark:border-accent/50 dark:text-accent light:bg-[rgba(74,122,255,0.1)] light:border-[rgba(120,155,231,0.46)] light:text-accent-light light:[box-shadow:inset_0_1px_0_rgba(255,255,255,0.72)]'
                      : 'border-white/12 text-white/60 hover:border-white/25 hover:text-white/90 dark:border-white/12 dark:text-white/60 dark:hover:border-white/25 dark:hover:text-white/90 light:border-[rgba(194,208,231,0.82)] light:text-slate-600 light:hover:border-[rgba(133,162,214,0.62)] light:hover:bg-[rgba(255,255,255,0.62)] light:hover:text-slate-800'
                  "
                  @click="importMode = 'merge'"
                >
                  {{ t("common.merge") }}
                </button>
                <button
                  class="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border text-sm cursor-pointer transition-all duration-150 transition-colors duration-500 bg-transparent"
                  :class="
                    importMode === 'replace'
                      ? 'bg-accent/15 border-accent/50 text-accent dark:bg-accent/15 dark:border-accent/50 dark:text-accent light:bg-[rgba(74,122,255,0.1)] light:border-[rgba(120,155,231,0.46)] light:text-accent-light light:[box-shadow:inset_0_1px_0_rgba(255,255,255,0.72)]'
                      : 'border-white/12 text-white/60 hover:border-white/25 hover:text-white/90 dark:border-white/12 dark:text-white/60 dark:hover:border-white/25 dark:hover:text-white/90 light:border-[rgba(194,208,231,0.82)] light:text-slate-600 light:hover:border-[rgba(133,162,214,0.62)] light:hover:bg-[rgba(255,255,255,0.62)] light:hover:text-slate-800'
                  "
                  @click="importMode = 'replace'"
                >
                  {{ t("common.replace") }}
                </button>
              </div>
            </div>

            <button
              class="px-[18px] py-2 rounded-lg text-[0.875rem] font-semibold cursor-pointer transition-colors duration-500 border-none bg-accent text-slate-950 hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60 dark:bg-accent dark:text-slate-950 dark:hover:bg-accent-hover light:bg-accent-light light:text-white light:hover:bg-accent-light-hover"
              :disabled="!bookmarksApiAvailable || importingBookmarks"
              @click="importBookmarks"
            >
              {{
                importingBookmarks
                  ? `${t("settings.importBookmarks")}...`
                  : t("settings.importBookmarks")
              }}
            </button>

            <p
              v-if="!bookmarksApiAvailable"
              class="text-xs transition-colors duration-500 text-white/45 dark:text-white/45 light:text-slate-500"
            >
              {{ t("settings.importUnavailable") }}
            </p>
            <p
              v-else-if="importFeedback"
              class="text-xs"
              :class="
                importFeedback.type === 'error'
                  ? 'text-red-300 dark:text-red-300 light:text-red-600'
                  : 'text-emerald-300 dark:text-emerald-300 light:text-emerald-600'
              "
            >
              {{ importFeedback.message }}
            </p>
          </div>

          <p
            class="text-xs mt-1 transition-colors duration-500 text-white/40 dark:text-white/40 light:text-slate-500"
          >
            {{ t("settings.manageLinks") }}
          </p>

          <div class="flex flex-col gap-1 mb-1">
            <div
              v-for="(item, index) in currentPageItems()"
              :key="item.id"
              class="px-2.5 py-2 rounded-lg transition-colors duration-500 bg-white/4 dark:bg-white/4 light:bg-[rgba(255,255,255,0.56)] light:border light:border-[rgba(210,221,239,0.8)]"
              :class="[
                dragSourceIndex === index ? 'opacity-55 cursor-grabbing' : 'cursor-grab',
                dragTargetIndex === index && dragSourceIndex !== index
                  ? 'ring-1 ring-accent/60 dark:ring-accent/60 light:ring-[rgba(74,122,255,0.42)]'
                  : '',
              ]"
              draggable="true"
              @dragstart="onDragStart($event, index)"
              @dragover="onDragOver($event, index)"
              @drop="onDrop($event, index)"
              @dragend="resetDragState"
            >
              <div class="grid grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)_auto] gap-2">
                <input
                  v-model="item.name"
                  class="min-w-0 px-3 py-2 rounded-lg text-[0.875rem] outline-none border transition-colors duration-500 bg-white/6 border-white/10 text-white placeholder:text-white/25 focus:border-accent/50 dark:bg-white/6 dark:border-white/10 dark:text-white dark:placeholder:text-white/25 dark:focus:border-accent/50 light:bg-[rgba(255,255,255,0.82)] light:border-[rgba(200,214,237,0.84)] light:text-slate-900 light:placeholder:text-slate-400 light:focus:border-[rgba(120,155,231,0.56)]"
                  :placeholder="t('settings.linkName')"
                  @blur="isFolder(item) ? onFolderFieldBlur(item.id) : undefined"
                />
                <template v-if="isFolder(item)">
                  <div
                    class="min-w-0 px-3 py-2 rounded-lg text-[0.875rem] border transition-colors duration-500 bg-white/6 border-white/10 text-white/55 dark:bg-white/6 dark:border-white/10 dark:text-white/55 light:bg-[rgba(255,255,255,0.82)] light:border-[rgba(200,214,237,0.84)] light:text-slate-500"
                  >
                    {{ t("quickLinks.folderContains", { count: item.links.length }) }}
                  </div>
                </template>
                <input
                  v-else
                  v-model="item.url"
                  class="min-w-0 px-3 py-2 rounded-lg text-[0.875rem] outline-none border transition-colors duration-500 bg-white/6 border-white/10 text-white placeholder:text-white/25 focus:border-accent/50 dark:bg-white/6 dark:border-white/10 dark:text-white dark:placeholder:text-white/25 dark:focus:border-accent/50 light:bg-[rgba(255,255,255,0.82)] light:border-[rgba(200,214,237,0.84)] light:text-slate-900 light:placeholder:text-slate-400 light:focus:border-[rgba(120,155,231,0.56)]"
                  :placeholder="t('settings.linkUrl')"
                />
                <div class="flex items-center justify-end gap-1">
                  <!-- Move to page selector -->
                  <select
                    v-if="local.quickLinkPages.length > 1"
                    class="h-7 text-[10px] rounded bg-white/6 border border-white/10 text-white/50 dark:bg-white/6 dark:border-white/10 dark:text-white/50 light:bg-white light:border-[rgba(200,214,237,0.84)] light:text-slate-500 cursor-pointer"
                    :value="moveLinkPageTarget[item.id] ?? ''"
                    @change="moveLinkToPage(item.id, ($event.target as HTMLSelectElement).value)"
                  >
                    <option value="" disabled>{{ t("pages.moveToPage") }}</option>
                    <option
                      v-for="page in local.quickLinkPages"
                      :key="page.id"
                      :value="page.id"
                      :disabled="page.id === local.quickLinkPages[editingPageIndex]?.id"
                    >
                      {{ page.name }}
                    </option>
                  </select>
                  <button
                    class="flex items-center justify-center w-7 h-7 bg-transparent border-none rounded-md cursor-pointer flex-shrink-0 transition-all duration-150 transition-colors duration-500 text-white/30 hover:bg-white/10 hover:text-white/90 disabled:cursor-not-allowed disabled:opacity-30 dark:text-white/30 dark:hover:bg-white/10 dark:hover:text-white/90 light:text-slate-400 light:hover:bg-[rgba(109,141,196,0.08)] light:hover:text-slate-700"
                    :disabled="index === 0"
                    :title="t('settings.moveUp')"
                    @click="moveLink(index, -1)"
                  >
                    ↑
                  </button>
                  <button
                    class="flex items-center justify-center w-7 h-7 bg-transparent border-none rounded-md cursor-pointer flex-shrink-0 transition-all duration-150 transition-colors duration-500 text-white/30 hover:bg-white/10 hover:text-white/90 disabled:cursor-not-allowed disabled:opacity-30 dark:text-white/30 dark:hover:bg-white/10 dark:hover:text-white/90 light:text-slate-400 light:hover:bg-[rgba(109,141,196,0.08)] light:hover:text-slate-700"
                    :disabled="index === currentPageItems().length - 1"
                    :title="t('settings.moveDown')"
                    @click="moveLink(index, 1)"
                  >
                    ↓
                  </button>
                  <button
                    class="flex items-center justify-center w-7 h-7 bg-transparent border-none rounded-md cursor-pointer flex-shrink-0 transition-all duration-150 transition-colors duration-500 text-white/30 hover:bg-red-500/15 hover:text-red-400 dark:text-white/30 dark:hover:bg-red-500/15 dark:hover:text-red-400 light:text-slate-400 light:hover:bg-red-500/10 light:hover:text-red-500"
                    :title="t('settings.removeLink')"
                    @click="removeItem(item.id)"
                  >
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                    >
                      <path d="M18 6 6 18M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              <div v-if="isFolder(item)" class="mt-2 flex flex-col gap-2 pl-3">
                <div
                  v-for="folderLink in asFolderLinks(item)"
                  :key="folderLink.id"
                  class="grid grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)_auto] gap-2 rounded-lg border px-2.5 py-2 bg-white/4 border-white/8 dark:bg-white/4 dark:border-white/8 light:bg-[rgba(255,255,255,0.52)] light:border-[rgba(210,221,239,0.78)]"
                >
                  <input
                    v-model="folderLink.name"
                    class="min-w-0 px-3 py-2 rounded-lg text-[0.875rem] outline-none border transition-colors duration-500 bg-white/6 border-white/10 text-white placeholder:text-white/25 focus:border-accent/50 dark:bg-white/6 dark:border-white/10 dark:text-white dark:placeholder:text-white/25 dark:focus:border-accent/50 light:bg-[rgba(255,255,255,0.82)] light:border-[rgba(200,214,237,0.84)] light:text-slate-900 light:placeholder:text-slate-400 light:focus:border-[rgba(120,155,231,0.56)]"
                    :placeholder="t('settings.linkName')"
                    @blur="onFolderFieldBlur(item.id)"
                  />
                  <input
                    v-model="folderLink.url"
                    class="min-w-0 px-3 py-2 rounded-lg text-[0.875rem] outline-none border transition-colors duration-500 bg-white/6 border-white/10 text-white placeholder:text-white/25 focus:border-accent/50 dark:bg-white/6 dark:border-white/10 dark:text-white dark:placeholder:text-white/25 dark:focus:border-accent/50 light:bg-[rgba(255,255,255,0.82)] light:border-[rgba(200,214,237,0.84)] light:text-slate-900 light:placeholder:text-slate-400 light:focus:border-[rgba(120,155,231,0.56)]"
                    :placeholder="t('settings.linkUrl')"
                    @blur="onFolderFieldBlur(item.id)"
                  />
                  <div class="flex items-center justify-end gap-1">
                    <button
                      class="flex items-center justify-center w-7 h-7 bg-transparent border-none rounded-md cursor-pointer flex-shrink-0 transition-all duration-150 transition-colors duration-500 text-white/30 hover:bg-red-500/15 hover:text-red-400 dark:text-white/30 dark:hover:bg-red-500/15 dark:hover:text-red-400 light:text-slate-400 light:hover:bg-red-500/10 light:hover:text-red-500"
                      :title="t('settings.removeLink')"
                      @click="removeFolderLink(item.id, folderLink.id)"
                    >
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                      >
                        <path d="M18 6 6 18M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
                <button
                  class="self-start py-1 text-xs text-white/45 transition-colors duration-500 hover:text-white/80 dark:text-white/45 dark:hover:text-white/80 light:text-slate-500 light:hover:text-slate-800"
                  @click="onFolderFieldBlur(item.id)"
                >
                  {{ t("common.save") }}
                </button>
              </div>
            </div>
          </div>

          <!-- Add form -->
          <div
            v-if="addingLink"
            class="flex flex-col gap-2 p-3 rounded-[10px] border transition-colors duration-500 bg-white/4 border-white/8 dark:bg-white/4 dark:border-white/8 light:bg-[rgba(255,255,255,0.5)] light:border-[rgba(206,218,239,0.82)]"
          >
            <input
              v-model="newLink.name"
              class="w-full px-3 py-2 rounded-lg text-[0.875rem] outline-none border transition-colors duration-500 bg-white/6 border-white/10 text-white placeholder:text-white/25 focus:border-accent/50 dark:bg-white/6 dark:border-white/10 dark:text-white dark:placeholder:text-white/25 dark:focus:border-accent/50 light:bg-[rgba(255,255,255,0.82)] light:border-[rgba(200,214,237,0.84)] light:text-slate-900 light:placeholder:text-slate-400 light:focus:border-[rgba(120,155,231,0.56)]"
              :placeholder="t('settings.linkName')"
              @keydown.enter="addLink"
              @keydown.escape="addingLink = false"
            />
            <input
              v-model="newLink.url"
              class="w-full px-3 py-2 rounded-lg text-[0.875rem] outline-none border transition-colors duration-500 bg-white/6 border-white/10 text-white placeholder:text-white/25 focus:border-accent/50 dark:bg-white/6 dark:border-white/10 dark:text-white dark:placeholder:text-white/25 dark:focus:border-accent/50 light:bg-[rgba(255,255,255,0.82)] light:border-[rgba(200,214,237,0.84)] light:text-slate-900 light:placeholder:text-slate-400 light:focus:border-[rgba(120,155,231,0.56)]"
              :placeholder="t('settings.linkUrl')"
              @keydown.enter="addLink"
              @keydown.escape="addingLink = false"
            />
            <div class="flex gap-2 justify-end">
              <button
                class="px-[18px] py-2 rounded-lg text-[0.875rem] cursor-pointer transition-colors duration-500 border bg-white/8 border-white/12 text-white/70 hover:bg-white/12 dark:bg-white/8 dark:border-white/12 dark:text-white/70 dark:hover:bg-white/12 light:bg-[rgba(255,255,255,0.72)] light:border-[rgba(200,214,237,0.84)] light:text-slate-600 light:hover:bg-[rgba(255,255,255,0.9)]"
                @click="addingLink = false"
              >
                {{ t("common.cancel") }}
              </button>
              <button
                class="px-[18px] py-2 rounded-lg text-[0.875rem] font-semibold cursor-pointer transition-colors duration-500 border-none bg-accent text-slate-950 hover:bg-accent-hover dark:bg-accent dark:text-slate-950 dark:hover:bg-accent-hover light:bg-accent-light light:text-white light:hover:bg-accent-light-hover"
                @click="addLink"
              >
                {{ t("common.add") }}
              </button>
            </div>
          </div>

          <button
            v-else
            class="py-2 bg-transparent border-none text-[0.875rem] cursor-pointer transition-colors duration-500 text-left text-accent/70 hover:text-accent dark:text-accent/70 dark:hover:text-accent light:text-accent-light/80 light:hover:text-accent-light"
            @click="addingLink = true"
          >
            + {{ t("settings.addLink") }}
          </button>
        </section>
      </div>

      <!-- Footer -->
      <div
        class="flex gap-2 justify-end px-4 sm:px-6 py-4 border-t transition-colors duration-500 border-white/8 dark:border-white/8 light:border-[rgba(194,208,231,0.72)]"
      >
        <button
          class="px-[18px] py-2 rounded-lg text-[0.875rem] cursor-pointer transition-colors duration-500 border bg-white/8 border-white/12 text-white/70 hover:bg-white/12 dark:bg-white/8 dark:border-white/12 dark:text-white/70 dark:hover:bg-white/12 light:bg-[rgba(255,255,255,0.72)] light:border-[rgba(200,214,237,0.84)] light:text-slate-600 light:hover:bg-[rgba(255,255,255,0.9)]"
          @click="emit('close')"
        >
          {{ t("common.cancel") }}
        </button>
        <button
          class="px-[18px] py-2 rounded-lg text-[0.875rem] font-semibold cursor-pointer transition-colors duration-500 border-none bg-accent text-slate-950 hover:bg-accent-hover dark:bg-accent dark:text-slate-950 dark:hover:bg-accent-hover light:bg-accent-light light:text-white light:hover:bg-accent-light-hover"
          @click="save"
        >
          {{ t("common.save") }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Custom scrollbar — cannot be done with Tailwind utilities */
.scrollbar-thin::-webkit-scrollbar {
  width: 4px;
}

.scrollbar-thin::-webkit-scrollbar-track {
  background: transparent;
}

.scrollbar-thin::-webkit-scrollbar-thumb {
  background: rgba(148, 163, 184, 0.5);
  border-radius: 2px;
}
</style>
