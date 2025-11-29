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
  imageUrl?: string | null;
}

export type EnergyCategory = 'physical' | 'mental' | 'emotional' | 'intellectual';

export interface EnergyRecord {
  date: string;
  physical: number;
  mental: number;
  emotional: number;
  intellectual: number;
}

export interface Habit {
  id?: string;
  title: string;
  detail?: string;
  createdAt?: string;
  startDate?: string;
  frequencyType?: FrequencyType;
  frequencyValue?: number[];
  type?: 'amount' | 'boolean';
  targetAmount?: number;
  target?: number;
  completedDates?: string[];
  completedAmounts?: Record<string, number>;
  skippedDates?: string[];
}

export interface EnergyScores {
  [k: string]: number;
}

export interface DiagnosisFrequency {
  frequencyType: FrequencyType;
  frequencyValue?: any[];
}

export interface Friend {
  id: string;
  displayName?: string;
  imageUrl?: string | null;
}

export interface Group {
  id?: string;
  name?: string;
  members: string[];
  ownerId?: string;
  sharedByMember?: Record<string, string[]>;
}

export interface Comment {
  id?: string;
  groupId: string;
  text: string;
  authorId?: string;
  authorName?: string;
  authorImageUrl?: string | null;
  createdAt?: string;
}

export interface Notification {
  id?: string;
  groupId?: string | null;
  groupName?: string | null;
  message?: string | null;
  authorName?: string | null;
  createdAt?: any;
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
  id?: string;
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