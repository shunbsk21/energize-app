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


const Analytics: React.FC<AnalyticsProps> = ({ energyHistory, habits, setIsHelpOpen, checkins }) => {
  const [period, setPeriod] = useState<Period>(7);
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);
  const chartRef = useRef<HTMLDivElement>(null);
  const allCategories = useMemo(() => Object.keys(ENERGY_CATEGORIES) as EnergyCategory[], []);
  const [visibleCategories, setVisibleCategories] = useState<Set<EnergyCategory>>(new Set(allCategories));

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
    
    return allDates.map(date => {
        const dateStr = date.toLocaleDateString('sv-SE');
        const completedCount = habits.reduce((count, habit) => 
            habit.completedDates.includes(dateStr) ? count + 1 : count, 0);
        return {
            date,
            rate: (completedCount / habits.length) * 100,
            completed: completedCount,
            total: habits.length
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
    const data = filteredHistory;
    if (data.length < 2) return <p className="text-gray-500 text-center py-10">グラフを表示するには、診断データが2件以上必要です。</p>;
    
    const categories = allCategories.filter(cat => visibleCategories.has(cat));
    if (categories.length === 0) return <p className="text-gray-500 text-center py-10">表示するエネルギーを選択してください。</p>;

    const width = 600;
    const height = 300;
    const margin = { top: 20, right: 20, bottom: 40, left: 40 };

    const maxTotalScore = data.reduce((max, record) => {
        const dailyTotal = categories.reduce((sum, cat) => sum + record[cat], 0);
        return Math.max(max, dailyTotal);
    }, 0);
    const yMax = Math.max(20, Math.ceil(maxTotalScore / 20) * 20);
    const yAxisTicks = Array.from({ length: (yMax / 20) + 1 }, (_, i) => i * 20);

    const xScale = (i: number) => margin.left + i * (width - margin.left - margin.right) / (data.length - 1);
    const yScale = (val: number) => height - margin.bottom - (val / yMax) * (height - margin.top - margin.bottom);
    
    let stackedData: {x: number; y: number; data: EnergyRecord;}[][] = [];
    let yOffsets = new Array(data.length).fill(0);
    
    categories.forEach(cat => {
        const points = data.map((d, i) => {
            const y = yScale(d[cat] + yOffsets[i]);
            return { x: xScale(i), y: y, data: d };
        });
        stackedData.push(points);
        data.forEach((d, i) => yOffsets[i] += d[cat]);
    });

    return (
        <div className="relative">
            <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-labelledby="energy-chart-title">
                <title id="energy-chart-title">エネルギーバランスの推移グラフ</title>
                {/* Axes */}
                <line x1={margin.left} y1={height - margin.bottom} x2={width - margin.right} y2={height - margin.bottom} stroke="#D1D5DB" />
                <line x1={margin.left} y1={margin.top} x2={margin.left} y2={height - margin.bottom} stroke="#D1D5DB" />
                {yAxisTicks.map(val => (
                    <g key={val}>
                        <text x={margin.left - 8} y={yScale(val) + 4} textAnchor="end" fontSize="10" fill="#6B7281">{val}</text>
                        <line x1={margin.left} y1={yScale(val)} x2={width - margin.right} y2={yScale(val)} stroke="#E5E7EB" strokeDasharray="2,2"/>
                    </g>
                ))}
                {data.map((d, i) => (
                    (i % Math.max(1, Math.floor(data.length / 7)) === 0) &&
                    <text key={i} x={xScale(i)} y={height - margin.bottom + 15} textAnchor="middle" fontSize="10" fill="#6B7281">
                        {new Date(d.date).toLocaleDateString('ja-JP', {month:'numeric', day:'numeric'})}
                    </text>
                ))}
                
                {/* Stacked Areas */}
                {categories.slice().reverse().map((cat) => {
                    const catIndex = categories.indexOf(cat);
                    const pathPoints = stackedData[catIndex];
                    const prevPathPoints = catIndex > 0 ? stackedData[catIndex - 1] : data.map((_, i) => ({x: xScale(i), y: height - margin.bottom, data: _}));
                    
                    const areaPath = createSpline(pathPoints) + ` L${pathPoints[pathPoints.length-1].x},${prevPathPoints[pathPoints.length-1].y}` + createSpline(prevPathPoints.slice().reverse()).replace('M', ' L') + ' Z';

                    return <path key={cat} d={areaPath} fill={ENERGY_CATEGORIES[cat].color} fillOpacity="0.7" />;
                })}
                 
                {/* Tooltip interaction layer */}
                <rect 
                    x={margin.left} y={margin.top} 
                    width={width - margin.left - margin.right} 
                    height={height - margin.top - margin.bottom}
                    fill="transparent"
                    onMouseMove={e => handleMouseMove(e, stackedData[stackedData.length-1], (d: EnergyRecord) => (
                        <div className="text-xs">
                           <p className="font-bold mb-1">{new Date(d.date).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                            {allCategories.filter(cat => visibleCategories.has(cat)).map(cat => (
                                <p key={cat}><span className="font-semibold" style={{color: ENERGY_CATEGORIES[cat as EnergyCategory].color}}>●</span> {ENERGY_CATEGORIES[cat as EnergyCategory].name}: {d[cat as EnergyCategory]}点</p>
                            ))}
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
            <div className="flex justify-center flex-wrap gap-x-4 gap-y-2 mt-4">
                {allCategories.map((key) => {
                    const value = ENERGY_CATEGORIES[key];
                    return (
                    <div key={key} className="flex items-center">
                         <input
                            type="checkbox"
                            id={`cat-toggle-${key}`}
                            checked={visibleCategories.has(key)}
                            onChange={() => handleCategoryToggle(key)}
                            className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                        />
                        <label htmlFor={`cat-toggle-${key}`} className="ml-2 flex items-center text-xs text-gray-600 cursor-pointer">
                            <span className="w-3 h-3 rounded-full mr-1.5" style={{ backgroundColor: value.color }}></span>
                            {value.name}
                        </label>
                    </div>
                )})}
            </div>
        </div>
    )
  }

  const renderHabitChart = () => {
    const data = habitData;
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
                        <text x={margin.left - 8} y={yScale(val) + 4} textAnchor="end" fontSize="10" fill="#6B7281">{val}%</text>
                        <line x1={margin.left} y1={yScale(val)} x2={width - margin.right} y2={yScale(val)} stroke="#E5E7EB" strokeDasharray="2,2"/>
                    </g>
                ))}
                {data.map((d, i) => (
                    (i % Math.max(1, Math.floor(data.length / 10)) === 0) &&
                    <text key={i} x={xScale(i)} y={height - margin.bottom + 15} textAnchor="middle" fontSize="10" fill="#6B7281">
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

      {/* 追加: チェックイン推移（1-5） */}
      <div className="bg-white p-4 sm:p-6 rounded-xl shadow-md">
        <h3 className="text-lg font-semibold text-gray-800 mb-3">チェックインの推移</h3>
        {(!checkins || checkins.length < 2) ? (
          <p className="text-gray-500 text-center py-6">チェックインが2件以上必要です。</p>
        ) : (
          (() => {
            const data = (checkins || []).slice().sort((a,b) => (new Date(a.createdAt || a.date)).getTime() - (new Date(b.createdAt || b.date)).getTime());
            const width = 600, height = 140, margin = { left: 24, right: 20, top: 10, bottom: 24 };
            const x = (i:number) => margin.left + i * (width - margin.left - margin.right) / Math.max(1, data.length - 1);
            const y = (v:number) => margin.top + (5 - v) * ((height - margin.top - margin.bottom) / 4);
            const points = data.map((d,i) => ({ x: x(i), y: y(d.value), v: d }));
            const path = createSpline(points.map(p => ({x:p.x,y:p.y})));
            return (
              <div className="relative overflow-auto">
                <svg viewBox={`0 0 ${width} ${height}`} className="w-full">
                  <path d={path} fill="none" stroke="#4F46E5" strokeWidth="2" />
                  {points.map((p,i) => <circle key={i} cx={p.x} cy={p.y} r={4} fill="#4F46E5" />)}
                  {data.map((d,i) => (
                    (i % Math.max(1, Math.floor(data.length / 6)) === 0) &&
                    <text key={i} x={x(i)} y={height - 6} textAnchor="middle" fontSize="10" fill="#6B7281">
                      {new Date(d.date).toLocaleDateString('ja-JP', {month:'numeric', day:'numeric'})}
                    </text>
                  ))}
                </svg>
              </div>
            );
          })()
        )}
      </div>

    </div>
  );
};

export default Analytics;