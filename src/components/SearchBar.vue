<script setup lang="ts">
import { ref, computed, nextTick } from "vue";
import { useI18n } from "vue-i18n";
import { useSearchHistory } from "../composables/useSearchHistory";

const props = defineProps<{
  engine: "google" | "bing" | "baidu" | "duckduckgo";
}>();

const emit = defineEmits<{
  changeEngine: [engine: "google" | "bing" | "baidu" | "duckduckgo"];
}>();

const query = ref("");
const { t } = useI18n();
const { history, addHistory, removeHistory, getMatches } = useSearchHistory();

const engines = {
  google: {
    name: "Google",
    url: "https://www.google.com/search?q=",
    icon: "icon-[logos--google-icon]",
    favicon: "",
  },
  bing: {
    name: "Bing",
    url: "https://www.bing.com/search?q=",
    icon: "icon-[logos--bing]",
    favicon: "",
  },
  baidu: {
    name: "Baidu",
    url: "https://www.baidu.com/s?wd=",
    icon: "",
    favicon: "https://www.baidu.com/favicon.ico",
  },
  duckduckgo: {
    name: "DuckDuckGo",
    url: "https://duckduckgo.com/?q=",
    icon: "icon-[logos--duckduckgo]",
    favicon: "",
  },
};

const showEngineMenu = ref(false);

// --- Search history dropdown ---
const showHistory = ref(false);
const activeIndex = ref(-1);
const inputRef = ref<HTMLInputElement | null>(null);

const suggestions = computed(() => getMatches(query.value));
const shouldShowHistoryDropdown = computed(
  () => showHistory.value && (suggestions.value.length > 0 || history.value.length > 0),
);
const showEmptyHistoryState = computed(
  () => query.value.trim().length > 0 && suggestions.value.length === 0 && history.value.length > 0,
);

function onInput() {
  activeIndex.value = -1;
  showHistory.value = true;
}

function onFocus() {
  if (history.value.length > 0) {
    showHistory.value = true;
  }
}

function onBlur() {
  // Delay so click on suggestion item fires first
  setTimeout(() => {
    showHistory.value = false;
    activeIndex.value = -1;
  }, 150);
}

function onArrowDown() {
  if (!showHistory.value) {
    showHistory.value = true;
    return;
  }
  if (suggestions.value.length === 0) return;
  activeIndex.value = Math.min(activeIndex.value + 1, suggestions.value.length - 1);
  query.value = suggestions.value[activeIndex.value].query;
}

function onArrowUp() {
  if (suggestions.value.length === 0) return;
  if (activeIndex.value <= 0) {
    activeIndex.value = -1;
    // Restore original input — keep whatever was typed
    return;
  }
  activeIndex.value = Math.max(activeIndex.value - 1, 0);
  query.value = suggestions.value[activeIndex.value].query;
}

function onEscape() {
  if (showHistory.value) {
    showHistory.value = false;
    activeIndex.value = -1;
  } else {
    query.value = "";
  }
}

function selectSuggestion(item: { query: string }) {
  query.value = item.query;
  showHistory.value = false;
  activeIndex.value = -1;
  nextTick(() => {
    doSearch();
  });
}

function deleteSuggestion(event: MouseEvent, q: string) {
  event.stopPropagation();
  removeHistory(q);
  activeIndex.value = -1;
}

// --- Search ---
function search() {
  if (!query.value.trim()) return;
  doSearch();
}

function doSearch() {
  const q = query.value.trim();
  if (!q) return;
  addHistory(q);
  showHistory.value = false;
  const url = engines[props.engine].url + encodeURIComponent(q);
  window.location.href = url;
}

function selectEngine(key: keyof typeof engines) {
  emit("changeEngine", key);
  showEngineMenu.value = false;
}
</script>

<template>
  <div class="relative w-full max-w-[600px] px-4 sm:px-0">
    <!-- Search box -->
    <div
      class="flex items-center rounded-full backdrop-blur-2xl overflow-hidden border transition-all duration-200 transition-colors duration-500 bg-white/10 border-white/15 dark:bg-white/10 dark:border-white/15 light:bg-[rgba(255,255,255,0.68)] light:border-[rgba(255,255,255,0.76)] light:[box-shadow:var(--light-shadow-float)] focus-within:border-accent/50 focus-within:shadow-[0_0_0_3px_rgba(120,160,255,0.15)] dark:focus-within:border-accent/50 light:focus-within:border-[rgba(139,170,226,0.62)] light:focus-within:[box-shadow:var(--light-ring),0_22px_44px_rgba(117,144,187,0.22),inset_0_1px_0_rgba(255,255,255,0.82)]"
    >
      <!-- Engine selector -->
      <button
        class="flex items-center justify-center w-11 h-11 bg-transparent border-none cursor-pointer flex-shrink-0 rounded-l-full transition-colors duration-150 hover:bg-white/8 dark:hover:bg-white/8 light:hover:bg-[rgba(109,141,196,0.08)]"
        :title="engines[engine].name"
        @click="showEngineMenu = !showEngineMenu"
      >
        <span v-if="engines[engine].icon" :class="[engines[engine].icon, 'w-[18px] h-[18px]']" />
        <img
          v-else
          :src="engines[engine].favicon"
          class="w-[18px] h-[18px] object-contain"
          :alt="engines[engine].name"
        />
      </button>

      <!-- Input -->
      <input
        ref="inputRef"
        v-model="query"
        class="flex-1 h-11 bg-transparent border-none outline-none text-base px-2 transition-colors duration-500 text-white placeholder:text-white/30 dark:text-white dark:placeholder:text-white/30 light:text-slate-900 light:placeholder:text-slate-500/80"
        type="text"
        :placeholder="t('search.placeholder')"
        autofocus
        autocomplete="off"
        @input="onInput"
        @focus="onFocus"
        @blur="onBlur"
        @keydown.enter.prevent="search"
        @keydown.escape.prevent="onEscape"
        @keydown.arrow-down.prevent="onArrowDown"
        @keydown.arrow-up.prevent="onArrowUp"
      />

      <!-- Search button -->
      <button
        class="flex items-center justify-center w-11 h-11 bg-transparent border-none cursor-pointer flex-shrink-0 rounded-r-full transition-all duration-150 transition-colors duration-500 text-white/50 hover:text-white hover:bg-white/8 dark:text-white/50 dark:hover:text-white dark:hover:bg-white/8 light:text-slate-500 light:hover:text-slate-900 light:hover:bg-[rgba(109,141,196,0.08)]"
        :title="t('search.submit')"
        @click="search"
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.35-4.35" />
        </svg>
      </button>
    </div>

    <!-- Search history dropdown -->
    <Transition name="dropdown">
      <div
        v-if="shouldShowHistoryDropdown"
        class="absolute top-[calc(100%+8px)] left-4 right-4 sm:left-0 sm:right-0 rounded-xl backdrop-blur-xl border p-1.5 z-[100] shadow-[0_8px_32px_rgba(0,0,0,0.4)] transition-colors duration-500 bg-slate-900/95 border-white/12 dark:bg-slate-900/95 dark:border-white/12 light:bg-[rgba(248,251,255,0.84)] light:border-[rgba(255,255,255,0.78)] light:[box-shadow:0_20px_46px_rgba(116,138,176,0.2),inset_0_1px_0_rgba(255,255,255,0.84)]"
      >
        <div
          class="px-3 py-2 text-[0.72rem] font-semibold uppercase tracking-[0.08em] transition-colors duration-500 text-white/35 dark:text-white/35 light:text-slate-400"
        >
          {{ t("search.history") }}
        </div>
        <div
          v-for="(item, index) in suggestions"
          :key="item.query"
          class="group flex items-center gap-2.5 w-full px-3 py-2 rounded-lg cursor-pointer transition-all duration-100"
          :class="
            index === activeIndex
              ? 'bg-white/10 dark:bg-white/10 light:bg-[rgba(109,141,196,0.12)]'
              : 'hover:bg-white/6 dark:hover:bg-white/6 light:hover:bg-[rgba(109,141,196,0.08)]'
          "
          @mousedown.prevent="selectSuggestion(item)"
        >
          <!-- Clock icon -->
          <svg
            class="w-[15px] h-[15px] flex-shrink-0 text-white/30 dark:text-white/30 light:text-slate-400"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>

          <!-- Query text -->
          <span
            class="flex-1 text-[0.9rem] truncate transition-colors duration-500 text-white/80 dark:text-white/80 light:text-slate-700"
          >
            {{ item.query }}
          </span>

          <!-- Delete button -->
          <button
            class="flex-shrink-0 opacity-0 group-hover:opacity-100 flex items-center justify-center w-5 h-5 rounded-full transition-all duration-100 text-white/40 hover:text-white/80 hover:bg-white/10 dark:text-white/40 dark:hover:text-white/80 dark:hover:bg-white/10 light:text-slate-400 light:hover:text-slate-600 light:hover:bg-[rgba(109,141,196,0.12)]"
            :title="t('common.cancel')"
            @mousedown.prevent="deleteSuggestion($event, item.query)"
          >
            <svg
              width="10"
              height="10"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2.5"
            >
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div
          v-if="showEmptyHistoryState"
          class="px-3 py-3 text-[0.875rem] transition-colors duration-500 text-white/45 dark:text-white/45 light:text-slate-500"
        >
          {{ t("search.noMatches") }}
        </div>
      </div>
    </Transition>

    <!-- Engine dropdown -->
    <Transition name="dropdown">
      <div
        v-if="showEngineMenu"
        class="absolute top-[calc(100%+8px)] left-0 right-0 sm:left-0 sm:right-auto rounded-xl backdrop-blur-xl border p-1.5 min-w-40 z-[100] shadow-[0_8px_32px_rgba(0,0,0,0.4)] transition-colors duration-500 bg-slate-900/95 border-white/12 dark:bg-slate-900/95 dark:border-white/12 light:bg-[rgba(248,251,255,0.84)] light:border-[rgba(255,255,255,0.78)] light:[box-shadow:0_20px_46px_rgba(116,138,176,0.2),inset_0_1px_0_rgba(255,255,255,0.84)]"
      >
        <button
          v-for="(eng, key) in engines"
          :key="key"
          class="flex items-center gap-2.5 w-full px-3 py-2 bg-transparent border-none rounded-lg cursor-pointer text-[0.9rem] transition-all duration-150 transition-colors duration-500 text-left text-white/70 hover:bg-white/8 hover:text-white dark:text-white/70 dark:hover:bg-white/8 dark:hover:text-white light:text-slate-600 light:hover:bg-[rgba(109,141,196,0.1)] light:hover:text-slate-900"
          :class="
            key === engine
              ? 'text-accent bg-accent/10 dark:text-accent dark:bg-accent/10 light:text-accent-light light:bg-[rgba(74,122,255,0.12)]'
              : ''
          "
          @click="selectEngine(key as keyof typeof engines)"
        >
          <span v-if="eng.icon" :class="[eng.icon, 'w-[18px] h-[18px] flex-shrink-0']" />
          <img
            v-else
            :src="eng.favicon"
            class="w-[18px] h-[18px] object-contain flex-shrink-0"
            :alt="eng.name"
          />
          <span>{{ eng.name }}</span>
        </button>
      </div>
    </Transition>

    <!-- Click outside to close engine menu -->
    <div v-if="showEngineMenu" class="fixed inset-0 z-[99]" @click="showEngineMenu = false" />
  </div>
</template>

<style scoped>
/* Vue Transition — cannot be done with Tailwind */
.dropdown-enter-active,
.dropdown-leave-active {
  transition:
    opacity 0.15s ease,
    transform 0.15s ease;
}

.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}
</style>
