<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import { useColorMode } from "@vueuse/core";
import type { BasicColorSchema } from "@vueuse/core";
import { useI18n } from "vue-i18n";
import { MeteorShower } from "./canvas/MeteorShower";
import { loadSettings, saveSettings } from "./composables/useStorage";
import type { Settings } from "./composables/useStorage";
import { moveQuickLinkItemIntoTarget, reorderQuickLinkItems } from "./composables/quickLinkItems";
import { resolveLocale, setLocale } from "./i18n";
import ClockWidget from "./components/ClockWidget.vue";
import SearchBar from "./components/SearchBar.vue";
import QuickLinks from "./components/QuickLinks.vue";
import SettingsPanel from "./components/SettingsPanel.vue";

const canvasRef = ref<HTMLCanvasElement | null>(null);
const showSettings = ref(false);
const settings = ref<Settings>(loadSettings());
const { t } = useI18n();
const currentLocale = computed(() => resolveLocale(settings.value.language));
const settingsSnapshot = ref<Settings | null>(null);
const colorModeSnapshot = ref<BasicColorSchema>("auto");

const colorModeState = useColorMode();
const colorMode = colorModeState.store;
const isDarkTheme = computed(() =>
  colorMode.value === "auto" ? colorModeState.system.value === "dark" : colorMode.value === "dark",
);

let background: MeteorShower | null = null;

const themeOptions: {
  value: BasicColorSchema;
  label: string;
  icon: string;
}[] = [
  { value: "dark", label: "appearance.dark", icon: "icon-[solar--moon-linear]" },
  { value: "light", label: "appearance.light", icon: "icon-[solar--sun-2-linear]" },
  { value: "auto", label: "appearance.system", icon: "icon-[solar--monitor-linear]" },
];

const settingsIconClass = "icon-[solar--settings-linear]";

function cloneSettings(value: Settings): Settings {
  return JSON.parse(JSON.stringify(value));
}

function mountBackground() {
  if (!canvasRef.value || background) return;

  background = new MeteorShower(canvasRef.value, isDarkTheme.value ? "dark" : "light");
  background.start();
}

onMounted(() => {
  mountBackground();
});

onUnmounted(() => {
  background?.stop();
  background = null;
});

watch(isDarkTheme, (isDark) => {
  background?.setTheme(isDark ? "dark" : "light");
});

watch(
  () => settings.value.language,
  (language) => {
    setLocale(language);
  },
  { immediate: true },
);

function onSaveSettings(updated: Settings) {
  settings.value = updated;
  saveSettings(updated);
  settingsSnapshot.value = null;
  showSettings.value = false;
}

function openSettings() {
  settingsSnapshot.value = cloneSettings(settings.value);
  colorModeSnapshot.value = colorMode.value;
  showSettings.value = true;
}

function closeSettings() {
  if (settingsSnapshot.value) {
    settings.value = cloneSettings(settingsSnapshot.value);
  }

  colorMode.value = colorModeSnapshot.value;
  settingsSnapshot.value = null;
  showSettings.value = false;
}

function onPreviewLanguage(language: Settings["language"]) {
  settings.value = { ...settings.value, language };
}

function onChangeEngine(engine: Settings["searchEngine"]) {
  settings.value = { ...settings.value, searchEngine: engine };
  saveSettings(settings.value);
}

function onReorderQuickLinks(draggedId: string, toIndex: number) {
  const fromIndex = settings.value.quickLinks.findIndex((item) => item.id === draggedId);
  const quickLinks = reorderQuickLinkItems(settings.value.quickLinks, fromIndex, toIndex);
  if (quickLinks === settings.value.quickLinks) return;

  settings.value = {
    ...settings.value,
    quickLinks,
  };
  saveSettings(settings.value);
}

function onGroupQuickLinks(draggedId: string, targetId: string) {
  const quickLinks = moveQuickLinkItemIntoTarget(
    settings.value.quickLinks,
    draggedId,
    targetId,
    t("quickLinks.newFolder"),
  );
  if (quickLinks === settings.value.quickLinks) return;

  settings.value = {
    ...settings.value,
    quickLinks,
  };
  saveSettings(settings.value);
}
</script>

<template>
  <div
    class="relative w-full h-full transition-colors duration-500"
    :class="isDarkTheme ? 'bg-[#090f24]' : 'bg-[#c4d8f0]'"
  >
    <canvas ref="canvasRef" class="absolute inset-0 w-full h-full" />

    <main
      class="relative z-10 w-full h-full flex flex-col items-center justify-center gap-8 sm:gap-14 px-4 py-8"
    >
      <ClockWidget
        v-if="settings.showClock"
        :show-seconds="settings.showSeconds"
        :locale="currentLocale"
      />

      <div class="flex flex-col items-center gap-5 sm:gap-7 w-full">
        <SearchBar :engine="settings.searchEngine" @change-engine="onChangeEngine" />
        <QuickLinks
          :links="settings.quickLinks"
          @edit="openSettings"
          @reorder="onReorderQuickLinks"
          @group="onGroupQuickLinks"
        />
      </div>
    </main>

    <div
      class="fixed bottom-4 sm:bottom-6 right-[3.75rem] sm:right-[4.5rem] flex items-center gap-1 rounded-full border px-1 py-1 backdrop-blur-2xl z-10 shadow-[0_8px_24px_rgba(0,0,0,0.32)] transition-colors duration-500 bg-white/[0.06] border-white/[0.10] dark:bg-white/[0.06] dark:border-white/[0.10] light:bg-[rgba(255,255,255,0.62)] light:border-[rgba(255,255,255,0.76)] light:[box-shadow:var(--light-shadow-soft)]"
      :aria-label="t('theme.selector')"
    >
      <button
        v-for="option in themeOptions"
        :key="option.value"
        class="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-full transition-all duration-200 transition-colors duration-500"
        :class="
          colorMode === option.value
            ? 'bg-white/[0.14] text-white ring-1 ring-white/[0.14] dark:bg-white/[0.14] dark:text-white dark:ring-white/[0.14] light:bg-[rgba(255,255,255,0.86)] light:text-slate-900 light:ring-1 light:ring-[rgba(184,202,231,0.82)] light:[box-shadow:inset_0_1px_0_rgba(255,255,255,0.84)]'
            : 'text-white/50 hover:bg-white/[0.10] hover:text-white/90 dark:text-white/50 dark:hover:bg-white/[0.10] dark:hover:text-white/90 light:text-slate-500 light:hover:bg-[rgba(255,255,255,0.5)] light:hover:text-slate-800'
        "
        :title="t(option.label)"
        @click="colorMode = option.value"
      >
        <span :class="[option.icon, 'h-3.5 w-3.5 sm:h-4 sm:w-4']" aria-hidden="true" />
      </button>
    </div>

    <button
      class="fixed bottom-4 sm:bottom-6 right-4 sm:right-6 w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-full backdrop-blur-2xl cursor-pointer z-10 transition-all duration-200 transition-colors duration-500 border shadow-[0_8px_24px_rgba(0,0,0,0.32)] bg-white/[0.06] border-white/[0.10] text-white/40 hover:bg-white/[0.12] hover:text-white/90 hover:rotate-30 dark:bg-white/[0.06] dark:border-white/[0.10] dark:text-white/40 dark:hover:bg-white/[0.12] dark:hover:text-white/90 light:bg-[rgba(255,255,255,0.62)] light:border-[rgba(255,255,255,0.76)] light:text-slate-600 light:hover:bg-[rgba(255,255,255,0.84)] light:hover:text-slate-900 light:[box-shadow:var(--light-shadow-soft)]"
      :title="t('settings.open')"
      @click="openSettings"
    >
      <span
        :class="[settingsIconClass, 'h-[16px] w-[16px] sm:h-[18px] sm:w-[18px]']"
        aria-hidden="true"
      />
    </button>

    <Transition name="fade">
      <SettingsPanel
        v-if="showSettings"
        :settings="settings"
        :color-mode="colorMode"
        @save="onSaveSettings"
        @close="closeSettings"
        @update:language="onPreviewLanguage"
        @update:color-mode="colorMode = $event"
      />
    </Transition>
  </div>
</template>

<style scoped>
/* Vue Transition — cannot be done with Tailwind */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
