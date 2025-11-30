"use client";

import React from 'react';
import { Habit } from '../types';
import { formatDateKey } from '../utils/dates';

interface ActionModalProps {
  habit: Habit;
  actionModalDate: Date;
  isEnteringAmount: boolean;
  pendingAmount: string;
  onClose: () => void;
  onToggleBinary: (dateKey: string) => void;
  onSkip: (dateKey: string) => void;
  onUnskip: (dateKey: string) => void;
  onRecordAmount: (dateKey: string, amount: string) => void;
  setIsEnteringAmount: (isEntering: boolean) => void;
  setPendingAmount: (amount: string) => void;
}

export const ActionModal: React.FC<ActionModalProps> = ({
  habit,
  actionModalDate,
  isEnteringAmount,
  pendingAmount,
  onClose,
  onToggleBinary,
  onSkip,
  onUnskip,
  onRecordAmount,
  setIsEnteringAmount,
  setPendingAmount,
}) => {
    const dkey = formatDateKey(actionModalDate);
    const isSkipped = habit.skippedDates?.includes(dkey) ?? false;
    const amountMap = habit.completedAmounts || {};
    const currentAmount = amountMap[dkey] ?? '';
    const isBinaryDone = (habit.completedDates || []).includes(dkey);

    // 親 fixed コンテナ内に absolute 表示、画面下の固定タブを避けるため bottom を確保
    return (
      <div className="absolute inset-0 z-50 flex items-center justify-center p-4" style={{ bottom: '84px' }}>
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <div className="text-xl font-semibold text-gray-900">{habit.name}</div>
              <div className="text-base text-gray-600">{actionModalDate.toLocaleDateString()}</div>
            </div>
            <button
              onClick={onClose}
              aria-label="閉じる"
              className="text-gray-600 hover:text-gray-900 text-3xl leading-none"
            >
              ×
            </button>
          </div>
          {/* ボタン群 / 入力フォーム（既存ロジックをそのまま使用） */}
          {!isEnteringAmount ? (
            <div className="flex gap-3">
              <button
                type="button"
                className="flex-1 flex flex-col items-center gap-2 py-4 bg-indigo-600 text-white rounded-lg shadow-lg"
                onClick={() => {
                  if (habit.type === 'amount') {
                    setIsEnteringAmount(true);
                    setPendingAmount(currentAmount ? String(currentAmount) : '');
                  } else {
                    onToggleBinary(dkey);
                  }
                }}
              >
                {/* アイコン */}
                <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 6L9 17l-5-5" stroke="white" />
                </svg>
                <span className="font-medium">{habit.type === 'amount' ? '記録する' : (isBinaryDone ? '取り消す' : '記録する')}</span>
              </button>

              <button
                type="button"
                className={`flex-1 flex flex-col items-center gap-2 py-4 rounded-lg border ${isSkipped ? 'bg-yellow-100 border-yellow-300 text-yellow-800' : 'bg-white border-gray-200 text-gray-700'}`}
                onClick={() => { isSkipped ? onUnskip(dkey) : onSkip(dkey); }}
              >
                <svg className={`w-8 h-8 ${isSkipped ? 'text-yellow-700' : 'text-gray-600'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2v4" />
                  <path d="M12 22v-4" />
                  <path d="M4.93 4.93l2.83 2.83" />
                  <path d="M16.24 16.24l2.83 2.83" />
                </svg>
                <span className="font-medium">{isSkipped ? 'スキップ解除' : 'この日をスキップ'}</span>
              </button>
            </div>
          ) : (
            <form onSubmit={(e) => { e.preventDefault(); onRecordAmount(dkey, pendingAmount); }}>
              <label className="block text-sm text-gray-700 mb-2">達成量（{habit.unit ?? ''}）</label>
              <input autoFocus value={pendingAmount} onChange={e => setPendingAmount(e.target.value)} className="w-full p-3 border border-gray-300 rounded-md mb-3" />
              <div className="flex gap-2">
                <button type="submit" className="flex-1 py-3 bg-indigo-600 text-white rounded-md">保存</button>
                <button type="button" className="flex-1 py-3 bg-gray-100 rounded-md" onClick={() => { setIsEnteringAmount(false); setPendingAmount(''); }}>戻る</button>
              </div>
            </form>
          )}
        </div>
      </div>
    );
  };