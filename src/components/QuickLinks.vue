<script setup lang="ts">
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";
import type { QuickLink, LinkGroup } from "../composables/useStorage";
import { getKnownQuickLinkIcon } from "../composables/quickLinkIcons";

const props = defineProps<{
  links: QuickLink[];
  linkGroups: LinkGroup[];
  pinnedLinkIds: string[];
}>();

const emit = defineEmits<{
  "open-manager": [];
}>();

const { t } = useI18n();

const PINNED_MAX = 12;
const showMorePanel = ref(false);
const activeGroupId = ref<string | null>(null); // null = pinned/home view

// ── helpers ──────────────────────────────────────────────────────────────────

function getLinkById(id: string): QuickLink | undefined {
  return props.links.find((l) => l.id === id);
}

function getIconClass(link: QuickLink): string {
  return getKnownQuickLinkIcon(link.url);
}

function getInitial(name: string): string {
  return name.charAt(0).toUpperCase();
}

// ── computed ──────────────────────────────────────────────────────────────────

/** Links shown in the main grid (pinned or active group, capped at PINNED_MAX) */
const visibleLinks = computed<QuickLink[]>(() => {
  if (activeGroupId.value === null) {
    // Home view: show pinned links
    return props.pinnedLinkIds
      .map((id) => getLinkById(id))
      .filter((l): l is QuickLink => l !== undefined)
      .slice(0, PINNED_MAX);
  }
  // Group view: show all links in the group, capped at PINNED_MAX
  const group = props.linkGroups.find((g) => g.id === activeGroupId.value);
  if (!group) return [];
  return group.linkIds
    .map((id) => getLinkById(id))
    .filter((l): l is QuickLink => l !== undefined)
    .slice(0, PINNED_MAX);
});

/** Total count for the "more" button */
const totalCount = computed<number>(() => {
  if (activeGroupId.value === null) {
    return props.pinnedLinkIds.filter((id) => getLinkById(id)).length;
  }
  const group = props.linkGroups.find((g) => g.id === activeGroupId.value);
  return group ? group.linkIds.filter((id) => getLinkById(id)).length : 0;
});

const overflowCount = computed(() => Math.max(0, totalCount.value - PINNED_MAX));

/** All links for the "more" panel */
const morePanelLinks = computed<QuickLink[]>(() => {
  if (activeGroupId.value === null) {
    return props.pinnedLinkIds
      .map((id) => getLinkById(id))
      .filter((l): l is QuickLink => l !== undefined);
  }
  const group = props.linkGroups.find((g) => g.id === activeGroupId.value);
  if (!group) return [];
  return group.linkIds.map((id) => getLinkById(id)).filter((l): l is QuickLink => l !== undefined);
});

// Search inside the more panel
const morePanelSearch = ref("");
const filteredMoreLinks = computed(() => {
  const q = morePanelSearch.value.trim().toLowerCase();
  if (!q) return morePanelLinks.value;
  return morePanelLinks.value.filter(
    (l) => l.name.toLowerCase().includes(q) || l.url.toLowerCase().includes(q),
  );
});

function openMorePanel() {
  morePanelSearch.value = "";
  showMorePanel.value = true;
}

function closeMorePanel() {
  showMorePanel.value = false;
}
</script>

<template>
  <div class="flex flex-col items-center gap-3 w-full max-w-[760px]">
    <!-- Group tab bar -->
    <div
      v-if="linkGroups.length > 0"
      class="flex items-center gap-1.5 flex-wrap justify-center px-2"
    >
      <!-- Home / pinned tab -->
      <button
        class="flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium border cursor-pointer transition-all duration-150 transition-colors duration-500 bg-transparent"
        :class="
          activeGroupId === null
            ? 'bg-white/15 border-white/25 text-white dark:bg-white/15 dark:border-white/25 dark:text-white light:bg-[rgba(255,255,255,0.82)] light:border-[rgba(200,214,237,0.9)] light:text-slate-800 light:[box-shadow:inset_0_1px_0_rgba(255,255,255,0.84)]'
            : 'border-white/12 text-white/50 hover:border-white/25 hover:text-white/80 dark:border-white/12 dark:text-white/50 dark:hover:border-white/25 dark:hover:text-white/80 light:border-[rgba(194,208,231,0.7)] light:text-slate-500 light:hover:bg-[rgba(255,255,255,0.6)] light:hover:text-slate-700'
        "
        @click="activeGroupId = null"
      >
        <span class="icon-[solar--home-2-linear] h-3 w-3" aria-hidden="true" />
        {{ t("quickLinks.pinned") }}
      </button>

      <!-- Group tabs -->
      <button
        v-for="group in linkGroups"
        :key="group.id"
        class="px-3 py-1 rounded-full text-xs font-medium border cursor-pointer transition-all duration-150 transition-colors duration-500 bg-transparent"
        :class="
          activeGroupId === group.id
            ? 'bg-white/15 border-white/25 text-white dark:bg-white/15 dark:border-white/25 dark:text-white light:bg-[rgba(255,255,255,0.82)] light:border-[rgba(200,214,237,0.9)] light:text-slate-800 light:[box-shadow:inset_0_1px_0_rgba(255,255,255,0.84)]'
            : 'border-white/12 text-white/50 hover:border-white/25 hover:text-white/80 dark:border-white/12 dark:text-white/50 dark:hover:border-white/25 dark:hover:text-white/80 light:border-[rgba(194,208,231,0.7)] light:text-slate-500 light:hover:bg-[rgba(255,255,255,0.6)] light:hover:text-slate-700'
        "
        @click="activeGroupId = group.id"
      >
        {{ group.name }}
      </button>
    </div>

    <!-- Link grid -->
    <div class="flex flex-wrap gap-4 justify-center">
      <a
        v-for="link in visibleLinks"
        :key="link.id"
        :href="link.url"
        class="group flex flex-col items-center gap-2 no-underline cursor-pointer bg-transparent border-0 p-0"
        :title="link.name"
      >
        <div
          class="relative w-14 h-14 rounded-2xl backdrop-blur-xl flex items-center justify-center transition-all duration-200 transition-colors duration-500 overflow-hidden border bg-white/10 border-white/15 dark:bg-white/10 dark:border-white/15 light:bg-[rgba(255,255,255,0.66)] light:border-[rgba(255,255,255,0.76)] light:[box-shadow:var(--light-shadow-soft)] group-hover:bg-white/18 group-hover:-translate-y-0.5 group-hover:shadow-[0_8px_24px_rgba(0,0,0,0.3)] dark:group-hover:bg-white/18 light:group-hover:bg-[rgba(255,255,255,0.82)] light:group-hover:border-[rgba(255,255,255,0.88)] light:group-hover:[box-shadow:0_18px_34px_rgba(117,144,187,0.22),inset_0_1px_0_rgba(255,255,255,0.84)]"
        >
          <span v-if="getIconClass(link)" :class="[getIconClass(link), 'h-7 w-7 relative z-10']" />
          <span
            v-else
            class="absolute text-[1.2rem] font-semibold transition-colors duration-500 text-white/60 dark:text-white/60 light:text-slate-600"
          >
            {{ getInitial(link.name) }}
          </span>
        </div>
        <span
          class="text-xs text-center max-w-16 truncate transition-colors duration-500 text-white/50 group-hover:text-white/90 dark:text-white/50 dark:group-hover:text-white/90 light:text-slate-600 light:group-hover:text-slate-900"
        >
          {{ link.name }}
        </span>
      </a>

      <!-- "More" button — shown when there are overflow links -->
      <button
        v-if="overflowCount > 0"
        class="group flex flex-col items-center gap-2 bg-transparent border-0 p-0 cursor-pointer"
        :title="t('quickLinks.showMore', { count: totalCount })"
        @click="openMorePanel"
      >
        <div
          class="relative w-14 h-14 rounded-2xl backdrop-blur-xl flex items-center justify-center transition-all duration-200 transition-colors duration-500 border bg-white/8 border-white/12 dark:bg-white/8 dark:border-white/12 light:bg-[rgba(255,255,255,0.52)] light:border-[rgba(159,179,212,0.56)] light:[box-shadow:0_14px_28px_rgba(125,148,186,0.12)] group-hover:bg-white/15 group-hover:border-white/25 group-hover:-translate-y-0.5 dark:group-hover:bg-white/15 dark:group-hover:border-white/25 light:group-hover:bg-[rgba(255,255,255,0.78)] light:group-hover:border-[rgba(118,146,194,0.62)]"
        >
          <span
            class="text-sm font-semibold transition-colors duration-500 text-white/60 group-hover:text-white/90 dark:text-white/60 dark:group-hover:text-white/90 light:text-slate-500 light:group-hover:text-slate-800"
          >
            +{{ overflowCount }}
          </span>
        </div>
        <span
          class="text-xs text-center max-w-16 truncate transition-colors duration-500 text-white/50 group-hover:text-white/90 dark:text-white/50 dark:group-hover:text-white/90 light:text-slate-600 light:group-hover:text-slate-900"
        >
          {{ t("common.more") }}
        </span>
      </button>

      <!-- Add button -->
      <button
        class="group flex flex-col items-center gap-2 bg-transparent border-0 p-0 cursor-pointer"
        :title="t('quickLinks.edit')"
        @click="emit('open-manager')"
      >
        <div
          class="relative w-14 h-14 rounded-2xl backdrop-blur-xl flex items-center justify-center transition-all duration-200 transition-colors duration-500 border-dashed border text-white/40 border-white/20 dark:text-white/40 dark:border-white/20 light:bg-[rgba(255,255,255,0.52)] light:text-slate-500 light:border-[rgba(159,179,212,0.56)] light:[box-shadow:0_14px_28px_rgba(125,148,186,0.12)] group-hover:border-white/40 group-hover:text-white/80 group-hover:-translate-y-0.5 dark:group-hover:border-white/40 dark:group-hover:text-white/80 light:group-hover:bg-[rgba(255,255,255,0.78)] light:group-hover:border-[rgba(118,146,194,0.62)] light:group-hover:text-slate-800 light:group-hover:[box-shadow:0_18px_34px_rgba(117,144,187,0.18)]"
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
          class="text-xs text-center max-w-16 truncate transition-colors duration-500 text-white/50 group-hover:text-white/90 dark:text-white/50 dark:group-hover:text-white/90 light:text-slate-600 light:group-hover:text-slate-900"
        >
          {{ t("common.add") }}
        </span>
      </button>
    </div>
  </div>

  <!-- More panel overlay -->
  <Teleport to="body">
    <Transition name="fade-panel">
      <div
        v-if="showMorePanel"
        class="fixed inset-0 z-[300] flex items-center justify-center p-5 bg-black/50 backdrop-blur-sm transition-colors duration-500 light:bg-[rgba(226,235,247,0.55)]"
        @click.self="closeMorePanel"
      >
        <div
          class="w-full max-w-[640px] max-h-[80vh] flex flex-col rounded-[20px] shadow-[0_24px_64px_rgba(0,0,0,0.6)] border transition-colors duration-500 bg-slate-950/97 border-white/10 dark:bg-slate-950/97 dark:border-white/10 light:bg-[rgba(247,250,255,0.92)] light:border-[rgba(255,255,255,0.82)] light:[box-shadow:var(--light-shadow-panel)]"
        >
          <!-- Panel header -->
          <div
            class="flex items-center justify-between px-5 py-4 border-b transition-colors duration-500 border-white/8 dark:border-white/8 light:border-[rgba(194,208,231,0.72)]"
          >
            <h2
              class="text-[1rem] font-medium transition-colors duration-500 text-white dark:text-white light:text-slate-900"
            >
              {{
                activeGroupId === null
                  ? t("quickLinks.pinned")
                  : (linkGroups.find((g) => g.id === activeGroupId)?.name ?? "")
              }}
              <span class="ml-1.5 text-sm font-normal opacity-50">{{ totalCount }}</span>
            </h2>
            <div class="flex items-center gap-2">
              <!-- Search -->
              <div class="relative">
                <span
                  class="icon-[solar--magnifer-linear] absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 transition-colors duration-500 text-white/40 dark:text-white/40 light:text-slate-400"
                  aria-hidden="true"
                />
                <input
                  v-model="morePanelSearch"
                  class="pl-8 pr-3 py-1.5 rounded-lg text-sm outline-none border transition-colors duration-500 w-44 bg-white/6 border-white/10 text-white placeholder:text-white/25 focus:border-accent/50 dark:bg-white/6 dark:border-white/10 dark:text-white dark:placeholder:text-white/25 dark:focus:border-accent/50 light:bg-[rgba(255,255,255,0.82)] light:border-[rgba(200,214,237,0.84)] light:text-slate-900 light:placeholder:text-slate-400 light:focus:border-[rgba(120,155,231,0.56)]"
                  :placeholder="t('linksManager.searchLinks')"
                />
              </div>
              <button
                class="flex items-center justify-center w-8 h-8 bg-transparent border-none rounded-lg cursor-pointer transition-all duration-150 transition-colors duration-500 text-white/50 hover:bg-white/8 hover:text-white dark:text-white/50 dark:hover:bg-white/8 dark:hover:text-white light:text-slate-500 light:hover:bg-[rgba(109,141,196,0.08)] light:hover:text-slate-800"
                @click="closeMorePanel"
              >
                <span
                  class="icon-[solar--close-circle-linear] h-[18px] w-[18px]"
                  aria-hidden="true"
                />
              </button>
            </div>
          </div>

          <!-- Link grid inside panel -->
          <div class="flex-1 overflow-y-auto p-5 scrollbar-thin">
            <div
              v-if="filteredMoreLinks.length === 0"
              class="flex items-center justify-center h-24 text-sm transition-colors duration-500 text-white/40 dark:text-white/40 light:text-slate-400"
            >
              {{ t("common.noResults") }}
            </div>
            <div v-else class="flex flex-wrap gap-4 justify-start">
              <a
                v-for="link in filteredMoreLinks"
                :key="link.id"
                :href="link.url"
                class="group flex flex-col items-center gap-2 no-underline cursor-pointer bg-transparent border-0 p-0"
                :title="link.name"
                @click="closeMorePanel"
              >
                <div
                  class="relative w-14 h-14 rounded-2xl backdrop-blur-xl flex items-center justify-center transition-all duration-200 transition-colors duration-500 overflow-hidden border bg-white/10 border-white/15 dark:bg-white/10 dark:border-white/15 light:bg-[rgba(255,255,255,0.66)] light:border-[rgba(255,255,255,0.76)] light:[box-shadow:var(--light-shadow-soft)] group-hover:bg-white/18 group-hover:-translate-y-0.5 group-hover:shadow-[0_8px_24px_rgba(0,0,0,0.3)] dark:group-hover:bg-white/18 light:group-hover:bg-[rgba(255,255,255,0.82)] light:group-hover:border-[rgba(255,255,255,0.88)] light:group-hover:[box-shadow:0_18px_34px_rgba(117,144,187,0.22),inset_0_1px_0_rgba(255,255,255,0.84)]"
                >
                  <span
                    v-if="getIconClass(link)"
                    :class="[getIconClass(link), 'h-7 w-7 relative z-10']"
                  />
                  <span
                    v-else
                    class="absolute text-[1.2rem] font-semibold transition-colors duration-500 text-white/60 dark:text-white/60 light:text-slate-600"
                  >
                    {{ getInitial(link.name) }}
                  </span>
                </div>
                <span
                  class="text-xs text-center max-w-16 truncate transition-colors duration-500 text-white/50 group-hover:text-white/90 dark:text-white/50 dark:group-hover:text-white/90 light:text-slate-600 light:group-hover:text-slate-900"
                >
                  {{ link.name }}
                </span>
              </a>
            </div>
          </div>

          <!-- Panel footer -->
          <div
            class="flex items-center justify-between px-5 py-3 border-t transition-colors duration-500 border-white/8 dark:border-white/8 light:border-[rgba(194,208,231,0.72)]"
          >
            <span
              class="text-xs transition-colors duration-500 text-white/35 dark:text-white/35 light:text-slate-400"
            >
              {{ t("linksManager.linkCount", { count: totalCount }) }}
            </span>
            <button
              class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs cursor-pointer transition-all duration-150 transition-colors duration-500 border bg-white/6 border-white/10 text-white/60 hover:bg-white/12 hover:text-white dark:bg-white/6 dark:border-white/10 dark:text-white/60 dark:hover:bg-white/12 dark:hover:text-white light:bg-[rgba(255,255,255,0.72)] light:border-[rgba(200,214,237,0.84)] light:text-slate-600 light:hover:bg-[rgba(255,255,255,0.9)] light:hover:text-slate-800"
              @click="
                closeMorePanel();
                emit('open-manager');
              "
            >
              <span class="icon-[solar--settings-linear] h-3.5 w-3.5" aria-hidden="true" />
              {{ t("settings.manageLinks") }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.fade-panel-enter-active,
.fade-panel-leave-active {
  transition: opacity 0.2s ease;
}

.fade-panel-enter-from,
.fade-panel-leave-to {
  opacity: 0;
}

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
