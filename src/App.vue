<script setup lang="ts">
import { ref, onMounted, onUnmounted } from "vue";
import { MeteorShower } from "./canvas/MeteorShower";
import { loadSettings, saveSettings } from "./composables/useStorage";
import type { Settings } from "./composables/useStorage";
import ClockWidget from "./components/ClockWidget.vue";
import SearchBar from "./components/SearchBar.vue";
import QuickLinks from "./components/QuickLinks.vue";
import SettingsPanel from "./components/SettingsPanel.vue";

const canvasRef = ref<HTMLCanvasElement | null>(null);
const showSettings = ref(false);
const settings = ref<Settings>(loadSettings());

let meteor: MeteorShower | null = null;

onMounted(() => {
  if (canvasRef.value) {
    meteor = new MeteorShower(canvasRef.value);
    meteor.start();
  }
});

onUnmounted(() => {
  meteor?.stop();
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
  <div class="app">
    <!-- Canvas background -->
    <canvas ref="canvasRef" class="bg-canvas" />

    <!-- Main content -->
    <main class="content">
      <ClockWidget
        v-if="settings.showClock"
        :show-seconds="settings.showSeconds"
      />

      <div class="center-block">
        <SearchBar
          :engine="settings.searchEngine"
          @change-engine="onChangeEngine"
        />
        <QuickLinks
          :links="settings.quickLinks"
          @edit="showSettings = true"
        />
      </div>
    </main>

    <!-- Settings button -->
    <button class="settings-btn" title="Settings" @click="showSettings = true">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    </button>

    <!-- Settings panel -->
    <Transition name="fade">
      <SettingsPanel
        v-if="showSettings"
        :settings="settings"
        @save="onSaveSettings"
        @close="showSettings = false"
      />
    </Transition>
  </div>
</template>

<style scoped>
.app {
  position: relative;
  width: 100%;
  height: 100%;
}

.bg-canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.content {
  position: relative;
  z-index: 1;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0;
  padding: 20px;
}

/* Clock sits above center */
.content > :first-child {
  position: absolute;
  top: 50%;
  transform: translateY(-220%);
}

.center-block {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 32px;
  width: 100%;
}

/* Settings button */
.settings-btn {
  position: fixed;
  bottom: 24px;
  right: 24px;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 50%;
  cursor: pointer;
  color: rgba(255, 255, 255, 0.4);
  z-index: 10;
  transition: all 0.2s ease;
  backdrop-filter: blur(10px);
}

.settings-btn:hover {
  background: rgba(255, 255, 255, 0.12);
  color: rgba(255, 255, 255, 0.9);
  transform: rotate(30deg);
}

/* Transitions */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
