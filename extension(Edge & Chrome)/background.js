import {
  getHistory,
  addOrUpdateHistoryItem,
  deleteHistoryItem,
  clearHistory,
  togglePinHistoryItem,
  getSettings,
  saveSettings,
  getAuth,
  saveAuth,
  clearAuth,
  mergeCloudHistory
} from "./utils/storage.js";

import {
  syncHistoryItemToCloud,
  syncAllHistoryToCloud,
  fetchCloudHistory
} from "./utils/sync.js";

chrome.runtime.onInstalled.addListener(async () => {
  const settings = await getSettings();

  if (!settings) {
    await saveSettings({
      maxItems: 20,
      trackingEnabled: true,
      ignoreDuplicates: true,
      cloudSyncEnabled: false,
      backendUrl: "http://127.0.0.1:8000",
      blockedDomains: [],
      theme: "dark"
    });
  }
});

// ── Commands ──────────────────────────────────────────────────────────────────
chrome.commands.onCommand.addListener(async (command) => {
  if (command === "open_popup_window") {
    chrome.windows.create({
      url: chrome.runtime.getURL("popup/popup.html"),
      type: "popup",
      width: 420,
      height: 600,
      focused: true
    });
    return;
  }

  if (command === "open_history_page") {
    chrome.tabs.create({ url: chrome.runtime.getURL("pages/history.html") });
    return;
  }

  if (command === "toggle_tracking") {
    const settings = await getSettings();
    const next = !settings.trackingEnabled;
    await saveSettings({ ...settings, trackingEnabled: next });
    const tabs = await chrome.tabs.query({});
    for (const tab of tabs) {
      chrome.tabs.sendMessage(tab.id, {
        type: "TRACKING_TOGGLED",
        payload: { enabled: next }
      }).catch(() => {});
    }
    return;
  }

  if (command === "open_quick_paste_modal") {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) return;
    chrome.tabs.sendMessage(tab.id, { type: "OPEN_QUICK_PASTE_MODAL" }).catch(() => {});
  }
});

// ── Message handler ───────────────────────────────────────────────────────────
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  (async () => {
    try {
      const response = await handleMessage(message, sender);
      sendResponse(response);
    } catch (error) {
      console.error("Background error:", error);
      sendResponse({ success: false, error: error.message || "Something went wrong" });
    }
  })();
  return true;
});

async function handleMessage(message, sender) {
  switch (message.type) {
    case "COPY_TEXT":
      return await handleCopiedText(message.payload, sender);
    case "GET_HISTORY":
      return { success: true, data: await getHistory() };
    case "DELETE_HISTORY_ITEM":
      await deleteHistoryItem(message.payload.id);
      return { success: true };
    case "CLEAR_HISTORY":
      await clearHistory();
      return { success: true };
    case "TOGGLE_PIN":
      await togglePinHistoryItem(message.payload.id);
      return { success: true };
    case "GET_SETTINGS":
      return { success: true, data: await getSettings() };
    case "SAVE_SETTINGS":
      await saveSettings(message.payload);
      return { success: true };
    case "GET_AUTH_STATUS":
      return { success: true, data: await getAuth() };
    case "SIGNUP":
      return await signupUser(message.payload);
    case "LOGIN":
      return await loginUser(message.payload);
    case "LOGOUT":
      await logoutUser();
      return { success: true };
    case "SYNC_ALL":
      return await handleFullSync();
    default:
      return { success: false, error: "Unknown message type" };
  }
}

// ── Auth ──────────────────────────────────────────────────────────────────────
async function signupUser(payload) {
  const settings = await getSettings();

  const response = await fetch(`${settings.backendUrl}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  const data = await response.json();
  if (!response.ok) return { success: false, error: data.detail || "Signup failed" };

  const authData = { email: payload.email, token: data.access_token, loggedIn: true };
  await saveAuth(authData);

  const updatedSettings = { ...settings, cloudSyncEnabled: true };
  await saveSettings(updatedSettings);
  const settingsWithToken = { ...updatedSettings, authToken: authData.token };

  // Push local → cloud
  const pushResult = await pushLocalToCloud(settingsWithToken);

  // Pull cloud → local and merge (for signup this is mostly a no-op,
  // but handles the case where the account already existed with data)
  const pullResult = await pullCloudToLocal(settingsWithToken, updatedSettings);

  return {
    success: true,
    data: {
      auth: authData,
      pushed: pushResult.count,
      restored: pullResult.count,
      syncError: pushResult.error || pullResult.error || null
    }
  };
}

async function loginUser(payload) {
  const settings = await getSettings();

  const response = await fetch(`${settings.backendUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  const data = await response.json();
  if (!response.ok) return { success: false, error: data.detail || "Login failed" };

  const authData = { email: payload.email, token: data.access_token, loggedIn: true };
  await saveAuth(authData);

  const updatedSettings = { ...settings, cloudSyncEnabled: true };
  await saveSettings(updatedSettings);
  const settingsWithToken = { ...updatedSettings, authToken: authData.token };

  // Step 1: Push any local-only items up to the cloud first
  const pushResult = await pushLocalToCloud(settingsWithToken);

  // Step 2: Pull ALL cloud items back down and merge into local storage
  // This is what restores history on a new device or after clearing browser data
  const pullResult = await pullCloudToLocal(settingsWithToken, updatedSettings);

  return {
    success: true,
    data: {
      auth: authData,
      pushed: pushResult.count,    // items sent to cloud
      restored: pullResult.count,  // items pulled from cloud
      syncError: pushResult.error || pullResult.error || null
    }
  };
}

async function logoutUser() {
  const settings = await getSettings();
  await clearAuth();
  await saveSettings({ ...settings, cloudSyncEnabled: false });
  // Note: local history is intentionally kept on logout so the user
  // doesn't lose their data just because they logged out.
}

// Push local history up to cloud
async function pushLocalToCloud(settingsWithToken) {
  try {
    const history = await getHistory();
    if (!history.length) return { count: 0 };
    await syncAllHistoryToCloud(history, settingsWithToken);
    return { count: history.length };
  } catch (error) {
    console.warn("[QuickCopy] Push to cloud failed:", error.message);
    return { count: 0, error: error.message };
  }
}

// Pull cloud history and merge into local storage
async function pullCloudToLocal(settingsWithToken, settingsForMax) {
  try {
    const cloudItems = await fetchCloudHistory(settingsWithToken);
    if (!cloudItems.length) return { count: 0 };

    await mergeCloudHistory(cloudItems, settingsForMax);
    return { count: cloudItems.length };
  } catch (error) {
    console.warn("[QuickCopy] Pull from cloud failed:", error.message);
    return { count: 0, error: error.message };
  }
}

// ── Copy handling ─────────────────────────────────────────────────────────────
async function handleCopiedText(payload, sender) {
  const settings = await getSettings();
  const auth = await getAuth();

  if (!settings?.trackingEnabled) return { success: false, error: "Tracking disabled" };

  const text = (payload.text || "").trim();
  if (!text) return { success: false, error: "Empty text" };

  const senderUrl = payload.sourceUrl || sender?.tab?.url || "";
  const senderTitle = payload.sourceTitle || sender?.tab?.title || "";

  if (isBlockedDomain(senderUrl, settings.blockedDomains || [])) {
    return { success: false, error: "Blocked domain" };
  }

  const item = {
    id: generateId(),
    text,
    sourceUrl: senderUrl,
    sourceTitle: senderTitle,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isPinned: false,
    copyCount: 1
  };

  const updatedHistory = await addOrUpdateHistoryItem(item, settings);
  const topItem = updatedHistory[0];

  if (settings.cloudSyncEnabled && auth?.token && settings.backendUrl) {
    try {
      await syncHistoryItemToCloud(topItem, { ...settings, authToken: auth.token });
    } catch (error) {
      console.warn("[QuickCopy] Cloud sync failed:", error.message);
    }
  }

  return { success: true, data: topItem };
}

async function handleFullSync() {
  const settings = await getSettings();
  const history = await getHistory();
  const auth = await getAuth();

  if (!settings.cloudSyncEnabled || !auth?.token || !settings.backendUrl) {
    return { success: false, error: "Cloud sync not configured" };
  }

  const settingsWithToken = { ...settings, authToken: auth.token };

  // Bidirectional: push first, then pull and merge
  await syncAllHistoryToCloud(history, settingsWithToken);
  const cloudItems = await fetchCloudHistory(settingsWithToken);
  await mergeCloudHistory(cloudItems, settings);

  return { success: true, data: { syncedCount: cloudItems.length } };
}

// ── Utilities ─────────────────────────────────────────────────────────────────
function isBlockedDomain(url, blockedDomains) {
  try {
    const hostname = new URL(url).hostname;
    return blockedDomains.some((domain) => hostname.includes(domain));
  } catch {
    return false;
  }
}

function generateId() {
  return `copy_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}
