// OrbitBoard Tools Catalogue for Chrome Extension
// Source: https://orbitboard.in

globalThis.ORBITBOARD_BASE_URL = 'https://orbitboard.in';

globalThis.ORBITBOARD_TOOLS = [
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
