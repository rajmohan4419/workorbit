import { Link } from 'react-router-dom';

export const TOOL_CONTENT = {
  'ctc-to-inhand': {
    intro: 'Understand what your CTC could mean as monthly take-home pay.',
    keywords: 'CTC to in-hand salary calculator India, take home salary calculator, CTC calculator',
    how: [
      'Enter annual CTC and basic salary percentage.',
      'Add variable pay and gratuity if they are part of your CTC.',
      'Choose the tax regime and review the estimated take-home.'
    ],
    faq: [
      ['Does CTC equal take-home salary?', 'No. CTC can include employer contributions, gratuity, variable pay and other components that do not arrive as monthly cash.'],
      ['Is this salary calculator exact?', 'No. It is an estimate. Your payroll structure, tax declarations and employer policies can change the result.']
    ],
    article: (
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-stone-900">Understanding Salary Structures & Notice Periods</h2>
        <p>
          When evaluating your job offers or planning a career move, understanding your net take-home salary is closely tied to managing your transition timeline. Before submitting your official resignation letter, ensure you evaluate both your pay structure and your employment contracts.
        </p>
        <p>
          Need to calculate your last working day after handing in your written notice? Use our dedicated <Link to="/tools/notice-period" className="text-accent-700 underline font-semibold">Notice Period Calculator</Link> to accurately determine your notice period length, whether it is 30 days, 60 days, or 90 days.
        </p>
      </div>
    )
  },
  'salary-hike': {
    intro: 'See the percentage increase between your current and revised salary.',
    keywords: 'salary hike calculator, appraisal hike percentage calculator India',
    how: [
      'Enter your current annual salary.',
      'Enter the revised annual salary.',
      'Review the percentage hike and annual increase.'
    ],
    faq: [
      ['How is salary hike calculated?', 'The increase is divided by the current salary and multiplied by 100.'],
      ['Can I calculate a negative hike?', 'Yes. If the revised salary is lower, the percentage change is negative.']
    ],
    article: (
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-stone-900">Career Transitions & Salary Adjustments</h2>
        <p>
          A salary hike often comes with job changes or promotion. During any job transition, check your contract to understand your notice period obligations before serving written notice.
        </p>
        <p>
          To plan your last working day during resignation, try our free <Link to="/tools/notice-period" className="text-accent-700 underline font-semibold">Notice Period Calculator</Link> to calculate calendar days or working day timelines accurately.
        </p>
      </div>
    )
  },
  'offer-comparison': {
    intro: 'Compare job offers using CTC and estimated monthly take-home instead of headline salary alone.',
    keywords: 'job offer comparison calculator, compare CTC offers India',
    how: [
      'Enter CTC and variable pay for both offers.',
      'Choose a basic salary percentage and tax regime.',
      'Compare estimated monthly and annual take-home.'
    ],
    faq: [
      ['Why can two similar CTC offers have different take-home?', 'Variable pay, PF, gratuity, insurance and other components can differ.'],
      ['Should I compare only CTC?', 'CTC is one input. Consider fixed pay, variable pay, benefits, location and other terms too.']
    ],
    article: (
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-stone-900">Comparing Offers & Transition Requirements</h2>
        <p>
          Accepting a new job offer usually requires handing in your resignation letter at your current company. Be sure to calculate your minimum notice period and check whether your current employer enforces garden leave or payment in lieu of notice.
        </p>
        <p>
          Calculate your notice duration easily using our online <Link to="/tools/notice-period" className="text-accent-700 underline font-semibold">Notice Period Calculator</Link>.
        </p>
      </div>
    )
  },
  'notice-period': {
    title: 'Notice Period Calculator | Month Notice Period & Employment Contracts',
    h1: 'Notice Period Calculator - Month Notice Period & UK Employment Contracts',
    metaDescription: 'Calculate your last working day with our notice period calculator. Check written notice, 30 days, 90 days, week notice, month notice period, and UK employment contracts.',
    intro: 'Estimate your last working date from a resignation date, start date, and notice period length across standard employment contracts with our notice period calculator.',
    keywords: 'notice period calculator, month notice period, period calculator, notice period calculator UK, last working day calculator',
    how: [
      'Select your resignation date and enter your start date if relevant.',
      'Enter your notice period in days or weeks (e.g. 30 days, 90 days, 1 week notice, 1 month notice period).',
      'Check the calculated last working day, calendar days, or working day result and confirm with your contract.'
    ],
    faq: [
      ['What is the statutory minimum notice period in the UK?', 'In the UK, statutory notice depends on length of service: at least 1 week notice if employed between 1 month and 2 years, and 1 week for each year served up to 12 weeks for longer notice periods. Always check your contract.'],
      ['Does a 1 month notice period mean 30 days or calendar days?', 'A 1 month notice period usually runs from the date written notice is served to the corresponding date in the next month, counted in calendar days rather than purely 30 days or working day counts.'],
      ['What happens during payment in lieu of notice or garden leave?', 'Under payment in lieu of notice (PILON), your employment ends immediately with compensation. During garden leave, you remain employed during your notice period but do not perform active duties.'],
      ['Can leaving early without serving notice cause a breach of contract?', 'Yes. Resigning without serving your contractual minimum notice period or securing agreement from your employer can be deemed a breach of contract unless payment in lieu of notice or garden leave is agreed.'],
      ['Frequently asked questions about notice period calculator tools', 'Frequently asked questions include whether the resignation date counts as day one, how 90 days notice periods align with official start date transitions, and how to format a resignation letter for HR.']
    ],
    article: (
      <div className="space-y-5">
        <h2 className="text-2xl font-bold text-stone-900">Comprehensive Guide to Notice Periods & Employment Contracts</h2>
        <p>
          Managing a job exit requires an accurate <strong>notice period calculator</strong> to determine your final <strong>working day</strong>. When you prepare your <strong>resignation letter</strong> and deliver official <strong>written notice</strong> to human resources, your contract dictates the length of time you must remain employed prior to your new job <strong>start date</strong>.
        </p>

        <h3 className="text-lg font-bold text-stone-800">Understanding Statutory & Contractual Notice Periods</h3>
        <p>
          Notice requirements vary significantly depending on jurisdiction and standard <strong>employment contracts</strong>. For instance, the statutory notice <strong>period in the uk</strong> establishes a <strong>minimum notice period</strong> of at least one <strong>week notice</strong> for employees with continuous service under two years, extending up to 12 weeks for longer tenures.
        </p>
        <p>
          In many executive or specialized positions, employers enforce <strong>longer notice periods</strong> such as a standard 3 <strong>month notice period</strong>, <strong>30 days</strong>, or up to <strong>90 days</strong>. You should always <strong>check your contract</strong> carefully to verify whether notice duration is measured in <strong>calendar days</strong> or exact business days.
        </p>

        <h3 className="text-lg font-bold text-stone-800">Garden Leave, PILON, and Breach of Contract</h3>
        <p>
          During your departure timeline, an employer may elect to place you on <strong>garden leave</strong>, where you receive full pay but cease daily responsibilities. Alternatively, an employer may offer <strong>payment in lieu of notice</strong> (PILON), allowing immediate termination. Failing to serve required contractual notice without employer permission can constitute a <strong>breach of contract</strong>.
        </p>

        <p>
          Our online <strong>period calculator</strong> helps employees across the UK, India, US, and globally compute exit dates instantly. If you are also calculating overall career tenure or salary transitions, check out our companion tools:
        </p>
        <ul className="list-disc pl-6 space-y-2 text-accent-800 font-medium">
          <li>
            <Link to="/tools/notice-period" className="underline hover:text-accent-900">Notice Period Calculator</Link> — Calculate your exact last working day.
          </li>
          <li>
            <Link to="/tools/experience" className="underline hover:text-accent-900">Work Experience Calculator</Link> — Count your total professional tenure between start date and end date.
          </li>
          <li>
            <Link to="/tools/ctc-to-inhand" className="underline hover:text-accent-900">CTC to In-Hand Salary Calculator</Link> — Estimate take-home pay for new offers.
          </li>
          <li>
            <Link to="/tools/offer-comparison" className="underline hover:text-accent-900">Offer Comparison Tool</Link> — Compare two competing job offers side-by-side.
          </li>
        </ul>

        <div className="rounded-xl border border-stone-200 bg-stone-50 p-4 mt-4">
          <h4 className="font-bold text-stone-900 mb-2">Notice Period Frequently Asked Questions Summary</h4>
          <p className="text-xs text-stone-600">
            Below are detailed answers to <strong>frequently asked questions</strong> regarding resignation letter dates, 30 days notice calculations, 90 days contractual clauses, statutory period in the uk rules, garden leave options, and payment in lieu of notice terms.
          </p>
        </div>
      </div>
    )
  },
  'experience': {
    title: 'Job Experience Calculator & Experience Counter - Calculate Work Experience',
    h1: 'Calculate Work Experience | Job Experience Calculator & Experience Counter',
    metaDescription: 'Use our free job experience calculator and experience counter to calculate work experience between start date and end date.',
    intro: 'Calculate work experience between two dates instantly using our job experience calculator and experience counter.',
    keywords: 'calculate work experience, job experience calculator, experience counter, experience calculator',
    how: [
      'Enter your start date in the date picker.',
      'Enter your end date (or leave as today’s date).',
      'Review your calculated total work experience in years, months, and total days.'
    ],
    faq: [
      ['How does the job experience calculator calculate work experience?', 'The experience calculator computes total calendar days between your start date and end date, converting them into precise years and months of total work experience.'],
      ['Can I use an experience counter for resume calculations or gaming?', 'Yes! Whether you need an experience calculator to calculate work experience for employment history, or you are looking for an experience counter mechanic reference in trading card games like Magic The Gathering, this tool provides quick date tracking.'],
      ['Frequently asked questions about calculating work experience', 'Frequently asked questions include how leap years are handled, how partial months are rounded, and how to combine multiple employment periods.']
    ],
    article: (
      <div className="space-y-5">
        <h2 className="text-2xl font-bold text-stone-900">Job Experience Calculator & Experience Counter Guide</h2>
        <p>
          When building a resume, filling out background verification forms, or preparing for job applications, knowing how to <strong>calculate work experience</strong> with precision is vital. Our free <strong>job experience calculator</strong> acts as a reliable <strong>experience counter</strong> and <strong>experience calculator</strong> for job seekers, HR professionals, and recruiters.
        </p>

        <h3 className="text-lg font-bold text-stone-800">Calculating Tenure across Career Steps</h3>
        <p>
          To accurately compute total professional service, enter your official start date and end date. If you are currently changing jobs and planning your resignation date, combine this tool with our <Link to="/tools/notice-period" className="text-accent-700 underline font-semibold">Notice Period Calculator</Link> to ensure seamless transitions between employment contracts.
        </p>

        <h3 className="text-lg font-bold text-stone-800">Experience Counters in Other Contexts</h3>
        <p>
          Interestingly, the phrase <strong>experience counter</strong> is also widely recognized in strategy and collectible card games such as <strong>magic the gathering</strong> (MTG), where players track experience counters placed on Commander cards during gameplay. While our utility focuses primarily on career calculations, tracking incremental counters—whether years of service on a resume or game state counters—requires simple, accurate counting!
        </p>

        <div className="rounded-xl border border-stone-200 bg-stone-50 p-4">
          <h4 className="font-bold text-stone-900 mb-1">Frequently Asked Questions</h4>
          <p className="text-xs text-stone-600">
            Find answers to <strong>frequently asked questions</strong> on how to <strong>calculate work experience</strong>, use the <strong>job experience calculator</strong>, and track total tenure accurately.
          </p>
        </div>
      </div>
    )
  },
  'length-converter': {
    intro: 'Convert common metric and imperial length units instantly in your browser.',
    keywords: 'length converter, cm to inches, metres to feet, km to miles',
    how: [
      'Enter a value and choose the source unit.',
      'Choose the unit you want to convert to.',
      'Copy or export the converted result.'
    ],
    faq: [
      ['Does it use exact conversion factors?', 'Metric and imperial units use standard fixed conversion factors.']
    ]
  },
  'weight-converter': {
    title: 'How to Calculate Grams - Weight Converter & Conversion Table',
    h1: 'How to Calculate Grams - Weight & Mass Unit Converter',
    metaDescription: 'Learn how to calculate grams and convert unit of weight in the metric system including kilograms kg using our online conversion table.',
    intro: 'Learn how to calculate grams and convert unit of weight values across the metric system including kilograms kg with our free weight converter.',
    keywords: 'how to calculate grams, convert from gram, metric system, conversion table, unit of weight, kilograms kg',
    how: [
      'Enter the weight numerical value in the input field.',
      'Select your starting unit of weight (e.g., grams, kilograms kg, ounces, pounds).',
      'Choose the target metric system or imperial unit to view the conversion table result.'
    ],
    faq: [
      ['How to calculate grams from kilograms kg?', 'To convert from gram to kilograms kg, divide the total number of grams by 1,000 (1 kg = 1,000 g). To calculate grams from kg, multiply kilograms by 1,000.'],
      ['What is the standard unit of weight in the metric system?', 'In the metric system, the base unit of weight (or mass) is the gram (g), with kilograms kg serving as the SI base unit for heavier measurements.'],
      ['Where can I use a weight conversion table?', 'A conversion table helps convert from gram to pounds, ounces, kilograms kg, and tonnes in science, cooking, shipping, and technical engineering.']
    ],
    article: (
      <div className="space-y-5">
        <h2 className="text-2xl font-bold text-stone-900">How to Calculate Grams & Convert Weight Units</h2>
        <p>
          Understanding <strong>how to calculate grams</strong> and convert any <strong>unit of weight</strong> is an essential skill in science, culinary arts, trade, and engineering. The <strong>metric system</strong> relies on standardized base units, making it easy to <strong>convert from gram</strong> measurements to larger units like <strong>kilograms kg</strong> or smaller sub-units.
        </p>

        <h3 className="text-lg font-bold text-stone-800">Metric System Conversion Table Rules</h3>
        <p>
          Below is a fundamental <strong>conversion table</strong> for converting grams across common metric and imperial units:
        </p>
        <ul className="list-disc pl-6 space-y-1 text-sm text-stone-700">
          <li>1 kilogram (<strong>kilograms kg</strong>) = 1,000 grams (g)</li>
          <li>1 gram = 0.001 <strong>kilograms kg</strong></li>
          <li>1 ounce (oz) ≈ 28.3495 grams</li>
          <li>1 pound (lb) = 453.592 grams</li>
        </ul>

        <p>
          Whether you are calculating recipe ingredients or shipping weights, our interactive weight converter simplifies the math instantly.
        </p>
      </div>
    )
  },
  'temperature-converter': {
    intro: 'Convert temperatures between Celsius, Fahrenheit and Kelvin.',
    keywords: 'temperature converter, celsius to fahrenheit, fahrenheit to celsius, kelvin converter',
    how: [
      'Enter a temperature.',
      'Choose the source and target units.',
      'Review or export the converted value.'
    ],
    faq: [
      ['Are Celsius and Fahrenheit converted linearly?', 'Yes. Their relationship is linear, while Kelvin uses an absolute temperature scale.']
    ]
  },
  'time-converter': {
    intro: 'Convert seconds, minutes, hours and days for quick calculations and technical work.',
    keywords: 'time converter, seconds to minutes, hours to seconds, days to hours',
    how: [
      'Enter a value and source unit.',
      'Choose the target unit.',
      'Copy or export the converted result.'
    ],
    faq: []
  },
  'timezone-converter': {
    intro: 'Compare date and time across real IANA time zones instantly with daylight saving (DST) awareness, multi-zone comparison, and copy-all support.',
    keywords: 'time zone converter, global time zone converter, UTC to IST, IST to PST, IST to Pacific Time, IST to London, IST to Singapore, IST to Tokyo, New York to India time converter, Dubai to India time converter, Sydney to India time converter, DST time converter',
    how: [
      'Select your source time zone, date, and time.',
      'Check destination time zones to compare multiple locations simultaneously.',
      'Review converted times, daylight saving indicators, and relative hour offsets.',
      'Click "Copy All Results" to copy the formatted schedule to your clipboard.'
    ],
    faq: [
      ['How are daylight saving time (DST) changes handled?', 'The tool uses real IANA time zone identifiers (e.g. America/Los_Angeles, Europe/London, Australia/Sydney) so daylight saving changes are applied automatically according to your selected date.'],
      ['Can I compare multiple time zones at once?', 'Yes! You can select multiple destination time zones via checkboxes and compare them all against your source date and time.'],
      ['How do I copy all converted times?', 'Click the "Copy All Results" button to copy a neatly formatted summary of all converted time zones directly to your clipboard.'],
      ['Does this support major global city pairs?', 'Yes. Popular conversions include UTC to IST, IST to Pacific Time (PST/PDT), IST to London (GMT/BST), IST to Singapore, IST to Tokyo, New York to India, Dubai to India, and Sydney to India.']
    ]
  },
  'jpg-to-png': {
    intro: 'Convert JPG photos to PNG without uploading the image to a server.',
    keywords: 'jpg to png converter, jpeg to png, convert jpg png online',
    how: [
      'Choose a JPG image from your device.',
      'Convert it in your browser.',
      'Download the PNG file.'
    ],
    faq: [
      ['Is my image uploaded?', 'No. The conversion uses your browser canvas and creates the output locally.']
    ]
  },
  'png-to-jpg': {
    intro: 'Convert PNG images to JPG locally with a selectable quality setting.',
    keywords: 'png to jpg converter, convert png jpeg, png jpeg converter',
    how: [
      'Choose a PNG image.',
      'Select the JPG quality.',
      'Download the converted JPG.'
    ],
    faq: [
      ['Will transparency be preserved?', 'No. JPG does not support transparency, so transparent areas are rendered on a white background.']
    ]
  },
  'webp-to-jpg': {
    intro: 'Convert WebP images to widely compatible JPG files in your browser.',
    keywords: 'webp to jpg converter, convert webp jpeg, webp jpeg converter',
    how: [
      'Choose a WebP image.',
      'Select the JPG quality.',
      'Download the JPG file.'
    ],
    faq: []
  },
  'image-to-pdf': {
    intro: 'Convert JPG, PNG or WebP images into a simple PDF locally in your browser.',
    keywords: 'image to pdf converter, jpg to pdf, png to pdf, webp to pdf',
    how: [
      'Choose an image from your device.',
      'Preview the image and page size.',
      'Download the generated PDF.'
    ],
    faq: [
      ['Does the image leave my device?', 'No. The PDF is generated in your browser without an upload step.']
    ]
  },
  'xlsx-to-pdf': {
    intro: 'Turn XLSX worksheet cell data into a readable PDF without uploading the workbook.',
    keywords: 'xlsx to pdf converter, excel to pdf, spreadsheet to pdf online',
    how: [
      'Choose an XLSX workbook.',
      'The browser reads worksheet cell values locally.',
      'Download the generated PDF.'
    ],
    faq: [
      ['Does it preserve Excel formatting?', 'This lightweight browser converter preserves readable cell values and sheet names, but does not reproduce advanced Excel styling, formulas or charts.']
    ]
  },
  'image-resizer': {
    intro: 'Resize JPG, PNG and WebP images to exact dimensions in your browser.',
    keywords: 'image resizer, resize image online, jpg png webp resize',
    how: [
      'Choose an image.',
      'Set the target width and optional height.',
      'Choose the output format and download it.'
    ],
    faq: [
      ['Is aspect ratio preserved?', 'If you leave height blank, the original aspect ratio is preserved.']
    ]
  },
  'svg-to-png': {
    intro: 'Convert SVG markup into a PNG image directly in your browser.',
    keywords: 'svg to png converter, convert svg png online',
    how: [
      'Paste SVG markup.',
      'Choose a scale factor.',
      'Preview and download the PNG.'
    ],
    faq: [
      ['Is the SVG uploaded?', 'No. Rendering happens in your browser.']
    ]
  },
  'csv-to-pdf': {
    intro: 'Convert CSV rows into a simple readable PDF without uploading your data.',
    keywords: 'csv to pdf converter, convert csv pdf online',
    how: [
      'Paste CSV data.',
      'Review the rows.',
      'Download the generated PDF.'
    ],
    faq: [
      ['Does it preserve spreadsheet styling?', 'CSV has no styling information, so the PDF focuses on readable tabular text.']
    ]
  },
  'image-compressor': {
    title: 'Online Compressor & Size Compressor - Online MB Reducer',
    h1: 'Online Compressor & Size Compressor | Online MB Reducer',
    metaDescription: 'Free online compressor and size compressor tool. Reduce image and file size with this fast online mb reducer for smaller files.',
    intro: 'Use our online compressor and size compressor to reduce image and file size. Adjust compression settings to compress image files to a smaller target file size.',
    keywords: 'online compressor, size compressor, online mb reducer, reduce image, compress image',
    how: [
      'Upload a large file or image to the online compressor.',
      'Select your desired format and compression settings or compression levels.',
      'Click Compress & Download to save the compressed file with a significantly reduced file size.'
    ],
    faq: [
      ['How does file size limit compression work?', 'Most email providers impose a file size limit of 25 mb. Understanding how compression works allows you to adjust compression settings to produce smaller files that fit email attachments.'],
      ['Can I reduce video file size or compress video for email?', 'When sending video for email, video compression for video formats like mp4 mov reduces overall file size to pass under the 25 mb limit. For images, our image resizer and online mb reducer compress image bytes directly.'],
      ['Frequently asked questions about online compressor levels', 'Frequently asked questions include how to pick compression levels, how to target file size goals, and how a size compressor maintains visual quality on a large file.']
    ],
    article: (
      <div className="space-y-5">
        <h2 className="text-2xl font-bold text-stone-900">Complete Guide to File Compression & Online MB Reducer Tools</h2>
        <p>
          Managing digital media requires an efficient <strong>online compressor</strong> and <strong>size compressor</strong> to stay under strict attachment limits. Whether you need an <strong>online mb reducer</strong> to <strong>reduce image</strong> dimensions or want to know how <strong>compression works</strong> for documents and media, optimizing <strong>file size</strong> ensures smooth sharing.
        </p>

        <h3 className="text-lg font-bold text-stone-800">Bypassing Attachment Limits (e.g. 25 MB)</h3>
        <p>
          Major email providers impose a standard <strong>file size limit</strong> of <strong>25 mb</strong>. When attempting to attach a <strong>large file</strong> or send <strong>video for email</strong>, uncompressed <strong>video formats</strong> like <strong>mp4 mov</strong> often exceed quota. Performing <strong>video compression</strong> or applying image optimization helps <strong>reduce video file size</strong> and photo weights down to a <strong>target file size</strong>.
        </p>

        <h3 className="text-lg font-bold text-stone-800">Optimizing Compression Settings & Compression Levels</h3>
        <p>
          By adjusting your <strong>compression settings</strong> and selecting custom <strong>compression levels</strong>, you can create a <strong>compressed file</strong> that maintains clarity while delivering a dramatically <strong>reduced file size</strong>. You can also pair our compressor with an <strong>image resizer</strong> to adjust exact pixel dimensions before you <strong>compress image</strong> files for web deployment.
        </p>

        <div className="rounded-xl border border-stone-200 bg-stone-50 p-4">
          <h4 className="font-bold text-stone-900 mb-1">Frequently Asked Questions Summary</h4>
          <p className="text-xs text-stone-600">
            Read our <strong>frequently asked questions</strong> section above to learn more about how our <strong>size compressor</strong> and <strong>online mb reducer</strong> create <strong>smaller files</strong> locally in your browser.
          </p>
        </div>
      </div>
    )
  },
  'image-to-gif': {
    title: 'Image to GIF Maker - Convert Photos & Pictures to Animated GIF | OrbitBoard',
    h1: 'Image to GIF Maker | Convert Multiple Images to Animated GIF',
    metaDescription: 'Free online image to GIF maker. Combine multiple JPG, PNG, or WebP images into an animated GIF directly in your browser with speed and frame controls.',
    intro: 'Turn multiple photos or graphics into a smooth animated GIF directly in your browser. Adjust frame speed, resolution and loop settings locally with complete privacy.',
    keywords: 'image to gif, make gif from images, photo to gif maker, animated gif generator, convert png to gif',
    how: [
      'Select multiple JPG, PNG, or WebP images from your device or Google Drive.',
      'Adjust frame speed (delay in ms) and maximum output dimensions.',
      'Click Generate GIF to render the animation and download your GIF.'
    ],
    faq: [
      ['Are my images uploaded to any server?', 'No. All frame rendering and GIF89a encoding happen entirely inside your web browser using HTML5 Canvas.'],
      ['Can I use different image formats together?', 'Yes, you can mix JPG, PNG, and WebP images. They are automatically scaled and fitted into the animation canvas.']
    ],
    article: (
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-stone-900">Creating Animated GIFs from Images</h2>
        <p>Animated GIFs are ideal for product walkthroughs, social media teasers, memes, and visual tutorials. By combining sequential screenshots or photos, you can tell a quick visual story without requiring video players.</p>
      </div>
    )
  },
  'video-to-gif': {
    title: 'Video to GIF Maker - Convert MP4, WebM & MOV to GIF | OrbitBoard',
    h1: 'Video to GIF Maker | Convert Video Clips to Animated GIF',
    metaDescription: 'Free online video to GIF converter. Convert MP4, WebM, and MOV video clips into high quality animated GIFs directly in your browser with start and end time trimming.',
    intro: 'Convert video clips into lightweight, animated GIFs right in your browser. Trim playback times, adjust frame rate (FPS), and choose your target dimensions.',
    keywords: 'video to gif, mp4 to gif, convert video to gif, clip to gif maker, webm to gif',
    how: [
      'Upload an MP4, WebM, or MOV video file from your computer or Google Drive.',
      'Choose the start time, end time, and target frame rate (FPS).',
      'Click Convert Video to GIF and download the optimized GIF animation.'
    ],
    faq: [
      ['Is there a duration limit for video clips?', 'For best browser performance and lightweight GIF file sizes, clips between 1 to 10 seconds are recommended.'],
      ['Does Video to GIF work on mobile devices?', 'Yes, standard mobile video formats like MP4 and MOV recorded on iPhone or Android work smoothly in modern mobile browsers.']
    ],
    article: (
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-stone-900">Optimizing Video to GIF Conversion</h2>
        <p>GIF animations have a 256-color palette limit per frame. Trimming your video to the key action moments and selecting an optimal frame rate (8 to 12 FPS) produces the crispest result while keeping the file size small enough for quick sharing.</p>
      </div>
    )
  },
  'image-metadata-remover': {
    intro: 'Re-encode an image locally to help strip embedded metadata before sharing it.',
    keywords: 'remove image metadata, exif remover, strip photo metadata',
    how: [
      'Choose an image.',
      'Select the output format.',
      'Download the re-encoded copy.'
    ],
    faq: [
      ['Does this guarantee every metadata field is removed?', 'No. Browser image decoding and encoding can remove metadata, but this tool does not promise removal of every possible embedded field.']
    ]
  },
  'pdf-merge': {
    intro: 'Combine multiple PDF files into a single document without uploading them.',
    keywords: 'merge pdf, combine pdf files, pdf merger online',
    how: [
      'Select two or more PDF files in the order you want them merged.',
      'Click Merge PDFs.',
      'Download the combined document.'
    ],
    faq: [
      ['Are my PDFs uploaded?', 'No. The merge runs locally in your browser.'],
      ['Can encrypted PDFs be merged?', 'Some encrypted or malformed PDFs may not be supported by the browser PDF engine.']
    ]
  },
  'pdf-split': {
    intro: 'Split a PDF into separate one-page PDF files locally.',
    keywords: 'split pdf, split pdf into pages, pdf splitter online',
    how: [
      'Choose a PDF.',
      'Click Split into Pages.',
      'Download the individual page files.'
    ],
    faq: [
      ['Does splitting change the page content?', 'The tool copies each existing page into its own PDF.']
    ]
  },
  'pdf-extract-pages': {
    intro: 'Extract selected pages from a PDF into a new PDF document.',
    keywords: 'extract pdf pages, pdf page extractor, select pdf pages',
    how: [
      'Choose a PDF.',
      'Enter pages such as 1,3,5-7.',
      'Download the extracted PDF.'
    ],
    faq: [
      ['How do I select a range?', 'Use a hyphen, such as 5-7, and commas for separate pages.']
    ]
  },
  'pdf-reorder': {
    intro: 'Change the order of existing PDF pages without uploading the document.',
    keywords: 'reorder pdf pages, change pdf page order, pdf page organizer',
    how: [
      'Choose a PDF and load its page count.',
      'Enter the desired page order, such as 3,1,2,4.',
      'Download the reordered PDF.'
    ],
    faq: [
      ['Can I duplicate or remove pages?', 'This tool requires every page exactly once; use Extract PDF Pages when you need a subset.']
    ]
  },
  'pdf-to-jpg': {
    intro: 'Render PDF pages as JPG images directly in your browser.',
    keywords: 'pdf to jpg, convert pdf to jpg, pdf pages to jpg',
    how: [
      'Choose a PDF.',
      'Render the pages and review the previews.',
      'Download the JPG images.'
    ],
    faq: [
      ['Are pages uploaded?', 'No. Rendering happens locally in your browser.']
    ]
  },
  'pdf-to-png': {
    intro: 'Render PDF pages as PNG images directly in your browser.',
    keywords: 'pdf to png, convert pdf to png, pdf pages to png',
    how: [
      'Choose a PDF.',
      'Render the pages and review the previews.',
      'Download the PNG images.'
    ],
    faq: [
      ['Are pages uploaded?', 'No. Rendering happens locally in your browser.']
    ]
  },
  'pdf-workspace': {
    intro: 'A browser-based PDF page workspace for previewing, selecting, rotating, reordering and removing pages before export.',
    keywords: 'pdf page editor, pdf organizer, reorder delete rotate pdf pages',
    how: [
      'Open a PDF and wait for page previews.',
      'Select pages, rotate them or move them left and right.',
      'Delete selected pages and export the edited PDF.'
    ],
    faq: [
      ['Are the PDF pages uploaded?', 'No. The PDF is processed locally in your browser.'],
      ['Can I edit PDF text?', 'No. This workspace edits page structure; it does not modify text inside a page.']
    ]
  },
  'json-to-xml': {
    intro: 'Convert JSON objects into readable XML directly in your browser.',
    keywords: 'JSON to XML converter, JSON XML converter',
    how: [
      'Paste valid JSON.',
      'Convert it to XML.',
      'Copy or export the XML output.'
    ],
    faq: [
      ['Does it support every JSON structure?', 'It is designed for common objects and arrays; XML has different structural rules than JSON.']
    ]
  },
  'xml-to-json': {
    intro: 'Convert XML documents into JSON directly in your browser.',
    keywords: 'XML to JSON converter, XML JSON converter',
    how: [
      'Paste valid XML.',
      'Convert it to JSON.',
      'Copy or export the result.'
    ],
    faq: [
      ['Are XML attributes preserved?', 'This lightweight converter focuses on element structure rather than a complete XML schema mapping.']
    ]
  },
  'markdown-to-html': {
    intro: 'Convert basic Markdown headings, emphasis, code and lists into HTML locally.',
    keywords: 'Markdown to HTML converter, Markdown HTML',
    how: [
      'Paste Markdown.',
      'Convert it to HTML.',
      'Copy or export the HTML.'
    ],
    faq: [
      ['Does it support full CommonMark?', 'No. This lightweight browser converter covers common Markdown patterns.']
    ]
  },
  'csv-to-json': {
    intro: 'Convert simple CSV rows into a JSON array directly in your browser.',
    keywords: 'CSV to JSON converter, convert CSV to JSON online',
    how: [
      'Paste CSV with a header row.',
      'Convert the rows to JSON.',
      'Copy or export the JSON output.'
    ],
    faq: [
      ['Does it support quoted commas?', 'This lightweight version is intended for simple CSV data and does not implement every CSV dialect.']
    ]
  },
  'csv-to-xlsx': {
    intro: 'Convert CSV data into an Excel-compatible XLSX workbook directly in your browser.',
    keywords: 'CSV to XLSX converter, CSV to Excel, convert CSV to XLSX online',
    how: [
      'Paste CSV data or choose a CSV file.',
      'Convert the data into an XLSX workbook.',
      'Open the downloaded workbook in Excel, Google Sheets or another spreadsheet app.'
    ],
    faq: [
      ['Is the CSV uploaded?', 'No. The conversion runs locally in your browser.']
    ]
  },
  'json-to-xlsx': {
    intro: 'Convert a JSON array of objects into an Excel-compatible XLSX workbook locally.',
    keywords: 'JSON to XLSX converter, JSON to Excel, convert JSON to XLSX online',
    how: [
      'Paste a JSON array of objects.',
      'Convert the data into an XLSX workbook.',
      'Open the downloaded workbook in your spreadsheet app.'
    ],
    faq: [
      ['What JSON shape works best?', 'The tool is designed for a JSON array of objects, with object keys becoming spreadsheet columns.']
    ]
  },
  'xlsx-to-csv': {
    intro: 'Convert an XLSX workbook into CSV data directly in your browser.',
    keywords: 'XLSX to CSV converter, Excel to CSV, convert XLSX to CSV online',
    how: [
      'Choose an XLSX or XLS workbook.',
      'Convert the worksheet data to CSV.',
      'Copy or export the generated CSV.'
    ],
    faq: [
      ['What happens with multiple worksheets?', 'The output includes each worksheet as a separate labelled CSV section.']
    ]
  },
  'txt-to-pdf': {
    intro: 'Turn plain text into a simple PDF locally in your browser.',
    keywords: 'TXT to PDF, text to PDF converter, convert text file to PDF',
    how: [
      'Choose a TXT file or paste text.',
      'Click Convert to PDF.',
      'Download the generated PDF.'
    ],
    faq: [
      ['Is the text uploaded?', 'No. PDF generation happens in your browser.']
    ]
  },
  'pdf-to-text': {
    intro: 'Extract selectable text from PDF documents without uploading them.',
    keywords: 'PDF to text converter, extract text from PDF, PDF text extractor',
    how: [
      'Choose a PDF.',
      'Extract its selectable text.',
      'Copy or export the result.'
    ],
    faq: [
      ['Does it perform OCR?', 'No. Scanned image-only PDFs require OCR, which this browser tool does not provide.']
    ]
  },
  'diff-checker': {
    title: 'Code Compare Online Free - Side by Side Text Diff Checker',
    h1: 'Code Compare Online Free - Text & Code Diff Checker',
    metaDescription: 'Free code compare online free tool to compare two text files line by line and side by side with level highlight text diff checker.',
    intro: 'Perform code compare online free to compare two text files line by line or word level with our online diff checker and diff tool.',
    keywords: 'code compare online free, diff tool, text comparison, text diff, online diff checker',
    how: [
      'Paste original text into the left pane and changed text code into the right pane.',
      'Click the compare button to execute comparison runs.',
      'Review differences with level highlight line by line or side by side in unified view.'
    ],
    faq: [
      ['How does code compare online free work?', 'Our free online text diff checker compares original text and changed text code side by side or line by line locally in your browser when you press the compare button.'],
      ['Does this text compare tool support word level diffs and level highlight?', 'Yes. The diff tool identifies changes with clear level highlight features to contrast modified lines and word level differences between two text files.'],
      ['Frequently asked questions about comparison runs and text comparison', 'Frequently asked questions include whether comparison runs send code to a server (no, it runs 100% free online locally) and how to toggle unified view or side by side modes.']
    ],
    article: (
      <div className="space-y-5">
        <h2 className="text-2xl font-bold text-stone-900">Code Compare Online Free & Text Diff Tool Guide</h2>
        <p>
          Developers, writers, and code reviewers frequently need a fast <strong>code compare online free</strong> solution to <strong>compare two text files</strong>. Using an <strong>online diff checker</strong> allows you to inspect changes between your <strong>original text</strong> and updated <strong>text code</strong> without sending sensitive data to external servers.
        </p>

        <h3 className="text-lg font-bold text-stone-800">Line by Line and Side by Side Visual Comparison</h3>
        <p>
          Our <strong>text compare tool</strong> supports instant <strong>comparison runs</strong> when you click the <strong>compare button</strong>. It provides clear <strong>level highlight</strong> indicators so you can perform <strong>text comparison</strong> at the <strong>line by line</strong> or <strong>word level</strong>. You can switch between <strong>side by side</strong> layout or a <strong>unified view</strong> to review every <strong>text diff</strong> effortlessly.
        </p>

        <div className="rounded-xl border border-stone-200 bg-stone-50 p-4">
          <h4 className="font-bold text-stone-900 mb-1">Frequently Asked Questions Summary</h4>
          <p className="text-xs text-stone-600">
            Check our <strong>frequently asked questions</strong> section above for details on how this <strong>free online</strong> <strong>diff tool</strong> processes code and text comparisons.
          </p>
        </div>
      </div>
    )
  },
  'pdf-compressor': {
    intro: 'Optimize PDF structure directly in your browser and compare the resulting file size.',
    keywords: 'pdf compressor, compress pdf, optimize pdf online',
    how: [
      'Choose a PDF.',
      'Run the browser-side optimization.',
      'Compare the original and optimized file sizes.'
    ],
    faq: [
      ['Will every PDF become smaller?', 'No. Structural optimization can produce a smaller file, but some PDFs may stay similar or become larger.'],
      ['Does it recompress embedded images?', 'No. This lightweight version focuses on PDF structure rather than lossy image recompression.']
    ]
  },
  'percentage': {
    intro: 'Quickly calculate a percentage amount and the value after an increase.',
    keywords: 'percentage calculator, percentage increase calculator',
    how: [
      'Enter the base value.',
      'Enter the percentage.',
      'Review the percentage amount and increased value.'
    ],
    faq: []
  },
  'emi': {
    intro: 'Estimate monthly EMI, total interest and total repayment for a loan.',
    keywords: 'EMI calculator India, loan EMI calculator',
    how: [
      'Enter the loan amount.',
      'Enter annual interest rate.',
      'Enter the loan tenure.'
    ],
    faq: [
      ['Does EMI include all loan charges?', 'No. Processing fees, insurance and other charges may be separate.']
    ]
  },
  'gst': {
    intro: 'Calculate GST on an amount or extract GST from an inclusive price.',
    keywords: 'GST calculator India, GST inclusive calculator',
    how: [
      'Enter the amount and GST rate.',
      'Choose whether to add or extract GST.',
      'Review the pre-GST value, tax and inclusive amount.'
    ],
    faq: [
      ['Does this calculator decide the GST rate?', 'No. Use the rate applicable to your transaction and seek professional advice where needed.']
    ]
  },
  'compound-interest-calculator': {
    intro: 'See how a lump sum grows when interest is earned on both the principal and the interest already added.',
    keywords: 'compound interest calculator, compound interest calculator India, FD compound interest',
    how: [
      'Enter the initial amount you plan to invest.',
      'Enter the expected annual interest rate.',
      'Enter the time period in years and choose how often interest is compounded.'
    ],
    faq: [
      ['What is compound interest?', 'Compound interest is interest calculated on the principal plus any interest already earned, so growth accelerates over time.'],
      ['Does more frequent compounding always help?', 'More frequent compounding increases the effective annual rate, but the gain shrinks as the frequency rises.'],
      ['Are the results guaranteed?', 'No. The calculator assumes a fixed rate. Actual returns on savings, deposits and investments can vary.']
    ]
  },
  'fd-maturity-calculator': {
    intro: 'Check how much a fixed deposit will be worth at maturity, with interest compounded at the frequency your bank uses.',
    keywords: 'FD calculator, fixed deposit calculator India, FD maturity calculator, FD interest calculator',
    how: [
      'Enter the amount you plan to deposit.',
      'Enter the interest rate per year offered by the bank.',
      'Enter the tenure in years and months, then choose the compounding frequency. Most banks compound quarterly.'
    ],
    faq: [
      ['Do banks compound FD interest quarterly?', 'Many Indian banks compound fixed deposit interest quarterly, but this varies. Check the terms of your deposit.'],
      ['Is the maturity amount before or after TDS?', 'This calculator shows the amount before tax. TDS may be deducted on interest, which reduces the amount you receive.'],
      ['Are FD returns guaranteed?', 'The rate is fixed for the deposit term at most banks, but the actual maturity depends on the bank and terms you agreed to.']
    ]
  },
  'rd-maturity-calculator': {
    intro: 'Estimate how much a monthly recurring deposit will grow to by the end of its tenure.',
    keywords: 'RD calculator, recurring deposit calculator India, RD maturity calculator, RD interest calculator',
    how: [
      'Enter the amount you will deposit each month.',
      'Enter the interest rate per year offered by the bank.',
      'Enter the tenure in years and months, then choose the compounding frequency. Most banks compound quarterly.'
    ],
    faq: [
      ['How is RD interest calculated?', 'Each monthly instalment earns interest from the month it is paid until maturity. Banks use their own rounding, so the final amount may differ slightly.'],
      ['Why is my bank amount different?', 'Banks may calculate interest on a different basis, round each instalment, or apply penalties for missed payments. Check your bank statement for the exact figure.'],
      ['Is RD interest taxable?', 'Interest on recurring deposits is taxable as income at your slab rate. Banks deduct TDS at 10% when annual interest from a bank exceeds ₹40,000 (₹50,000 for senior citizens). Confirm current limits with your bank or a tax adviser.']
    ]
  },
  'loan-amortization-calculator': {
    intro: 'Understand your EMI, how much of each payment goes to interest, and how the balance falls each year.',
    keywords: 'loan amortization calculator, loan repayment schedule, EMI schedule India, home loan amortization',
    how: [
      'Enter the loan amount and the annual interest rate.',
      'Enter the loan tenure in years and months.',
      'Review the EMI and the yearly breakdown to see principal and interest paid over time.'
    ],
    faq: [
      ['Why do I pay more interest early in the loan?', 'Interest is charged on the outstanding balance. Early on the balance is high, so more of each EMI goes to interest.'],
      ['Does prepaying reduce interest?', 'Usually yes, because prepayments lower the balance that interest is charged on. Check whether your lender charges a prepayment fee.'],
      ['Are the figures exact for my lender?', 'This is a standard reducing-balance estimate. Your lender may round EMIs or apply different terms, so check your loan statement.']
    ]
  },
  'hra-exemption-calculator-india': {
    intro: 'Work out how much of your House Rent Allowance is exempt from tax under the old regime.',
    keywords: 'HRA exemption calculator, HRA calculator India, HRA tax exemption, house rent allowance calculator',
    how: [
      'Enter your annual basic salary and the HRA you receive each year.',
      'Enter the total rent you paid in the year.',
      'Choose whether you live in a metro city. The exemption is calculated from the lowest of three limits.'
    ],
    faq: [
      ['Which cities count as metro for HRA?', 'For HRA purposes, Delhi, Mumbai, Kolkata and Chennai are metro cities. Other cities count as non-metro.'],
      ['Can I claim HRA under the new tax regime?', 'No. HRA exemption applies under the old tax regime. Under the new regime it is not available.'],
      ['Do I need rent receipts?', 'Yes. Keep rent receipts and, if annual rent exceeds a set amount, your landlord’s PAN. Your employer may ask for these.']
    ]
  },
  'saas-retention-calculator': {
    intro: 'Measure how well your recurring revenue holds up over a year, and whether your acquisition spend pays back.',
    keywords: 'SaaS retention calculator, net revenue retention calculator, NRR calculator, gross revenue retention, LTV CAC calculator, CAC payback calculator, SaaS churn calculator',
    how: [
      'Enter your starting monthly recurring revenue (MRR) and the expansion, downgrade and churned MRR over 12 months.',
      'Enter the number of customers you started with, how many churned, and your acquisition spend and new customers over the same period.',
      'Enter average monthly revenue per customer and gross margin. Review the ratings, which are rough guides rather than targets.'
    ],
    faq: [
      ['What is net revenue retention?', 'Net revenue retention (NRR) is the revenue you keep from existing customers, including expansion, after downgrades and churn. Above 100% means existing customers grow your revenue on their own.'],
      ['How is gross revenue retention different?', 'Gross revenue retention (GRR) ignores expansion and only counts what you keep after downgrades and churn. It can never exceed 100%.'],
      ['Why does LTV show a dash?', 'Lifetime value depends on churn. If no customers churned, the implied lifetime is infinite, so the calculator does not show a number.']
    ]
  },
  'sales-pipeline-forecaster': {
    intro: 'Estimate the revenue your open deals are likely to produce, and how far you are from your target.',
    keywords: 'sales pipeline calculator, weighted pipeline calculator, pipeline coverage ratio, sales forecast calculator, win rate calculator',
    how: [
      'For each stage, enter the number of open deals, the average deal value and your estimated win rate.',
      'Enter your sales target for the period.',
      'Review the weighted pipeline, coverage and the gap. Update the win rates as deals move forward.'
    ],
    faq: [
      ['What is a weighted pipeline?', 'A weighted pipeline multiplies each deal by the chance it closes, so early-stage deals count for less than late-stage ones.'],
      ['What is pipeline coverage?', 'Coverage is total open pipeline divided by target. A common rule of thumb is about 3x, but the right level depends on your win rates and sales cycle.'],
      ['Where should win rates come from?', 'Use your own history by stage where you have it. Rates from general benchmarks are only a starting point.']
    ]
  },
  'saas-pricing-calculator': {
    intro: 'Compare how per-seat, flat, tiered and usage-based pricing would bill a typical customer.',
    keywords: 'SaaS pricing calculator, per seat pricing calculator, tiered pricing calculator, usage based pricing, annual discount calculator SaaS',
    how: [
      'Enter the seats and customer count for a typical customer, along with the annual discount you offer.',
      'Enter the price for each model: per seat, flat plan, the two volume tiers, and usage pricing.',
      'Compare the monthly price, annual price and MRR for each model, then choose the one that matches how customers use the product.'
    ],
    faq: [
      ['Which pricing model is best for SaaS?', 'There is no single best model. Per-seat pricing suits products used by many people, flat plans suit small teams, and usage pricing suits products where consumption varies.'],
      ['How does graduated tier pricing work?', 'Seats in the first tier are billed at the first price, and seats above it are billed at the later price. Only the seats in each band pay that band\'s rate.'],
      ['Does the annual discount change MRR?', 'No. MRR is the monthly figure, so it is calculated before any annual discount. The annual price shows what a customer pays for a year.']
    ]
  },
  'invoice-aging-report': {
    intro: 'See which invoices are outstanding, how long they have been overdue, and which customers owe the most, without building an ageing sheet by hand.',
    keywords: 'invoice aging report, accounts receivable aging, AR aging calculator, outstanding invoices report, debtors ageing, receivables report India',
    how: [
      'Download the template, or list your invoices with an invoice number, customer, amount, amount paid and due date.',
      'Upload the CSV, or edit the rows directly. Dates can be YYYY-MM-DD or DD/MM/YYYY.',
      'Choose the "as of" date and read the buckets, the overdue total and the largest balances.'
    ],
    faq: [
      ['Is my data uploaded anywhere?', 'No. The CSV is read in your browser and is not sent to a server.'],
      ['Why does a row say it was skipped?', 'The amount is missing or not a positive number, or there is no readable due date. The message names the invoice so you can fix it.'],
      ['Can I use an Excel file?', 'Save it as CSV first (File, then Save As or Download, then Comma-separated values). Excel files are not read directly.']
    ]
  },
  'weighted-decision-matrix': {
    intro: 'Compare vendors, candidates or options on the criteria that matter, with each criterion weighted by its importance.',
    keywords: 'weighted decision matrix, decision matrix template, vendor selection scoring, weighted scoring model, options comparison spreadsheet',
    how: [
      'Download the template, or list your criteria with a weight, then one column per option.',
      'Score each option from 0 to 10 for each criterion. Upload the CSV, or enter the scores directly.',
      'Read the ranking. Change the weights to see whether the winner depends on one criterion.'
    ],
    faq: [
      ['How are the weights used?', 'Each score is multiplied by its weight, the results are added up, and the total is divided by the sum of the weights. Only the relative sizes of the weights matter.'],
      ['What if a score is missing?', 'A missing score counts as zero and the tool tells you which option it affects.'],
      ['Does this choose the best option for me?', 'No. It makes your priorities explicit. The scores still reflect your judgement, so check them before deciding.']
    ]
  },
  'gif-maker': {
    intro: 'Turn a set of photos or screenshots into a looping animated GIF, right in your browser. Nothing is uploaded, so your images stay on your device.',
    keywords: 'GIF maker, make GIF from images, image to GIF, animated GIF creator, photos to GIF online free',
    how: [
      'Choose two to sixty images. They play in the order you selected them.',
      'Set the frame time in seconds and the square size in pixels. Smaller sizes give smaller files.',
      'Pick how images fit the frame: fit keeps the whole picture, crop fills the square, and stretch fills it and may distort.',
      'Create the GIF, check the preview, then download it.'
    ],
    faq: [
      ['Are my images uploaded?', 'No. The images are combined in your browser, and the GIF is made on your device.'],
      ['Why does my GIF look different from my photos?', 'GIF uses a limited palette of colours, so photos can look grainy. Fit and crop change how each picture sits in the frame.'],
      ['Why is the GIF big?', 'Larger sizes, more frames and photos with lots of detail all increase the file size. Reduce the size or number of images to make it smaller.']
    ]
  },
  'sip': {
    intro: 'Estimate how regular monthly SIP contributions could grow at an assumed annual return.',
    keywords: 'SIP calculator India, mutual fund SIP calculator',
    how: [
      'Enter monthly SIP amount.',
      'Enter an assumed annual return.',
      'Choose the investment period.'
    ],
    faq: [
      ['Are SIP returns guaranteed?', 'No. Mutual fund returns are market-linked and can vary.']
    ]
  },
  'json-formatter': {
    intro: 'Format and validate JSON directly in your browser.',
    keywords: 'JSON formatter, JSON validator, JSON beautifier online',
    how: [
      'Paste JSON into the editor.',
      'Choose Format or Minify.',
      'Fix any validation error shown by the tool.'
    ],
    faq: [
      ['Is my JSON uploaded?', 'The formatter operates in the browser, so the tool does not need to send your JSON to a server.']
    ]
  },
  'json-to-csv': {
    intro: 'Convert an array of JSON objects into CSV for spreadsheets and data workflows.',
    keywords: 'JSON to CSV converter, JSON array to CSV',
    how: [
      'Paste a JSON array of objects.',
      'Review the generated CSV.',
      'Copy the CSV into your spreadsheet or data workflow.'
    ],
    faq: [
      ['Can it convert nested JSON?', 'Nested values are represented as JSON text; the tool is designed primarily for flat arrays.']
    ]
  },
  'base64': {
    intro: 'Encode text to Base64 or decode Base64 back into readable text.',
    keywords: 'Base64 encoder decoder online',
    how: [
      'Enter text or Base64.',
      'Choose Encode or Decode.',
      'Copy the result.'
    ],
    faq: [
      ['Is Base64 encryption?', 'No. Base64 is an encoding format, not encryption.']
    ]
  },
  'jwt-decoder': {
    intro: 'Inspect the header and payload of a JWT without sending the token to a server.',
    keywords: 'JWT decoder, decode JWT online',
    how: [
      'Paste the JWT.',
      'Review its header and payload.',
      'Remember that decoding does not verify the signature.'
    ],
    faq: [
      ['Does decoding validate a JWT?', 'No. This tool only decodes the token contents and does not verify its signature.']
    ]
  },
  'unix-timestamp': {
    intro: 'Convert Unix timestamps to UTC dates and convert date/time values back to Unix seconds.',
    keywords: 'Unix timestamp converter, epoch converter',
    how: [
      'Enter a Unix timestamp or date/time.',
      'Review the converted value.',
      'Use the result in your application or workflow.'
    ],
    faq: [
      ['What unit does the tool use?', 'The calculator uses Unix time in seconds.']
    ]
  },
  'uuid-generator': {
    intro: 'Generate random UUID v4 identifiers in your browser.',
    keywords: 'UUID generator, UUID v4 generator online',
    how: [
      'Choose how many UUIDs you need.',
      'Generate the identifiers.',
      'Copy them into your application or dataset.'
    ],
    faq: [
      ['What UUID version is generated?', 'The tool uses the browser crypto API to generate random UUID v4 identifiers.']
    ]
  },
  'url-encoder': {
    intro: 'Encode or decode URL components when building links, API requests and query strings.',
    keywords: 'URL encoder decoder, URL encode online',
    how: [
      'Enter a URL component or encoded text.',
      'Choose Encode or Decode.',
      'Copy the converted value.'
    ],
    faq: [
      ['Does this encode an entire URL?', 'It uses component encoding, which is useful for query parameters and individual URL values.']
    ]
  },
  'gratuity-calculator': {
    intro: 'Estimate gratuity from last drawn wages and service duration using the common 15/26 formula.',
    keywords: 'gratuity calculator India, gratuity calculation, gratuity amount calculator',
    how: [
      'Enter your last drawn basic salary/wages and applicable dearness allowance.',
      'Enter completed years and additional months of service.',
      'Review the estimated gratuity and eligibility note.'
    ],
    faq: [
      ['What is the common gratuity formula?', 'For a monthly-rated employee under the traditional formula, gratuity is calculated as last drawn wages × 15 ÷ 26 × eligible years of service.'],
      ['Is five years always required?', 'Ordinary cases generally use five years of continuous service, while the Code on Social Security provides a one-year rule for eligible fixed-term employees.']
    ],
    article: (
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-stone-900">Gratuity and Notice Period Timeline Planning</h2>
        <p>
          When leaving a company after serving five or more years, you become eligible for gratuity payout. Before serving your written notice, check your contract and calculate your final exit date.
        </p>
        <p>
          Use our <Link to="/tools/notice-period" className="text-accent-700 underline font-semibold">Notice Period Calculator</Link> to accurately determine your last working day.
        </p>
      </div>
    )
  },
  'income-tax-india': {
    intro: 'Estimate Indian individual income tax for AY 2026-27 using the current slabs, standard deduction, rebate and health & education cess.',
    keywords: 'income tax calculator India FY 2026-27, AY 2026-27 tax calculator, new tax regime calculator',
    how: [
      'Enter annual gross income and any additional deductions relevant to your selected regime.',
      'Choose the new or old tax regime and age band.',
      'Review estimated tax, rebate, surcharge and cess.'
    ],
    faq: [
      ['Which year is used?', 'The calculator uses AY 2026-27 individual slab rates and related rebate/cess settings.'],
      ['Is this a tax-return calculator?', 'No. It is a simplified estimator and does not model every exemption, deduction, special-rate income or payroll component.']
    ]
  },
  'income-tax-global': {
    intro: 'Estimate income tax across major economies using current 2026 or 2026-27 published federal/national rates.',
    keywords: 'global income tax calculator, worldwide tax calculator, US UK Canada Australia Singapore Germany Japan UAE tax calculator',
    how: [
      'Select a country.',
      'Enter the annual income in that country’s currency.',
      'Review estimated income tax and the effective rate, then read the country-specific scope note.'
    ],
    faq: [
      ['Does this include every local tax?', 'No. Several countries have state, provincial, local, social-security or other taxes that are intentionally excluded.'],
      ['Can I use this for filing?', 'No. It is a comparison and estimation tool, not a tax filing service.']
    ]
  },
  'pdf-e-sign': {
    intro: 'Add a visible typed signature to a PDF locally in your browser and download the signed copy.',
    keywords: 'PDF e sign, sign PDF online, electronic signature PDF, add signature to PDF',
    how: [
      'Choose a PDF.',
      'Enter the signature name, page, position and size.',
      'Add the signature and download the new PDF.'
    ],
    faq: [
      ['Is this a digital certificate signature?', 'No. This tool adds a visible signature mark to the document; it is not a cryptographic certificate-based digital signature.'],
      ['Is the PDF uploaded?', 'No. The PDF is processed locally in your browser.']
    ]
  },
  'password-generator': {
    intro: 'Generate cryptographically secure passwords with custom lengths, character sets, and entropy strength calculation directly in your browser.',
    keywords: 'password generator, strong password generator, random password generator online, secure password generator, password entropy calculator',
    how: [
      'Select your desired password length (8 to 64 characters).',
      'Toggle character options including uppercase, lowercase, numbers, symbols, or exclude ambiguous characters.',
      'Click Generate Password to create a new secure password.',
      'Copy the generated password to your clipboard or check its calculated entropy bits.'
    ],
    faq: [
      ['Are generated passwords stored or sent to a server?', 'No. Passwords are generated 100% locally in your browser using the Web Crypto API (`window.crypto.getRandomValues`). Nothing is transmitted or saved.'],
      ['What is password entropy?', 'Password entropy is a mathematical measure of a password\'s randomness and resistance to brute-force attacks, measured in bits.'],
      ['Why exclude ambiguous characters?', 'Ambiguous characters like 1, l, I, 0, O can easily be mistaken for one another when typed manually or printed. Excluding them prevents transcription errors.']
    ],
    article: (
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-stone-900 dark:text-stone-100">Secure Password Generation & Entropy Guide</h2>
        <p>
          Creating strong, unpredictable passwords is one of the most fundamental steps in protecting online accounts against brute-force and dictionary attacks.
        </p>
        <p>
          Our <strong>Password Generator</strong> utilizes the browser's native cryptographic engine (<code>window.crypto.getRandomValues</code>) to ensure high randomness without relying on server-side processing or external network requests.
        </p>
      </div>
    )
  }
};
