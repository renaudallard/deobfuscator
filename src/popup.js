const runtime = (typeof messenger !== "undefined" ? messenger : browser);

// Get parameters from query string
const params = new URLSearchParams(window.location.search);
const type = params.get('type');
const original = params.get('original');
const clean = params.get('clean');
const service = params.get('service');
const layers = params.get('layers') ? parseInt(params.get('layers'), 10) : 0;
const services = params.get('services');

// State management
let currentView = null;
let resolvedUrl = null;
let resolutionMethod = null;

// Show a specific view and hide all others
const showView = (viewId) => {
  const views = ['protection-view', 'shortener-view', 'resolving-view', 'resolved-view', 'error-view'];
  views.forEach(id => {
    document.getElementById(id).classList.add('hidden');
  });
  document.getElementById(viewId).classList.remove('hidden');
  currentView = viewId;
};

// Copy to clipboard functionality
const copyToClipboard = async (text, button) => {
  try {
    await navigator.clipboard.writeText(text);

    // Visual feedback
    const originalText = button.textContent;
    button.textContent = '✓ Copied!';
    button.classList.add('copied');

    setTimeout(() => {
      button.textContent = originalText;
      button.classList.remove('copied');
    }, 2000);
  } catch (err) {
    console.error('Failed to copy:', err);
    button.textContent = '✗ Failed';
    setTimeout(() => {
      button.textContent = '📋 Copy';
    }, 2000);
  }
};

// Open URL in browser
const openUrl = (url) => {
  runtime.runtime.sendMessage({ action: "openUrl", url: url });
  window.close();
};

// Initialize based on type
if (type === 'protection') {
  // Protection service - URL already deobfuscated
  initProtectionView();
} else if (type === 'shortener') {
  // URL shortener - needs resolution
  initShortenerView();
} else {
  // Unknown type - shouldn't happen
  console.error('Unknown type:', type);
  window.close();
}

// Initialize protection view (email security services)
function initProtectionView() {
  showView('protection-view');

  // Set service name and layer info
  document.getElementById('protection-service').textContent = service;
  if (layers > 1) {
    document.getElementById('protection-service-label').textContent =
      layers + ' layers of URL rewriting removed:';
  }

  // Display URLs
  document.getElementById('original-url-protection').textContent = original;
  document.getElementById('clean-url-protection').textContent = clean;

  // Copy buttons
  document.getElementById('copy-original-protection').addEventListener('click', (e) => {
    e.preventDefault();
    copyToClipboard(original, e.target);
  });

  document.getElementById('copy-clean-protection').addEventListener('click', (e) => {
    e.preventDefault();
    copyToClipboard(clean, e.target);
  });

  // Action buttons
  document.getElementById('cancel-protection').addEventListener('click', () => {
    window.close();
  });

  document.getElementById('open-original-protection').addEventListener('click', () => {
    openUrl(original);
  });

  document.getElementById('open-clean-protection').addEventListener('click', () => {
    openUrl(clean);
  });
}

// Initialize shortener view (URL shorteners)
function initShortenerView() {
  showView('shortener-view');

  // Set service name
  document.getElementById('shortener-service').textContent = service;

  // Show protection layers info if shortener was wrapped
  if (layers > 0 && services) {
    const layersInfo = document.getElementById('shortener-layers-info');
    layersInfo.textContent = layers + ' protection layer' +
      (layers > 1 ? 's' : '') + ' removed: ' + services;
    layersInfo.classList.remove('hidden');
  }

  // Display URL
  document.getElementById('original-url-shortener').textContent = original;

  // Copy button
  document.getElementById('copy-original-shortener').onclick = (e) => {
    e.preventDefault();
    copyToClipboard(original, e.target);
  };

  // Action buttons
  document.getElementById('cancel-shortener').onclick = () => {
    window.close();
  };

  document.getElementById('open-anyway').onclick = () => {
    openUrl(original);
  };

  // Resolve directly button
  document.getElementById('resolve-direct').onclick = () => {
    resolveShortener('direct');
  };
}

// Resolve shortener with given method
async function resolveShortener(method) {
  resolutionMethod = method;

  // Show resolving view
  showView('resolving-view');
  document.getElementById('original-url-resolving').textContent = original;

  // Copy button for resolving view
  document.getElementById('copy-original-resolving').onclick = (e) => {
    e.preventDefault();
    copyToClipboard(original, e.target);
  };

  // Cancel button
  document.getElementById('cancel-resolving').onclick = () => {
    window.close();
  };

  // Listen for progress updates
  const progressListener = (message) => {
    if (message.action === 'resolutionProgress') {
      document.getElementById('resolution-status').textContent = message.status;
    }
  };
  runtime.runtime.onMessage.addListener(progressListener);

  try {
    // Send resolution request to background script
    const response = await runtime.runtime.sendMessage({
      action: 'resolveShortener',
      url: original,
      method: method
    });

    // Remove progress listener
    runtime.runtime.onMessage.removeListener(progressListener);

    if (response.success) {
      // Resolution successful
      resolvedUrl = response.result.url;
      showResolvedView();
    } else {
      // Resolution failed
      showErrorView(response.error);
    }
  } catch (err) {
    // Remove progress listener
    runtime.runtime.onMessage.removeListener(progressListener);
    showErrorView(err.message);
  }
}

// Show resolved view
function showResolvedView() {
  showView('resolved-view');

  // Set service and method
  document.getElementById('resolved-service').textContent = service;
  document.getElementById('resolution-method').textContent =
    resolutionMethod === 'direct' ? 'Direct (Fast)' : 'Tor (Private)';

  // Display URLs
  document.getElementById('original-url-resolved').textContent = original;
  document.getElementById('clean-url-resolved').textContent = resolvedUrl;

  // Copy buttons
  document.getElementById('copy-original-resolved').onclick = (e) => {
    e.preventDefault();
    copyToClipboard(original, e.target);
  };

  document.getElementById('copy-clean-resolved').onclick = (e) => {
    e.preventDefault();
    copyToClipboard(resolvedUrl, e.target);
  };

  // Action buttons
  document.getElementById('cancel-resolved').onclick = () => {
    window.close();
  };

  document.getElementById('open-original-resolved').onclick = () => {
    openUrl(original);
  };

  document.getElementById('open-clean-resolved').onclick = () => {
    openUrl(resolvedUrl);
  };
}

// Show error view
function showErrorView(errorMessage) {
  showView('error-view');

  // Display error
  document.getElementById('original-url-error').textContent = original;
  document.getElementById('error-message').textContent = errorMessage;

  // Copy button
  document.getElementById('copy-original-error').onclick = (e) => {
    e.preventDefault();
    copyToClipboard(original, e.target);
  };

  // Action buttons
  document.getElementById('cancel-error').onclick = () => {
    window.close();
  };

  document.getElementById('retry-error').onclick = () => {
    // Go back to shortener view and retry
    initShortenerView();
  };

  document.getElementById('open-anyway-error').onclick = () => {
    openUrl(original);
  };
}
