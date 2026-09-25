// OrbitBoard Side Panel Extension Controller
// Complements popup.js with side panel specific behavior

document.addEventListener('DOMContentLoaded', () => {
  // If the popup.js script has loaded, the main UI functionality is active.
  // Add any side panel specific shortcuts or telemetry here if needed.
  const appTagline = document.querySelector('.app-tagline');
  if (appTagline) {
    appTagline.textContent = 'Side Panel Dock';
  }
});
