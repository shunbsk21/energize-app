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
  type?: 'amount' | 'binary';
  targetAmount?: number;
  target?: number;
  completedDates?: string[];
  completedAmounts?: Record<string, number>;
  skippedDates?: string[];
  unit?: string;
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

export interface NoteItem {
  id: string;
  title?: string;
  body: string;
  tags: string[];
  createdAt: string;
  updatedAt?: string;
  archived?: boolean;
  deleted?: boolean;
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

// --- Component Props ---

export interface MainAppProps {
  profile: Profile;
  setProfile: React.Dispatch<React.SetStateAction<Profile | null>>;
}

export interface HabitTrackerProps {
  habits: Habit[];
  energyHistory: EnergyRecord[];
  onAddHabit: (newHabit: Omit<Habit, 'id'>) => void;
  onUpdateHabit: (updatedHabit: Habit) => void;
  onDeleteHabit: (habitId: string) => void;
  setIsHelpOpen: (isOpen: boolean) => void;
  setView: (view: View) => void;
  diagnosisFrequency: DiagnosisFrequency;
  checkins?: Checkin[];
  checkouts?: Checkout[];
  onAddCheckin?: (value: number, note?: string, dateStr?: string) => void | Promise<void>;
  onAddCheckout?: (gratitude?: string, note?: string, rating?: number | null, dateStr?: string) => void | Promise<void>;
  onUpdateCheckin?: (id: string, value: number, note?: string) => void | Promise<void>;
  onUpdateCheckout?: (id: string, gratitude?: string, note?: string, rating?: number | null) => void | Promise<void>;
  tasks?: Task[];
  onAddTask?: (t: { title: string; details?: string; dueDate?: string; priority?: 'low'|'medium'|'high' }) => void | Promise<void>;
  onToggleTask?: (taskId: string, done: boolean) => Promise<void> | void;
  onUpdateTask?: (taskId: string, payload: { title?: string; details?: string; dueDate?: string; priority?: 'low'|'medium'|'high'; done?: boolean }) => Promise<void> | void;
  onDeleteTask?: (taskId: string) => Promise<void> | void;
  onAddLearning?: (payload: { title: string; url?: string; notes?: string; tags?: string[] }) => void | Promise<void>;
  isAdmin?: boolean;
  purelifeFrequency?: DiagnosisFrequency;
  localPurelifeCompletedDates?: string[];
  onOpenPurelife?: () => void;
  valueDiagnosisFrequency?: DiagnosisFrequency;
  valueDiagnosisCompletedDates?: string[];
  onOpenValueDiagnosis?: () => void;
}

export interface GroupProps {
    profile: Profile;
    following: Friend[];
    followers: Friend[];
    onFollowUser: (friendId: string) => void;
    groups: Group[];
    groupInvites: Group[];
    onAddGroup: (newGroupData: Omit<Group, 'id'>) => void;
    onInviteToGroup: (group: Group, memberIdsToInvite: string[]) => void;
    onAcceptGroupInvite: (invite: Group) => void;
    onDeclineGroupInvite: (inviteId: string) => void;
    onRemoveMember: (groupId: string, memberIdToRemove: string) => void;
    onAddComment: (newCommentData: Omit<Comment, 'id'>) => void;
    habits: Habit[];
    setIsHelpOpen: (isOpen: boolean) => void;
    allUserProfiles: Map<string, Profile | Friend>;
    onUpdateGroupSharedHabits: (groupId: string, memberId: string, sharedHabitIds: string[]) => void;
    selectedGroupId: string | null;
    onClearSelectedGroup: () => void;
}

export interface GroupDetailProps {
  group: Group;
  profile: Profile;
  following: Friend[];
  onFollowUser: (friendId: string) => void;
  onAddComment: (newCommentData: Omit<Comment, 'id'>) => void;
  habits: Habit[];
  onBack: () => void;
  onInviteMembers: (group: Group, memberIds: string[]) => void;
  onRemoveMember: (groupId: string, memberIdToRemove: string) => void;
  allUserProfiles: Map<string, Profile | Friend>;
  onUpdateGroupSharedHabits: (groupId: string, memberId: string, sharedHabitIds: string[]) => void;
}

export interface EnergyDiagnosisProps {
  history: EnergyRecord[];
  onComplete: (scores: EnergyScores) => void;
  setIsHelpOpen: (isOpen: boolean) => void;
  diagnosisFrequency: DiagnosisFrequency;
  setDiagnosisFrequency: (newFrequency: DiagnosisFrequency) => void; 
  habits: Habit[];
  handleAddHabit?: (newHabitData: Omit<Habit, 'id'>) => Promise<void> | void;
}

export interface PersonalityProps {
  onComplete?: (result: any) => void;
  setIsHelpOpen?: (open: boolean) => void;
  handleAddHabit?: (newHabitData: Omit<Habit, 'id'>) => Promise<void> | void;
}

export interface PurelifeProps {
  handleAddHabit?: (newHabitData: Omit<Habit, 'id'>) => Promise<void> | void;
  setIsHelpOpen?: (open: boolean) => void;
}

export interface ValueDiagnosisProps {
  handleAddHabit?: (newHabitData: Omit<Habit, 'id'>) => Promise<void> | void;
  setIsHelpOpen?: (open: boolean) => void;
}

export interface RecordsProps {
  checkouts?: Checkout[];
  checkins?: Checkin[];
}

export interface TaskDetailProps {
  task: Task;
  onClose: () => void;
  updateTask: (t: Task) => Promise<void> | void;
  toggleTask: (id: string, done: boolean) => Promise<void> | void;
  removeTask: (id: string) => Promise<void> | void;
}

export interface AnalyticsProps {
  energyHistory: EnergyRecord[];
  habits: Habit[];
  setIsHelpOpen: (isOpen: boolean) => void;
  checkins?: Checkin[];
  checkouts?: Checkout[];
}

export interface LearningsProps {
  learnings: LearningItem[];
  onAddLearning?: (payload: { title: string; url?: string; notes?: string; tags?: string[] }) => void | Promise<void>;
  profile: Profile | null;
}

export interface NotesProps {
  notes?: NoteItem[];
  onAddNote?: (n: Omit<NoteItem, 'id'|'createdAt'|'updatedAt'>) => void;
  onUpdateNote?: (n: NoteItem) => void;
}

export interface LoginProps {
  onLoginSuccess: (profile: Profile) => void;
}

export interface ProfileModalProps {
  profile: Profile;
  following: Friend[];
  followers: Friend[];
  onFollowUser: (friendId: string) => void;
  onClose: () => void;
  onLogout: () => void;
  onSave: (newDisplayName: string, newImageUrl: string | null) => void;
}