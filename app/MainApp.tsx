"use client";

import React, { useState, useMemo, useEffect } from 'react';

// ★ Firestore関連のモジュールをインポート (writeBatch を削除)
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

// ★ useLocalStorage は ProfileModal のためだけに残す
import useLocalStorage from './hooks/useLocalStorage';

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
    setProfile: (profile: Profile | null) => void;
}

const MainApp: React.FC<MainAppProps> = ({ profile, setProfile }) => {
  const [view, setView] = useState<View>('habits');
  
  // ★★★ useLocalStorage を useState に置き換え ★★★
  const [energyHistory, setEnergyHistory] = useState<EnergyRecord[]>([]);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [diagnosisFrequency, setDiagnosisFrequency] = useState<DiagnosisFrequency>({ frequencyType: 'weekly', frequencyValue: [1] });
  const [friends, setFriends] = useState<Friend[]>([]);
  const [groups, setGroups] = useState<GroupType[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);

  // ★ データをクラウドから読み込み中かを示す状態
  const [isLoading, setIsLoading] = useState(true);

  // ProfileModalで使うローカルストレージ（これはこのまま）
  const [userProfile, setUserProfile] = useLocalStorage<Profile | null>('userProfile', profile);

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

  // ★★★ データの「読み込み」処理 (Firestore) (変更なし) ★★★
  useEffect(() => {
    // profile.id (ユーザーID) がなければ、読み込めないので処理を中断
    if (!profile.id) {
      setIsLoading(false);
      return;
    }

    // 読み込むコレクション（フォルダ）の場所を定義
    const baseRef = doc(db, 'users', profile.id);
    const habitsRef = collection(baseRef, 'habits');
    const historyRef = collection(baseRef, 'energyHistory');
    const friendsRef = collection(baseRef, 'friends');
    const groupsRef = collection(baseRef, 'groups');
    const commentsRef = collection(baseRef, 'comments');
    const settingsRef = doc(baseRef, 'settings', 'main'); // 診断頻度は単一のドキュメント
    
    const loadData = async () => {
      try {
        // 1. 習慣(habits)を読み込む
        const habitsSnap = await getDocs(habitsRef);
        const loadedHabits = habitsSnap.docs.map(d => ({
          ...d.data() as Omit<Habit, 'id'>,
          id: d.id, // FirestoreのドキュメントIDを `id` プロパティとして追加
        }));
        setHabits(loadedHabits);

        // 2. 診断履歴(energyHistory)を読み込む
        const historySnap = await getDocs(historyRef);
        const loadedHistory = historySnap.docs.map(d => d.data() as EnergyRecord);
        setEnergyHistory(loadedHistory);

        // 3. 友達(friends)を読み込む
        const friendsSnap = await getDocs(friendsRef);
        const loadedFriends = friendsSnap.docs.map(d => ({
          ...d.data() as Omit<Friend, 'id'>,
          id: d.id,
        }));
        setFriends(loadedFriends);

        // 4. グループ(groups)を読み込む
        const groupsSnap = await getDocs(groupsRef);
        const loadedGroups = groupsSnap.docs.map(d => ({
          ...d.data() as Omit<GroupType, 'id'>,
          id: d.id,
        }));
        setGroups(loadedGroups);

        // 5. コメント(comments)を読み込む
        const commentsSnap = await getDocs(commentsRef);
        const loadedComments = commentsSnap.docs.map(d => ({
          ...d.data() as Omit<Comment, 'id'>,
          id: d.id,
        }));
        setComments(loadedComments);
        
        // 6. 設定(diagnosisFrequency)を読み込む
        const settingsSnap = await getDoc(settingsRef);
        if (settingsSnap.exists() && settingsSnap.data().diagnosisFrequency) {
          setDiagnosisFrequency(settingsSnap.data().diagnosisFrequency);
        }
        // 存在しない場合は useState のデフォルト値が使われる

      } catch (error) {
        console.error("データの読み込みに失敗しました:", error);
      } finally {
        setIsLoading(false); // 読み込み完了（または失敗）
      }
    };

    loadData();
    
  }, [profile.id]);


  // ★★★ データの「書き込み」処理 (Firestore) ★★★

  // (1) 診断履歴 (変更なし)
  const handleDiagnosisComplete = async (scores: EnergyScores) => {
    if (!profile.id) return;

    const today = new Date().toLocaleDateString('sv-SE'); // YYYY-MM-DD
    const newRecord: EnergyRecord = {
      date: today,
      ...scores,
    };
    
    try {
      const historyRef = doc(db, 'users', profile.id, 'energyHistory', today);
      await setDoc(historyRef, newRecord); // setDocで（あれば）上書き
      
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
  
  // ★ (3) グループ関連の書き込みハンドラ (★ここが修正点です★) ★
  
  // ★ 友達の「追加」ハンドラ (Group.tsx に渡す)
  const handleAddFriend = async (friendId: string, friendData: Omit<Friend, 'id'>) => {
    if (!profile.id) return;
    try {
      // 友達のID (friendId) をドキュメントIDとして設定
      const friendRef = doc(db, 'users', profile.id, 'friends', friendId);
      await setDoc(friendRef, friendData);
      
      // ローカルの React 状態 (state) にも追加
      const newFriend: Friend = { ...friendData, id: friendId };
      setFriends(prevFriends => [...prevFriends, newFriend]);
      
    } catch (error) {
      console.error("友達の追加に失敗しました:", error);
    }
  };
  
  // ★ グループの「追加」ハンドラ (Group.tsx に渡す)
  const handleAddGroup = async (newGroupData: Omit<GroupType, 'id'>) => {
    if (!profile.id) return;
    try {
      const groupsRef = collection(db, 'users', profile.id, 'groups');
      // Firestoreにデータを追加 (自動ID生成)
      const docRef = await addDoc(groupsRef, newGroupData);
      
      // ローカルの React 状態 (state) にも追加
      const createdGroup: GroupType = { ...newGroupData, id: docRef.id };
      setGroups(prevGroups => [...prevGroups, createdGroup]);
      
    } catch (error) {
      console.error("グループの追加に失敗しました:", error);
    }
  };
  
  // ★ グループの「更新」ハンドラ (Group.tsx に渡す)
  const handleUpdateGroup = async (updatedGroup: GroupType) => {
    if (!profile.id || !updatedGroup.id) return;
    try {
      const groupRef = doc(db, 'users', profile.id, 'groups', updatedGroup.id);
      
      // IDは除外してFirestoreに保存
      const { id, ...dataToSave } = updatedGroup;
      await setDoc(groupRef, dataToSave);
      
      // ローカルの React 状態 (state) も更新
      setGroups(prevGroups => 
        prevGroups.map(g => g.id === updatedGroup.id ? updatedGroup : g)
      );
      
    } catch (error)
    {
      console.error("グループの更新に失敗しました:", error);
    }
  };
  
  // ★ コメントの「追加」ハンドラ (Group.tsx に渡す)
  const handleAddComment = async (newCommentData: Omit<Comment, 'id'>) => {
    if (!profile.id) return;
    try {
      const commentsRef = collection(db, 'users', profile.id, 'comments');
      // Firestoreにデータを追加 (自動ID生成)
      const docRef = await addDoc(commentsRef, newCommentData);
      
      // ローカルの React 状態 (state) にも追加
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

  // ★★★ ビューのレンダリング (★ここが修正点です★) ★★★
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
        // ★★★ Groupに渡すpropsを修正 ★★★
        return <Group 
                  profile={profile} 
                  friends={friends} 
                  // setFriends={handleFriendsChange} // 削除
                  onAddFriend={handleAddFriend} // ★ 追加
                  groups={groups} 
                  // setGroups={handleGroupsChange} // 削除
                  onAddGroup={handleAddGroup} // ★ 追加
                  onUpdateGroup={handleUpdateGroup} // ★ 追加
                  comments={comments} 
                  // setComments={handleCommentsChange} // 削除
                  onAddComment={handleAddComment} // ★ 追加
                  habits={habits} 
                  setIsHelpOpen={setIsHelpOpen} 
                />;
      default:
        return null;
    }
  };

  // --- JSX (変更なし) ---
  return (
    <div className="min-h-screen bg-gray-100 font-sans text-gray-800">
      {/* (↓ ヘッダー ... 変更なし) */}
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
      
      {/* (↓ ヘルプモーダル ... 変更なし) */}
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

      {/* ★★★ プロフィールモーダルの修正 ★★★ */}
      {isProfileOpen && (
          <ProfileModal 
            profile={profile}
            setProfile={setUserProfile}
            friends={friends}
            // setFriends={handleFriendsChange} // 削除
            onAddFriend={handleAddFriend} // ★ 追加
            onClose={() => setIsProfileOpen(false)}
            onLogout={handleLogout}
          />
      )}

      {/* (↓ main, footer ... 変更なし) */}
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