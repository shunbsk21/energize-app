"use client";

import React, { useState, useMemo, useEffect, useCallback } from 'react';

// ★ Firestore関連のモジュールをインポート
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  addDoc,
  deleteDoc,
  updateDoc
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
// ★ types.ts のパスを修正 (app/ 直下にあるため)
import { EnergyRecord, Habit, View, EnergyScores, Profile, DiagnosisFrequency, Friend, Group as GroupType, Comment } from './types'; 

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

// --- Icon Components End ---


// Propsの定義 (変更なし)
interface MainAppProps {
    profile: Profile;
    setProfile: React.Dispatch<React.SetStateAction<Profile | null>>;
}

const MainApp: React.FC<MainAppProps> = ({ profile, setProfile }) => {
  const [view, setView] = useState<View>('habits');
  
  const [energyHistory, setEnergyHistory] = useState<EnergyRecord[]>([]);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [diagnosisFrequency, setDiagnosisFrequency] = useState<DiagnosisFrequency>({ frequencyType: 'weekly', frequencyValue: [1] });

  // 新規: チェックイン / チェックアウトの state
  const [checkins, setCheckins] = useState<{ id: string; date: string; value: number; note?: string; createdAt?: string }[]>([]);
  const [checkouts, setCheckouts] = useState<{ id: string; date: string; gratitude?: string; note?: string; rating?: number | null; createdAt?: string }[]>([]);
  
  const [following, setFollowing] = useState<Friend[]>([]);
  const [followers, setFollowers] = useState<Friend[]>([]);
  
  const [groups, setGroups] = useState<GroupType[]>([]);
  
  // ★ コメントの state を削除
  // const [comments, setComments] = useState<Comment[]>([]);
  
  const [groupInvites, setGroupInvites] = useState<GroupType[]>([]);

  const [allUserProfiles, setAllUserProfiles] = useState<Map<string, Profile | Friend>>(new Map());

  const [isLoading, setIsLoading] = useState(true);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

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
        const loadedCheckins = checkinsSnap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
        const loadedCheckouts = checkoutsSnap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
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

      } catch (error) {
        console.error("データの読み込みに失敗しました:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
    
  }, [profile.id, setProfile, profile, fetchUserProfiles]);

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
  const handleAddHabit = async (newHabitData: Omit<Habit, 'id'>) => {
    if (!profile.id) return;
    try {
      const habitsRef = collection(db, 'users', profile.id, 'habits');
      const docRef = await addDoc(habitsRef, newHabitData);
      const createdHabit: Habit = { ...newHabitData, id: docRef.id };
      setHabits(prevHabits => [...prevHabits, createdHabit]);
    } catch (error) {
      console.error("習慣の追加に失敗しました:", error);
    }
  };
  
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
        sharedByMember: { ...(g as any).sharedByMember, [memberId]: sharedIds } 
      } : g));
      console.log('shared habits updated (local user copy)');
    } catch (err) {
      // updateDoc が失敗する（ドキュメントが存在しない等）場合は setDoc(merge) にフォールバック
      try {
        const fallbackRef = doc(db, 'users', profile.id, 'groups', groupId);
        await setDoc(fallbackRef, { sharedByMember: { [memberId]: sharedIds } }, { merge: true });
        setGroups(prev => prev.map(g => g.id === groupId ? { 
          ...g, 
          sharedByMember: { ...(g as any).sharedByMember, [memberId]: sharedIds } 
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
      const payload = {
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
      const payload = {
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
      setCheckins(prev => prev.map(c => c.id === id ? { ...c, value, note } : c));
    } catch (err) {
      console.error('チェックイン更新に失敗しました', err);
    }
  };

  const handleUpdateCheckout = async (id: string, gratitude?: string, note?: string, rating?: number | null) => {
    if (!profile.id) return;
    try {
      const ref = doc(db, 'users', profile.id, 'checkouts', id);
      await updateDoc(ref, { gratitude: gratitude || '', note: note || '', rating: rating ?? null, updatedAt: new Date().toISOString() });
      setCheckouts(prev => prev.map(c => c.id === id ? { ...c, gratitude, note, rating } : c));
    } catch (err) {
      console.error('チェックアウト更新に失敗しました', err);
    }
  };


  // --- ヘルプテキスト (変更なし) ---
  const helpText = useMemo(() => {
    if (view === 'diagnosis') {
      return '現在のあなたのエネルギー状態を4つの側面（身体、精神、感情、知性）から診断し、カレンダーで記録を可視化します。';
    }
    if (view === 'habits') {
      return '日々の習慣を記録して、エネルギーを高めましょう。新しい習慣は右下の＋ボタンから追加できます。';
    }
    if (view === 'analytics') {
      return 'ここでは、診断結果の推移や習慣の達成率をグラフで確認できます。自分のエネルギー状態と行動の関連性を分析し、日々の改善に役立てましょう。';
    }
    if (view === 'groups') {
        return '友達とグループを作成し、日々の習慣の進捗を共有できます。コメント機能で励まし合い、モチベーションを高めましょう。';
    }
    if (view === 'records') {
        return '日々のチェックイン / チェックアウトの記録を確認できます。自分のエネルギー状態を振り返り、改善点を見つけましょう。';
    }
    return '';
  }, [view]);

  // ★★★ ビューのレンダリング (★修正あり★) ★★★
  const renderView = () => {
    if (isLoading) {
      return <div className="text-center p-10">データを読み込んでいます...</div>;
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
                />;
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
                  onAddCheckin={handleAddCheckin}
                  onAddCheckout={handleAddCheckout}
                  checkins={checkins}
                  checkouts={checkouts}
                  onUpdateCheckin={handleUpdateCheckin}
                  onUpdateCheckout={handleUpdateCheckout}
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
                />;
      case 'records':
        return <Records checkouts={checkouts} />
      case 'tasks':
        return <Tasks /* 必要な props を渡す（例: tasks, onAddTask 等） */ />
      case 'notes':
        return <Notes /* 必要な props を渡す（例: notes, onAddNote 等） */ />
      default:
        return null;
    }
  };

  // 型狭窄で比較エラーが出るのを避けるヘルパー
  const isView = (v: View) => view === v;

  // --- JSX (変更なし) ---
  return (
    <div className="min-h-screen bg-gray-100 font-sans text-gray-800 pb-28"> {/* pb-28: 下部タブ分の余白 */}
      <header className="bg-white/80 backdrop-blur-sm shadow-sm sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-2 h-16">
                <div className="flex items-center">
                  <h1 className="text-xl md:text-2xl font-bold text-indigo-600">EnerGize</h1>
                </div>

                <div className="flex items-center gap-3">
                  {/* アイコン + 下テキスト */}
                  <button onClick={() => setView('habits')} title="習慣" className={`flex flex-col items-center p-2 rounded-md ${isView('habits') ? 'text-indigo-600' : 'text-gray-500'}`}>
                    <HabitIcon className="w-6 h-6"/>
                    <span className="text-xs mt-1">習慣</span>
                  </button>
                  <button onClick={() => setView('tasks')} title="タスク" className={`flex flex-col items-center p-2 rounded-md ${isView('tasks') ? 'text-indigo-600' : 'text-gray-500'}`}>
                    <TaskIcon className="w-6 h-6"/>
                    <span className="text-xs mt-1">タスク</span>
                  </button>
                  <button onClick={() => setView('notes')} title="メモ" className={`flex flex-col items-center p-2 rounded-md ${isView('notes') ? 'text-indigo-600' : 'text-gray-500'}`}>
                    <NoteIcon className="w-6 h-6"/>
                    <span className="text-xs mt-1">メモ</span>
                  </button>
                </div>

                <div className="flex items-center">
                  <button onClick={() => setIsProfileOpen(true)} className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-200 text-gray-500 hover:bg-gray-300 overflow-hidden">
                    {profile.imageUrl ? (
                        <img src={profile.imageUrl} alt={profile.displayName} className="w-full h-full object-cover" />
                    ) : (
                        <UserIcon className="w-6 h-6"/>
                    )}
                  </button>
                </div>
            </div>
        </div>
      </header>

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

      <main className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8">
        {renderView()}

        {/* タブごとの説明テキスト（メイン下部に表示） */}
        <div className="mt-6">
          <div className="bg-white p-4 rounded-lg shadow-sm text-sm text-gray-600">
            {helpText}
          </div>
        </div>
      </main>

      {/* 下部固定タブバー */}
      {view === 'habits' && (
        <nav className="fixed left-0 right-0 bottom-0 z-50 bg-white/90 border-t border-gray-100 safe-bottom">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-18 py-3">
              <button
                onClick={() => setView('diagnosis')}
                className={`flex flex-col items-center text-xs w-1/5 ${isView('diagnosis') ? 'text-indigo-600' : 'text-gray-500'}`}
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