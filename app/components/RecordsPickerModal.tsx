"use client";
import React from 'react';
import { ValueResultRecord } from '../types';
import { formatDateLabel } from '../utils/dates';

interface RecordsPickerModalProps {
  open: boolean;
  onClose: () => void;
  onSelect: (rec: ValueResultRecord | null) => void;
  history: ValueResultRecord[];
}

const RecordsPickerModal: React.FC<RecordsPickerModalProps> = ({ open, onClose, onSelect, history }) => {
  if (!open) return null;
  
  const items = [...history].sort((a, b) => (b.date).localeCompare(a.date)).slice(0, 50);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="bg-white rounded-xl p-4 z-10 w-full max-w-md shadow-lg">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold">過去の診断</h3>
          <button onClick={onClose} className="text-sm text-gray-500">閉じる</button>
        </div>
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {items.length === 0 ? (
            <div className="text-sm text-gray-500">過去の診断はありません。</div>
          ) : (
            items.map(r => (
              <button key={r.id} onClick={() => { onSelect(r); onClose(); }} className="w-full text-left p-3 bg-gray-50 rounded-lg flex items-center gap-3 hover:bg-gray-100">
                <div className="flex-1">
                  <div className="font-medium">{formatDateLabel(r.date)}</div>
                  <div className="text-xs text-gray-500">{r.type}</div>
                </div>
                <div className="text-sm text-indigo-600">表示</div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default RecordsPickerModal;
