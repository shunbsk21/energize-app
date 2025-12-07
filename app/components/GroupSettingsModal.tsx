import React from 'react';
import { ChevronRightIcon, TrashIcon, GroupIcon } from './Icons';

interface GroupSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  isOwner: boolean;
  onOpenSharedSettings: () => void;
  onDeleteGroup: () => void;
  groupName: string;
}

export const GroupSettingsModal: React.FC<GroupSettingsModalProps> = ({
  isOpen,
  onClose,
  isOwner,
  onOpenSharedSettings,
  onDeleteGroup,
  groupName,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-[100] flex items-end sm:items-center justify-center animate-fade-in" onClick={onClose}>
      <div
        className="bg-white w-full sm:w-[400px] rounded-t-2xl sm:rounded-2xl overflow-hidden shadow-2xl transform transition-transform duration-300 ease-out"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-bold text-lg text-gray-800">グループ設定</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-2">
          <button
            onClick={() => {
              onOpenSharedSettings();
              onClose();
            }}
            className="w-full flex items-center justify-between p-4 hover:bg-gray-50 rounded-xl transition-colors group"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-full group-hover:bg-indigo-100 transition-colors">
                <GroupIcon className="w-5 h-5" />
              </div>
              <span className="font-medium text-gray-700">自分の共有設定</span>
            </div>
            <ChevronRightIcon className="w-5 h-5 text-gray-400" />
          </button>

          {isOwner && (
            <button
              onClick={() => {
                if (confirm(`本当にグループ「${groupName}」を削除しますか？\nこの操作は取り消せません。`)) {
                  onDeleteGroup();
                  onClose();
                }
              }}
              className="w-full flex items-center justify-between p-4 hover:bg-red-50 rounded-xl transition-colors group mt-2"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-50 text-red-500 rounded-full group-hover:bg-red-100 transition-colors">
                  <TrashIcon className="w-5 h-5" />
                </div>
                <span className="font-medium text-red-600">グループを削除</span>
              </div>
              <ChevronRightIcon className="w-5 h-5 text-red-300" />
            </button>
          )}
        </div>

        <div className="p-4 pt-2 text-center">
          <p className="text-xs text-gray-400">グループID: {groupName}</p>
        </div>

      </div>
    </div>
  );
};
