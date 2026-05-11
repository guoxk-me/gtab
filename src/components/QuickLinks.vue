<script setup lang="ts">
import { useI18n } from "vue-i18n";
import type { QuickLink } from "../composables/useStorage";
import { getKnownQuickLinkIcon } from "../composables/quickLinkIcons";

defineProps<{ links: QuickLink[] }>();
const emit = defineEmits<{ edit: [] }>();
const { t } = useI18n();

function getIconClass(link: QuickLink): string {
  return getKnownQuickLinkIcon(link.url);
}

function getInitial(name: string): string {
  return name.charAt(0).toUpperCase();
}
</script>

<template>
  <div class="flex flex-wrap gap-3 sm:gap-4 justify-center max-w-[700px] px-4 sm:px-0">
    <a
      v-for="link in links"
      :key="link.id"
      :href="link.url"
      class="group flex flex-col items-center gap-2 no-underline cursor-pointer bg-transparent border-0 p-0"
      :title="link.name"
    >
      <div
        class="relative w-12 h-12 sm:w-14 sm:h-14 rounded-2xl backdrop-blur-xl flex items-center justify-center transition-all duration-200 transition-colors duration-500 overflow-hidden border bg-white/10 border-white/15 dark:bg-white/10 dark:border-white/15 light:bg-[rgba(255,255,255,0.66)] light:border-[rgba(255,255,255,0.76)] light:[box-shadow:var(--light-shadow-soft)] group-hover:bg-white/18 group-hover:-translate-y-0.5 group-hover:shadow-[0_8px_24px_rgba(0,0,0,0.3)] dark:group-hover:bg-white/18 light:group-hover:bg-[rgba(255,255,255,0.82)] light:group-hover:border-[rgba(255,255,255,0.88)] light:group-hover:[box-shadow:0_18px_34px_rgba(117,144,187,0.22),inset_0_1px_0_rgba(255,255,255,0.84)]"
      >
        <span
          v-if="getIconClass(link)"
          :class="[getIconClass(link), 'h-6 w-6 sm:h-7 sm:w-7 relative z-10']"
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

    <!-- Add button -->
    <button
      class="group flex flex-col items-center gap-2 bg-transparent border-0 p-0 cursor-pointer"
      :title="t('quickLinks.edit')"
      @click="emit('edit')"
    >
      <div
        class="relative w-12 h-12 sm:w-14 sm:h-14 rounded-2xl backdrop-blur-xl flex items-center justify-center transition-all duration-200 transition-colors duration-500 border-dashed border text-white/40 border-white/20 dark:text-white/40 dark:border-white/20 light:bg-[rgba(255,255,255,0.52)] light:text-slate-500 light:border-[rgba(159,179,212,0.56)] light:[box-shadow:0_14px_28px_rgba(125,148,186,0.12)] group-hover:border-white/40 group-hover:text-white/80 group-hover:-translate-y-0.5 dark:group-hover:border-white/40 dark:group-hover:text-white/80 light:group-hover:bg-[rgba(255,255,255,0.78)] light:group-hover:border-[rgba(118,146,194,0.62)] light:group-hover:text-slate-800 light:group-hover:[box-shadow:0_18px_34px_rgba(117,144,187,0.18)]"
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
</template>
