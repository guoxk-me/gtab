import { ref } from "vue";

const STORAGE_KEY = "gtab_search_history";
const MAX_HISTORY = 50;
const MAX_SUGGESTIONS = 8;

export interface HistoryItem {
  query: string;
  timestamp: number;
}

function loadFromStorage(): HistoryItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

function saveToStorage(items: HistoryItem[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

// Shared reactive state across all composable instances
const history = ref<HistoryItem[]>(loadFromStorage());

export function useSearchHistory() {
  function addHistory(query: string): void {
    const trimmed = query.trim();
    if (!trimmed) return;

    // Remove duplicate (case-insensitive) and move to front
    const filtered = history.value.filter(
      (item) => item.query.toLowerCase() !== trimmed.toLowerCase(),
    );

    const updated = [{ query: trimmed, timestamp: Date.now() }, ...filtered].slice(0, MAX_HISTORY);

    history.value = updated;
    saveToStorage(updated);
  }

  function removeHistory(query: string): void {
    const updated = history.value.filter((item) => item.query !== query);
    history.value = updated;
    saveToStorage(updated);
  }

  function clearHistory(): void {
    history.value = [];
    saveToStorage([]);
  }

  function getMatches(input: string): HistoryItem[] {
    const trimmed = input.trim();
    if (!trimmed) {
      // Return most recent items when input is empty
      return history.value.slice(0, MAX_SUGGESTIONS);
    }
    const lower = trimmed.toLowerCase();
    return history.value
      .filter((item) => item.query.toLowerCase().includes(lower))
      .slice(0, MAX_SUGGESTIONS);
  }

  return {
    history,
    addHistory,
    removeHistory,
    clearHistory,
    getMatches,
  };
}
