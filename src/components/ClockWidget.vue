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
      class="clock-time inline-block text-[clamp(2rem,6vw,6rem)] font-[200] tracking-[0.04em] leading-none whitespace-nowrap transition-[color,text-shadow] duration-500 text-white dark:text-white light:text-slate-800 [text-shadow:0_0_60px_rgba(120,160,255,0.35),0_2px_12px_rgba(0,0,0,0.35)] dark:[text-shadow:0_0_60px_rgba(120,160,255,0.35),0_2px_12px_rgba(0,0,0,0.35)] light:[text-shadow:0_8px_32px_rgba(255,255,255,0.7),0_2px_8px_rgba(116,138,176,0.15)]"
      :style="{ minWidth: showSeconds ? '8ch' : '5ch' }"
    >
      {{ time }}
    </div>
    <div
      class="mt-3 text-[clamp(0.65rem,1.2vw,0.9rem)] font-[300] tracking-[0.22em] uppercase transition-colors duration-500 text-white/45 dark:text-white/45 light:text-slate-500"
    >
      {{ date }}
    </div>
  </div>
</template>
