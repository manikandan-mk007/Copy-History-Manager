// content.js — QuickCopy History Manager
// Captures text copied via Ctrl+C AND via AI site copy buttons (ChatGPT, Gemini,
// Claude, Perplexity, You.com, Copilot, Grok, etc.)

let quickPasteLoaded = false;
let quickPasteModule = null;

// ── 1. Inject page-context interceptor ──────────────────────────────────────
// We use a src-based script so it works on sites with strict CSP (inline scripts
// are blocked there, but chrome-extension:// src URLs are always allowed).
(function injectInterceptor() {
  try {
    const existing = document.getElementById("__chm_interceptor__");
    if (existing) return;

    const script = document.createElement("script");
    script.id = "__chm_interceptor__";
    script.src = chrome.runtime.getURL("utils/interceptor.js");
    script.onload = () => script.remove();
    (document.head || document.documentElement).appendChild(script);
  } catch (e) {
    // Silently ignore (e.g. PDF viewer pages)
  }
})();

// ── 2. Listen for clipboard writes dispatched by the interceptor ─────────────
window.addEventListener("__chm_clipboard_write__", async (event) => {
  try {
    if (!chrome?.runtime?.id) return;

    const text = (event.detail?.text || "").trim();
    if (!text) return;

    await sendCopiedText(text);
  } catch (error) {
    handleRuntimeError(error, "clipboard interceptor");
  }
});

// ── 3. Capture standard Ctrl+C / right-click copy ───────────────────────────
document.addEventListener("copy", async () => {
  try {
    if (!chrome?.runtime?.id) return;

    const activeEl = document.activeElement;
    if (activeEl?.tagName === "INPUT" && activeEl.type === "password") return;

    const selectedText = window.getSelection()?.toString()?.trim();
    if (!selectedText) return;

    await sendCopiedText(selectedText);
  } catch (error) {
    handleRuntimeError(error, "copy event");
  }
});

// ── 4. Helper: send text to background ──────────────────────────────────────
async function sendCopiedText(text) {
  if (!text) return;

  await chrome.runtime.sendMessage({
    type: "COPY_TEXT",
    payload: {
      text,
      sourceUrl: window.location.href,
      sourceTitle: document.title
    }
  });
}

// ── 5. Receive commands from background (quick paste modal) ─────────────────
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === "OPEN_QUICK_PASTE_MODAL") {
    openQuickPasteModal();
  }
});

async function openQuickPasteModal() {
  try {
    if (!chrome?.runtime?.id) return;

    if (!quickPasteLoaded) {
      quickPasteModule = await import(
        chrome.runtime.getURL("modal/quickPasteModal.js")
      );
      quickPasteLoaded = true;
    }

    if (quickPasteModule?.openQuickPasteModal) {
      quickPasteModule.openQuickPasteModal();
    }
  } catch (error) {
    handleRuntimeError(error, "quick paste modal");
  }
}

// ── 6. Error handler ─────────────────────────────────────────────────────────
function handleRuntimeError(error, context) {
  const msg = error?.message || "";
  const isExpected =
    msg.includes("Extension context invalidated") ||
    msg.includes("Receiving end does not exist") ||
    msg.includes("Could not establish connection") ||
    msg.includes("The message port closed");

  if (!isExpected) {
    console.warn("[QuickCopy]", context, error);
  }
}
