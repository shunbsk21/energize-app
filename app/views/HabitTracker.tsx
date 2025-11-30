"use client";

import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { collection, addDoc, serverTimestamp, updateDoc, doc, deleteDoc, getDocs, query, where } from 'firebase/firestore';
import { db, auth } from '../../lib/firebase';
import { Habit, View, FrequencyType, DiagnosisFrequency, EnergyRecord, Task, Checkin, Checkout, HabitTrackerProps } from '../types';
import DatePickerModal from '../components/DatePickerModal';
import HabitDetail from './HabitDetail';
import CheckInModal from '../components/CheckInModal';
import CheckOutModal from '../components/CheckOutModal';
import { HabitListModal } from '../components/HabitListModal';
import {
  isHabitScheduledForDate,
  calculateCompletionStatus,
  calculateCompletionPercentForDate,
  calculateCurrentStreak,
  isHabitCompletedOnDate,
  normalizeKey,
  isDiagnosisScheduledForDate
} from '../utils/habits';
import { formatDateKey } from '../utils/dates';
import {
  PlusIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CalendarIcon,
  DiagnosisIcon,
  ListBulletIcon,
  EditIcon,
  CheckCircleIcon,
  BrainIcon,
  SunIcon,
  MoonIcon,
  ScholarIconSmall
} from '../components/Icons';

// 優先度ソート用
const prioritySortValue = (p?: 'low'|'medium'|'high') => (p === 'high' ? 3 : p === 'medium' ? 2 : p === 'low' ? 1 : 0);

const WEEK_DAYS = ['日', '月', '火', '水', '木', '金', '土'];

function autoGrowTextArea(el?: HTMLTextAreaElement | null) {
  if (!el) return;
  el.style.height = 'auto';
  el.style.height = `${Math.max(el.scrollHeight, 40)}px`;
}

const HabitTracker: React.FC<HabitTrackerProps> = ({ 
  habits, 
  energyHistory,
  onAddHabit,
  onUpdateHabit,
  onDeleteHabit,
  setIsHelpOpen, 
  setView, 
  diagnosisFrequency,
  checkins,
  checkouts,
  onAddCheckin,
  onAddCheckout,
  onUpdateCheckin,
  onUpdateCheckout,
  tasks = [],
  onAddTask,
  onToggleTask,
  onUpdateTask,
  onDeleteTask,
  onAddLearning,
  purelifeFrequency,
  personalityDiagnosisFrequency,
  personalityDiagnosisCompletedDates,
  localPurelifeCompletedDates,
  onOpenPurelife,
  valueDiagnosisFrequency,
  valueDiagnosisCompletedDates,
  onOpenValueDiagnosis,
  isAdmin = false
}) => {
  const [newHabitName, setNewHabitName] = useState('');
  const [newHabitStartDate, setNewHabitStartDate] = useState(formatDateKey(new Date()));
  const [newHabitFrequency, setNewHabitFrequency] = useState<{type: FrequencyType, value: number[]}>({type: 'daily', value: []});
  const [newHabitType, setNewHabitType] = useState<'binary' | 'amount'>('binary');
  const [newHabitTarget, setNewHabitTarget] = useState<number | undefined>(undefined);
  const [newHabitUnit, setNewHabitUnit] = useState<string>('');
  const [newHabitDetails, setNewHabitDetails] = useState<string>('');
  const newHabitDetailsRef = React.useRef<HTMLTextAreaElement | null>(null);

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedHabit, setSelectedHabit] = useState<Habit | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [isListModalOpen, setIsListModalOpen] = useState(false);
  const [isNonScheduledOpen, setIsNonScheduledOpen] = useState(false);
  // --- 新: 固定量入力モーダル用 state（prompt を置き換える） ---
  const [isAmountModalOpen, setIsAmountModalOpen] = useState(false);
  const [amountModalHabit, setAmountModalHabit] = useState<Habit | null>(null);
  const [amountModalValue, setAmountModalValue] = useState<string>('');

  const [isCheckInOpen, setIsCheckInOpen] = useState(false);
  const [isCheckOutOpen, setIsCheckOutOpen] = useState(false);
  const [checkedInToday, setCheckedInToday] = useState(false);
  const [checkedOutToday, setCheckedOutToday] = useState(false);

  // --- Task add modal state (新規) ---
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDetails, setTaskDetails] = useState('');
  const [taskDueDate, setTaskDueDate] = useState<string>(''); // ISO YYYY-MM-DD
  const [taskPriority, setTaskPriority] = useState<'low'|'medium'|'high'>('medium');

  // --- Floating multi-button 展開 state ---
  const [fabOpen, setFabOpen] = useState(false);
  const fabRef = useRef<HTMLDivElement | null>(null);

  // --- purelife の完了日をローカルで保持し、グローバルイベントで即時更新する ---
  const [localPurelifeCompletedDatesState, setLocalPurelifeCompletedDatesState] = useState<string[]>(localPurelifeCompletedDates ?? []);

  // グローバルイベントで完了が伝播されたら即時に追加
  useEffect(() => {
    const handler = (ev: Event) => {
      try {
        const ce = ev as CustomEvent;
        const date: string | undefined = ce?.detail?.date;
        if (!date) return;
        setLocalPurelifeCompletedDatesState(prev => prev.includes(date) ? prev : [date, ...prev]);
      } catch (e) { /* noop */ }
    };
    window.addEventListener('purelife-diagnosis-saved', handler as EventListener);
    return () => window.removeEventListener('purelife-diagnosis-saved', handler as EventListener);
  }, []);


  const selectedDateISO = formatDateKey(selectedDate);
  
  // --- purelife の表示制御（props の頻度 / 完了日を使う） ---
  const hasPurelifeConfig = Boolean(purelifeFrequency);
  const isPurelifeDay = useMemo(() => {
    if (!purelifeFrequency) return false;
    return isDiagnosisScheduledForDate(purelifeFrequency, selectedDate);
  }, [purelifeFrequency, selectedDate]);

  // Firestore に保存された purelifeHistory を参照して selectedDate が実施済みか確認する
  useEffect(() => {
    let mounted = true;
    (async () => {
      // only check when there's a purelife schedule for the day
      if (!hasPurelifeConfig) return;
      if (!isPurelifeDay) return;
      try {
        const uid = auth?.currentUser?.uid ?? null;
        if (!uid) return;
        // query users/{uid}/purelifeHistory where date == selectedDateISO
        const colRef = collection(db, 'users', uid, 'purelifeHistory');
        const q = query(colRef, where('date', '==', selectedDateISO));
        const snap = await getDocs(q);
        if (!mounted) return;
        if (!snap.empty) {
          setLocalPurelifeCompletedDatesState(prev => prev.includes(selectedDateISO) ? prev : [selectedDateISO, ...prev]);
        }
      } catch (e) {
        // ignore - non-fatal
        console.warn('[HabitTracker] failed to check purelifeHistory', e);
      }
    })();
    return () => { mounted = false; };
  }, [selectedDateISO, hasPurelifeConfig, isPurelifeDay]);
  
  // add-modal 開閉時に自動リサイズ実行
  useEffect(() => {
    if (newHabitDetailsRef.current) {
      setTimeout(() => autoGrowTextArea(newHabitDetailsRef.current), 0);
    }
  }, [/* runs when modal renders — relies on ref presence */]);
  
  // --- localTasks: props から同期するローカルコピー（即時UI反映用） ---
  const [localTasks, setLocalTasks] = useState<typeof tasks>(tasks);
  useEffect(() => setLocalTasks(tasks), [tasks]);

  // --- selected task for edit modal ---
  const [selectedTask, setSelectedTask] = useState<null | {
    id: string;
    title: string;
    details?: string;
    dueDate?: string;
    priority?: 'low'|'medium'|'high';
    done?: boolean;
  }>(null);

  // edit modal fields
  const [editTitle, setEditTitle] = useState('');
  const [editDetails, setEditDetails] = useState('');
  const [editDueDate, setEditDueDate] = useState('');
  const [editPriority, setEditPriority] = useState<'low'|'medium'|'high'>('medium');
  const [editDone, setEditDone] = useState(false);

  // 外部クリックで展開メニューを閉じる
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!fabOpen) return;
      if (fabRef.current && !fabRef.current.contains(e.target as Node)) {
        setFabOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [fabOpen]);

  useEffect(() => {
    if (selectedTask) {
      setEditTitle(selectedTask.title || '');
      setEditDetails(selectedTask.details || '');
      setEditDueDate(selectedTask.dueDate || '');
      setEditPriority(selectedTask.priority || 'medium');
      setEditDone(!!selectedTask.done);
    }
  }, [selectedTask]);
  
  // --- 当日の期日タスク（selectedDate が dueDate と一致するもの） ---
  const dueTasks = useMemo(() => {
    return (localTasks || [])
      .filter(t => t.dueDate === selectedDateISO)
      .sort((a, b) => {
        const pa = prioritySortValue(a.priority);
        const pb = prioritySortValue(b.priority);
        if (pa !== pb) return pb - pa; // 高い優先度を前に
        return (a.title || '').localeCompare(b.title || '');
      });
  }, [localTasks, selectedDateISO]);

  // タスク追加 submit
  const submitTask = async () => {
    if (!taskTitle.trim()) return;
    const payload = { title: taskTitle.trim(), detail: taskDetails.trim() || undefined, dueDate: taskDueDate || selectedDateISO, priority: taskPriority };
    try {
      if (onAddTask) {
        await onAddTask(payload);
      } else {
        // fallback: write directly to Firestore
        const uid = auth?.currentUser?.uid ?? null;
        if (db && uid) {
          await addDoc(collection(db, 'users', uid, 'tasks'), { ...payload, done: false, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
        } else {
          console.warn('onAddTask not provided and no auth/db available');
        }
      }
    } catch (err) {
      console.error('onAddTask error', err);
    }
    // reset
    setTaskTitle(''); setTaskDetails(''); setTaskDueDate(''); setTaskPriority('medium');
    setIsTaskModalOpen(false);
    setFabOpen(false);
  };

  // タスク完了トグル時にローカル更新して親へ通知
  const handleToggleTaskLocal = async (taskId: string, nextDone: boolean) => {
    setLocalTasks(prev => prev.map(t => t.id === taskId ? { ...t, done: nextDone, completedAt: nextDone ? new Date().toISOString() : undefined } : t));
    try {
      if (onToggleTask) {
        await onToggleTask(taskId, nextDone);
      } else {
        // fallback: update firestore directly
        const uid = auth?.currentUser?.uid ?? null;
        if (db && uid) {
          const ref = doc(db, 'users', uid, 'tasks', taskId);
          if (nextDone) {
            await updateDoc(ref, { done: true, completedAt: serverTimestamp(), updatedAt: serverTimestamp() });
          } else {
            await updateDoc(ref, { done: false, completedAt: null, updatedAt: serverTimestamp() });
          }
        }
      }
    } catch (err) {
      console.error('onToggleTask error', err);
    }
  };

  // タスク編集保存
  const saveTaskEdits = async () => {
    if (!selectedTask) return;
    const payload = {
      title: editTitle.trim() || selectedTask.title,
      detail: editDetails.trim() || undefined,
      dueDate: editDueDate || undefined,
      priority: editPriority,
      done: editDone
    };
    // optimistic local update
    setLocalTasks(prev => prev.map(t => t.id === selectedTask.id ? { ...t, ...payload } : t));
    try {
      if (onUpdateTask) {
        await onUpdateTask(selectedTask.id, payload);
      } else {
        // fallback to firestore update — undefined を含まないようにフィルタ
        const uid = auth?.currentUser?.uid ?? null;
        if (db && uid) {
          const ref = doc(db, 'users', uid, 'tasks', selectedTask.id);
          const base: any = { ...payload, updatedAt: serverTimestamp() };
          const safePayload = Object.fromEntries(Object.entries(base).filter(([_, v]) => v !== undefined));
          await updateDoc(ref, safePayload);
        } else {
          console.warn('onUpdateTask not provided and no auth/db available');
        }
      }
    } catch (err) {
      console.error('onUpdateTask error', err);
    }
    setSelectedTask(null);
  };

  const deleteTaskConfirm = async () => {
    if (!selectedTask) return;
    const id = selectedTask.id;
    setLocalTasks(prev => prev.filter(t => t.id !== id));
    try {
      if (onDeleteTask) {
        await onDeleteTask(id);
      } else {
        const uid = auth?.currentUser?.uid ?? null;
        if (db && uid) {
          const ref = doc(db, 'users', uid, 'tasks', id);
          await deleteDoc(ref);
        } else {
          console.warn('onDeleteTask not provided and no auth/db available');
        }
      }
    } catch (err) {
      console.error('onDeleteTask error', err);
    }
    setSelectedTask(null);
  };

  // (↓ getWeekStart, weekStart, スワイプ関連のロジックは変更なし)
  const getWeekStart = (date: Date) => {
    // return Monday-start week start date for given date
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    const day = d.getDay(); // 0=Sun ... 6=Sat
    // convert to Monday-start: (0 -> 6), 1 -> 0, 2 -> 1 ...
    const offset = (day + 6) % 7;
    const diff = d.getDate() - offset;
    const start = new Date(d);
    start.setDate(diff);
    start.setHours(0,0,0,0);
    return start;
  };

  const [weekStart, setWeekStart] = useState(getWeekStart(selectedDate));
  
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [translateX, setTranslateX] = useState(0);
  const [transitionDuration, setTransitionDuration] = useState('0.3s');
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef(0);
  const dragOffsetRef = useRef(0);
  
  // helper to avoid TS undefined since props names are in scope
  function propsOrEmpty<T>(v?: T): T { return v ?? [] as unknown as T; }

  // --- checkin/checkout lookup helpers (date format: sv-SE) ---
  const getCheckinForDate = (date: Date) => {
    const d = formatDateKey(date);
    return (propsOrEmpty(checkins) || []).find((c:Checkin) => c.date === d) || null;
  };
  const getCheckoutForDate = (date: Date) => {
    const d = formatDateKey(date);
    return (propsOrEmpty(checkouts) || []).find((c:Checkout) => c.date === d) || null;
  };

  // --- モーダル用ドラフト state（open 時に既存値で初期化） ---
  const [checkinDraft, setCheckinDraft] = useState<{ id?: string; value: number; note?: string }>({ value: 4 });
  const [checkoutDraft, setCheckoutDraft] = useState<{ id?: string; rating: number; gratitude?: string; note?: string }>({ rating: 4 });

  // when opening modals, initialize drafts from existing records
  useEffect(() => {
    if (isCheckInOpen) {
      const rec = getCheckinForDate(selectedDate);
      if (rec) {
        setCheckinDraft({ id: rec.id, value: rec.value, note: rec.note || '' });
      }
    } else {
      setCheckinDraft({ value: 4, note: '' });
    }
  }, [isCheckInOpen, selectedDate, checkins]);

  useEffect(() => {
    if (isCheckOutOpen) {
      const rec = getCheckoutForDate(selectedDate);
      if (rec) {
        setCheckoutDraft({ id: rec.id, rating: rec.rating ?? 4, gratitude: rec.gratitude || '', note: rec.note || '' });
      }
    } else {
      setCheckoutDraft({ rating: 4, gratitude: '', note: '' });
    }
  }, [isCheckOutOpen, selectedDate, checkouts]);

  // reflect presence for button decoration
  useEffect(() => {
    setCheckedInToday(Boolean(getCheckinForDate(selectedDate)));
    setCheckedOutToday(Boolean(getCheckoutForDate(selectedDate)));
  }, [selectedDate, checkins, checkouts]);

  useEffect(() => {
    const resizeObserver = new ResizeObserver(entries => {
        if(entries[0]) {
            const newWidth = entries[0].contentRect.width;
            setContainerWidth(newWidth);
            setTranslateX(-newWidth);
        }
    });
    if (containerRef.current) {
        resizeObserver.observe(containerRef.current);
    }
    return () => resizeObserver.disconnect();
  }, []);

  const { prevWeekDays, currentWeekDays, nextWeekDays } = useMemo(() => {
    const current = [];
    for (let i = 0; i < 7; i++) {
        const day = new Date(weekStart);
        day.setDate(day.getDate() +i);
        current.push(day);
    }
    const prev = current.map(d => { const newD = new Date(d); newD.setDate(d.getDate() - 7); return newD; });
    const next = current.map(d => { const newD = new Date(d); newD.setDate(d.getDate() + 7); return newD; });
    return { prevWeekDays: prev, currentWeekDays: current, nextWeekDays: next };
  }, [weekStart]);

  const changeWeek = useCallback((direction: -1 | 1) => {
    setWeekStart(prev => {
        const newWeekStart = new Date(prev);
        newWeekStart.setDate(newWeekStart.getDate() + (7 * direction));
        if (selectedHabit) { 
            return newWeekStart;
        }
        const newSelectedDate = new Date(selectedDate);
        newSelectedDate.setDate(newSelectedDate.getDate() + (7 * direction));
        setSelectedDate(newSelectedDate);
        return newWeekStart;
    });
  }, [selectedDate, selectedHabit]);
  
  const handlePointerDown = (e: React.PointerEvent) => {
    isDraggingRef.current = true;
    dragStartRef.current = e.clientX;
    setTransitionDuration('0s');
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDraggingRef.current || containerWidth === 0) return;
    const currentX = e.clientX;
    dragOffsetRef.current = currentX - dragStartRef.current;
    setTranslateX(-containerWidth + dragOffsetRef.current);
  };
  
  const handlePointerUp = (e: React.PointerEvent) => {
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    if (!isDraggingRef.current || containerWidth === 0) return;
    isDraggingRef.current = false;
    
    setTransitionDuration('0.3s');
    const threshold = containerWidth / 4;
    
    if (dragOffsetRef.current < -threshold) {
      setTranslateX(-containerWidth * 2); 
    } else if (dragOffsetRef.current > threshold) {
      setTranslateX(0); 
    } else {
      setTranslateX(-containerWidth); 
    }
    dragOffsetRef.current = 0;
  };

  const onTransitionEnd = () => {
      if (translateX <= -containerWidth * 2) {
          changeWeek(1);
          setTransitionDuration('0s');
          setTranslateX(-containerWidth);
      } else if (translateX >= 0) {
          changeWeek(-1);
          setTransitionDuration('0s');
          setTranslateX(-containerWidth);
      }
  };

  const isSameDay = (d1: Date, d2: Date) => {
    return d1.getFullYear() === d2.getFullYear() &&
           d1.getMonth() === d2.getMonth() &&
           d1.getDate() === d2.getDate();
  }

  // (↑ スワイプ関連のロジックここまで)

  // --- optimistic updates: ユーザー操作で即時UI反映するためのマップ ---
  const [optimistic, setOptimistic] = useState<Record<string, Habit>>({});

  const getDisplayedHabit = useCallback((h: Habit) => {
    return optimistic[h.id] ?? h;
  }, [optimistic]);

  const selectedDateString = formatDateKey(selectedDate);

  // 表示用の"実効的な"habit（optimistic を優先）を考慮して
  const scheduledHabits = useMemo(() => {
    return habits.filter(h => {
      const eff = getDisplayedHabit(h);
      // 「予定」に該当する or その日に記録済み（予定外で記録したもの）を含める
      return isHabitScheduledForDate(eff, selectedDate) || isHabitCompletedOnDate(eff, selectedDateString);
    });
  }, [habits, selectedDate, selectedDateString, getDisplayedHabit]);

  const nonScheduledHabits = useMemo(() => {
    return habits.filter(h => {
      const eff = getDisplayedHabit(h);
      // 予定に該当せず、かつその日に記録済みでないものだけを「予定外」リストに表示
      return !isHabitScheduledForDate(eff, selectedDate) && !isHabitCompletedOnDate(eff, selectedDateString);
    });
  }, [habits, selectedDate, selectedDateString, getDisplayedHabit]);
  
    // --- 追加: 達成率表示・祝福用 state（明示トリガー方式に変更） ---
    const [showCelebrate, setShowCelebrate] = useState(false);
    const [lastCelebrateKey, setLastCelebrateKey] = useState<string | null>(null);
  
    // completionPercent は optimistic を考慮して計算する
    const displayedScheduled = scheduledHabits.map(h => getDisplayedHabit(h));
    const scheduledCount = displayedScheduled.length;
    const completedCount = displayedScheduled.reduce((acc, h) => acc + (isHabitCompletedOnDate(h, selectedDateString) ? 1 : 0), 0);
    const completionPercent = scheduledCount > 0 ? Math.round((completedCount / scheduledCount) * 100) : 0;
    


    // ① 未完了優先、② 連続記録が長い順 に並べる
    const sortedScheduledHabits = useMemo(() => {
      const list = scheduledHabits.map(h => getDisplayedHabit(h));
      return list.sort((a, b) => {
        const aDone = isHabitCompletedOnDate(a, selectedDateString);
        const bDone = isHabitCompletedOnDate(b, selectedDateString);
        // 未完了を先に
        if (aDone !== bDone) return aDone ? 1 : -1;
        // 連続日数が長い方を上に
        const aStreak = calculateCurrentStreak(a);
        const bStreak = calculateCurrentStreak(b);
        if (bStreak !== aStreak) return bStreak - aStreak;
        // 最後は名前順で安定化
        return (a.name ?? '').localeCompare(b.name ?? '');
      });
    }, [scheduledHabits, selectedDateString, getDisplayedHabit]);

    // 明示的に呼び出して祝福判定を行う（更新後の状態を想定して判定できるようにする）
    const checkAndTriggerCelebrateWith = (maybeUpdatedHabit?: Habit, dateKey?: string) => {
      const dkey = dateKey ?? selectedDateString;
      // 仮想的な habits 配列を作る（もし maybeUpdatedHabit が渡れば置換）
      const hypothetical = maybeUpdatedHabit ? habits.map(h => h.id === maybeUpdatedHabit.id ? maybeUpdatedHabit : h) : habits;
      // しかし判定は optimistic 反映済みの表示状態を優先するため、
      // optimistic を適用した配列を作る
      const hypoWithOptimistic = hypothetical.map(h => optimistic[h.id] ?? h);
      const scheduled = hypoWithOptimistic.filter(h => isHabitScheduledForDate(h, selectedDate));
      const scheduledCountLocal = scheduled.length;
      const completedCountLocal = scheduled.reduce((acc, h) => acc + (isHabitCompletedOnDate(h, dkey) ? 1 : 0), 0);
      const key = `${dkey}-100`;
  
      if (scheduledCountLocal > 0 && completedCountLocal === scheduledCountLocal) {
        // 全部完了なら祝福（重複は lastCelebrateKey で抑止）
        if (lastCelebrateKey !== key) {
          setLastCelebrateKey(key);
          setShowCelebrate(true);
          setTimeout(() => setShowCelebrate(false), 3000);
        }
      } else {
        // full でない状態になったら、その日のキーをクリアしておく（再達成時に再表示させるため）
        if (lastCelebrateKey === key) {
          setLastCelebrateKey(null);
        }
      }
    };
  // ...existing code...

  const isDiagnosisDay = useMemo(() => {
    return isDiagnosisScheduledForDate(diagnosisFrequency, selectedDate);
  }, [diagnosisFrequency, selectedDate]);
  
  // ★ 診断が完了しているかチェックするロジック (★エラー修正★)
  const isDiagnosisCompleted = useMemo(() => {
      // MainAppから渡される energyHistory が undefined の可能性があるため、
      // 安全チェックを追加します (これがエラーの原因です)
      if (!energyHistory) return false; 
      return energyHistory.some(record => record.date === selectedDateString);
  }, [energyHistory, selectedDateString]);

  const isPersonalityDiagnosisDay = useMemo(() => {
    return isDiagnosisScheduledForDate(personalityDiagnosisFrequency, selectedDate);
  }, [personalityDiagnosisFrequency, selectedDate]);

  const isPersonalityCompleted = useMemo(() => {
    return personalityDiagnosisCompletedDates?.includes(selectedDateISO);
  }, [personalityDiagnosisCompletedDates, selectedDateISO]);

  // Firestore に保存された purelifeHistory を参照して selectedDate が実施済みか確認する
  useEffect(() => {
    let mounted = true;
    (async () => {
      // only check when there's a purelife schedule for the day
      if (!hasPurelifeConfig) return;
      if (!isPurelifeDay) return;
      try {
        const uid = auth?.currentUser?.uid ?? null;
        if (!uid) return;
        // query users/{uid}/purelifeHistory where date == selectedDateISO
        const colRef = collection(db, 'users', uid, 'purelifeHistory');
        const q = query(colRef, where('date', '==', selectedDateISO));
        const snap = await getDocs(q);
        if (!mounted) return;
        if (!snap.empty) {
          setLocalPurelifeCompletedDatesState(prev => prev.includes(selectedDateISO) ? prev : [selectedDateISO, ...prev]);
        }
      } catch (e) {
        // ignore - non-fatal
        console.warn('[HabitTracker] failed to check purelifeHistory', e);
      }
    })();
    return () => { mounted = false; };
  }, [selectedDateISO, hasPurelifeConfig, isPurelifeDay]);

  const isPurelifeCompleted = useMemo(() => {
    return (localPurelifeCompletedDates || []).includes(selectedDateISO);
  }, [localPurelifeCompletedDates, selectedDateISO]);


  // (↓ addHabit, deleteHabit, updateHabit, toggleHabit は変更なし)
  // フォーム submit ハンドラ: MainApp 側の onAddHabit(newHabitData) を呼び出す
  const handleAddFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHabitName || !newHabitName.trim()) {
      console.warn('習慣名が必要です');
      return;
    }

    const base: Partial<Habit> = {
      name: newHabitName.trim(),
      detail: newHabitDetails.trim() || undefined,
      type: newHabitType,
      startDate: newHabitStartDate ?? formatDateKey(new Date()),
      frequencyType: newHabitFrequency?.type ?? 'daily',
      frequencyValue: Array.isArray(newHabitFrequency?.value) ? newHabitFrequency.value : (newHabitFrequency?.value ? [newHabitFrequency.value] : []),
      skippedDates: [],
      createdAt: new Date().toISOString(),
    };

    if (newHabitType === 'amount') {
      base.completedAmounts = {};
        // newHabitTarget は number かもしれないため文字列比較は String() で安全化
        if (newHabitTarget !== undefined && newHabitTarget !== null && String(newHabitTarget).trim() !== '') {
          const t = Number(newHabitTarget);
          if (!Number.isNaN(t)) base.target = t;
        }
        if (newHabitUnit !== undefined && newHabitUnit !== null && String(newHabitUnit).trim() !== '') {
          base.unit = String(newHabitUnit).trim();
        }
      } else {
        // binary 等のチェック系: completedDates は配列
        base.completedDates = [];
    }

    try {
      if (onAddHabit) {
        await onAddHabit(base as Omit<Habit, 'id'>);
      } else {
        console.warn('onAddHabit prop is not provided');
      }
      // 成功時はフォームをクリアしてモーダルを閉じる（ローディング状態を触らない）
      setNewHabitName('');
      setNewHabitDetails('');
      setNewHabitStartDate(formatDateKey(new Date()));
      setNewHabitFrequency({ type: 'daily', value: [] });
      setNewHabitType('binary');
      setNewHabitTarget(undefined);
      setNewHabitUnit('');
      setIsAddModalOpen(false);
    } catch (err) {
      console.error('Failed to add habit (via onAddHabit):', err);
    }
  };
  
  const deleteHabit = (habitId: string) => {
    onDeleteHabit(habitId);
  };
  
  const updateHabit = (updatedHabit: Habit) => {
    onUpdateHabit(updatedHabit);
    setSelectedHabit(updatedHabit); 
  };

  // binary は toggle、amount は数値入力で記録
  const recordAmountForHabit = async (habitId: string) => {
    const habit = habits.find(h => h.id === habitId);
    if (!habit) return;
    const dkey = selectedDateString;
    const current = (habit.completedAmounts || {})[dkey];
    setAmountModalHabit(habit);
    setAmountModalValue(current !== undefined ? String(current) : '');
    setIsAmountModalOpen(true);
  };

  // ...existing code...
  const toggleHabit = (habitId: string) => {
    const habitToToggle = habits.find(h => h.id === habitId);
    if (!habitToToggle) return;
    if (habitToToggle.type === 'amount') {
      // amount 型はモーダルで値を記録する
      recordAmountForHabit(habitId);
      return;
    }
    const isCompleted = (habitToToggle.completedDates || []).includes(selectedDateString);
    const updatedHabit: Habit = {
      ...habitToToggle,
      completedDates: isCompleted
        ? (habitToToggle.completedDates || []).filter(date => date !== selectedDateString)
        : [...(habitToToggle.completedDates || []), selectedDateString],
    };
    // optimistic に即時反映してチェックがすぐ付くようにする
    setOptimistic(prev => ({ ...prev, [updatedHabit.id]: updatedHabit }));
    onUpdateHabit(updatedHabit);
    // 更新後の想定状態で祝福判定（optimistic を考慮）
    setTimeout(() => checkAndTriggerCelebrateWith(updatedHabit, selectedDateString), 0);
  };

  // (↓ calculateStreak, handleDateSelect, formattedListDate, handleSelectHabitFromList は変更なし)

  // HabitDetail と同じルール：
  // - まず直近で done または skip が記録されている最新のスケジュール日を見つける
  // - そこを基点に遡り、done -> +1、skip -> 継続(カウントしない)、未記録 -> そこで終了

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    setWeekStart(getWeekStart(date));
    setIsDatePickerOpen(false);
  }
  
  const formattedListDate = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2,'0')}-${String(selectedDate.getDate()).padStart(2,'0')} (${selectedDate.toLocaleDateString('ja-JP', { weekday: 'short' })})`;

  const handleSelectHabitFromList = (habit: Habit) => {
    setSelectedHabit(habit);
    setIsListModalOpen(false);
  };

  // --- モーダル onSave を差し替えて create / update を切替える ---
  // CheckInModal の onSave -> handleSaveCheckin
  const handleSaveCheckin = (value: number, note?: string) => {
    const rec = getCheckinForDate(selectedDate);
    if (rec && onUpdateCheckin) {
      onUpdateCheckin(rec.id, value, note);
    } else if (!rec && onAddCheckin) {
      const dateStr = formatDateKey(selectedDate);
      onAddCheckin(value, note, dateStr);
    }
    setCheckedInToday(true);
  };

  const handleSaveCheckout = (gratitude?: string, note?: string, rating?: number) => {
    const rec = getCheckoutForDate(selectedDate);
    if (rec && onUpdateCheckout) {
      onUpdateCheckout(rec.id, gratitude, note, rating);
    } else if (!rec && onAddCheckout) {
      const dateStr = formatDateKey(selectedDate);
      onAddCheckout(gratitude, note, rating, dateStr);
    }
    setCheckedOutToday(true);
  };

  const recordOrToggleForNonScheduled = async (habit: Habit) => {
    const dkey = formatDateKey(selectedDate);
    if (habit.type === 'amount') {
      // amount はモーダルで入力
      const current = (habit.completedAmounts || {})[dkey];
      setAmountModalHabit(habit);
      setAmountModalValue(current !== undefined ? String(current) : '');
      setIsAmountModalOpen(true);
      setIsNonScheduledOpen(false);
      return;
    }
    const setDates = new Set(habit.completedDates || []);
    if (setDates.has(dkey)) setDates.delete(dkey); else setDates.add(dkey);
    const updated = { ...habit, completedDates: Array.from(setDates).sort() };
    // optimistic 即時反映
    setOptimistic(prev => ({ ...prev, [updated.id]: updated }));
    onUpdateHabit(updated);
    setIsNonScheduledOpen(false);
    // 仮想更新後の状態で祝福判定
    setTimeout(() => checkAndTriggerCelebrateWith(updated, dkey), 0);
  };

  const toggleSkipForDate = (habit: Habit) => {
    const dkey = formatDateKey(selectedDate);
    const skips = habit.skippedDates ?? [];
    const exists = skips.includes(dkey);
    const newSkips = exists ? skips.filter(s => s !== dkey) : [...skips, dkey];
    onUpdateHabit({ ...habit, skippedDates: newSkips });
  };

  // モーダル
  const saveAmountModal = () => {
    if (!amountModalHabit) return;
    const dkey = selectedDateString;
    const parsed = amountModalValue.trim() === '' ? null : Number(amountModalValue.replace(',', '.'));
    if (parsed !== null && isNaN(parsed)) { alert('数値を入力してください'); return; }
    const newAmounts = { ...(amountModalHabit.completedAmounts || {}) };
    if (parsed === null) delete newAmounts[dkey]; else newAmounts[dkey] = parsed;
    const updated = { ...amountModalHabit, completedAmounts: newAmounts };
    // optimistic 即時反映
    setOptimistic(prev => ({ ...prev, [updated.id]: updated }));
    onUpdateHabit(updated);
    setIsAmountModalOpen(false);
    setAmountModalHabit(null);
    setAmountModalValue('');
    // 数値記録後に祝福判定
    setTimeout(() => checkAndTriggerCelebrateWith(updated, dkey), 0);
  };

  const cancelAmountModal = () => {
    setIsAmountModalOpen(false);
    setAmountModalHabit(null);
    setAmountModalValue('');
  };
  
  // --- JSX (変更なし) ---
  return (
    <>
       <div className="space-y-6 pb-24"> {/* 下部固定バー + 下部タブ分の余白を確保 */}
          {/* コンパクト化したヘッダー + チェックイン領域（スペースを詰める） */}
          <div className="bg-white py-2 px-3 rounded-lg border border-gray-200">
            <div className="flex items-center w-full gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <h2 className="text-lg md:text-xl font-bold text-gray-800 truncate">{formattedListDate}</h2>
                <button
                  onClick={() => setIsDatePickerOpen(true)}
                  className="inline-flex items-center gap-2 px-2 py-1 rounded-md bg-white border border-gray-200 hover:bg-gray-50"
                  aria-label="日付を選択"
                  title="日付を選択"
                >
                  <CalendarIcon className="w-5 h-5 text-indigo-600" />
                </button>
                <button
                  onClick={() => handleDateSelect(new Date())}
                  className="inline-flex items-center gap-2 px-2 py-1 rounded-md bg-white border border-gray-200 hover:bg-gray-50"
                  title="今日に移動"
                  aria-label="今日に移動"
                >
                  <span className="text-sm text-gray-800">今日</span>
                </button>
              </div>
              <div className="flex-1" />

              <div className="flex items-center gap-2 flex-shrink-0">
                <button onClick={() => setIsListModalOpen(true)} className="text-gray-400 hover:text-indigo-600 transition-colors" aria-label="習慣リスト">
                  <ListBulletIcon className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
          
            <CheckInModal
              isOpen={isCheckInOpen}
              onClose={() => setIsCheckInOpen(false)}
              onSave={(v,n) => { handleSaveCheckin(v,n); }}
              initial={checkinDraft}
            />
            <CheckOutModal
              isOpen={isCheckOutOpen}
              onClose={() => setIsCheckOutOpen(false)}
              onSave={(g,n,r) => { handleSaveCheckout(g,n,r); }}
              initial={checkoutDraft}
            />
            <DatePickerModal 
                isOpen={isDatePickerOpen}
                onClose={() => setIsDatePickerOpen(false)}
                onDateSelect={handleDateSelect}
                initialDate={selectedDate}
                habits={habits}
            />
            <HabitListModal 
                isOpen={isListModalOpen}
                onClose={() => setIsListModalOpen(false)}
                habits={habits}
                onSelectHabit={handleSelectHabitFromList}
            />
            
            {/* 追加ボタン： +を押すと左・上に丸ボタンを展開 */}
            <div ref={fabRef} className="fixed z-40 right-4 bottom-28 flex flex-col items-end" aria-hidden={!fabOpen}>
              {/* 子ボタンは fabOpen が true のときのみレンダリングして、リストと重ならないように十分な間隔を確保 */}
              {fabOpen && (
                <div className="flex flex-col items-end space-y-3 mb-6">

                  {/* 学習ボタン（ADMIN のみ表示）: アイコンとテキストを中央揃え */}
                  {isAdmin && (
                    <button
                      onClick={() => {
                        // タイトル入力は Learnings のフルスクリーン編集側で行うため、ここでは view 切替とイベント送出のみ
                        setFabOpen(false);
                        setView?.('learnings');
                        // 少し待ってからイベント送出（Learnings がマウントされるタイミングに合わせる）
                        setTimeout(() => {
                          try { window.dispatchEvent(new CustomEvent('open-learning-editor')); } catch { /* noop */ }
                        }, 60);
                      }}
                      className="flex items-center gap-3 px-3 py-2 rounded-lg bg-white border border-gray-200 shadow-sm hover:bg-gray-50"
                      title="学習を追加"
                    >
                      <span className="w-8 h-8 flex items-center justify-center rounded-md bg-blue-50 text-blue-700 font-semibold">
                        <ScholarIconSmall className="w-5 h-5" />
                      </span>
                      <span className="text-sm font-medium text-gray-800">学習を追加</span>
                    </button>
                  )}

                  {/* メモボタン：他の操作ボタン（チェックイン等）に合わせた外観 */}
                  <button
                    onClick={() => {
                      // set pending flag so Notes can open creator even if it mounts slightly after navigation
                      setFabOpen(false);
                      try { (window as any).__openNoteCreatorPending = true; } catch { /* noop */ }
                      setView('notes');
                      // also dispatch event after a short delay to handle fast mounts
                      setTimeout(() => {
                        try { window.dispatchEvent(new CustomEvent('open-note-creator')); } catch {}
                      }, 120);
                    }}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg bg-white border border-gray-200 shadow-sm hover:bg-gray-50"
                    aria-label="メモを追加"
                    title="メモを追加"
                  >
                    <span className="w-8 h-8 flex items-center justify-center rounded-md bg-amber-50 text-amber-700 font-semibold">✎</span>
                    <span className="text-sm font-medium text-gray-800">メモを追加</span>
                  </button>

                  {/* タスクボタン：他の操作ボタン（チェックイン等）に合わせた外観 */}
                  <button
                    onClick={() => { setIsTaskModalOpen(true); setFabOpen(false); }}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg bg-white border border-gray-200 shadow-sm hover:bg-gray-50"
                    aria-label="タスクを追加"
                    title="タスクを追加"
                  >
                    <span className="w-8 h-8 flex items-center justify-center rounded-md bg-amber-50 text-amber-700 font-semibold">
                      <ListBulletIcon className="w-5 h-5" />
                    </span>
                    <span className="text-sm font-medium text-gray-800">タスクを追加</span>
                  </button>

                  {/* 習慣ボタン：全体のトーンに合わせたデザイン */}
                  <button
                    onClick={() => { setIsAddModalOpen(true); setFabOpen(false); }}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg bg-white border border-gray-200 shadow-sm hover:bg-gray-50"
                    aria-label="習慣を追加"
                    title="習慣を追加"
                  >
                    <span className="w-8 h-8 flex items-center justify-center rounded-md bg-indigo-50 text-indigo-600 font-semibold">＋</span>
                    <span className="text-sm font-medium text-gray-800">習慣を追加</span>
                  </button>

                </div>
              )}
            </div>
            
            {/* メインコンテンツ */}
            <div className="">
              {/* --- 診断カード（最上部） --- */}
              <div className="mb-6">

                {/* エネルギー診断 */}
                {isDiagnosisDay && (
                  <div
                    onClick={() => !isDiagnosisCompleted && setView('diagnosis')}
                    className={`flex items  -center p-4 shadow-sm rounded-lg transition ${isDiagnosisCompleted ? 'bg-green-50 hover:bg-green-100 cursor-default' : 'bg-indigo-50 hover:bg-indigo-100 cursor-pointer'}`}
                  >
                    {isDiagnosisCompleted ? <CheckCircleIcon className="w-6 h-6 text-green-600" /> : <DiagnosisIcon className="w-6 h-6 text-indigo-600" />}
                    <span className={`flex-grow mx-4 text-lg font-semibold ${isDiagnosisCompleted ? 'line-through text-gray-500' : 'text-indigo-800'}`}>
                      エネルギーを診断する
                    </span>
                    {!isDiagnosisCompleted && <ChevronRightIcon className="w-6 h-6 text-indigo-600" />}
                  </div>
                )}

                {/* パーソナリティ診断：設定した頻度に基づき表示・無効化 */}
                {isPersonalityDiagnosisDay && (
                  <div
                    onClick={() => !isPersonalityCompleted && setView?.('personality')}
                    className={`mt-2 flex items-center p-4 shadow-sm rounded-lg transition ${isPersonalityCompleted ? 'bg-green-50 hover:bg-green-100 cursor-default' : 'bg-purple-50 hover:bg-purple-100 cursor-pointer'}`}
                    style={{ marginTop: '0.4rem' }}
                  >
                    {isPersonalityCompleted ? <CheckCircleIcon className="w-6 h-6 text-green-600" /> : <BrainIcon className="w-6 h-6 text-purple-600" />}
                    <span className={`flex-grow mx-4 text-lg font-semibold ${isPersonalityCompleted ? 'line-through text-gray-500' : 'text-purple-800'}`}>
                      パーソナリティを診断する
                    </span>
                    {!isPersonalityCompleted && <ChevronRightIcon className="w-6 h-6 text-purple-600" />}
                  </div>
                )}

                {/* purelife 診断：設定した頻度に基づき表示・無効化 */}
                {hasPurelifeConfig && isPurelifeDay && (
                  <div
                    onClick={() => {
                      if (isPurelifeCompleted) return;
                      if (typeof onOpenPurelife === 'function') { onOpenPurelife(); }
                      else { setView('purelife'); }
                    }}
                    className={`mt-2 flex items-center p-4 shadow-sm rounded-lg transition ${isPurelifeCompleted ? 'bg-green-50 hover:bg-green-100 cursor-default' : 'bg-teal-50 hover:bg-teal-100 cursor-pointer'}`}
                    style={{ marginTop: '0.4rem' }}
                  >
                    {isPurelifeCompleted ? <CheckCircleIcon className="w-6 h-6 text-green-600" /> : <DiagnosisIcon className="w-6 h-6 text-teal-600" />}
                    <span className={`flex-grow mx-4 text-lg font-semibold ${isPurelifeCompleted ? 'line-through text-gray-500' : 'text-teal-800'}`}>
                      purelife診断を実施する
                    </span>
                    {!isPurelifeCompleted && <ChevronRightIcon className="w-6 h-6 text-teal-600" />}
                  </div>
                )}

                {/* ★ Value Diagnosis カード */}
                {valueDiagnosisFrequency && isDiagnosisScheduledForDate(valueDiagnosisFrequency, selectedDate) && (
                  <div
                    onClick={() => {
                      if (valueDiagnosisCompletedDates?.includes(selectedDateISO)) return;
                      onOpenValueDiagnosis?.();
                    }}
                    className={`mt-2 flex items-center p-4 shadow-sm rounded-lg transition ${valueDiagnosisCompletedDates?.includes(selectedDateISO) ? 'bg-green-50 hover:bg-green-100 cursor-default' : 'bg-blue-50 hover:bg-blue-100 cursor-pointer'}`}
                  >
                    {valueDiagnosisCompletedDates?.includes(selectedDateISO) ? <CheckCircleIcon className="w-6 h-6 text-green-600" /> : <BrainIcon className="w-6 h-6 text-blue-600" />}
                    <span className={`flex-grow mx-4 text-lg font-semibold ${valueDiagnosisCompletedDates?.includes(selectedDateISO) ? 'line-through text-gray-500' : 'text-blue-800'}`}>
                      価値観を診断する
                    </span>
                    {!valueDiagnosisCompletedDates?.includes(selectedDateISO) && <ChevronRightIcon className="w-6 h-6 text-blue-600" />}
                  </div>
                )}
                
              </div>

              {dueTasks.length === 0 ? (<></>) : (
                <>
                  <div className="flex items-center justify-between mb-2">
                    <h3>タスクリスト</h3>
                  </div>
                  {/* --- 本日のタスク（診断の下） --- */}
                  <div className="mb-4">
                    <div className="space-y-2">
                      {dueTasks.map(t => (
                        <div
                          key={t.id}
                          onClick={() => setSelectedTask(t)}
                          className={`flex items-center gap-3 p-3 border shadow-sm ${t.done ? 'opacity-80' : ''} bg-amber-50 border-amber-100 rounded-md`}
                        >
                          <input
                            type="checkbox"
                            checked={!!t.done}
                            onChange={async (e) => {
                              e.stopPropagation();
                              const next = e.target.checked;
                              await handleToggleTaskLocal(t.id, next);
                            }}
                            className="w-5 h-5 cursor-pointer"
                            aria-label={`タスク完了: ${t.title}`}
                            onClick={e => e.stopPropagation()}
                          />

                          <div className="flex-1 min-w-0">
                            <div className={`text-sm font-medium ${t.done ? 'line-through text-gray-500' : 'text-gray-900'}`}>{t.title}</div>
                            {t.details ? <div className="text-xs text-gray-600 truncate mt-1">{t.details}</div> : null}
                          </div>

                          <div className="flex items-center gap-2 ml-3">
                            {t.dueDate ? <div className="text-xs text-gray-500">{new Date(t.dueDate).toLocaleDateString('ja-JP', { month: '2-digit', day: '2-digit' })}</div> : null}
                            <div className={`text-xs px-2 py-0.5 rounded-full font-semibold ${t.priority === 'high' ? 'bg-red-100 text-red-700' : t.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>
                              {t.priority === 'high' ? '高' : t.priority === 'medium' ? '中' : '低'}
                            </div>
                            {/* Task badge to visually distinguish from habits */}
                            <div className="ml-2 text-xs px-2 py-0.5 bg-amber-200 text-amber-800 rounded-full font-medium">タスク</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
              
              {/* 既存: 習慣リスト（タスクの下） */}
              <div className="flex items-center justify-between mb-2">
                <h3>習慣リスト</h3>
                <div className="flex items-baseline gap-3">
                  {/* 達成率バッジ */}
                  <div className={`ml-3 inline-flex items-center gap-2 px-3 py-1 rounded-full font-semibold ${completionPercent === 100 ? 'bg-indigo-600 text-white' : 'bg-white border border-gray-200 hover:bg-gray-50'}`}>
                    <div className={`w-3 h-3 rounded-full ${completionPercent === 100 ? 'bg-white' : (completionPercent >= 75 ? 'bg-green-500' : completionPercent >= 40 ? 'bg-yellow-400' : 'bg-gray-400')}`} />
                    <span className="text-sm">{completionPercent}%</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                      onClick={() => setIsNonScheduledOpen(true)}
                      className="flex items-center gap-2 text-sm px-3 py-1 bg-white border border-gray-200 rounded-md hover:bg-gray-50"
                      title="予定外の習慣を記録"
                  >
                    <ListBulletIcon className="w-4 h-4 text-gray-600" />
                    <span className="text-sm text-gray-700">予定外</span>
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                  {/* チェックイン／チェックアウトをヘッダー内に収め、パディングを小さく */}
                  <div className="mb-2 flex items-center justify-start gap-2">
                    <button
                      onClick={() => setIsCheckInOpen(true)}
                      className={`flex flex-1 items-center gap-2 px-4 py-2 shadow-sm rounded-md text-sm transition ${checkedInToday ? 'bg-green-50 border border-green-300' : 'bg-gray-50 hover:bg-gray-100'}`}
                      aria-pressed={checkedInToday}
                    >
                      <SunIcon className={`w-4 h-4 ${checkedInToday ? 'text-green-600' : 'text-gray-600'}`} />
                      <span className="text-sm font-medium text-gray-800">チェックイン</span>
                      {checkedInToday && <CheckCircleIcon className="w-4 h-4 text-green-600 ml-1" />}
                    </button>
                    <button
                      onClick={() => setIsCheckOutOpen(true)}
                      className={`flex flex-1 items-center gap-2 px-4 py-2 shadow-sm rounded-md text-sm transition ${checkedOutToday ? 'bg-blue-50 border border-blue-300' : 'bg-gray-50 hover:bg-gray-1000'}`}
                      aria-pressed={checkedOutToday}
                    >
                      <MoonIcon className={`w-4 h-4 ${checkedOutToday ? 'text-blue-600' : 'text-gray-600'}`} />
                      <span className="text-sm font-medium text-gray-800">チェックアウト</span>
                      {checkedOutToday && <CheckCircleIcon className="w-4 h-4 text-blue-600 ml-1" />}
                    </button>
                  </div>
                  {sortedScheduledHabits.length > 0 ? (
                      sortedScheduledHabits.map(habit => {
                        // habit は optimistic を反映した表示用オブジェクト（getDisplayedHabit を使っている useMemo の結果）
                        const habitType = (habit.type ?? 'binary');
                        const isCompleted = isHabitCompletedOnDate(habit, selectedDateString);
                        const amountVal = (habit.completedAmounts || {})[selectedDateString] ?? 0;
                        const isSkipped = ((habit.skippedDates || []) .map(normalizeKey)).includes(selectedDateString);
                        const streak = calculateCurrentStreak(habit);

                        return (
                          <div 
                              key={habit.id} 
                              onClick={() => setSelectedHabit(habit)}
                              className={`flex items-center p-3 shadow-sm rounded-lg transition cursor-pointer ${isCompleted ? 'bg-green-50 hover:bg-green-100' : 'bg-gray-50 hover:bg-gray-100'}`}
                          >
                              <input
                                type="checkbox"
                                checked={habitType === 'binary' ? isCompleted : Boolean(amountVal)}
                                onChange={() => toggleHabit(habit.id)}
                                className="h-5 w-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                onClick={e => e.stopPropagation()}
                              />
                              <span className={`flex-grow mx-3 text-base md:text-lg ${isCompleted ? 'line-through text-gray-500' : 'text-gray-800'}`}>
                                {habit.name}
                              </span>
                              {isSkipped && (
                                <div className="ml-2 text-xs px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full font-semibold">スキップ</div>
                              )}

                              <div className="flex items-center gap-3">
                                {habitType === 'amount' && (
                                  <div className="text-sm text-gray-700 font-semibold">
                                    {amountVal}{habit.unit ? `${habit.unit}` : ''}{habit.target ? ` / ${habit.target}` : ''}
                                  </div>
                                )}
                                {streak > 0 && <span className="text-orange-500 font-bold text-sm md:text-base mr-3">🔥 {streak}日</span>}
                              </div>
                          </div>
                        );
                      })
                  ) : (
                    (habits.length > 0 && !isDiagnosisDay) && <p className="text-gray-500 text-center py-4">今日やるべき習慣はありません。新しい習慣を追加するか、日付を変更してください。</p>
                  )}
                  {habits.length === 0 && !isDiagnosisDay && (
                    <p className="text-gray-500 text-center py-4">まだ習慣がありません。右下の＋ボタンから新しい習慣を追加して始めましょう！</p>
                  )}
              </div>
            </div>
            
            {/* 数量入力モーダル: system prompt の代替 */}
            {isAmountModalOpen && amountModalHabit && (
              <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50" onClick={cancelAmountModal}>
                <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <div className="text-lg font-semibold text-gray-900">{amountModalHabit.name}</div>
                      <div className="text-sm text-gray-600">{selectedDate.toLocaleDateString()}</div>
                    </div>
                    <button onClick={cancelAmountModal} className="text-gray-500 text-2xl leading-none">&times;</button>
                  </div>
                  <form onSubmit={(e) => { e.preventDefault(); saveAmountModal(); }}>
                    <label className="block text-sm text-gray-700 mb-2">達成量（{amountModalHabit.unit ?? ''}）</label>
                    <input autoFocus value={amountModalValue} onChange={e => setAmountModalValue(e.target.value)} className="w-full p-3 border border-gray-300 rounded-md mb-3" />
                    <div className="flex justify-end gap-2">
                      <button type="button" onClick={cancelAmountModal} className="px-4 py-2 rounded-lg bg-gray-100 text-sm">キャンセル</button>
                      <button type="submit" className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm">保存</button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* 習慣追加モーダル */}
            {isAddModalOpen && (
              <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={() => setIsAddModalOpen(false)}>
                  <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
                      <h2 className="text-xl font-bold text-gray-800 mb-4">新しい習慣を追加</h2>
                      <form onSubmit={handleAddFormSubmit} className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">習慣の名前</label>
                          <input
                            type="text"
                            value={newHabitName}
                            onChange={e => setNewHabitName(e.target.value)}
                            placeholder="例: 10分間瞑想する"
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition bg-white text-gray-900"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">詳細（任意）</label>
                          <textarea
                            ref={newHabitDetailsRef}
                            value={newHabitDetails}
                            onInput={e => autoGrowTextArea(e.currentTarget as HTMLTextAreaElement)}
                            onChange={e => setNewHabitDetails(e.target.value)}
                            placeholder="例: 朝の10分で深呼吸しながら行う"
                            rows={3}
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition bg-white text-gray-900 resize-none"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">開始日</label>
                          <input
                            type="date"
                            value={newHabitStartDate}
                            onChange={e => setNewHabitStartDate(e.target.value)}
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition bg-white text-gray-900"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">頻度</label>
                          <select 
                            value={newHabitFrequency.type} 
                            onChange={e => setNewHabitFrequency({type: e.target.value as FrequencyType, value: []})}
                            className="w-full p-3 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
                          >
                            <option value="daily">毎日</option>
                            <option value="weekly">週次</option>
                            <option value="monthly">月次</option>
                          </select>
                        </div>
                        {newHabitFrequency.type === 'weekly' && (
                          <div className="flex justify-center gap-1">
                            {WEEK_DAYS.map((day, index) => (
                              <button type="button" key={index}
                                onClick={() => {
                                  const newValue = newHabitFrequency.value.includes(index)
                                    ? newHabitFrequency.value.filter(d => d !== index)
                                    : [...newHabitFrequency.value, index];
                                  setNewHabitFrequency(prev => ({...prev, value: newValue.sort()}));
                                }}
                                className={`w-10 h-10 rounded-full font-semibold transition-colors ${newHabitFrequency.value.includes(index) ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-700'}`}
                              >{day}</button>
                            ))}
                          </div>
                        )}
                        {newHabitFrequency.type === 'monthly' && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">日付を選択 (カンマ区切り)</label>
                              <input
                                  type="text"
                                  placeholder="例: 1, 15"
                                  defaultValue={newHabitFrequency.value.join(', ')}
                                  onChange={e => {
                                      const value = e.target.value.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n) && n >= 1 && n <= 31);
                                      setNewHabitFrequency(prev => ({...prev, value: value.sort((a,b) => a-b)}))
                                  }}
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition bg-white text-gray-900"
                              />
                          </div>
                        )}

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">タイプ</label>
                            <div className="flex items-center gap-3">
                              <label className="flex items-center gap-2">
                                <input type="radio" name="habitType" value="binary" checked={newHabitType==='binary'} onChange={() => setNewHabitType('binary')} />
                                <span className="text-sm">1回でも実施</span>
                              </label>
                              <label className="flex items-center gap-2">
                                <input type="radio" name="habitType" value="amount" checked={newHabitType==='amount'} onChange={() => setNewHabitType('amount')} />
                                <span className="text-sm">規定量の実施</span>
                              </label>
                            </div>
                        </div>
                        {newHabitType === 'amount' && (
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">目標値</label>
                              <input type="number" value={newHabitTarget ?? ''} onChange={e => setNewHabitTarget(e.target.value === '' ? undefined : Number(e.target.value))} className="w-full p-3 border border-gray-300 rounded-lg" />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">単位</label>
                              <input type="text" value={newHabitUnit} onChange={e => setNewHabitUnit(e.target.value)} placeholder="例: km, 分, 回" className="w-full p-3 border border-gray-300 rounded-lg" />
                            </div>
                          </div>
                        )}

                        <div className="flex justify-end gap-2 pt-2">
                          <button type="button" onClick={() => setIsAddModalOpen(false)} className="px-4 py-2 rounded-lg text-gray-600 hover:bg-gray-100">キャンセル</button>
                          <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow">追加</button>
                        </div>
                      </form>
                  </div>
              </div>
            )}

            {/* /* Task add modal */}
            {isTaskModalOpen && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setIsTaskModalOpen(false)}>
                <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold">タスクを追加</h3>
                    <button onClick={() => setIsTaskModalOpen(false)} className="text-gray-500">閉じる</button>
                  </div>
                  <div className="space-y-3">
                    <input value={taskTitle} onChange={e => setTaskTitle(e.target.value)} placeholder="タイトル" className="w-full p-2 border border-gray-200 rounded" />
                    <textarea value={taskDetails} onChange={e => setTaskDetails(e.target.value)} placeholder="詳細" rows={3} className="w-full p-2 border border-gray-200 rounded" />
                    <div className="flex items-center gap-2">
                      <input type="date" value={taskDueDate} onChange={e => setTaskDueDate(e.target.value)} className="p-2 border border-gray-200 rounded" />
                      <select value={taskPriority} onChange={e => setTaskPriority(e.target.value as any)} className="p-2 border border-gray-200 rounded text-sm">
                        <option value="low">低</option>
                        <option value="medium">中</option>
                        <option value="high">高</option>
                      </select>
                      <div className="flex-1" />
                      <button onClick={submitTask} className="px-4 py-2 bg-indigo-600 text-white rounded">追加</button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 予定外タスク用モーダル */}
            {isNonScheduledOpen && (
              <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50" onClick={() => setIsNonScheduledOpen(false)}>
                <div className="bg-white rounded-xl w-full max-w-md p-4" onClick={e => e.stopPropagation()}>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-semibold">予定外タスクをこの日で記録</h3>
                    <button onClick={() => setIsNonScheduledOpen(false)} className="text-gray-500 text-2xl leading-none">&times;</button>
                  </div>
                  <div className="space-y-2 max-h-[60vh] overflow-auto pr-2">
                    {nonScheduledHabits.length === 0 ? (
                      <p className="text-gray-500 text-center py-6">この日は予定外の習慣はありません。</p>
                    ) : nonScheduledHabits.map(h => {
                      const isSkipped = (h.skippedDates || []).includes(selectedDateString);
                      return (
                        <div key={h.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div>
                            <div className="font-medium text-gray-800">{h.name}</div>
                            <div className="text-xs text-gray-500">{h.frequencyType === 'weekly' ? '週次' : h.frequencyType === 'monthly' ? '月次' : '毎日'}</div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button onClick={() => recordOrToggleForNonScheduled(h)} className="px-3 py-2 bg-indigo-600 text-white rounded-md text-sm">記録</button>
                            <button onClick={() => toggleSkipForDate(h)} className={`px-3 py-2 rounded-md text-sm ${isSkipped ? 'bg-yellow-100 text-yellow-800' : 'bg-white border border-gray-200'}`}>
                              {isSkipped ? 'skip解除' : 'skip'}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* タスク編集モーダル */}
            {selectedTask && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setSelectedTask(null)}>
                <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold">タスクを編集</h3>
                    <button onClick={() => setSelectedTask(null)} className="text-gray-500">閉じる</button>
                  </div>

                  <div className="space-y-3">
                    <input value={editTitle} onChange={e => setEditTitle(e.target.value)} placeholder="タイトル" className="w-full p-2 border border-gray-200 rounded" />
                    <textarea value={editDetails} onChange={e => setEditDetails(e.target.value)} placeholder="詳細" rows={3} className="w-full p-2 border border-gray-200 rounded" />
                    <div className="flex items-center gap-2">
                      <input type="date" value={editDueDate} onChange={e => setEditDueDate(e.target.value)} className="p-2 border border-gray-200 rounded" />
                      <select value={editPriority} onChange={e => setEditPriority(e.target.value as any)} className="p-2 border border-gray-200 rounded text-sm">
                        <option value="low">低</option>
                        <option value="medium">中</option>
                        <option value="high">高</option>
                      </select>
                      <label className="inline-flex items-center gap-2 ml-auto text-sm">
                        <input type="checkbox" checked={editDone} onChange={e => setEditDone(e.target.checked)} />
                        完了
                      </label>
                    </div>
                    <div className="flex justify-end gap-2">
                      <button onClick={() => setSelectedTask(null)} className="px-3 py-2 rounded-md bg-gray-100">キャンセル</button>
                      <button onClick={deleteTaskConfirm} className="px-3 py-2 rounded-md bg-red-50 text-red-600">削除</button>
                      <button onClick={saveTaskEdits} className="px-4 py-2 rounded-md bg-indigo-600 text-white">保存</button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 祝福オーバーレイ（completionPercent === 100 の場合に一時表示） */}
            {showCelebrate && (
              <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/30 pointer-events-auto">
                <style>{`
                  @keyframes floatUp {
                    0% { transform: translateY(0) scale(1); opacity: 1; }
                    100% { transform: translateY(-140vh) scale(1.1); opacity: 0; }
                  }
                  .confetti {
                    position: absolute;
                    bottom: 10%;
                    font-size: 28px;
                    animation-name: floatUp;
                    animation-timing-function: cubic-bezier(.18,.9,.35,1);
                    animation-iteration-count: 1;
                  }
                `}</style>
                <div className="w-full max-w-3xl mx-auto px-4">
                  <div className="bg-gradient-to-r from-indigo-500 to-pink-500 text-white rounded-2xl shadow-2xl px-6 py-10 md:py-16 animate-fade-in">
                    <div className="text-center">
                      <div className="text-2xl md:text-2xl font-extrabold leading-tight">🎉 おめでとう！100%達成 🎉</div>
                      <div className="mt-4 text-lg md:text-xl opacity-95">今日もよく頑張りましたね！</div>
                    </div>
                  </div>
                  {['✨','🎊','💫','🌟','🎉','✨','🎈','⭐️'].map((emo, i) => (
                    <span
                      key={i}
                      className="confetti"
                      style={{
                        left: `${8 + (i * 11) % 84}%`,
                        animationDuration: `${1800 + (i * 200)}ms`,
                        animationDelay: `${200 + (i * 120)}ms`,
                        transform: `translateY(0) rotate(${(i*30)%360}deg)`
                      }}
                    >
                      {emo}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {selectedHabit && (
                <HabitDetail habit={selectedHabit} onClose={() => setSelectedHabit(null)} onDelete={deleteHabit} onUpdate={updateHabit} />
            )}
      </div>

      {/* 下部固定バー：週表示 + 右端に追加ボタン（既存 FAB と被らない配置） */}
      <div className="fixed bottom-18 left-0 right-0 bg-white border-t border-gray-100 shadow-md z-40">
        <div className="max-w-4xl mx-auto px-2 py-2 flex items-center gap-1">
          <div className="flex items-center">
            {/* 矢印を小さくしてスペースを節約 */}
            <button onClick={() => changeWeek(-1)} className="p-1 rounded-md hover:bg-gray-100" aria-label="前の週へ">
              <ChevronLeftIcon className="w-4 h-4 text-gray-600" />
            </button>
          </div>

          <div className="flex-1">
            {/* 7列グリッドにして余白を削減、各日を均等表示 */}
            <div className="grid grid-cols-7 gap-1 items-center">
              {currentWeekDays.map(d => {
                const isSel = isSameDay(d, selectedDate);
                const percent = calculateCompletionPercentForDate(d, habits); // 0..100
                const btnClass = isSel ? 'bg-indigo-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50';
                return (
                  <button
                    key={d.toISOString()}
                    onClick={() => handleDateSelect(d)}
                    className={`flex flex-col items-center justify-center w-full py-1 rounded-md ${btnClass}`}
                    title={`${d.toLocaleDateString('ja-JP')} - 完了率 ${percent}%`}
                    aria-pressed={isSel}
                  >
                    <span className={`text-xs ${isSel ? 'text-white/90' : 'text-gray-500'}`}>{d.toLocaleDateString('ja-JP', { weekday: 'short' })}</span>
                    <span className={`text-sm font-semibold ${isSel ? 'text-white' : 'text-gray-800'}`}>{d.getDate()}</span>
                    <div className="h-2 mt-1 flex items-center justify-center">
                      {percent > 0 ? (
                        <div
                          className={`w-1.5 h-1.5 rounded-full ${percent >= 100 ? 'bg-green-500' : percent >= 40 ? 'bg-yellow-400' : 'bg-gray-400'}`}
                          style={isSel ? { boxShadow: '0 0 0 2px rgba(255,255,255,0.12)' } : undefined}
                        />
                      ) : null}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        
          <div className="flex items-center gap-2">
            {/* 右矢印も小さめに */}
            <button onClick={() => changeWeek(1)} className="p-1 rounded-md hover:bg-gray-100" title="次の週へ" aria-label="次の週へ">
              <ChevronRightIcon className="w-4 h-4 text-gray-600" />
            </button>

            {/* 区切り線（'|'） */}
            <div className="w-px bg-gray-300 h-12" aria-hidden />

            {/* 右端の追加ボタン（小さめ・バー内） */}
            <button
              onClick={() => setFabOpen(v => !v)}
              className="w-12 h-12 rounded-full flex items-center justify-center bg-indigo-600 text-white shadow-md"
              aria-label="追加メニュー"
              title="追加メニュー"
            >
              <PlusIcon className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default HabitTracker;
