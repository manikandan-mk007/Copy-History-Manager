// utils/storage.js

const HISTORY_KEY = "copy_history_items";
const SETTINGS_KEY = "copy_history_settings";
const AUTH_KEY = "copy_history_auth";

export async function getHistory() {
  const result = await chrome.storage.local.get([HISTORY_KEY]);
  return result[HISTORY_KEY] || [];
}

export async function saveHistory(items) {
  await chrome.storage.local.set({ [HISTORY_KEY]: items });
  return items;
}

export async function addOrUpdateHistoryItem(newItem, settings) {
  const history = await getHistory();
  let updated = [...history];

  if (settings.ignoreDuplicates) {
    const existingIndex = updated.findIndex(
      (item) => item.text.trim() === newItem.text.trim()
    );

    if (existingIndex !== -1) {
      const existing = updated[existingIndex];
      updated.splice(existingIndex, 1);

      newItem = {
        ...existing,
        text: newItem.text,
        sourceUrl: newItem.sourceUrl,
        sourceTitle: newItem.sourceTitle,
        updatedAt: new Date().toISOString(),
        copyCount: (existing.copyCount || 1) + 1
      };
    }
  }

  updated.unshift(newItem);
  updated = sortPinnedFirst(updated);
  updated = updated.slice(0, settings.maxItems || 20);

  await saveHistory(updated);
  return updated;
}

// Merge cloud items into local storage without losing local-only items.
// Strategy:
//   - Cloud items + local items are combined
//   - Duplicates are resolved by ID: cloud version wins (it may have updated isPinned, copyCount, etc.)
//   - Result is sorted pinned-first, then by most recent updatedAt
//   - Capped at maxItems
export async function mergeCloudHistory(cloudItems, settings) {
  const localItems = await getHistory();
  const maxItems = settings?.maxItems || 20;

  // Build a map keyed by item ID so cloud items overwrite local ones with same ID
  const merged = new Map();

  // Add local items first (lower priority)
  for (const item of localItems) {
    merged.set(item.id, item);
  }

  // Add cloud items (higher priority — overwrites same ID)
  for (const item of cloudItems) {
    merged.set(item.id, item);
  }

  // Deduplicate by text content — keep the one with the most recent updatedAt
  const textSeen = new Map();
  for (const item of merged.values()) {
    const key = item.text.trim();
    if (!textSeen.has(key)) {
      textSeen.set(key, item);
    } else {
      const existing = textSeen.get(key);
      const existingTime = new Date(existing.updatedAt || existing.createdAt || 0).getTime();
      const newTime = new Date(item.updatedAt || item.createdAt || 0).getTime();
      if (newTime > existingTime) {
        textSeen.set(key, item);
      }
    }
  }

  let result = Array.from(textSeen.values());
  result = sortPinnedFirst(result);
  result = result.slice(0, maxItems);

  await saveHistory(result);
  return result;
}

export async function deleteHistoryItem(id) {
  const history = await getHistory();
  const updated = history.filter((item) => item.id !== id);
  await saveHistory(updated);
}

export async function clearHistory() {
  await saveHistory([]);
}

export async function togglePinHistoryItem(id) {
  const history = await getHistory();

  const updated = history.map((item) =>
    item.id === id ? { ...item, isPinned: !item.isPinned } : item
  );

  await saveHistory(sortPinnedFirst(updated));
}

export async function getSettings() {
  const result = await chrome.storage.local.get([SETTINGS_KEY]);
  return result[SETTINGS_KEY] || null;
}

export async function saveSettings(settings) {
  await chrome.storage.local.set({ [SETTINGS_KEY]: settings });
  return settings;
}

export async function getAuth() {
  const result = await chrome.storage.local.get([AUTH_KEY]);
  return result[AUTH_KEY] || null;
}

export async function saveAuth(authData) {
  await chrome.storage.local.set({ [AUTH_KEY]: authData });
  return authData;
}

export async function clearAuth() {
  await chrome.storage.local.remove([AUTH_KEY]);
}

function sortPinnedFirst(items) {
  return [...items].sort((a, b) => {
    if (a.isPinned === b.isPinned) {
      const aTime = new Date(a.updatedAt || a.createdAt || 0).getTime();
      const bTime = new Date(b.updatedAt || b.createdAt || 0).getTime();
      return bTime - aTime;
    }
    return a.isPinned ? -1 : 1;
  });
}
