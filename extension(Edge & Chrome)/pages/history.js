import { formatDateTime, escapeHtml, getDomainLabel } from "../utils/helpers.js";

const historyContainer = document.getElementById("historyContainer");
const searchInput = document.getElementById("searchInput");
const clearAllBtn = document.getElementById("clearAllBtn");
const exportBtn = document.getElementById("exportBtn");
const syncBtn = document.getElementById("syncBtn");

let allItems = [];

document.addEventListener("DOMContentLoaded", async () => {
  await loadHistory();

  searchInput.addEventListener("input", renderHistory);
  clearAllBtn.addEventListener("click", handleClearAll);
  exportBtn.addEventListener("click", handleExport);
  syncBtn.addEventListener("click", handleSync);
});

async function loadHistory() {
  const response = await chrome.runtime.sendMessage({ type: "GET_HISTORY" });
  allItems = response.data || [];
  renderHistory();
}

function renderHistory() {
  const query = searchInput.value.trim().toLowerCase();

  const items = allItems.filter(
    (item) =>
      item.text.toLowerCase().includes(query) ||
      (item.sourceTitle || "").toLowerCase().includes(query) ||
      (item.sourceUrl || "").toLowerCase().includes(query)
  );

  if (!items.length) {
    historyContainer.innerHTML = `<div class="empty">No history items found.</div>`;
    return;
  }

  historyContainer.innerHTML = items
    .map(
      (item) => `
      <div class="card ${item.isPinned ? "pinned" : ""}">
        <div class="card-top">
          <span class="badge">${item.isPinned ? "Pinned" : "Recent"}</span>
          <span class="time">${formatDateTime(item.updatedAt || item.createdAt)}</span>
        </div>

        <div class="text">${escapeHtml(item.text)}</div>
        <div class="meta">${escapeHtml(
          item.sourceTitle || getDomainLabel(item.sourceUrl) || "Unknown Source"
        )}</div>

        <div class="actions">
          <button class="recopy-btn" data-id="${item.id}">Recopy</button>
          <button class="pin-btn" data-id="${item.id}">
            ${item.isPinned ? "Unpin" : "Pin"}
          </button>
          <button class="delete-btn" data-id="${item.id}">Delete</button>
        </div>
      </div>
    `
    )
    .join("");

  bindEvents(items);
}

function bindEvents(items) {
  document.querySelectorAll(".recopy-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const item = items.find((x) => x.id === btn.dataset.id);
      if (!item) return;
      await navigator.clipboard.writeText(item.text);
      showToast("Copied to clipboard!");
    });
  });

  document.querySelectorAll(".pin-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      await chrome.runtime.sendMessage({
        type: "TOGGLE_PIN",
        payload: { id: btn.dataset.id }
      });
      await loadHistory();
    });
  });

  document.querySelectorAll(".delete-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      await chrome.runtime.sendMessage({
        type: "DELETE_HISTORY_ITEM",
        payload: { id: btn.dataset.id }
      });
      await loadHistory();
    });
  });
}

async function handleClearAll() {
  const ok = confirm("Are you sure you want to clear all history?");
  if (!ok) return;
  await chrome.runtime.sendMessage({ type: "CLEAR_HISTORY" });
  await loadHistory();
}

function handleExport() {
  const data = JSON.stringify(allItems, null, 2);
  const blob = new Blob([data], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = `copy-history-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();

  URL.revokeObjectURL(url);
}

async function handleSync() {
  syncBtn.disabled = true;
  syncBtn.textContent = "Syncing...";

  const response = await chrome.runtime.sendMessage({ type: "SYNC_ALL" });

  syncBtn.disabled = false;
  syncBtn.innerHTML = `
    <svg viewBox="0 0 20 20" fill="currentColor">
      <path fill-rule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clip-rule="evenodd"/>
    </svg>
    Sync
  `;

  if (response.success) {
    showToast(`Sync done — ${response.data?.syncedCount ?? 0} items synced`);
  } else {
    showToast(response.error || "Sync failed", true);
  }
}

// ── Toast ─────────────────────────────────────────────────────────────────────
function showToast(msg, isError = false) {
  const existing = document.querySelector(".chm-page-toast");
  if (existing) existing.remove();

  const toast = document.createElement("div");
  toast.className = "chm-page-toast";
  toast.textContent = msg;
  toast.style.cssText = `
    position: fixed; bottom: 2rem; right: 2rem;
    background: ${isError ? "#7f1d1d" : "#1e293b"};
    color: ${isError ? "#fca5a5" : "#e2e8f0"};
    border: 1px solid ${isError ? "#b91c1c" : "#334155"};
    padding: 0.75rem 1.25rem; border-radius: 0.5rem;
    font-size: 0.875rem; z-index: 9999;
    box-shadow: 0 4px 20px rgba(0,0,0,0.4);
    opacity: 0; transition: opacity 0.2s;
  `;
  document.body.appendChild(toast);
  requestAnimationFrame(() => (toast.style.opacity = "1"));
  setTimeout(() => {
    toast.style.opacity = "0";
    setTimeout(() => toast.remove(), 200);
  }, 2500);
}
