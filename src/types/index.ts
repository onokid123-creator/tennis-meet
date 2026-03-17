export interface Profile {
  id: string;
  user_id: string;
  name: string;
  age?: number;
  gender?: string;
  photo_url?: string;
  photo_urls?: string[];
  tennis_photo_url?: string;
  tennis_photo_urls?: string[];
  phone_number?: string;
  experience?: string;
  purpose?: 'tennis' | 'dating';
  bio?: string;
  mbti?: string;
  height?: number;
  tennis_style?: string;
  profile_completed: boolean;
  created_at: string;
}

export interface Court {
  id: string;
  user_id: string;
  purpose: 'tennis' | 'dating';
  court_name: string;
  date: string;
  start_time: string;
  end_time: string;
  format?: string;
  match_type?: string;
  male_count?: number;
  female_count?: number;
  experience_wanted?: string;
  cost?: string;
  description?: string;
  male_slots?: number;
  female_slots?: number;
  confirmed_male_slots?: number;
  confirmed_female_slots?: number;
  status?: string;
  capacity?: number;
  current_participants?: number;
  tennis_photo_url?: string;
  court_fee?: number;
  owner_photos?: string[];
  owner_photo?: string;
  owner_mbti?: string;
  owner_height?: number;
  owner_bio?: string;
  owner_experience?: string;
  owner_gender?: string;
  owner_age?: number;
  owner_name?: string;
  court_intro?: string;
  created_at: string;
  profile?: Profile;
}

export interface Application {
  id: string;
  court_id: string;
  applicant_id: string;
  owner_id: string;
  status: 'pending' | 'accepted' | 'rejected';
  purpose: 'tennis' | 'dating';
  message?: string | null;
  rejection_reason?: string | null;
  created_at: string;
  applicant?: Profile;
  owner?: Profile;
  court?: Court;
}

export interface Chat {
  id: string;
  user1_id: string;
  user2_id: string | null;
  purpose?: string;
  court_id?: string | null;
  is_group?: boolean;
  left_by?: string[];
  confirmed_user_ids?: string[];
  created_at: string;
  user1?: Profile;
  user2?: Profile;
  last_message?: Message;
  unread_count?: number;
}

export interface ChatParticipant {
  id: string;
  chat_id: string;
  user_id: string;
  is_confirmed: boolean;
  joined_at: string;
  profile?: Profile;
}

export interface Message {
  id: string;
  chat_id: string;
  sender_id: string | null;
  content: string;
  is_read: boolean;
  type: 'user' | 'system' | 'after_proposal' | 'leave_request';
  payload?: Record<string, unknown> | null;
  created_at: string;
  sender?: Profile;
  _failed?: boolean;
}

export interface GroupChatMessage {
  id: string;
  group_chat_id: string;
  sender_id: string | null;
  content: string;
  type: 'user' | 'system' | 'leave_request';
  is_read: boolean;
  payload?: Record<string, unknown> | null;
  created_at: string;
  sender?: Profile;
}

export interface GroupChatParticipant {
  id: string;
  group_chat_id: string;
  user_id: string;
  status: 'pending' | 'confirmed' | 'rejected';
  last_read_at?: string | null;
  joined_at: string;
  profile?: Profile;
}

export interface CourtGroupChat {
  id: string;
  court_id: string;
  host_id: string;
  purpose?: string;
  created_at: string;
  court?: Court;
  host?: Profile;
  last_message?: GroupChatMessage;
  unread_count?: number;
}
