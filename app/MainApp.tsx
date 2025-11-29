"use client";

import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { ADMIN_ID } from './config';

// ★ Firestore関連のモジュールをインポート
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  addDoc,
  deleteDoc,
  updateDoc,
  onSnapshot,
  query,
  orderBy,
} from 'firebase/firestore';

// ★ db (データベース本体) をインポート
import { db, auth } from '@/lib/firebase';
import { signOut } from 'firebase/auth';

// (↓ 既存のコンポーネントインポート)
import EnergyDiagnosis from './components/EnergyDiagnosis';
import HabitTracker from './components/HabitTracker';
import Analytics from './components/Analytics';
import Group from './components/Group';
import Records from './components/Records';
import ProfileModal from './components/Profile';
import Tasks from './components/Tasks';
import Notes from './components/Notes';
import Learnings from './components/Learnings';
// ★ types.ts のパスを修正 (app/ 直下にあるため)
import { EnergyRecord, Habit, View, EnergyScores, Profile, DiagnosisFrequency, Friend, Group as GroupType, Comment, Notification, Task, Checkin, Checkout, LearningItem } from './types'; 
import PersonalityDiagnosis from './components/PersonalityDiagnosis';
import PurelifeDiagnosis from './components/PurelifeDiagnosis';
import ValueDiagnosis from './components/ValueDiagnosis';


// --- Icon Components Start (コード変更なし) ---

const DiagnosisIcon: React.FC<{className?: string}> = ({className}) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
  </svg>
);

const HabitIcon: React.FC<{className?: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
    </svg>
);

const AnalyticsIcon: React.FC<{className?: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
    </svg>
);

const GroupIcon: React.FC<{className?: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
);

const ListBulletIcon: React.FC<{className?: string}> = ({className}) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M7 8h10M7 12h10M7 16h10M4 8h.01M4 12h.01M4 16h.01" />
  </svg>
);

const UserIcon: React.FC<{className?: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
);

const TaskIcon: React.FC<{className?: string}> = ({className}) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round"/>
    <rect x="3" y="4" width="18" height="16" rx="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
const NoteIcon: React.FC<{className?: string}> = ({className}) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M7 7h10M7 11h10" strokeLinecap="round" strokeLinejoin="round"/>
    <rect x="4" y="3" width="16" height="18" rx="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

// --- ScholarIcon (Google Scholar っぽい) ---
const ScholarIcon: React.FC<{className?: string}> = ({className}) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="7" r="3" strokeLinejoin="round" strokeLinecap="round"/>
    <path d="M5 21c2-4 6-6 7-6s5 2 7 6" strokeLinejoin="round" strokeLinecap="round"/>
  </svg>
);

const BellIcon: React.FC<{className?: string}> = ({className}) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 00-5-5.917V5a2 2 0 10-4 0v.083A6 6 0 004 11v3.159c0 .538-.214 1.055-.595 1.436L2 17h5m8 0v1a3 3 0 11-6 0v-1m6 0H9" />
  </svg>
);

// --- Icon Components End ---


// Propsの定義 (変更なし)
interface MainAppProps {
    profile: Profile;
    setProfile: React.Dispatch<React.SetStateAction<Profile | null>>;
}

const MainApp: React.FC<MainAppProps> = ({ profile, setProfile }) => {
  const [view, setView] = useState<View>('habits');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const notificationMenuRef = useRef<HTMLDivElement | null>(null);
  const notificationIdsRef = useRef(new Set<string>());
  
  const [energyHistory, setEnergyHistory] = useState<EnergyRecord[]>([]);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [diagnosisFrequency, setDiagnosisFrequency] = useState<DiagnosisFrequency>({ frequencyType: 'weekly', frequencyValue: [1] });

  // 新規: チェックイン / チェックアウトの state
  const [checkins, setCheckins] = useState<Checkin[]>([]);
  const [checkouts, setCheckouts] = useState<Checkout[]>([]);
  
  const [following, setFollowing] = useState<Friend[]>([]);
  const [followers, setFollowers] = useState<Friend[]>([]);
  
  const [groups, setGroups] = useState<GroupType[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  
  // ★ コメントの state を削除
  // const [comments, setComments] = useState<Comment[]>([]);
  
  const [groupInvites, setGroupInvites] = useState<GroupType[]>([]);

  const [allUserProfiles, setAllUserProfiles] = useState<Map<string, Profile | Friend>>(new Map());

  const [isLoading, setIsLoading] = useState(true);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const [notifications, setNotifications] = useState<Notification[]>([]);

  // ★ 通知から遷移するための選択されたグループID
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);

  // --- Purelife 設定を保持して HabitTracker に渡す ---
  const [purelifeFrequency, setPurelifeFrequency] = useState<DiagnosisFrequency | null>(null);
  const [purelifeCompletedDates, setPurelifeCompletedDates] = useState<string[]>([]);
  const [localPurelifeCompletedDates, setLocalPurelifeCompletedDates] = useState<string[]>(purelifeCompletedDates ?? []);

  // ★ Value Diagnosis の設定と完了履歴
  const [valueDiagnosisFrequency, setValueDiagnosisFrequency] = useState<DiagnosisFrequency | null>(null);
  const [valueDiagnosisCompletedDates, setValueDiagnosisCompletedDates] = useState<string[]>([]);


  // sync incoming prop -> local state
  useEffect(() => {
    setLocalPurelifeCompletedDates(purelifeCompletedDates ?? []);
  }, [purelifeCompletedDates]);
 
  // listen for purelife completion events dispatched by PurelifeDiagnosis and update local list
  useEffect(() => {
    const handler = (ev: Event) => {
      try {
        const ce = ev as CustomEvent;
        const date: string | undefined = ce?.detail?.date;
        if (!date) return;
        setLocalPurelifeCompletedDates(prev => prev.includes(date) ? prev : [date, ...prev]);
      } catch {}
    };
    window.addEventListener('purelife-diagnosis-saved', handler as EventListener);
    return () => window.removeEventListener('purelife-diagnosis-saved', handler as EventListener);
  }, []);

  // add learnings state
  const [learnings, setLearnings] = useState<LearningItem[]>([]);

  // Admin判定
  const isAdmin = Boolean(profile && profile.id === ADMIN_ID);

  // メニュー外クリック / ESC で閉じる（モバイル左側オーバーレイ対応）
  useEffect(() => {
    const onDocDown = (e: MouseEvent) => {
      if (!isMenuOpen) return;
      const el = menuRef.current;
      if (!el) return;
      // クリック先がメニュー内でなければ閉じる
      if (!(e.target instanceof Node) || !el.contains(e.target)) {
        setIsMenuOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsMenuOpen(false);
    };
    document.addEventListener('mousedown', onDocDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [isMenuOpen]);

  // 既存の学習コンテンツを読み込む（簡易）
  useEffect(() => {
    const load = async () => {
      try {
        const snap = await getDocs(collection(db, 'learnings'));
        const items: LearningItem[] = snap.docs.map(d => ({ id: d.id, ...(d.data() as Omit<LearningItem, 'id'>) }));
        // createdAt/updatedAt を ISO 文字列に統一（Firestore タイムスタンプか文字列に対応）
        const normalized = items.map(i => ({
          ...i,
          createdAt: i.createdAt ? String(i.createdAt) : undefined,
          updatedAt: i.updatedAt ? String(i.updatedAt) : undefined,
        }));
        setLearnings(normalized);
      } catch (err) {
        console.error('load learnings failed', err);
      }
    };
    load();
  }, []);

  // 管理者のみ学習コンテンツを追加（UID 判定）
  const handleCreateLearning = async (payload: { title: string; url?: string; notes?: string; tags?: string[] }) => {
    if (profile?.id !== ADMIN_ID) {
      console.warn('only admin can add learning content');
      return;
    }
    try {
      const now = new Date().toISOString();
      const ref = collection(db, 'learnings');
      const docRef = await addDoc(ref, {
        title: payload.title,
        url: payload.url ?? null,
        notes: payload.notes ?? null,
        tags: payload.tags ?? [],
        createdAt: now,
        updatedAt: now,
        createdBy: profile.id ?? null,
      });
      setLearnings(prev => [{ id: docRef.id, title: payload.title, url: payload.url, notes: payload.notes, tags: payload.tags, createdAt: now, updatedAt: now, createdBy: profile.id }, ...prev]);
    } catch (err) {
      console.error('学習コンテンツの追加に失敗しました', err);
    }
  };

  // ログアウト処理 (変更なし)
  const handleLogout = async () => {
    try {
      await signOut(auth);
      setProfile(null);
      console.log("ログアウトしました");
    } catch (error) {
      console.error("ログアウトに失敗しました", error);
    }
  };

  // ★ ユーザーのプロフィール情報を取得するヘルパー関数
  const fetchUserProfiles = useCallback(async (userIds: string[]): Promise<Map<string, Profile | Friend>> => {
      const userMap = new Map<string, Profile | Friend>();
      userMap.set(profile.id, profile);

      const uniqueIdsToFetch = new Set(userIds.filter(id => id !== profile.id));

      for (const id of uniqueIdsToFetch) {
          try {
              const settingsRef = doc(db, 'users', id, 'settings', 'main');
              const docSnap = await getDoc(settingsRef);
              if (docSnap.exists() && docSnap.data().profile) {
                  const userProfile = docSnap.data().profile;
                  userMap.set(id, {
                      id: id,
                      displayName: userProfile.displayName ?? `ユーザー ${id.substring(0, 4)}`,
                      imageUrl: userProfile.imageUrl || null
                  });
              } else {
                  userMap.set(id, { id: id, displayName: `ユーザー ${id.substring(0, 4)}`, imageUrl: null });
              }
          } catch (error) {
              console.error(`ユーザー(id: ${id}) のプロフィール取得に失敗:`, error);
              userMap.set(id, { id: id, displayName: `ユーザー ${id.substring(0, 4)}`, imageUrl: null });
          }
      }
      return userMap;
  }, [profile]); // ★ profile が更新されたら、この関数も更新される

  // ★★★ データの「読み込み」処理 (Firestore) (★コメント読み込みを削除★) ★★★
  useEffect(() => {
    if (!profile.id) {
      setIsLoading(false);
      return;
    }
    
    const loadData = async () => {
      try {
        const baseRef = doc(db, 'users', profile.id);
        const habitsRef = collection(baseRef, 'habits');
        const historyRef = collection(baseRef, 'energyHistory');
        const checkinsRef = collection(baseRef, 'checkins');
        const checkoutsRef = collection(baseRef, 'checkouts');
        const settingsRef = doc(baseRef, 'settings', 'main');
        
        const followingRef = collection(baseRef, 'following');
        const followersRef = collection(baseRef, 'followers');
        const groupsRef = collection(baseRef, 'groups');
        const groupInvitesRef = collection(baseRef, 'group_invites');

        const [
            settingsSnap, habitsSnap, historySnap,
            followingSnap, followersSnap, groupsSnap, groupInvitesSnap,
            checkinsSnap, checkoutsSnap
        ] = await Promise.all([
            getDoc(settingsRef),
            getDocs(habitsRef),
            getDocs(historyRef),
            getDocs(followingRef),
            getDocs(followersRef),
            getDocs(groupsRef),
            getDocs(groupInvitesRef),
            getDocs(checkinsRef),
            getDocs(checkoutsRef)
        ]);

        // --- 読み込んだデータを state にセット ---
        
        const loadedHabits = habitsSnap.docs.map(d => ({ ...d.data() as Omit<Habit, 'id'>, id: d.id }));
        setHabits(loadedHabits);

        const loadedHistory = historySnap.docs.map(d => d.data() as EnergyRecord);
        setEnergyHistory(loadedHistory);

        // checkins / checkouts を state に入れる
        const loadedCheckins = checkinsSnap.docs.map(d => ({ id: d.id, ...(d.data() as Omit<Checkin, 'id'>) }));
        const loadedCheckouts = checkoutsSnap.docs.map(d => ({ id: d.id, ...(d.data() as Omit<Checkout, 'id'>) }));
        setCheckins(loadedCheckins.sort((a,b) => (a.createdAt || a.date) < (b.createdAt || b.date) ? 1 : -1));
        setCheckouts(loadedCheckouts.sort((a,b) => (a.createdAt || a.date) < (b.createdAt || b.date) ? 1 : -1));
        
        const loadedFollowing = followingSnap.docs.map(d => ({ ...d.data() as Omit<Friend, 'id'>, id: d.id }));
        const loadedFollowers = followersSnap.docs.map(d => ({ ...d.data() as Omit<Friend, 'id'>, id: d.id }));
        
        const loadedGroups = groupsSnap.docs.map(d => ({ ...d.data() as Omit<GroupType, 'id'>, id: d.id }));
        const loadedGroupInvites = groupInvitesSnap.docs.map(d => ({ ...d.data() as Omit<GroupType, 'id'>, id: d.id }));
        setGroupInvites(loadedGroupInvites);

        // 設定 (診断頻度 + プロフィール)
        if (settingsSnap.exists()) {
          const settingsData = settingsSnap.data();
          if (settingsData.diagnosisFrequency) {
            setDiagnosisFrequency(settingsData.diagnosisFrequency);
          }
          if (settingsData.profile) {
            const savedProfile = settingsData.profile;
            if (savedProfile.displayName !== profile.displayName || savedProfile.imageUrl !== profile.imageUrl) {
              setProfile((prevProfile: Profile | null) => ({
                  ...prevProfile!,
                  displayName: savedProfile.displayName || prevProfile!.displayName,
                  imageUrl: savedProfile.imageUrl,
              }));
            }
          }
          // purelife の頻度 / 完了日を読み込む（存在するキーに対応）
          if (settingsData.purelifeFrequency) {
            setPurelifeFrequency(settingsData.purelifeFrequency);
          } else if (settingsData.frequency && settingsData.frequencyType) {
            // 互換性のためフォールバック（まれ）
            setPurelifeFrequency(settingsData.frequency);
          }
          const completed = settingsData.purelifeCompletedDates ?? settingsData.purelife_completed_dates ?? settingsData.purelifeCompleted ?? [];
          if (Array.isArray(completed)) setPurelifeCompletedDates(completed);

          // ★ Value Diagnosis の頻度設定を読み込む
          if (settingsData.valueDiagnosisFrequency) {
            setValueDiagnosisFrequency(settingsData.valueDiagnosisFrequency);
          }
        }
        // ★ Value Diagnosis の完了履歴を読み込む
        const valueHistorySnap = await getDocs(collection(baseRef, 'valueHistory'));
        if (!valueHistorySnap.empty) {
          setValueDiagnosisCompletedDates(valueHistorySnap.docs.map(d => d.data().date as string));
        }

        // --- 4. 全員のプロフィール情報を取得 ---
        const followingIds = loadedFollowing.map(f => f.id);
        const followersIds = loadedFollowers.map(f => f.id);
        const memberIds = loadedGroups.flatMap(g => g.members);
        const inviteMemberIds = loadedGroupInvites.flatMap(g => g.members);
        
        const allUserIds = Array.from(new Set([...followingIds, ...followersIds, ...memberIds, ...inviteMemberIds]));
        
        const userProfilesMap = await fetchUserProfiles(allUserIds);
        setAllUserProfiles(userProfilesMap);

        // 5. 読み込んだ following / followers リストを、最新のプロフィールで更新する
        const updatedFollowing = loadedFollowing.map(oldFriend => {
            return userProfilesMap.get(oldFriend.id) || oldFriend;
        });
        const updatedFollowers = loadedFollowers.map(oldFollower => {
            return userProfilesMap.get(oldFollower.id) || oldFollower;
        });
        
        setFollowing(updatedFollowing);
        setFollowers(updatedFollowers);
        setGroups(loadedGroups);

        // --- tasks の読み込み (users/{uid}/tasks) ---
        try {
          const tasksRef = collection(baseRef, 'tasks');
          const tasksSnap = await getDocs(tasksRef);
          const loadedTasks = tasksSnap.docs.map(d => ({ id: d.id, ...(d.data() as Omit<Task, 'id'>) }));
          setTasks(loadedTasks);
        } catch (err) {
          console.warn('tasks読み込みエラー', err);
        }

      } catch (error) {
        console.error("データの読み込みに失敗しました:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
    
  }, [profile.id, setProfile, profile, fetchUserProfiles]);

  // ★★★ 通知リスナーの設置 ★★★
  useEffect(() => {
    if (!profile.id) return;

    // 1. 自分の通知コレクションをリッスンし、UIに反映する
    const notificationsRef = collection(db, 'users', profile.id, 'notifications');
    const q = query(notificationsRef, orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const loadedNotifications: Notification[] = snapshot.docs.map(d => ({
        id: d.id,
        ...(d.data() as Omit<Notification, 'id'>)
      }));
      setNotifications(loadedNotifications);
    });

    // 2. 各グループのチャットをリッスンして、新しいメッセージがあれば通知を作成・保存する
    const chatUnsubscribers = groups.map(group => {
      if (!group.id) return () => {}; // group.id がなければ何もしない
      const messagesRef = collection(db, 'group_chats', group.id, 'messages');
      return onSnapshot(messagesRef, (snapshot) => {
        snapshot.docChanges().forEach(async (change) => {
          if (change.type !== "added") return;

          const messageData = change.doc.data();
          const messageId = change.doc.id;

          // 自分以外のメッセージの場合、通知を作成
          if (messageData.authorId !== profile.id) {
            const notificationRef = doc(db, 'users', profile.id, 'notifications', messageId);
            // 既に同じ通知が存在しないか確認してから作成
            const notificationSnap = await getDoc(notificationRef);
            if (!notificationSnap.exists()) {
            // sanitize: do not send undefined fields to Firestore
              const toSave: Partial<Notification> = {
                groupId: group.id,
                groupName: group.name,
                message: messageData.text,
                authorName: messageData.authorName || '名無しさん',
                // fallback to ISO string when createdAt is missing
                createdAt: messageData.createdAt ?? new Date().toISOString(),
                isRead: false,
              };
              const safe = Object.fromEntries(Object.entries(toSave).filter(([_, v]) => v !== undefined));
              await setDoc(notificationRef, safe);
            }
          }
        });
      });
    });

    // クリーンアップ関数
    return () => {
      unsubscribe();
      chatUnsubscribers.forEach(unsub => unsub());
    };
  }, [groups, profile.id]);

  // 通知画面を開いたら既読にする
  useEffect(() => {
    if (view === 'notifications' && profile.id) {
      // 画面を開いたら未読通知を全て isRead=true に更新する
      const markRead = async () => {
        try {
          const unread = notifications.filter(n => !n.isRead);
          if (unread.length === 0) return;
          const promises = unread.map(n => {
            // 型安全に string を渡す（存在確認）
            if (!n.id || !profile.id) return Promise.resolve();
            const ref = doc(db, 'users', profile.id, 'notifications', n.id);
            return updateDoc(ref, { isRead: true }).catch(err => {
              // updateDoc fail (doc missing) -> fallback setDoc merge
              return setDoc(ref, { isRead: true }, { merge: true });
            });
          });
          await Promise.all(promises);
        } catch (e) {
          console.error('failed to mark notifications read', e);
        }
      };
      // 少し遅延して UI を優先
      setTimeout(markRead, 150);
    }
  }, [view, notifications, profile.id]);

  // --- helper: VAPID 公開鍵を env か runtime で渡す ---
  // 環境に応じて置き換えてください（例: NEXT_PUBLIC_VAPID_KEYを設定）
  const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '<PUT_PUBLIC_KEY_HERE>';

  function urlBase64ToUint8Array(base64String: string) {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
    const rawData = atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  // --- inside MainApp component (ユーザー profile が利用できる箇所に追加) ---
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    navigator.serviceWorker.register('/sw.js')
      .then(reg => console.log('SW registered', reg.scope))
      .catch(err => console.error('SW registration failed', err));
  }, []);

  // ★★★ データの「書き込み」処理 (Firestore) ★★★

  // (1) 診断履歴 (変更なし)
  const handleDiagnosisComplete = async (scores: EnergyScores) => {
    if (!profile.id) return;
    const today = new Date().toLocaleDateString('sv-SE');
    const newRecord: EnergyRecord = { date: today, ...scores };
    try {
      const historyRef = doc(db, 'users', profile.id, 'energyHistory', today);
      await setDoc(historyRef, newRecord);
      setEnergyHistory(prev => {
          const otherDays = prev.filter(r => r.date !== today);
          return [...otherDays, newRecord].sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      });
      setView('diagnosis');
    } catch (error) {
      console.error("診断履歴の保存に失敗しました:", error);
    }
  };

  // (2) 習慣(Habit) (変更なし)
  const handleAddHabit = useCallback(async (newHabitData: Omit<Habit, 'id'>) => {
    if (!profile.id) return;
    try {
      const habitsRef = collection(db, 'users', profile.id, 'habits');
      // sanitize: remove undefined fields because Firestore rejects undefined
      const toSave = Object.fromEntries(Object.entries(newHabitData).filter(([, v]) => v !== undefined));
      const docRef = await addDoc(habitsRef, toSave);
      const createdHabit: Habit = { ...(toSave as Omit<Habit, 'id'>), id: docRef.id };
      setHabits(prevHabits => [...prevHabits, createdHabit]);
    } catch (error) {
      console.error("習慣の追加に失敗しました:", error);
    }
  }, [profile.id]);
  
  const handleUpdateHabit = async (updatedHabit: Habit) => {
    if (!profile.id || !updatedHabit.id) return;
    try {
      const habitRef = doc(db, 'users', profile.id, 'habits', updatedHabit.id);
      const { id, ...dataToSave } = updatedHabit;
      await setDoc(habitRef, dataToSave); 
      setHabits(prevHabits => 
        prevHabits.map(h => h.id === updatedHabit.id ? updatedHabit : h)
      );
    } catch (error) {
      console.error("習慣の更新に失敗しました:", error);
    }
  };
  const handleDeleteHabit = async (habitId: string) => {
    if (!profile.id) return;
    try {
      const habitRef = doc(db, 'users', profile.id, 'habits', habitId);
      await deleteDoc(habitRef);
      setHabits(prevHabits => prevHabits.filter(h => h.id !== habitId));
    } catch (error) {
      console.error("習慣の削除に失敗しました:", error);
    }
  };

  // 追加: グローバル habit-created イベントを拾って handleAddHabit を呼ぶ
  useEffect(() => {
    const handler = async (ev: Event) => {
      try {
        const ce = ev as CustomEvent;
        const payload = ce?.detail;
        if (!payload) return;
        await handleAddHabit(payload);
      } catch (err) {
        console.error('global habit-created handler error', err);
      }
    };
    window.addEventListener('habit-created', handler as EventListener);
    return () => window.removeEventListener('habit-created', handler as EventListener);
  }, [handleAddHabit]);
  
  // (3) グループ・友達関連 (★ handleAddComment を修正 ★)
  
  const handleFollowUser = async (friendId: string) => {
    if (!profile.id || friendId === profile.id || following.some(f => f.id === friendId)) {
        console.warn("すでにフォロー済みか、自分自身です:", friendId);
        return;
    }
    try {
      let friendData: Omit<Friend, 'id'>;
      const friendProfile = (await fetchUserProfiles([friendId])).get(friendId);
      if(friendProfile) {
        friendData = {
          displayName: friendProfile.displayName,
          imageUrl: friendProfile.imageUrl
        };
      } else {
         friendData = {
            displayName: `ユーザー ${friendId.substring(0, 4)}`,
            imageUrl: null
         };
      }
      const followingRef = doc(db, 'users', profile.id, 'following', friendId);
      await setDoc(followingRef, friendData);
      const newFriend: Friend = { ...friendData, id: friendId };
      setFollowing(prevFollowing => [...prevFollowing, newFriend]);
      setAllUserProfiles(prevMap => new Map(prevMap).set(newFriend.id, newFriend));
      const myProfileDataForFollower: Omit<Friend, 'id'> = {
          displayName: profile.displayName,
          imageUrl: profile.imageUrl
      };
      const myRefOnFollowerList = doc(db, 'users', friendId, 'followers', profile.id);
      await setDoc(myRefOnFollowerList, myProfileDataForFollower);
    } catch (error) {
      console.error("フォローに失敗しました:", error);
    }
  };

  const handleCreateGroup = async (newGroupData: Omit<GroupType, 'id'>) => {
    if (!profile.id) return;
    try {
      const newGroupRef = doc(collection(db, 'users', profile.id, 'groups'));
      const newGroupId = newGroupRef.id;
      const groupDocWithId: GroupType = { 
          ...newGroupData,
          id: newGroupId,
          ownerId: profile.id // ★ オーナーIDを追加
      };
      const { id, ...dataToSave } = groupDocWithId; 

      for (const memberId of newGroupData.members) {
        if (memberId === profile.id) {
          const groupRefForMe = doc(db, 'users', profile.id, 'groups', newGroupId);
          await setDoc(groupRefForMe, dataToSave);
        } else {
          const inviteRef = doc(db, 'users', memberId, 'group_invites', newGroupId);
          await setDoc(inviteRef, dataToSave);
        }
      }
      setGroups(prevGroups => [...prevGroups, groupDocWithId]);
      const newMemberIds = newGroupData.members.filter(id => !allUserProfiles.has(id));
      if (newMemberIds.length > 0) {
          const newProfilesMap = await fetchUserProfiles(newMemberIds);
          setAllUserProfiles(prevMap => new Map([...prevMap, ...newProfilesMap]));
      }
    } catch (error) {
      console.error("グループの作成/招待に失敗しました:", error);
    }
  };
  
  const handleInviteToGroup = async (group: GroupType, memberIdsToInvite: string[]) => {
    if (!profile.id || !group.id || memberIdsToInvite.length === 0) return;
    const updatedMembers = [...new Set([...group.members, ...memberIdsToInvite])];
    const updatedGroupData: GroupType = { ...group, members: updatedMembers };
    const { id, ...dataToSave } = updatedGroupData;
    try {
      for (const newMemberId of memberIdsToInvite) {
        if (newMemberId === profile.id || group.members.includes(newMemberId)) continue;
        const inviteRef = doc(db, 'users', newMemberId, 'group_invites', group.id);
        await setDoc(inviteRef, dataToSave);
      }
      for (const existingMemberId of group.members) {
        const groupRef = doc(db, 'users', existingMemberId, 'groups', group.id);
        await setDoc(groupRef, dataToSave);
      }
      setGroups(prevGroups => prevGroups.map(g => g.id === group.id ? updatedGroupData : g));
      const newMemberIdsToFetch = memberIdsToInvite.filter(id => !allUserProfiles.has(id));
      if (newMemberIdsToFetch.length > 0) {
          const newProfilesMap = await fetchUserProfiles(newMemberIdsToFetch);
          setAllUserProfiles(prevMap => new Map([...prevMap, ...newProfilesMap]));
      }
    } catch (error) {
      console.error("グループへの招待に失敗しました:", error);
    }
  };

  const handleRemoveMember = async (groupId: string, memberIdToRemove: string) => {
      if (!profile.id || !groupId || !memberIdToRemove) return;
      const groupToUpdate = groups.find(g => g.id === groupId);
      if (!groupToUpdate) {
          console.error("対象のグループが見つかりません。");
          return;
      }
      if (groupToUpdate.ownerId !== profile.id) {
          console.error("オーナー以外はメンバーを削除できません。");
          return;
      }
      if (groupToUpdate.ownerId === memberIdToRemove) {
          console.error("オーナー自身を削除することはできません。");
          return;
      }
      try {
          const updatedMembers = groupToUpdate.members.filter(id => id !== memberIdToRemove);
          const updatedGroupData: GroupType = { ...groupToUpdate, members: updatedMembers };
          const { id, ...dataToSave } = updatedGroupData;
          const memberGroupRef = doc(db, 'users', memberIdToRemove, 'groups', groupId);
          await deleteDoc(memberGroupRef);
          for (const memberId of updatedMembers) {
              const groupRef = doc(db, 'users', memberId, 'groups', groupId);
              await setDoc(groupRef, dataToSave);
          }
          setGroups(prevGroups => prevGroups.map(g => g.id === groupId ? updatedGroupData : g));
      } catch (error) {
          console.error("メンバーの削除に失敗しました:", error);
      }
  };
  
  const handleAcceptGroupInvite = async (invite: GroupType) => {
    if (!profile.id || !invite.id) return;
    try {
      const groupRef = doc(db, 'users', profile.id, 'groups', invite.id);
      const { id, ...dataToSave } = invite;
      await setDoc(groupRef, dataToSave);
      const inviteRef = doc(db, 'users', profile.id, 'group_invites', invite.id);
      await deleteDoc(inviteRef);
      setGroups(prev => [...prev, invite]);
      setGroupInvites(prev => prev.filter(g => g.id !== invite.id));
    } catch (error) {
      console.error("グループ招待の承認に失敗しました:", error);
    }
  };
  
  const handleDeclineGroupInvite = async (inviteId: string) => {
    if (!profile.id) return;
    try {
      const inviteRef = doc(db, 'users', profile.id, 'group_invites', inviteId);
      await deleteDoc(inviteRef);
      setGroupInvites(prev => prev.filter(g => g.id !== inviteId));
    } catch (error) {
      console.error("グループ招待の拒否に失敗しました:", error);
    }
  };

  // ★★★ handleAddComment を修正 (問題の核心) ★★★
  const handleAddComment = async (newCommentData: Omit<Comment, 'id'>) => {
    if (!profile.id) return;
    try {
      // 1. ★ 保存先を `group_chats/{groupId}/messages` に変更
      const commentsRef = collection(db, 'group_chats', newCommentData.groupId, 'messages');
      
      // 2. ★ 保存するデータに、送信者の最新プロフィール情報を追加
      const dataToSave = {
          ...newCommentData,
          authorId: profile.id,
          authorName: profile.displayName,
          authorImageUrl: profile.imageUrl || null
      };
      
      // 3. ★ 共有チャットルームに書き込む
      await addDoc(commentsRef, dataToSave);
      
      // 4. ローカルの setComments() は削除 (Group.tsx がリアルタイムで受信)
    } catch (error) {
      console.error("コメントの追加に失敗しました:", error);
    }
  };
  
  // (4) 診断頻度の書き込み (変更なし)
  const handleDiagnosisFrequencyChange = async (newFrequency: DiagnosisFrequency) => {
    if (!profile.id) return;
    setDiagnosisFrequency(newFrequency);
    try {
      const settingsRef = doc(db, 'users', profile.id, 'settings', 'main');
      await setDoc(settingsRef, { diagnosisFrequency: newFrequency }, { merge: true });
    } catch (error) {
      console.error("設定の保存に失敗しました:", error);
    }
  };

  // ★ (5) プロフィール保存ハンドラ (変更なし)
  const handleProfileSave = async (newDisplayName: string, newImageUrl: string | null) => {
    if (!profile) return;
    const updatedProfile: Profile = {
      ...profile,
      displayName: newDisplayName,
      imageUrl: newImageUrl,
    };
    setProfile(updatedProfile); // page.tsx の state を更新
    setAllUserProfiles(prevMap => new Map(prevMap).set(profile.id, updatedProfile)); // ★ 自分の情報もMAPで更新
    try {
      const settingsRef = doc(db, 'users', profile.id, 'settings', 'main');
      await setDoc(settingsRef, { 
        profile: {
          displayName: newDisplayName,
          imageUrl: newImageUrl
        }
      }, { merge: true });
    } catch (error) {
      console.error("プロフィール情報の保存に失敗しました:", error);
    }
  };

  // 共有習慣の更新（自分のユーザー配下の group ドキュメントだけを更新し、local state を更新）
  const handleUpdateGroupSharedHabits = async (groupId: string, memberId: string, sharedIds: string[]) => {
    if (!profile.id || !groupId || !memberId) return;
    try {
      const groupRef = doc(db, 'users', profile.id, 'groups', groupId);
      // フィールドパスを使って自分のドキュメント内に保存
      await updateDoc(groupRef, { [`sharedByMember.${memberId}`]: sharedIds });
      // local state を更新（UI に即時反映）
      setGroups(prev => prev.map(g => g.id === groupId ? { 
        ...g, 
        sharedByMember: { ...g.sharedByMember, [memberId]: sharedIds } 
      } : g));
      console.log('shared habits updated (local user copy)');
    } catch (err) {
      // updateDoc が失敗する（ドキュメントが存在しない等）場合は setDoc(merge) にフォールバック
      try {
        const fallbackRef = doc(db, 'users', profile.id, 'groups', groupId);
        await setDoc(fallbackRef, { sharedByMember: { [memberId]: sharedIds } }, { merge: true });
        setGroups(prev => prev.map(g => g.id === groupId ? { 
          ...g, 
          sharedByMember: { ...g.sharedByMember, [memberId]: sharedIds } 
        } : g));
        console.log('shared habits saved via setDoc merge fallback');
      } catch (err2) {
        console.error('failed to update shared habits', err, err2);
      }
    }
  };

  // --- チェックイン / チェックアウト 書き込みハンドラ ---
  const handleAddCheckin = async (value: number, note?: string, dateStr?: string) => {
    if (!profile.id) return;
    try {
      const ref = collection(db, 'users', profile.id, 'checkins');
      const payload: Omit<Checkin, 'id'> = {
        date: dateStr ?? new Date().toLocaleDateString('sv-SE'),
        value,
        note: note || '',
        createdAt: new Date().toISOString()
      };
      const docRef = await addDoc(ref, payload);
      setCheckins(prev => [{ id: docRef.id, ...payload }, ...prev]);
    } catch (err) {
      console.error('チェックイン保存に失敗しました', err);
    }
  };

  const handleAddCheckout = async (gratitude?: string, note?: string, rating?: number | null, dateStr?: string) => {
    if (!profile.id) return;
    try {
      const ref = collection(db, 'users', profile.id, 'checkouts');
      const payload: Omit<Checkout, 'id'> = {
        date: dateStr ?? new Date().toLocaleDateString('sv-SE'),
        gratitude: gratitude || '',
        note: note || '',
        rating: rating ?? null,
        createdAt: new Date().toISOString()
      };
      const docRef = await addDoc(ref, payload);
      setCheckouts(prev => [{ id: docRef.id, ...payload }, ...prev]);
    } catch (err) {
      console.error('チェックアウト保存に失敗しました', err);
    }
  };

  const handleUpdateCheckin = async (id: string, value: number, note?: string) => {
    if (!profile.id) return;
    try {
      const ref = doc(db, 'users', profile.id, 'checkins', id);
      await updateDoc(ref, { value, note: note || '', updatedAt: new Date().toISOString() });
      setCheckins(prev => prev.map(c => c.id === id ? { ...c, value, note: note || '' } : c));
    } catch (err) {
      console.error('チェックイン更新に失敗しました', err);
    }
  };

  const handleUpdateCheckout = async (id: string, gratitude?: string, note?: string, rating?: number | null) => {
    if (!profile.id) return;
    try {
      const ref = doc(db, 'users', profile.id, 'checkouts', id);
      await updateDoc(ref, { gratitude: gratitude || '', note: note || '', rating: rating ?? null, updatedAt: new Date().toISOString() });
      setCheckouts(prev => prev.map(c => c.id === id ? { ...c, gratitude: gratitude || '', note: note || '', rating: rating ?? null } : c));
    } catch (err) {
      console.error('チェックアウト更新に失敗しました', err);
    }
  };

  // タスク追加ハンドラ（HabitTracker から呼ばれる）
  const handleAddTask = async (payload: { title: string; details?: string; dueDate?: string; priority?: 'low'|'medium'|'high' }) => {
    if (!profile.id) return;
    try {
      const ref = collection(db, 'users', profile.id, 'tasks');
      const docRef = await addDoc(ref, { ...payload, done: false, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
      setTasks(prev => [{ id: docRef.id, ...payload, done: false }, ...prev]);
    } catch (err) {
      console.error('handleAddTask error', err);
    }
  };

  // タスクの完了状態を切り替えるハンドラ（HabitTracker から呼ばれる）
  const handleToggleTask = async (taskId: string, done: boolean) => {
    if (!profile.id || !taskId) return;
    try {
      const taskRef = doc(db, 'users', profile.id, 'tasks', taskId);
      const updatePayload: Partial<Task> = { done, updatedAt: new Date().toISOString() };
      if (done) updatePayload.completedAt = new Date().toISOString();
      else updatePayload.completedAt = null;
      await updateDoc(taskRef, updatePayload);
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, done, updatedAt: updatePayload.updatedAt, completedAt: updatePayload.completedAt } : t));
    } catch (err) {
      console.error('handleToggleTask error', err);
      throw err;
    }
  };

  // タスク更新ハンドラ（タイトル/詳細/期日/優先度/完了の更新）
  const handleUpdateTask = async (taskId: string, payload: { title?: string; details?: string; dueDate?: string; priority?: 'low'|'medium'|'high'; done?: boolean }) => {
    if (!profile.id || !taskId) return;
    try {
      const taskRef = doc(db, 'users', profile.id, 'tasks', taskId);
      // completedAt を追加する可能性があるため any にして型エラーを避ける
      // サーバに送る前に undefined フィールドを除去する
      const base: Partial<Task> = { ...payload, updatedAt: new Date().toISOString() };
      if (payload.done === true) base.completedAt = new Date().toISOString();
      if (payload.done === false) base.completedAt = null;
      const updatePayload = Object.fromEntries(Object.entries(base).filter(([_, v]) => v !== undefined));
      await updateDoc(taskRef, updatePayload);
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, ...updatePayload } as Task : t));
    } catch (err) {
      console.error('handleUpdateTask error', err);
      throw err;
    }
  };

  // タスク削除ハンドラ
  const handleDeleteTask = async (taskId: string) => {
    if (!profile.id || !taskId) return;
    try {
      const taskRef = doc(db, 'users', profile.id, 'tasks', taskId);
      await deleteDoc(taskRef);
      setTasks(prev => prev.filter(t => t.id !== taskId));
    } catch (err) {
      console.error('handleDeleteTask error', err);
      throw err;
    }
  };
  
  // --- ヘルプテキスト (変更なし) ---
  const helpText = useMemo(() => {
    // if (view === 'diagnosis') {
    //   return '現在のあなたのエネルギー状態を4つの側面（身体、精神、感情、知性）から診断し、カレンダーで記録を可視化します。';
    // }
    // if (view === 'habits') {
    //   return '日々の習慣を記録して、エネルギーを高めましょう。新しい習慣は右下の＋ボタンから追加できます。';
    // }
    // if (view === 'analytics') {
    //   return 'ここでは、診断結果の推移や習慣の達成率をグラフで確認できます。自分のエネルギー状態と行動の関連性を分析し、日々の改善に役立てましょう。';
    // }
    // if (view === 'groups') {
    //     return '友達とグループを作成し、日々の習慣の進捗を共有できます。コメント機能で励まし合い、モチベーションを高めましょう。';
    // }
    // if (view === 'records') {
    //     return '日々のチェックイン / チェックアウトの記録を確認できます。自分のエネルギー状態を振り返り、改善点を見つけましょう。';
    // }
    return '';
  }, [view]);

  // ★★★ ビューのレンダリング (★修正あり★) ★★★
  const renderView = () => {
    if (isLoading) {
      return <div className="text-center p-10">データを読み込んでいます...</div>;
    }

    // ★★★ 通知画面のレンダリング ★★★
    if (view === 'notifications') {
      return (
        <div className="bg-white"> {/* メインコンテンツ領域を白背景に */}
          {/* フルスクリーン用のヘッダー */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-white">
            <button onClick={() => setView('habits')} className="p-2 rounded-full hover:bg-gray-100">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h2 className="text-lg font-bold">通知</h2>
            <div className="w-10"></div> {/* 中央揃えのためのスペーサー */}
          </div>

          {/* 通知リスト */}
          <div className="max-h-[calc(100vh-120px)] overflow-y-auto bg-white">
            {notifications.length === 0 ? (
              <p className="text-center text-gray-500 py-12">通知はありません</p>
            ) : (
              notifications.map(n => (
                <div 
                  key={n.id} 
                  onClick={() => {
                    setSelectedGroupId(n.groupId ?? null);
                    setView('groups');
                  }}
                  className="p-4 border-b border-gray-200 hover:bg-gray-50 cursor-pointer bg-white"
                >
                  <p className="font-semibold">{n.groupName}</p>
                  <p className="text-sm text-gray-700 truncate">{n.authorName}: {n.message}</p>
                  {/* TODO: 日付のフォーマット */}
                  {/* <p className="text-xs text-gray-400 mt-1">{new Date(n.createdAt?.toDate()).toLocaleString()}</p> */}
                </div>
              ))
            )}
          </div>
        </div>
      );
    }
  
    switch (view) {
      case 'diagnosis':
        return <EnergyDiagnosis 
                  history={energyHistory} 
                  onComplete={handleDiagnosisComplete} 
                  setIsHelpOpen={setIsHelpOpen} 
                  diagnosisFrequency={diagnosisFrequency} 
                  setDiagnosisFrequency={handleDiagnosisFrequencyChange}
                  habits={habits}
                  handleAddHabit={handleAddHabit}
                />;
      case 'personality':
        return <PersonalityDiagnosis
          setIsHelpOpen={setIsHelpOpen}
          handleAddHabit={handleAddHabit}
        />;
      case 'purelife':
        return <PurelifeDiagnosis
          setIsHelpOpen={setIsHelpOpen}
          handleAddHabit={handleAddHabit}
        />;
      case 'value':
        return <ValueDiagnosis />;
      case 'habits':
        return <HabitTracker 
                  habits={habits} 
                  energyHistory={energyHistory}
                  onAddHabit={handleAddHabit}
                  onUpdateHabit={handleUpdateHabit}
                  onDeleteHabit={handleDeleteHabit}
                  setIsHelpOpen={setIsHelpOpen} 
                  setView={setView} 
                  diagnosisFrequency={diagnosisFrequency}
                  // pass purelife configuration so HabitTracker can show the card on scheduled days
                  purelifeFrequency={purelifeFrequency ?? undefined}
                  localPurelifeCompletedDates={localPurelifeCompletedDates}
                  // ★ Value Diagnosis の設定と完了履歴を渡す
                  valueDiagnosisFrequency={valueDiagnosisFrequency ?? undefined}
                  valueDiagnosisCompletedDates={valueDiagnosisCompletedDates}
                  onOpenValueDiagnosis={() => setView('value')}
                  onOpenPurelife={() => setView('purelife')}
                  onAddCheckin={handleAddCheckin}
                  onAddCheckout={handleAddCheckout}
                  checkins={checkins}
                  checkouts={checkouts}
                  onUpdateCheckin={handleUpdateCheckin}
                  onUpdateCheckout={handleUpdateCheckout}
                  tasks={tasks}
                  onAddTask={handleAddTask}
                  onToggleTask={handleToggleTask}
                  onUpdateTask={handleUpdateTask}
                  onDeleteTask={handleDeleteTask}
                  onAddLearning={handleCreateLearning}
                  isAdmin={isAdmin}
                />;
      case 'analytics':
        return <Analytics 
                  energyHistory={energyHistory} 
                  habits={habits} 
                  setIsHelpOpen={setIsHelpOpen}
                  checkins={checkins}
                  checkouts={checkouts}
                />;
       case 'groups':
        return <Group 
                  profile={profile} 
                  following={following}
                  followers={followers}
                  onFollowUser={handleFollowUser}
                  groups={groups} 
                  groupInvites={groupInvites}
                  onAddGroup={handleCreateGroup}
                  onInviteToGroup={handleInviteToGroup}
                  onAcceptGroupInvite={handleAcceptGroupInvite}
                  onDeclineGroupInvite={handleDeclineGroupInvite}
                  onRemoveMember={handleRemoveMember}
                  onAddComment={handleAddComment}
                  habits={habits} 
                  setIsHelpOpen={setIsHelpOpen}
                  allUserProfiles={allUserProfiles}
                  onUpdateGroupSharedHabits={handleUpdateGroupSharedHabits}
                  selectedGroupId={selectedGroupId}
                  onClearSelectedGroup={() => setSelectedGroupId(null)}
                />;
      case 'records':
        return (
          <Records
            checkins={checkins}
            checkouts={checkouts}
            /* ...既存の props... */
          />
        );
      case 'tasks':
        return <Tasks /* 必要な props を渡す（例: tasks, onAddTask 等） */ />
      case 'notes':
        return <Notes /* 必要な props を渡す（例: notes, onAddNote 等） */ />
      case 'learnings':
        return (
          <Learnings
            learnings={learnings}
            onAddLearning={handleCreateLearning}
            profile={profile}
          />
        );
      
      default:
        return null;
    }
  };

  // 型狭窄で比較エラーが出るのを避けるヘルパー
  const isView = (v: View) => view === v;

  // 「診断, 習慣, グループ, 記録, 分析」をまとめて
  // 上部の「習慣」タブに紐付ける（どれを選んでいても習慣タブがアクティブに見える）
  const isUnderHabits = useMemo(() => ['diagnosis','personality','purelife','habits','groups','records','analytics', 'notifications'].includes(view), [view]);

  // 上部固定タブ（診断ページ：エネルギー / パーソナリティ）
  const showDiagnosisTabs = ['diagnosis','personality','purelife','value'].includes(view);

  const mainContainerClass = isView('notes')
    ? 'max-w-4xl mx-auto p-4 sm:p-6 lg:p-8'
    // ? 'max-w-5xl mx-auto p-2 sm:p-4 lg:p-6'
    : 'max-w-4xl mx-auto p-4 sm:p-6 lg:p-8';

  // --- JSX (変更なし) ---
  return (
    <div className={`min-h-screen bg-gray-100 font-sans text-gray-800 ${view !== 'notifications' ? 'pb-28' : ''}`}>
      <header className={`bg-white sticky top-0 z-40 ${showDiagnosisTabs ? '' : 'shadow-sm'}`}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-2 h-16">
                {/* 左: ハンバーガーメニュー + タイトル */}
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <button
                      aria-label="メニュー"
                      onClick={() => setIsMenuOpen(v => !v)}
                      className="p-2 rounded-md hover:bg-gray-100"
                    >
                      {/* simple hamburger */}
                      <svg className="w-6 h-6 text-gray-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                      </svg>
                    </button>
                  </div>

                  {/* タイトル + ビュータグ */}
                  <div className="flex items-center gap-3">
                    <h1 className="text-xl md:text-2xl font-bold text-indigo-600">EnerGize</h1>

                    <div className="flex items-center gap-2">
                      {isUnderHabits && (
                        <span className="text-xs px-3 py-1 rounded-full bg-indigo-100 text-indigo-600 font-medium">習慣</span>
                      )}
                      {isView('tasks') && (
                        <span className="text-xs px-3 py-1 rounded-full bg-indigo-100 text-indigo-600 font-medium">タスク</span>
                      )}
                      {isView('notes') && (
                        <span className="text-xs px-3 py-1 rounded-full bg-indigo-100 text-indigo-600 font-medium">メモ</span>
                      )}
                      {isView('learnings') && (
                        <span className="text-xs px-3 py-1 rounded-full bg-indigo-100 text-indigo-600 font-medium">学習</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* 右: 通知アイコン + プロフィール */}
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <button
                      aria-label="通知"
                      onClick={() => setView('notifications')}
                      className="p-2 rounded-full hover:bg-gray-100 relative"
                    >
                      <BellIcon className="w-6 h-6 text-gray-600" />
                      {notifications.filter(n => !n.isRead).length > 0 && (
                        <span className="absolute top-1 right-1 block h-3 w-3 rounded-full bg-red-500 border-2 border-white" />
                      )}
                    </button>
                  </div>
                  {/* 右: プロフィール */}
                  <div className="flex items-center">
                    <button onClick={() => setIsProfileOpen(true)} className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-200 text-gray-500 hover:bg-gray-300 overflow-hidden">
                      {profile.imageUrl ? (
                          <img src={profile.imageUrl} alt={profile.displayName || ''} className="w-full h-full object-cover" />
                      ) : (
                          <UserIcon className="w-6 h-6"/>
                      )}
                    </button>
                  </div>
                </div>
            </div>
        </div>
      </header>

      {/* 上部固定タブ（診断カテゴリ一覧） - アイコン＋ラベルで横に並ぶタブ */}
      {showDiagnosisTabs && (
        <div className="bg-white shadow-sm sticky top-16 z-40">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
            <div className="flex items-center gap-2 overflow-x-auto">
              {[
                { key: 'diagnosis', label: 'エネルギー診断', icon: <DiagnosisIcon className="w-5 h-5" /> },
                { key: 'personality', label: 'パーソナリティ診断', icon: <UserIcon className="w-5 h-5" /> },
                { key: 'purelife', label: 'PureLife診断', icon: <DiagnosisIcon className="w-5 h-5" /> },
                { key: 'value', label: '価値観診断', icon: <UserIcon className="w-5 h-5" /> },
              ].map(tab => {
                const active = isView(tab.key as View);
                return (
                  <button
                    key={tab.key}
                    onClick={() => setView(tab.key as View)}
                    aria-pressed={active}
                    className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
                      active ? 'bg-indigo-600 text-white' : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <span className={`inline-flex items-center justify-center w-6 h-6 rounded-md ${active ? 'bg-white/20' : 'bg-gray-100'}`}>
                      {tab.icon}
                    </span>
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/*
        ===========================
        グローバルメニュー（ヘッダーとは別の場所に固定表示）
        - モバイル: 画面左から全高で被せる
        - デスクトップ: ヘッダー下に小さなパネルを表示
        ===========================
      */}
      {isMenuOpen && (
        <>
          {/* backdrop to cover bottom tabs and put menu topmost */}
          <div
            className="fixed inset-0 z-50 bg-black/30"
            onClick={() => setIsMenuOpen(false)}
            aria-hidden
          />

          {/* Mobile: left full-height panel (topmost z-60) */}
          <nav
            ref={menuRef}
            className="fixed left-0 top-0 bottom-0 z-60 w-72 bg-gradient-to-b from-white to-gray-50 shadow-md border-r border-gray-200 p-4 overflow-auto md:hidden"
            aria-label="サイドメニュー"
          >
            {/* App header inside menu */}
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold">E</div>
              <div>
                <div className="text-sm font-semibold text-gray-800">EnerGize</div>
                <div className="text-xs text-gray-500">Your energy dashboard</div>
              </div>
            </div>

            {/* Profile row (icon on left) */}
            <div className="flex items-center gap-3 px-2 py-3 bg-white rounded-lg shadow-sm mb-4">
              <div className="w-12 h-12 rounded-full bg-gray-100 overflow-hidden flex items-center justify-center">
                {profile.imageUrl ? (
                  <img src={profile.imageUrl} alt={profile.displayName || ''} className="w-full h-full object-cover" />
                ) : (
                  <UserIcon className="w-6 h-6 text-gray-500" />
                )}
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium text-gray-800">{profile.displayName || 'あなた'}</div>
              </div>
              <button onClick={() => { setIsProfileOpen(true); setIsMenuOpen(false); }} className="text-sm text-indigo-600 px-2 py-1 rounded hover:bg-indigo-50">表示</button>
            </div>

            {/* Main navigation */}
            <div className="mb-4">
              <div className="text-xs text-gray-400 uppercase mb-2">主要</div>
              <button onClick={() => { setView('diagnosis'); setIsMenuOpen(false); }} className="flex items-center gap-3 w-full text-left px-3 py-2 rounded-lg hover:bg-indigo-50 hover:text-indigo-600">
                <DiagnosisIcon className="w-5 h-5 text-indigo-500" /> 診断
              </button>
              <div className="ml-6 mt-2 flex flex-col gap-1">
                <button onClick={() => { setView('diagnosis'); setIsMenuOpen(false); }} className="text-sm px-2 py-1 rounded hover:bg-gray-100 text-gray-700 text-left">エネルギー診断</button>
                <button onClick={() => { setView('personality'); setIsMenuOpen(false); }} className="text-sm px-2 py-1 rounded hover:bg-gray-100 text-gray-700 text-left">パーソナリティ診断</button>
              </div>
              <button onClick={() => { setView('habits'); setIsMenuOpen(false); }} className="flex items-center gap-3 w-full text-left px-3 py-2 rounded-lg hover:bg-indigo-50 hover:text-indigo-600 mt-2">
                <HabitIcon className="w-5 h-5 text-emerald-500" /> 習慣
              </button>
              <div className="ml-6 mt-2 flex flex-col gap-1">
                <button onClick={() => { setView('diagnosis'); setIsMenuOpen(false); }} className="text-sm px-2 py-1 rounded hover:bg-gray-100 text-gray-700 text-left">診断</button>
                <button onClick={() => { setView('habits'); setIsMenuOpen(false); }} className="text-sm px-2 py-1 rounded hover:bg-gray-100 text-gray-700 text-left">習慣</button>
                <button onClick={() => { setView('groups'); setIsMenuOpen(false); }} className="text-sm px-2 py-1 rounded hover:bg-gray-100 text-gray-700 text-left">グループ</button>
                <button onClick={() => { setView('records'); setIsMenuOpen(false); }} className="text-sm px-2 py-1 rounded hover:bg-gray-100 text-gray-700 text-left">記録</button>
                <button onClick={() => { setView('analytics'); setIsMenuOpen(false); }} className="text-sm px-2 py-1 rounded hover:bg-gray-100 text-gray-700 text-left">分析</button>
              </div>
            </div>

            <div className="mb-4">
              <div className="text-xs text-gray-400 uppercase mb-2">その他</div>
              <button onClick={() => { setView('tasks'); setIsMenuOpen(false); }} className="flex items-center gap-3 w-full text-left px-3 py-2 rounded-lg hover:bg-gray-100">
                <TaskIcon className="w-5 h-5 text-indigo-600" /> タスク
              </button>
              <button onClick={() => { setView('notes'); setIsMenuOpen(false); }} className="flex items-center gap-3 w-full text-left px-3 py-2 rounded-lg hover:bg-gray-100 mt-2">
                <NoteIcon className="w-5 h-5 text-emerald-500" /> メモ
              </button>
              <button onClick={() => { setView('learnings'); setIsMenuOpen(false); }} className="flex items-center gap-3 w-full text-left px-3 py-2 rounded-lg hover:bg-gray-100 mt-2">
                <ScholarIcon className="w-5 h-5 text-amber-500" /> 学習
              </button>
            </div>

            <div className="mt-auto pt-3 border-t">
              <button onClick={() => { setIsMenuOpen(false); handleLogout(); }} className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-100 text-red-600">ログアウト</button>
            </div>
          </nav>

          {/* Desktop: separate floating panel (topmost z-60) */}
          <div className="hidden md:block">
            <div className="fixed top-16 left-4 z-60 w-64 bg-white rounded-lg shadow-md border border-gray-200 p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 rounded bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold">E</div>
                <div className="text-sm font-semibold">EnerGize</div>
              </div>
              <div className="flex items-center gap-3 px-2 py-2 bg-gray-50 rounded mb-3">
                <div className="w-10 h-10 rounded-full bg-gray-100 overflow-hidden flex items-center justify-center">
                  {profile.imageUrl ? <img src={profile.imageUrl} className="w-full h-full object-cover" alt="" /> : <UserIcon className="w-5 h-5 text-gray-500" />}
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-800">{profile.displayName || 'あなた'}</div>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <button onClick={() => { setView('diagnosis'); setIsMenuOpen(false); }} className="flex items-center gap-3 px-3 py-2 rounded hover:bg-indigo-50 hover:text-indigo-600">
                  <DiagnosisIcon className="w-5 h-5 text-indigo-500" /> 診断
                </button>
                <button onClick={() => { setView('habits'); setIsMenuOpen(false); }} className="flex items-center gap-3 px-3 py-2 rounded hover:bg-emerald-50 hover:text-emerald-600">
                  <HabitIcon className="w-5 h-5 text-emerald-500" /> 習慣
                </button>
                <div className="ml-5 mt-1 flex flex-col gap-1">
                  <button onClick={() => { setView('diagnosis'); setIsMenuOpen(false); }} className="text-sm px-2 py-1 rounded hover:bg-gray-100 text-gray-700 text-left">診断</button>
                  <button onClick={() => { setView('habits'); setIsMenuOpen(false); }} className="text-sm px-2 py-1 rounded hover:bg-gray-100 text-gray-700 text-left">習慣</button>
                  <button onClick={() => { setView('groups'); setIsMenuOpen(false); }} className="text-sm px-2 py-1 rounded hover:bg-gray-100 text-gray-700 text-left">グループ</button>
                  <button onClick={() => { setView('records'); setIsMenuOpen(false); }} className="text-sm px-2 py-1 rounded hover:bg-gray-100 text-gray-700 text-left">記録</button>
                  <button onClick={() => { setView('analytics'); setIsMenuOpen(false); }} className="text-sm px-2 py-1 rounded hover:bg-gray-100 text-gray-700 text-left">分析</button>
                </div>
                <button onClick={() => { setView('tasks'); setIsMenuOpen(false); }} className="flex items-center gap-3 px-3 py-2 rounded hover:bg-gray-100">
                  <TaskIcon className="w-5 h-5 text-gray-600" /> タスク
                </button>
                <button onClick={() => { setView('notes'); setIsMenuOpen(false); }} className="flex items-center gap-3 px-3 py-2 rounded hover:bg-gray-100">
                  <NoteIcon className="w-5 h-5 text-gray-600" /> メモ
                </button>
                <button onClick={() => { setView('learnings'); setIsMenuOpen(false); }} className="flex items-center gap-3 w-full text-left px-3 py-2 rounded-lg hover:bg-gray-100 mt-2">
                  <ScholarIcon className="w-5 h-5 text-gray-600" /> 学習
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {isHelpOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={() => setIsHelpOpen(false)}>
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
                <h3 className="text-lg font-bold text-gray-800 mb-2">ヘルプ</h3>
                <p className="text-gray-600">{helpText}</p>
                 <div className="text-right mt-4">
                     <button type="button" onClick={() => setIsHelpOpen(false)} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow">閉じる</button>
                  </div>
            </div>
        </div>
      )}

      {isProfileOpen && (
          <ProfileModal 
            profile={profile}
            onSave={handleProfileSave}
            following={following}
            followers={followers}
            onFollowUser={handleFollowUser}
            onClose={() => setIsProfileOpen(false)}
            onLogout={handleLogout}
          />
      )}

      <main className={mainContainerClass}>
          {renderView()}

        {/* helpText が空文字なら枠自体を表示しない */}
        {helpText && helpText.trim() !== '' && (
          <div className="mt-6">
            <div className="bg-white p-4 rounded-lg shadow-sm text-sm text-gray-600">
              {helpText}
            </div>
          </div>
        )}
      </main>

      {/* 下部固定タブバー */}
      {isUnderHabits && view !== 'notifications' && (
        <nav className="fixed left-0 right-0 bottom-0 z-50 bg-white border-t border-gray-100 safe-bottom">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-18 py-3">
              <button
                onClick={() => setView('diagnosis')}
                className={`flex flex-col items-center text-xs w-1/5 ${(view === 'diagnosis' || view === 'personality' || view === 'purelife') ? 'text-indigo-600' : 'text-gray-500'}`}
              >
                <DiagnosisIcon className="w-6 h-6 mb-1" />
                <span className="text-sm">診断</span>
              </button>

              <button
                onClick={() => setView('habits')}
                className={`flex flex-col items-center text-xs w-1/5 ${isView('habits') ? 'text-indigo-600' : 'text-gray-500'}`}
              >
                <HabitIcon className="w-6 h-6 mb-1" />
                <span className="text-sm">習慣</span>
              </button>

              <button
                onClick={() => setView('groups')}
                className={`flex flex-col items-center text-xs w-1/5 ${isView('groups') ? 'text-indigo-600' : 'text-gray-500'}`}
              >
                <GroupIcon className="w-6 h-6 mb-1" />
                <span className="text-sm">グループ</span>
              </button>

              <button
                onClick={() => setView('records')}
                className={`flex flex-col items-center text-xs w-1/5 ${isView('records') ? 'text-indigo-600' : 'text-gray-500'}`}
              >
                <ListBulletIcon className="w-6 h-6 mb-1" />
                <span className="text-sm">記録</span>
              </button>

              <button
                onClick={() => setView('analytics')}
                className={`flex flex-col items-center text-xs w-1/5 ${isView('analytics') ? 'text-indigo-600' : 'text-gray-500'}`}
              >
                <AnalyticsIcon className="w-6 h-6 mb-1" />
                <span className="text-sm">分析</span>
              </button>
            </div>
          </div>
        </nav>
      )}
      {/* 既存のフッターは簡素化 */}
      <div className="hidden sm:block">
        <footer className="text-center py-6 text-gray-500 text-sm">
          <p>Your personal dashboard for a better self.</p>
        </footer>
      </div>
    </div>
  );
};

export default MainApp;