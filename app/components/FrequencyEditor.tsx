// ...existing code...
"use client";
import React from "react";
import { DiagnosisFrequency } from "../types";

const WEEK_DAYS = ['日', '月', '火', '水', '木', '金', '土'];

const FrequencyEditor: React.FC<{
  frequency: DiagnosisFrequency;
  setFrequency: React.Dispatch<React.SetStateAction<DiagnosisFrequency>>;
}> = ({ frequency, setFrequency }) => {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">頻度</label>
        <select
          value={frequency.frequencyType}
          onChange={e => setFrequency({ frequencyType: e.target.value as DiagnosisFrequency['frequencyType'], frequencyValue: [] })}
          className="w-full p-3 text-base border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
        >
          <option value="daily">毎日</option>
          <option value="weekly">週次</option>
          <option value="monthly">月次</option>
        </select>
      </div>

      {frequency.frequencyType === 'weekly' && (
        <div>
          <div className="text-sm text-gray-600 mb-2">曜日を選択（複数可）</div>
          <div className="flex justify-center gap-1">
            {WEEK_DAYS.map((day, index) => {
              return (
                <button
                  type="button"
                  key={index}
                  onClick={() => {
                    const currentValues = (frequency.frequencyValue || []) as number[];
                    const newValue = currentValues.includes(index)
                      ? currentValues.filter((d: number) => d !== index)
                      : [...currentValues, index];
                    setFrequency(prev => ({ ...prev, frequencyValue: newValue.sort((a, b) => a - b) }));
                  }}
                  className={`w-10 h-10 rounded-full font-semibold transition-colors ${((frequency.frequencyValue || []) as number[]).includes(index) ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-700'}`}
                >
                  {day}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {frequency.frequencyType === 'monthly' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">日付を選択 (カンマ区切り)</label>
          <input
            type="text"
            placeholder="例: 1, 15"
            defaultValue={Array.isArray(frequency.frequencyValue) ? frequency.frequencyValue.join(', ') : ''}
            onChange={e => {
              const value = e.target.value.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n) && n >= 1 && n <= 31);
              setFrequency(prev => ({ ...prev, frequencyValue: value.sort((a,b)=>a-b) }));
            }}
            className="w-full p-3 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
          />
        </div>
      )}

      {frequency.frequencyType === 'daily' && (
        <div className="text-sm text-gray-600">毎日実行します。</div>
      )}
    </div>
  );
};

export default FrequencyEditor;