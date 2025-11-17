"use client"; // Next.js 13+ App Router では "use client" が必要かもしれません

import React, { useState, useMemo, useRef, useCallback } from 'react';
import { EnergyRecord, Habit, EnergyCategory } from '../types';
import { ENERGY_CATEGORIES } from '../constants';

interface AnalyticsProps {
  energyHistory: EnergyRecord[];
  habits: Habit[];
  setIsHelpOpen: (isOpen: boolean) => void;
  // 追加: checkins を受け取ってチャート表示
  checkins?: { id?: string; date: string; value: number; createdAt?: string }[];
  // 追加: チェックアウトの推移（オプション） -> rating を利用
  checkouts?: { id?: string; date: string; gratitude?: string; note?: string; rating?: number | null; createdAt?: string }[];
}

type Period = 7 | 30 | 'all';
type TooltipData = { x: number; y: number; content: React.ReactNode; };

const HelpIcon: React.FC<{className?: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9
 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
    </svg>
);


// SVG Path smoothing function (Catmull-Rom)
const createSpline = (points: {x: number; y: number}[]) => {
  if (points.length < 2) return '';
  let path = `M${points[0].x},${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = i > 0 ? points[i - 1] : points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = i < points.length - 2 ? points[i + 2] : p2;
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    path += ` C${cp1x},${cp1y} ${cp2x},${cp2y} ${p2.x},${p2.y}`;
  }
  return path;
};


const Analytics: React.FC<AnalyticsProps> = ({ energyHistory, habits, setIsHelpOpen, checkins, checkouts }) => {
  const [period, setPeriod] = useState<Period>(7);
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);
  const chartRef = useRef<HTMLDivElement>(null);
  const allCategories = useMemo(() => Object.keys(ENERGY_CATEGORIES) as EnergyCategory[], []);
  const [visibleCategories, setVisibleCategories] = useState<Set<EnergyCategory>>(new Set(allCategories));
  // --- 追加: チャート切替(state) ---
  const [checkChartMode, setCheckChartMode] = useState<'checkin' | 'checkout' | 'both'>('both');

  const handleCategoryToggle = (category: EnergyCategory) => {
    setVisibleCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(category)) {
        newSet.delete(category);
      } else {
        newSet.add(category);
      }
      return newSet;
    });
  };

  const filteredHistory = useMemo(() => {
    if (period === 'all' || energyHistory.length === 0) return energyHistory;
    const now = new Date();
    const cutoff = new Date(now.setDate(now.getDate() - period));
    return energyHistory.filter(record => new Date(record.date) >= cutoff);
  }, [energyHistory, period]);


  const habitData = useMemo(() => {
    if (habits.length === 0) return [];
    
    const dateStrings = new Set<string>();
    filteredHistory.forEach(r => dateStrings.add(r.date));
    habits.forEach(h => h.completedDates.forEach(d => dateStrings.add(d)));
    
    const allDates = Array.from(dateStrings).map(d => new Date(d)).sort((a,b) => a.getTime() - b.getTime());
    
    // helper: 簡易スケジュール判定（frequencyType等に応じて対象日か判定）
   const isHabitScheduledForDate = (habit: Habit, date: Date) => {
      const ft = (habit.frequencyType || 'daily');
      if (ft === 'daily') return true;
      const dnum = date.getDate();
      const dow = date.getDay(); // 0 Sun - 6 Sat
      const fv = habit.frequencyValue ?? [];
      if (ft === 'weekly' && Array.isArray(fv) && fv.length > 0) {
        // support both 0-6 and 1-7 representations
        return fv.includes(dow) || fv.includes((dow + 1));
      }
      if (ft === 'monthly' && Array.isArray(fv) && fv.length > 0) {
        return fv.includes(dnum);
      }
      return true;
    };

    const isHabitCompletedOnDate = (habit: Habit, dateStr: string) => {
      if (habit.type === 'amount') {
        const val = (habit.completedAmounts || {})[dateStr] ?? 0;
        const target = habit.target ?? 0;
        return target > 0 ? val >= target : val > 0;
      }
      return (habit.completedDates || []).includes(dateStr);
    };
    return allDates.map(date => {
        const dateStr = date.toLocaleDateString('sv-SE');
        // scheduled & not skipped
        const scheduledHabits = habits.filter(h => {
          const skipped = (h as any).skippedDates ?? [];
          return isHabitScheduledForDate(h, date) && !skipped.includes(dateStr);
        });
        const completedCount = scheduledHabits.reduce((count, habit) =>
            isHabitCompletedOnDate(habit, dateStr) ? count + 1 : count, 0);
        const total = scheduledHabits.length;
        return {
            date,
            rate: total > 0 ? (completedCount / total) * 100 : 0,
            completed: completedCount,
            total
        };
    }).filter(d => {
        if (period === 'all') return true;
        const now = new Date();
        const cutoff = new Date(new Date().setDate(now.getDate() - period));
        return d.date >= cutoff;
    });

  }, [habits, period, filteredHistory]);

  const handleMouseMove = useCallback((e: React.MouseEvent<SVGRectElement, MouseEvent>, dataPoints: any[], contentFn: (d: any) => React.ReactNode) => {
    const svg = e.currentTarget.ownerSVGElement;
    if (!svg) return;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const { x: svgX } = pt.matrixTransform(svg.getScreenCTM()?.inverse());

    const closestPoint = dataPoints.reduce((closest, p) =>
        Math.abs(p.x - svgX) < Math.abs(closest.x - svgX) ? p : closest);

    if (closestPoint && Math.abs(closestPoint.x - svgX) < 20) {
        setTooltip({
          x: closestPoint.x,
          y: closestPoint.y,
          content: contentFn(closestPoint.data)
        });
    } else {
        setTooltip(null);
    }
  }, []);

  const renderEnergyChart = () => {
    const data = filteredHistory.slice().sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    if (data.length < 2) return <p className="text-gray-500 text-center py-10">グラフを表示するには、診断データが2件以上必要です。</p>;

    const categories = allCategories.filter(cat => visibleCategories.has(cat));
    if (categories.length === 0) return <p className="text-gray-500 text-center py-10">表示するエネルギーを選択してください。</p>;

    const width = 600;
    const height = 300;
    const margin = { top: 20, right: 20, bottom: 40, left: 40 };

    // helper: x/y scales
    const xScale = (i: number, len = data.length) => margin.left + i * (width - margin.left - margin.right) / Math.max(1, len - 1);
    const yScaleForMax = (maxVal: number) => (val: number) => height - margin.bottom - (val / maxVal) * (height - margin.top - margin.bottom);

    // If all categories selected -> show total line
    if (categories.length === allCategories.length) {
      const totals = data.map(d => ({
        date: d.date,
        total: allCategories.reduce((s, c) => s + (d[c] || 0), 0),
      }));
      const maxVal = Math.max(...totals.map(t => t.total), 20);
      const yMax = Math.ceil(maxVal / 10) * 10;
      const yScale = yScaleForMax(yMax);
      const points = totals.map((t, i) => ({ x: xScale(i, totals.length), y: yScale(t.total), data: t }));
      const path = createSpline(points.map(p => ({ x: p.x, y: p.y })));

      return (
        <div className="relative">
          <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-labelledby="energy-chart-title" className="w-full">
            <title id="energy-chart-title">エネルギー合計の推移</title>

            {/* axes */}
            <line x1={margin.left} y1={height - margin.bottom} x2={width - margin.right} y2={height - margin.bottom} stroke="#D1D5DB" />
            <line x1={margin.left} y1={margin.top} x2={margin.left} y2={height - margin.bottom} stroke="#D1D5DB" />

            {/* y grid */}
            {Array.from({ length: 5 }).map((_, idx) => {
              const val = Math.round((yMax / 4) * idx);
              return (
                <g key={idx}>
                  <text x={margin.left - 8} y={yScale(val) + 4} textAnchor="end" fontSize="12" fill="#6B7281">{val}</text>
                  <line x1={margin.left} y1={yScale(val)} x2={width - margin.right} y2={yScale(val)} stroke="#E5E7EB" strokeDasharray="2,2" />
                </g>
              );
            })}

            {/* x labels */}
            {points.map((p, i) => ((i % Math.max(1, Math.floor(points.length / 7)) === 0) && (
              <text key={i} x={p.x} y={height - margin.bottom + 15} textAnchor="middle" fontSize="12" fill="#6B7281">
                {new Date((p.data as any).date).toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' })}
              </text>
            )))}

            {/* line */}
            <path d={path} fill="none" stroke="#4F46E5" strokeWidth="2" />

            {/* points */}
            {points.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r="3" fill="#4F46E5" />)}

            {/* interaction rect for tooltip */}
            <rect
              x={margin.left} y={margin.top}
              width={width - margin.left - margin.right}
              height={height - margin.top - margin.bottom}
              fill="transparent"
              onMouseMove={e => handleMouseMove(e, points, (d: any) => (
                <div className="text-xs">
                  <p className="font-bold mb-1">{new Date(d.date).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                  <p>合計: {(d.total ?? 0)}</p>
                </div>
              ))}
              onMouseLeave={() => setTooltip(null)}
            />
          </svg>

          {tooltip && (
            <div className="absolute p-2 text-sm bg-white rounded-md shadow-lg pointer-events-none" style={{ left: tooltip.x + 10, top: tooltip.y - 10, transform: 'translateY(-50%)' }}>
              {tooltip.content}
            </div>
          )}
        </div>
      );
    }

    // If exactly one category selected -> show that single category line
    if (categories.length === 1) {
      const cat = categories[0];
      const maxVal = Math.max(...data.map(d => d[cat] || 0), 10);
      const yMax = Math.ceil(maxVal / 10) * 10;
      const yScale = yScaleForMax(yMax);
      const points = data.map((d, i) => ({ x: xScale(i, data.length), y: yScale(d[cat] || 0), data: d }));
      const path = createSpline(points.map(p => ({ x: p.x, y: p.y })));
      const color = ENERGY_CATEGORIES[cat].color || '#4F46E5';

      return (
        <div className="relative">
          <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-labelledby="energy-chart-title" className="w-full">
            <title id="energy-chart-title">{ENERGY_CATEGORIES[cat].name}の推移</title>

            <line x1={margin.left} y1={height - margin.bottom} x2={width - margin.right} y2={height - margin.bottom} stroke="#D1D5DB" />
            <line x1={margin.left} y1={margin.top} x2={margin.left} y2={height - margin.bottom} stroke="#D1D5DB" />

            {[0, Math.round(yMax / 2), yMax].map((val, idx) => (
              <g key={idx}>
                <text x={margin.left - 8} y={yScale(val) + 4} textAnchor="end" fontSize="12" fill="#6B7281">{val}</text>
                <line x1={margin.left} y1={yScale(val)} x2={width - margin.right} y2={yScale(val)} stroke="#E5E7EB" strokeDasharray="2,2" />
              </g>
            ))}

            {points.map((p, i) => ((i % Math.max(1, Math.floor(points.length / 7)) === 0) && (
              <text key={i} x={p.x} y={height - margin.bottom + 15} textAnchor="middle" fontSize="12" fill="#6B7281">
                {new Date((p.data as any).date).toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' })}
              </text>
            )))}

            <path d={path} fill="none" stroke={color} strokeWidth="2" />
            {points.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r="3" fill={color} />)}

            <rect
              x={margin.left} y={margin.top}
              width={width - margin.left - margin.right}
              height={height - margin.top - margin.bottom}
              fill="transparent"
              onMouseMove={e => handleMouseMove(e, points, (d: any) => (
                <div className="text-xs">
                  <p className="font-bold mb-1">{new Date(d.date).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                  <p>{ENERGY_CATEGORIES[cat].name}: {d[cat]}</p>
                </div>
              ))}
              onMouseLeave={() => setTooltip(null)}
            />
          </svg>

          {tooltip && (
            <div className="absolute p-2 text-sm bg-white rounded-md shadow-lg pointer-events-none" style={{ left: tooltip.x + 10, top: tooltip.y - 10, transform: 'translateY(-50%)' }}>
              {tooltip.content}
            </div>
          )}
        </div>
      );
    }

    // multiple but not all -> ask user to select one or all
    return <p className="text-gray-500 text-center py-10">個別エネルギーを表示する場合は1つだけ選んでください。合計を見たい場合は全てを選択してください。</p>;
  }

  const renderHabitChart = () => {
    const data = habitData.slice().sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    if (data.length < 2) return <p className="text-gray-500 text-center py-10">グラフを表示するには、記録データが2件以上必要です。</p>;

    const width = 600;
    const height = 300;
    const margin = { top: 20, right: 20, bottom: 40, left: 40 };
    
    const xScale = (i: number) => margin.left + i * (width - margin.left - margin.right) / (data.length - 1);
    const yScale = (val: number) => height - margin.bottom - (val / 100) * (height - margin.top - margin.bottom);
    const points = data.map((d, i) => ({ x: xScale(i), y: yScale(d.rate), data: d }));
    const path = createSpline(points);

    return (
        <div className="relative">
            <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-labelledby="habit-chart-title">
                <title id="habit-chart-title">習慣達成率の推移グラフ</title>
                {/* Axes */}
                <line x1={margin.left} y1={height - margin.bottom} x2={width - margin.right} y2={height - margin.bottom} stroke="#D1D5DB" />
                <line x1={margin.left} y1={margin.top} x2={margin.left} y2={height - margin.bottom} stroke="#D1D5DB" />
                {[0, 25, 50, 75, 100].map(val => (
                    <g key={val}>
                        <text x={margin.left - 8} y={yScale(val) + 4} textAnchor="end" fontSize="12" fill="#6B7281">{val}%</text>
                        <line x1={margin.left} y1={yScale(val)} x2={width - margin.right} y2={yScale(val)} stroke="#E5E7EB" strokeDasharray="2,2"/>
                    </g>
                ))}
                {data.map((d, i) => (
                    (i % Math.max(1, Math.floor(data.length / 10)) === 0) &&
                    <text key={i} x={xScale(i)} y={height - margin.bottom + 15} textAnchor="middle" fontSize="12" fill="#6B7281">
                        {d.date.toLocaleDateString('ja-JP', {month:'numeric', day:'numeric'})}
                    </text>
                ))}
                
                {/* Line */}
                <path d={path} fill="none" stroke="#4F46E5" strokeWidth="2" />
                {points.map((p, i) => (
                    <circle key={i} cx={p.x} cy={p.y} r="3" fill="#4F46E5" />
                ))}

                {/* Tooltip interaction layer */}
                <rect 
                    x={margin.left} y={margin.top} 
                    width={width - margin.left - margin.right} 
                    height={height - margin.top - margin.bottom}
                    fill="transparent"
                    onMouseMove={e => handleMouseMove(e, points, d => (
                        <div className="text-xs">
                            <p className="font-bold">{d.date.toLocaleDateString('ja-JP', { month: 'long', day: 'numeric' })}</p>
                            <p>達成率: {d.rate.toFixed(0)}%</p>
                            <p className="text-gray-500">({d.completed}/{d.total}件)</p>
                        </div>
                    ))}
                    onMouseLeave={() => setTooltip(null)}
                />
                {tooltip && <line x1={tooltip.x} y1={margin.top} x2={tooltip.x} y2={height - margin.bottom} stroke="#4F46E5" strokeDasharray="3,3" />}
            </svg>
            {tooltip && (
                <div className="absolute p-2 text-sm bg-white rounded-md shadow-lg pointer-events-none" style={{ left: tooltip.x + 10, top: tooltip.y - 10, transform: 'translateY(-50%)' }}>
                    {tooltip.content}
                </div>
            )}
        </div>
    )
  }

  const renderCheckinChart = () => {
    return (
      <div className="bg-white p-4 sm:p-6 rounded-xl shadow-md">
        <h3 className="text-lg font-semibold text-gray-800 mb-3">チェックインの推移</h3>
        {(!checkins || checkins.length < 2) ? (
          <p className="text-gray-500 text-center py-6">チェックインが2件以上必要です。</p>
        ) : (
          (() => {
            const data = (checkins || []).slice().sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
            const width = 600, height = 300, margin = { left: 40, right: 20, top: 10, bottom: 28 }; // height を倍に
            const x = (i:number) => margin.left + i * (width - margin.left - margin.right) / Math.max(1, data.length - 1);
            const y = (v:number) => margin.top + (5 - v) * ((height - margin.top - margin.bottom) / 4);
            const points = data.map((d,i) => ({ x: x(i), y: y(d.value), v: d }));
            const path = createSpline(points.map(p => ({x:p.x,y:p.y})));
            return (
              <div className="relative overflow-auto">
                <svg viewBox={`0 0 ${width} ${height}`} className="w-full">
                  {/* 左軸: 1-5 の目盛り */}
                  {[1,2,3,4,5].map(val => {
                    const yy = y(val);
                    return (
                      <g key={val}>
                        <text x={margin.left - 12} y={yy + 4} textAnchor="end" fontSize="12" fill="#6B7281">{val}</text>
                        <line x1={margin.left} y1={yy} x2={width - margin.right} y2={yy} stroke="#F3F4F6" strokeDasharray="2,2" />
                      </g>
                    )
                  })}
                  <path d={path} fill="none" stroke="#4F46E5" strokeWidth="2" />
                  {points.map((p,i) => (
                    <g key={i}>
                      <circle cx={p.x} cy={p.y} r={5} fill="#4F46E5" />
                    </g>
                  ))}
                  {data.map((d,i) => (
                    (i % Math.max(1, Math.floor(data.length / 6)) === 0) &&
                    <text key={i} x={x(i)} y={height - 6} textAnchor="middle" fontSize="12" fill="#6B7281">
                      {new Date(d.date).toLocaleDateString('ja-JP', {month:'numeric', day:'numeric'})}
                    </text>
                  ))}
                </svg>

                {/* 凡例: 1-5 の意味を表示 */}
                <div className="mt-3 text-sm text-gray-600 flex flex-wrap gap-3">
                  <div className="flex items-center gap-2"><span className="inline-block w-2 h-2 bg-gray-400 rounded-full" />1: とても低い</div>
                  <div className="flex items-center gap-2"><span className="inline-block w-2 h-2 bg-gray-400 rounded-full" />2: 低い</div>
                  <div className="flex items-center gap-2"><span className="inline-block w-2 h-2 bg-gray-400 rounded-full" />3: 普通</div>
                  <div className="flex items-center gap-2"><span className="inline-block w-2 h-2 bg-gray-400 rounded-full" />4: 高い</div>
                  <div className="flex items-center gap-2"><span className="inline-block w-2 h-2 bg-gray-400 rounded-full" />5: とても高い</div>
                </div>
              </div>
            );
          })()
        )}
      </div>
    )
  }

  const renderCheckoutChart = () => {
    return (
      <div className="bg-white p-4 sm:p-6 rounded-xl shadow-md">
        <h3 className="text-lg font-semibold text-gray-800 mb-3">チェックアウトの推移</h3>
        {(() => {
          const co = (checkouts || []).slice().sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
          if (typeof window !== 'undefined') console.debug('[Analytics] checkouts sample:', co.slice(0,10));

          // 柔軟に数値を抽出（rating, value, score 等を試し、文字列数字も数値化）
          const extractNumeric = (c: any) => {
            const cand = c.rating ?? c.value ?? c.score ?? c.rating_score ?? null;
            if (cand === null || cand === undefined) return null;
            if (typeof cand === 'number') return Number.isFinite(cand) ? cand : null;
            if (typeof cand === 'string' && cand.trim() !== '') {
              const n = Number(cand);
              return Number.isFinite(n) ? n : null;
            }
            return null;
          };

          const withNum = co.map(c => ({ ...c, _num: extractNumeric(c) }));
          const rated = withNum.filter(c => c._num !== null);
          if (rated.length < 2) {
            return (
              <div className="text-center py-6 text-gray-500">
                <div>チェックアウトの評価（rating）が2件以上必要です。</div>
                <div className="text-xs text-gray-400 mt-2">受け渡されたチェックアウト数: {co.length}、評価を持つもの: {rated.length}</div>
              </div>
            );
          }

          // 明示的に number にキャストして型を確定させる
          const data = rated.map(c => ({ ...c, value: c._num as number }));
          const width = 600, height = 300, margin = { left: 40, right: 20, top: 10, bottom: 28 };
          const x = (i:number) => margin.left + i * (width - margin.left - margin.right) / Math.max(1, data.length - 1);
          const y = (v:number) => margin.top + (5 - v) * ((height - margin.top - margin.bottom) / 4);
          const points = data.map((d,i) => ({ x: x(i), y: y(d.value), v: d }));
          const path = createSpline(points.map(p => ({x:p.x,y:p.y})));

          return (
            <div className="relative overflow-auto">
              <svg viewBox={`0 0 ${width} ${height}`} className="w-full">
                {[1,2,3,4,5].map(val => {
                  const yy = y(val);
                  return (
                    <g key={val}>
                      <text x={margin.left - 12} y={yy + 4} textAnchor="end" fontSize="12" fill="#6B7281">{val}</text>
                      <line x1={margin.left} y1={yy} x2={width - margin.right} y2={yy} stroke="#F3F4F6" strokeDasharray="2,2" />
                    </g>
                  )
                })}
                <path d={path} fill="none" stroke="#10B981" strokeWidth="2" />
                {points.map((p,i) => <circle key={i} cx={p.x} cy={p.y} r={5} fill="#10B981" />)}
                {data.map((d,i) => (
                  (i % Math.max(1, Math.floor(data.length / 6)) === 0) &&
                  <text key={i} x={x(i)} y={height - 6} textAnchor="middle" fontSize="12" fill="#6B7281">
                    {new Date(d.date).toLocaleDateString('ja-JP', {month:'numeric', day:'numeric'})}
                  </text>
                ))}
              </svg>
              <div className="mt-3 text-sm text-gray-600">チェックアウト: 1(低)〜5(高)</div>
            </div>
          );
        })()}
      </div>
    )
  }

  const renderBothChart = () => {
    // prepare series (sorted ascending)
    const ci = (checkins || []).slice().sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const co = (checkouts || []).slice().sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const extractNumeric = (c: any) => {
      const cand = c.rating ?? c.value ?? c.score ?? null;
      if (cand === null || cand === undefined) return null;
      if (typeof cand === 'number') return Number.isFinite(cand) ? cand : null;
      if (typeof cand === 'string' && cand.trim() !== '') {
        const n = Number(cand);
        return Number.isFinite(n) ? n : null;
      }
      return null;
    };
    const checkoutSeries = co.map(c => ({ date: c.date, v: extractNumeric(c) })).filter(x => x.v !== null);
    // checkins 型には value が存在するので value をそのまま使う（不要なプロパティ参照を排除）
    const checkinSeries = ci.map(c => ({ date: c.date, v: Number(c.value) })).filter(x => !isNaN(x.v));

    const allDates = Array.from(new Set([...checkoutSeries.map(s=>s.date), ...checkinSeries.map(s=>s.date)])).sort((a,b)=> new Date(a).getTime() - new Date(b).getTime());
    if (allDates.length < 2) return <p className="text-gray-500 text-center py-6">グラフ表示に必要なデータが不足しています。</p>;

    const width = 600, height = 300, margin = { left: 40, right: 20, top: 10, bottom: 28 };
    const xScale = (i:number) => margin.left + i * (width - margin.left - margin.right) / Math.max(1, allDates.length - 1);
    const maxVal = Math.max(...allDates.map(d => {
      const cs = checkoutSeries.find(s=>s.date===d)?.v ?? 0;
      const is = checkinSeries.find(s=>s.date===d)?.v ?? 0;
      return Math.max(cs, is);
    }), 5);
    const yScale = (val:number) => height - margin.bottom - (val / Math.max(5, maxVal)) * (height - margin.top - margin.bottom);

    const checkoutPoints = allDates.map((d,i) => {
      const v = checkoutSeries.find(s=>s.date===d)?.v ?? null;
      return { x: xScale(i), y: v !== null ? yScale(v) : null, date: d, v };
    });
    const checkinPoints = allDates.map((d,i) => {
      const v = checkinSeries.find(s=>s.date===d)?.v ?? null;
      return { x: xScale(i), y: v !== null ? yScale(v) : null, date: d, v };
    });

    const pathFor = (pts:any[]) => {
      const existing = pts.filter(p=>p.y !== null).map(p=>({x:p.x,y:p.y}));
      return existing.length > 0 ? createSpline(existing) : '';
    };
    const pathCo = pathFor(checkoutPoints);
    const pathCi = pathFor(checkinPoints);

    const combinedPoints = allDates.map((d,i) => ({
      x: xScale(i),
      y: height/2,
      data: {
        date: d,
        checkout: checkoutPoints[i]?.v ?? null,
        checkin: checkinPoints[i]?.v ?? null
      }
    }));

    return (
      <div className="relative overflow-auto">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full">
          <line x1={margin.left} y1={height - margin.bottom} x2={width - margin.right} y2={height - margin.bottom} stroke="#D1D5DB" />
          <line x1={margin.left} y1={margin.top} x2={margin.left} y2={height - margin.bottom} stroke="#D1D5DB" />

          {[1,2,3,4,5].map(v => {
            const yy = yScale(v);
            return (
              <g key={v}>
                <text x={margin.left - 12} y={yy + 4} textAnchor="end" fontSize="12" fill="#6B7281">{v}</text>
                <line x1={margin.left} y1={yy} x2={width - margin.right} y2={yy} stroke="#F3F4F6" strokeDasharray="2,2" />
              </g>
            );
          })}

          {allDates.map((d,i) => ((i % Math.max(1, Math.floor(allDates.length / 6)) === 0) && (
            <text key={i} x={xScale(i)} y={height - 6} textAnchor="middle" fontSize="12" fill="#6B7281">
              {new Date(d).toLocaleDateString('ja-JP', {month:'numeric', day:'numeric'})}
            </text>
          )))}

          {pathCo && <path d={pathCo} fill="none" stroke="#10B981" strokeWidth="2" />}
          {checkoutPoints.map((p,i) => p.y !== null && <circle key={'co'+i} cx={p.x} cy={p.y} r={5} fill="#10B981" />)}

          {pathCi && <path d={pathCi} fill="none" stroke="#4F46E5" strokeWidth="2" />}
          {checkinPoints.map((p,i) => p.y !== null && <circle key={'ci'+i} cx={p.x} cy={p.y} r={5} fill="#4F46E5" />)}

          <rect
            x={margin.left} y={margin.top}
            width={width - margin.left - margin.right}
            height={height - margin.top - margin.bottom}
            fill="transparent"
            onMouseMove={e => handleMouseMove(e as any, combinedPoints, (d: any) => (
              <div className="text-xs">
                <p className="font-bold mb-1">{new Date(d.date).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                <p className="text-sm">{`チェックイン: ${d.checkin ?? '—'}`}</p>
                <p className="text-sm">{`チェックアウト: ${d.checkout ?? '—'}`}</p>
              </div>
            ))}
            onMouseLeave={() => setTooltip(null)}
          />
        </svg>

        {tooltip && (
          <div className="absolute p-2 text-sm bg-white rounded-md shadow-lg pointer-events-none" style={{ left: tooltip.x + 10, top: tooltip.y - 10, transform: 'translateY(-50%)' }}>
            {tooltip.content}
          </div>
        )}
        <div className="mt-3 text-sm text-gray-600">チェックイン(紫) / チェックアウト(緑)</div>
      </div>
    );
  };

  return (
    <div className="space-y-8 animate-fade-in" ref={chartRef}>
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <h2 className="text-xl md:text-2xl font-bold text-gray-800">アナリティクス</h2>
          <button onClick={() => setIsHelpOpen(true)} className="text-gray-400 hover:text-indigo-600 transition-colors">
            <HelpIcon className="w-6 h-6" />
          </button>
        </div>
        <div className="flex items-center gap-2 p-1 bg-gray-200/70 rounded-lg">
          {(['all', 30, 7] as const).map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 rounded-md font-semibold transition-all text-sm ${period === p ? 'bg-white text-indigo-600 shadow' : 'text-gray-600 hover:bg-white/50'}`}
            >
              {p === 'all' ? '全期間' : `過去${p}日`}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white p-4 sm:p-6 rounded-xl shadow-md">
        <h3 className="text-xl font-bold text-gray-800 mb-4">エネルギーバランス推移</h3>
        {renderEnergyChart()}
      </div>

      <div className="bg-white p-4 sm:p-6 rounded-xl shadow-md">
        <h3 className="text-xl font-bold text-gray-800 mb-4">習慣達成率</h3>
        {renderHabitChart()}
      </div>
      
      {/* コントロール + 条件描画 */}
      <div className="grid gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="mb-2">
            <h3 className="text-lg font-semibold whitespace-nowrap">チェックイン / チェックアウト</h3>
          </div>
          <div className="mb-4">
            <div className="inline-flex items-center rounded-md bg-gray-100 p-1 gap-1 flex-wrap max-w-full">
              <button
                onClick={() => setCheckChartMode('checkin')}
                className={`px-3 py-1 rounded text-sm ${checkChartMode === 'checkin' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-600'}`}
              >
                チェックイン
              </button>
              <button
                onClick={() => setCheckChartMode('checkout')}
                className={`px-3 py-1 rounded text-sm ${checkChartMode === 'checkout' ? 'bg-white shadow-sm text-green-600' : 'text-gray-600'}`}
              >
                チェックアウト
              </button>
              <button
                onClick={() => setCheckChartMode('both')}
                className={`px-3 py-1 rounded text-sm ${checkChartMode === 'both' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-600'}`}
              >
                両方
              </button>
            </div>
          </div>

          {/* 選択に応じて関数を直接呼び出す（関数を子要素として渡さない） */}
          {checkChartMode === 'checkin' ? renderCheckinChart() : null}
          {checkChartMode === 'checkout' ? renderCheckoutChart() : null}
          {checkChartMode === 'both' && renderBothChart()} 
        </div>
      </div>
    </div>
  );
};

export default Analytics;