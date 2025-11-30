import React, { useMemo, useState, useEffect } from 'react';
import { Checkin, Checkout } from '../types';
import { formatFullDate } from '../utils/dates';
import DatePickerModal from '../components/DatePickerModal';
import { CalendarIcon } from '../components/Icons';

// アイコンマップ（value / rating に応じた簡易アイコン）
const ICON_MAP: Record<number, string> = {
  5: '⚡️',
  4: '😊',
  3: '😐',
  2: '😴',
  1: '🥀',
};

const pickIcon = (v: number | string | null | undefined) => {
  const n = Number(v);
  if (!Number.isNaN(n) && ICON_MAP[n]) return ICON_MAP[n];
  // 数値でない・範囲外は既定のアイコン（中立）
  return '✨';
};

// 小さなアイコン付きタグ（白背景 + シャドウ）
const ValueTag: React.FC<{ value: string | number | undefined | null }> = ({ value }) => {
  if (value == null) return null;
  const icon = pickIcon(value);
  return (
    <span className="inline-flex items-center gap-2 bg-white rounded-full px-2 py-1 border border-gray-100">
      <span className="w-5 h-5 flex items-center justify-center text-sm">{icon}</span>
      <span className="text-xs font-medium text-gray-800">{String(value)}</span>
    </span>
  );
};

const RatingTag: React.FC<{ value: string | number | undefined | null }> = ({ value }) => {
  if (value == null) return null;
  const icon = pickIcon(value);
  return (
    <span className="inline-flex items-center gap-2 bg-white rounded-full px-2 py-1 border border-gray-100">
      <span className="w-5 h-5 flex items-center justify-center text-sm">{icon}</span>
      <span className="text-xs font-medium text-gray-800">{String(value)}</span>
    </span>
  );
};

interface RecordsProps {
  checkouts?: Checkout[];
  checkins?: Checkin[];
}

const parseDateValue = (r: Checkin | Checkout) => {
  return r.date ?? r.createdAt ?? '';
};

const Records: React.FC<RecordsProps> = ({ checkouts = [], checkins = [] }) => {
  const [view, setView] = useState<'checkin' | 'checkout'>('checkout');
  const [checkoutFilter, setCheckoutFilter] = useState<'all' | 'gratitude' | 'note'>('all');
  const [search, setSearch] = useState('');
  const [perPage, setPerPage] = useState<number>(20);
  const [page, setPage] = useState<number>(1);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);

  // 入力データのばらつきに備えて正規化する（note / text の両対応、いろんなネストや型に対応）
  const normalizedCheckins = useMemo(() => {
    return (checkins || []).map((c: Checkin) => {
      // note を取り出すために考えられるパスを列挙し、文字列に変換して trim する
      const rawNote =
        c?.note ??
        c?.text ??
        c?.data?.note ??
        c?.data?.text ??
        c?.payload?.note ??
        c?.payload?.text ??
        '';

      const note = rawNote == null ? '' : (typeof rawNote === 'string' ? rawNote : String(rawNote));

      // date の正規化: 明示的 date があればそのまま、なければ createdAt の先頭 10 文字（YYYY-MM-DD）を採る
      let date = c?.date;
      if (!date && c?.createdAt) {
        if (typeof c.createdAt === 'string') {
          date = c.createdAt.slice(0, 10);
        } else if (c.createdAt?.toDate) {
          // Firestore Timestamp の可能性
          try {
            const dt = c.createdAt.toDate();
            date = dt.toISOString().slice(0, 10);
          } catch (e) {
            date = undefined;
          }
        }
      }
      return { ...c, note, date };
    });
  }, [checkins]);

  const normalizedCheckouts = useMemo(() => {
    return (checkouts || []).map((c: Checkout) => {
      const gratitude = c.gratitude ?? (c as any).data?.gratitude ?? undefined;
      const note = c.note ?? (c as any).data?.note ?? undefined;
      const date = c.date ?? (typeof c.createdAt === 'string' ? c.createdAt.slice(0, 10) : undefined);
      return { ...c, gratitude, note, date };
    });
  }, [checkouts]);

  // source records depending on view
  const source = useMemo(() => (view === 'checkout' ? normalizedCheckouts : normalizedCheckins), [view, normalizedCheckouts, normalizedCheckins]);

  // filtered + sorted (date desc)
  const filtered = useMemo(() => {
    // sort by date desc
    const sorted = (source || []).slice().sort((a, b) => {
      const ta = new Date(parseDateValue(a)).getTime();
      const tb = new Date(parseDateValue(b)).getTime();
      return tb - ta;
    });

    // 日付フィルタ
    if (selectedDate) {
      const dateStr = selectedDate.toLocaleDateString('sv-SE');
      return sorted.filter(r => (r.date ?? r.createdAt ?? '').startsWith(dateStr));
    }

    // checkout のタイプフィルタ（checkout のみ）
    let preFiltered = sorted;
    if (view === 'checkout' && checkoutFilter !== 'all') {
      if (checkoutFilter === 'gratitude') {
        preFiltered = sorted.filter((r: Checkout) => !!(r.gratitude && String(r.gratitude).trim()));
      } else if (checkoutFilter === 'note') {
        preFiltered = sorted.filter((r: Checkout) => !!(r.note && String(r.note).trim()));
      }
    }

    // 検索フィルタ
    let afterSearch: (Checkin | Checkout)[] = preFiltered;
    if (search && search.trim() !== '') {
      const q = search.trim().toLowerCase();
      afterSearch = preFiltered.filter(r => {
        if (view === 'checkout') {
          const co = r as Checkout;
          const fields = [
            (co.gratitude ?? '').toLowerCase(),
            (co.note ?? '').toLowerCase(),
          ].join(' ');
          return fields.includes(q);
        } else {
          const ci = r as Checkin;
          return ((ci.note ?? (ci as any).text ?? '').toLowerCase()).includes(q);
        }
      });
    }
    // チェックイン表示時は本文が空のレコードを一覧から除外する
    if (view === 'checkin') {
      return afterSearch.filter((r: Checkin) => {
        const content = String(r.note ?? (r as any).text ?? '').trim();
        return content.length > 0;
      });
    }

    return afterSearch;
  }, [source, search, view, checkoutFilter, selectedDate]);

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  // ensure page in range
  if (page > totalPages) setPage(totalPages);

  const paged = useMemo(() => {
    const start = (page - 1) * perPage;
    return filtered.slice(start, start + perPage);
  }, [filtered, page, perPage]);

  return (
    <>
      <div className="sticky top-20 z-30 bg-white/80 backdrop-blur-sm border border-gray-200 rounded-xl p-4">
        <div className="w-full max-w-4xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-2">
              {/* 上段: チェックイン / チェックアウト のタブ */}
              <div className="flex items-center gap-3">
                <div className="inline-flex items-center bg-gray-50 rounded-full p-1">
                  <button
                    onClick={() => { setView('checkin'); setPage(1); setCheckoutFilter('all'); }}
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
              {/* タブ直下にフィルタチップを常時表示（チェックイン時は非活性風に） */}
              {/* チェックアウト選択時のみ表示するフィルタチップ（感謝は青色に合わせる） */}
              {view === 'checkout' && (
                <div className="flex items-center gap-2 mt-1">
                  <button
                    onClick={() => { setCheckoutFilter('all'); setPage(1); }}
                    className={`px-3 py-1 rounded-full text-sm border ${checkoutFilter === 'all' ? 'bg-green-100 border-green-200 text-green-700' : 'bg-white border-gray-200 text-gray-600'}`}
                  >
                    すべて
                  </button>
                  <button
                    onClick={() => { setCheckoutFilter('gratitude'); setPage(1); }}
                    className={`px-3 py-1 rounded-full text-sm border ${checkoutFilter === 'gratitude' ? 'bg-indigo-100 border-indigo-200 text-indigo-700' : 'bg-white border-gray-200 text-gray-600'}`}
                  >
                    感謝
                  </button>
                  <button
                    onClick={() => { setCheckoutFilter('note'); setPage(1); }}
                    className={`px-3 py-1 rounded-full text-sm border ${checkoutFilter === 'note' ? 'bg-yellow-100 border-yellow-200 text-yellow-700' : 'bg-white border-gray-200 text-gray-600'}`}
                  >
                    日記
                  </button>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              {selectedDate && (
                <button onClick={() => setSelectedDate(null)} className="text-sm text-red-600">
                  日付フィルタ解除
                </button>
              )}
              <button onClick={() => setIsDatePickerOpen(true)} className="p-2 rounded-lg hover:bg-gray-100">
                <CalendarIcon className="w-5 h-5 text-gray-600" />
              </button>
            </div>
          </div>
        </div>
      </div>
      <DatePickerModal
        isOpen={isDatePickerOpen}
        onClose={() => setIsDatePickerOpen(false)}
        initialDate={selectedDate || new Date()}
        onDateSelect={(d) => { setSelectedDate(d); setIsDatePickerOpen(false); }}
        highlightedDates={new Set([...checkins, ...checkouts].map(r => r.date).filter(Boolean) as string[])}
      />
      <div className="space-y-4 mt-6">
        <div className="mt-4">
          {total === 0 ? (
            <p className="text-sm text-gray-500">表示する記録がありません。</p>
          ) : (
            <div className="space-y-3">
              {paged.map((r: Checkin | Checkout) => (
                <div key={r.id} className="p-3 bg-white rounded-lg">
                  <div className="flex items-start justify-between">
                    {/* 日付 + 値/レーティングをアイコン付きで表示 */}
                    <div className="flex items-center gap-2">
                      <div className="text-xs text-gray-500">{formatFullDate(parseDateValue(r))}</div>

                      {/* checkin の value 表示（画像アイコン + 白背景タグ） */}
                      {view === 'checkin' && (
                        <ValueTag value={r.value ?? r.amount ?? r.score} />
                      )}

                      {/* checkout の rating 表示（画像アイコン + 白背景タグ） */}
                      {view === 'checkout' && (
                        <RatingTag value={r.rating ?? r.raiting} />
                      )}

                    </div>
                    <div className="text-xs text-gray-400">{/* createdAt 等があればここに */}</div>
                  </div>

                  {view === 'checkout' ? (
                    <>
                      {/* 感謝 / 日記 をそれぞれ分かりやすくグルーピング */}
                      {/* フィルタに応じて感謝 / 日記 を相互に非表示にする */}
                      {checkoutFilter === 'gratitude' ? (
                        r.gratitude && r.gratitude.trim() ? (
                          <div className="mt-3">
                            <div className="flex items-start gap-3 min-w-0">
                              <span className="inline-block text-xs font-semibold px-2 py-1 bg-indigo-100 text-indigo-700 rounded-full flex-shrink-0">感謝</span>
                              <div className="text-sm text-gray-700 leading-relaxed break-words min-w-0">{r.gratitude}</div>
                            </div>
                          </div>
                        ) : (
                          <div className="text-sm text-gray-400 mt-2">記録がありません。</div>
                        )
                      ) : checkoutFilter === 'note' ? (
                        r.note && r.note.trim() ? (
                          <div className="mt-3">
                            <div className="flex items-start gap-3 min-w-0">
                              <span className="inline-block text-xs font-semibold px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full flex-shrink-0">日記</span>
                              <div className="text-sm text-gray-700 leading-relaxed break-words min-w-0">{r.note}</div>
                            </div>
                          </div>
                        ) : (
                          <div className="text-sm text-gray-400 mt-2">記録がありません。</div>
                        )
                      ) : (
                        // all: 両方ある場合は両方表示
                        (r.gratitude && r.gratitude.trim()) || (r.note && r.note.trim()) ? (
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
                        )
                      )}
                    </>
                  ) : (
                    <>
                      {(() => {
                        const content = String(r.note ?? r.text ?? '').trim();
                        if (content.length === 0) {
                          // チェックインでは本文がない場合は何も表示しない（レコード自体は filtered で除外済み）
                          return null;
                        }
                        return (
                          <div className="mt-3">
                            <div className="text-sm text-gray-700 leading-relaxed break-words min-w-0">{content}</div>
                          </div>
                        );
                      })()}
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
    </>
  );
};

export default Records;
// ...existing code...