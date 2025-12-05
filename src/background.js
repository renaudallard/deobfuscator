const LOG_PREFIX = "[Deobfuscator]";

const browserApi = typeof browser !== "undefined" ? browser : null;
const messengerApi = typeof messenger !== "undefined" ? messenger : null;
// Prefer messenger when available (Thunderbird exposes messageDisplayScripts there).
const runtime = messengerApi || browserApi;

const log = (msg, extra) => {
  try {
    if (extra !== undefined) {
      console.log(`${LOG_PREFIX} ${msg}`, extra);
    } else {
      console.log(`${LOG_PREFIX} ${msg}`);
    }
  } catch (_err) {
    // Ignore logging issues.
  }
};

(async () => {
  log("Extension starting...");
  log(`browserApi available: ${!!browserApi}`);
  log(`messengerApi available: ${!!messengerApi}`);

  if (!runtime) {
    log("browser/messenger API surface not available.");
    return;
  }

  // Network-level auto-redirect is disabled to allow the click interceptor
  // to show a confirmation dialog instead.
  log("Auto-redirect disabled; using click interceptor for user confirmation");

  // Create context menu for links
  const menusApi = runtime.menus || runtime.contextMenus;
  if (menusApi) {
    try {
      menusApi.create({
        id: "deobfuscate-link",
        title: "Deobfuscate Link",
        contexts: ["link"]
      });
      log("✓ Context menu created");
    } catch (error) {
      log(`✗ Failed to create context menu: ${error.message}`);
    }
  } else {
    log("✗ Menus API not available");
  }

  // Helper function to deobfuscate URL
  const deobfuscateUrl = (url) => {
    try {
      const parsed = new URL(url);
      if (!parsed.hostname || !parsed.hostname.toLowerCase().includes("safelinks.protection.outlook.com")) {
        return null;
      }
      const payload = parsed.searchParams.get("url") || parsed.searchParams.get("u");
      if (!payload) return null;
      return decodeURIComponent(payload);
    } catch (_err) {
      return null;
    }
  };

  // Store pending URL for confirmation
  let pendingUrl = null;

  // Handle context menu clicks
  if (menusApi && menusApi.onClicked) {
    menusApi.onClicked.addListener(async (info, tab) => {
      if (info.menuItemId === "deobfuscate-link") {
        const linkUrl = info.linkUrl;
        log(`Context menu clicked on: ${linkUrl}`);

        const clean = deobfuscateUrl(linkUrl);
        if (clean) {
          log(`Deobfuscated: ${clean}`);

          // Open popup window with URLs
          const popupUrl = runtime.runtime.getURL("popup.html") +
            "?original=" + encodeURIComponent(linkUrl) +
            "&clean=" + encodeURIComponent(clean);

          try {
            await runtime.windows.create({
              url: popupUrl,
              type: "popup",
              width: 650,
              height: 350
            });
            log("✓ Popup window opened");
          } catch (error) {
            log(`✗ Failed to open popup: ${error.message}, opening directly`);
            if (runtime.windows && runtime.windows.openDefaultBrowser) {
              runtime.windows.openDefaultBrowser(clean);
              log(`✓ Opened clean URL in browser`);
            }
          }
        } else {
          log(`Not a Safe Link or couldn't deobfuscate`);
        }
      }
    });
    log("✓ Context menu handler registered");
  }

  // Listen for messages from message display scripts
  runtime.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "openUrl" && message.url) {
      log(`Received request to open URL: ${message.url}`);
      try {
        if (runtime.windows && runtime.windows.openDefaultBrowser) {
          runtime.windows.openDefaultBrowser(message.url);
          log(`✓ Opened URL in default browser: ${message.url}`);
          sendResponse({ success: true });
        } else {
          log(`✗ windows.openDefaultBrowser not available`);
          sendResponse({ success: false, error: "API not available" });
        }
      } catch (error) {
        log(`✗ Failed to open URL: ${error.message}`);
        sendResponse({ success: false, error: error.message });
      }
      return true; // Keep the message channel open for sendResponse
    }
  });
  log("Message listener registered for opening URLs");
})();
