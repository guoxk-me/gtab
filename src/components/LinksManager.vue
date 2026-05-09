<script setup lang="ts">
import { computed, reactive, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import {
  HOME_PIN_LIMIT,
  normalizeSettings,
  type LinkGroup,
  type QuickLink,
  type Settings,
} from "../composables/useStorage";
import { getKnownQuickLinkIcon } from "../composables/quickLinkIcons";

const props = defineProps<{ settings: Settings }>();

const emit = defineEmits<{
  close: [];
  save: [settings: Settings];
}>();

const { t } = useI18n();

const local = reactive<Settings>(cloneSettings(props.settings));
const activeGroupId = ref<string>(props.settings.linkGroups[0]?.id ?? "__all__");
const searchQuery = ref("");
const newGroupName = ref("");
const addingLink = ref(false);
const newLink = ref({ name: "", url: "" });

watch(
  () => props.settings,
  (value) => {
    Object.assign(local, cloneSettings(value));
    if (
      activeGroupId.value !== "__all__" &&
      activeGroupId.value !== "__ungrouped__" &&
      !local.linkGroups.some((group) => group.id === activeGroupId.value)
    ) {
      activeGroupId.value = local.linkGroups[0]?.id ?? "__all__";
    }
  },
);

function cloneSettings(value: Settings): Settings {
  return JSON.parse(JSON.stringify(value));
}

function createId(prefix: string): string {
  return typeof crypto.randomUUID === "function"
    ? `${prefix}-${crypto.randomUUID()}`
    : `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeHttpUrl(raw: string): string | null {
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

function getIconClass(link: QuickLink): string {
  return getKnownQuickLinkIcon(link.url);
}

function getInitial(name: string): string {
  return name.charAt(0).toUpperCase();
}

const groupedLinkIds = computed(() => new Set(local.linkGroups.flatMap((group) => group.linkIds)));

const ungroupedLinks = computed(() =>
  local.quickLinks.filter((link) => !groupedLinkIds.value.has(link.id)),
);

const activeGroup = computed(
  () => local.linkGroups.find((group) => group.id === activeGroupId.value) ?? null,
);

const activeLinks = computed(() => {
  if (activeGroupId.value === "__all__") return local.quickLinks;
  if (activeGroupId.value === "__ungrouped__") return ungroupedLinks.value;
  if (!activeGroup.value) return [];

  return activeGroup.value.linkIds
    .map((id) => local.quickLinks.find((link) => link.id === id))
    .filter((link): link is QuickLink => link !== undefined);
});

const filteredLinks = computed(() => {
  const query = searchQuery.value.trim().toLowerCase();
  if (!query) return activeLinks.value;

  return activeLinks.value.filter(
    (link) => link.name.toLowerCase().includes(query) || link.url.toLowerCase().includes(query),
  );
});

const pinnedSet = computed(() => new Set(local.pinnedLinkIds));

function isPinned(id: string): boolean {
  return pinnedSet.value.has(id);
}

function ensureGroupSelection() {
  if (activeGroupId.value === "__all__" || activeGroupId.value === "__ungrouped__") return;
  if (!local.linkGroups.some((group) => group.id === activeGroupId.value)) {
    activeGroupId.value = local.linkGroups[0]?.id ?? "__all__";
  }
}

function addGroup() {
  const name = newGroupName.value.trim();
  if (!name) return;

  const group: LinkGroup = {
    id: createId("group"),
    name,
    linkIds: [],
  };

  local.linkGroups.push(group);
  newGroupName.value = "";
  activeGroupId.value = group.id;
}

function renameGroup(group: LinkGroup) {
  const nextName = window.prompt(t("linksManager.renameGroup"), group.name)?.trim();
  if (!nextName) return;
  group.name = nextName;
}

function removeGroup(group: LinkGroup) {
  const confirmed = window.confirm(t("linksManager.deleteGroupConfirm", { name: group.name }));
  if (!confirmed) return;

  local.linkGroups = local.linkGroups.filter((item) => item.id !== group.id);
  ensureGroupSelection();
}

function reorderGroup(index: number, offset: -1 | 1) {
  const nextIndex = index + offset;
  if (nextIndex < 0 || nextIndex >= local.linkGroups.length) return;

  const groups = [...local.linkGroups];
  const [group] = groups.splice(index, 1);
  groups.splice(nextIndex, 0, group);
  local.linkGroups = groups;
}

function moveLinkWithinActiveGroup(index: number, offset: -1 | 1) {
  if (!activeGroup.value) return;
  const nextIndex = index + offset;
  if (nextIndex < 0 || nextIndex >= activeGroup.value.linkIds.length) return;

  const groups = [...local.linkGroups];
  const groupIndex = groups.findIndex((group) => group.id === activeGroup.value?.id);
  if (groupIndex === -1) return;

  const linkIds = [...groups[groupIndex].linkIds];
  const [linkId] = linkIds.splice(index, 1);
  linkIds.splice(nextIndex, 0, linkId);
  groups[groupIndex] = { ...groups[groupIndex], linkIds };
  local.linkGroups = groups;
}

function moveFilteredLinkWithinGroup(linkId: string, offset: -1 | 1) {
  if (!activeGroup.value) return;

  const index = activeGroup.value.linkIds.indexOf(linkId);
  if (index === -1) return;

  moveLinkWithinActiveGroup(index, offset);
}

function removeLinkEverywhere(linkId: string) {
  local.quickLinks = local.quickLinks.filter((link) => link.id !== linkId);
  local.linkGroups = local.linkGroups.map((group) => ({
    ...group,
    linkIds: group.linkIds.filter((id) => id !== linkId),
  }));
  local.pinnedLinkIds = local.pinnedLinkIds.filter((id) => id !== linkId);
}

function addLinkToActiveGroup(linkId: string) {
  if (!activeGroup.value) return;
  if (activeGroup.value.linkIds.includes(linkId)) return;

  local.linkGroups = local.linkGroups.map((group) =>
    group.id === activeGroup.value?.id ? { ...group, linkIds: [...group.linkIds, linkId] } : group,
  );
}

function removeLinkFromCurrentGroup(linkId: string) {
  if (!activeGroup.value) return;

  local.linkGroups = local.linkGroups.map((group) =>
    group.id === activeGroup.value?.id
      ? { ...group, linkIds: group.linkIds.filter((id) => id !== linkId) }
      : group,
  );
}

function moveLinkToGroup(linkId: string, targetGroupId: string) {
  local.linkGroups = local.linkGroups.map((group) => {
    const linkIds = group.linkIds.filter((id) => id !== linkId);
    if (group.id === targetGroupId && !linkIds.includes(linkId)) {
      linkIds.push(linkId);
    }
    return { ...group, linkIds };
  });
}

function togglePin(linkId: string) {
  if (isPinned(linkId)) {
    local.pinnedLinkIds = local.pinnedLinkIds.filter((id) => id !== linkId);
    return;
  }

  if (local.pinnedLinkIds.length >= HOME_PIN_LIMIT) {
    window.alert(t("linksManager.pinLimitReached"));
    return;
  }

  local.pinnedLinkIds = [...local.pinnedLinkIds, linkId];
}

function addLink() {
  const name = newLink.value.name.trim();
  const url = normalizeHttpUrl(newLink.value.url);
  if (!name || !url) return;

  const link: QuickLink = {
    id: createId("link"),
    name,
    url,
  };

  local.quickLinks.push(link);
  if (activeGroup.value) {
    addLinkToActiveGroup(link.id);
  }

  newLink.value = { name: "", url: "" };
  addingLink.value = false;
}

function save() {
  emit("save", normalizeSettings(cloneSettings(local)));
}
</script>

<template>
  <div
    class="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-black/55 backdrop-blur-md transition-colors duration-500 light:bg-[rgba(220,231,247,0.62)]"
    @click.self="emit('close')"
  >
    <div
      class="w-full max-w-[1180px] h-[82vh] rounded-[28px] border overflow-hidden transition-colors duration-500 bg-slate-950/96 border-white/10 dark:bg-slate-950/96 dark:border-white/10 light:bg-[rgba(247,250,255,0.94)] light:border-[rgba(255,255,255,0.86)] light:[box-shadow:var(--light-shadow-panel)]"
    >
      <div
        class="h-full grid grid-cols-[280px_minmax(0,1fr)] transition-colors duration-500 light:bg-[linear-gradient(180deg,rgba(250,252,255,0.96),rgba(243,247,255,0.92))]"
      >
        <aside
          class="flex flex-col border-r transition-colors duration-500 border-white/8 bg-white/[0.03] dark:border-white/8 dark:bg-white/[0.03] light:border-[rgba(194,208,231,0.72)] light:bg-[rgba(255,255,255,0.58)]"
        >
          <div
            class="px-5 py-5 border-b border-white/8 dark:border-white/8 light:border-[rgba(194,208,231,0.72)]"
          >
            <div class="flex items-center justify-between gap-3">
              <div>
                <h2 class="text-lg font-medium text-white dark:text-white light:text-slate-900">
                  {{ t("linksManager.title") }}
                </h2>
                <p class="mt-1 text-xs text-white/45 dark:text-white/45 light:text-slate-500">
                  {{ t("linksManager.pinnedCount", { count: local.pinnedLinkIds.length }) }}
                </p>
              </div>
              <button
                class="flex items-center justify-center w-8 h-8 rounded-lg transition-colors duration-500 text-white/50 hover:bg-white/8 hover:text-white dark:text-white/50 dark:hover:bg-white/8 dark:hover:text-white light:text-slate-500 light:hover:bg-[rgba(109,141,196,0.08)] light:hover:text-slate-800"
                @click="emit('close')"
              >
                <span
                  class="icon-[solar--close-circle-linear] h-[18px] w-[18px]"
                  aria-hidden="true"
                />
              </button>
            </div>
          </div>

          <div class="flex-1 overflow-y-auto p-4 flex flex-col gap-2 scrollbar-thin">
            <button
              class="flex items-center justify-between gap-3 px-3 py-2.5 rounded-2xl text-left border transition-all duration-150 transition-colors duration-500"
              :class="
                activeGroupId === '__all__'
                  ? 'bg-white/12 border-white/20 text-white dark:bg-white/12 dark:border-white/20 dark:text-white light:bg-[rgba(255,255,255,0.88)] light:border-[rgba(188,205,233,0.86)] light:text-slate-900'
                  : 'border-white/8 text-white/65 hover:bg-white/6 hover:text-white dark:border-white/8 dark:text-white/65 dark:hover:bg-white/6 dark:hover:text-white light:border-[rgba(205,217,238,0.82)] light:text-slate-600 light:hover:bg-[rgba(255,255,255,0.76)] light:hover:text-slate-900'
              "
              @click="activeGroupId = '__all__'"
            >
              <span>{{ t("linksManager.allLinks") }}</span>
              <span class="text-xs opacity-50">{{ local.quickLinks.length }}</span>
            </button>

            <button
              class="flex items-center justify-between gap-3 px-3 py-2.5 rounded-2xl text-left border transition-all duration-150 transition-colors duration-500"
              :class="
                activeGroupId === '__ungrouped__'
                  ? 'bg-white/12 border-white/20 text-white dark:bg-white/12 dark:border-white/20 dark:text-white light:bg-[rgba(255,255,255,0.88)] light:border-[rgba(188,205,233,0.86)] light:text-slate-900'
                  : 'border-white/8 text-white/65 hover:bg-white/6 hover:text-white dark:border-white/8 dark:text-white/65 dark:hover:bg-white/6 dark:hover:text-white light:border-[rgba(205,217,238,0.82)] light:text-slate-600 light:hover:bg-[rgba(255,255,255,0.76)] light:hover:text-slate-900'
              "
              @click="activeGroupId = '__ungrouped__'"
            >
              <span>{{ t("linksManager.ungrouped") }}</span>
              <span class="text-xs opacity-50">{{ ungroupedLinks.length }}</span>
            </button>

            <div
              class="pt-2 pb-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-white/35 dark:text-white/35 light:text-slate-500"
            >
              {{ t("linksManager.groups") }}
            </div>

            <div
              v-for="(group, index) in local.linkGroups"
              :key="group.id"
              class="rounded-2xl border px-3 py-2.5 transition-colors duration-500"
              :class="
                activeGroupId === group.id
                  ? 'bg-white/12 border-white/20 dark:bg-white/12 dark:border-white/20 light:bg-[rgba(255,255,255,0.88)] light:border-[rgba(188,205,233,0.86)]'
                  : 'border-white/8 bg-white/[0.02] dark:border-white/8 dark:bg-white/[0.02] light:border-[rgba(205,217,238,0.82)] light:bg-[rgba(255,255,255,0.52)]'
              "
            >
              <button
                class="w-full flex items-center justify-between gap-3 text-left"
                @click="activeGroupId = group.id"
              >
                <span
                  class="min-w-0 truncate text-sm text-white/85 dark:text-white/85 light:text-slate-900"
                >
                  {{ group.name }}
                </span>
                <span class="text-xs opacity-45 text-white dark:text-white light:text-slate-500">
                  {{ group.linkIds.length }}
                </span>
              </button>
              <div class="mt-2 flex items-center gap-1">
                <button
                  class="manager-mini-button"
                  :disabled="index === 0"
                  @click="reorderGroup(index, -1)"
                >
                  ↑
                </button>
                <button
                  class="manager-mini-button"
                  :disabled="index === local.linkGroups.length - 1"
                  @click="reorderGroup(index, 1)"
                >
                  ↓
                </button>
                <button class="manager-mini-button" @click="renameGroup(group)">
                  {{ t("common.rename") }}
                </button>
                <button class="manager-mini-button danger" @click="removeGroup(group)">
                  {{ t("common.delete") }}
                </button>
              </div>
            </div>
          </div>

          <div
            class="p-4 border-t border-white/8 dark:border-white/8 light:border-[rgba(194,208,231,0.72)]"
          >
            <div class="flex flex-col gap-2">
              <input
                v-model="newGroupName"
                class="manager-input"
                :placeholder="t('linksManager.groupName')"
                @keydown.enter="addGroup"
              />
              <button class="manager-primary-button" @click="addGroup">
                {{ t("linksManager.addGroup") }}
              </button>
            </div>
          </div>
        </aside>

        <section class="flex flex-col min-w-0">
          <div
            class="flex items-center justify-between gap-4 px-6 py-5 border-b transition-colors duration-500 border-white/8 dark:border-white/8 light:border-[rgba(194,208,231,0.72)]"
          >
            <div>
              <h3 class="text-lg font-medium text-white dark:text-white light:text-slate-900">
                {{
                  activeGroupId === "__all__"
                    ? t("linksManager.allLinks")
                    : activeGroupId === "__ungrouped__"
                      ? t("linksManager.ungrouped")
                      : (activeGroup?.name ?? t("linksManager.groups"))
                }}
              </h3>
              <p class="mt-1 text-xs text-white/45 dark:text-white/45 light:text-slate-500">
                {{ t("linksManager.linkCount", { count: activeLinks.length }) }}
              </p>
            </div>

            <div class="flex items-center gap-3">
              <div class="relative">
                <span
                  class="icon-[solar--magnifer-linear] absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/35 dark:text-white/35 light:text-slate-400"
                  aria-hidden="true"
                />
                <input
                  v-model="searchQuery"
                  class="manager-input w-60 pl-9"
                  :placeholder="t('linksManager.searchLinks')"
                />
              </div>
              <button class="manager-primary-button" @click="addingLink = true">
                {{ t("linksManager.addLink") }}
              </button>
            </div>
          </div>

          <div v-if="addingLink" class="px-6 pt-4">
            <div
              class="rounded-2xl border p-4 bg-white/[0.03] border-white/8 dark:bg-white/[0.03] dark:border-white/8 light:bg-[rgba(255,255,255,0.66)] light:border-[rgba(205,217,238,0.82)]"
            >
              <div class="grid grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)_auto] gap-3">
                <input
                  v-model="newLink.name"
                  class="manager-input"
                  :placeholder="t('settings.linkName')"
                  @keydown.enter="addLink"
                />
                <input
                  v-model="newLink.url"
                  class="manager-input"
                  :placeholder="t('settings.linkUrl')"
                  @keydown.enter="addLink"
                />
                <div class="flex items-center gap-2">
                  <button class="manager-secondary-button" @click="addingLink = false">
                    {{ t("common.cancel") }}
                  </button>
                  <button class="manager-primary-button" @click="addLink">
                    {{ t("common.add") }}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div class="flex-1 overflow-y-auto px-6 py-4 scrollbar-thin">
            <div
              v-if="filteredLinks.length === 0"
              class="flex items-center justify-center h-full min-h-48 text-sm text-white/40 dark:text-white/40 light:text-slate-500"
            >
              {{ searchQuery ? t("common.noResults") : t("linksManager.noLinksInGroup") }}
            </div>

            <div v-else class="flex flex-col gap-2">
              <div
                v-for="(link, index) in filteredLinks"
                :key="link.id"
                class="grid grid-cols-[auto_minmax(0,1.1fr)_minmax(0,1.5fr)_auto] gap-3 items-center rounded-2xl border px-4 py-3 transition-colors duration-500 bg-white/[0.03] border-white/8 dark:bg-white/[0.03] dark:border-white/8 light:bg-[rgba(255,255,255,0.66)] light:border-[rgba(205,217,238,0.82)]"
              >
                <div
                  class="relative w-12 h-12 rounded-2xl border flex items-center justify-center overflow-hidden bg-white/8 border-white/12 dark:bg-white/8 dark:border-white/12 light:bg-[rgba(255,255,255,0.78)] light:border-[rgba(214,224,241,0.86)]"
                >
                  <span
                    v-if="getIconClass(link)"
                    :class="[getIconClass(link), 'h-6 w-6 relative z-10']"
                  />
                  <span
                    v-else
                    class="text-base font-semibold text-white/65 dark:text-white/65 light:text-slate-600"
                  >
                    {{ getInitial(link.name) }}
                  </span>
                </div>

                <div class="min-w-0">
                  <div
                    class="truncate text-sm font-medium text-white dark:text-white light:text-slate-900"
                  >
                    {{ link.name }}
                  </div>
                  <div
                    class="truncate text-xs text-white/45 dark:text-white/45 light:text-slate-500"
                  >
                    {{ link.url }}
                  </div>
                </div>

                <div class="flex items-center gap-2 flex-wrap">
                  <button
                    class="manager-secondary-chip"
                    :class="isPinned(link.id) ? 'chip-active' : ''"
                    @click="togglePin(link.id)"
                  >
                    {{
                      isPinned(link.id)
                        ? t("linksManager.unpinFromHome")
                        : t("linksManager.pinToHome")
                    }}
                  </button>

                  <button
                    v-if="activeGroup"
                    class="manager-secondary-chip"
                    :disabled="activeGroup.linkIds.indexOf(link.id) === 0"
                    @click="moveFilteredLinkWithinGroup(link.id, -1)"
                  >
                    ↑
                  </button>
                  <button
                    v-if="activeGroup"
                    class="manager-secondary-chip"
                    :disabled="
                      activeGroup.linkIds.indexOf(link.id) === activeGroup.linkIds.length - 1
                    "
                    @click="moveFilteredLinkWithinGroup(link.id, 1)"
                  >
                    ↓
                  </button>

                  <template v-if="activeGroupId === '__ungrouped__'">
                    <button
                      v-for="group in local.linkGroups"
                      :key="`${link.id}-${group.id}`"
                      class="manager-secondary-chip"
                      @click="moveLinkToGroup(link.id, group.id)"
                    >
                      {{ group.name }}
                    </button>
                  </template>

                  <select
                    v-else-if="activeGroupId !== '__all__'"
                    class="manager-select"
                    @change="moveLinkToGroup(link.id, ($event.target as HTMLSelectElement).value)"
                  >
                    <option value="">{{ t("linksManager.moveToGroup") }}</option>
                    <option
                      v-for="group in local.linkGroups.filter(
                        (group) => group.id !== activeGroupId,
                      )"
                      :key="`${link.id}-${group.id}`"
                      :value="group.id"
                    >
                      {{ group.name }}
                    </option>
                  </select>
                </div>

                <div class="flex items-center gap-2 justify-end">
                  <button
                    v-if="activeGroup && activeGroupId !== '__all__'"
                    class="manager-icon-button"
                    :title="t('linksManager.ungrouped')"
                    @click="removeLinkFromCurrentGroup(link.id)"
                  >
                    <span class="icon-[solar--minus-circle-linear] h-4 w-4" aria-hidden="true" />
                  </button>
                  <button
                    class="manager-icon-button danger"
                    :title="t('common.delete')"
                    @click="removeLinkEverywhere(link.id)"
                  >
                    <span class="icon-[solar--trash-bin-trash-linear] h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div
            class="flex items-center justify-end gap-3 px-6 py-4 border-t transition-colors duration-500 border-white/8 dark:border-white/8 light:border-[rgba(194,208,231,0.72)]"
          >
            <button class="manager-secondary-button" @click="emit('close')">
              {{ t("common.cancel") }}
            </button>
            <button class="manager-primary-button" @click="save">
              {{ t("common.save") }}
            </button>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>

<style scoped>
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

.manager-input,
.manager-select {
  width: 100%;
  min-width: 0;
  border-radius: 0.9rem;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.06);
  padding: 0.65rem 0.85rem;
  color: white;
  font-size: 0.875rem;
  outline: none;
  transition:
    border-color 0.2s ease,
    background-color 0.2s ease,
    color 0.2s ease;
}

.manager-input::placeholder {
  color: rgba(255, 255, 255, 0.25);
}

.manager-input:focus,
.manager-select:focus {
  border-color: rgba(139, 167, 255, 0.55);
}

.light .manager-input,
.light .manager-select {
  border-color: rgba(200, 214, 237, 0.84);
  background: rgba(255, 255, 255, 0.82);
  color: rgb(15 23 42);
}

.light .manager-input::placeholder {
  color: rgb(148 163 184);
}

.manager-primary-button,
.manager-secondary-button,
.manager-mini-button,
.manager-icon-button,
.manager-secondary-chip {
  border: none;
  cursor: pointer;
  transition:
    background-color 0.2s ease,
    color 0.2s ease,
    opacity 0.2s ease,
    transform 0.2s ease;
}

.manager-primary-button {
  border-radius: 0.9rem;
  background: var(--accent, #8ba7ff);
  color: #0f172a;
  padding: 0.7rem 1rem;
  font-size: 0.875rem;
  font-weight: 600;
}

.manager-primary-button:hover {
  transform: translateY(-1px);
}

.manager-secondary-button {
  border-radius: 0.9rem;
  background: rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.72);
  padding: 0.7rem 1rem;
  font-size: 0.875rem;
}

.light .manager-secondary-button {
  background: rgba(255, 255, 255, 0.76);
  color: rgb(71 85 105);
  border: 1px solid rgba(200, 214, 237, 0.84);
}

.manager-mini-button,
.manager-secondary-chip {
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.06);
  color: rgba(255, 255, 255, 0.64);
  padding: 0.35rem 0.6rem;
  font-size: 0.75rem;
}

.light .manager-mini-button,
.light .manager-secondary-chip {
  background: rgba(255, 255, 255, 0.76);
  color: rgb(100 116 139);
  border: 1px solid rgba(200, 214, 237, 0.84);
}

.chip-active {
  background: rgba(139, 167, 255, 0.18);
  color: rgba(191, 209, 255, 0.96);
}

.light .chip-active {
  background: rgba(74, 122, 255, 0.1);
  color: rgb(59 130 246);
}

.manager-icon-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border-radius: 0.75rem;
  background: rgba(255, 255, 255, 0.06);
  color: rgba(255, 255, 255, 0.64);
}

.light .manager-icon-button {
  background: rgba(255, 255, 255, 0.76);
  color: rgb(100 116 139);
  border: 1px solid rgba(200, 214, 237, 0.84);
}

.manager-mini-button:disabled,
.manager-secondary-chip:disabled,
.manager-icon-button:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.danger {
  color: rgb(248 113 113);
}
</style>
