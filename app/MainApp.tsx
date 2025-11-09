"use client";

import React, { useState, useMemo, useEffect } from 'react';

// ★ Firestore関連のモジュールをインポート
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  addDoc,
  deleteDoc
} from 'firebase/firestore';

// ★ db (データベース本体) をインポート
import { db, auth } from '@/lib/firebase';
import { signOut } from 'firebase/auth';

// (↓ 既存のコンポーネントインポート)
import EnergyDiagnosis from './components/EnergyDiagnosis';
import HabitTracker from './components/HabitTracker';
import Analytics from './components/Analytics';
import Group from './components/Group';
import ProfileModal from './components/Profile';
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


const UserIcon: React.FC<{className?: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>);

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
  const [friends, setFriends] = useState<Friend[]>([]);
  const [groups, setGroups] = useState<GroupType[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  
  // ★ すべてのユーザー（自分、友達、グループメンバー）のプロフィール情報を保持するMap
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

  // ★★★ データの「読み込み」処理 (Firestore) (★修正あり★) ★★★
  useEffect(() => {
    if (!profile.id) {
      setIsLoading(false);
      return;
    }

    // ★ ユーザーのプロフィール情報を取得するヘルパー関数 (★修正あり★)
    const fetchUserProfiles = async (userIds: string[]): Promise<Map<string, Profile | Friend>> => {
        const userMap = new Map<string, Profile | Friend>();
        // 自分のプロフィールをまず追加 (最新の 'profile' state を使う)
        userMap.set(profile.id, profile);

        // 重複しないIDのリストを作成
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
    };
    
    const loadData = async () => {
      try {
        const baseRef = doc(db, 'users', profile.id);
        const habitsRef = collection(baseRef, 'habits');
        const historyRef = collection(baseRef, 'energyHistory');
        const friendsRef = collection(baseRef, 'friends');
        const groupsRef = collection(baseRef, 'groups');
        const commentsRef = collection(baseRef, 'comments');
        const settingsRef = doc(baseRef, 'settings', 'main');

        // 1. 自分の基本設定を読み込む
        const settingsSnap = await getDoc(settingsRef);
        if (settingsSnap.exists()) {
          const settingsData = settingsSnap.data();
          if (settingsData.diagnosisFrequency) {
            setDiagnosisFrequency(settingsData.diagnosisFrequency);
          }
          if (settingsData.profile) {
            const savedProfile = settingsData.profile;
            // ★ setProfile は profile が変更された時のみ呼び出す
            if (savedProfile.displayName !== profile.displayName || savedProfile.imageUrl !== profile.imageUrl) {
              setProfile((prevProfile: Profile | null) => ({
                  ...prevProfile!,
                  displayName: savedProfile.displayName || prevProfile!.displayName,
                  imageUrl: savedProfile.imageUrl,
              }));
            }
          }
        }

        // 2. 他のデータを並行して読み込む
        const [habitsSnap, historySnap, commentsSnap, friendsSnap, groupsSnap] = await Promise.all([
            getDocs(habitsRef),
            getDocs(historyRef),
            getDocs(commentsRef),
            getDocs(friendsRef),
            getDocs(groupsRef)
        ]);

        // --- 読み込んだデータを state にセット (プロフィール以外) ---
        
        const loadedHabits = habitsSnap.docs.map(d => ({ ...d.data() as Omit<Habit, 'id'>, id: d.id }));
        setHabits(loadedHabits);

        const loadedHistory = historySnap.docs.map(d => d.data() as EnergyRecord);
        setEnergyHistory(loadedHistory);

        const loadedComments = commentsSnap.docs.map(d => ({ ...d.data() as Omit<Comment, 'id'>, id: d.id }));
        setComments(loadedComments);
        
        const loadedFriends = friendsSnap.docs.map(d => ({ ...d.data() as Omit<Friend, 'id'>, id: d.id }));
        const loadedGroups = groupsSnap.docs.map(d => ({ ...d.data() as Omit<GroupType, 'id'>, id: d.id }));

        // --- 4. 友達とグループメンバー全員のプロフィール情報を取得 ---
        const friendIds = loadedFriends.map(f => f.id);
        const memberIds = loadedGroups.flatMap(g => g.members);
        const allUserIds = Array.from(new Set([...friendIds, ...memberIds]));
        
        const userProfilesMap = await fetchUserProfiles(allUserIds);
        setAllUserProfiles(userProfilesMap); // Group.tsx が使うMapをセット

        // 5. 読み込んだ友達リスト(loadedFriends)を、最新のプロフィール(userProfilesMap)で更新する
        const updatedFriends = loadedFriends.map(oldFriend => {
            const latestProfile = userProfilesMap.get(oldFriend.id);
            if (latestProfile) {
                return {
                    id: latestProfile.id,
                    displayName: latestProfile.displayName,
                    imageUrl: latestProfile.imageUrl
                };
            }
            return oldFriend;
        });
        
        setFriends(updatedFriends);
        setGroups(loadedGroups);

      } catch (error) {
        console.error("データの読み込みに失敗しました:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
    
  }, [profile.id, setProfile, profile]); // ★ profile 自体も依存配列に追加


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
  
  // (3) グループ関連 (★ onAddFriend, onAddGroup, onUpdateGroup を修正 ★)
  
  // ★ 友達の「追加」ハンドラ (相互フォロー対応)
  const handleAddFriend = async (friendId: string) => {
    if (!profile.id || friendId === profile.id || friends.some(f => f.id === friendId)) {
        console.warn("追加できない友達IDです:", friendId);
        return;
    }
    
    try {
      // 1. 相手のプロフィール情報を Firestore から「読み込む」
      const friendSettingsRef = doc(db, 'users', friendId, 'settings', 'main');
      const friendSnap = await getDoc(friendSettingsRef);

      let friendData: Omit<Friend, 'id'>;

      if (friendSnap.exists() && friendSnap.data().profile) {
        const friendProfile = friendSnap.data().profile;
        friendData = {
          displayName: friendProfile.displayName ?? `ユーザー ${friendId.substring(0, 4)}`,
          imageUrl: friendProfile.imageUrl || null
        };
      } else {
        friendData = {
          displayName: `ユーザー ${friendId.substring(0, 4)}`,
          imageUrl: null
        };
      }

      // 2. 自分の友達リストに「書き込む」
      const friendRef = doc(db, 'users', profile.id, 'friends', friendId);
      await setDoc(friendRef, friendData);
      
      // 3. ローカルの React 状態 (state) にも追加
      const newFriend: Friend = { ...friendData, id: friendId };
      setFriends(prevFriends => [...prevFriends, newFriend]);
      
      // 4. allUserProfiles マップにも追加
      setAllUserProfiles(prevMap => new Map(prevMap).set(newFriend.id, newFriend));

      // 5. ★ 相手の友達リストにも「自分」を追加する (相互フォロー)
      const myProfileDataForFriend: Omit<Friend, 'id'> = {
          displayName: profile.displayName,
          imageUrl: profile.imageUrl
      };
      const myRefOnFriendList = doc(db, 'users', friendId, 'friends', profile.id);
      await setDoc(myRefOnFriendList, myProfileDataForFriend);
      
    } catch (error) {
      console.error("友達の追加に失敗しました:", error);
    }
  };

  // ★ グループの「追加」ハンドラ (メンバー全員に書き込む)
  const handleAddGroup = async (newGroupData: Omit<GroupType, 'id'>) => {
    if (!profile.id) return;
    try {
      // 1. 新しいグループIDを先に生成
      const newGroupRef = doc(collection(db, 'users', profile.id, 'groups'));
      const newGroupId = newGroupRef.id;
      const groupDocWithId: GroupType = { ...newGroupData, id: newGroupId };

      // 2. メンバー全員にこのグループを書き込む
      for (const memberId of newGroupData.members) {
          const groupRefForMember = doc(db, 'users', memberId, 'groups', newGroupId);
          // (自分の書き込みは `profile.id == userId` ルールで、
          //  他人への書き込みは `request.auth.uid in request.resource.data.members` ルールで許可される)
          await setDoc(groupRefForMember, newGroupData); 
      }
      
      // 3. ローカルの state を更新
      setGroups(prevGroups => [...prevGroups, groupDocWithId]);
      
      // 4. 新規メンバーのプロフィールも取得してキャッシュに追加
      const newMemberIds = newGroupData.members.filter(id => !allUserProfiles.has(id));
      if (newMemberIds.length > 0) {
          // ★★★ ここからがエラー修正箇所 ★★★
          const newProfilesMap = await (async () => {
              const map = new Map<string, Profile | Friend>();
              for (const id of newMemberIds) {
                  const settingsRef = doc(db, 'users', id, 'settings', 'main');
                  const docSnap = await getDoc(settingsRef);
                  if (docSnap.exists() && docSnap.data().profile) {
                      const userProfile = docSnap.data().profile;
                      map.set(id, { id: id, displayName: userProfile.displayName ?? `ユーザー ${id.substring(0, 4)}`, imageUrl: userProfile.imageUrl });
                  } else {
                      map.set(id, { id: id, displayName: `ユーザー ${id.substring(0, 4)}`, imageUrl: null });
                  }
              }
              return map; // ★ 関数がMapを返すようにする
          })();
          setAllUserProfiles(prevMap => new Map([...prevMap, ...newProfilesMap]));
          // ★★★ エラー修正ここまで ★★★
      }

    } catch (error) {
      console.error("グループの追加に失敗しました:", error);
    }
  };

  // ★ グループの「更新」ハンドラ (メンバー全員に書き込む)
  const handleUpdateGroup = async (updatedGroup: GroupType) => {
    if (!profile.id || !updatedGroup.id) return;
    try {
      const { id, ...dataToSave } = updatedGroup;
      
      const oldGroup = groups.find(g => g.id === updatedGroup.id);
      const oldMembers = oldGroup ? oldGroup.members : [];
      const newMembers = updatedGroup.members.filter(id => !oldMembers.includes(id));

      // 1. 新しく招待されたメンバーにだけ、グループを作成
      for (const newMemberId of newMembers) {
          const groupRefForNewMember = doc(db, 'users', newMemberId, 'groups', updatedGroup.id);
          await setDoc(groupRefForNewMember, dataToSave);
      }
      
      // 2. 既存のメンバー（自分を含む）のグループ情報を更新
      // (注意: メンバーが脱退するロジックはここには含まれていない)
      for (const memberId of oldMembers) {
          const groupRefForMember = doc(db, 'users', memberId, 'groups', updatedGroup.id);
          // (注: 他人の `write` は失敗する。自分のだけ更新する)
          if (memberId === profile.id) {
              await setDoc(groupRefForMember, dataToSave);
          }
      }

      // 3. ローカルの state を更新
      setGroups(prevGroups => 
        prevGroups.map(g => g.id === updatedGroup.id ? updatedGroup : g)
      );
      
      // 4. 新規メンバーのプロフィールも取得してキャッシュに追加
      const newMemberIdsToFetch = newMembers.filter(id => !allUserProfiles.has(id));
      if (newMemberIdsToFetch.length > 0) {
          // ★★★ ここからがエラー箇所です ★★★
          const newProfilesMap = await (async () => {
              const map = new Map<string, Profile | Friend>();
              for (const id of newMemberIdsToFetch) { // ★ newMemberIds -> newMemberIdsToFetch
                  const settingsRef = doc(db, 'users', id, 'settings', 'main');
                  const docSnap = await getDoc(settingsRef);
                  if (docSnap.exists() && docSnap.data().profile) {
                      const userProfile = docSnap.data().profile;
                      map.set(id, { id: id, displayName: userProfile.displayName ?? `ユーザー ${id.substring(0, 4)}`, imageUrl: userProfile.imageUrl });
                  } else {
                      map.set(id, { id: id, displayName: `ユーザー ${id.substring(0, 4)}`, imageUrl: null });
                  }
              }
              return map; // ★ 関数がMapを返すようにする
          })();
          setAllUserProfiles(prevMap => new Map([...prevMap, ...newProfilesMap]));
          // ★★★ エラー修正ここまで ★★★
      }
    } catch (error)
    {
      console.error("グループの更新に失敗しました:", error);
    }
  };
  const handleAddComment = async (newCommentData: Omit<Comment, 'id'>) => {
    if (!profile.id) return;
    try {
      const commentsRef = collection(db, 'users', profile.id, 'comments');
      const docRef = await addDoc(commentsRef, newCommentData);
      const createdComment: Comment = { ...newCommentData, id: docRef.id };
      setComments(prevComments => [...prevComments, createdComment]);
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
    if (view === 'group') {
        return '友達とグループを作成し、日々の習慣の進捗を共有できます。コメント機能で励まし合い、モチベーションを高めましょう。';
    }
    return '';
  }, [view]);

  // ★★★ ビューのレンダリング (★修正あり★) ★★★
  const renderView = () => {
    // ★ 読み込み中は、ローディング画面を表示
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
                />;
      case 'analytics':
        return <Analytics 
                  energyHistory={energyHistory} 
                  habits={habits} 
                  setIsHelpOpen={setIsHelpOpen} 
                />;
      case 'group':
        return <Group 
                  profile={profile} 
                  friends={friends} 
                  onAddFriend={handleAddFriend}
                  groups={groups} 
                  onAddGroup={handleAddGroup}
                  onUpdateGroup={handleUpdateGroup}
                  comments={comments} 
                  onAddComment={handleAddComment}
                  habits={habits} 
                  setIsHelpOpen={setIsHelpOpen}
                  allUserProfiles={allUserProfiles}
                />;
      default:
        return null;
    }
  };

  // --- JSX (変更なし) ---
  return (
    <div className="min-h-screen bg-gray-100 font-sans text-gray-800">
      <header className="bg-white/80 backdrop-blur-sm shadow-sm sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-2 h-16">
                 <div className="flex items-center">
                    <h1 className="text-xl md:text-2xl font-bold text-indigo-600">EnerGize</h1>
                 </div>
                 <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-1 md:gap-2 p-1 bg-gray-200/70 rounded-lg">
                    <button 
                        onClick={() => setView('diagnosis')}
                        className={`flex items-center justify-center gap-2 px-3 py-1.5 rounded-md font-semibold transition-all text-sm ${view === 'diagnosis' ? 'bg-white text-indigo-600 shadow' : 'text-gray-600 hover:bg-white/50'}`}
                    >
                        <DiagnosisIcon className="w-5 h-5"/>
                        <span className="hidden sm:inline">診断</span>
                    </button>
                    <button 
                        onClick={() => setView('habits')}
                        className={`flex items-center justify-center gap-2 px-3 py-1.5 rounded-md font-semibold transition-all text-sm ${view === 'habits' ? 'bg-white text-indigo-600 shadow' : 'text-gray-600 hover:bg-white/50'}`}
                    >
                        <HabitIcon className="w-5 h-5" />
                        <span className="hidden sm:inline">習慣</span>
                    </button>
                     <button 
                        onClick={() => setView('group')}
                        className={`flex items-center justify-center gap-2 px-3 py-1.5 rounded-md font-semibold transition-all text-sm ${view === 'group' ? 'bg-white text-indigo-600 shadow' : 'text-gray-600 hover:bg-white/50'}`}
                    >
                        <GroupIcon className="w-5 h-5" />
                        <span className="hidden sm:inline">グループ</span>
                    </button>
                    <button 
                        onClick={() => setView('analytics')}
                        className={`flex items-center justify-center gap-2 px-3 py-1.5 rounded-md font-semibold transition-all text-sm ${view === 'analytics' ? 'bg-white text-indigo-600 shadow' : 'text-gray-600 hover:bg-white/50'}`}
                    >
                        <AnalyticsIcon className="w-5 h-5" />
                        <span className="hidden sm:inline">分析</span>
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
            friends={friends}
            onAddFriend={handleAddFriend}
            onClose={() => setIsProfileOpen(false)}
            onLogout={handleLogout}
          />
      )}

      <main className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8">
        {renderView()}
      </main>
       <footer className="text-center py-6 text-gray-500 text-sm">
        <p>Your personal dashboard for a better self.</p>
      </footer>
    </div>
  );
};

export default MainApp;