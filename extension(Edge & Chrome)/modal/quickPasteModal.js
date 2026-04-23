function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function truncateText(text, maxLength = 140) {
  if (!text) return "";
  return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
}

function formatDateTime(isoString) {
  if (!isoString) return "";
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return isoString;
  return date.toLocaleString();
}

export async function openQuickPasteModal() {
  removeExistingModal();

  const response = await chrome.runtime.sendMessage({ type: "GET_HISTORY" });
  const items = (response?.data || []).slice(0, 20);

  const overlay = document.createElement("div");
  overlay.id = "chm-quick-paste-overlay";

  overlay.innerHTML = `
    <div class="chm-modal-backdrop"></div>
    <div class="chm-modal-panel" role="dialog" aria-modal="true" aria-label="Quick Paste Modal">
      <div class="chm-modal-header">
        <div>
          <div class="chm-modal-title">Quick Paste</div>
          <div class="chm-modal-subtitle">Search and recopy your saved clipboard history</div>
        </div>
        <button class="chm-close-btn" id="chm-close-btn" title="Close">✕</button>
      </div>

      <div class="chm-search-wrap">
        <input
          type="text"
          id="chm-search-input"
          class="chm-search-input"
          placeholder="Search copied text..."
          autocomplete="off"
        />
      </div>

      <div id="chm-modal-list" class="chm-modal-list"></div>

      <div class="chm-footer-note">
        Press <strong>Esc</strong> to close
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  const searchInput = document.getElementById("chm-search-input");
  const listEl = document.getElementById("chm-modal-list");
  const closeBtn = document.getElementById("chm-close-btn");

  function renderList(query = "") {
    const filtered = items.filter((item) => {
      const q = query.toLowerCase();
      return (
        item.text.toLowerCase().includes(q) ||
        (item.sourceTitle || "").toLowerCase().includes(q) ||
        (item.sourceUrl || "").toLowerCase().includes(q)
      );
    });

    if (!filtered.length) {
      listEl.innerHTML = `
        <div class="chm-empty-state">
          No matching copied text found.
        </div>
      `;
      return;
    }

    listEl.innerHTML = filtered
      .map(
        (item) => `
          <button class="chm-item ${item.isPinned ? "pinned" : ""}" data-id="${item.id}">
            <div class="chm-item-top">
              <span class="chm-item-badge">${item.isPinned ? "Pinned" : "Recent"}</span>
              <span class="chm-item-time">${escapeHtml(formatDateTime(item.updatedAt || item.createdAt))}</span>
            </div>
            <div class="chm-item-text">${escapeHtml(truncateText(item.text, 180))}</div>
            <div class="chm-item-source">${escapeHtml(item.sourceTitle || item.sourceUrl || "Unknown Source")}</div>
          </button>
        `
      )
      .join("");

    listEl.querySelectorAll(".chm-item").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const id = btn.dataset.id;
        const selected = filtered.find((item) => item.id === id);
        if (!selected) return;

        await navigator.clipboard.writeText(selected.text);
        showToast("Copied back to clipboard");
        removeExistingModal();
      });
    });
  }

  renderList();

  searchInput.focus();

  searchInput.addEventListener("input", () => {
    renderList(searchInput.value.trim());
  });

  closeBtn.addEventListener("click", removeExistingModal);
  overlay.querySelector(".chm-modal-backdrop").addEventListener("click", removeExistingModal);

  document.addEventListener("keydown", handleEscClose);
}

function handleEscClose(event) {
  if (event.key === "Escape") {
    removeExistingModal();
  }
}

function removeExistingModal() {
  const existing = document.getElementById("chm-quick-paste-overlay");
  if (existing) existing.remove();
  document.removeEventListener("keydown", handleEscClose);
}

function showToast(message) {
  const toast = document.createElement("div");
  toast.className = "chm-toast";
  toast.textContent = message;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.classList.add("show");
  }, 10);

  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 250);
  }, 1800);
}