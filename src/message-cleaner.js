(() => {
  "use strict";

  const LOG_PREFIX = "[Deobfuscator]";

  const SAFE_LINK_HOST = "safelinks.protection.outlook.com";
  const CACHE_ATTR = "safelinksOriginal";

  const log = (msg, extra) => {
    try {
      if (extra !== undefined) {
        console.log(`${LOG_PREFIX} ${msg}`, extra);
      } else {
        console.log(`${LOG_PREFIX} ${msg}`);
      }
    } catch (_err) {
      // Ignore logging failures in locked-down contexts.
    }
  };

  const isSafeLinkHost = (hostname) => {
    if (!hostname) {
      return false;
    }
    const normalized = hostname.toLowerCase();
    return (
      normalized === SAFE_LINK_HOST ||
      normalized.endsWith(`.${SAFE_LINK_HOST}`)
    );
  };

  const safeDecodeURIComponent = (value) => {
    try {
      return decodeURIComponent(value.replace(/\+/g, " "));
    } catch (_err) {
      return value;
    }
  };

  const looksLikeBase64 = (value) => {
    if (!value || typeof value !== "string") {
      return false;
    }
    const trimmed = value.trim();
    // Avoid decoding obvious URLs or mailto links as base64 to reduce false positives.
    if (/^(https?:|mailto:)/i.test(trimmed)) {
      return false;
    }
    return (
      trimmed.length >= 12 &&
      trimmed.length % 4 !== 1 &&
      /^[A-Za-z0-9+/=_-]+$/.test(trimmed)
    );
  };

  const maybeDecodeBase64 = (value) => {
    if (!looksLikeBase64(value)) {
      return null;
    }
    const normalized = value.replace(/[-_]/g, (char) =>
      char === "-" ? "+" : "/"
    );
    const padding = normalized.length % 4;
    const padded =
      padding === 2
        ? `${normalized}==`
        : padding === 3
        ? `${normalized}=`
        : normalized;
    try {
      return atob(padded);
    } catch (_err) {
      return null;
    }
  };

  const isHttpish = (value) => /^(https?:|mailto:)/i.test(value);

  const decodePayload = (raw) => {
    if (!raw) {
      return null;
    }
    const candidates = [
      raw,
      safeDecodeURIComponent(raw),
      maybeDecodeBase64(raw),
    ].filter(Boolean);
    for (const candidate of candidates) {
      const trimmed = candidate.trim();
      if (isHttpish(trimmed)) {
        return trimmed;
      }
    }
    return null;
  };

  const extractOriginalUrl = (rawHref) => {
    if (!rawHref || typeof rawHref !== "string") {
      return null;
    }
    const queue = [rawHref];
    const seen = new Set();

    while (queue.length) {
      const current = queue.shift();
      if (!current || seen.has(current)) {
        continue;
      }
      seen.add(current);

      const decodedUri = safeDecodeURIComponent(current);
      if (decodedUri && decodedUri !== current && !seen.has(decodedUri)) {
        queue.push(decodedUri);
      }
      const decodedB64 = maybeDecodeBase64(current);
      if (decodedB64 && !seen.has(decodedB64)) {
        queue.push(decodedB64);
      }

      let parsed;
      try {
        parsed = new URL(current);
      } catch (_err) {
        continue;
      }

      if (!isSafeLinkHost(parsed.hostname)) {
        continue;
      }

      const payload =
        parsed.searchParams.get("url") || parsed.searchParams.get("u");
      const original = decodePayload(payload);
      if (original) {
        return original;
      }

      // If the payload itself is another wrapped link, process it.
      if (payload && !seen.has(payload)) {
        queue.push(payload);
      }
    }

    return null;
  };

  const resolveOriginal = (element) => {
    if (!element || !element.getAttribute) {
      return null;
    }
    const originalHref = element.getAttribute("href");
    if (!originalHref || typeof originalHref !== "string") {
      return null;
    }

    if (element.dataset && element.dataset[CACHE_ATTR]) {
      return element.dataset[CACHE_ATTR];
    }

    const restored = extractOriginalUrl(originalHref);
    if (restored && restored !== originalHref) {
      if (element.dataset) {
        element.dataset[CACHE_ATTR] = restored;
      }
      return restored;
    }
    return null;
  };

  const openUrl = (url) => {
    // Try to use Thunderbird's API to open in default browser
    try {
      if (typeof messenger !== "undefined" && messenger.windows && messenger.windows.openDefaultBrowser) {
        log(`Opening URL in default browser via messenger API: ${url}`);
        messenger.windows.openDefaultBrowser(url);
        return true;
      }
    } catch (err) {
      log(`Failed to use messenger.windows.openDefaultBrowser: ${err.message}`);
    }

    // Fallback: try browser API
    try {
      if (typeof browser !== "undefined" && browser.windows && browser.windows.openDefaultBrowser) {
        log(`Opening URL in default browser via browser API: ${url}`);
        browser.windows.openDefaultBrowser(url);
        return true;
      }
    } catch (err) {
      log(`Failed to use browser.windows.openDefaultBrowser: ${err.message}`);
    }

    // Last resort: send message to background script
    try {
      log(`Sending message to background script to open URL: ${url}`);
      const runtime = (typeof messenger !== "undefined" ? messenger : browser);
      if (runtime && runtime.runtime && runtime.runtime.sendMessage) {
        runtime.runtime.sendMessage({ action: "openUrl", url: url });
        return true;
      }
    } catch (err) {
      log(`Failed to send message to background: ${err.message}`);
    }

    log(`All methods failed, URL not opened: ${url}`);
    return false;
  };

  const showCustomDialog = (original, clean) => {
    return new Promise((resolve) => {
      // Create overlay
      const overlay = document.createElement("div");
      overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.7);
        z-index: 999999;
        display: flex;
        align-items: center;
        justify-content: center;
        font-family: system-ui, -apple-system, sans-serif;
      `;

      // Create dialog
      const dialog = document.createElement("div");
      dialog.style.cssText = `
        background: white;
        padding: 24px;
        border-radius: 8px;
        max-width: 600px;
        width: 90%;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
        color: #333;
      `;

      dialog.innerHTML = `
        <h2 style="margin: 0 0 16px 0; font-size: 18px; color: #d9534f;">
          🔗 Deobfuscate Link?
        </h2>
        <div style="margin-bottom: 16px;">
          <strong>Original link:</strong>
          <div style="background: #f5f5f5; padding: 8px; margin-top: 4px; border-radius: 4px; word-break: break-all; font-size: 12px; max-height: 100px; overflow-y: auto;">
            ${original}
          </div>
        </div>
        <div style="margin-bottom: 24px;">
          <strong style="color: #5cb85c;">Destination:</strong>
          <div style="background: #e8f5e9; padding: 8px; margin-top: 4px; border-radius: 4px; word-break: break-all; font-size: 12px; max-height: 100px; overflow-y: auto;">
            ${clean}
          </div>
        </div>
        <div style="display: flex; gap: 12px; justify-content: space-between;">
          <button id="deobf-cancel" style="padding: 10px 20px; background: #6c757d; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 14px;">
            Cancel
          </button>
          <div style="display: flex; gap: 12px;">
            <button id="deobf-open-wrapped" style="padding: 10px 20px; background: #d9534f; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 14px;">
              Open Original Link
            </button>
            <button id="deobf-open" style="padding: 10px 20px; background: #5cb85c; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 14px; font-weight: bold;">
              Open Clean Link
            </button>
          </div>
        </div>
      `;

      overlay.appendChild(dialog);
      document.body.appendChild(overlay);

      const cleanup = () => {
        document.body.removeChild(overlay);
      };

      dialog.querySelector("#deobf-open").addEventListener("click", () => {
        cleanup();
        resolve({ action: "open-clean" });
      });

      dialog.querySelector("#deobf-open-wrapped").addEventListener("click", () => {
        cleanup();
        resolve({ action: "open-wrapped" });
      });

      dialog.querySelector("#deobf-cancel").addEventListener("click", () => {
        cleanup();
        resolve({ action: "cancel" });
      });

      overlay.addEventListener("click", (e) => {
        if (e.target === overlay) {
          cleanup();
          resolve({ action: "cancel" });
        }
      });
    });
  };

  const onClick = async (event) => {
    log("Click event detected!", { target: event.target });

    const target =
      event.target && event.target.closest
        ? event.target.closest("a[href], area[href]")
        : null;

    if (!target) {
      log("No link target found");
      return;
    }

    const href = target.getAttribute("href");
    log(`Link clicked: ${href}`);

    const clean = resolveOriginal(target);
    if (!clean) {
      log(`Link is not obfuscated or couldn't be decoded: ${href}`);
      return;
    }

    log(`Found obfuscated link! Original: ${href}, Clean: ${clean}`);

    // Prevent navigation FIRST
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    const original = target.getAttribute("href") || "";

    try {
      log("Showing custom dialog...");
      const result = await showCustomDialog(original, clean);
      log(`Custom dialog result: ${result.action}`);

      if (result.action === "cancel") {
        log("User cancelled");
        return;
      }

      if (result.action === "open-clean") {
        log("Opening clean URL");
        const ok = openUrl(clean);
        log(`Opened clean link`, { success: ok, clean });
      } else if (result.action === "open-wrapped") {
        log("Opening wrapped URL");
        const ok = openUrl(original);
        log(`Opened wrapped link`, { success: ok, original });
      }
    } catch (error) {
      log(`Error showing dialog: ${error.message}`);
    }
  };

  try {
    document.addEventListener("click", onClick, true);
    log(`✓ Click interceptor attached successfully`);
  } catch (error) {
    console.error(`${LOG_PREFIX} ✗ Failed to attach click interceptor:`, error);
  }
})();
