"use client";

import React, { useState, useEffect, useRef } from 'react';
import { MoodIcon } from './Icons';

function autoGrowTextArea(el?: HTMLTextAreaElement | null) {
  if (!el) return;
  el.style.height = 'auto';
  el.style.height = `${Math.max(el.scrollHeight, 40)}px`;
}

interface CheckOutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (gratitude?: string, note?: string, rating?: number) => void;
  initial?: { rating: number; gratitude?: string; note?: string };
}

const CheckOutModal: React.FC<CheckOutModalProps> = ({ isOpen, onClose, onSave, initial }) => {
  const [rating, setRating] = useState<number>(initial?.rating ?? 4);
  const [gratitude, setGratitude] = useState<string>(initial?.gratitude ?? '');
  const [note, setNote] = useState<string>(initial?.note ?? '');
  const gratitudeRef = useRef<HTMLTextAreaElement | null>(null);
  const noteRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      setRating(initial?.rating ?? 4);
      setGratitude(initial?.gratitude ?? '');
      setNote(initial?.note ?? '');
      setTimeout(() => { autoGrowTextArea(gratitudeRef.current); autoGrowTextArea(noteRef.current); }, 0);
    }
  }, [isOpen, initial]);

  const SAT_DESCRIPTIONS: { [k: number]: { short: string; full: string } } = {
    5: { short: '今日は最高だった', full: '非常に満足しており、達成感や喜びを感じる充実した一日。' },
    4: { short: '今日は良かった', full: '概ね満足しており、良い出来事が多かった一日。' },
    3: { short: '今日は普通', full: '特に大きな出来事もなく、平穏に過ごした一日。' },
    2: { short: 'ちょっと残念', full: 'ストレスや小さな失敗があり、気分が沈んだ一日。' },
    1: { short: '今日は最悪だった', full: '予期せぬ大きな問題や、強い不満を感じた一日。' },
  };

  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div className="bg-white rounded-lg p-3 w-full max-w-lg max-h-[88vh] overflow-hidden" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-semibold mb-2">チェックアウト: 感謝・日記</h3>
        <div className="max-h-[64vh] overflow-auto pr-2">
          <div className="text-sm text-gray-700 mb-2">今日の気分を選択してください</div>
          <div className="space-y-2 mb-3">
            {[5,4,3,2,1].map(v => (
              <button key={v} onClick={() => setRating(v)} aria-pressed={rating === v} className={`w-full text-left rounded-md border transition flex items-center gap-3 py-2 px-3 ${rating === v ? 'border-indigo-600 bg-indigo-50' : 'border-gray-200 bg-white hover:bg-gray-50'}`}>
                <div className="w-6 flex-shrink-0 text-sm font-medium text-gray-600">{v}.</div>
                <div className="w-8 flex items-center justify-center flex-shrink-0"><MoodIcon level={v} /></div>
                <div className="flex-1 min-w-0"><div className="text-sm font-semibold text-gray-800 leading-tight">{SAT_DESCRIPTIONS[v].short}</div></div>
              </button>
            ))}
          </div>
          <div className="mb-4 text-sm text-gray-700">
            <div className="text-xs text-gray-500 mb-1">選択: <span className="font-medium">{SAT_DESCRIPTIONS[rating].short}</span></div>
            <div className="p-2 bg-gray-50 rounded text-sm text-gray-600 leading-relaxed">{SAT_DESCRIPTIONS[rating].full}</div>
          </div>
          <div className="mb-3">
            <label className="text-sm text-gray-600">今日の感謝</label>
            <textarea ref={gratitudeRef} value={gratitude} onInput={e => autoGrowTextArea(e.currentTarget as HTMLTextAreaElement)} onChange={e => setGratitude(e.target.value)} placeholder="例: 一緒にランチしてくれた同僚に感謝" rows={1} className="w-full p-3 border border-gray-200 rounded-md mt-1 mb-2 resize-none text-sm" />
            <label className="text-sm text-gray-600">日記（任意・詳細）</label>
            <textarea ref={noteRef} value={note} onInput={e => autoGrowTextArea(e.currentTarget as HTMLTextAreaElement)} onChange={e => setNote(e.target.value)} placeholder="今日の出来事や振り返りを書き留めましょう" rows={3} className="w-full p-3 border border-gray-200 rounded-md mt-1 resize-none text-sm" />
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-2">
          <button onClick={onClose} className="px-3 py-2 rounded-md bg-white border text-sm">キャンセル</button>
          <button onClick={() => { onSave(gratitude, note, rating); onClose(); }} className="px-4 py-2 rounded-md bg-indigo-600 text-white text-sm">保存</button>
        </div>
      </div>
    </div>
  );
};

export default CheckOutModal;