<script setup lang="ts">
import { ref } from "vue";

const props = defineProps<{
  engine: "google" | "bing" | "baidu" | "duckduckgo";
}>();

const emit = defineEmits<{
  changeEngine: [engine: "google" | "bing" | "baidu" | "duckduckgo"];
}>();

const query = ref("");

const engines = {
  google: { name: "Google", url: "https://www.google.com/search?q=", icon: "G" },
  bing: { name: "Bing", url: "https://www.bing.com/search?q=", icon: "B" },
  baidu: { name: "Baidu", url: "https://www.baidu.com/s?wd=", icon: "百" },
  duckduckgo: { name: "DuckDuckGo", url: "https://duckduckgo.com/?q=", icon: "D" },
};

const showEngineMenu = ref(false);

function search() {
  if (!query.value.trim()) return;
  const url = engines[props.engine].url + encodeURIComponent(query.value.trim());
  window.location.href = url;
}

function selectEngine(key: keyof typeof engines) {
  emit("changeEngine", key);
  showEngineMenu.value = false;
}
</script>

<template>
  <div class="search-wrap">
    <div class="search-box" :class="{ focused: showEngineMenu }">
      <!-- Engine selector -->
      <button
        class="engine-btn"
        :title="engines[engine].name"
        @click="showEngineMenu = !showEngineMenu"
      >
        <span class="engine-icon">{{ engines[engine].icon }}</span>
      </button>

      <!-- Input -->
      <input
        v-model="query"
        class="search-input"
        type="text"
        placeholder="Search..."
        autofocus
        @keydown.enter="search"
        @keydown.escape="query = ''"
      />

      <!-- Search button -->
      <button class="search-btn" @click="search">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.35-4.35" />
        </svg>
      </button>
    </div>

    <!-- Engine dropdown -->
    <Transition name="dropdown">
      <div v-if="showEngineMenu" class="engine-menu">
        <button
          v-for="(eng, key) in engines"
          :key="key"
          class="engine-option"
          :class="{ active: key === engine }"
          @click="selectEngine(key as keyof typeof engines)"
        >
          <span class="engine-option-icon">{{ eng.icon }}</span>
          <span>{{ eng.name }}</span>
        </button>
      </div>
    </Transition>

    <!-- Click outside to close -->
    <div v-if="showEngineMenu" class="overlay" @click="showEngineMenu = false" />
  </div>
</template>

<style scoped>
.search-wrap {
  position: relative;
  width: 100%;
  max-width: 600px;
}

.search-box {
  display: flex;
  align-items: center;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 50px;
  backdrop-filter: blur(20px);
  transition: all 0.2s ease;
  overflow: hidden;
}

.search-box:focus-within {
  background: rgba(255, 255, 255, 0.12);
  border-color: rgba(120, 160, 255, 0.5);
  box-shadow: 0 0 0 3px rgba(120, 160, 255, 0.15);
}

.engine-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  background: none;
  border: none;
  cursor: pointer;
  flex-shrink: 0;
  border-radius: 50px 0 0 50px;
  transition: background 0.15s;
}

.engine-btn:hover {
  background: rgba(255, 255, 255, 0.08);
}

.engine-icon {
  font-size: 0.85rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.7);
}

.search-input {
  flex: 1;
  height: 44px;
  background: none;
  border: none;
  outline: none;
  color: #fff;
  font-size: 1rem;
  padding: 0 0.5rem;
}

.search-input::placeholder {
  color: rgba(255, 255, 255, 0.3);
}

.search-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  background: none;
  border: none;
  cursor: pointer;
  color: rgba(255, 255, 255, 0.5);
  flex-shrink: 0;
  border-radius: 0 50px 50px 0;
  transition: color 0.15s, background 0.15s;
}

.search-btn:hover {
  color: #fff;
  background: rgba(255, 255, 255, 0.08);
}

/* Engine dropdown */
.engine-menu {
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  background: rgba(15, 20, 40, 0.95);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 12px;
  backdrop-filter: blur(20px);
  padding: 6px;
  min-width: 160px;
  z-index: 100;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
}

.engine-option {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 8px 12px;
  background: none;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  color: rgba(255, 255, 255, 0.7);
  font-size: 0.9rem;
  transition: background 0.15s, color 0.15s;
  text-align: left;
}

.engine-option:hover {
  background: rgba(255, 255, 255, 0.08);
  color: #fff;
}

.engine-option.active {
  color: #7aa0ff;
  background: rgba(120, 160, 255, 0.1);
}

.engine-option-icon {
  font-size: 0.8rem;
  font-weight: 700;
  width: 20px;
  text-align: center;
}

.overlay {
  position: fixed;
  inset: 0;
  z-index: 99;
}

/* Transitions */
.dropdown-enter-active,
.dropdown-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}

.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}
</style>
