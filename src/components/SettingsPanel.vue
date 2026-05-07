<script setup lang="ts">
import { ref, reactive } from "vue";
import type { Settings, QuickLink } from "../composables/useStorage";

const props = defineProps<{ settings: Settings }>();
const emit = defineEmits<{ save: [settings: Settings]; close: [] }>();

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
  local.quickLinks = local.quickLinks.filter((l) => l.id !== id);
}

function save() {
  emit("save", JSON.parse(JSON.stringify(local)));
}

const engineLabels: Record<string, string> = {
  google: "Google",
  bing: "Bing",
  baidu: "Baidu",
  duckduckgo: "DuckDuckGo",
};
</script>

<template>
  <div class="panel-overlay" @click.self="emit('close')">
    <div class="panel">
      <div class="panel-header">
        <h2>Settings</h2>
        <button class="close-btn" @click="emit('close')">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div class="panel-body">
        <!-- Search Engine -->
        <section class="section">
          <h3>Search Engine</h3>
          <div class="radio-group">
            <label
              v-for="(label, key) in engineLabels"
              :key="key"
              class="radio-item"
              :class="{ active: local.searchEngine === key }"
            >
              <input
                v-model="local.searchEngine"
                type="radio"
                :value="key"
              />
              {{ label }}
            </label>
          </div>
        </section>

        <!-- Clock -->
        <section class="section">
          <h3>Clock</h3>
          <div class="toggle-row">
            <span>Show clock</span>
            <label class="toggle">
              <input v-model="local.showClock" type="checkbox" />
              <span class="toggle-track" />
            </label>
          </div>
          <div v-if="local.showClock" class="toggle-row">
            <span>Show seconds</span>
            <label class="toggle">
              <input v-model="local.showSeconds" type="checkbox" />
              <span class="toggle-track" />
            </label>
          </div>
        </section>

        <!-- Quick Links -->
        <section class="section">
          <h3>Quick Links</h3>
          <div class="links-list">
            <div
              v-for="link in local.quickLinks"
              :key="link.id"
              class="link-row"
            >
              <span class="link-row-name">{{ link.name }}</span>
              <span class="link-row-url">{{ link.url }}</span>
              <button class="remove-btn" @click="removeLink(link.id)">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          <div v-if="addingLink" class="add-form">
            <input
              v-model="newLink.name"
              class="text-input"
              placeholder="Name"
              @keydown.enter="addLink"
              @keydown.escape="addingLink = false"
            />
            <input
              v-model="newLink.url"
              class="text-input"
              placeholder="URL (e.g. github.com)"
              @keydown.enter="addLink"
              @keydown.escape="addingLink = false"
            />
            <div class="add-form-actions">
              <button class="btn-secondary" @click="addingLink = false">Cancel</button>
              <button class="btn-primary" @click="addLink">Add</button>
            </div>
          </div>
          <button v-else class="btn-ghost" @click="addingLink = true">
            + Add link
          </button>
        </section>
      </div>

      <div class="panel-footer">
        <button class="btn-secondary" @click="emit('close')">Cancel</button>
        <button class="btn-primary" @click="save">Save</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.panel-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  z-index: 200;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.panel {
  background: rgba(12, 18, 38, 0.97);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 20px;
  width: 100%;
  max-width: 480px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 24px 64px rgba(0, 0, 0, 0.6);
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.panel-header h2 {
  font-size: 1.1rem;
  font-weight: 500;
  color: #fff;
}

.close-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  background: none;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  color: rgba(255, 255, 255, 0.5);
  transition: background 0.15s, color 0.15s;
}

.close-btn:hover {
  background: rgba(255, 255, 255, 0.08);
  color: #fff;
}

.panel-body {
  flex: 1;
  overflow-y: auto;
  padding: 16px 24px;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.panel-body::-webkit-scrollbar {
  width: 4px;
}

.panel-body::-webkit-scrollbar-track {
  background: transparent;
}

.panel-body::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.15);
  border-radius: 2px;
}

.section h3 {
  font-size: 0.75rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.4);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  margin-bottom: 12px;
}

/* Radio group */
.radio-group {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.radio-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border-radius: 20px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  cursor: pointer;
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.6);
  transition: all 0.15s;
}

.radio-item input {
  display: none;
}

.radio-item.active {
  background: rgba(120, 160, 255, 0.15);
  border-color: rgba(120, 160, 255, 0.5);
  color: #7aa0ff;
}

/* Toggle */
.toggle-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 0;
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.7);
}

.toggle {
  position: relative;
  cursor: pointer;
}

.toggle input {
  display: none;
}

.toggle-track {
  display: block;
  width: 40px;
  height: 22px;
  background: rgba(255, 255, 255, 0.15);
  border-radius: 11px;
  transition: background 0.2s;
  position: relative;
}

.toggle-track::after {
  content: "";
  position: absolute;
  top: 3px;
  left: 3px;
  width: 16px;
  height: 16px;
  background: #fff;
  border-radius: 50%;
  transition: transform 0.2s;
}

.toggle input:checked + .toggle-track {
  background: #7aa0ff;
}

.toggle input:checked + .toggle-track::after {
  transform: translateX(18px);
}

/* Links list */
.links-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 8px;
}

.link-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.04);
}

.link-row-name {
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.8);
  min-width: 80px;
}

.link-row-url {
  flex: 1;
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.35);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.remove-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  background: none;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  color: rgba(255, 255, 255, 0.3);
  flex-shrink: 0;
  transition: background 0.15s, color 0.15s;
}

.remove-btn:hover {
  background: rgba(255, 80, 80, 0.15);
  color: #ff6b6b;
}

/* Add form */
.add-form {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.text-input {
  width: 100%;
  padding: 8px 12px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  color: #fff;
  font-size: 0.875rem;
  outline: none;
  transition: border-color 0.15s;
}

.text-input:focus {
  border-color: rgba(120, 160, 255, 0.5);
}

.text-input::placeholder {
  color: rgba(255, 255, 255, 0.25);
}

.add-form-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}

/* Buttons */
.btn-primary {
  padding: 8px 18px;
  background: #7aa0ff;
  border: none;
  border-radius: 8px;
  color: #0a0f2e;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s;
}

.btn-primary:hover {
  background: #92b4ff;
}

.btn-secondary {
  padding: 8px 18px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 8px;
  color: rgba(255, 255, 255, 0.7);
  font-size: 0.875rem;
  cursor: pointer;
  transition: background 0.15s;
}

.btn-secondary:hover {
  background: rgba(255, 255, 255, 0.12);
}

.btn-ghost {
  padding: 8px 0;
  background: none;
  border: none;
  color: rgba(120, 160, 255, 0.7);
  font-size: 0.875rem;
  cursor: pointer;
  transition: color 0.15s;
}

.btn-ghost:hover {
  color: #7aa0ff;
}

.panel-footer {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
  padding: 16px 24px 20px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}
</style>
