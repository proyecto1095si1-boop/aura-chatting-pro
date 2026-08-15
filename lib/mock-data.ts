export interface Profile {
  uid: string;
  name: string;
  age: number;
  distance: number;
  distanceUnit?: 'km' | 'mi';
  photos: string[];
  bio: string;
  interests: string[];
  verified: boolean;
  gender: string;
  isInternational?: boolean;
  role?: string;
  smokes?: 'yes' | 'no' | 'social' | null;
  drinks?: 'frequently' | 'socially' | 'never' | null;
  height?: number | null;
  relationshipGoal?: 'chat' | 'friendship' | 'informal' | 'stable' | 'life_partner' | 'stable_flexible' | null;
  subscription?: string;
  boostUntil?: string | null;
  zodiac?: string | null;
  personalityType?: string | null;
  hasChildren?: boolean | null;
  religion?: string | null;
  exercise?: string | null;
  education?: string | null;
  pets?: string[];
  languages?: string[];
  doubleDate?: {
    partnerId: string | null;
    status: 'none' | 'pending_sent' | 'pending_received' | 'linked';
    modeActive: boolean;
    teamBio?: string;
    teamName?: string;
  };
  updatedAt?: any;
}

export interface Team {
  id: string;
  user1: Profile;
  user2: Profile;
  distance: number;
  distanceUnit?: 'km' | 'mi';
  isInternational?: boolean;
}

export interface Match {
  matchId: string;
  profile: Profile;
  lastMessage?: string;
  lastMessageTime?: string;
  unread: number;
  isNew: boolean;
}

export interface Message {
  id: string;
  senderId: string;
  text?: string;
  photo?: string;
  timestamp: string;
  seen: boolean;
}

export const MOCK_PROFILES: Profile[] = [];
export const MOCK_MATCHES: Match[] = [];
export const MOCK_MESSAGES: Record<string, Message[]> = {};

export const INTERESTS_LIST = [
  'travel', 'coffee', 'photography', 'yoga', 'music', 'movies', 'reading',
  'techno', 'dog_lover', 'cat_lover', 'hiking', 'running', 'gym',
  'cooking', 'art', 'design', 'architecture', 'fashion', 'gaming',
  'surfing', 'tennis', 'soccer', 'swimming', 'cycling', 'meditation',
  'jazz', 'rock', 'pop', 'electronic', 'reggaeton', 'wine', 'beer',
  'beach', 'mountain', 'netflix', 'theater', 'dance',
  'volunteering', 'entrepreneurship', 'technology', 'science', 'psychology',
];
