// Message scanner to detect obfuscated links and show warning banner
const LOG_PREFIX = "[Deobfuscator Scanner]";

const log = (msg) => {
  try {
    console.log(`${LOG_PREFIX} ${msg}`);
  } catch (_err) {
    // Ignore
  }
};

// List of known protection service domains
const PROTECTION_DOMAINS = [
  'safelinks.protection.outlook.com',
  'urldefense.proofpoint.com',
  'urldefense.com',
  'mimecast',
  'barracuda',
  'linkprotect.cudasvc.com',
  'cisco',
  'iphmx.com',
  'protected.res.cisco.com',
  'checkpoint',
  'urlsand.net',
  'egress',
  'egressdefend.com',
  'symantec',
  'messagelabs',
  'broadcom',
  'sophos',
  'sandboxsafe.com',
  'trendmicro',
  'tmurl.net',
  'trustwave',
  'mailmarshal',
  'postoffice',
  'po.mx',
  'intermedia',
  'webscan.intermedia.net',
  'hornetsecurity',
  'atpurl.com',
  'opentext',
  'edgepilot',
  'websense',
  'fireeye',
  'trellix',
  'mandiant',
  'urlprotect',
  'linkprotect',
  'urldefense',
  'safeurl',
  'securemail',
  'maildefense'
];

// Check if URL is from a protection service
const isProtectedLink = (url) => {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    return PROTECTION_DOMAINS.some(domain => hostname.includes(domain));
  } catch (_err) {
    return false;
  }
};

// Scan message for obfuscated links
const scanMessage = () => {
  const links = document.querySelectorAll('a[href]');
  let obfuscatedCount = 0;

  for (const link of links) {
    if (isProtectedLink(link.href)) {
      obfuscatedCount++;
    }
  }

  log(`Scanned ${links.length} links, found ${obfuscatedCount} obfuscated`);
  return obfuscatedCount;
};

// Create and inject warning banner
const createWarningBanner = (count) => {
  // Remove existing banner if present
  const existing = document.getElementById('deobfuscator-warning');
  if (existing) {
    existing.remove();
  }

  const banner = document.createElement('div');
  banner.id = 'deobfuscator-warning';
  banner.style.cssText = `
    background: #d9534f;
    color: white;
    padding: 10px 15px;
    margin: 10px 0;
    border-radius: 4px;
    font-family: system-ui, -apple-system, sans-serif;
    font-size: 14px;
    font-weight: bold;
    display: flex;
    align-items: center;
    gap: 10px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
  `;

  const icon = document.createElement('span');
  icon.textContent = '⚠️';
  icon.style.fontSize = '18px';

  const text = document.createElement('span');
  text.textContent = `${count} obfuscated link${count > 1 ? 's' : ''} detected in this message. Right-click any link and select "Deobfuscate Link" to see the real destination.`;

  banner.appendChild(icon);
  banner.appendChild(text);

  return banner;
};

// Insert banner into message
const insertBanner = (banner) => {
  // Try to find the message body or header area
  const messageBody = document.body;

  if (messageBody && messageBody.firstChild) {
    messageBody.insertBefore(banner, messageBody.firstChild);
    log('Warning banner inserted');
  } else {
    log('Could not find suitable location for banner');
  }
};

// Main execution
const init = () => {
  log('Message scanner initializing in document: ' + document.location.href);

  const processMessage = () => {
    log('Processing message...');
    const count = scanMessage();
    log('Scan complete, count: ' + count);

    if (count > 0) {
      log('Creating warning banner...');
      const banner = createWarningBanner(count);
      insertBanner(banner);
      log('Banner inserted');
    } else {
      log('No obfuscated links found');
    }
  };

  // Wait for message to load
  if (document.readyState === 'loading') {
    log('Document still loading, waiting for DOMContentLoaded...');
    document.addEventListener('DOMContentLoaded', () => {
      log('DOMContentLoaded fired');
      setTimeout(processMessage, 100);
    });
  } else {
    // Document already loaded
    log('Document already loaded, processing immediately');
    setTimeout(processMessage, 100);
  }
};

log('Script loaded, calling init()');
init();
