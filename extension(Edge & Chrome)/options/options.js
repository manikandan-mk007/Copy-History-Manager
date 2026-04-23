const maxItemsInput = document.getElementById("maxItems");
const trackingEnabledInput = document.getElementById("trackingEnabled");
const ignoreDuplicatesInput = document.getElementById("ignoreDuplicates");
const backendUrlInput = document.getElementById("backendUrl");
const blockedDomainsInput = document.getElementById("blockedDomains");
const saveBtn = document.getElementById("saveBtn");
const statusMsg = document.getElementById("statusMsg");

const DEFAULT_SETTINGS = {
  maxItems: 20,
  trackingEnabled: true,
  ignoreDuplicates: true,
  cloudSyncEnabled: false,
  backendUrl: "https://copy-history-manager.onrender.com",
  blockedDomains: [],
  theme: "dark"
};

document.addEventListener("DOMContentLoaded", async () => {
  const response = await chrome.runtime.sendMessage({ type: "GET_SETTINGS" });
  const settings = { ...DEFAULT_SETTINGS, ...(response.data || {}) };

  maxItemsInput.value = settings.maxItems;
  trackingEnabledInput.checked = settings.trackingEnabled;
  ignoreDuplicatesInput.checked = settings.ignoreDuplicates;
  backendUrlInput.value = settings.backendUrl || "";
  blockedDomainsInput.value = (settings.blockedDomains || []).join(", ");
});

saveBtn.addEventListener("click", async () => {
  const oldRes = await chrome.runtime.sendMessage({ type: "GET_SETTINGS" });
  const oldSettings = { ...DEFAULT_SETTINGS, ...(oldRes.data || {}) };

  const newMaxItems = Number(maxItemsInput.value);
  if (!newMaxItems || newMaxItems < 1 || newMaxItems > 500) {
    statusMsg.textContent = "Max items must be between 1 and 500.";
    statusMsg.style.color = "#f87171";
    return;
  }

  const settings = {
    ...oldSettings,
    maxItems: newMaxItems,
    trackingEnabled: trackingEnabledInput.checked,
    ignoreDuplicates: ignoreDuplicatesInput.checked,
    backendUrl: backendUrlInput.value.trim(),
    blockedDomains: blockedDomainsInput.value
      .split(",")
      .map((d) => d.trim())
      .filter(Boolean),
    theme: "dark"
  };

  await chrome.runtime.sendMessage({
    type: "SAVE_SETTINGS",
    payload: settings
  });

  statusMsg.textContent = "Settings saved successfully";
  statusMsg.style.color = "";
  setTimeout(() => {
    statusMsg.textContent = "";
  }, 3000);
});
