import React, { useState, useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LabelList,
} from 'recharts';
import { TrendingUp, BarChart3, HelpCircle, DollarSign, Users } from 'lucide-react';

const CustomXAxisTick: React.FC<any> = ({ x, y, payload, uniqueDistances }) => {
  if (!payload) return null;
  return (
    <g transform={`translate(${x},${y})`}>
      <text x={0} y={0} dy={14} textAnchor="middle" fill="#1e293b" className="text-xs font-black font-sans">
        {payload.value}
      </text>
      <text x={0} y={0} dy={28} textAnchor="middle" fill="#64748b" className="text-[10px] font-sans font-bold tracking-tight">
        {`Cự ly: ${uniqueDistances?.join(' | ')}`}
      </text>
    </g>
  );
};

interface PivotChartProps {
  visibleRows: string[];
  uniqueDistances: string[];
  matrix: Record<string, Record<string, { sl: number; amount: number }>>;
  selectedPartner: string;
}

export const PivotChart: React.FC<PivotChartProps> = ({
  visibleRows,
  uniqueDistances,
  matrix,
  selectedPartner,
}) => {
  // Metric toggle state: 'amount' ($) or 'sl' (Count)
  const [activeMetric, setActiveMetric] = useState<'amount' | 'sl'>('amount');

  // Convert the matrix into a format that Recharts can consume
  const chartData = useMemo(() => {
    // We only display the standard age groups (excluding 'Khác', 'Chưa rõ' if they don't have records)
    // to match the clean Excel layout
    return visibleRows
      .filter((row) => row !== 'Khác' && row !== 'Chưa rõ')
      .map((row) => {
        const item: any = { name: row };
        uniqueDistances.forEach((dist) => {
          const cell = matrix[row]?.[dist] || { sl: 0, amount: 0 };
          item[`${dist}_sl`] = cell.sl;
          item[`${dist}_amount`] = cell.amount;
        });
        return item;
      });
  }, [visibleRows, uniqueDistances, matrix]);

  // Dynamic colors for distances to match the Excel palette
  const distanceColors: Record<string, string> = {
    '5': '#84cc16',   // Lime Green (5 - $)
    '10': '#f97316',  // Bright Orange (10 - $)
    '21': '#4d7c0f',  // Olive Green (21 - $)
  };

  const fallbackColors = ['#6366f1', '#3b82f6', '#14b8a6', '#ec4899'];

  const getDistanceColor = (dist: string, index: number) => {
    return distanceColors[dist] || fallbackColors[index % fallbackColors.length];
  };

  const formatYAxis = (value: number) => {
    if (activeMetric === 'amount') {
      if (value >= 1000000) {
        return `${(value / 1000000).toFixed(1)}M`;
      }
      return value.toLocaleString('vi-VN');
    }
    return value.toString();
  };

  const formatTooltipValue = (value: number) => {
    if (activeMetric === 'amount') {
      return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND',
        maximumFractionDigits: 0,
      }).format(value);
    }
    return `${value} lượt đăng ký`;
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden" id="pivot-chart-section">
      {/* Header */}
      <div className="p-6 border-b border-slate-100 bg-linear-to-r from-blue-50/40 to-indigo-50/40">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="p-1 px-2.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 tracking-wider uppercase flex items-center gap-1">
                <BarChart3 className="w-3.5 h-3.5" />
                BIỂU ĐỒ TRỰC QUAN (PIVOT CHART)
              </span>
            </div>
            <h2 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
              Biểu Đồ Phân Phối Theo Cự Ly & Nhóm Tuổi
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Trực quan hóa số liệu của đối tác <span className="font-bold text-indigo-600">{selectedPartner}</span> theo từng phân khúc.
            </p>
          </div>

          {/* Metric Selector Toggles */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 shadow-3xs self-start sm:self-center shrink-0">
            <button
              onClick={() => setActiveMetric('amount')}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeMetric === 'amount'
                  ? 'bg-white text-emerald-800 shadow-2xs border border-slate-200/50'
                  : 'text-slate-500 hover:text-slate-850'
              }`}
            >
              <DollarSign className="w-3.5 h-3.5" />
              <span>Doanh Thu ($)</span>
            </button>
            <button
              onClick={() => setActiveMetric('sl')}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeMetric === 'sl'
                  ? 'bg-white text-indigo-800 shadow-2xs border border-slate-200/50'
                  : 'text-slate-500 hover:text-slate-850'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Số Lượng (SL)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="p-6">
        <div className="w-full h-[400px] mt-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 25, right: 10, left: 15, bottom: 25 }}
              barGap={4}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis
                dataKey="name"
                tickLine={false}
                axisLine={{ stroke: '#cbd5e1' }}
                tick={<CustomXAxisTick uniqueDistances={uniqueDistances} />}
                height={45}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickFormatter={formatYAxis}
                tick={{ fill: '#64748b', fontSize: 10, fontFamily: 'monospace' }}
              />
              <Tooltip
                cursor={{ fill: '#f8fafc' }}
                contentStyle={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                  padding: '12px',
                }}
                labelStyle={{ fontWeight: 'black', color: '#1e293b', marginBottom: '6px', fontSize: '12px' }}
                itemStyle={{ fontSize: '11px', padding: '2px 0' }}
                formatter={(value: any, name: string) => [
                  formatTooltipValue(value),
                  `Cự ly: ${name.split('_')[0]}km`,
                ]}
              />
              <Legend
                verticalAlign="top"
                height={40}
                iconType="rect"
                iconSize={12}
                wrapperStyle={{ fontSize: '11px', fontWeight: 'bold', color: '#334155' }}
                formatter={(value: string) => {
                  const dist = value.split('_')[0];
                  return `Cự ly: ${dist}km`;
                }}
              />

              {/* Render a bar for each unique distance dynamically */}
              {uniqueDistances.map((dist, idx) => (
                <Bar
                  key={dist}
                  dataKey={`${dist}_${activeMetric}`}
                  name={`${dist}_${activeMetric}`}
                  fill={getDistanceColor(dist, idx)}
                  radius={[4, 4, 0, 0]}
                  maxBarSize={35}
                >
                  <LabelList
                    dataKey={`${dist}_${activeMetric}`}
                    position="top"
                    formatter={(value: any) => {
                      if (!value) return '';
                      if (activeMetric === 'amount') {
                        if (value >= 1000000) {
                          const valM = value / 1000000;
                          return `${valM % 1 === 0 ? valM.toFixed(0) : valM.toFixed(1)}M`;
                        }
                        if (value >= 1000) {
                          const valK = value / 1000;
                          return `${valK % 1 === 0 ? valK.toFixed(0) : valK.toFixed(1)}k`;
                        }
                        return value.toString();
                      }
                      return value.toLocaleString('vi-VN');
                    }}
                    style={{ fill: '#475569', fontSize: 9, fontWeight: 'black', fontFamily: 'monospace' }}
                  />
                </Bar>
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Informative Note */}
        <div className="flex items-start gap-2 bg-slate-50 p-4 rounded-xl border border-slate-200 text-[11px] text-slate-500 mt-6 leading-relaxed">
          <HelpCircle className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-extrabold text-slate-700 block mb-0.5">GIẢI THÍCH BIỂU ĐỒ:</span>
            <p>
              Biểu đồ trên thể hiện phân bổ {activeMetric === 'amount' ? 'doanh thu nạp tiền (VND)' : 'số lượng người đăng ký (SL)'} của đối tác <strong className="text-indigo-600">{selectedPartner}</strong> chia theo từng nhóm tuổi và phân rã chi tiết theo cự ly chạy.
            </p>
            <p className="mt-1">
              * Khác với Excel hiển thị chồng chéo nhiều đơn vị đo khác nhau lên cùng một cột làm biểu đồ bị méo mó, ứng dụng đã tách biệt thông minh giữa hai chế độ xem <strong>Doanh Thu ($)</strong> và <strong>Số Lượng (SL)</strong> giúp việc phân tích trực quan đạt độ chính xác cao nhất.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
