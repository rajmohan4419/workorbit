import { useState, useRef, useMemo } from 'react';
import { Download, Upload, Plus, Trash2, Search, RotateCcw } from 'lucide-react';

const INITIAL_DATA = [
  ['Category', 'Product', 'Quantity', 'Unit Price', 'Total'],
  ['Electronics', 'Wireless Mouse', '15', '24.99', '374.85'],
  ['Electronics', 'Mechanical Keyboard', '8', '89.50', '716.00'],
  ['Office Supplies', 'Gel Pens (Pack of 12)', '25', '12.00', '300.00'],
  ['Office Supplies', 'A4 Paper Reams', '30', '6.50', '195.00'],
  ['Furniture', 'Ergonomic Desk Chair', '4', '180.00', '720.00']
];

export default function SpreadsheetEditor() {
  const [data, setData] = useState(INITIAL_DATA);
  const [history, setHistory] = useState([]);
  const [filterQuery, setFilterQuery] = useState('');
  const [selectedCell, setSelectedCell] = useState(null);
  const fileInputRef = useRef(null);

  // Update cell and push state to history for undo
  const handleCellChange = (rowIndex, colIndex, value) => {
    setHistory((prev) => [...prev.slice(-20), data]);
    setData((prev) => {
      const next = prev.map((row) => [...row]);
      next[rowIndex][colIndex] = value;
      return next;
    });
  };

  const handleUndo = () => {
    if (history.length === 0) return;
    const previous = history[history.length - 1];
    setHistory((prev) => prev.slice(0, -1));
    setData(previous);
  };

  const addRow = () => {
    const colCount = data[0]?.length || 4;
    setHistory((prev) => [...prev.slice(-20), data]);
    setData((prev) => [...prev, new Array(colCount).fill('')]);
  };

  const addColumn = () => {
    setHistory((prev) => [...prev.slice(-20), data]);
    setData((prev) => prev.map((row, idx) => [...row, idx === 0 ? `Col ${row.length + 1}` : '']));
  };

  const deleteRow = (rowIndex) => {
    if (data.length <= 1) return;
    setHistory((prev) => [...prev.slice(-20), data]);
    setData((prev) => prev.filter((_, i) => i !== rowIndex));
  };

  const deleteColumn = (colIndex) => {
    if ((data[0]?.length || 0) <= 1) return;
    setHistory((prev) => [...prev.slice(-20), data]);
    setData((prev) => prev.map((row) => row.filter((_, j) => j !== colIndex)));
  };

  // CSV Import Parser
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result;
      if (typeof text !== 'string') return;

      const rows = text
        .split(/\r?\n/)
        .filter((line) => line.trim().length > 0)
        .map((line) => {
          // Basic CSV quote-aware splitter
          const regex = /(?:,|\n|^)("(?:(?:"")*[^"]*)*"|[^",\n]*|(?:\n|$))/g;
          const entries = [];
          let match;
          while ((match = regex.exec(line)) !== null && match.index < line.length) {
            let val = match[1] || '';
            if (val.startsWith('"') && val.endsWith('"')) {
              val = val.slice(1, -1).replace(/""/g, '"');
            }
            entries.push(val.trim());
          }
          return entries;
        });

      if (rows.length > 0) {
        setHistory([]);
        setData(rows);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // CSV Exporter
  const handleExportCSV = () => {
    const csvContent = data
      .map((row) =>
        row
          .map((cell) => {
            const str = String(cell ?? '');
            return str.includes(',') || str.includes('"') || str.includes('\n')
              ? `"${str.replace(/"/g, '""')}"`
              : str;
          })
          .join(',')
      )
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `spreadsheet_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filtered rows for viewing
  const filteredRows = useMemo(() => {
    if (!filterQuery.trim()) return data.map((row, idx) => ({ row, originalIndex: idx }));
    const q = filterQuery.toLowerCase();
    return data
      .map((row, idx) => ({ row, originalIndex: idx }))
      .filter(({ row, originalIndex }) =>
        originalIndex === 0 || row.some((cell) => String(cell).toLowerCase().includes(q))
      );
  }, [data, filterQuery]);

  return (
    <div className="w-full max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Top Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".csv,.txt,.tsv"
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 transition-colors"
          >
            <Upload className="w-4 h-4" />
            Upload CSV
          </button>

          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition-colors"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>

          <div className="h-6 w-px bg-gray-200 dark:bg-gray-700 mx-1 hidden sm:block" />

          <button
            onClick={addRow}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 transition-colors"
          >
            <Plus className="w-4 h-4" /> Row
          </button>

          <button
            onClick={addColumn}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 transition-colors"
          >
            <Plus className="w-4 h-4" /> Column
          </button>

          <button
            onClick={handleUndo}
            disabled={history.length === 0}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            title="Undo last change"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>

        {/* Search / Filter */}
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            placeholder="Search cells..."
            className="w-full pl-9 pr-3 py-1.5 text-sm bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Spreadsheet Grid */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
        <div className="overflow-x-auto max-h-[680px]">
          <table className="w-full border-collapse text-left text-sm">
            <thead className="sticky top-0 bg-gray-100 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 z-10">
              <tr>
                <th className="w-12 px-2 py-2 text-center text-xs font-semibold text-gray-400 uppercase tracking-wider border-r border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                  #
                </th>
                {data[0]?.map((_, colIndex) => (
                  <th
                    key={colIndex}
                    className="group px-3 py-2 text-xs font-semibold text-gray-700 dark:text-gray-300 border-r border-gray-200 dark:border-gray-700 min-w-[140px]"
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="truncate">Col {colIndex + 1}</span>
                      <button
                        onClick={() => deleteColumn(colIndex)}
                        className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 transition-opacity"
                        title="Delete column"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredRows.map(({ row, originalIndex }) => {
                const isHeader = originalIndex === 0;
                return (
                  <tr
                    key={originalIndex}
                    className={`group/row transition-colors ${
                      isHeader
                        ? 'bg-gray-50/75 dark:bg-gray-800/80 font-medium'
                        : 'hover:bg-indigo-50/20 dark:hover:bg-gray-700/30'
                    }`}
                  >
                    {/* Row Index / Actions */}
                    <td className="px-2 py-1.5 text-center text-xs text-gray-400 border-r border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/30 select-none">
                      <div className="flex items-center justify-center relative">
                        <span className="group-hover/row:hidden">{originalIndex + 1}</span>
                        {!isHeader && (
                          <button
                            onClick={() => deleteRow(originalIndex)}
                            className="hidden group-hover/row:inline-flex p-0.5 text-gray-400 hover:text-red-500 transition-colors"
                            title="Delete row"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>

                    {/* Cell Editors */}
                    {row.map((cellValue, colIndex) => {
                      const isFocused =
                        selectedCell?.row === originalIndex && selectedCell?.col === colIndex;
                      return (
                        <td
                          key={colIndex}
                          className={`p-0 border-r border-gray-200 dark:border-gray-700 relative ${
                            isFocused ? 'ring-2 ring-indigo-500 z-10' : ''
                          }`}
                        >
                          <input
                            type="text"
                            value={cellValue ?? ''}
                            onFocus={() => setSelectedCell({ row: originalIndex, col: colIndex })}
                            onChange={(e) =>
                              handleCellChange(originalIndex, colIndex, e.target.value)
                            }
                            className={`w-full px-3 py-2 bg-transparent text-gray-800 dark:text-gray-100 text-sm focus:outline-none ${
                              isHeader ? 'font-semibold text-gray-900 dark:text-white' : ''
                            }`}
                          />
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer info */}
        <div className="px-4 py-3 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400 flex justify-between items-center">
          <span>
            {data.length} rows &bull; {data[0]?.length || 0} columns
          </span>
          {filterQuery && (
            <span>Showing {filteredRows.length - 1} matching data rows</span>
          )}
        </div>
      </div>
    </div>
  );
}
