import { formatDateTime, truncateText, escapeHtml, getDomainLabel } from "../utils/helpers.js";

const historyList = document.getElementById("historyList");
const searchInput = document.getElementById("searchInput");
const clearAllBtn = document.getElementById("clearAllBtn");
const statusText = document.getElementById("statusText");
const openHistoryPageBtn = document.getElementById("openHistoryPage");
const authStatus = document.getElementById("authStatus");
const authBtn = document.getElementById("authBtn");
const logoutBtn = document.getElementById("logoutBtn");

let allItems = [];

document.addEventListener("DOMContentLoaded", async () => {
  await loadAuthStatus();
  await loadHistory();

  searchInput.addEventListener("input", renderFilteredHistory);
  clearAllBtn.addEventListener("click", handleClearAll);
  openHistoryPageBtn.addEventListener("click", () => {
    chrome.tabs.create({ url: chrome.runtime.getURL("pages/history.html") });
  });

  authBtn.addEventListener("click", () => {
    chrome.tabs.create({ url: chrome.runtime.getURL("auth/auth.html") });
  });

  logoutBtn.addEventListener("click", async () => {
    await chrome.runtime.sendMessage({ type: "LOGOUT" });
    await loadAuthStatus();
  });
});

async function loadAuthStatus() {
  const response = await chrome.runtime.sendMessage({ type: "GET_AUTH_STATUS" });
  const auth = response.data;

  if (auth?.loggedIn) {
    authStatus.textContent = `Cloud sync: Logged in as ${auth.email}`;
    authBtn.classList.add("hidden");
    logoutBtn.classList.remove("hidden");
  } else {
    authStatus.textContent = "Cloud sync: Not logged in (local storage still works)";
    authBtn.classList.remove("hidden");
    logoutBtn.classList.add("hidden");
  }
}

async function loadHistory() {
  const response = await chrome.runtime.sendMessage({ type: "GET_HISTORY" });

  if (!response.success) {
    statusText.textContent = "Failed to load history";
    return;
  }

  allItems = response.data || [];
  renderFilteredHistory();
}

function renderFilteredHistory() {
  const query = searchInput.value.trim().toLowerCase();

  const items = allItems.filter((item) =>
    item.text.toLowerCase().includes(query) ||
    (item.sourceTitle || "").toLowerCase().includes(query) ||
    (item.sourceUrl || "").toLowerCase().includes(query)
  );

  statusText.textContent = `${items.length} item(s) saved locally`;

  if (!items.length) {
    historyList.innerHTML = `<div class="empty">No copied text found.</div>`;
    return;
  }

  historyList.innerHTML = items
    .map(
      (item) => `
      <div class="history-card ${item.isPinned ? "pinned" : ""}">
        <div class="card-top">
          <span class="badge">${item.isPinned ? "Pinned" : "Recent"}</span>
          <span class="time">${formatDateTime(item.updatedAt || item.createdAt)}</span>
        </div>

        <div class="text">${escapeHtml(truncateText(item.text, 180))}</div>
        <div class="meta">${escapeHtml(item.sourceTitle || getDomainLabel(item.sourceUrl) || "Unknown Source")}</div>

        <div class="actions">
          <button class="action-btn recopy" data-id="${item.id}">Recopy</button>
          <button class="action-btn pin" data-id="${item.id}">
            ${item.isPinned ? "Unpin" : "Pin"}
          </button>
          <button class="action-btn delete" data-id="${item.id}">Delete</button>
        </div>
      </div>
    `
    )
    .join("");

  addActionListeners(items);
}

function addActionListeners(items) {
  document.querySelectorAll(".recopy").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.dataset.id;
      const item = items.find((x) => x.id === id);
      if (!item) return;

      await navigator.clipboard.writeText(item.text);
      statusText.textContent = "Copied back to clipboard";
    });
  });

  document.querySelectorAll(".pin").forEach((btn) => {
    btn.addEventListener("click", async () => {
      await chrome.runtime.sendMessage({
        type: "TOGGLE_PIN",
        payload: { id: btn.dataset.id }
      });
      await loadHistory();
    });
  });

  document.querySelectorAll(".delete").forEach((btn) => {
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
  const confirmClear = confirm("Clear all copied history?");
  if (!confirmClear) return;

  await chrome.runtime.sendMessage({ type: "CLEAR_HISTORY" });
  await loadHistory();
}