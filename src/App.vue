<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from "vue";
import { useColorMode } from "@vueuse/core";
import type { BasicColorSchema } from "@vueuse/core";
import { MeteorShower } from "./canvas/MeteorShower";
import { DaySky } from "./canvas/DaySky";
import { loadSettings, saveSettings } from "./composables/useStorage";
import type { Settings } from "./composables/useStorage";
import ClockWidget from "./components/ClockWidget.vue";
import SearchBar from "./components/SearchBar.vue";
import QuickLinks from "./components/QuickLinks.vue";
import SettingsPanel from "./components/SettingsPanel.vue";

const canvasRef = ref<HTMLCanvasElement | null>(null);
const showSettings = ref(false);
const settings = ref<Settings>(loadSettings());

// useColorMode manages dark/light/auto, persists to localStorage automatically
const colorMode = useColorMode();
const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)");
const isDarkTheme = ref(systemPrefersDark.matches);

let background: MeteorShower | DaySky | null = null;

const themeOptions: {
  value: BasicColorSchema;
  label: string;
  icon: string;
}[] = [
  { value: "dark", label: "Dark", icon: "icon-[solar--moon-linear]" },
  { value: "light", label: "Light", icon: "icon-[solar--sun-2-linear]" },
  { value: "auto", label: "System", icon: "icon-[solar--monitor-linear]" },
];

const settingsIconClass = "icon-[solar--settings-linear]";

function syncResolvedTheme() {
  isDarkTheme.value =
    colorMode.value === "auto" ? systemPrefersDark.matches : colorMode.value === "dark";
}

function onSystemThemeChange() {
  if (colorMode.value !== "auto") return;
  syncResolvedTheme();
  mountBackground();
}

function mountBackground() {
  if (!canvasRef.value) return;

  background?.stop();
  background = isDarkTheme.value ? new MeteorShower(canvasRef.value) : new DaySky(canvasRef.value);
  background.start();
}

onMounted(() => {
  syncResolvedTheme();
  mountBackground();
  systemPrefersDark.addEventListener("change", onSystemThemeChange);
});

onUnmounted(() => {
  background?.stop();
  systemPrefersDark.removeEventListener("change", onSystemThemeChange);
});

watch(colorMode, () => {
  syncResolvedTheme();
  mountBackground();
});

function onSaveSettings(updated: Settings) {
  settings.value = updated;
  saveSettings(updated);
  showSettings.value = false;
}

function onChangeEngine(engine: Settings["searchEngine"]) {
  settings.value = { ...settings.value, searchEngine: engine };
  saveSettings(settings.value);
}
</script>

<template>
  <div class="relative w-full h-full" :class="isDarkTheme ? 'bg-[#06070f]' : 'bg-[#e7eef8]'">
    <!-- Canvas background -->
    <canvas ref="canvasRef" class="absolute inset-0 w-full h-full" />
    <div
      class="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 light:opacity-100"
      aria-hidden="true"
    >
      <div
        class="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.52),transparent_34%),radial-gradient(circle_at_82%_78%,rgba(164,191,235,0.22),transparent_28%),linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0))]"
      />
    </div>

    <!-- Main content -->
    <main class="relative z-10 w-full h-full flex flex-col items-center justify-center p-5">
      <ClockWidget
        v-if="settings.showClock"
        class="absolute top-1/2 -translate-y-[220%]"
        :show-seconds="settings.showSeconds"
      />

      <div class="flex flex-col items-center gap-8 w-full">
        <SearchBar :engine="settings.searchEngine" @change-engine="onChangeEngine" />
        <QuickLinks :links="settings.quickLinks" @edit="showSettings = true" />
      </div>
    </main>

    <!-- Theme buttons -->
    <div
      class="fixed bottom-6 right-[4.5rem] flex items-center gap-1 rounded-full border px-1 py-1 backdrop-blur-2xl z-10 shadow-[0_8px_24px_rgba(0,0,0,0.32)] bg-white/[0.06] border-white/[0.10] dark:bg-white/[0.06] dark:border-white/[0.10] light:bg-[rgba(255,255,255,0.62)] light:border-[rgba(255,255,255,0.76)] light:[box-shadow:var(--light-shadow-soft)]"
      aria-label="Theme selector"
    >
      <button
        v-for="option in themeOptions"
        :key="option.value"
        class="flex h-8 w-8 items-center justify-center rounded-full transition-all duration-200"
        :class="
          colorMode === option.value
            ? 'bg-white/[0.14] text-white ring-1 ring-white/[0.14] dark:bg-white/[0.14] dark:text-white dark:ring-white/[0.14] light:bg-[rgba(255,255,255,0.86)] light:text-slate-900 light:ring-1 light:ring-[rgba(184,202,231,0.82)] light:[box-shadow:inset_0_1px_0_rgba(255,255,255,0.84)]'
            : 'text-white/50 hover:bg-white/[0.10] hover:text-white/90 dark:text-white/50 dark:hover:bg-white/[0.10] dark:hover:text-white/90 light:text-slate-500 light:hover:bg-[rgba(255,255,255,0.5)] light:hover:text-slate-800'
        "
        :title="option.label"
        @click="colorMode = option.value"
      >
        <span :class="[option.icon, 'h-4 w-4']" aria-hidden="true" />
      </button>
    </div>

    <!-- Settings button -->
    <button
      class="fixed bottom-6 right-6 w-10 h-10 flex items-center justify-center rounded-full backdrop-blur-2xl cursor-pointer z-10 transition-all duration-200 border shadow-[0_8px_24px_rgba(0,0,0,0.32)] bg-white/[0.06] border-white/[0.10] text-white/40 hover:bg-white/[0.12] hover:text-white/90 hover:rotate-30 dark:bg-white/[0.06] dark:border-white/[0.10] dark:text-white/40 dark:hover:bg-white/[0.12] dark:hover:text-white/90 light:bg-[rgba(255,255,255,0.62)] light:border-[rgba(255,255,255,0.76)] light:text-slate-600 light:hover:bg-[rgba(255,255,255,0.84)] light:hover:text-slate-900 light:[box-shadow:var(--light-shadow-soft)]"
      title="Settings"
      @click="showSettings = true"
    >
      <span :class="[settingsIconClass, 'h-[18px] w-[18px]']" aria-hidden="true" />
    </button>

    <!-- Settings panel -->
    <Transition name="fade">
      <SettingsPanel
        v-if="showSettings"
        :settings="settings"
        :color-mode="colorMode"
        @save="onSaveSettings"
        @close="showSettings = false"
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
