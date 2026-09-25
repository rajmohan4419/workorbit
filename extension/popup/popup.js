// OrbitBoard Extension — Popup Controller
// Manages search, favorites, recents, navigation and instant offline utilities

const BASE_URL = 'https://orbitboard.in';

document.addEventListener('DOMContentLoaded', async () => {
  // State
  let favorites = new Set();
  let recents = [];
  let currentCategory = 'All';
  let searchTerm = '';

  // DOM Elements
  const tabBtnDirectory = document.getElementById('tab-btn-directory');
  const tabBtnOffline = document.getElementById('tab-btn-offline');
  const panelDirectory = document.getElementById('panel-directory');
  const panelOffline = document.getElementById('panel-offline');

  const btnOpenSidepanel = document.getElementById('btn-open-sidepanel');
  const btnOpenWebsite = document.getElementById('btn-open-website');

  const searchInput = document.getElementById('tool-search-input');
  const clearBtn = document.getElementById('search-clear-btn');
  const categoryFilters = document.getElementById('category-filters');
  const toolsContainer = document.getElementById('tools-container');
  const toolCountEl = document.getElementById('tool-count');
  const recentsSection = document.getElementById('recent-tools-section');
  const recentsList = document.getElementById('recents-list');

  // Load storage state (favorites, recents)
  try {
    const data = await chrome.storage.local.get(['favorites', 'recents', 'activeMainTab']);
    if (Array.isArray(data.favorites)) {
      favorites = new Set(data.favorites);
    }
    if (Array.isArray(data.recents)) {
      recents = data.recents;
    }
    if (data.activeMainTab === 'offline') {
      switchMainTab('offline');
    }
  } catch (err) {
    console.error('Failed to load storage state:', err);
  }

  // --- Main Tab Switching ---
  function switchMainTab(targetTab) {
    if (targetTab === 'directory') {
      tabBtnDirectory.classList.add('active');
      tabBtnDirectory.setAttribute('aria-selected', 'true');
      tabBtnOffline.classList.remove('active');
      tabBtnOffline.setAttribute('aria-selected', 'false');

      panelDirectory.classList.add('active');
      panelDirectory.style.display = 'flex';
      panelOffline.classList.remove('active');
      panelOffline.style.display = 'none';

      searchInput.focus();
    } else {
      tabBtnOffline.classList.add('active');
      tabBtnOffline.setAttribute('aria-selected', 'true');
      tabBtnDirectory.classList.remove('active');
      tabBtnDirectory.setAttribute('aria-selected', 'false');

      panelOffline.classList.add('active');
      panelOffline.style.display = 'flex';
      panelDirectory.classList.remove('active');
      panelDirectory.style.display = 'none';
    }
    chrome.storage.local.set({ activeMainTab: targetTab }).catch(() => {});
  }

  tabBtnDirectory.addEventListener('click', () => switchMainTab('directory'));
  tabBtnOffline.addEventListener('click', () => switchMainTab('offline'));

  // Header Actions
  btnOpenWebsite.addEventListener('click', async () => {
    await chrome.tabs.create({ url: BASE_URL });
  });

  btnOpenSidepanel.addEventListener('click', async () => {
    try {
      if (chrome.sidePanel?.open) {
        const currentWin = await chrome.windows.getCurrent();
        await chrome.sidePanel.open({ windowId: currentWin.id });
        window.close(); // Close popup once sidepanel opens
      } else {
        alert('Side panel is not supported in this Chrome version.');
      }
    } catch (err) {
      console.error('Failed to open side panel:', err);
    }
  });

  // --- Tools Directory Rendering ---
  const allTools = Array.isArray(globalThis.ORBITBOARD_TOOLS) ? globalThis.ORBITBOARD_TOOLS : [];

  function renderRecents() {
    if (!recents.length) {
      recentsSection.style.display = 'none';
      return;
    }

    recentsSection.style.display = 'block';
    recentsList.innerHTML = '';

    recents.slice(0, 4).forEach(slug => {
      const tool = allTools.find(t => t.slug === slug);
      if (!tool) return;

      const chip = document.createElement('a');
      chip.className = 'recent-chip';
      chip.textContent = `${tool.icon} ${tool.name}`;
      chip.title = tool.description;
      chip.addEventListener('click', async (e) => {
        e.preventDefault();
        await launchTool(tool);
      });
      recentsList.appendChild(chip);
    });
  }

  async function launchTool(tool) {
    // Add to recents
    const filteredRecents = recents.filter(s => s !== tool.slug);
    recents = [tool.slug, ...filteredRecents].slice(0, 8);
    await chrome.storage.local.set({ recents });
    renderRecents();

    // Open tool page in new tab
    const url = `${BASE_URL}/tools/${tool.slug}`;
    await chrome.tabs.create({ url });
  }

  function renderTools() {
    toolsContainer.innerHTML = '';

    const query = searchTerm.toLowerCase().trim();

    const filtered = allTools.filter(tool => {
      // Category filter
      if (currentCategory === 'Favorites') {
        if (!favorites.has(tool.slug)) return false;
      } else if (currentCategory === 'Everyday') {
        if (tool.category !== 'Everyday') return false;
      } else if (currentCategory !== 'All') {
        if (tool.category !== currentCategory) return false;
      }

      // Search query filter
      if (query) {
        const matchName = tool.name.toLowerCase().includes(query);
        const matchDesc = tool.description.toLowerCase().includes(query);
        const matchSlug = tool.slug.toLowerCase().includes(query);
        const matchCat = tool.category.toLowerCase().includes(query);
        return matchName || matchDesc || matchSlug || matchCat;
      }

      return true;
    });

    toolCountEl.textContent = `${filtered.length} tool${filtered.length === 1 ? '' : 's'}`;

    if (!filtered.length) {
      const empty = document.createElement('div');
      empty.className = 'empty-state';
      empty.textContent = currentCategory === 'Favorites'
        ? 'No favorite tools saved yet. Click the star icon on any tool to pin it here!'
        : `No tools found matching "${searchTerm}".`;
      toolsContainer.appendChild(empty);
      return;
    }

    filtered.forEach(tool => {
      const card = document.createElement('div');
      card.className = 'tool-card';

      const left = document.createElement('div');
      left.className = 'tool-left';

      const icon = document.createElement('div');
      icon.className = 'tool-icon-badge';
      icon.textContent = tool.icon || '🛠';

      const info = document.createElement('div');
      info.className = 'tool-info';

      const titleRow = document.createElement('div');
      titleRow.className = 'tool-title-row';

      const name = document.createElement('span');
      name.className = 'tool-name';
      name.textContent = tool.name;

      const tag = document.createElement('span');
      tag.className = 'category-tag';
      tag.textContent = tool.category;

      titleRow.appendChild(name);
      titleRow.appendChild(tag);

      const desc = document.createElement('div');
      desc.className = 'tool-desc';
      desc.textContent = tool.description;

      info.appendChild(titleRow);
      info.appendChild(desc);

      left.appendChild(icon);
      left.appendChild(info);

      // Card click opens tool
      left.addEventListener('click', async () => {
        await launchTool(tool);
      });

      const actions = document.createElement('div');
      actions.className = 'tool-actions';

      const starBtn = document.createElement('button');
      starBtn.className = `star-btn ${favorites.has(tool.slug) ? 'starred' : ''}`;
      starBtn.innerHTML = favorites.has(tool.slug) ? '★' : '☆';
      starBtn.title = favorites.has(tool.slug) ? 'Remove from favorites' : 'Pin to favorites';
      starBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        if (favorites.has(tool.slug)) {
          favorites.delete(tool.slug);
        } else {
          favorites.add(tool.slug);
        }
        await chrome.storage.local.set({ favorites: Array.from(favorites) });
        renderTools();
      });

      const openArrow = document.createElement('span');
      openArrow.className = 'open-arrow';
      openArrow.innerHTML = '&nearr;';
      openArrow.addEventListener('click', async () => {
        await launchTool(tool);
      });

      actions.appendChild(starBtn);
      actions.appendChild(openArrow);

      card.appendChild(left);
      card.appendChild(actions);

      toolsContainer.appendChild(card);
    });
  }

  // Search input handler
  searchInput.addEventListener('input', (e) => {
    searchTerm = e.target.value;
    clearBtn.style.display = searchTerm ? 'block' : 'none';
    renderTools();
  });

  clearBtn.addEventListener('click', () => {
    searchInput.value = '';
    searchTerm = '';
    clearBtn.style.display = 'none';
    searchInput.focus();
    renderTools();
  });

  // Category Filter Pills
  categoryFilters.querySelectorAll('.filter-pill').forEach(btn => {
    btn.addEventListener('click', () => {
      categoryFilters.querySelectorAll('.filter-pill').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentCategory = btn.getAttribute('data-category');
      renderTools();
    });
  });

  // Keyboard shortcut: '/' focuses search input
  window.addEventListener('keydown', (e) => {
    if (e.key === '/' && document.activeElement !== searchInput && !['textarea', 'input'].includes(document.activeElement?.tagName?.toLowerCase())) {
      e.preventDefault();
      switchMainTab('directory');
      searchInput.focus();
      searchInput.select();
    }
  });

  // Initial render
  renderRecents();
  renderTools();

  // ==========================================
  // TAB 2: INSTANT MINI-TOOLS CONTROLLER
  // ==========================================
  const miniPills = document.querySelectorAll('.mini-pill');
  const miniViews = document.querySelectorAll('.mini-tool-view');

  miniPills.forEach(pill => {
    pill.addEventListener('click', () => {
      const toolKey = pill.getAttribute('data-tool');
      miniPills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');

      miniViews.forEach(v => {
        v.classList.remove('active');
        v.style.display = 'none';
      });

      const targetView = document.getElementById(`mini-tool-${toolKey}`);
      if (targetView) {
        targetView.classList.add('active');
        targetView.style.display = 'flex';
      }
    });
  });

  // Helper: Status message
  function setStatus(el, text, type = 'info') {
    if (!el) return;
    el.textContent = text;
    el.className = 'tool-status-bar ' + (type === 'success' ? 'status-success' : type === 'error' ? 'status-error' : '');
  }

  // --- 1. JSON FORMATTER ---
  const jsonInput = document.getElementById('json-input');
  const jsonStatus = document.getElementById('json-status');
  const btnJsonFormat = document.getElementById('btn-json-format');
  const btnJsonMinify = document.getElementById('btn-json-minify');
  const btnJsonCopy = document.getElementById('btn-json-copy');
  const btnJsonClear = document.getElementById('btn-json-clear');

  btnJsonFormat.addEventListener('click', () => {
    const raw = jsonInput.value.trim();
    if (!raw) return setStatus(jsonStatus, 'Please enter or paste JSON', 'error');
    try {
      const parsed = JSON.parse(raw);
      jsonInput.value = JSON.stringify(parsed, null, 2);
      setStatus(jsonStatus, '✓ Formatted with 2-space indentation', 'success');
    } catch (err) {
      setStatus(jsonStatus, `Parse Error: ${err.message}`, 'error');
    }
  });

  btnJsonMinify.addEventListener('click', () => {
    const raw = jsonInput.value.trim();
    if (!raw) return setStatus(jsonStatus, 'Please enter or paste JSON', 'error');
    try {
      const parsed = JSON.parse(raw);
      jsonInput.value = JSON.stringify(parsed);
      setStatus(jsonStatus, '✓ Minified (whitespace stripped)', 'success');
    } catch (err) {
      setStatus(jsonStatus, `Parse Error: ${err.message}`, 'error');
    }
  });

  btnJsonCopy.addEventListener('click', async () => {
    const text = jsonInput.value;
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setStatus(jsonStatus, '✓ Copied to clipboard!', 'success');
    } catch (err) {
      setStatus(jsonStatus, 'Failed to copy', 'error');
    }
  });

  btnJsonClear.addEventListener('click', () => {
    jsonInput.value = '';
    setStatus(jsonStatus, 'Cleared');
  });

  // --- 2. BASE64 ENCODER / DECODER ---
  const b64Input = document.getElementById('b64-input');
  const b64Status = document.getElementById('b64-status');
  const btnB64Encode = document.getElementById('btn-b64-encode');
  const btnB64Decode = document.getElementById('btn-b64-decode');
  const btnB64Copy = document.getElementById('btn-b64-copy');
  const btnB64Clear = document.getElementById('btn-b64-clear');

  btnB64Encode.addEventListener('click', () => {
    const raw = b64Input.value;
    if (!raw) return setStatus(b64Status, 'Please enter text to encode', 'error');
    try {
      const bytes = new TextEncoder().encode(raw);
      let binary = '';
      bytes.forEach(b => binary += String.fromCharCode(b));
      b64Input.value = btoa(binary);
      setStatus(b64Status, '✓ Encoded to Base64 (UTF-8 safe)', 'success');
    } catch (err) {
      setStatus(b64Status, `Encoding Error: ${err.message}`, 'error');
    }
  });

  btnB64Decode.addEventListener('click', () => {
    const raw = b64Input.value.trim();
    if (!raw) return setStatus(b64Status, 'Please enter Base64 to decode', 'error');
    try {
      const cleanStr = raw.replace(/-/g, '+').replace(/_/g, '/');
      const pad = cleanStr.length % 4;
      const paddedStr = pad ? cleanStr + '='.repeat(4 - pad) : cleanStr;
      const binary = atob(paddedStr);
      const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
      b64Input.value = new TextDecoder().decode(bytes);
      setStatus(b64Status, '✓ Decoded from Base64', 'success');
    } catch (err) {
      setStatus(b64Status, `Decoding Error: ${err.message}`, 'error');
    }
  });

  btnB64Copy.addEventListener('click', async () => {
    if (!b64Input.value) return;
    try {
      await navigator.clipboard.writeText(b64Input.value);
      setStatus(b64Status, '✓ Copied to clipboard!', 'success');
    } catch (_) {}
  });

  btnB64Clear.addEventListener('click', () => {
    b64Input.value = '';
    setStatus(b64Status, 'Cleared');
  });

  // --- 3. JWT DECODER ---
  const jwtInput = document.getElementById('jwt-input');
  const jwtStatus = document.getElementById('jwt-status');
  const jwtHeaderOut = document.getElementById('jwt-header-out');
  const jwtPayloadOut = document.getElementById('jwt-payload-out');
  const btnJwtDecode = document.getElementById('btn-jwt-decode');
  const btnJwtCopyPayload = document.getElementById('btn-jwt-copy-payload');
  const btnJwtClear = document.getElementById('btn-jwt-clear');

  function decodeJwtSegment(seg) {
    const cleanStr = seg.replace(/-/g, '+').replace(/_/g, '/');
    const pad = cleanStr.length % 4;
    const paddedStr = pad ? cleanStr + '='.repeat(4 - pad) : cleanStr;
    const binary = atob(paddedStr);
    const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
    return JSON.parse(new TextDecoder().decode(bytes));
  }

  btnJwtDecode.addEventListener('click', () => {
    const raw = jwtInput.value.trim();
    if (!raw) return setStatus(jwtStatus, 'Please paste a JWT token', 'error');
    try {
      const parts = raw.split('.');
      if (parts.length < 2) {
        throw new Error('JWT must contain at least header and payload segments separated by a period.');
      }
      const header = decodeJwtSegment(parts[0]);
      const payload = decodeJwtSegment(parts[1]);

      jwtHeaderOut.textContent = JSON.stringify(header, null, 2);
      jwtPayloadOut.textContent = JSON.stringify(payload, null, 2);

      let statusMsg = '✓ Successfully decoded JWT';
      if (payload.exp) {
        const isExp = Date.now() > payload.exp * 1000;
        const expDate = new Date(payload.exp * 1000).toLocaleString();
        statusMsg += ` • ${isExp ? 'EXPIRED' : 'ACTIVE'} (${expDate})`;
      }
      setStatus(jwtStatus, statusMsg, 'success');
    } catch (err) {
      setStatus(jwtStatus, `JWT Error: ${err.message}`, 'error');
    }
  });

  btnJwtCopyPayload.addEventListener('click', async () => {
    const text = jwtPayloadOut.textContent;
    if (!text || text.startsWith('//')) return;
    try {
      await navigator.clipboard.writeText(text);
      setStatus(jwtStatus, '✓ Copied payload to clipboard!', 'success');
    } catch (_) {}
  });

  btnJwtClear.addEventListener('click', () => {
    jwtInput.value = '';
    jwtHeaderOut.textContent = '// Header will appear here';
    jwtPayloadOut.textContent = '// Payload will appear here';
    setStatus(jwtStatus, 'Cleared');
  });

  // --- 4. UNIX TIMESTAMP CONVERTER ---
  const liveEpochEl = document.getElementById('live-epoch-counter');
  const btnCopyLiveEpoch = document.getElementById('btn-copy-live-epoch');
  const tsConvertInput = document.getElementById('ts-convert-input');
  const btnTsToDate = document.getElementById('btn-ts-to-date');
  const tsDateResult = document.getElementById('ts-date-result');

  const dateConvertInput = document.getElementById('date-convert-input');
  const btnDateToTs = document.getElementById('btn-date-to-ts');
  const dateTsResult = document.getElementById('date-ts-result');

  // Live epoch ticker
  function updateLiveEpoch() {
    if (liveEpochEl) {
      liveEpochEl.textContent = Math.floor(Date.now() / 1000);
    }
  }
  updateLiveEpoch();
  setInterval(updateLiveEpoch, 1000);

  btnCopyLiveEpoch.addEventListener('click', async () => {
    const epoch = Math.floor(Date.now() / 1000).toString();
    await navigator.clipboard.writeText(epoch);
    btnCopyLiveEpoch.textContent = 'Copied!';
    setTimeout(() => btnCopyLiveEpoch.textContent = 'Copy', 1500);
  });

  btnTsToDate.addEventListener('click', () => {
    const val = tsConvertInput.value.trim().replace(/[^0-9]/g, '');
    if (!val) {
      tsDateResult.textContent = 'Please enter a timestamp';
      return;
    }
    const num = parseInt(val, 10);
    const isMs = val.length >= 13;
    const d = new Date(isMs ? num : num * 1000);
    if (isNaN(d.getTime())) {
      tsDateResult.textContent = 'Invalid timestamp';
      return;
    }
    tsDateResult.innerHTML = `<strong>UTC:</strong> ${d.toUTCString()}<br><strong>Local:</strong> ${d.toLocaleString()}<br><strong>ISO:</strong> ${d.toISOString()}`;
  });

  // Set default datetime to now
  if (dateConvertInput) {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    dateConvertInput.value = now.toISOString().slice(0, 16);
  }

  btnDateToTs.addEventListener('click', () => {
    const val = dateConvertInput.value;
    if (!val) {
      dateTsResult.textContent = 'Please choose a date/time';
      return;
    }
    const d = new Date(val);
    const s = Math.floor(d.getTime() / 1000);
    const ms = d.getTime();
    dateTsResult.innerHTML = `<strong>Seconds:</strong> ${s}<br><strong>Milliseconds:</strong> ${ms}`;
  });

  // --- 5. UUID GENERATOR ---
  const uuidOutput = document.getElementById('uuid-output');
  const uuidStatus = document.getElementById('uuid-status');
  const btnUuidGen1 = document.getElementById('btn-uuid-gen-1');
  const btnUuidGen5 = document.getElementById('btn-uuid-gen-5');
  const btnUuidCopy = document.getElementById('btn-uuid-copy');
  const btnUuidClear = document.getElementById('btn-uuid-clear');

  function generateUuids(count) {
    const list = [];
    for (let i = 0; i < count; i++) {
      list.push(crypto.randomUUID());
    }
    uuidOutput.value = list.join('\n');
    setStatus(uuidStatus, `✓ Generated ${count} UUID v4 identifier${count > 1 ? 's' : ''}`, 'success');
  }

  btnUuidGen1.addEventListener('click', () => generateUuids(1));
  btnUuidGen5.addEventListener('click', () => generateUuids(5));

  btnUuidCopy.addEventListener('click', async () => {
    if (!uuidOutput.value) return;
    try {
      await navigator.clipboard.writeText(uuidOutput.value);
      setStatus(uuidStatus, '✓ Copied UUIDs to clipboard!', 'success');
    } catch (_) {}
  });

  btnUuidClear.addEventListener('click', () => {
    uuidOutput.value = '';
    setStatus(uuidStatus, 'Cleared');
  });

  // --- 6. URL ENCODER/DECODER ---
  const urlInput = document.getElementById('url-input');
  const urlStatus = document.getElementById('url-status');
  const btnUrlEncode = document.getElementById('btn-url-encode');
  const btnUrlDecode = document.getElementById('btn-url-decode');
  const btnUrlCopy = document.getElementById('btn-url-copy');
  const btnUrlClear = document.getElementById('btn-url-clear');

  btnUrlEncode.addEventListener('click', () => {
    const val = urlInput.value;
    if (!val) return setStatus(urlStatus, 'Please enter a URL or string', 'error');
    try {
      urlInput.value = encodeURIComponent(val);
      setStatus(urlStatus, '✓ URL Component Encoded', 'success');
    } catch (err) {
      setStatus(urlStatus, `Encoding Error: ${err.message}`, 'error');
    }
  });

  btnUrlDecode.addEventListener('click', () => {
    const val = urlInput.value.trim();
    if (!val) return setStatus(urlStatus, 'Please enter a URL or string', 'error');
    try {
      urlInput.value = decodeURIComponent(val);
      setStatus(urlStatus, '✓ URL Component Decoded', 'success');
    } catch (err) {
      setStatus(urlStatus, `Decoding Error: ${err.message}`, 'error');
    }
  });

  btnUrlCopy.addEventListener('click', async () => {
    if (!urlInput.value) return;
    try {
      await navigator.clipboard.writeText(urlInput.value);
      setStatus(urlStatus, '✓ Copied to clipboard!', 'success');
    } catch (_) {}
  });

  btnUrlClear.addEventListener('click', () => {
    urlInput.value = '';
    setStatus(urlStatus, 'Cleared');
  });

  // --- 7. QUICK CALCULATORS ---
  const calcPctVal = document.getElementById('calc-pct-val');
  const calcPctBase = document.getElementById('calc-pct-base');
  const btnCalcPct = document.getElementById('btn-calc-pct');
  const calcPctRes = document.getElementById('calc-pct-res');

  btnCalcPct.addEventListener('click', () => {
    const pct = parseFloat(calcPctVal.value);
    const base = parseFloat(calcPctBase.value);
    if (isNaN(pct) || isNaN(base)) {
      calcPctRes.textContent = 'Please enter both numbers';
      return;
    }
    const result = (pct / 100) * base;
    const added = base + result;
    const subtracted = base - result;
    calcPctRes.innerHTML = `<strong>${pct}% of ${base} = ${result.toLocaleString()}</strong><br><span style="font-size:11px;color:#94A3B8;">+${pct}%: ${added.toLocaleString()} | -${pct}%: ${subtracted.toLocaleString()}</span>`;
  });

  const calcHikeOld = document.getElementById('calc-hike-old');
  const calcHikeNew = document.getElementById('calc-hike-new');
  const btnCalcHike = document.getElementById('btn-calc-hike');
  const calcHikeRes = document.getElementById('calc-hike-res');

  btnCalcHike.addEventListener('click', () => {
    const oldVal = parseFloat(calcHikeOld.value);
    const newVal = parseFloat(calcHikeNew.value);
    if (isNaN(oldVal) || isNaN(newVal) || oldVal <= 0) {
      calcHikeRes.textContent = 'Please enter valid salary values';
      return;
    }
    const diff = newVal - oldVal;
    const hikePct = (diff / oldVal) * 100;
    calcHikeRes.innerHTML = `<strong>Hike: ${hikePct >= 0 ? '+' : ''}${hikePct.toFixed(2)}%</strong> (${diff >= 0 ? '+' : ''}${diff.toLocaleString()})`;
  });
});
