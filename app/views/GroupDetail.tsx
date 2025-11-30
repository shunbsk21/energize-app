"use client";

import Image from 'next/image';
import React, { useState, useMemo, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { collection, query, onSnapshot, orderBy, doc as firestoreDoc, getDoc, getDocs, where, limit, startAfter, DocumentSnapshot, Unsubscribe } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Profile, Friend, Group as GroupType, Comment, Habit, GroupDetailProps } from '../types';
import { calculateCompletionPercentForDate } from '../utils/habits';
import { ChevronLeftIcon, SendIcon, } from '../components/Icons';
import { ConfirmRemoveModal } from '../components/ConfirmRemoveModal';
import { MemberHabitsModal } from '../components/MemberHabitsModal';
import { SharedHabitsModal } from '../components/SharedHabitsModal';
import { InviteMemberModal } from '../components/InviteMemberModal';

const GroupDetail: React.FC<GroupDetailProps> = ({ group, profile, following, onFollowUser, onAddComment, habits, onBack, onInviteMembers, onRemoveMember, allUserProfiles, onUpdateGroupSharedHabits }) => {

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
  const groupSharedIds: string[] = group.sharedHabitIds ?? [];
  const groupSharedByMember = group.sharedByMember ?? {};
  const [memberSharedMap, setMemberSharedMap] = useState<Record<string, string[]>>({});
  const [memberHabitsMap, setMemberHabitsMap] = useState<Record<string, Habit[]>>({});
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);
  const PAGE_SIZE = 30;
  const [lastVisibleDoc, setLastVisibleDoc] = useState<DocumentSnapshot | null>(null);
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

          const habits = habitsSnap ? habitsSnap.docs.map(d => ({ id: d.id, ...d.data() })) as Habit[] : memberHabitsMap[memberId] ?? [];
          const sharedIds = sharedSnap?.exists() ? (sharedSnap.data()?.sharedByMember?.[memberId] as string[] | undefined) ?? [] : memberSharedMap[memberId] ?? [];

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
          .map((d): Comment => {
            const data = d.data();
            const obj = {
              id: d.id,
              groupId: data.groupId,
              authorId: data.authorId,
              authorName: data.authorName,
              text: data.text,
              timestamp: data.timestamp, 
              authorImageUrl: data.authorImageUrl ?? null
            };
            return obj;
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
                const data = d.data();
                const obj = {
                  id: d.id,
                  groupId: data.groupId,
                  authorId: data.authorId,
                  authorName: data.authorName,
                  text: data.text,
                  timestamp: data.timestamp,
                  authorImageUrl: data.authorImageUrl ?? null
                };
                const newMsg = obj as Comment;
                setMessages(prev => {
                  // avoid duplicates
                  if (prev.find(m => m.id === newMsg.id)) return prev;
                  return [...prev, newMsg];
                });
                // toast for others' messages (preserve original behavior)
                if (!initialLoadRef.current && newMsg.authorId !== profile.id) { 
                  toast(`${newMsg.authorName ?? '名無し'}: ${String(newMsg.text)}`, { duration: 4000 });
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
                const data = d.data();
                const obj = {
                  id: d.id,
                  groupId: data.groupId,
                  authorId: data.authorId,
                  authorName: data.authorName,
                  text: data.text,
                  timestamp: data.timestamp,
                  authorImageUrl: data.authorImageUrl ?? null
                };
                const newMsg = obj as Comment;
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
      const olderMsgs: Comment[] = docs.map(d => {
        const data = d.data();
        const obj = {
          id: d.id,
          groupId: data.groupId,
          authorId: data.authorId,
          authorName: data.authorName,
          text: data.text,
          timestamp: data.timestamp,
          authorImageUrl: data.authorImageUrl ?? null
        };
        return obj;
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
          const data = snap.data(); 
          const sharedForGroup = (data?.sharedByMember?.[selectedMemberId]) || data?.sharedHabitIds || [];
          setMemberSharedMap(prev => ({ ...prev, [selectedMemberId]: Array.isArray(sharedForGroup) ? sharedForGroup : [] }));
          return;
        }
        try {
          const globalGroupRef = firestoreDoc(db, 'groups', group.id);
          const gSnap = await getDoc(globalGroupRef);
          if (!cancelled && gSnap.exists()) { 
            const gdata = gSnap.data(); 
            const sharedForGroup = (gdata?.sharedByMember && gdata.sharedByMember[selectedMemberId]) || gdata?.sharedHabitIds || [];
            setMemberSharedMap(prev => ({ ...prev, [selectedMemberId]: Array.isArray(sharedForGroup) ? sharedForGroup : [] }));
            return;
          }
        } catch (e) { console.debug('[Group] global groups fetch failed', e); }
        const fallback = group.sharedByMember && group.sharedByMember[selectedMemberId];
        setMemberSharedMap(prev => ({ ...prev, [selectedMemberId]: Array.isArray(fallback) ? fallback : [] }));
      } catch (err) {
        console.error('failed to load member shared habits', err);
        setMemberSharedMap(prev => ({ ...prev, [selectedMemberId]: [] }));
      }
    })();
    return () => { cancelled = true; };
  }, [selectedMemberId, group]); // 以前の修正で対応済み

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
        const loaded: Habit[] = snap.docs.map(d => ({ id: d.id, ...d.data() })) as Habit[];
        setMemberHabitsMap(prev => ({ ...prev, [selectedMemberId]: loaded }));
      } catch (err) {
        console.error('[Group] failed to load member habits', selectedMemberId, err);
        setMemberHabitsMap(prev => ({ ...prev, [selectedMemberId]: [] }));
      }
    })();
    return () => { cancelled = true; };
  }, [selectedMemberId, memberHabitsMap]);

  const getMemberProfile = (memberId: string) => {
    return allUserProfiles.get(memberId) ?? { id: memberId, displayName: `ユーザー ${memberId.substring(0,4)}`, imageUrl: null };
  };

  const getMemberProgress = (memberId: string): number | null => {
    const today = new Date();
    if (memberId === profile.id) {
      // 自分の習慣リスト（props habits）
      return calculateCompletionPercentForDate(today, habits);
    }
    const sharedForMember: string[] = groupSharedByMember[memberId] ?? memberSharedMap[memberId] ?? [];
    if (!sharedForMember || sharedForMember.length === 0) return null;

    // memberHabitsMap cache または allUserProfiles fallback
    let memberHabits = memberHabitsMap[memberId];
    if (!memberHabits) {
      const memberProfile = allUserProfiles.get(memberId); 
      memberHabits = memberProfile?.habits || [];
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
                      <Image 
                        src={member.imageUrl ?? 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40"></svg>'} 
                        alt={member.displayName ?? ''} 
                        width={40}
                        height={40}
                        className="w-10 h-10 rounded-full object-cover bg-gray-200" 
                      />
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
      authorName: profile.displayName ?? '名無しさん',
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
                    const authorImageUrl = message.authorImageUrl; 
                    return (
                      <div key={message.id} className={`flex gap-2 ${isAuthor ? 'justify-end' : 'justify-start'}`}>
                        {!isAuthor && allUserProfiles.has(message.authorId) && (
                            <Image
                                src={allUserProfiles.get(message.authorId)?.imageUrl ?? 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"></svg>'}
                                alt={message.authorName}
                                width={32}
                                height={32}
                                className="w-8 h-8 rounded-full object-cover bg-gray-200 mt-1 cursor-pointer hover:scale-110 transition-transform"
                                onClick={() => { setSelectedMemberId(message.authorId); setIsMemberModalOpen(true); }}
                            />
                        )}
                        <div className={`max-w-xs lg:max-w-md p-3 rounded-lg ${isAuthor ? 'bg-indigo-500 text-white' : 'bg-white text-gray-800'} shadow-sm`}> 
                          {!isAuthor && <p className="text-xs font-bold text-indigo-600 mb-1">{allUserProfiles.get(message.authorId)?.displayName ?? '名無しのさん'}</p>}
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
            initialSharedIds={groupSharedByMember[profile.id] ?? []}
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