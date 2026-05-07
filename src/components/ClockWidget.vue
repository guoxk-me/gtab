<script setup lang="ts">
import { ref, onMounted, onUnmounted } from "vue";

const props = defineProps<{ showSeconds?: boolean }>();

const time = ref("");
const date = ref("");

function update() {
  const now = new Date();
  const h = String(now.getHours()).padStart(2, "0");
  const m = String(now.getMinutes()).padStart(2, "0");
  const s = String(now.getSeconds()).padStart(2, "0");
  time.value = props.showSeconds ? `${h}:${m}:${s}` : `${h}:${m}`;

  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  date.value = `${days[now.getDay()]}, ${months[now.getMonth()]} ${now.getDate()}`;
}

let timer: ReturnType<typeof setInterval>;

onMounted(() => {
  update();
  timer = setInterval(update, 1000);
});

onUnmounted(() => clearInterval(timer));
</script>

<template>
  <div class="clock">
    <div class="clock-time">{{ time }}</div>
    <div class="clock-date">{{ date }}</div>
  </div>
</template>

<style scoped>
.clock {
  text-align: center;
  user-select: none;
}

.clock-time {
  font-size: clamp(4rem, 10vw, 8rem);
  font-weight: 200;
  letter-spacing: 0.05em;
  color: #fff;
  text-shadow:
    0 0 40px rgba(120, 160, 255, 0.4),
    0 2px 8px rgba(0, 0, 0, 0.5);
  line-height: 1;
}

.clock-date {
  margin-top: 0.5rem;
  font-size: clamp(0.9rem, 2vw, 1.1rem);
  font-weight: 300;
  color: rgba(255, 255, 255, 0.55);
  letter-spacing: 0.15em;
  text-transform: uppercase;
}
</style>
