/* global chrome */
// OrbitBoard Extension — Popup Controller
// Manages search, favorites, recents, navigation and instant offline utilities

const BASE_URL = globalThis.ORBITBOARD_BASE_URL || 'https://orbitboard.in';

// Embedded fallback tools array guarantees tools are ALWAYS available
const EMBEDDED_TOOLS = [
  // Career
  {
    slug: 'ctc-to-inhand',
    name: 'CTC to In-Hand Salary',
    description: 'Estimate take-home salary with tax regime, PF, gratuity, variable pay and professional tax.',
    category: 'Career',
    icon: '₹',
    keywords: 'salary in hand take home ctc payroll monthly gross net pay tax regime pf provident fund pay slip compensation appraisal calculator'
  },
  {
    slug: 'salary-hike',
    name: 'Salary Hike Calculator',
    description: 'Calculate your hike percentage and revised salary instantly.',
    category: 'Career',
    icon: '%',
    keywords: 'salary hike calculator appraisal increment percentage increase pay raise revised ctc promotion'
  },
  {
    slug: 'offer-comparison',
    name: 'Offer Comparison',
    description: 'Compare two job offers by CTC, monthly take-home and hike.',
    category: 'Career',
    icon: '⇄',
    keywords: 'compare job offers ctc package salary comparison new job compensation switch'
  },
  {
    slug: 'notice-period',
    name: 'Notice Period Calculator',
    description: 'Find your last working day from resignation date and notice period.',
    category: 'Career',
    icon: '◷',
    keywords: 'resignation last working day lwd notice period calculator calendar attrition exit'
  },
  {
    slug: 'experience',
    name: 'Experience Calculator',
    description: 'Calculate total professional experience between two dates.',
    category: 'Career',
    icon: '⌁',
    keywords: 'work experience calculator total years months service tenure resume cv career duration'
  },
  {
    slug: 'gratuity-calculator',
    name: 'Gratuity Calculator',
    description: 'Estimate gratuity from last drawn wages and length of service under Indian rules.',
    category: 'Career',
    icon: '₹',
    keywords: 'gratuity calculator retirement 5 years service gratuity formula 15 days wages employee benefit'
  },

  // Everyday
  {
    slug: 'percentage',
    name: 'Percentage Calculator',
    description: 'Calculate percentages, increases and decreases quickly.',
    category: 'Everyday',
    icon: '%',
    keywords: 'percentage calculator percent math increase decrease discount proportion fraction ratio difference'
  },
  {
    slug: 'length-converter',
    name: 'Length Converter',
    description: 'Convert millimetres, centimetres, metres, kilometres, inches, feet and miles.',
    category: 'Everyday',
    icon: '↔',
    keywords: 'length converter distance metric imperial cm m km inches feet miles millimeter yard measurement'
  },
  {
    slug: 'weight-converter',
    name: 'Weight Converter',
    description: 'Convert grams, kilograms, ounces, pounds and tonnes.',
    category: 'Everyday',
    icon: '↔',
    keywords: 'weight converter mass kg grams pounds lbs ounces tonne metric imperial measurement'
  },
  {
    slug: 'temperature-converter',
    name: 'Temperature Converter',
    description: 'Convert Celsius, Fahrenheit and Kelvin instantly.',
    category: 'Everyday',
    icon: '°',
    keywords: 'temperature converter celsius fahrenheit kelvin degrees heat weather convert'
  },
  {
    slug: 'time-converter',
    name: 'Time Converter',
    description: 'Convert seconds, minutes, hours and days quickly.',
    category: 'Everyday',
    icon: '◷',
    keywords: 'time converter seconds minutes hours days duration clock epoch units'
  },
  {
    slug: 'jpg-to-png',
    name: 'JPG to PNG Converter',
    description: 'Convert JPG images to PNG directly in your browser.',
    category: 'Everyday',
    icon: 'IMG',
    keywords: 'jpg to png jpeg convert image picture photo format transparent lossless'
  },
  {
    slug: 'png-to-jpg',
    name: 'PNG to JPG Converter',
    description: 'Convert PNG images to JPG directly in your browser.',
    category: 'Everyday',
    icon: 'IMG',
    keywords: 'png to jpg jpeg convert image picture transparent photo compression'
  },
  {
    slug: 'webp-to-jpg',
    name: 'WebP to JPG Converter',
    description: 'Convert WebP images to JPG directly in your browser.',
    category: 'Everyday',
    icon: 'IMG',
    keywords: 'webp to jpg jpeg convert image google format photo picture compatible'
  },
  {
    slug: 'image-to-pdf',
    name: 'Image to PDF Converter',
    description: 'Turn JPG, PNG or WebP images into a downloadable PDF in your browser.',
    category: 'Everyday',
    icon: 'PDF',
    keywords: 'image to pdf jpg to pdf png to pdf photo picture document scanner export'
  },
  {
    slug: 'xlsx-to-pdf',
    name: 'XLSX to PDF Converter',
    description: 'Convert spreadsheet cell data from XLSX into a readable PDF.',
    category: 'Everyday',
    icon: 'XLS',
    keywords: 'xlsx to pdf excel to pdf spreadsheet to pdf workbook sheets table document'
  },
  {
    slug: 'image-resizer',
    name: 'Image Resizer',
    description: 'Resize JPG, PNG and WebP images to exact dimensions in your browser.',
    category: 'Everyday',
    icon: 'IMG',
    keywords: 'image resizer resize photo dimension width height scale crop aspect ratio size'
  },
  {
    slug: 'svg-to-png',
    name: 'SVG to PNG Converter',
    description: 'Render SVG markup as a downloadable PNG image.',
    category: 'Everyday',
    icon: 'SVG',
    keywords: 'svg to png vector raster render export image icon graphic'
  },
  {
    slug: 'csv-to-pdf',
    name: 'CSV to PDF Converter',
    description: 'Turn CSV rows into a readable PDF locally in your browser.',
    category: 'Everyday',
    icon: 'PDF',
    keywords: 'csv to pdf spreadsheet tabular data table document export printable'
  },
  {
    slug: 'csv-to-json',
    name: 'CSV to JSON Converter',
    description: 'Convert simple CSV data into a JSON array directly in your browser.',
    category: 'Everyday',
    icon: 'CSV',
    keywords: 'csv to json convert table array objects parse data export json'
  },
  {
    slug: 'csv-to-xlsx',
    name: 'CSV to XLSX Converter',
    description: 'Convert CSV data into an Excel-compatible XLSX workbook.',
    category: 'Everyday',
    icon: 'XLS',
    keywords: 'csv to xlsx excel sheet workbook spreadsheet convert import'
  },
  {
    slug: 'xlsx-to-csv',
    name: 'XLSX to CSV Converter',
    description: 'Convert an Excel workbook into CSV data directly in your browser.',
    category: 'Everyday',
    icon: 'CSV',
    keywords: 'xlsx to csv excel export sheets table data comma separated flat file'
  },
  {
    slug: 'txt-to-pdf',
    name: 'TXT to PDF Converter',
    description: 'Convert plain text files or pasted text into a simple PDF locally.',
    category: 'Everyday',
    icon: 'TXT',
    keywords: 'txt to pdf text file document export write generate'
  },
  {
    slug: 'pdf-to-text',
    name: 'PDF to Text Converter',
    description: 'Extract selectable text from PDF pages in your browser.',
    category: 'Everyday',
    icon: 'PDF',
    keywords: 'pdf to text extract text copy text parse document reader'
  },
  {
    slug: 'image-compressor',
    name: 'Image Compressor',
    description: 'Reduce image file size locally while choosing output quality and format.',
    category: 'Everyday',
    icon: 'IMG',
    keywords: 'image compressor compress photo reduce size optimize mb kb quality shrink'
  },
  {
    slug: 'image-metadata-remover',
    name: 'Image Metadata Remover',
    description: 'Re-encode images locally to help remove embedded metadata.',
    category: 'Everyday',
    icon: 'IMG',
    keywords: 'image metadata remover exif strip privacy photo data gps location clean'
  },
  {
    slug: 'pdf-e-sign',
    name: 'PDF E-Sign',
    description: 'Add a visible typed signature to a PDF locally in your browser.',
    category: 'Everyday',
    icon: 'SIGN',
    keywords: 'pdf e sign electronic signature sign document autograph initials fill sign'
  },
  {
    slug: 'pdf-merge',
    name: 'Merge PDF',
    description: 'Combine multiple PDF files into one PDF in your browser.',
    category: 'Everyday',
    icon: 'PDF',
    keywords: 'pdf merge merge pdf combine join multiple pdfs documents bind assemble'
  },
  {
    slug: 'pdf-split',
    name: 'Split PDF',
    description: 'Split a PDF into individual page files locally.',
    category: 'Everyday',
    icon: 'PDF',
    keywords: 'pdf split split pdf separate pages break divide extract pdf cutter'
  },
  {
    slug: 'pdf-extract-pages',
    name: 'Extract PDF Pages',
    description: 'Extract selected pages from a PDF into a new file.',
    category: 'Everyday',
    icon: 'PDF',
    keywords: 'extract pdf pages select range remove save subset'
  },
  {
    slug: 'pdf-reorder',
    name: 'Reorder PDF Pages',
    description: 'Change the page order of a PDF locally and download a new copy.',
    category: 'Everyday',
    icon: 'PDF',
    keywords: 'reorder pdf pages rearrange organize rotate sort sequence'
  },
  {
    slug: 'pdf-to-jpg',
    name: 'PDF to JPG Converter',
    description: 'Convert PDF pages to JPG images with browser-side rendering.',
    category: 'Everyday',
    icon: 'PDF',
    keywords: 'pdf to jpg jpeg convert document to image pages picture photo render'
  },
  {
    slug: 'pdf-to-png',
    name: 'PDF to PNG Converter',
    description: 'Convert PDF pages to PNG images with browser-side rendering.',
    category: 'Everyday',
    icon: 'PDF',
    keywords: 'pdf to png convert document to image transparent raster render'
  },
  {
    slug: 'pdf-workspace',
    name: 'PDF Page Editor',
    description: 'Preview, select, rotate, reorder and remove PDF pages before exporting.',
    category: 'Everyday',
    icon: 'PDF',
    keywords: 'pdf workspace editor rotate reorder delete page manager organizer tools'
  },
  {
    slug: 'pdf-compressor',
    name: 'PDF Compressor',
    description: 'Optimize PDF structure locally and compare the resulting file size.',
    category: 'Everyday',
    icon: 'PDF',
    keywords: 'pdf compressor compress pdf reduce size optimize file document shrink mb kb'
  },

  // Finance
  {
    slug: 'income-tax-india',
    name: 'Income Tax Calculator - India',
    description: 'Estimate Indian income tax using AY 2026-27 individual slabs, rebate and cess.',
    category: 'Finance',
    icon: 'TAX',
    keywords: 'income tax calculator india new tax regime old tax regime slabs 80c rebate 87a cess 2026-27 fy ay salary tax'
  },
  {
    slug: 'income-tax-global',
    name: 'Income Tax Calculator - Global',
    description: 'Estimate income tax across US, UK, Canada, Australia, Singapore, Germany, UAE.',
    category: 'Finance',
    icon: 'TAX',
    keywords: 'income tax global us uk canada australia singapore germany uae international tax salary tax'
  },
  {
    slug: 'emi',
    name: 'EMI Calculator',
    description: 'Estimate monthly EMI, total interest and total repayment.',
    category: 'Finance',
    icon: '₹',
    keywords: 'emi calculator loan home loan car loan personal loan interest repayment mortgage amortization'
  },
  {
    slug: 'gst',
    name: 'GST Calculator',
    description: 'Calculate GST amount, inclusive price and pre-GST price.',
    category: 'Finance',
    icon: 'G',
    keywords: 'gst calculator goods services tax tax inclusive exclusive cgst sgst igst vat invoice'
  },
  {
    slug: 'sip',
    name: 'SIP Calculator',
    description: 'Estimate SIP maturity value, invested amount and potential returns.',
    category: 'Finance',
    icon: '↗',
    keywords: 'sip calculator mutual funds investment compounding returns wealth systematic plan market lumpsum'
  },

  // Developer
  {
    slug: 'json-formatter',
    name: 'JSON Formatter & Validator',
    description: 'Format, validate and minify JSON instantly in your browser.',
    category: 'Developer',
    icon: '{}',
    keywords: 'json formatter validator beautifier prettify minify clean validate json viewer parser'
  },
  {
    slug: 'base64',
    name: 'Base64 Encoder / Decoder',
    description: 'Encode text to Base64 or decode Base64 back to text.',
    category: 'Developer',
    icon: '64',
    keywords: 'base64 encoder decoder string binary btoa atob ascii utf8 encode decode'
  },
  {
    slug: 'jwt-decoder',
    name: 'JWT Decoder',
    description: 'Decode JWT header and payload locally without sending token anywhere.',
    category: 'Developer',
    icon: 'JWT',
    keywords: 'jwt decoder json web token payload header claim exp expiration auth bearer token inspect json'
  },
  {
    slug: 'unix-timestamp',
    name: 'Unix Timestamp Converter',
    description: 'Convert Unix timestamps to readable dates and back.',
    category: 'Developer',
    icon: 'TS',
    keywords: 'unix timestamp converter epoch time date utc local seconds milliseconds clock'
  },
  {
    slug: 'uuid-generator',
    name: 'UUID Generator',
    description: 'Generate random UUID v4 identifiers instantly.',
    category: 'Developer',
    icon: 'ID',
    keywords: 'uuid generator v4 guid random identifier unique id key'
  },
  {
    slug: 'url-encoder',
    name: 'URL Encoder / Decoder',
    description: 'Encode or decode URL components safely and quickly.',
    category: 'Developer',
    icon: '%2F',
    keywords: 'url encoder decoder uri query param percent escape unescape link component'
  },
  {
    slug: 'diff-checker',
    name: 'Text Diff Checker',
    description: 'Compare two text versions line by line and identify changes locally.',
    category: 'Developer',
    icon: 'DIFF',
    keywords: 'diff checker text compare comparison difference changes side by side code git'
  },
  {
    slug: 'json-to-xml',
    name: 'JSON to XML Converter',
    description: 'Convert JSON objects into readable XML directly in your browser.',
    category: 'Developer',
    icon: 'XML',
    keywords: 'json to xml convert parse data structure markup json'
  },
  {
    slug: 'xml-to-json',
    name: 'XML to JSON Converter',
    description: 'Convert XML documents into JSON directly in your browser.',
    category: 'Developer',
    icon: 'XML',
    keywords: 'xml to json convert parse data structure xml parser json'
  },
  {
    slug: 'markdown-to-html',
    name: 'Markdown to HTML Converter',
    description: 'Convert basic Markdown into HTML locally in your browser.',
    category: 'Developer',
    icon: 'MD',
    keywords: 'markdown to html md preview converter format documentation render'
  },
  {
    slug: 'json-to-csv',
    name: 'JSON to CSV',
    description: 'Convert a JSON array into CSV for spreadsheets and data work.',
    category: 'Developer',
    icon: '↔',
    keywords: 'json to csv convert array table excel sheet data export json'
  },
  {
    slug: 'json-to-xlsx',
    name: 'JSON to XLSX Converter',
    description: 'Convert a JSON array into an Excel-compatible XLSX workbook locally.',
    category: 'Developer',
    icon: 'XLS',
    keywords: 'json to xlsx convert array excel workbook spreadsheet excel export json'
  }
];

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
  if (btnOpenWebsite) {
    btnOpenWebsite.addEventListener('click', async () => {
      await chrome.tabs.create({ url: BASE_URL });
    });
  }

  if (btnOpenSidepanel) {
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
  }

  // --- Tools Directory Rendering ---
  // Guaranteed fallback ensures allTools has 52 tools
  const allTools = (Array.isArray(globalThis.ORBITBOARD_TOOLS) && globalThis.ORBITBOARD_TOOLS.length > 0)
    ? globalThis.ORBITBOARD_TOOLS
    : EMBEDDED_TOOLS;

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
    const queryTokens = query ? query.split(/\s+/).filter(Boolean) : [];

    const filtered = allTools.filter(tool => {
      // Category filter
      if (currentCategory === 'Favorites') {
        if (!favorites.has(tool.slug)) return false;
      } else if (currentCategory !== 'All') {
        if (tool.category !== currentCategory) return false;
      }

      // Search query filter: every word token must match in searchable text
      if (queryTokens.length > 0) {
        const searchableText = [
          tool.name,
          tool.slug,
          tool.slug.replace(/-/g, ' '),
          tool.description,
          tool.category,
          tool.keywords || ''
        ].join(' ').toLowerCase();

        return queryTokens.every(token => searchableText.includes(token));
      }

      return true;
    });

    if (query) {
      toolCountEl.textContent = `${filtered.length} match${filtered.length === 1 ? '' : 'es'}`;
    } else {
      toolCountEl.textContent = `${filtered.length} tool${filtered.length === 1 ? '' : 's'}`;
    }

    if (!filtered.length) {
      const empty = document.createElement('div');
      empty.className = 'empty-state';
      empty.textContent = currentCategory === 'Favorites'
        ? (query ? `No favorite tools match "${searchTerm}".` : 'No favorite tools saved yet. Click the star icon on any tool to pin it here!')
        : `No tools found matching "${searchTerm}". Try words like "salary", "pdf", "json", "excel", "tax", "emi", or "image".`;
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

    // If searching while 'Favorites' tab is active with no matches, switch to 'All'
    if (searchTerm && currentCategory === 'Favorites') {
      const queryTokens = searchTerm.toLowerCase().trim().split(/\s+/).filter(Boolean);
      const hasFavMatch = allTools.some(t => {
        if (!favorites.has(t.slug)) return false;
        const text = [t.name, t.slug, t.description, t.keywords || ''].join(' ').toLowerCase();
        return queryTokens.every(tok => text.includes(tok));
      });
      if (!hasFavMatch) {
        currentCategory = 'All';
        categoryFilters.querySelectorAll('.filter-pill').forEach(btn => {
          btn.classList.toggle('active', btn.getAttribute('data-category') === 'All');
        });
      }
    }

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
    } catch {
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
    } catch {
      // Ignore copy error
    }
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
    } catch {
      // Ignore copy error
    }
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
    } catch {
      // Ignore copy error
    }
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
    } catch {
      // Ignore copy error
    }
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
