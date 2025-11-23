"use client";
import React from "react";

interface PersonalityProps {
  // 将来的に履歴やハンドラを受け取る場合に拡張
  onComplete?: (result: any) => void;
  setIsHelpOpen?: (open: boolean) => void;
}

const PersonalityDiagnosis: React.FC<PersonalityProps> = ({ onComplete, setIsHelpOpen }) => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-xl md:text-2xl font-bold text-gray-800">パーソナリティ診断</h2>
          <button onClick={() => setIsHelpOpen?.(true)} className="text-gray-400 hover:text-indigo-600 transition-colors" aria-label="ヘルプ">
            {/* シンプルな ? アイコン */}
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 9a3 3 0 116 0c0 1.657-1 2.5-2 3s-1 2-1 3" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 19h.01" />
            </svg>
          </button>
        </div>
        <div>
          <button
            onClick={() => { /* 将来的なショートカット */ }}
            className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
          >
            頻度設定
          </button>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-md">
        <p className="text-gray-700">ここにパーソナリティ診断の導入テキストと問題一覧を実装します。</p>
        <div className="mt-4 text-sm text-gray-500">（現状はプレースホルダ。必要なら質問＋集計ロジックを追加します）</div>
      </div>
    </div>
  );
};

export default PersonalityDiagnosis;