// utils/interceptor.js
// Injected into the PAGE context (not extension context) to intercept clipboard writes.
// This catches navigator.clipboard.writeText() calls made by AI sites like
// ChatGPT, Gemini, Claude, Perplexity, You.com, Copilot, Grok, etc.
// Using a src-based injection so it works even on sites with strict CSP.

(function () {
  if (window.__chm_interceptor_installed__) return;
  window.__chm_interceptor_installed__ = true;

  // --- Intercept navigator.clipboard.writeText ---
  if (navigator.clipboard && navigator.clipboard.writeText) {
    const originalWriteText = navigator.clipboard.writeText.bind(navigator.clipboard);
    navigator.clipboard.writeText = function (text) {
      window.dispatchEvent(
        new CustomEvent("__chm_clipboard_write__", {
          detail: { text: text || "", method: "clipboard.writeText" }
        })
      );
      return originalWriteText(text);
    };
  }

  // --- Intercept document.execCommand('copy') ---
  // execCommand triggers the native copy event, but we intercept here too
  // so the content script can correlate it if needed.
  const originalExecCommand = document.execCommand.bind(document);
  document.execCommand = function (command, ...args) {
    if (command === "copy") {
      const selection = window.getSelection();
      const selectedText = selection ? selection.toString() : "";
      if (selectedText) {
        window.dispatchEvent(
          new CustomEvent("__chm_clipboard_write__", {
            detail: { text: selectedText, method: "execCommand" }
          })
        );
      }
    }
    return originalExecCommand(command, ...args);
  };
})();
