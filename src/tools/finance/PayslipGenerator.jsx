import { useExportFeedback } from '../../lib/feedback/useTaskFeedback';
import { useState, useMemo, useCallback } from 'react';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import * as XLSX from 'xlsx';
import { FileSpreadsheet, FileText, Building2, User, DollarSign } from 'lucide-react';
import { calculatePayslip } from './payslipEngine.js';
import { formatINR, money, formatDownloadFilename, downloadBlob } from '../../lib/toolFormat.js';

function sanitizeForPdf(text) {
  return String(text || '')
    .replace(/₹/g, 'Rs. ')
    .replace(/[^\x20-\x7E\n]/g, '');
}

export function PayslipGenerator() {
  const feedback = useExportFeedback('spreadsheet');
  // Company details
  const [companyName, setCompanyName] = useState('Acme Technologies Pvt Ltd');
  const [companyAddress, setCompanyAddress] = useState('Tech Park, Outer Ring Road, Bengaluru, Karnataka 560103');
  const [payPeriod, setPayPeriod] = useState('October 2026');

  // Employee details
  const [empName, setEmpName] = useState('Rahul Sharma');
  const [empId, setEmpId] = useState('EMP-2045');
  const [designation, setDesignation] = useState('Senior Software Engineer');
  const [department, setDepartment] = useState('Technology');
  const [doj, setDoj] = useState('2023-04-10');
  const [pan, setPan] = useState('ABCDE1234F');
  const [uan, setUan] = useState('101234567890');
  const [bankName, setBankName] = useState('HDFC Bank');
  const [accountNo, setAccountNo] = useState('50100234567890');

  // Salary & Attendance inputs
  const [annualCtc, setAnnualCtc] = useState('1200000');
  const [basicPct, setBasicPct] = useState('40');
  const [hraPct, setHraPct] = useState('50');
  const [daysInMonth, setDaysInMonth] = useState('30');
  const [paidDays, setPaidDays] = useState('30');
  const [capPf, setCapPf] = useState(true);
  const [regime, setRegime] = useState('new');
  const [state, setState] = useState('Karnataka');
  const [customTds, setCustomTds] = useState('');
  const [hasDisability, setHasDisability] = useState(false);

  // Computed results
  const slip = useMemo(() => {
    return calculatePayslip({
      annualCtc: Number(annualCtc) || 0,
      basicPct: Number(basicPct) || 40,
      hraPct: Number(hraPct) || 50,
      daysInMonth: Number(daysInMonth) || 30,
      paidDays: Number(paidDays) || 30,
      capPf,
      regime,
      state,
      customTds: customTds === '' ? null : Number(customTds),
      hasDisability,
      employee: {
        name: empName,
        id: empId,
        designation,
        department,
        dateOfJoining: doj,
        pan,
        uan,
        bankName,
        accountNumber: accountNo,
      },
      company: {
        name: companyName,
        address: companyAddress,
        monthYear: payPeriod,
      },
    });
  }, [
    annualCtc, basicPct, hraPct, daysInMonth, paidDays, capPf,
    regime, state, customTds, hasDisability,
    empName, empId, designation, department, doj, pan, uan, bankName, accountNo,
    companyName, companyAddress, payPeriod,
  ]);

  // Export to PDF using pdf-lib
  const handleExportPDF = useCallback(async () => {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595, 842]); // A4
    const { width, height } = page.getSize();

    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const fontReg = await pdfDoc.embedFont(StandardFonts.Helvetica);

    const primaryColor = rgb(0.12, 0.23, 0.38); // Deep Navy
    const lightBg = rgb(0.96, 0.97, 0.98);
    const darkText = rgb(0.1, 0.1, 0.1);
    const mutedText = rgb(0.4, 0.4, 0.4);
    const borderCol = rgb(0.85, 0.85, 0.85);

    const drawLeft = (txt, x, y, font, size, col) => {
      const s = sanitizeForPdf(txt);
      if (!s) return;
      page.drawText(s, { x, y, font, size, color: col });
    };

    const drawRight = (txt, rightX, y, font, size, col) => {
      const s = sanitizeForPdf(txt);
      if (!s) return;
      const textWidth = font.widthOfTextAtSize(s, size);
      page.drawText(s, { x: rightX - textWidth, y, font, size, color: col });
    };

    // Header Band
    page.drawRectangle({ x: 30, y: height - 100, width: width - 60, height: 70, color: primaryColor });
    drawLeft(slip.company.name, 45, height - 55, fontBold, 16, rgb(1, 1, 1));
    drawLeft(slip.company.address, 45, height - 72, fontReg, 8.5, rgb(0.85, 0.9, 0.95));
    drawRight(`PAYSLIP FOR ${slip.company.monthYear.toUpperCase()}`, width - 45, height - 60, fontBold, 11, rgb(1, 0.8, 0.2));

    // Employee & Attendance Info Grid
    const infoTop = height - 120;
    page.drawRectangle({ x: 30, y: infoTop - 90, width: width - 60, height: 90, color: lightBg, borderColor: borderCol, borderWidth: 1 });

    const col1 = 45;
    const col2 = 180;
    const col3 = 330;
    const col4 = 460;

    let rowY = infoTop - 20;
    drawLeft('Employee Name:', col1, rowY, fontBold, 9, darkText);
    drawLeft(slip.employee.name, col2, rowY, fontReg, 9, darkText);
    drawLeft('Employee ID:', col3, rowY, fontBold, 9, darkText);
    drawLeft(slip.employee.id, col4, rowY, fontReg, 9, darkText);

    rowY -= 18;
    drawLeft('Designation:', col1, rowY, fontBold, 9, darkText);
    drawLeft(slip.employee.designation, col2, rowY, fontReg, 9, darkText);
    drawLeft('Department:', col3, rowY, fontBold, 9, darkText);
    drawLeft(slip.employee.department, col4, rowY, fontReg, 9, darkText);

    rowY -= 18;
    drawLeft('Date of Joining:', col1, rowY, fontBold, 9, darkText);
    drawLeft(slip.employee.dateOfJoining, col2, rowY, fontReg, 9, darkText);
    drawLeft('Attendance:', col3, rowY, fontBold, 9, darkText);
    drawLeft(`${slip.paidDays} / ${slip.daysInMonth} Days (LOP: ${slip.lopDays})`, col4, rowY, fontReg, 9, darkText);

    rowY -= 18;
    drawLeft('Bank / Account:', col1, rowY, fontBold, 9, darkText);
    drawLeft(`${slip.employee.bankName} - ${slip.employee.accountNumber}`, col2, rowY, fontReg, 9, darkText);
    drawLeft('PAN / UAN:', col3, rowY, fontBold, 9, darkText);
    drawLeft(`${slip.employee.pan} / ${slip.employee.uan}`, col4, rowY, fontReg, 9, darkText);

    // Earnings & Deductions Tables
    const tableTop = infoTop - 110;
    const halfWidth = (width - 70) / 2;

    // Headers
    page.drawRectangle({ x: 30, y: tableTop - 22, width: halfWidth, height: 22, color: primaryColor });
    page.drawRectangle({ x: 40 + halfWidth, y: tableTop - 22, width: halfWidth, height: 22, color: primaryColor });
    drawLeft('EARNINGS', 40, tableTop - 15, fontBold, 10, rgb(1, 1, 1));
    drawRight('AMOUNT (INR)', 30 + halfWidth - 10, tableTop - 15, fontBold, 9, rgb(1, 1, 1));
    drawLeft('DEDUCTIONS', 50 + halfWidth, tableTop - 15, fontBold, 10, rgb(1, 1, 1));
    drawRight('AMOUNT (INR)', width - 40, tableTop - 15, fontBold, 9, rgb(1, 1, 1));

    const earnings = [
      ['Basic Salary', slip.basic],
      ['House Rent Allowance (HRA)', slip.hra],
      ['Special & Other Allowances', slip.allowances],
    ];

    const deductions = [
      ['Provident Fund (EPF)', slip.employeePf],
      ['Employee State Insurance (ESI)', slip.employeeEsi],
      ['Professional Tax (PT)', slip.professionalTax],
      ['Tax Deducted at Source (TDS)', slip.tds],
    ];

    let tY = tableTop - 40;
    const maxRows = Math.max(earnings.length, deductions.length);
    for (let i = 0; i < maxRows; i++) {
      if (earnings[i]) {
        drawLeft(earnings[i][0], 40, tY, fontReg, 9, darkText);
        drawRight(`Rs. ${money(earnings[i][1])}`, 30 + halfWidth - 10, tY, fontReg, 9, darkText);
      }
      if (deductions[i]) {
        drawLeft(deductions[i][0], 50 + halfWidth, tY, fontReg, 9, darkText);
        drawRight(`Rs. ${money(deductions[i][1])}`, width - 40, tY, fontReg, 9, darkText);
      }
      page.drawLine({
        start: { x: 30, y: tY - 6 },
        end: { x: width - 30, y: tY - 6 },
        thickness: 0.5,
        color: borderCol,
      });
      tY -= 22;
    }

    // Totals row
    tY -= 5;
    page.drawRectangle({ x: 30, y: tY - 8, width: halfWidth, height: 24, color: lightBg });
    page.drawRectangle({ x: 40 + halfWidth, y: tY - 8, width: halfWidth, height: 24, color: lightBg });
    drawLeft('Total Earnings', 40, tY, fontBold, 9.5, darkText);
    drawRight(`Rs. ${money(slip.monthlyGross)}`, 30 + halfWidth - 10, tY, fontBold, 9.5, darkText);
    drawLeft('Total Deductions', 50 + halfWidth, tY, fontBold, 9.5, darkText);
    drawRight(`Rs. ${money(slip.totalDeductions)}`, width - 40, tY, fontBold, 9.5, darkText);

    // Net Pay Highlight Box
    tY -= 45;
    page.drawRectangle({ x: 30, y: tY - 30, width: width - 60, height: 50, color: rgb(0.92, 0.96, 0.93), borderColor: rgb(0.2, 0.6, 0.3), borderWidth: 1.5 });
    drawLeft('NET SALARY TAKE-HOME', 45, tY - 2, fontBold, 11, rgb(0.1, 0.45, 0.2));
    drawRight(`Rs. ${money(slip.netSalary)}`, width - 45, tY - 4, fontBold, 15, rgb(0.1, 0.45, 0.2));
    drawLeft(`Amount in Words: ${slip.netSalaryInWords}`, 45, tY - 22, fontReg, 8.5, darkText);

    // Employer Contributions Note
    tY -= 55;
    drawLeft('Statutory Employer Contributions:', 30, tY, fontBold, 8.5, mutedText);
    drawLeft(`Employer EPF: Rs. ${money(slip.employerPf)}  |  Employer ESI: Rs. ${money(slip.employerEsi)}  |  Tax Regime: ${regime.toUpperCase()}`, 30, tY - 14, fontReg, 8, mutedText);

    // Footer & Signatory
    const footerY = 60;
    page.drawLine({ start: { x: 30, y: footerY + 50 }, end: { x: width - 30, y: footerY + 50 }, thickness: 1, color: borderCol });
    drawLeft('This is a computer-generated document and does not require a physical signature.', 30, footerY + 30, fontReg, 8, mutedText);
    drawRight('Authorized Signatory', width - 45, footerY + 15, fontBold, 9, darkText);
    drawRight(slip.company.name, width - 45, footerY, fontReg, 8, mutedText);

    const pdfBytes = await pdfDoc.save();
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    downloadBlob(blob, formatDownloadFilename('payslip-generator', 'pdf'), 'payslip-generator');
  }, [slip, regime]);

  // Export to Excel using SheetJS (xlsx)
  const handleExportExcel = useCallback(() => {
    const wb = XLSX.utils.book_new();

    const data = [
      ['WORKORBIT SALARY PAYSLIP'],
      ['Company Name', slip.company.name],
      ['Company Address', slip.company.address],
      ['Pay Period', slip.company.monthYear],
      [],
      ['EMPLOYEE DETAILS'],
      ['Employee Name', slip.employee.name, 'Employee ID', slip.employee.id],
      ['Designation', slip.employee.designation, 'Department', slip.employee.department],
      ['Date of Joining', slip.employee.dateOfJoining, 'PAN', slip.employee.pan],
      ['Bank Name', slip.employee.bankName, 'Account Number', slip.employee.accountNumber],
      ['Total Days', slip.daysInMonth, 'Paid Days', slip.paidDays],
      ['Loss of Pay Days', slip.lopDays, 'UAN', slip.employee.uan],
      [],
      ['EARNINGS', 'AMOUNT (INR)', 'DEDUCTIONS', 'AMOUNT (INR)'],
      ['Basic Salary', slip.basic, 'Provident Fund (EPF)', slip.employeePf],
      ['House Rent Allowance (HRA)', slip.hra, 'Employee State Insurance (ESI)', slip.employeeEsi],
      ['Special Allowances', slip.allowances, 'Professional Tax (PT)', slip.professionalTax],
      ['', '', 'Tax Deducted at Source (TDS)', slip.tds],
      [],
      ['TOTAL EARNINGS (GROSS)', slip.monthlyGross, 'TOTAL DEDUCTIONS', slip.totalDeductions],
      ['NET TAKE-HOME SALARY', slip.netSalary],
      ['NET SALARY IN WORDS', slip.netSalaryInWords],
      [],
      ['EMPLOYER CONTRIBUTIONS (STATUTORY)'],
      ['Employer EPF Contribution', slip.employerPf],
      ['Employer ESI Contribution', slip.employerEsi],
      ['Tax Regime Applied', regime === 'new' ? 'New Tax Regime (Section 115BAC)' : 'Old Tax Regime'],
    ];

    const ws = XLSX.utils.aoa_to_sheet(data);
    ws['!cols'] = [{ wch: 28 }, { wch: 22 }, { wch: 28 }, { wch: 22 }];
    XLSX.utils.book_append_sheet(wb, ws, 'Payslip');

    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    downloadBlob(blob, formatDownloadFilename('payslip-generator', 'xlsx'), 'payslip-generator');
  }, [slip, regime]);

  return (
    <div className="space-y-8">
      {/* Workspace Controls & Action Buttons */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl bg-white dark:bg-stone-900 border border-[var(--orbit-border)] shadow-xs">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-accent-100 text-accent-800 dark:bg-accent-900/60 dark:text-accent-300">
          <Building2 className="w-3.5 h-3.5 text-accent-600 dark:text-accent-400" />
          Indian Statutory Payroll
        </div>
        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <button
            type="button"
            disabled={feedback.busy} onClick={() => feedback.run(handleExportPDF, 'pdf')}
            className="orbit-feedback-button flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl bg-accent-600 hover:bg-accent-700 text-white font-semibold text-xs sm:text-sm shadow-xs transition-colors cursor-pointer"
          >
            <FileText className="w-4 h-4" />
            Download PDF
          </button>
          <button
            type="button"
            disabled={feedback.busy} onClick={() => feedback.run(handleExportExcel, 'xlsx')}
            className="orbit-feedback-button flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs sm:text-sm shadow-xs transition-colors cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Download Excel
          </button>
        </div>
      </div>

      {/* Main Grid: Form Inputs (Left) and Live Payslip Preview (Right) */}
      <div className="grid lg:grid-cols-12 gap-6 sm:gap-8">
        {/* Left Column: Form Configuration */}
        <div className="lg:col-span-6 space-y-6">
          {/* Salary & Attendance Section */}
          <div className="p-5 rounded-2xl bg-white dark:bg-stone-900 border border-[var(--orbit-border)] space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-accent-700 dark:text-accent-400 flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              Salary & Attendance Parameters
            </h3>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300">
                  Annual CTC (₹)
                </label>
                <input
                  type="number"
                  value={annualCtc}
                  onChange={e => setAnnualCtc(e.target.value)}
                  className="orbit-control mt-1.5 w-full rounded-xl border border-[var(--orbit-border)] bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 outline-none focus:border-accent-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300">
                  Basic Salary (% of CTC)
                </label>
                <input
                  type="number"
                  value={basicPct}
                  onChange={e => setBasicPct(e.target.value)}
                  className="orbit-control mt-1.5 w-full rounded-xl border border-[var(--orbit-border)] bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 outline-none focus:border-accent-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300">
                  HRA (% of Basic)
                </label>
                <input
                  type="number"
                  value={hraPct}
                  onChange={e => setHraPct(e.target.value)}
                  className="orbit-control mt-1.5 w-full rounded-xl border border-[var(--orbit-border)] bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 outline-none focus:border-accent-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300">
                  Custom Monthly TDS (Optional)
                </label>
                <input
                  type="number"
                  placeholder="Auto from tax slabs"
                  value={customTds}
                  onChange={e => setCustomTds(e.target.value)}
                  className="orbit-control mt-1.5 w-full rounded-xl border border-[var(--orbit-border)] bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 outline-none focus:border-accent-500"
                />
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300">
                  Month Days
                </label>
                <input
                  type="number"
                  value={daysInMonth}
                  onChange={e => setDaysInMonth(e.target.value)}
                  className="orbit-control mt-1.5 w-full rounded-xl border border-[var(--orbit-border)] bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 outline-none focus:border-accent-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300">
                  Paid / Present Days
                </label>
                <input
                  type="number"
                  value={paidDays}
                  onChange={e => setPaidDays(e.target.value)}
                  className="orbit-control mt-1.5 w-full rounded-xl border border-[var(--orbit-border)] bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 outline-none focus:border-accent-500"
                />
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4 pt-2">
              <label className="rounded-xl border border-[var(--orbit-border)] bg-stone-50 dark:bg-stone-800 p-3 flex items-center justify-between cursor-pointer">
                <span className="text-xs font-medium text-stone-800 dark:text-stone-200">
                  Cap EPF at ₹1,800/mo
                </span>
                <input
                  type="checkbox"
                  checked={capPf}
                  onChange={e => setCapPf(e.target.checked)}
                  className="w-4 h-4 rounded text-accent-600"
                />
              </label>

              <label className="rounded-xl border border-[var(--orbit-border)] bg-stone-50 dark:bg-stone-800 p-3 flex items-center justify-between cursor-pointer">
                <span className="text-xs font-medium text-stone-800 dark:text-stone-200">
                  Person with Disability (ESI ₹25k cap)
                </span>
                <input
                  type="checkbox"
                  checked={hasDisability}
                  onChange={e => setHasDisability(e.target.checked)}
                  className="w-4 h-4 rounded text-accent-600"
                />
              </label>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300">
                  Income Tax Regime
                </label>
                <select
                  value={regime}
                  onChange={e => setRegime(e.target.value)}
                  className="orbit-control mt-1.5 w-full rounded-xl border border-[var(--orbit-border)] bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 outline-none focus:border-accent-500"
                >
                  <option value="new">New Regime (Default Section 115BAC)</option>
                  <option value="old">Old Regime</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300">
                  Professional Tax State
                </label>
                <select
                  value={state}
                  onChange={e => setState(e.target.value)}
                  className="orbit-control mt-1.5 w-full rounded-xl border border-[var(--orbit-border)] bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 outline-none focus:border-accent-500"
                >
                  <option value="Karnataka">Karnataka (₹200/mo over ₹25k)</option>
                  <option value="None">None / Exempt</option>
                </select>
              </div>
            </div>
          </div>

          {/* Company & Employee Details */}
          <div className="p-5 rounded-2xl bg-white dark:bg-stone-900 border border-[var(--orbit-border)] space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-stone-600 dark:text-stone-400 flex items-center gap-2">
              <User className="w-4 h-4" />
              Employee & Company Information
            </h3>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300">Company Name</label>
                <input
                  type="text"
                  value={companyName}
                  onChange={e => setCompanyName(e.target.value)}
                  className="orbit-control mt-1.5 w-full rounded-xl border border-[var(--orbit-border)] bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 outline-none focus:border-accent-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300">Pay Period</label>
                <input
                  type="text"
                  value={payPeriod}
                  onChange={e => setPayPeriod(e.target.value)}
                  className="orbit-control mt-1.5 w-full rounded-xl border border-[var(--orbit-border)] bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 outline-none focus:border-accent-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300">Employee Name</label>
                <input
                  type="text"
                  value={empName}
                  onChange={e => setEmpName(e.target.value)}
                  className="orbit-control mt-1.5 w-full rounded-xl border border-[var(--orbit-border)] bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 outline-none focus:border-accent-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300">Employee ID</label>
                <input
                  type="text"
                  value={empId}
                  onChange={e => setEmpId(e.target.value)}
                  className="orbit-control mt-1.5 w-full rounded-xl border border-[var(--orbit-border)] bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 outline-none focus:border-accent-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300">Designation</label>
                <input
                  type="text"
                  value={designation}
                  onChange={e => setDesignation(e.target.value)}
                  className="orbit-control mt-1.5 w-full rounded-xl border border-[var(--orbit-border)] bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 outline-none focus:border-accent-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300">Department</label>
                <input
                  type="text"
                  value={department}
                  onChange={e => setDepartment(e.target.value)}
                  className="orbit-control mt-1.5 w-full rounded-xl border border-[var(--orbit-border)] bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 outline-none focus:border-accent-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300">PAN</label>
                <input
                  type="text"
                  value={pan}
                  onChange={e => setPan(e.target.value)}
                  className="orbit-control mt-1.5 w-full rounded-xl border border-[var(--orbit-border)] bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 outline-none focus:border-accent-500"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300">Company Address</label>
                <input
                  type="text"
                  value={companyAddress}
                  onChange={e => setCompanyAddress(e.target.value)}
                  className="orbit-control mt-1.5 w-full rounded-xl border border-[var(--orbit-border)] bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 outline-none focus:border-accent-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300">Date of Joining</label>
                <input
                  type="date"
                  value={doj}
                  onChange={e => setDoj(e.target.value)}
                  className="orbit-control mt-1.5 w-full rounded-xl border border-[var(--orbit-border)] bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 outline-none focus:border-accent-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300">UAN</label>
                <input
                  type="text"
                  value={uan}
                  onChange={e => setUan(e.target.value)}
                  className="orbit-control mt-1.5 w-full rounded-xl border border-[var(--orbit-border)] bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 outline-none focus:border-accent-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300">Bank Name</label>
                <input
                  type="text"
                  value={bankName}
                  onChange={e => setBankName(e.target.value)}
                  className="orbit-control mt-1.5 w-full rounded-xl border border-[var(--orbit-border)] bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 outline-none focus:border-accent-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300">Account Number</label>
                <input
                  type="text"
                  value={accountNo}
                  onChange={e => setAccountNo(e.target.value)}
                  className="orbit-control mt-1.5 w-full rounded-xl border border-[var(--orbit-border)] bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 outline-none focus:border-accent-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Live Payslip Voucher Preview */}
        <div className="lg:col-span-6 space-y-5">
          <div className="p-6 rounded-2xl bg-white dark:bg-stone-900 border border-[var(--orbit-border)] shadow-sm space-y-6">
            {/* Voucher Header */}
            <div className="border-b border-[var(--orbit-border)] pb-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-bold text-stone-900 dark:text-stone-100">{slip.company.name}</h3>
                  <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">{slip.company.address}</p>
                </div>
                <div className="text-right">
                  <span className="inline-block px-2.5 py-1 rounded-md text-xs font-semibold bg-accent-50 dark:bg-accent-950/40 text-accent-700 dark:text-accent-300 border border-accent-200 dark:border-accent-800">
                    {slip.company.monthYear}
                  </span>
                </div>
              </div>

              {/* Mini Employee Badge */}
              <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs bg-stone-50 dark:bg-stone-800/60 p-3 rounded-xl border border-[var(--orbit-border)]">
                <div><span className="text-stone-400 block text-[10px]">NAME</span><span className="font-semibold">{slip.employee.name}</span></div>
                <div><span className="text-stone-400 block text-[10px]">EMP ID</span><span className="font-semibold">{slip.employee.id}</span></div>
                <div><span className="text-stone-400 block text-[10px]">DESIGNATION</span><span className="font-semibold">{slip.employee.designation}</span></div>
                <div><span className="text-stone-400 block text-[10px]">PAID DAYS</span><span className="font-semibold">{slip.paidDays} / {slip.daysInMonth}</span></div>
              </div>
            </div>

            {/* Side-by-Side Tables: Earnings & Deductions */}
            <div className="grid sm:grid-cols-2 gap-6">
              {/* Earnings */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 border-b border-emerald-100 dark:border-emerald-900 pb-1.5">
                  Earnings
                </h4>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-stone-600 dark:text-stone-400">Basic Salary</span>
                    <span className="font-medium text-stone-900 dark:text-stone-100">{slip.formattedBasic}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-600 dark:text-stone-400">House Rent Allowance</span>
                    <span className="font-medium text-stone-900 dark:text-stone-100">{slip.formattedHra}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-600 dark:text-stone-400">Special Allowances</span>
                    <span className="font-medium text-stone-900 dark:text-stone-100">{slip.formattedAllowances}</span>
                  </div>
                </div>
                <div className="pt-2 border-t border-[var(--orbit-border)] flex justify-between font-semibold text-xs text-stone-900 dark:text-stone-100">
                  <span>Gross Earnings</span>
                  <span className="text-emerald-600 dark:text-emerald-400">{slip.formattedGross}</span>
                </div>
              </div>

              {/* Deductions */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-rose-700 dark:text-rose-400 border-b border-rose-100 dark:border-rose-900 pb-1.5">
                  Deductions
                </h4>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-stone-600 dark:text-stone-400">Provident Fund (EPF)</span>
                    <span className="font-medium text-stone-900 dark:text-stone-100">{formatINR(slip.employeePf)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-600 dark:text-stone-400">ESI Contribution</span>
                    <span className="font-medium text-stone-900 dark:text-stone-100">{formatINR(slip.employeeEsi)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-600 dark:text-stone-400">Professional Tax</span>
                    <span className="font-medium text-stone-900 dark:text-stone-100">{formatINR(slip.professionalTax)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-600 dark:text-stone-400">Income Tax (TDS)</span>
                    <span className="font-medium text-stone-900 dark:text-stone-100">{formatINR(slip.tds)}</span>
                  </div>
                </div>
                <div className="pt-2 border-t border-[var(--orbit-border)] flex justify-between font-semibold text-xs text-stone-900 dark:text-stone-100">
                  <span>Total Deductions</span>
                  <span className="text-rose-600 dark:text-rose-400">{slip.formattedTotalDeductions}</span>
                </div>
              </div>
            </div>

            {/* Net Salary Highlight Box */}
            <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300 block">
                    Net Take-Home Salary
                  </span>
                  <span className="text-xs text-emerald-700 dark:text-emerald-400 mt-0.5 block">
                    {slip.netSalaryInWords}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-black text-emerald-700 dark:text-emerald-300">
                    {formatINR(slip.netSalary)}
                  </span>
                </div>
              </div>
            </div>

            {/* Employer Contributions Info Card */}
            <div className="text-xs text-stone-500 dark:text-stone-400 bg-stone-50 dark:bg-stone-800/40 p-3 rounded-xl border border-[var(--orbit-border)] space-y-1">
              <div className="flex justify-between">
                <span>Employer EPF Contribution:</span>
                <span className="font-medium text-stone-700 dark:text-stone-300">{formatINR(slip.employerPf)}</span>
              </div>
              <div className="flex justify-between">
                <span>Employer ESI Contribution:</span>
                <span className="font-medium text-stone-700 dark:text-stone-300">{formatINR(slip.employerEsi)}</span>
              </div>
              <div className="flex justify-between">
                <span>Income Tax Regime Applied:</span>
                <span className="font-medium text-stone-700 dark:text-stone-300">
                  {regime === 'new' ? 'New Tax Regime (Section 115BAC)' : 'Old Tax Regime'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PayslipGenerator;
