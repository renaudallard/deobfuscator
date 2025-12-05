const runtime = (typeof messenger !== "undefined" ? messenger : browser);

// Get URLs from query string
const params = new URLSearchParams(window.location.search);
const original = params.get('original');
const clean = params.get('clean');

// Display URLs
document.getElementById('original-url').textContent = original;
document.getElementById('clean-url').textContent = clean;

// Copy button functionality
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

document.getElementById('copy-original').addEventListener('click', (e) => {
  e.preventDefault();
  copyToClipboard(original, e.target);
});

document.getElementById('copy-clean').addEventListener('click', (e) => {
  e.preventDefault();
  copyToClipboard(clean, e.target);
});

// Handle button clicks
document.getElementById('cancel').addEventListener('click', () => {
  window.close();
});

document.getElementById('open-original').addEventListener('click', () => {
  runtime.runtime.sendMessage({ action: "openUrl", url: original });
  window.close();
});

document.getElementById('open-clean').addEventListener('click', () => {
  runtime.runtime.sendMessage({ action: "openUrl", url: clean });
  window.close();
});
