<script setup lang="ts">
import { ref } from "vue";
import { useI18n } from "vue-i18n";

const props = defineProps<{
  engine: "google" | "bing" | "baidu" | "duckduckgo";
}>();

const emit = defineEmits<{
  changeEngine: [engine: "google" | "bing" | "baidu" | "duckduckgo"];
}>();

const query = ref("");
const { t } = useI18n();

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
  <div class="relative w-full max-w-[600px]">
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
        <span
          class="text-[0.85rem] font-semibold transition-colors duration-500 text-white/70 dark:text-white/70 light:text-slate-900"
        >
          {{ engines[engine].icon }}
        </span>
      </button>

      <!-- Input -->
      <input
        v-model="query"
        class="flex-1 h-11 bg-transparent border-none outline-none text-base px-2 transition-colors duration-500 text-white placeholder:text-white/30 dark:text-white dark:placeholder:text-white/30 light:text-slate-900 light:placeholder:text-slate-500/80"
        type="text"
        :placeholder="t('search.placeholder')"
        autofocus
        @keydown.enter="search"
        @keydown.escape="query = ''"
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

    <!-- Engine dropdown -->
    <Transition name="dropdown">
      <div
        v-if="showEngineMenu"
        class="absolute top-[calc(100%+8px)] left-0 rounded-xl backdrop-blur-xl border p-1.5 min-w-40 z-[100] shadow-[0_8px_32px_rgba(0,0,0,0.4)] transition-colors duration-500 bg-slate-900/95 border-white/12 dark:bg-slate-900/95 dark:border-white/12 light:bg-[rgba(248,251,255,0.84)] light:border-[rgba(255,255,255,0.78)] light:[box-shadow:0_20px_46px_rgba(116,138,176,0.2),inset_0_1px_0_rgba(255,255,255,0.84)]"
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
          <span class="text-[0.8rem] font-bold w-5 text-center">{{ eng.icon }}</span>
          <span>{{ eng.name }}</span>
        </button>
      </div>
    </Transition>

    <!-- Click outside to close -->
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
