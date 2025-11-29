"use client";

import React, { useState, useEffect, useRef } from 'react';
import { MoodIcon } from './Icons';

function autoGrowTextArea(el?: HTMLTextAreaElement | null) {
  if (!el) return;
  el.style.height = 'auto';
  el.style.height = `${Math.max(el.scrollHeight, 40)}px`;
}

interface CheckInModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (value: number, note?: string) => void;
  initial?: { value: number; note?: string };
}

const CheckInModal: React.FC<CheckInModalProps> = ({ isOpen, onClose, onSave, initial }) => {
  const [value, setValue] = useState<number>(initial?.value ?? 4);
  const [note, setNote] = useState<string>(initial?.note ?? '');
  const noteRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      setValue(initial?.value ?? 4);
      setNote(initial?.note ?? '');
      setTimeout(() => autoGrowTextArea(noteRef.current), 0);
    }
  }, [isOpen, initial]);

  const DESCRIPTIONS: { [k: number]: { short: string; full: string } } = {
    5: { short: 'エネルギー満タン', full: '活力が最大限で、集中力・やる気ともに高い状態。' },
    4: { short: '元気', full: '通常のレベルより調子が良く、前向きに取り組める状態。' },
    3: { short: '普通', full: '可もなく不可もなく、日常の業務をこなせる安定した状態。' },
    2: { short: '疲労気味', full: '集中力が切れやすく、休息やリフレッシュが必要な状態。' },
    1: { short: 'エネルギー枯渇', full: '意欲や体力がなく、十分な回復を最優先すべき危険な状態。' },
  };

  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div className="bg-white rounded-lg p-3 w-full max-w-md max-h-[80vh] overflow-hidden" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-semibold mb-2">チェックイン: 今日のエネルギー</h3>
        <div className="max-h-[60vh] overflow-auto pr-2">
          <div className="space-y-2 mb-3">
            {[5,4,3,2,1].map(v => (
              <button key={v} onClick={() => setValue(v)} aria-pressed={value === v} className={`w-full text-left rounded-md border transition flex items-center gap-3 py-2 px-3 ${value === v ? 'border-indigo-600 bg-indigo-50' : 'border-gray-200 bg-white hover:bg-gray-50'}`}>
                <div className="w-6 flex-shrink-0 text-sm font-medium text-gray-600">{v}.</div>
                <div className="w-8 flex items-center justify-center flex-shrink-0"><MoodIcon level={v} /></div>
                <div className="flex-1 min-w-0"><div className="text-sm font-semibold text-gray-800 leading-tight">{DESCRIPTIONS[v].short}</div></div>
              </button>
            ))}
          </div>
          <div className="mb-3 text-sm text-gray-700">
            <div className="text-xs text-gray-500 mb-1">選択: <span className="font-medium">{DESCRIPTIONS[value].short}</span></div>
            <div className="p-2 bg-gray-50 rounded text-sm text-gray-600 leading-relaxed">{DESCRIPTIONS[value].full}</div>
          </div>
          <textarea ref={noteRef} value={note} onInput={e => autoGrowTextArea(e.currentTarget as HTMLTextAreaElement)} onChange={e => setNote(e.target.value)} placeholder="メモ（任意）" rows={3} className="w-full p-2 border border-gray-200 rounded-md mb-3 resize-none text-sm" />
        </div>
        <div className="flex justify-end gap-2 mt-2">
          <button onClick={onClose} className="px-3 py-2 rounded-md bg-white border text-sm">キャンセル</button>
          <button onClick={() => { onSave(value, note); onClose(); }} className="px-4 py-2 rounded-md bg-indigo-600 text-white text-sm">保存</button>
        </div>
      </div>
    </div>
  );
};

export default CheckInModal;