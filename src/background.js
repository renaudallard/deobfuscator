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

  // URL Shortener domains
  const SHORTENER_DOMAINS = [
    // Popular services
    'bit.ly', 'bitly.com', 'tinyurl.com', 't.co', 'goo.gl',
    'ow.ly', 'is.gd', 'buff.ly', 'tiny.cc', 'short.link',
    // Social media shorteners
    'fb.me', 'lnkd.in', 'youtu.be', 'amzn.to', 'ebay.us',
    // Other common shorteners
    'adf.ly', 'bc.vc', 'budurl.com', 'clck.ru', 'db.tt',
    'filoops.info', 'linkbun.ch', 'ity.im', 'q.gs', 'qr.ae',
    'qr.net', 'rebrand.ly', 'smarturl.it', 'su.pr', 'trib.al',
    'u.to', 'v.gd', 'x.co', 'zip.net', 'zpr.io',
    // Privacy-focused / expiring link services
    'urlvanish.com'
  ];

  // Check if URL is a shortener
  const isShortener = (url) => {
    try {
      const hostname = new URL(url).hostname.toLowerCase();
      return SHORTENER_DOMAINS.some(domain =>
        hostname === domain || hostname.endsWith('.' + domain)
      );
    } catch (err) {
      return false;
    }
  };

  // Get shortener service name
  const getShortenerService = (url) => {
    try {
      const hostname = new URL(url).hostname.toLowerCase();
      for (const domain of SHORTENER_DOMAINS) {
        if (hostname === domain || hostname.endsWith('.' + domain)) {
          return domain;
        }
      }
      return 'Unknown Shortener';
    } catch (err) {
      return 'Unknown Shortener';
    }
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

      // Check if it's a shortener (after checking protection services)
      if (isShortener(url)) {
        return {
          type: 'shortener',
          service: getShortenerService(url)
        };
      }

      return null;
    } catch (_err) {
      return null;
    }
  };

  // Multi-layer deobfuscation: iteratively unwrap nested protection services
  const deobfuscateUrlFull = (url) => {
    const layers = [];
    let current = url;
    const MAX_DEPTH = 10;

    for (let i = 0; i < MAX_DEPTH; i++) {
      const result = deobfuscateUrl(current);

      if (result === null) {
        break;
      }

      if (typeof result === 'string') {
        layers.push(identifyService(current));

        if (result === current) {
          break;
        }
        current = result;
      } else if (result.type === 'shortener') {
        return {
          type: 'shortener',
          service: result.service,
          url: current,
          layers: layers
        };
      }
    }

    if (layers.length > 0) {
      return {
        type: 'protection',
        cleanUrl: current,
        layers: layers
      };
    }

    return null;
  };

  // Helper to identify the protection service
  const identifyService = (url) => {
    try {
      const h = new URL(url).hostname.toLowerCase();
      if (h.includes("safelinks.protection.outlook.com")) return "Microsoft Safe Links";
      if (h.includes("urldefense.proofpoint.com") || h.includes("urldefense.com")) return "Proofpoint URL Defense";
      if (h.includes("mimecast")) return "Mimecast URL Protect";
      if (h.includes("barracuda") || h.includes("cudasvc.com")) return "Barracuda Link Protection";
      if (h.includes("cisco") || h.includes("iphmx")) return "Cisco Secure Email";
      if (h.includes("checkpoint") || h.includes("urlsand")) return "Check Point Harmony";
      if (h.includes("egress")) return "Egress Defend";
      if (h.includes("symantec") || h.includes("messagelabs") || h.includes("broadcom")) return "Symantec/Broadcom";
      if (h.includes("sophos") || h.includes("sandboxsafe.com")) return "Sophos Email Security";
      if (h.includes("trendmicro") || h.includes("tmurl")) return "Trend Micro";
      if (h.includes("trustwave") || h.includes("mailmarshal")) return "Trustwave MailMarshal";
      if (h.includes("postoffice") || h.includes("po.mx")) return "PostOffice";
      if (h.includes("intermedia")) return "Intermedia";
      if (h.includes("hornetsecurity") || h.includes("atpurl")) return "Hornetsecurity ATP";
      if (h.includes("opentext") || h.includes("edgepilot") || h.includes("websense")) return "OpenText/EdgePilot";
      if (h.includes("fireeye") || h.includes("trellix") || h.includes("mandiant")) return "FireEye/Trellix";
      return "Unknown Protection Service";
    } catch (_err) {
      return "Unknown Protection Service";
    }
  };

  // Handle context menu clicks
  if (menusApi && menusApi.onClicked) {
    menusApi.onClicked.addListener(async (info, tab) => {
      if (info.menuItemId === "deobfuscate-link") {
        const linkUrl = info.linkUrl;
        log(`Context menu clicked on: ${linkUrl}`);

        const result = deobfuscateUrlFull(linkUrl);
        if (result) {
          if (result.type === 'protection') {
            log(`Deobfuscated: ${result.cleanUrl} (${result.layers.length} layer(s))`);

            const popupUrl = runtime.runtime.getURL("popup.html") +
              "?type=protection" +
              "&original=" + encodeURIComponent(linkUrl) +
              "&clean=" + encodeURIComponent(result.cleanUrl) +
              "&service=" + encodeURIComponent(result.layers.join(" \u2192 ")) +
              "&layers=" + result.layers.length;

            try {
              await runtime.windows.create({
                url: popupUrl,
                type: "popup",
                width: 800,
                height: 600
              });
              log("✓ Popup window opened");
            } catch (error) {
              log(`✗ Failed to open popup: ${error.message}, opening directly`);
              if (runtime.windows && runtime.windows.openDefaultBrowser) {
                runtime.windows.openDefaultBrowser(result.cleanUrl);
                log(`✓ Opened clean URL in browser`);
              }
            }
          } else if (result.type === 'shortener') {
            log(`Shortener detected: ${result.service}`);
            if (result.layers.length > 0) {
              log(`Unwrapped ${result.layers.length} protection layer(s): ${result.layers.join(" \u2192 ")}`);
            }

            const popupUrl = runtime.runtime.getURL("popup.html") +
              "?type=shortener" +
              "&original=" + encodeURIComponent(result.url) +
              "&service=" + encodeURIComponent(result.service) +
              (result.layers.length > 0
                ? "&layers=" + result.layers.length +
                  "&services=" + encodeURIComponent(result.layers.join(" \u2192 "))
                : "");

            try {
              await runtime.windows.create({
                url: popupUrl,
                type: "popup",
                width: 800,
                height: 600
              });
              log("✓ Popup window opened for shortener");
            } catch (error) {
              log(`✗ Failed to open popup: ${error.message}`);
            }
          }
        } else {
          log(`Not a protected link or shortener`);
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

        // Scan message parts for obfuscated links (protection services + shorteners)
        const seenUrls = new Set();
        let obfuscatedCount = 0;
        const scanPart = (part) => {
          if (part.body) {
            const urlRegex = /https?:\/\/[^\s"'<>]+/gi;
            const matches = part.body.match(urlRegex) || [];
            for (const rawUrl of matches) {
              // Normalize HTML entities and trim trailing punctuation
              const url = rawUrl.replace(/&amp;/g, '&').replace(/[.,;:!?)]+$/, '');
              if (seenUrls.has(url)) continue;
              seenUrls.add(url);

              if (deobfuscateUrlFull(url)) {
                obfuscatedCount++;
              }
            }
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

  // Direct resolution function
  const resolveDirect = async (url, progressCallback) => {
    try {
      log(`Resolving shortener directly: ${url}`);
      progressCallback?.({ status: 'Sending HEAD request...' });

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000);

      // Try HEAD request first (minimal data transfer, privacy-friendly)
      let response = await fetch(url, {
        method: 'HEAD',
        redirect: 'follow',  // Let browser follow redirects
        cache: 'no-store',
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Thunderbird Deobfuscator)'
        }
      });

      clearTimeout(timeout);

      // The response.url property contains the final URL after redirects
      const finalUrl = response.url;

      log(`HEAD response status: ${response.status}`);
      log(`Original URL: ${url}`);
      log(`Final URL after HEAD: ${finalUrl}`);

      // Check if URL changed (indicating a redirect happened)
      if (finalUrl && finalUrl !== url) {
        log(`✓ Resolved to: ${finalUrl}`);
        progressCallback?.({ status: 'Resolution complete!' });
        return {
          success: true,
          url: finalUrl,
          method: 'direct'
        };
      }

      // If HEAD didn't work, try GET as fallback
      log(`HEAD didn't redirect, trying GET request`);
      progressCallback?.({ status: 'Trying GET request...' });

      const getTimeout = setTimeout(() => controller.abort(), 30000);
      response = await fetch(url, {
        method: 'GET',
        redirect: 'follow',
        cache: 'no-store',
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Thunderbird Deobfuscator)'
        }
      });
      clearTimeout(getTimeout);

      const finalUrlGet = response.url;
      log(`GET response status: ${response.status}`);
      log(`Final URL after GET: ${finalUrlGet}`);

      // Check if URL changed with GET
      if (finalUrlGet && finalUrlGet !== url) {
        log(`✓ Resolved to: ${finalUrlGet}`);
        progressCallback?.({ status: 'Resolution complete!' });
        return {
          success: true,
          url: finalUrlGet,
          method: 'direct'
        };
      }

      // If still no redirect, try to parse HTML for meta refresh or JavaScript redirect
      if (response.status === 200) {
        log(`No HTTP redirect, parsing HTML for meta refresh or JS redirect`);
        const text = await response.text();

        // Check for meta refresh (handles both attribute orderings)
        const metaRefreshMatch = text.match(/<meta[^>]*http-equiv=["']refresh["'][^>]*content=["'][^;]*;\s*url=([^"']+)["']/i)
          || text.match(/<meta[^>]*content=["'][^;]*;\s*url=([^"']+)["'][^>]*http-equiv=["']refresh["']/i);
        if (metaRefreshMatch && metaRefreshMatch[1]) {
          const metaUrl = new URL(metaRefreshMatch[1], url).href;
          log(`✓ Found meta refresh: ${metaUrl}`);
          progressCallback?.({ status: 'Resolution complete!' });
          return {
            success: true,
            url: metaUrl,
            method: 'direct'
          };
        }

        // Check for window.location redirect
        const jsRedirectMatch = text.match(/window\.location(?:\s*=\s*|\.href\s*=\s*|\.replace\s*\(\s*)["']([^"']+)["']/i);
        if (jsRedirectMatch && jsRedirectMatch[1]) {
          const jsUrl = new URL(jsRedirectMatch[1], url).href;
          log(`✓ Found JavaScript redirect: ${jsUrl}`);
          progressCallback?.({ status: 'Resolution complete!' });
          return {
            success: true,
            url: jsUrl,
            method: 'direct'
          };
        }

        throw new Error('Shortener requires JavaScript or interactive elements to resolve. Try opening in browser.');
      }

      throw new Error(`Unexpected response status: ${response.status}`);
    } catch (err) {
      log(`✗ Resolution failed: ${err.message}`);
      if (err.name === 'AbortError') {
        throw new Error('Request timed out after 30 seconds');
      }
      throw err;
    }
  };

  // Listen for messages from message display scripts
  runtime.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "resolveShortener") {
      log(`Received request to resolve shortener: ${message.url}`);
      const { url, method } = message;

      (async () => {
        try {
          let result;
          if (method === 'direct') {
            result = await resolveDirect(url, (progress) => {
              // Send progress updates to popup
              runtime.runtime.sendMessage({
                action: 'resolutionProgress',
                ...progress
              }).catch(() => {});
            });
          } else {
            throw new Error('Unknown resolution method: ' + method);
          }

          // If resolved URL is itself a protection service URL, unwrap it
          const unwrapped = deobfuscateUrlFull(result.url);
          if (unwrapped && unwrapped.type === 'protection') {
            log(`Resolved shortener led to protection URL, unwrapped ${unwrapped.layers.length} layer(s)`);
            result.url = unwrapped.cleanUrl;
            result.unwrappedLayers = unwrapped.layers;
          }

          sendResponse({ success: true, result });
        } catch (err) {
          sendResponse({ success: false, error: err.message });
        }
      })();

      return true; // Keep channel open for async response
    }

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
