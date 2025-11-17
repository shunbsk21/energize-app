// ...existing code...
import React, { useMemo, useState } from 'react';

export interface CheckoutRecord {
  id: string;
  date: string;
  gratitude?: string;
  note?: string;
  createdAt?: string;
}

export interface CheckinRecord {
  id: string;
  date: string;
  text?: string;
  createdAt?: string;
}

interface RecordsProps {
  checkouts?: CheckoutRecord[];
  checkins?: CheckinRecord[];
}

const formatDate = (d?: string) => {
  if (!d) return '';
  const dt = new Date(d);
  return dt.toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit' });
};

const parseDateValue = (r: any) => {
  return r.date ?? r.createdAt ?? '';
};

const Records: React.FC<RecordsProps> = ({ checkouts = [], checkins = [] }) => {
  const [view, setView] = useState<'checkin' | 'checkout'>('checkout');
  const [search, setSearch] = useState('');
  const [perPage, setPerPage] = useState<number>(20);
  const [page, setPage] = useState<number>(1);

  // source records depending on view
  const source = useMemo(() => (view === 'checkout' ? checkouts : checkins), [view, checkouts, checkins]);

  // filtered + sorted (date desc)
  const filtered = useMemo(() => {
    const s = (source || []).slice().sort((a, b) => {
      const ta = new Date(parseDateValue(a)).getTime();
      const tb = new Date(parseDateValue(b)).getTime();
      return tb - ta;
    });

    if (!search || search.trim() === '') return s;

    const q = search.trim().toLowerCase();
    return s.filter(r => {
      if (view === 'checkout') {
        const co = r as CheckoutRecord;
        const fields = [
          (co.gratitude ?? '').toLowerCase(),
          (co.note ?? '').toLowerCase(),
        ].join(' ');
        return fields.includes(q);
      } else {
        const ci = r as CheckinRecord;
        return ((ci.text ?? '').toLowerCase()).includes(q);
      }
    });
  }, [source, search, view]);

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  // ensure page in range
  if (page > totalPages) setPage(totalPages);

  const paged = useMemo(() => {
    const start = (page - 1) * perPage;
    return filtered.slice(start, start + perPage);
  }, [filtered, page, perPage]);

  return (
    <div className="space-y-4">
      <div className="bg-white p-4 rounded-xl shadow-md">

          <div className="flex flex-col gap-3">
            {/* 上段: 大きめの切替ボタン（チェックアウト時の別選択は廃止） */}
            <div className="flex items-center justify-between gap-3">
              <div className="inline-flex items-center bg-gray-50 rounded-full p-1">
                <button
                  onClick={() => { setView('checkin'); setPage(1); }}
                  className={`px-4 py-2 rounded-full text-sm font-medium ${view === 'checkin' ? 'bg-white shadow-sm text-green-700' : 'text-gray-600'}`}
                >
                  チェックイン
                </button>
                <button
                  onClick={() => { setView('checkout'); setPage(1); }}
                  className={`px-4 py-2 rounded-full text-sm font-medium ${view === 'checkout' ? 'bg-white shadow-sm text-indigo-700' : 'text-gray-600'}`}
                >
                  チェックアウト
                </button>
              </div>
            </div>
          </div>
            

        <div className="mt-4">
          {total === 0 ? (
            <p className="text-sm text-gray-500">表示する記録がありません。</p>
          ) : (
            <div className="space-y-3">
              {paged.map((r: any) => (
                <div key={r.id} className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-start justify-between">
                    {/* 日付は控えめに表示 */}
                    <div className="text-xs text-gray-500">{formatDate(parseDateValue(r))}</div>
                    <div className="text-xs text-gray-400">{/* createdAt 等があればここに */}</div>
                  </div>

                  {view === 'checkout' ? (
                    <>
                      {/* 感謝 / 日記 をそれぞれ分かりやすくグルーピング */}
                      {(r.gratitude && r.gratitude.trim()) || (r.note && r.note.trim()) ? (
                        <div className="mt-3 space-y-3">
                          {r.gratitude && r.gratitude.trim() && (
                            <div className="flex items-start gap-3 min-w-0">
                              <span className="inline-block text-xs font-semibold px-2 py-1 bg-indigo-100 text-indigo-700 rounded-full flex-shrink-0">感謝</span>
                              <div className="text-sm text-gray-700 leading-relaxed break-words min-w-0">{r.gratitude}</div>
                            </div>
                          )}
                          {r.note && r.note.trim() && (
                            <div className="flex items-start gap-3 min-w-0">
                              <span className="inline-block text-xs font-semibold px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full flex-shrink-0">日記</span>
                              <div className="text-sm text-gray-700 leading-relaxed break-words min-w-0">{r.note}</div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-sm text-gray-400 mt-2">記録がありません。</div>
                      )}
                    </>
                  ) : (
                    <>
                      {r.text && r.text.trim() ? (
                        <div className="mt-3 flex items-start gap-3 min-w-0">
                          <span className="inline-block text-xs font-semibold px-2 py-1 bg-green-100 text-green-700 rounded-full flex-shrink-0">チェックイン</span>
                          <div className="text-sm text-gray-700 leading-relaxed break-words min-w-0">{r.text}</div>
                        </div>
                      ) : (
                        <div className="text-sm text-gray-400 mt-2">テキスト記録がありません。</div>
                      )}
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ページネーション */}
        {total > perPage && (
          <div className="mt-4 flex items-center justify-between">
            <div className="text-sm text-gray-600">全 {total} 件 / {totalPages} ページ</div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1 text-sm rounded border bg-white disabled:opacity-50"
              >
                前へ
              </button>
              <div className="text-sm px-2"> {page} / {totalPages} </div>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1 text-sm rounded border bg-white disabled:opacity-50"
              >
                次へ
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Records;
// ...existing code...