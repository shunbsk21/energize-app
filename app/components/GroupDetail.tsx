"use client";

import React, { useState, useMemo, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { collection, query, onSnapshot, orderBy, doc as firestoreDoc, getDoc, getDocs, where, limit, startAfter } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Profile, Friend, Group as GroupType, Comment, Habit } from '../types';

const ChevronLeftIcon: React.FC<{className?: string}> = ({className}) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
  </svg>
);
const SendIcon: React.FC<{className?: string}> = ({className}) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405Z" />
  </svg>
);
const UserPlusIcon: React.FC<{className?: string}> = ({className}) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0ZM3 19.235v-.11a6.375 6.375 0 0 1 12.75 0v.109A12.318 12.318 0 0 1 9.374 21c-2.331 0-4.512-.645-6.374-1.766Z" />
  </svg>
);
const UserMinusIcon: React.FC<{className?: string}> = ({className}) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12H9m12 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
  </svg>
);

const isHabitScheduledForDate = (habit: Habit, date: Date): boolean => {
  const habitStartDate = new Date(habit.startDate);
  habitStartDate.setHours(0,0,0,0);
  const targetDate = new Date(date);
  targetDate.setHours(0,0,0,0);
  if (targetDate < habitStartDate) return false;
  switch (habit.frequencyType) {
    case 'daily': return true;
    case 'weekly': return Array.isArray(habit.frequencyValue) && habit.frequencyValue.includes(targetDate.getDay());
    case 'monthly': return Array.isArray(habit.frequencyValue) && habit.frequencyValue.includes(targetDate.getDate());
    default: return false;
  }
};

// --- HabitTracker と同等の達成率ロジックを追加（ファイル内スコープ） ---
const calculateCompletionPercentForDate = (date: Date, habitsList: Habit[]) => {
  const dateStr = date.toLocaleDateString('sv-SE');
  const scheduled = (habitsList || []).filter(h => {
    if (!isHabitScheduledForDate(h, date)) return false;
    const skipped = ((h as any).skippedDates || []).map((s: string) => {
      const dt = new Date(s); dt.setHours(0,0,0,0); return dt.toLocaleDateString('sv-SE');
    });
    return !skipped.includes(dateStr);
  });
  if (scheduled.length === 0) return 0;
  const completedCount = scheduled.reduce((acc, h) => {
    if ((h.type ?? 'binary') === 'amount') {
      const val = ((h.completedAmounts || {})[dateStr] ?? 0);
      const target = h.target ?? 0;
      const ok = target > 0 ? val >= target : val > 0;
      return acc + (ok ? 1 : 0);
    } else {
      const doneKeys = (h.completedDates || []).map(d => {
        const dt = new Date(d); dt.setHours(0,0,0,0); return dt.toLocaleDateString('sv-SE');
      });
      return acc + (doneKeys.includes(dateStr) ? 1 : 0);
    }
  }, 0);
  return Math.round((completedCount / scheduled.length) * 100);
};

/* ConfirmRemoveModal, MemberHabitsModal, SharedHabitsModal, InviteMemberModal
   — Group.tsx から切り出したものをここへ配置しています.
   必要に応じてさらに分割可能ですが、一旦 GroupDetail と密結合の
   モーダル群は一緒にしておきます。 */

const ConfirmRemoveModal: React.FC<{
  member: Profile | Friend;
  groupName: string;
  onClose: () => void;
  onConfirm: () => void;
}> = ({ member, groupName, onClose, onConfirm }) => {
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-[70]" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6 text-center animate-fade-in" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-bold text-gray-800">メンバーを退会させますか？</h3>
        <p className="text-gray-600 my-2 text-sm">
          本当に <span className="font-bold">{member.displayName}</span> さんを
          グループ「{groupName}」から退会させますか？
        </p>
        <div className="flex justify-center gap-4 mt-6">
          <button onClick={onClose} className="px-6 py-2 rounded-lg text-gray-700 bg-gray-200 hover:bg-gray-300 font-semibold">
            キャンセル
          </button>
          <button onClick={onConfirm} className="px-6 py-2 rounded-lg text-white bg-red-600 hover:bg-red-700 font-semibold">
            退会させる
          </button>
        </div>
      </div>
    </div>
  );
};

const MemberHabitsModal: React.FC<{
  memberId: string;
  memberProfile: Profile | Friend | null;
  memberHabits?: Habit[];
  groupSharedHabitIds: string[];
  currentUserId: string;
  isFollowing: boolean;
  onClose: () => void;
  onFollowUser: (friendId: string) => void;
  onEditMySharedHabits?: () => void;
  isLoading: boolean; // isLoading prop を追加
}> = ({ memberId, memberProfile, memberHabits, groupSharedHabitIds, currentUserId, isFollowing, onClose, onFollowUser, onEditMySharedHabits, isLoading }) => {
  const habits: Habit[] = memberHabits || (memberProfile && (memberProfile as any).habits) || [];
  const todayStr = new Date().toLocaleDateString('sv-SE');
  const sharedHabits = habits.filter(h => groupSharedHabitIds.includes(h.id));
  const isSelf = memberId === currentUserId;
  const weekdayNames = ['日','月','火','水','木','金','土'];
  const formatFrequency = (habit: Habit) => {
    const type = (habit as any).frequencyType;
    const val = (habit as any).frequencyValue;
    if (type === 'daily') return '毎日';
    if (type === 'weekly') {
      if (Array.isArray(val) && val.length > 0) return '毎週 ' + val.map((d: number) => weekdayNames[d]).join('・');
      return '毎週';
    }
    if (type === 'monthly') {
      if (Array.isArray(val) && val.length > 0) return '毎月 ' + val.map((d: number) => `${d}日`).join('、');
      return '毎月';
    }
    if (typeof val === 'string' && val) return String(val);
    if (Array.isArray(val) && val.length) return String(val);
    return '';
  };
  const getTitle = (habit: Habit) => {
    const h: any = habit;
    return h.title || h.name || h.label || '無題の習慣';
  };

  // ★ 今日の達成率を計算
  const completionPercent = useMemo(() => calculateCompletionPercentForDate(new Date(), sharedHabits), [sharedHabits]);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[80]" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 relative" onClick={e => e.stopPropagation()}>
        <button onClick={onClose} aria-label="閉じる" className="absolute right-4 top-4 w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-gray-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>

        <div className="mb-3">
          <h3 className="text-lg font-bold">
            {memberProfile?.displayName || 'ユーザー'} の共有習慣
          </h3>
          {/* ★ ローディング状態と達成率表示 */}
          {!isLoading && (
            <div className="flex items-baseline gap-4 mt-1">
              <p className="text-xs text-gray-400">{`共有中の習慣: ${sharedHabits.length}件`}</p>
              <p className="text-xs text-gray-500">
                今日の達成率: <span className="text-lg font-bold text-indigo-600">{completionPercent}%</span>
              </p>
            </div>
          )}
        </div>

        {/* ★ ローディング表示 */}
        {isLoading ? (
          <div className="py-10 flex justify-center items-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            <span className="ml-3 text-gray-600">データを読み込み中...</span>
          </div>
        ) : sharedHabits.length === 0 ? (
          <div className="py-6 text-sm text-gray-500 text-center">このメンバーは、グループと共有している習慣がありません。</div>
        ) : (
          <ul className="space-y-3 mb-4 max-h-60 overflow-y-auto pr-2">
            {sharedHabits.map(habit => {
              const scheduled = isHabitScheduledForDate(habit, new Date());
              const completed = (habit.completedDates || []).includes(todayStr);
              return (
                <li key={habit.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <div className="font-semibold text-gray-800">{getTitle(habit)}</div>
                    <div className="text-xs text-gray-500">{formatFrequency(habit)} {scheduled ? '・今日対象' : '・今日は対象外'}</div>
                  </div>
                  <div className="text-sm">
                    {completed ? <span className="text-green-600 font-bold">完了</span> : <span className="text-gray-400">未実行</span>}
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        <div className="flex justify-end gap-2">
          {isSelf ? (
            <button onClick={() => { onEditMySharedHabits?.(); }} className="px-4 py-2 bg-indigo-600 text-white rounded-lg">共有習慣を編集</button>
          ) : (
            <>
              {isFollowing ? (
                <button disabled className="px-4 py-2 bg-gray-200 text-gray-600 rounded-lg">フォロー済み</button>
              ) : (
                <button onClick={() => { onFollowUser(memberId); }} className="px-4 py-2 bg-indigo-600 text-white rounded-lg">フォローする</button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

const SharedHabitsModal: React.FC<{
  group: GroupType;
  profile: Profile;
  myHabits: Habit[];
  initialSharedIds: string[];
  onClose: () => void;
  onSave: (sharedIds: string[]) => void;
}> = ({ group, profile, myHabits, initialSharedIds, onClose, onSave }) => {
  const [selected, setSelected] = useState<Set<string>>(() => {
    if (initialSharedIds && initialSharedIds.length > 0) return new Set(initialSharedIds);
    return new Set(myHabits.map(h => h.id));
  });

  useEffect(() => {
    if ((!initialSharedIds || initialSharedIds.length === 0) && myHabits && myHabits.length > 0) {
      setSelected(new Set(myHabits.map(h => h.id)));
    }
    if (initialSharedIds && initialSharedIds.length > 0) {
      setSelected(new Set(initialSharedIds));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myHabits, JSON.stringify(initialSharedIds || [])]);

  const toggle = (id: string) => {
    setSelected(prev => {
      const s = new Set(prev);
      if (s.has(id)) s.delete(id); else s.add(id);
      return s;
    });
  };
  const selectAll = () => setSelected(new Set(myHabits.map(h => h.id)));
  const clearAll = () => setSelected(new Set());

  const weekdayNames = ['日','月','火','水','木','金','土'];
  const formatFrequency = (habit: Habit) => {
    const type = habit.frequencyType;
    const val = habit.frequencyValue;
    if (type === 'daily') return '毎日';
    if (type === 'weekly') {
      if (Array.isArray(val) && val.length > 0) return '毎週 ' + val.map((d: number) => weekdayNames[d]).join('・');
      return '毎週';
    }
    if (type === 'monthly') {
      if (Array.isArray(val) && val.length > 0) return '毎月 ' + val.map((d: number) => `${d}日`).join('、');
      return '毎月';
    }
    if (typeof val === 'string' && val) return String(val);
    if (Array.isArray(val) && val.length) return String(val);
    return '';
  };
  const getTitle = (habit: Habit) => {
    const h: any = habit;
    return h.title || h.name || h.label || '無題の習慣';
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[80]" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-bold">このグループで共有する習慣を選択</h3>
          <div className="flex gap-2">
            <button onClick={selectAll} className="px-3 py-1 text-sm bg-gray-100 rounded-md hover:bg-gray-200">すべて選択</button>
            <button onClick={clearAll} className="px-3 py-1 text-sm bg-gray-100 rounded-md hover:bg-gray-200">すべて解除</button>
          </div>
        </div>

        <div className="space-y-2 max-h-72 overflow-y-auto mb-4">
          {myHabits.length === 0 && <p className="text-sm text-gray-500">まず習慣を作成してください。</p>}
          {myHabits.map(h => (
            <label key={h.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg cursor-pointer">
              <div>
                <div className="font-medium text-gray-800">{getTitle(h)}</div>
                <div className="text-xs text-gray-400">{formatFrequency(h)}</div>
              </div>
              <input type="checkbox" checked={selected.has(h.id)} onChange={() => toggle(h.id)} />
            </label>
          ))}
        </div>
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded-lg bg-gray-200">キャンセル</button>
          <button onClick={() => onSave(Array.from(selected))} className="px-4 py-2 rounded-lg bg-indigo-600 text-white">保存</button>
        </div>
      </div>
    </div>
  );
};

const InviteMemberModal: React.FC<{
  group: GroupType;
  profile: Profile;
  following: Friend[];
  onFollowUser: (friendId: string) => void;
  onClose: () => void;
  onInvite: (memberIds: string[]) => void;
}> = ({ group, profile, following, onFollowUser, onClose, onInvite }) => {
  const [selectedFriends, setSelectedFriends] = useState<Set<string>>(new Set());
  const availableFriends = useMemo(() => {
    const memberIds = new Set(group.members);
    return following.filter(f => !memberIds.has(f.id));
  }, [following, group.members]);

  const toggleFriend = (friendId: string) => {
    setSelectedFriends(prev => {
      const newSet = new Set(prev);
      if (newSet.has(friendId)) newSet.delete(friendId); else newSet.add(friendId);
      return newSet;
    });
  };

  const handleInvite = () => {
    onInvite(Array.from(selectedFriends));
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-[60]" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
        <h2 className="text-xl font-bold text-gray-800 mb-4">メンバーを招待</h2>
        <div className="space-y-4">
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {availableFriends.length > 0 ? availableFriends.map(friend => (
              <div key={friend.id} onClick={() => toggleFriend(friend.id)} className={`flex items-center p-2 rounded-lg cursor-pointer ${selectedFriends.has(friend.id) ? 'bg-indigo-100' : 'bg-gray-50'}`}>
                <input type="checkbox" checked={selectedFriends.has(friend.id)} readOnly className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"/>
                <img src={friend.imageUrl || 'data:image/svgxml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGNsYXNzPSJoLTYgdy02IiBmaWxsPSJub25lIiB2aWV3Qm94PSIwIDAgMjQgMjQiIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2Utd2lkdGg9IjIiPjxwYXRoIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgZD0iTTUuMTIxIDE3LjgwNEExMy45MzcgMTMuOTM3IDAgMDExMiAxNmMzLjUgMCA2Ljg0Ny42NTUgNi44NzkgMS44MDRNMTUgMTBhMyAzIDAgMTEtNiAwIDMgMyAwIDAxNiAweiIgLz48L3N2Zz4='} alt={friend.displayName} className="w-6 h-6 rounded-full object-cover bg-gray-200 ml-3" />
                <span className="ml-2 text-gray-800">{friend.displayName}</span>
              </div>
            )) : (
              <p className="text-gray-500 text-center py-4">招待できるフォロー中の友達がいません。</p>
            )}
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-4 mt-4 border-t">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg text-gray-600 hover:bg-gray-100">キャンセル</button>
          <button type="button" onClick={handleInvite} disabled={selectedFriends.size === 0} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 shadow disabled:bg-gray-400">招待</button>
        </div>
      </div>
    </div>
  );
};

const GroupDetail: React.FC<{
  group: GroupType;
  profile: Profile;
  following: Friend[];
  onFollowUser: (friendId: string) => void;
  onAddComment: (newCommentData: Omit<Comment, 'id'>) => void;
  habits: Habit[];
  onBack: () => void;
  onInviteMembers: (group: GroupType, memberIds: string[]) => void;
  onRemoveMember: (groupId: string, memberIdToRemove: string) => void;
  allUserProfiles: Map<string, Profile | Friend>;
  onUpdateGroupSharedHabits: (groupId: string, memberId: string, sharedHabitIds: string[]) => void;
}> = ({ group, profile, following, onFollowUser, onAddComment, habits, onBack, onInviteMembers, onRemoveMember, allUserProfiles, onUpdateGroupSharedHabits }) => {

  const [newComment, setNewComment] = useState('');
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<(Profile | Friend) | null>(null);
  const [messages, setMessages] = useState<Comment[]>([]);
  const initialLoadRef = useRef<boolean>(true);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [isMemberModalOpen, setIsMemberModalOpen] = useState(false);
  const [isSharedHabitsOpen, setIsSharedHabitsOpen] = useState(false);
  const [isProgressOpen, setIsProgressOpen] = useState(false);
  const closeProgress = () => setIsProgressOpen(false);
  const groupSharedIds: string[] = (group as any).sharedHabitIds || (group as any).sharedHabits || [];
  const groupSharedByMember = (group as any).sharedByMember || {};
  const [memberSharedMap, setMemberSharedMap] = useState<Record<string, string[]>>({});
  const [memberHabitsMap, setMemberHabitsMap] = useState<Record<string, Habit[]>>({});
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);
  const PAGE_SIZE = 30;
  const [lastVisibleDoc, setLastVisibleDoc] = useState<any | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [isLoadingProgress, setIsLoadingProgress] = useState(false);

  // ★ 進捗モーダルを開く処理
  const openProgress = async () => {
    setIsProgressOpen(true);
    setIsLoadingProgress(true);
    // メンバーの習慣データと共有設定を並行して取得
    const promises = group.members
      .filter(id => id !== profile.id) // 自分以外
      .map(async (memberId) => {
        const habitPromise = !memberHabitsMap[memberId]
          ? getDocs(query(collection(db, 'users', memberId, 'habits')))
          : Promise.resolve(null);

        const sharedSettingPromise = !memberSharedMap[memberId]
          ? getDoc(firestoreDoc(db, 'users', memberId, 'groups', group.id))
          : Promise.resolve(null);

        try {
          const [habitsSnap, sharedSnap] = await Promise.all([habitPromise, sharedSettingPromise]);

          const habits = habitsSnap ? habitsSnap.docs.map(d => ({ id: d.id, ...(d.data() as any) })) : memberHabitsMap[memberId] || [];
          const sharedIds = sharedSnap?.exists() ? (sharedSnap.data() as any).sharedByMember?.[memberId] || [] : memberSharedMap[memberId] || [];

          return { memberId, habits, sharedIds };
        } catch (err) {
          console.error(`[Progress] メンバー(${memberId})のデータ取得に失敗:`, err);
          return { memberId, habits: [], sharedIds: [] }; // エラー時は空配列
        }
      });

    const results = await Promise.all(promises);
    // 取得したデータをまとめてstateに反映
    const newHabitsMap = { ...memberHabitsMap };
    const newSharedMap = { ...memberSharedMap };
    results.forEach(r => {
      newHabitsMap[r.memberId] = r.habits;
      newSharedMap[r.memberId] = r.sharedIds;
    });
    setMemberHabitsMap(newHabitsMap);
    setMemberSharedMap(newSharedMap);
    setIsLoadingProgress(false);
  };
  // --- Pagination + realtime new messages ---
  useEffect(() => {
    let unsubNew: (() => void) | null = null;
    let cancelled = false;

    const loadInitial = async () => {
      setLoadingInitial(true);
      try {
        // get latest PAGE_SIZE messages (desc), then reverse for UI (asc)
        const col = collection(db, 'group_chats', group.id, 'messages');
        const q = query(col, orderBy('timestamp', 'desc'), limit(PAGE_SIZE));
        const snap = await getDocs(q);
        if (cancelled) return;
        const docs = snap.docs;
        const msgs: Comment[] = docs
          .map(d => {
            const data = d.data() as any;
            const obj = {
              id: d.id,
              groupId: data.groupId,
              authorId: data.authorId,
              authorName: data.authorName,
              text: data.text,
              timestamp: data.timestamp,
              authorImageUrl: data.authorImageUrl || null
            };
            return obj as unknown as Comment;
          })
          .reverse();
        setMessages(msgs);
        // lastVisibleDoc will be the oldest doc in this page (docs[docs.length-1])
        setLastVisibleDoc(docs[docs.length - 1] || null);
        setHasMore(docs.length === PAGE_SIZE);
        initialLoadRef.current = false;
        // set up realtime listener for new messages after latest timestamp
        const latestTimestamp = msgs.length ? msgs[msgs.length - 1].timestamp : null;
        const colRef = collection(db, 'group_chats', group.id, 'messages');
        if (latestTimestamp) {
          const qNew = query(colRef, orderBy('timestamp', 'asc'), where('timestamp', '>', latestTimestamp));
          unsubNew = onSnapshot(qNew, (snapNew) => {
            snapNew.docChanges().forEach(change => {
              if (change.type === 'added') {
                const d = change.doc;
                const data = d.data() as any;
                const obj = {
                  id: d.id,
                  groupId: data.groupId,
                  authorId: data.authorId,
                  authorName: data.authorName,
                  text: data.text,
                  timestamp: data.timestamp,
                  authorImageUrl: data.authorImageUrl || null
                };
                const newMsg = obj as unknown as Comment;
                setMessages(prev => {
                  // avoid duplicates
                  if (prev.find(m => m.id === newMsg.id)) return prev;
                  return [...prev, newMsg];
                });
                // toast for others' messages (preserve original behavior)
                if (!initialLoadRef.current && newMsg.authorId !== profile.id) {
                  toast(`${newMsg.authorName || '名無し'}: ${String(newMsg.text)}`, { duration: 4000 });
                }
              }
            });
          }, (err) => console.error('realtime new messages failed', err));
        } else {
          // no messages yet: listen for first new message
          const qOne = query(colRef, orderBy('timestamp', 'asc'), limit(1));
          unsubNew = onSnapshot(qOne, (snapNew) => {
            snapNew.docChanges().forEach(change => {
              if (change.type === 'added') {
                const d = change.doc;
                const data = d.data() as any;
                const obj = {
                  id: d.id,
                  groupId: data.groupId,
                  authorId: data.authorId,
                  authorName: data.authorName,
                  text: data.text,
                  timestamp: data.timestamp,
                  authorImageUrl: data.authorImageUrl || null
                };
                const newMsg = obj as unknown as Comment;
                setMessages(prev => {
                  // avoid duplicates
                  if (prev.find(m => m.id === newMsg.id)) return prev;
                  return [...prev, newMsg];
                });
              }
            });
          }, (err) => console.error('realtime first message listen failed', err));
        }
      } catch (err) {
        console.error('[Group] initial messages load failed', err);
      } finally {
        if (!cancelled) setLoadingInitial(false);
      }
    };

    loadInitial();
    return () => {
      cancelled = true;
      if (unsubNew) unsubNew();
    };
  }, [group.id]);

  // load older messages when scrolling to top
  const loadMoreOlder = async () => {
    if (!hasMore || loadingMore || !lastVisibleDoc) return;
    setLoadingMore(true);
    try {
      const col = collection(db, 'group_chats', group.id, 'messages');
      // we used desc order for pagination, startAfter(lastVisibleDoc) fetches older docs (next batch)
      const q = query(col, orderBy('timestamp', 'desc'), startAfter(lastVisibleDoc), limit(PAGE_SIZE));
      const snap = await getDocs(q);
      const docs = snap.docs;
      if (docs.length === 0) {
        setHasMore(false);
        return;
      }
      const olderMsgs = docs.map(d => {
        const data = d.data() as any;
        const obj = {
          id: d.id,
          groupId: data.groupId,
          authorId: data.authorId,
          authorName: data.authorName,
          text: data.text,
          timestamp: data.timestamp,
          authorImageUrl: data.authorImageUrl || null
        };
        return obj as unknown as Comment;
      }).reverse();

      // preserve scroll position: measure before/after
      const el = messagesContainerRef.current;
      const prevScrollHeight = el?.scrollHeight || 0;
      const prevScrollTop = el?.scrollTop || 0;

      setMessages(prev => [...olderMsgs, ...prev]);
      // update lastVisibleDoc to last doc of this fetch (oldest)
      setLastVisibleDoc(docs[docs.length - 1] || null);
      setHasMore(docs.length === PAGE_SIZE);

      // adjust scroll after DOM updates
      requestAnimationFrame(() => {
        const newScrollHeight = el?.scrollHeight || 0;
        if (el) {
          el.scrollTop = newScrollHeight - prevScrollHeight + prevScrollTop;
        }
      });
    } catch (err) {
      console.error('[Group] load more older messages failed', err);
    } finally {
      setLoadingMore(false);
    }
  };

  // attach scroll handler to trigger loadMore when near top
  useEffect(() => {
    const el = messagesContainerRef.current;
    if (!el) return;
    let raf = 0;
    const onScroll = () => {
      // when near top, load older messages
      if (el.scrollTop < 150 && hasMore && !loadingMore) {
        // debounce with rAF
        if (raf) cancelAnimationFrame(raf);
        raf = requestAnimationFrame(() => {
          loadMoreOlder();
        });
      }
    };
    el.addEventListener('scroll', onScroll);
    return () => {
      el.removeEventListener('scroll', onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messagesContainerRef.current, hasMore, loadingMore, lastVisibleDoc]);
  // auto-scroll behavior:
  // - after initial load, jump to bottom
  // - when new messages arrive, scroll to bottom only if user is near bottom
  useEffect(() => {
    const el = messagesContainerRef.current;
    if (!el) return;
    // if initial load just finished, go to bottom
    if (!loadingInitial && messages.length > 0) {
      requestAnimationFrame(() => {
        el.scrollTop = el.scrollHeight;
      });
      return;
    }
    // determine if user is near bottom
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    if (distanceFromBottom < 200) {
      requestAnimationFrame(() => {
        el.scrollTop = el.scrollHeight;
      });
    }
  }, [messages, loadingInitial]);

  useEffect(() => {
    if (!selectedMemberId) return;
    let cancelled = false;
    (async () => {
      try {
        const memberGroupDocRef = firestoreDoc(db, 'users', selectedMemberId, 'groups', group.id);
        const snap = await getDoc(memberGroupDocRef);
        if (cancelled) return;
        if (snap.exists()) {
          const data = snap.data() as any;
          const sharedForGroup = (data?.sharedByMember && data.sharedByMember[selectedMemberId]) || data?.sharedHabitIds || [];
          setMemberSharedMap(prev => ({ ...prev, [selectedMemberId]: Array.isArray(sharedForGroup) ? sharedForGroup : [] }));
          return;
        }
        try {
          const globalGroupRef = firestoreDoc(db, 'groups', group.id);
          const gSnap = await getDoc(globalGroupRef);
          if (!cancelled && gSnap.exists()) {
            const gdata = gSnap.data() as any;
            const sharedForGroup = (gdata?.sharedByMember && gdata.sharedByMember[selectedMemberId]) || gdata?.sharedHabitIds || [];
            setMemberSharedMap(prev => ({ ...prev, [selectedMemberId]: Array.isArray(sharedForGroup) ? sharedForGroup : [] }));
            return;
          }
        } catch (e) { console.debug('[Group] global groups fetch failed', e); }
        const fallback = (group as any).sharedByMember && (group as any).sharedByMember[selectedMemberId];
        setMemberSharedMap(prev => ({ ...prev, [selectedMemberId]: Array.isArray(fallback) ? fallback : [] }));
      } catch (err) {
        console.error('failed to load member shared habits', err);
        setMemberSharedMap(prev => ({ ...prev, [selectedMemberId]: [] }));
      }
    })();
    return () => { cancelled = true; };
  }, [selectedMemberId, group.id, JSON.stringify((group as any)?.sharedByMember || (group as any)?.sharedHabitIds || {})]);

  useEffect(() => {
    if (!selectedMemberId) return;
    if (memberHabitsMap[selectedMemberId]) return;
    let cancelled = false;
    (async () => {
      try {
        const habitsCol = collection(db, 'users', selectedMemberId, 'habits');
        const q = query(habitsCol);
        const snap = await getDocs(q);
        if (cancelled) return;
        const loaded: Habit[] = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) } as Habit));
        setMemberHabitsMap(prev => ({ ...prev, [selectedMemberId]: loaded }));
      } catch (err) {
        console.error('[Group] failed to load member habits', selectedMemberId, err);
        setMemberHabitsMap(prev => ({ ...prev, [selectedMemberId]: [] }));
      }
    })();
    return () => { cancelled = true; };
  }, [selectedMemberId, JSON.stringify(selectedMemberId ? (memberHabitsMap[selectedMemberId] || []) : [])]);

  const getMemberProfile = (memberId: string) => {
    return allUserProfiles.get(memberId) || { id: memberId, displayName: `ユーザー ${memberId.substring(0,4)}`, imageUrl: null };
  };

  const getMemberProgress = (memberId: string): number | null => {
    const today = new Date();
    if (memberId === profile.id) {
      // 自分の習慣リスト（props habits）
      return calculateCompletionPercentForDate(today, habits);
    }
    const sharedForMember: string[] = groupSharedByMember[memberId] || memberSharedMap[memberId] || [];
    if (!sharedForMember || sharedForMember.length === 0) return null;

    // memberHabitsMap cache または allUserProfiles fallback
    let memberHabits = memberHabitsMap[memberId];
    if (!memberHabits) {
      const mp = allUserProfiles.get(memberId) as any;
      memberHabits = (mp && mp.habits) ? mp.habits as Habit[] : [];
    }
    if (!memberHabits || memberHabits.length === 0) return null;
    const sharedHabits = memberHabits.filter(h => sharedForMember.includes(h.id));
    if (sharedHabits.length === 0) return 0;
    return calculateCompletionPercentForDate(today, sharedHabits);
  };

  // 進捗モーダル（Group.tsx と同等の表示をここでも出す）
  const GroupProgressModalInline: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    const today = new Date();
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[90]" onClick={onClose}>
        <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-bold">{group.name} の今日の進捗</h3>
            <button onClick={onClose} className="text-gray-500">閉じる</button>
          </div>
          {isLoadingProgress ? (
            <div className="py-10 flex justify-center items-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
              <span className="ml-3 text-gray-600">達成率を計算中...</span>
            </div>
          ) : (
            <div className="space-y-3">
              {group.members.map(memberId => {
                const member = getMemberProfile(memberId);
                const progress = getMemberProgress(memberId);
                const isSelf = memberId === profile.id;
                return (
                  <div key={memberId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <img src={member.imageUrl || 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40"></svg>'} alt={member.displayName} className="w-10 h-10 rounded-full object-cover bg-gray-200" />
                      <div>
                        <div className="font-semibold text-gray-800">{member.displayName}{isSelf ? ' (自分)' : ''}</div>
                      </div>
                    </div>
                    <div className="w-28 text-right">
                      {progress === null ? <span className="text-sm text-gray-400">-</span> : <span className="font-bold text-indigo-600">{progress}%</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  };

  const handlePostComment = () => {
    if(!newComment.trim()) return;
    const commentData: Omit<Comment, 'id'> = {
      groupId: group.id,
      authorId: profile.id,
      authorName: profile.displayName,
      text: newComment.trim(),
      timestamp: new Date().toISOString()
    };
    onAddComment(commentData);
    setNewComment('');
  };

  const groupedMessages = useMemo(() => {
    const groups: Record<string, Comment[]> = {};
    messages.forEach(m => {
      const d = m.timestamp ? new Date(m.timestamp) : new Date();
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const key = `${yyyy}/${mm}/${dd}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(m);
    });
    return Object.keys(groups)
      .sort((a, b) => a.localeCompare(b))
      .map(date => ({ date, items: groups[date] }));
  }, [messages]);

  const followingIds = useMemo(() => new Set(following.map(f => f.id)), [following]);
  const isOwner = profile.id === group.ownerId;

  const confirmRemoveMember = () => {
    if (memberToRemove) {
      onRemoveMember(group.id, memberToRemove.id);
      setMemberToRemove(null);
    }
  };

  return (
    <>
      <div className="animate-fade-in flex flex-col h-full">

        {/* ヘッダー */}
        <div className="fixed left-4 right-4 z-40 flex items-center gap-2 py-2 px-4 bg-white/90 border border-gray-200/30 rounded-xl shadow">
          <button onClick={onBack} className="p-2 rounded-full hover:bg-gray-100">
            <ChevronLeftIcon className="w-6 h-6 text-gray-600"/>
          </button>
          <h2 className="text-2xl font-bold text-gray-800">{group.name}</h2>
          <div className="flex-1" />
          <button onClick={(e) => { e.stopPropagation(); openProgress(); }} className="ml-3 px-3 py-1 bg-white border border-gray-200 rounded-md text-sm text-indigo-600 hover:bg-indigo-50">
            進捗
          </button>
          {group.members.includes(profile.id) && (
            <button onClick={() => setIsSharedHabitsOpen(true)} className="ml-3 px-3 py-1 rounded-lg bg-indigo-100 text-indigo-700 text-sm">
              自分の共有設定
            </button>
          )}
        </div>

        {/* messages area: flexible scroll region */}
        <div className="flex-1 pt-24 p-2 overflow-hidden">
          <div ref={messagesContainerRef} className="space-y-4 overflow-y-auto pr-4 pb-28 h-full">
            {groupedMessages.map(grouped => (
              <div key={grouped.date} className="mb-6">
                <div className="flex items-center justify-center my-3">
                  <div className="flex items-center gap-3 w-full max-w-md">
                    <div className="flex-1 h-px bg-gray-200" />
                    <span className="inline-block text-xs text-gray-500 bg-white border border-gray-100 rounded-full px-3 py-1 shadow-sm">
                      {grouped.date}
                    </span>
                    <div className="flex-1 h-px bg-gray-200" />
                  </div>
                </div>

                <div className="space-y-4">
                  {grouped.items.map(message => {
                    const isAuthor = message.authorId === profile.id;
                    const authorImageUrl = (message as any).authorImageUrl || null;
                    return (
                      <div key={message.id} className={`flex gap-2 ${isAuthor ? 'justify-end' : 'justify-start'}`}>
                        {!isAuthor && (
                          <img
                            src={authorImageUrl || 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"></svg>'}
                            alt={message.authorName}
                            className="w-8 h-8 rounded-full object-cover bg-gray-200 mt-1 cursor-pointer hover:scale-110 transition-transform"
                            onClick={() => { setSelectedMemberId(message.authorId); setIsMemberModalOpen(true); }}
                          />
                        )}
                        <div className={`max-w-xs lg:max-w-md p-3 rounded-lg ${isAuthor ? 'bg-indigo-500 text-white' : 'bg-white text-gray-800'} shadow-sm`}>
                          {!isAuthor && <p className="text-xs font-bold text-indigo-600 mb-1">{allUserProfiles.get(message.authorId)?.displayName || '名無しのさん'}</p>}
                          <p className="text-sm">{message.text}</p>
                          <p className={`text-xs mt-1 ${isAuthor ? 'text-indigo-200' : 'text-gray-400'} text-right`}>
                            {new Date(message.timestamp).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>


        {isMemberModalOpen && selectedMemberId && (
          (() => {
            const isLoadingData = memberHabitsMap[selectedMemberId] === undefined || memberSharedMap[selectedMemberId] === undefined;
            return (
              <MemberHabitsModal
                memberId={selectedMemberId}
                memberProfile={(allUserProfiles.get(selectedMemberId) as Profile | Friend) || null}
                memberHabits={memberHabitsMap[selectedMemberId]}
                groupSharedHabitIds={memberSharedMap[selectedMemberId] || groupSharedByMember[selectedMemberId] || groupSharedIds || []}
                currentUserId={profile.id}
                isFollowing={followingIds.has(selectedMemberId)}
                onClose={() => { setIsMemberModalOpen(false); setSelectedMemberId(null); }}
                onFollowUser={(id) => { onFollowUser(id); }}
                onEditMySharedHabits={() => { setIsMemberModalOpen(false); setIsSharedHabitsOpen(true); }}
                isLoading={isLoadingData}
              />
            );
          })()
        )}

        {isSharedHabitsOpen && (
          <SharedHabitsModal
            group={group}
            profile={profile}
            myHabits={habits}
            initialSharedIds={groupSharedByMember[profile.id] || []}
            onClose={() => setIsSharedHabitsOpen(false)}
            onSave={(ids) => {
              onUpdateGroupSharedHabits(group.id, profile.id, ids);
              setIsSharedHabitsOpen(false);
            }}
          />
        )}
        {isInviteModalOpen && (
          <InviteMemberModal
            group={group}
            profile={profile}
            following={following}
            onFollowUser={onFollowUser}
            onClose={() => setIsInviteModalOpen(false)}
            onInvite={(memberIds) => onInviteMembers(group, memberIds)}
          />
        )}
        {memberToRemove && (
          <ConfirmRemoveModal 
            member={memberToRemove}
            groupName={group.name}
            onClose={() => setMemberToRemove(null)}
            onConfirm={confirmRemoveMember}
          />
        )}
        {isProgressOpen && <GroupProgressModalInline onClose={closeProgress} />}
      </div>
      {/* input fixed to bottom of component */}
      <div className="fixed bottom-18 w-full bg-white p-3 left-0 right-0">
        <div className="max-w-full mx-auto flex items-center gap-2">
          <input
            type="text"
            value={newComment}
            onChange={e => setNewComment(e.target.value)}
            placeholder="コメントを入力..."
            onKeyPress={e => e.key === 'Enter' && handlePostComment()}
            className="flex-grow p-3 border border-gray-300 rounded-full focus:ring-2 focus:ring-indigo-500 bg-white text-gray-900"
          />
          <button onClick={handlePostComment} className="p-3 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 transition">
            <SendIcon className="w-5 h-5"/>
          </button>
        </div>
      </div>
    </>
  );
};

export default GroupDetail;