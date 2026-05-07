<script setup lang="ts">
import type { QuickLink } from "../composables/useStorage";

defineProps<{ links: QuickLink[] }>();
const emit = defineEmits<{ edit: [] }>();

function getFaviconUrl(url: string): string {
  try {
    const origin = new URL(url).origin;
    return `https://www.google.com/s2/favicons?domain=${origin}&sz=64`;
  } catch {
    return "";
  }
}

function getInitial(name: string): string {
  return name.charAt(0).toUpperCase();
}
</script>

<template>
  <div class="quick-links">
    <a
      v-for="link in links"
      :key="link.id"
      :href="link.url"
      class="link-item"
      :title="link.name"
    >
      <div class="link-icon">
        <img
          :src="getFaviconUrl(link.url)"
          :alt="link.name"
          @error="(e) => ((e.target as HTMLImageElement).style.display = 'none')"
        />
        <span class="link-initial">{{ getInitial(link.name) }}</span>
      </div>
      <span class="link-name">{{ link.name }}</span>
    </a>

    <!-- Add button -->
    <button class="link-item add-btn" title="Edit links" @click="emit('edit')">
      <div class="link-icon add-icon">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 5v14M5 12h14" />
        </svg>
      </div>
      <span class="link-name">Add</span>
    </button>
  </div>
</template>

<style scoped>
.quick-links {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  justify-content: center;
  max-width: 700px;
}

.link-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  text-decoration: none;
  cursor: pointer;
  background: none;
  border: none;
  padding: 0;
}

.link-item:hover .link-icon {
  background: rgba(255, 255, 255, 0.15);
  transform: translateY(-3px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
}

.link-item:hover .link-name {
  color: rgba(255, 255, 255, 0.9);
}

.link-icon {
  position: relative;
  width: 56px;
  height: 56px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  overflow: hidden;
}

.link-icon img {
  width: 28px;
  height: 28px;
  object-fit: contain;
  position: relative;
  z-index: 1;
}

.link-initial {
  position: absolute;
  font-size: 1.2rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.6);
}

/* Hide initial when image loads */
.link-icon img + .link-initial {
  display: none;
}

.link-name {
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.5);
  text-align: center;
  max-width: 64px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  transition: color 0.15s;
}

/* Add button */
.add-btn .add-icon {
  border-style: dashed;
  border-color: rgba(255, 255, 255, 0.2);
  color: rgba(255, 255, 255, 0.4);
}

.add-btn:hover .add-icon {
  border-color: rgba(255, 255, 255, 0.4);
  color: rgba(255, 255, 255, 0.8);
}
</style>
