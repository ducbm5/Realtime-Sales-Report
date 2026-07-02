import React, { useState, useMemo } from 'react';
import { RaceRecord } from '../types';
import { PivotChart } from './PivotChart';
import { 
  Table, 
  Download, 
  HelpCircle,
  TrendingUp,
  SlidersHorizontal,
  FileSpreadsheet
} from 'lucide-react';

interface PivotTableProps {
  records: RaceRecord[];
  selectedPartner: string;
}

export const PivotTable: React.FC<PivotTableProps> = ({ records, selectedPartner }) => {

  // 3. Normalize age ranges into standard bins
  const ageGroupsList = ['6-17', '18-24', '25-34', '35-44', '45-54', '55+'];

  const getNormalizedAgeGroup = (r: RaceRecord): string => {
    const raw = r.ageGroup?.trim() || '';
    if (!raw || raw === '(Trống)' || raw === 'None') {
      return 'Chưa rõ';
    }
    
    // Check if it's already one of our standard bins (allowing spaces)
    const normalized = raw.replace(/\s+/g, '');
    if (ageGroupsList.includes(normalized)) {
      return normalized;
    }
    if (normalized.endsWith('+')) {
      const val = parseInt(normalized, 10);
      if (val >= 55) return '55+';
    }

    // Try parsing as raw number
    const age = parseInt(normalized, 10);
    if (!isNaN(age)) {
      if (age >= 6 && age <= 17) return '6-17';
      if (age >= 18 && age <= 24) return '18-24';
      if (age >= 25 && age <= 34) return '25-34';
      if (age >= 35 && age <= 44) return '35-44';
      if (age >= 45 && age <= 54) return '45-54';
      if (age >= 55) return '55+';
    }

    // Attempt range parsing like "25-34"
    const match = raw.match(/(\d+)\s*[-–to]\s*(\d+)/i);
    if (match) {
      const start = parseInt(match[1], 10);
      const end = parseInt(match[2], 10);
      if (start === 6 && end === 17) return '6-17';
      if (start === 18 && end === 24) return '18-24';
      if (start === 25 && end === 34) return '25-34';
      if (start === 35 && end === 44) return '35-44';
      if (start === 45 && end === 54) return '45-54';
    }

    return 'Khác';
  };

  // Clean distance labels to display as simple numbers (e.g., "5km" -> "5", "10" -> "10")
  const getCleanDistance = (dist: string): string => {
    return dist.toLowerCase().replace('km', '').trim();
  };

  // 4. Filtered records matching the global filter
  const pivotFilteredRecords = records;

  // 5. Calculate all unique distances in the filtered records (e.g., 5, 10, 21)
  const uniqueDistances = useMemo(() => {
    const set = new Set<string>();
    // Look at all records to get a stable set of distances
    records.forEach(r => {
      const cleanDist = getCleanDistance(r.distance);
      if (cleanDist && cleanDist !== '(Trống)') {
        set.add(cleanDist);
      }
    });
    // Sort distances numerically
    return Array.from(set).sort((a, b) => {
      const numA = parseFloat(a);
      const numB = parseFloat(b);
      if (isNaN(numA) || isNaN(numB)) return a.localeCompare(b);
      return numA - numB;
    });
  }, [records]);

  // 6. Aggregate the matrix data: [Row: AgeGroup][Col: Distance] = { sl: number, amount: number }
  const pivotData = useMemo(() => {
    // Initialize matrix
    const matrix: Record<string, Record<string, { sl: number; amount: number }>> = {};
    
    // Ensure all bins exist
    const allRows = [...ageGroupsList, 'Khác', 'Chưa rõ'];
    allRows.forEach(row => {
      matrix[row] = {};
      uniqueDistances.forEach(col => {
        matrix[row][col] = { sl: 0, amount: 0 };
      });
    });

    // Populate with filtered records
    pivotFilteredRecords.forEach(r => {
      const rowBin = getNormalizedAgeGroup(r);
      const colBin = getCleanDistance(r.distance);
      
      if (matrix[rowBin] && matrix[rowBin][colBin]) {
        matrix[rowBin][colBin].sl += 1;
        matrix[rowBin][colBin].amount += r.amount;
      } else if (matrix[rowBin]) {
        // Fallback or dynamically added column
        if (!matrix[rowBin][colBin]) {
          matrix[rowBin][colBin] = { sl: 0, amount: 0 };
        }
        matrix[rowBin][colBin].sl += 1;
        matrix[rowBin][colBin].amount += r.amount;
      }
    });

    // Calculate Grand Totals
    let totalSL = 0;
    let totalAmount = 0;
    
    const rowTotals: Record<string, { sl: number; amount: number }> = {};
    const colTotals: Record<string, { sl: number; amount: number }> = {};
    
    allRows.forEach(row => {
      rowTotals[row] = { sl: 0, amount: 0 };
    });
    uniqueDistances.forEach(col => {
      colTotals[col] = { sl: 0, amount: 0 };
    });

    // Populate totals
    allRows.forEach(row => {
      uniqueDistances.forEach(col => {
        const cell = matrix[row][col] || { sl: 0, amount: 0 };
        rowTotals[row].sl += cell.sl;
        rowTotals[row].amount += cell.amount;
        
        colTotals[col].sl += cell.sl;
        colTotals[col].amount += cell.amount;

        totalSL += cell.sl;
        totalAmount += cell.amount;
      });
    });

    return {
      matrix,
      rowTotals,
      colTotals,
      totalSL,
      totalAmount
    };
  }, [pivotFilteredRecords, uniqueDistances]);

  // Filter out row labels that have absolutely 0 records in both data and totals to keep it clean, 
  // but always preserve the standard ones if they have data or to resemble the Excel sheet.
  const visibleRows = useMemo(() => {
    const allRows = [...ageGroupsList, 'Khác', 'Chưa rõ'];
    return allRows.filter(row => {
      // Keep if it is a standard bin
      if (ageGroupsList.includes(row)) return true;
      // Otherwise keep only if it has records
      return (pivotData.rowTotals[row]?.sl || 0) > 0;
    });
  }, [pivotData]);

  const formatCurrency = (value: number) => {
    if (value === 0) return '0';
    return new Intl.NumberFormat('vi-VN').format(value);
  };

  const calculatePercentage = (sl: number) => {
    if (pivotData.totalSL === 0) return '0%';
    const pct = (sl / pivotData.totalSL) * 100;
    if (pct === 0) return '0%';
    if (pct < 1) return '<1%';
    return `${Math.round(pct)}%`;
  };

  // Export pivot grid data to standard CSV
  const handleExportPivot = () => {
    const headers = ['Row Labels'];
    uniqueDistances.forEach(dist => {
      headers.push(`${dist} - SL`, `${dist} - %`, `${dist} - $`);
    });
    headers.push('Total SL', 'Total %', 'Total $');

    const csvLines = [headers.join(',')];

    visibleRows.forEach(row => {
      const line = [row];
      uniqueDistances.forEach(dist => {
        const cell = pivotData.matrix[row][dist] || { sl: 0, amount: 0 };
        line.push(cell.sl.toString());
        line.push(calculatePercentage(cell.sl));
        line.push(cell.amount.toString());
      });
      line.push(pivotData.rowTotals[row].sl.toString());
      line.push(calculatePercentage(pivotData.rowTotals[row].sl));
      line.push(pivotData.rowTotals[row].amount.toString());
      csvLines.push(line.join(','));
    });

    // Grand total line
    const grandLine = ['Grand Total'];
    uniqueDistances.forEach(dist => {
      grandLine.push(pivotData.colTotals[dist].sl.toString());
      grandLine.push(calculatePercentage(pivotData.colTotals[dist].sl));
      grandLine.push(pivotData.colTotals[dist].amount.toString());
    });
    grandLine.push(pivotData.totalSL.toString());
    grandLine.push('100%');
    grandLine.push(pivotData.totalAmount.toString());
    csvLines.push(grandLine.join(','));

    const bom = '\uFEFF';
    const csvContent = bom + csvLines.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `PivotTable_${selectedPartner}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden" id="pivot-table-section">
      {/* Title Header area */}
      <div className="p-6 border-b border-slate-100 bg-linear-to-r from-emerald-50/40 to-teal-50/40">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="p-1 px-2.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 tracking-wider uppercase flex items-center gap-1">
                <FileSpreadsheet className="w-3.5 h-3.5" />
                EXCEL BẢNG ĐIỀU PHỐI (PIVOT TABLE)
              </span>
            </div>
            <h2 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
              Bảng Tổng Hợp Doanh Thu & Số Lượng Theo Cự Ly & Nhóm Tuổi
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Báo cáo động phân bổ dòng tiền ($), số lượng đăng ký (SL) và tỷ lệ đóng góp (%) theo từng cự ly và nhóm tuổi.
            </p>
          </div>
          
          <button
            onClick={handleExportPivot}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-all cursor-pointer shadow-xs hover:shadow-md active:scale-95 self-start md:self-center shrink-0"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Xuất Excel Báo Cáo</span>
          </button>
        </div>
      </div>

      {/* Main Table area */}
      <div className="p-6 space-y-6">

        {/* Pivot Table Grid */}
        <div className="overflow-x-auto border border-slate-200 rounded-xl shadow-3xs bg-white">
          <table className="w-full text-left border-collapse min-w-[900px]">
            {/* Top row of headers: Distance Column Labels */}
            <thead>
              <tr className="bg-slate-50 text-slate-600 border-b border-slate-200 text-xs font-bold">
                {/* Blank/Row Label Header corner */}
                <th className="p-2 border-r border-slate-200 w-32 bg-slate-100 font-extrabold text-slate-800">
                  Column Labels
                </th>
                
                {/* Dynamically list distances */}
                {uniqueDistances.map(dist => (
                  <th 
                    key={dist} 
                    colSpan={3} 
                    className="p-2 border-r border-slate-200 text-center bg-slate-50/80 font-black text-slate-900 border-b-2 border-slate-300"
                  >
                    Cự ly: {dist}
                  </th>
                ))}

                {/* Combined totals header column */}
                <th colSpan={3} className="p-2 text-center bg-indigo-50 text-indigo-950 font-black border-l-2 border-indigo-200">
                  Tổng Cộng (Grand)
                </th>
              </tr>

              {/* Sub headers row: SL, %, $ */}
              <tr className="bg-slate-50 text-slate-500 border-b border-slate-200 text-[11px] font-bold">
                {/* Row label column name */}
                <th className="p-2 border-r border-slate-200 bg-slate-50 text-slate-700 font-black">
                  Row Labels
                </th>

                {/* Under each distance column, list subheaders */}
                {uniqueDistances.map(dist => (
                  <React.Fragment key={dist}>
                    <th className="p-1.5 text-center border-r border-slate-200 w-16 text-slate-600">SL</th>
                    <th className="p-1.5 text-center border-r border-slate-200 w-16 text-slate-600">%</th>
                    <th className="p-1.5 text-right border-r border-slate-200 w-28 text-slate-600 pr-3">$</th>
                  </React.Fragment>
                ))}

                {/* Subheaders for overall row totals */}
                <th className="p-1.5 text-center border-r border-slate-200 w-16 bg-indigo-50/50 text-indigo-900 border-l-2 border-indigo-200">Total SL</th>
                <th className="p-1.5 text-center border-r border-slate-200 w-16 bg-indigo-50/50 text-indigo-900">Total %</th>
                <th className="p-1.5 text-right bg-indigo-50/50 text-indigo-900 pr-3">Total $</th>
              </tr>
            </thead>

            {/* Matrix Data Rows */}
            <tbody className="divide-y divide-slate-200 text-xs font-medium">
              {visibleRows.map((row, index) => {
                const isEven = index % 2 === 0;
                const rowTotal = pivotData.rowTotals[row] || { sl: 0, amount: 0 };

                return (
                  <tr 
                    key={row} 
                    className={`hover:bg-slate-50/80 transition-colors ${
                      isEven ? 'bg-white' : 'bg-slate-50/30'
                    }`}
                  >
                    {/* Row Label */}
                    <td className="p-2 font-black text-slate-800 border-r border-slate-200 bg-slate-50/40">
                      {row}
                    </td>

                    {/* Columns under each distance */}
                    {uniqueDistances.map(dist => {
                      const cell = pivotData.matrix[row][dist] || { sl: 0, amount: 0 };
                      const hasData = cell.sl > 0;
                      
                      return (
                        <React.Fragment key={dist}>
                          {/* SL (Count) */}
                          <td className={`p-2 text-center border-r border-slate-150 font-sans ${!hasData ? 'text-slate-300' : 'text-slate-900 font-bold'}`}>
                            {cell.sl}
                          </td>
                          {/* % (Percent of overall count) */}
                          <td className={`p-2 text-center border-r border-slate-150 font-mono text-[10px] ${!hasData ? 'text-slate-300' : 'text-slate-500 font-semibold'}`}>
                            {calculatePercentage(cell.sl)}
                          </td>
                          {/* $ (Revenue Amount) */}
                          <td className={`p-2 text-right border-r border-slate-200 font-mono pr-3 ${!hasData ? 'text-slate-300' : 'text-emerald-700 font-extrabold'}`}>
                            {formatCurrency(cell.amount)}
                          </td>
                        </React.Fragment>
                      );
                    })}

                    {/* Overall Row Totals (Grand Rightmost cols) */}
                    <td className="p-2 text-center border-r border-slate-150 font-black text-slate-900 bg-indigo-50/20 border-l-2 border-indigo-100">
                      {rowTotal.sl}
                    </td>
                    <td className="p-2 text-center border-r border-slate-150 font-black font-mono text-[10px] text-indigo-900 bg-indigo-50/20">
                      {calculatePercentage(rowTotal.sl)}
                    </td>
                    <td className="p-2 text-right font-mono pr-3 font-black text-emerald-800 bg-indigo-50/20">
                      {formatCurrency(rowTotal.amount)}
                    </td>
                  </tr>
                );
              })}

              {/* Bottom Grand Total Row */}
              <tr className="bg-slate-100 font-black text-slate-900 text-xs border-t-2 border-slate-300 border-b-2">
                {/* Grand Total Label */}
                <td className="p-2 border-r border-slate-200 text-slate-950 uppercase tracking-tight font-extrabold bg-slate-200/50">
                  Grand Total
                </td>

                {/* For each distance column, render column totals */}
                {uniqueDistances.map(dist => {
                  const colTotal = pivotData.colTotals[dist] || { sl: 0, amount: 0 };
                  return (
                    <React.Fragment key={dist}>
                      {/* SL Column Grand Total */}
                      <td className="p-2 text-center border-r border-slate-200 font-sans font-extrabold text-slate-950 bg-slate-50">
                        {colTotal.sl}
                      </td>
                      {/* % Column Grand Total */}
                      <td className="p-2 text-center border-r border-slate-200 font-mono text-[11px] text-slate-600 bg-slate-50">
                        {calculatePercentage(colTotal.sl)}
                      </td>
                      {/* $ Column Grand Total */}
                      <td className="p-2 text-right border-r border-slate-200 font-mono pr-3 font-black text-emerald-900 bg-slate-50">
                        {formatCurrency(colTotal.amount)}
                      </td>
                    </React.Fragment>
                  );
                })}

                {/* Final Absolute Intersection Totals */}
                <td className="p-2 text-center border-r border-slate-200 bg-indigo-100 text-indigo-950 font-black border-l-2 border-indigo-200">
                  {pivotData.totalSL}
                </td>
                <td className="p-2 text-center border-r border-slate-200 bg-indigo-100 text-indigo-950 font-black font-mono">
                  100%
                </td>
                <td className="p-2 text-right bg-indigo-100 text-emerald-950 font-black font-mono pr-3">
                  {formatCurrency(pivotData.totalAmount)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Legend notes */}
        <div className="flex items-start gap-2 bg-slate-50 p-3.5 rounded-lg border border-slate-200 text-[11px] text-slate-500 leading-relaxed">
          <HelpCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-extrabold text-slate-700 block mb-0.5">HƯỚNG DẪN ĐỌC BÁO CÁO PIVOT:</span>
            <ul className="list-disc pl-4 space-y-1">
              <li>Cột <strong>SL (Số lượng)</strong>: Đếm số lượng mã <strong>USER ID</strong> của ô cự ly và nhóm tuổi tương ứng.</li>
              <li>Cột <strong>% (Phần trăm Số lượng)</strong>: Tỷ lệ phần trăm số lượng người đăng ký của ô đó so với tổng số lượng đăng ký đã lọc (<span className="font-semibold text-indigo-700">{pivotData.totalSL.toLocaleString()} lượt</span>).</li>
              <li>Cột <strong>$ (Số tiền)</strong>: Tổng số tiền nạp tương ứng của ô (Sum của cột <strong>SO TIEN</strong>).</li>
            </ul>
          </div>
        </div>

      </div>
    </div>

    {/* Render the chart component here */}
    <PivotChart
      visibleRows={visibleRows}
      uniqueDistances={uniqueDistances}
      matrix={pivotData.matrix}
      selectedPartner={selectedPartner}
    />
  </div>
  );
};
