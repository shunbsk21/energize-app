"use client";

import React, { useEffect, useRef, useState } from "react";
import { FrequencyType } from "../types";

// simple textarea auto grow helper (copied from tracker)
function autoGrowTextArea(el?: HTMLTextAreaElement | null) {
  if (!el) return;
  el.style.height = "auto";
  el.style.height = `${Math.max(el.scrollHeight, 40)}px`;
}

interface InitialDraft {
  title?: string;
  detail?: string;
  startDate?: string;
  // 追加: 初期頻度 / 型 / 目標値 / 単位 を受け取る
  frequencyType?: FrequencyType;
  frequencyValue?: number[];
  type?: "binary" | "amount";
  target?: number;
  unit?: string;
}

interface AddHabitModalProps {
  isOpen: boolean;
  onClose: () => void;
  initial?: InitialDraft;
  // optional direct callback (HabitTracker passes this). If not provided, modal will dispatch window custom event 'habit-created'
  onCreate?: (payload: any) => Promise<void> | void;
}

const WEEK_DAYS = ['日', '月', '火', '水', '木', '金', '土'];

const AddHabitModal: React.FC<AddHabitModalProps> = ({ 
  isOpen,
  onClose, 
  initial,
  onCreate
}) => {
  const [name, setName] = useState(initial?.title ?? "");
  const [details, setDetails] = useState(initial?.detail ?? "");
  const [startDate, setStartDate] = useState(initial?.startDate ?? new Date().toLocaleDateString("sv-SE"));
  const [frequency, setFrequency] = useState<{ type: FrequencyType; value: number[] }>({ type: initial?.frequencyType ?? "daily", value: initial?.frequencyValue ?? [] });
  const [type, setType] = useState<"binary" | "amount">(initial?.type ?? "binary");
  const [target, setTarget] = useState<number | undefined>(initial?.target ?? undefined);
  const [unit, setUnit] = useState<string>(initial?.unit ?? "");
  const detailsRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setName(initial?.title ?? "");
    setDetails(initial?.detail ?? "");
    setStartDate(initial?.startDate ?? new Date().toLocaleDateString("sv-SE"));
    setType(initial?.type ?? "binary");
    setTarget(initial?.target ?? undefined);
    setUnit(initial?.unit ?? "");
    setFrequency({ type: initial?.frequencyType ?? "daily", value: initial?.frequencyValue ?? [] });
    setTimeout(() => autoGrowTextArea(detailsRef.current), 0);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, initial]);

  if (!isOpen) return null;

  const buildPayload = () => {
    const base: any = {
      name: (name || "").trim(),
      details: (details || "").trim() || undefined,
      type,
      startDate: startDate || new Date().toLocaleDateString("sv-SE"),
      frequencyType: frequency.type,
      frequencyValue: Array.isArray(frequency.value) ? frequency.value : (frequency.value ? [frequency.value] : []),
      skippedDates: [],
      createdAt: new Date().toISOString(),
    };

    if (type === "amount") {
      base.completedAmounts = {};
      if (target !== undefined && target !== null && String(target).trim() !== "") {
        const t = Number(target);
        if (!Number.isNaN(t)) base.target = t;
      }
      if (unit) base.unit = unit;
    } else {
      base.completedDates = [];
    }
    return base;
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault?.();
    if (!name || !name.trim()) {
      // simple client validation
      return;
    }
    const payload = buildPayload();
    if (onCreate) {
      try { await onCreate(payload); } catch (err) { console.error("AddHabitModal onCreate error", err); }
    } else {
      // dispatch global event so other parts of app can listen and create habit
      try {
        window.dispatchEvent(new CustomEvent("habit-created", { detail: payload }));
      } catch (err) {
        console.warn("dispatch habit-created failed", err);
      }
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
        <h2 className="text-xl font-bold text-gray-800 mb-4">新しい習慣を追加</h2>
        <form onSubmit={(e) => handleSubmit(e)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">習慣の名前</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="例: 10分間瞑想する"
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition bg-white text-gray-900"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">詳細（任意）</label>
            <textarea
              ref={detailsRef}
              value={details}
              onInput={e => autoGrowTextArea(e.currentTarget as HTMLTextAreaElement)}
              onChange={e => setDetails(e.target.value)}
              placeholder="例: 朝の10分で深呼吸しながら行う"
              rows={3}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition bg-white text-gray-900 resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">開始日</label>
            <input
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition bg-white text-gray-900"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">頻度</label>
            <select
              value={frequency.type}
              onChange={e => setFrequency({ type: e.target.value as FrequencyType, value: [] })}
              className="w-full p-3 text-base border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
            >
              <option value="daily">毎日</option>
              <option value="weekly">週次</option>
              <option value="monthly">月次</option>
            </select>

            {frequency.type === "weekly" && (
              <div className="flex justify-center gap-1 mt-3">
                {WEEK_DAYS.map((d, idx) => {
                  const active = frequency.value.includes(idx);
                  return (
                    <button
                      key={d}
                      type="button"
                      onClick={() => {
                        const newVal = active ? frequency.value.filter(v => v !== idx) : [...frequency.value, idx];
                        setFrequency(prev => ({ ...prev, value: newVal.sort() }));
                      }}
                      className={`w-10 h-10 rounded-full font-semibold transition-colors text-sm md:text-base ${active ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-700'}`}
                    >
                      {d}
                    </button>
                  );
                })}
              </div>
            )}

            {frequency.type === "monthly" && (
              <div className="mt-3">
                <label className="block text-sm text-gray-600 mb-1">日付を選択 (カンマ区切り)</label>
                <input
                  type="text"
                  placeholder="例: 1, 15"
                  defaultValue={frequency.value.join(', ')}
                  onChange={e => {
                    const value = e.target.value.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n) && n >= 1 && n <= 31);
                    setFrequency(prev => ({ ...prev, value: value.sort((a,b) => a - b) }));
                  }}
                  className="w-full p-3 text-base border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
                />
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">タイプ</label>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2">
                <input type="radio" name="habitType" value="binary" checked={type === 'binary'} onChange={() => setType('binary')} />
                <span className="text-sm">1回でも実施</span>
              </label>
              <label className="flex items-center gap-2">
                <input type="radio" name="habitType" value="amount" checked={type === 'amount'} onChange={() => setType('amount')} />
                <span className="text-sm">規定量の実施</span>
              </label>
            </div>
          </div>

          {type === "amount" && (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">目標値</label>
                <input type="number" value={target ?? ""} onChange={e => setTarget(e.target.value === "" ? undefined : Number(e.target.value))} className="w-full p-3 border border-gray-300 rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">単位</label>
                <input type="text" value={unit} onChange={e => setUnit(e.target.value)} placeholder="例: km, 分, 回" className="w-full p-3 border border-gray-300 rounded-lg" />
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg text-gray-600 hover:bg-gray-100">キャンセル</button>
            <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow">追加</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddHabitModal;