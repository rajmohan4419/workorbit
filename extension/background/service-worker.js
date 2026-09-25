// OrbitBoard Chrome Extension — Background Service Worker (Manifest V3)
// Handles context menus, page actions, toasts, and background coordination

const BASE_URL = 'https://orbitboard.in';

// Helper: safe base64 decode (handles URL-safe base64 and UTF-8 strings)
function decodeBase64Utf8(str) {
  const cleanStr = str.replace(/-/g, '+').replace(/_/g, '/');
  const pad = cleanStr.length % 4;
  const paddedStr = pad ? cleanStr + '='.repeat(4 - pad) : cleanStr;
  const binary = atob(paddedStr);
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

// In-page toast notification injector (runs inside tab context via chrome.scripting)
function injectToastIntoPage(title, message, copyText) {
  // Remove existing toast if any
  const existing = document.getElementById('orbitboard-toast-container');
  if (existing) existing.remove();

  const container = document.createElement('div');
  container.id = 'orbitboard-toast-container';
  container.style.cssText = `
    position: fixed;
    bottom: 24px;
    right: 24px;
    z-index: 2147483647;
    max-width: 420px;
    background: #0F172A;
    color: #F8FAFC;
    border: 1px solid #334155;
    border-radius: 12px;
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5);
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    padding: 16px;
    font-size: 13px;
    line-height: 1.5;
    animation: orbitboardFadeIn 0.25s ease-out;
  `;

  // Add keyframe animation style
  const style = document.createElement('style');
  style.textContent = `
    @keyframes orbitboardFadeIn {
      from { opacity: 0; transform: translateY(12px) scale(0.96); }
      to { opacity: 1; transform: translateY(0) scale(1); }
    }
  `;
  container.appendChild(style);

  // Header row
  const header = document.createElement('div');
  header.style.cssText = 'display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;';

  const titleWrap = document.createElement('div');
  titleWrap.style.cssText = 'display: flex; align-items: center; gap: 8px;';

  const badge = document.createElement('span');
  badge.textContent = 'OrbitBoard';
  badge.style.cssText = `
    background: linear-gradient(135deg, #6366F1, #8B5CF6);
    color: #FFF;
    font-size: 10px;
    font-weight: 700;
    padding: 2px 6px;
    border-radius: 4px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  `;

  const titleEl = document.createElement('strong');
  titleEl.textContent = title;
  titleEl.style.cssText = 'font-size: 13px; font-weight: 600; color: #F1F5F9;';

  titleWrap.appendChild(badge);
  titleWrap.appendChild(titleEl);

  const closeBtn = document.createElement('button');
  closeBtn.innerHTML = '&times;';
  closeBtn.style.cssText = `
    background: transparent;
    border: none;
    color: #94A3B8;
    font-size: 18px;
    line-height: 1;
    cursor: pointer;
    padding: 0 4px;
  `;
  closeBtn.addEventListener('click', () => container.remove());

  header.appendChild(titleWrap);
  header.appendChild(closeBtn);
  container.appendChild(header);

  // Content body
  const body = document.createElement('div');
  body.style.cssText = `
    background: #1E293B;
    border-radius: 8px;
    padding: 10px 12px;
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    font-size: 12px;
    color: #CBD5E1;
    white-space: pre-wrap;
    word-break: break-all;
    max-height: 180px;
    overflow-y: auto;
    border: 1px solid #334155;
    margin-bottom: 10px;
  `;
  body.textContent = message;
  container.appendChild(body);

  // Footer with Copy & Dismiss buttons
  const footer = document.createElement('div');
  footer.style.cssText = 'display: flex; gap: 8px; justify-content: flex-end;';

  if (copyText) {
    const copyBtn = document.createElement('button');
    copyBtn.textContent = 'Copy to Clipboard';
    copyBtn.style.cssText = `
      background: #4F46E5;
      color: #FFF;
      border: none;
      border-radius: 6px;
      padding: 6px 12px;
      font-size: 12px;
      font-weight: 500;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 4px;
    `;
    copyBtn.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(copyText);
        copyBtn.textContent = 'Copied!';
        copyBtn.style.background = '#10B981';
        setTimeout(() => container.remove(), 1200);
      } catch (e) {
        copyBtn.textContent = 'Failed to copy';
      }
    });
    footer.appendChild(copyBtn);
  }

  const dismissBtn = document.createElement('button');
  dismissBtn.textContent = 'Dismiss';
  dismissBtn.style.cssText = `
    background: transparent;
    color: #94A3B8;
    border: 1px solid #475569;
    border-radius: 6px;
    padding: 6px 12px;
    font-size: 12px;
    cursor: pointer;
  `;
  dismissBtn.addEventListener('click', () => container.remove());
  footer.appendChild(dismissBtn);

  container.appendChild(footer);
  document.body.appendChild(container);

  // Auto dismiss after 7 seconds
  setTimeout(() => {
    if (container.parentElement) container.remove();
  }, 7000);
}

// Flash extension badge text and clear after 3 seconds
async function flashBadge(text, color = '#6366F1') {
  try {
    await chrome.action.setBadgeText({ text });
    await chrome.action.setBadgeBackgroundColor({ color });
    // Use alarm or temporary timeout
    setTimeout(async () => {
      try {
        await chrome.action.setBadgeText({ text: '' });
      } catch (_) {}
    }, 2800);
  } catch (err) {
    console.error('Badge flash error:', err);
  }
}

// Show feedback toast and copy text in tab
async function deliverResult(tabId, title, displayText, copyContent, badgeText = 'OK') {
  await flashBadge(badgeText);
  if (!tabId) return;

  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      func: injectToastIntoPage,
      args: [title, displayText, copyContent]
    });
  } catch (err) {
    // If scripting on restricted tab (e.g. chrome:// or webstore), fallback to notification
    console.warn('Toast injection skipped (protected page):', err.message);
    try {
      await chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon-128.png',
        title: `OrbitBoard: ${title}`,
        message: displayText.slice(0, 140)
      });
    } catch (_) {}
  }
}

// Setup context menus on installation
chrome.runtime.onInstalled.addListener(async () => {
  // Clear any existing menus to guarantee clean registration
  chrome.contextMenus.removeAll(async () => {
    // Parent Menu
    chrome.contextMenus.create({
      id: 'orbitboard-root',
      title: 'OrbitBoard Tools',
      contexts: ['selection', 'page']
    });

    // Submenu 1: Format JSON
    chrome.contextMenus.create({
      id: 'orbitboard-format-json',
      parentId: 'orbitboard-root',
      title: 'Format as JSON',
      contexts: ['selection']
    });

    // Submenu 2: Decode Base64
    chrome.contextMenus.create({
      id: 'orbitboard-decode-base64',
      parentId: 'orbitboard-root',
      title: 'Decode Base64',
      contexts: ['selection']
    });

    // Submenu 3: Decode JWT
    chrome.contextMenus.create({
      id: 'orbitboard-decode-jwt',
      parentId: 'orbitboard-root',
      title: 'Decode JWT Token',
      contexts: ['selection']
    });

    // Submenu 4: Convert Unix Timestamp
    chrome.contextMenus.create({
      id: 'orbitboard-convert-timestamp',
      parentId: 'orbitboard-root',
      title: 'Convert Unix Timestamp',
      contexts: ['selection']
    });

    // Submenu 5: Open in Diff Checker
    chrome.contextMenus.create({
      id: 'orbitboard-diff',
      parentId: 'orbitboard-root',
      title: 'Open in Text Diff Checker',
      contexts: ['selection']
    });

    // Submenu 6: Search on OrbitBoard
    chrome.contextMenus.create({
      id: 'orbitboard-search',
      parentId: 'orbitboard-root',
      title: 'Search "%s" on OrbitBoard',
      contexts: ['selection']
    });

    // Submenu 7: Open OrbitBoard Site
    chrome.contextMenus.create({
      id: 'orbitboard-open-site',
      parentId: 'orbitboard-root',
      title: 'Open OrbitBoard.in',
      contexts: ['page', 'selection']
    });
  });
});

// Handle Context Menu clicks
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  const selection = (info.selectionText || '').trim();
  const tabId = tab?.id;

  switch (info.menuItemId) {
    case 'orbitboard-format-json': {
      if (!selection) return;
      try {
        const parsed = JSON.parse(selection);
        const formatted = JSON.stringify(parsed, null, 2);
        await deliverResult(tabId, 'JSON Formatted', formatted, formatted, 'JSON');
      } catch (err) {
        await deliverResult(tabId, 'Invalid JSON', `Could not parse text as JSON:\n${err.message}`, null, 'ERR');
      }
      break;
    }

    case 'orbitboard-decode-base64': {
      if (!selection) return;
      try {
        const decoded = decodeBase64Utf8(selection);
        await deliverResult(tabId, 'Base64 Decoded', decoded, decoded, 'B64');
      } catch (err) {
        await deliverResult(tabId, 'Invalid Base64', `Could not decode Base64 string:\n${err.message}`, null, 'ERR');
      }
      break;
    }

    case 'orbitboard-decode-jwt': {
      if (!selection) return;
      try {
        const parts = selection.split('.');
        if (parts.length < 2) {
          throw new Error('JWT must contain at least 2 period-separated segments (header.payload).');
        }
        const header = JSON.parse(decodeBase64Utf8(parts[0]));
        const payload = JSON.parse(decodeBase64Utf8(parts[1]));

        let expInfo = '';
        if (payload.exp) {
          const expDate = new Date(payload.exp * 1000);
          const isExpired = Date.now() > payload.exp * 1000;
          expInfo = `\nExpires: ${expDate.toLocaleString()} (${isExpired ? 'EXPIRED' : 'ACTIVE'})`;
        }

        const summary = `Header:\n${JSON.stringify(header, null, 2)}\n\nPayload:${expInfo}\n${JSON.stringify(payload, null, 2)}`;
        await deliverResult(tabId, 'JWT Decoded', summary, JSON.stringify(payload, null, 2), 'JWT');
      } catch (err) {
        await deliverResult(tabId, 'Invalid JWT', `Could not decode token:\n${err.message}`, null, 'ERR');
      }
      break;
    }

    case 'orbitboard-convert-timestamp': {
      if (!selection) return;
      try {
        const cleaned = selection.replace(/[^0-9]/g, '');
        if (!cleaned) throw new Error('No numeric timestamp found in selection.');

        let ts = parseInt(cleaned, 10);
        // If 10 digits -> seconds, if 13 digits -> milliseconds
        const isMs = cleaned.length >= 13;
        const dateObj = new Date(isMs ? ts : ts * 1000);

        if (isNaN(dateObj.getTime())) throw new Error('Invalid date generated from timestamp.');

        const result = `Epoch: ${ts} (${isMs ? 'ms' : 'seconds'})\nUTC:   ${dateObj.toUTCString()}\nLocal: ${dateObj.toLocaleString()}`;
        await deliverResult(tabId, 'Timestamp Converted', result, dateObj.toISOString(), 'TIME');
      } catch (err) {
        await deliverResult(tabId, 'Invalid Timestamp', err.message, null, 'ERR');
      }
      break;
    }

    case 'orbitboard-diff': {
      await chrome.tabs.create({
        url: `${BASE_URL}/tools/diff-checker`
      });
      break;
    }

    case 'orbitboard-search': {
      const searchUrl = `${BASE_URL}/?q=${encodeURIComponent(selection)}`;
      await chrome.tabs.create({ url: searchUrl });
      break;
    }

    case 'orbitboard-open-site': {
      await chrome.tabs.create({ url: BASE_URL });
      break;
    }
  }
});

// Runtime message listener for UI commands (e.g., opening side panel)
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'openSidePanel') {
    (async () => {
      try {
        if (chrome.sidePanel?.open) {
          const windowId = message.windowId || sender.tab?.windowId;
          await chrome.sidePanel.open({ windowId });
          sendResponse({ success: true });
        } else {
          sendResponse({ success: false, error: 'Side panel API not supported on this browser version' });
        }
      } catch (err) {
        sendResponse({ success: false, error: err.message });
      }
    })();
    return true; // Keep message channel open for async response
  }

  if (message.action === 'openTab') {
    (async () => {
      try {
        await chrome.tabs.create({ url: message.url || BASE_URL });
        sendResponse({ success: true });
      } catch (err) {
        sendResponse({ success: false, error: err.message });
      }
    })();
    return true;
  }
});
