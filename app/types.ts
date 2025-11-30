export type View =
  | 'diagnosis'
  | 'personality'
  | 'purelife'
  | 'value'
  | 'habits'
  | 'groups'
  | 'records'
  | 'analytics'
  | 'notifications'
  | 'tasks'
  | 'notes'
  | 'learnings';

export type DriverKey = 'ACH' | 'CRE' | 'CON' | 'SEC' | 'TRU' | 'JOY';

export type FrequencyType = 'daily' | 'weekly' | 'monthly' | 'custom';

export interface Profile {
  id: string;
  displayName?: string;
  habits?: Habit[];
  imageUrl?: string | null;
}

export type EnergyCategory = 'physical' | 'mental' | 'emotional' | 'intellectual';

export interface EnergyRecord extends EnergyScores {
  date: string;
}

export interface Habit {
  id: string;
  name: string;
  title?: string; // 旧データ互換用
  label?: string; // 旧データ互換用
  detail?: string;
  createdAt?: string;
  startDate?: string;
  frequencyType: FrequencyType;
  frequencyValue: number[] | string;
  type?: 'amount' | 'boolean';
  targetAmount?: number;
  target?: number;
  completedDates?: string[];
  completedAmounts?: Record<string, number>;
  skippedDates?: string[];
}

export interface EnergyScores {
  physical: number;
  mental: number;
  emotional: number;
  intellectual: number;
}

export interface DiagnosisFrequency {
  frequencyType: FrequencyType;
  frequencyValue?: number[];
}

export interface Friend {
  id: string;
  displayName?: string;
  habits?: Habit[];
  imageUrl?: string | null;
}

export interface Group {
  id: string;
  name: string;
  members: string[];
  ownerId?: string;
  sharedByMember?: Record<string, string[]>;
  sharedHabitIds?: string[];
}

export interface Comment {
  id: string;
  groupId: string;
  text: string;
  authorId: string;
  authorName: string;
  authorImageUrl?: string | null;
  timestamp: string;
}

export interface Notification {
  id: string;
  groupId?: string | null;
  groupName?: string | null;
  message?: string | null;
  authorName?: string | null;
  createdAt?: string;
  isRead?: boolean;
}

export interface Advice {
  title: string;
  points: string[];
}

export interface Task {
  id: string;
  title: string;
  details?: string;
  dueDate?: string;
  priority?: 'low' | 'medium' | 'high';
  done?: boolean;
  createdAt?: string;
  updatedAt?: string;
  completedAt?: string | null;
}

export interface Checkin {
  id: string;
  date: string;
  value: number;
  note?: string;
  createdAt?: string;
}

export interface Checkout {
  id: string;
  date: string;
  gratitude?: string;
  note?: string;
  rating?: number | null;
  createdAt?: string;
}

export interface LearningItem {
  id: string;
  title: string;
  url?: string;
  notes?: string;
  tags?: string[];
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
}

export interface Question {
  id: string;
  text: string;
  isReversed: boolean;
}

export type EnergyQuestionnaire = {
  [key in EnergyCategory]: Question[];
};
export type ValueAnswersMap = Record<string, number>;
export type PersonalityDimension = "EI" | "SN" | "TF" | "JP";
export type PersonalityAnswerValue = 1 | 2 | 3 | 4 | 5;
export type PurelifeAnswersMap = Record<string, number>;

export interface ValueResultRecord {
  id: string;
  date: string;
  scores: Record<DriverKey, number>;
  type: string;
  top1: DriverKey;
  top2: DriverKey;
  answers?: ValueAnswersMap;
  createdAt: string;
}

export interface PersonalityQuestion {
  id: number;
  text: string;
  dimension: PersonalityDimension;
  direction: "positive" | "negative";
}

export interface PersonalityHistoryRecord {
  id: string;
  date: string;
  type: string;
  percents: Record<PersonalityDimension, number>;
  strength: Record<PersonalityDimension, number>;
  answers?: Record<number, PersonalityAnswerValue>;
  createdAt?: string;
}

export interface RecommendedHabit {
  energy: EnergyCategory;
  title: string;
  detail: string;
}

export interface PurelifeResultRecord {
  id: string;
  date: string;
  categories: Record<string, number>;
  overall: number;
  createdAt: string;
}