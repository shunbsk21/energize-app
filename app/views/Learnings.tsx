import React, { 
  useState,
  useEffect,
  useRef
} from 'react';
import { Profile, LearningItem, LearningsProps } from '../types';

import { ADMIN_ID } from '../config';

const Learnings: React.FC<LearningsProps> = ({ learnings = [], onAddLearning, profile }) => {
  const isAdmin = (profile as any)?.id === ADMIN_ID;
  const [selected, setSelected] = useState<LearningItem | null>(null); // 詳細表示用
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [tags, setTags] = useState(''); // comma separated
  const editorRef = useRef<HTMLDivElement | null>(null);
  const [editingItem, setEditingItem] = useState<LearningItem | null>(null); // 新規 or 編集中の項目

  // 外部から「エディタを開く」要求を受ける（HabitTracker からの遷移時に発火）
  useEffect(() => {
    const handler = () => setIsEditorOpen(true);
    window.addEventListener('open-learning-editor', handler as EventListener);
    return () => window.removeEventListener('open-learning-editor', handler as EventListener);
  }, []); 

  // エディタを開いたら自動でフォーカス（少し遅延して確実にフォーカス）
  useEffect(() => {
    if (isEditorOpen) {
      const t = setTimeout(() => editorRef.current?.focus(), 60);
      return () => clearTimeout(t);
    }
  }, [isEditorOpen]);

  const openEditor = () => {
    setTitle('');
    setUrl('');
    setTags('');
    if (editorRef.current) editorRef.current.innerHTML = '';
    // フルスクリーンエディタを開く
    setIsEditorOpen(true);
  };

  // 選択中の項目を編集するためにエディタを開く（ADMIN 用）
  const openEditorFor = (item: LearningItem) => {
    setEditingItem(item);
    setSelected(null);
    setIsEditorOpen(true);
  };
  // エディタが開いたときに、editingItem の内容を確実に editorRef にセットする
  useEffect(() => {
    if (!isEditorOpen) return;
    // 編集対象がある場合はそれを読み込む。なければ空で初期化（新規作成）
    if (editingItem) {
      setTitle(editingItem.title || '');
      setUrl(editingItem.url || '');
      setTags((editingItem.tags || []).join(','));
    } else {
      setTitle('');
      setUrl('');
      setTags('');
    }
    const t = setTimeout(() => {
      if (editorRef.current) {
        editorRef.current.innerHTML = editingItem ? (editingItem.notes || '') : '';
        editorRef.current.focus();
      }
    }, 60);
    return () => clearTimeout(t);
  }, [isEditorOpen, editingItem]);

  const exec = (cmd: string, val?: string) => {
    document.execCommand(cmd, false, val);
    editorRef.current?.focus();
  };

  const handleSave = async () => {
    if (!title.trim()) return alert('タイトルを入力してください');
    const notesHtml = editorRef.current?.innerHTML || '';
    const tagsArr = tags.split(',').map(t => t.trim()).filter(Boolean);
    if (onAddLearning) {
      await onAddLearning({ title: title.trim(), url: url.trim() || undefined, notes: notesHtml || undefined, tags: tagsArr.length ? tagsArr : undefined });
    }
    setIsEditorOpen(false);
    setEditingItem(null);
  };

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-2xl font-bold">学習コンテンツ</h2>
        </div>
      </div>

      <div className="grid gap-3">
        {learnings.length === 0 ? (
          <div className="p-4 bg-white rounded-md shadow-sm text-sm text-gray-500">学習コンテンツがありません。</div>
        ) : (
          learnings.map(l => (
            <article
              key={l.id ?? l.title}
              onClick={() => setSelected(l)}
              className="bg-white rounded-md p-4 shadow-sm border cursor-pointer hover:shadow-md transition"
            >
              <div className="mb-2">
              <h3 className="font-semibold text-lg">{l.title}</h3>
              {/* タグはタイトル下に表示 */}
              {l.tags && l.tags.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {l.tags.map(tag => (
                    <span key={tag} className="text-xs bg-gray-100 px-2 py-1 rounded-full text-gray-700 border">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* 詳細は最大3行まで表示 */}
            <div
              className="text-sm text-gray-700 mt-3"
              style={{
                display: '-webkit-box',
                WebkitLineClamp: 3,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden'
              }}
              // 表示は HTML を保持
              dangerouslySetInnerHTML={{ __html: l.notes || '' }}
            />
            <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
              {/* 最終更新日のみ左下に小さく表示 */}
              <div className="text-xs text-gray-500">
                {l.updatedAt ? `更新: ${
                  // Timestampオブジェクトか文字列かを判別して正しくDateに変換
                  (typeof l.updatedAt === 'object' && l.updatedAt && 'toDate' in l.updatedAt)
                    ? (l.updatedAt as any).toDate().toLocaleString()
                    : new Date(l.updatedAt).toLocaleString()
                }` : ''}
              </div>
              {/* 右側に外部URL（必要なら） */}
              <div>
                {l.url && <a href={l.url} target="_blank" rel="noreferrer" className="text-indigo-600 text-sm">リンク</a>}
              </div>
            </div>
          </article>
        ))
        )}
      </div>
      {/* 管理者のみ表示する追加ボタン (右下の FAB) */}
      {isAdmin && (
        <>
          <button
            onClick={openEditor}
            title="学習を追加"
            className="fixed right-6 bottom-6 z-50 w-14 h-14 rounded-full bg-amber-600 text-white shadow-lg flex items-center justify-center text-xl"
          >＋</button>
        </>
      )}

      {/* フルスクリーンエディタ（メモの Fullscreen と同等の振る舞い） */}
      {isEditorOpen && (
        <div className="fixed inset-0 z-50 bg-white flex flex-col" onClick={() => setIsEditorOpen(false)}>
          {/* 内部コンテナでクリックを止めることで、編集領域クリックで閉じないようにする */}
          <div className="flex flex-col w-full" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b">
              <button
                onClick={() => setIsEditorOpen(false)}
                className="text-gray-600 px-2 py-1"
              >
                閉じる
              </button>
              <div className="font-semibold">学習コンテンツを作成</div>
              <div className="flex items-center gap-2">
                <button onClick={handleSave} className="px-3 py-1 rounded bg-amber-600 text-white">保存</button>
              </div>
            </div>
            <div className="p-4 flex-1 overflow-auto">
              <div className="space-y-4 max-w-3xl mx-auto">
                <input value={title} onChange={e => setTitle(e.target.value)} placeholder="タイトル" className="w-full p-3 border border-gray-200 rounded" />
                <input value={url} onChange={e => setUrl(e.target.value)} placeholder="外部URL (任意)" className="w-full p-3 border border-gray-200 rounded" />
                <input value={tags} onChange={e => setTags(e.target.value)} placeholder="タグ (カンマ区切り)" className="w-full p-3 border border-gray-200 rounded" />
                <div className="border rounded-md">
                  <div className="bg-gray-50 p-2 flex gap-2">
                    <button type="button" onClick={() => exec('bold')} className="px-2 py-1 rounded bg-white border text-sm">太字</button>
                    <button type="button" onClick={() => exec('italic')} className="px-2 py-1 rounded bg-white border text-sm">斜体</button>
                    <button type="button" onClick={() => {
                      const link = window.prompt('リンクURLを入力してください');
                      if (link) exec('createLink', link);
                    }} className="px-2 py-1 rounded bg-white border text-sm">リンク</button>
                  </div>
                  <div ref={editorRef as any} contentEditable className="min-h-[320px] p-4 prose max-w-none" />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* コンテンツ詳細モーダル（フルスクリーン表示） */}
      {selected && (
        <div className="fixed inset-0 z-60 bg-white flex flex-col">
          <div className="flex items-center justify-between p-4 border-b">
            <div>
              <button onClick={() => setSelected(null)} className="text-gray-600 px-2 py-1">閉じる</button>
            </div>
            <div className="text-lg font-semibold truncate max-w-[60%]">{selected.title}</div>
            <div className="flex items-center gap-2">
              {isAdmin && (
                <button
                  onClick={() => openEditorFor(selected)}
                  title="編集"
                  className="px-3 py-1 rounded bg-amber-50 text-amber-700 border"
                >
                  編集
                </button>
              )}
            </div>
          </div>

          <div className="p-6 overflow-auto flex-1">
            <div className="mb-4 text-xs text-gray-500">
              {selected.createdAt && <span>作成: {new Date(selected.createdAt).toLocaleString()}</span>}
              {selected.updatedAt && <span className="ml-3">更新: {
                (typeof selected.updatedAt === 'object' && selected.updatedAt && 'toDate' in selected.updatedAt)
                  ? (selected.updatedAt as any).toDate().toLocaleString()
                  : new Date(selected.updatedAt).toLocaleString()
              }</span>}
            </div>
            {selected.tags && selected.tags.length > 0 && (
              <div className="mb-4 flex flex-wrap gap-2">
                {selected.tags.map(t => (
                  <span key={t} className="text-xs bg-gray-100 px-2 py-1 rounded-full text-gray-700 border">{t}</span>
                ))}
              </div>
            )}

            <div className="prose max-w-none text-sm" dangerouslySetInnerHTML={{ __html: selected.notes || '' }} />
          </div>
        </div>
      )}

    </div>
  );
};

export default Learnings;