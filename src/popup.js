const runtime = (typeof messenger !== "undefined" ? messenger : browser);

// Get URLs from query string
const params = new URLSearchParams(window.location.search);
const original = params.get('original');
const clean = params.get('clean');

// Display URLs
document.getElementById('original-url').textContent = original;
document.getElementById('clean-url').textContent = clean;

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
