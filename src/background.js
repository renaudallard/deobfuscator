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
      log("✓ Context menu created - right-click any Safe Link and select 'Deobfuscate Link'");
    } catch (error) {
      log(`✗ Failed to create context menu: ${error.message}`);
    }
  } else {
    log("✗ Menus API not available");
  }

  // Helper function to decode Proofpoint URL Defense v2 format
  const decodeProofpointV2 = (encodedUrl) => {
    try {
      // Proofpoint v2 format uses custom character substitution
      let decoded = encodedUrl
        .replace(/_/g, '/')
        .replace(/-/g, '%');

      // Try to decode as URI component
      decoded = decodeURIComponent(decoded);

      // Validate it's a URL
      if (/^https?:\/\//i.test(decoded)) {
        return decoded;
      }
      return null;
    } catch (_err) {
      return null;
    }
  };

  // Helper function to decode Proofpoint URL Defense v3 format
  const decodeProofpointV3 = (encodedUrl) => {
    try {
      // v3 uses different encoding, try direct decode
      const decoded = decodeURIComponent(encodedUrl);
      if (/^https?:\/\//i.test(decoded)) {
        return decoded;
      }
      return null;
    } catch (_err) {
      return null;
    }
  };

  // Helper to try common URL parameter names
  const tryCommonParams = (parsed, paramNames) => {
    for (const param of paramNames) {
      const value = parsed.searchParams.get(param);
      if (value) {
        try {
          const decoded = decodeURIComponent(value);
          if (/^https?:\/\//i.test(decoded)) {
            return decoded;
          }
        } catch (_err) {
          // Continue to next param
        }
      }
    }
    return null;
  };

  // Helper function to deobfuscate URL
  const deobfuscateUrl = (url) => {
    try {
      const parsed = new URL(url);
      const hostname = parsed.hostname.toLowerCase();
      const pathname = parsed.pathname;

      // Microsoft Safe Links
      if (hostname.includes("safelinks.protection.outlook.com")) {
        const payload = parsed.searchParams.get("url") || parsed.searchParams.get("u");
        if (payload) {
          return decodeURIComponent(payload);
        }
      }

      // Proofpoint URL Defense
      if (hostname.includes("urldefense.proofpoint.com") || hostname.includes("urldefense.com")) {
        // Try v2 format: /v2/url?u=<encoded>
        const v2Param = parsed.searchParams.get("u");
        if (v2Param) {
          const decoded = decodeProofpointV2(v2Param);
          if (decoded) return decoded;
        }

        // Try v3 format: /v3/__<encoded>__
        const pathMatch = pathname.match(/\/v3\/__(.+?)__/);
        if (pathMatch && pathMatch[1]) {
          const decoded = decodeProofpointV3(pathMatch[1]);
          if (decoded) return decoded;
        }

        // Fallback: try 'url' parameter
        const urlParam = parsed.searchParams.get("url");
        if (urlParam) {
          return decodeURIComponent(urlParam);
        }
      }

      // Mimecast URL Protect
      if (hostname.includes("protect") && hostname.includes("mimecast")) {
        const result = tryCommonParams(parsed, ["url", "u"]);
        if (result) return result;
      }

      // Barracuda Link Protection
      if (hostname.includes("barracuda") || hostname.includes("linkprotect.cudasvc.com")) {
        const result = tryCommonParams(parsed, ["url", "u", "a"]);
        if (result) return result;
      }

      // Cisco Secure Email / Security Proxy
      if (hostname.includes("cisco") || hostname.includes("iphmx.com") || hostname.includes("protected.res.cisco.com")) {
        const result = tryCommonParams(parsed, ["url", "u"]);
        if (result) return result;
      }

      // Check Point Harmony Email
      if (hostname.includes("checkpoint") || hostname.includes("urlsand.net")) {
        const result = tryCommonParams(parsed, ["url", "u", "dest"]);
        if (result) return result;
      }

      // Egress Defend
      if (hostname.includes("egress") || hostname.includes("egressdefend.com")) {
        const result = tryCommonParams(parsed, ["url", "u"]);
        if (result) return result;
      }

      // Symantec / Broadcom Messaging Gateway
      if (hostname.includes("symantec") || hostname.includes("messagelabs") || hostname.includes("broadcom")) {
        const result = tryCommonParams(parsed, ["url", "u", "continue"]);
        if (result) return result;
      }

      // Sophos Email Security
      if (hostname.includes("sophos") || hostname.includes("sandboxsafe.com")) {
        const result = tryCommonParams(parsed, ["url", "u"]);
        if (result) return result;
      }

      // Trend Micro
      if (hostname.includes("trendmicro") || hostname.includes("tmurl.net")) {
        const result = tryCommonParams(parsed, ["url", "u", "URL"]);
        if (result) return result;
      }

      // Trustwave MailMarshal
      if (hostname.includes("trustwave") || hostname.includes("mailmarshal")) {
        const result = tryCommonParams(parsed, ["url", "u"]);
        if (result) return result;
      }

      // PostOffice click-time protection
      if (hostname.includes("postoffice") || hostname.includes("po.mx")) {
        const result = tryCommonParams(parsed, ["url", "u"]);
        if (result) return result;
      }

      // Intermedia
      if (hostname.includes("intermedia") || hostname.includes("webscan.intermedia.net")) {
        const result = tryCommonParams(parsed, ["url", "u"]);
        if (result) return result;
      }

      // Hornetsecurity ATP
      if (hostname.includes("hornetsecurity") || hostname.includes("atpurl.com")) {
        const result = tryCommonParams(parsed, ["url", "u"]);
        if (result) return result;
      }

      // OpenText / EdgePilot
      if (hostname.includes("opentext") || hostname.includes("edgepilot") || hostname.includes("websense")) {
        const result = tryCommonParams(parsed, ["url", "u", "dest"]);
        if (result) return result;
      }

      // FireEye (legacy) / Trellix
      if (hostname.includes("fireeye") || hostname.includes("trellix") || hostname.includes("mandiant")) {
        const result = tryCommonParams(parsed, ["url", "u"]);
        if (result) return result;
      }

      // Generic protection services - try common patterns
      if (hostname.includes("urlprotect") || hostname.includes("linkprotect") ||
          hostname.includes("urldefense") || hostname.includes("safeurl") ||
          hostname.includes("securemail") || hostname.includes("maildefense")) {
        const result = tryCommonParams(parsed, ["url", "u", "dest", "destination", "target", "link"]);
        if (result) return result;
      }

      return null;
    } catch (_err) {
      return null;
    }
  };

  // Helper to identify the protection service
  const identifyService = (url) => {
    const lower = url.toLowerCase();
    if (lower.includes("safelinks.protection.outlook.com")) return "Microsoft Safe Links";
    if (lower.includes("urldefense.proofpoint.com") || lower.includes("urldefense.com")) return "Proofpoint URL Defense";
    if (lower.includes("mimecast")) return "Mimecast URL Protect";
    if (lower.includes("barracuda")) return "Barracuda Link Protection";
    if (lower.includes("cisco") || lower.includes("iphmx")) return "Cisco Secure Email";
    if (lower.includes("checkpoint") || lower.includes("urlsand")) return "Check Point Harmony";
    if (lower.includes("egress")) return "Egress Defend";
    if (lower.includes("symantec") || lower.includes("messagelabs") || lower.includes("broadcom")) return "Symantec/Broadcom";
    if (lower.includes("sophos")) return "Sophos Email Security";
    if (lower.includes("trendmicro") || lower.includes("tmurl")) return "Trend Micro";
    if (lower.includes("trustwave")) return "Trustwave MailMarshal";
    if (lower.includes("postoffice") || lower.includes("po.mx")) return "PostOffice";
    if (lower.includes("intermedia")) return "Intermedia";
    if (lower.includes("hornetsecurity") || lower.includes("atpurl")) return "Hornetsecurity ATP";
    if (lower.includes("opentext") || lower.includes("edgepilot") || lower.includes("websense")) return "OpenText/EdgePilot";
    if (lower.includes("fireeye") || lower.includes("trellix") || lower.includes("mandiant")) return "FireEye/Trellix";
    return "Unknown Protection Service";
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
          log(`Service detected: ${identifyService(linkUrl)}`);

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

  // Monitor displayed messages and scan for obfuscated links
  if (messengerApi && messengerApi.messageDisplay) {
    messengerApi.messageDisplay.onMessageDisplayed.addListener(async (tab, message) => {
      log(`Message displayed in tab ${tab.id}`);

      try {
        // Get the full message content
        const full = await messengerApi.messages.getFull(message.id);
        log(`Got message content for message ${message.id}`);

        // Scan message parts for obfuscated links
        let obfuscatedCount = 0;
        const scanPart = (part) => {
          if (part.body) {
            const bodyText = part.body;
            // Look for obfuscated link patterns in the body
            PROTECTION_DOMAINS.forEach(domain => {
              const regex = new RegExp(domain.replace(/\./g, '\\.'), 'gi');
              const matches = bodyText.match(regex);
              if (matches) {
                obfuscatedCount += matches.length;
              }
            });
          }
          if (part.parts) {
            part.parts.forEach(scanPart);
          }
        };

        scanPart(full);
        log(`Found ${obfuscatedCount} obfuscated links in message`);

        if (messengerApi.messageDisplayAction) {
          try {
            if (obfuscatedCount > 0) {
              // Show warning label
              await messengerApi.messageDisplayAction.setLabel({
                tabId: tab.id,
                label: `⚠️ Warning: ${obfuscatedCount} Obfuscated Link${obfuscatedCount > 1 ? 's' : ''} ⚠️`
              });
              await messengerApi.messageDisplayAction.setTitle({
                tabId: tab.id,
                title: `⚠️ ${obfuscatedCount} obfuscated link${obfuscatedCount > 1 ? 's' : ''} detected - right-click links to deobfuscate`
              });
              log(`✓ Set warning label for tab ${tab.id}`);
            } else {
              // Hide the button by setting empty label
              await messengerApi.messageDisplayAction.setLabel({
                tabId: tab.id,
                label: ""
              });
              await messengerApi.messageDisplayAction.setTitle({
                tabId: tab.id,
                title: "No obfuscated links"
              });
              log(`✓ Hidden warning label for tab ${tab.id} (no obfuscated links)`);
            }
          } catch (err) {
            log(`✗ Failed to set message display action: ${err.message}`);
          }
        }
      } catch (err) {
        log(`Error scanning message: ${err.message}`);
      }
    });
    log("✓ Message display listener registered");
  } else {
    log("messageDisplay API not available");
  }

  // Define protection domains for scanning
  const PROTECTION_DOMAINS = [
    'safelinks.protection.outlook.com',
    'urldefense.proofpoint.com',
    'urldefense.com',
    'mimecast',
    'barracuda',
    'linkprotect.cudasvc.com',
    'cisco',
    'iphmx.com',
    'checkpoint',
    'urlsand.net',
    'egress',
    'symantec',
    'messagelabs',
    'sophos',
    'trendmicro',
    'tmurl.net',
    'trustwave',
    'postoffice',
    'intermedia',
    'hornetsecurity',
    'opentext',
    'fireeye',
    'trellix'
  ];

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

    if (message.action === "showPopup") {
      log(`Received request to show popup for link`);
      const popupUrl = runtime.runtime.getURL("popup.html") +
        "?original=" + encodeURIComponent(message.original) +
        "&clean=" + encodeURIComponent(message.clean);

      runtime.windows.create({
        url: popupUrl,
        type: "popup",
        width: 650,
        height: 350
      }).then(() => {
        log("✓ Popup window opened from click");
        sendResponse({ success: true });
      }).catch((error) => {
        log(`✗ Failed to open popup: ${error.message}`);
        sendResponse({ success: false, error: error.message });
      });

      return true; // Keep the message channel open for sendResponse
    }
  });
  log("Message listener registered for opening URLs and popups");
})();
