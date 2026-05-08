<script setup lang="ts">
import { ref, onMounted, onUnmounted } from "vue";
import type { AppLocale } from "../i18n";

const props = defineProps<{ showSeconds?: boolean; locale: AppLocale }>();

const time = ref("");
const date = ref("");

function update() {
  const now = new Date();
  const h = String(now.getHours()).padStart(2, "0");
  const m = String(now.getMinutes()).padStart(2, "0");
  const s = String(now.getSeconds()).padStart(2, "0");
  time.value = props.showSeconds ? `${h}:${m}:${s}` : `${h}:${m}`;

  date.value = new Intl.DateTimeFormat(props.locale, {
    weekday: "long",
    month: "short",
    day: "numeric",
  }).format(now);
}

let timer: ReturnType<typeof setInterval>;

onMounted(() => {
  update();
  timer = setInterval(update, 1000);
});

onUnmounted(() => clearInterval(timer));
</script>

<template>
  <div class="text-center select-none">
    <div
      class="text-[clamp(4rem,10vw,8rem)] font-thin tracking-[0.05em] leading-none transition-[color,text-shadow] duration-500 text-white dark:text-white light:text-slate-900 [text-shadow:0_0_40px_rgba(120,160,255,0.4),0_2px_8px_rgba(0,0,0,0.5)] dark:[text-shadow:0_0_40px_rgba(120,160,255,0.4),0_2px_8px_rgba(0,0,0,0.5)] light:[text-shadow:0_12px_24px_rgba(255,255,255,0.58),0_2px_10px_rgba(116,138,176,0.18)]"
    >
      {{ time }}
    </div>
    <div
      class="mt-2 text-[clamp(0.9rem,2vw,1.1rem)] font-light tracking-[0.15em] uppercase transition-colors duration-500 text-white/55 dark:text-white/55 light:text-slate-600/95"
    >
      {{ date }}
    </div>
  </div>
</template>
