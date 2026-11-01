import { useState, useMemo, useCallback } from 'react';
import * as XLSX from 'xlsx';
import {
  Users, Plus, Trash2, Download, RefreshCw, FileSpreadsheet
} from 'lucide-react';
import { generateSalarySheet, SAMPLE_TEAM } from './salarySheetEngine.js';
import { money, formatDownloadFilename, downloadBlob } from '../../lib/toolFormat.js';

export function SalarySheet() {
  const [companyName, setCompanyName] = useState('WorkOrbit Technologies Pvt Ltd');
  const [monthYear, setMonthYear] = useState('October 2026');
  const [daysInMonth, setDaysInMonth] = useState('30');
  const [employees, setEmployees] = useState(SAMPLE_TEAM);

  // Compute Sheet
  const sheet = useMemo(() => {
    return generateSalarySheet({
      employees,
      daysInMonth: Number(daysInMonth) || 30,
      companyName,
      monthYear,
    });
  }, [employees, daysInMonth, companyName, monthYear]);

  // Add Employee
  const handleAddEmployee = useCallback(() => {
    const nextIdx = employees.length + 1;
    const newEmp = {
      id: `EMP${String(nextIdx).padStart(2, '0')}`,
      name: `New Employee ${nextIdx}`,
      designation: 'Associate',
      monthlyGross: 50000,
      paidDays: Number(daysInMonth) || 30,
      optPf: true,
      tds: 0,
    };
    setEmployees(prev => [...prev, newEmp]);
  }, [employees.length, daysInMonth]);

  // Remove Employee
  const handleRemoveEmployee = useCallback((idx) => {
    setEmployees(prev => prev.filter((_, i) => i !== idx));
  }, []);

  // Update Employee Field
  const handleUpdateEmployee = useCallback((idx, field, value) => {
    setEmployees(prev => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], [field]: value };
      return copy;
    });
  }, []);

  // Reset to Sample
  const handleLoadSample = useCallback(() => {
    setEmployees(SAMPLE_TEAM);
    setCompanyName('WorkOrbit Technologies Pvt Ltd');
    setMonthYear('October 2026');
    setDaysInMonth('30');
  }, []);

  // Export to Excel
  const handleExportExcel = useCallback(() => {
    const wb = XLSX.utils.book_new();

    const header = [
      [`${companyName.toUpperCase()} - MONTHLY SALARY SHEET`],
      [`Pay Period: ${monthYear} | Calendar Days: ${sheet.daysInMonth}`],
      [],
      [
        'Employee ID',
        'Employee Name',
        'Designation',
        'Base Gross (₹)',
        'Paid Days',
        'Prorated Gross (₹)',
        'Basic Pay (₹)',
        'EPF (₹)',
        'ESI (₹)',
        'PT (₹)',
        'TDS (₹)',
        'Total Deductions (₹)',
        'Net Pay (₹)',
      ],
    ];

    const dataRows = sheet.rows.map(r => [
      r.employeeId,
      r.name,
      r.designation,
      r.baseGross,
      r.paidDays,
      r.proratedGross,
      r.basic,
      r.pf,
      r.esi,
      r.pt,
      r.tds,
      r.totalDeductions,
      r.netSalary,
    ]);

    const totalRow = [
      'TOTALS',
      `${sheet.employeeCount} Employees`,
      '',
      '',
      '',
      sheet.totalGross,
      sheet.totalBasic,
      sheet.totalPf,
      sheet.totalEsi,
      sheet.totalPt,
      sheet.totalTds,
      sheet.totalDeductions,
      sheet.totalNet,
    ];

    const allRows = [...header, ...dataRows, [], totalRow];
    const ws = XLSX.utils.aoa_to_sheet(allRows);

    ws['!cols'] = [
      { wch: 14 },
      { wch: 22 },
      { wch: 20 },
      { wch: 15 },
      { wch: 10 },
      { wch: 18 },
      { wch: 15 },
      { wch: 12 },
      { wch: 12 },
      { wch: 10 },
      { wch: 12 },
      { wch: 18 },
      { wch: 18 },
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Salary Sheet');

    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    downloadBlob(blob, formatDownloadFilename('salary-sheet-excel', 'xlsx'), 'salary-sheet-excel');
  }, [companyName, monthYear, sheet]);

  return (
    <div className="space-y-8">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white dark:bg-stone-900 border border-[var(--orbit-border)] shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-accent-600" />
            Salary Sheet (Excel) Generator
          </h2>
          <p className="text-sm text-stone-500 dark:text-stone-400 mt-1">
            Generate complete monthly payroll sheets for your team with attendance proration, statutory deductions, and Excel export.
          </p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            type="button"
            onClick={handleLoadSample}
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-[var(--orbit-border)] bg-stone-50 dark:bg-stone-800 hover:bg-stone-100 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 font-semibold text-sm transition-colors cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
            Reset Sample Team
          </button>
          <button
            type="button"
            onClick={handleExportExcel}
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm shadow-xs transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4" />
            Export XLSX
          </button>
        </div>
      </div>

      {/* Sheet Metadata Inputs */}
      <div className="p-5 rounded-2xl bg-white dark:bg-stone-900 border border-[var(--orbit-border)] grid sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300">
            Company Name
          </label>
          <input
            type="text"
            value={companyName}
            onChange={e => setCompanyName(e.target.value)}
            className="mt-1.5 w-full rounded-xl border border-[var(--orbit-border)] bg-stone-50 dark:bg-stone-800 px-3.5 py-2 text-sm text-stone-900 dark:text-stone-100 outline-none focus:border-accent-500"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300">
            Pay Period Month & Year
          </label>
          <input
            type="text"
            value={monthYear}
            onChange={e => setMonthYear(e.target.value)}
            className="mt-1.5 w-full rounded-xl border border-[var(--orbit-border)] bg-stone-50 dark:bg-stone-800 px-3.5 py-2 text-sm text-stone-900 dark:text-stone-100 outline-none focus:border-accent-500"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300">
            Calendar Days in Month
          </label>
          <input
            type="number"
            value={daysInMonth}
            onChange={e => setDaysInMonth(e.target.value)}
            className="mt-1.5 w-full rounded-xl border border-[var(--orbit-border)] bg-stone-50 dark:bg-stone-800 px-3.5 py-2 text-sm text-stone-900 dark:text-stone-100 outline-none focus:border-accent-500"
          />
        </div>
      </div>

      {/* Aggregate KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-accent-50 dark:bg-accent-950/30 border border-accent-200 dark:border-accent-800">
          <span className="text-[11px] font-bold uppercase tracking-wider text-accent-700 dark:text-accent-400 block">
            Total Gross Payout
          </span>
          <div className="text-2xl font-black text-accent-900 dark:text-accent-100 mt-1">
            {sheet.formattedTotalGross}
          </div>
          <span className="text-[10px] text-accent-600 dark:text-accent-400">Prorated across all {sheet.employeeCount} team members</span>
        </div>

        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800">
          <span className="text-[11px] font-bold uppercase tracking-wider text-rose-700 dark:text-rose-400 block">
            Total Deductions
          </span>
          <div className="text-2xl font-black text-rose-900 dark:text-rose-100 mt-1">
            {sheet.formattedTotalDeductions}
          </div>
          <span className="text-[10px] text-rose-600 dark:text-rose-400">EPF, ESI, PT, and TDS withheld</span>
        </div>

        <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800">
          <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 block">
            Net Disbursed Amount
          </span>
          <div className="text-2xl font-black text-emerald-900 dark:text-emerald-100 mt-1">
            {sheet.formattedTotalNet}
          </div>
          <span className="text-[10px] text-emerald-600 dark:text-emerald-400">Total bank transfer outflow</span>
        </div>
      </div>

      {/* Interactive Employee Roster Table */}
      <div className="p-5 rounded-2xl bg-white dark:bg-stone-900 border border-[var(--orbit-border)] shadow-xs space-y-4">
        <div className="flex justify-between items-center border-b border-[var(--orbit-border)] pb-3">
          <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
            <Users className="w-4 h-4 text-accent-600" />
            Team Payroll Roster ({employees.length} Employees)
          </h3>
          <button
            type="button"
            onClick={handleAddEmployee}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-accent-600 hover:bg-accent-700 text-white font-semibold text-xs shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Employee
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[900px]">
            <thead className="bg-stone-50 dark:bg-stone-800/60 text-stone-500 dark:text-stone-400 uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-2.5 px-3">Emp ID</th>
                <th className="py-2.5 px-3">Name</th>
                <th className="py-2.5 px-3">Designation</th>
                <th className="py-2.5 px-3 text-right">Base Gross (₹)</th>
                <th className="py-2.5 px-3 text-center">Paid Days</th>
                <th className="py-2.5 px-3 text-right">Prorated Gross</th>
                <th className="py-2.5 px-3 text-right">PF</th>
                <th className="py-2.5 px-3 text-right">ESI</th>
                <th className="py-2.5 px-3 text-right">PT</th>
                <th className="py-2.5 px-3 text-right">TDS (₹)</th>
                <th className="py-2.5 px-3 text-right">Net Pay (₹)</th>
                <th className="py-2.5 px-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--orbit-border)] font-mono text-stone-800 dark:text-stone-200">
              {sheet.rows.map((row, idx) => (
                <tr key={row.employeeId || idx} className="hover:bg-stone-50/50 dark:hover:bg-stone-800/20">
                  <td className="py-2 px-3 font-semibold text-stone-900 dark:text-stone-100">
                    <input
                      type="text"
                      value={employees[idx]?.id || ''}
                      onChange={e => handleUpdateEmployee(idx, 'id', e.target.value)}
                      className="w-16 bg-transparent border-b border-transparent focus:border-accent-500 outline-none text-xs"
                    />
                  </td>
                  <td className="py-2 px-3 font-sans">
                    <input
                      type="text"
                      value={employees[idx]?.name || ''}
                      onChange={e => handleUpdateEmployee(idx, 'name', e.target.value)}
                      className="w-28 bg-transparent border-b border-transparent focus:border-accent-500 outline-none text-xs font-medium"
                    />
                  </td>
                  <td className="py-2 px-3 font-sans text-stone-500 text-[11px]">
                    <input
                      type="text"
                      value={employees[idx]?.designation || ''}
                      onChange={e => handleUpdateEmployee(idx, 'designation', e.target.value)}
                      className="w-28 bg-transparent border-b border-transparent focus:border-accent-500 outline-none text-xs"
                    />
                  </td>
                  <td className="py-2 px-3 text-right">
                    <input
                      type="number"
                      value={employees[idx]?.monthlyGross || ''}
                      onChange={e => handleUpdateEmployee(idx, 'monthlyGross', e.target.value)}
                      className="w-20 text-right bg-transparent border-b border-stone-200 dark:border-stone-700 focus:border-accent-500 outline-none text-xs"
                    />
                  </td>
                  <td className="py-2 px-3 text-center">
                    <input
                      type="number"
                      value={employees[idx]?.paidDays ?? ''}
                      onChange={e => handleUpdateEmployee(idx, 'paidDays', e.target.value)}
                      className="w-12 text-center bg-transparent border-b border-stone-200 dark:border-stone-700 focus:border-accent-500 outline-none text-xs"
                    />
                  </td>
                  <td className="py-2 px-3 text-right font-semibold text-stone-900 dark:text-stone-100">
                    {money(row.proratedGross)}
                  </td>
                  <td className="py-2 px-3 text-right text-stone-600 dark:text-stone-400">
                    {money(row.pf)}
                  </td>
                  <td className="py-2 px-3 text-right text-stone-600 dark:text-stone-400">
                    {money(row.esi)}
                  </td>
                  <td className="py-2 px-3 text-right text-stone-600 dark:text-stone-400">
                    {money(row.pt)}
                  </td>
                  <td className="py-2 px-3 text-right">
                    <input
                      type="number"
                      value={employees[idx]?.tds || ''}
                      onChange={e => handleUpdateEmployee(idx, 'tds', e.target.value)}
                      placeholder="0"
                      className="w-16 text-right bg-transparent border-b border-stone-200 dark:border-stone-700 focus:border-accent-500 outline-none text-xs"
                    />
                  </td>
                  <td className="py-2 px-3 text-right font-bold text-emerald-600 dark:text-emerald-400">
                    {money(row.netSalary)}
                  </td>
                  <td className="py-2 px-3 text-center">
                    <button
                      type="button"
                      onClick={() => handleRemoveEmployee(idx)}
                      className="text-stone-400 hover:text-rose-600 transition-colors cursor-pointer p-1"
                      title="Remove employee"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            {/* Totals Footer Row */}
            <tfoot className="bg-stone-50 dark:bg-stone-800/80 font-mono font-bold text-stone-900 dark:text-stone-100 border-t-2 border-[var(--orbit-border)]">
              <tr>
                <td className="py-2.5 px-3">TOTALS</td>
                <td className="py-2.5 px-3 font-sans text-stone-500">{sheet.employeeCount} Emps</td>
                <td className="py-2.5 px-3"></td>
                <td className="py-2.5 px-3"></td>
                <td className="py-2.5 px-3"></td>
                <td className="py-2.5 px-3 text-right">{money(sheet.totalGross)}</td>
                <td className="py-2.5 px-3 text-right">{money(sheet.totalPf)}</td>
                <td className="py-2.5 px-3 text-right">{money(sheet.totalEsi)}</td>
                <td className="py-2.5 px-3 text-right">{money(sheet.totalPt)}</td>
                <td className="py-2.5 px-3 text-right">{money(sheet.totalTds)}</td>
                <td className="py-2.5 px-3 text-right text-emerald-600 dark:text-emerald-400">{money(sheet.totalNet)}</td>
                <td className="py-2.5 px-3"></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}

export default SalarySheet;
