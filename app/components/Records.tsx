import React from 'react';

export interface CheckoutRecord {
  id: string;
  date: string;
  gratitude?: string;
  note?: string;
  createdAt?: string;
}

interface RecordsProps {
  checkouts: CheckoutRecord[];
}

/**
 * Records: チェックアウト（感謝 / 日記）の一覧表示コンポーネント
 * - MainApp で保持している checkouts を props として渡して使います。
 */
const Records: React.FC<RecordsProps> = ({ checkouts }) => {
  const visible = (checkouts || []).filter(c =>
    (c.gratitude && c.gratitude.trim()) || (c.note && c.note.trim())
  );

  return (
    <div className="space-y-4">
      <div className="bg-white p-4 rounded-xl shadow-md">
        <h3 className="text-lg font-semibold">チェックアウト（感謝 / 日記）</h3>

        {visible.length === 0 ? (
          <p className="text-sm text-gray-500 mt-3">記録がありません。</p>
        ) : (
          <div className="space-y-3 mt-3">
            {visible.map(c => (
              <div key={c.id} className="p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-700 font-medium">{c.date}</div>
                </div>
                {c.gratitude && c.gratitude.trim() ? (
                  <div className="text-sm text-gray-600 mt-2"><span className="font-semibold">感謝: </span>{c.gratitude}</div>
                ) : null}
                {c.note && c.note.trim() ? (
                  <div className="text-sm text-gray-600 mt-1"><span className="font-semibold">日記: </span>{c.note}</div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Records;