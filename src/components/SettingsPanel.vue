<script setup lang="ts">
import { ref, reactive } from "vue";
import type { BasicColorSchema } from "@vueuse/core";
import { useI18n } from "vue-i18n";
import type { Settings, QuickLink, LanguageSetting } from "../composables/useStorage";

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

// Local copy to edit
const local = reactive<Settings>(JSON.parse(JSON.stringify(props.settings)));

const newLink = ref({ name: "", url: "" });
const addingLink = ref(false);

function addLink() {
  if (!newLink.value.name.trim() || !newLink.value.url.trim()) return;
  let url = newLink.value.url.trim();
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    url = "https://" + url;
  }
  local.quickLinks.push({
    id: Date.now().toString(),
    name: newLink.value.name.trim(),
    url,
  });
  newLink.value = { name: "", url: "" };
  addingLink.value = false;
}

function removeLink(id: string) {
  local.quickLinks = local.quickLinks.filter((l: QuickLink) => l.id !== id);
}

function save() {
  emit("save", JSON.parse(JSON.stringify(local)));
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
    class="fixed inset-0 bg-black/50 backdrop-blur-sm z-[200] flex items-center justify-center p-5 transition-colors duration-500 light:bg-[rgba(226,235,247,0.55)]"
    @click.self="emit('close')"
  >
    <!-- Panel -->
    <div
      class="w-full max-w-[480px] max-h-[80vh] flex flex-col rounded-[20px] shadow-[0_24px_64px_rgba(0,0,0,0.6)] border transition-colors duration-500 bg-slate-950/97 border-white/10 dark:bg-slate-950/97 dark:border-white/10 light:bg-[rgba(247,250,255,0.92)] light:border-[rgba(255,255,255,0.82)] light:[box-shadow:var(--light-shadow-panel)]"
    >
      <!-- Header -->
      <div
        class="flex items-center justify-between px-6 py-5 border-b transition-colors duration-500 border-white/8 dark:border-white/8 light:border-[rgba(194,208,231,0.72)]"
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
      <div class="flex-1 overflow-y-auto px-6 py-4 flex flex-col gap-6 scrollbar-thin">
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

        <!-- Quick Links -->
        <section class="flex flex-col gap-2">
          <h3
            class="text-xs font-semibold uppercase tracking-[0.1em] mb-1 transition-colors duration-500 text-white/40 dark:text-white/40 light:text-slate-500"
          >
            {{ t("settings.quickLinks") }}
          </h3>

          <div class="flex flex-col gap-1 mb-1">
            <div
              v-for="link in local.quickLinks"
              :key="link.id"
              class="flex items-center gap-2 px-2.5 py-2 rounded-lg transition-colors duration-500 bg-white/4 dark:bg-white/4 light:bg-[rgba(255,255,255,0.56)] light:border light:border-[rgba(210,221,239,0.8)]"
            >
              <span
                class="text-[0.875rem] min-w-20 transition-colors duration-500 text-white/80 dark:text-white/80 light:text-slate-700"
              >
                {{ link.name }}
              </span>
              <span
                class="flex-1 text-xs overflow-hidden text-ellipsis whitespace-nowrap transition-colors duration-500 text-white/35 dark:text-white/35 light:text-slate-500"
              >
                {{ link.url }}
              </span>
              <button
                class="flex items-center justify-center w-6 h-6 bg-transparent border-none rounded-md cursor-pointer flex-shrink-0 transition-all duration-150 transition-colors duration-500 text-white/30 hover:bg-red-500/15 hover:text-red-400 dark:text-white/30 dark:hover:bg-red-500/15 dark:hover:text-red-400 light:text-slate-400 light:hover:bg-red-500/10 light:hover:text-red-500"
                @click="removeLink(link.id)"
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
        class="flex gap-2 justify-end px-6 py-4 border-t transition-colors duration-500 border-white/8 dark:border-white/8 light:border-[rgba(194,208,231,0.72)]"
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
