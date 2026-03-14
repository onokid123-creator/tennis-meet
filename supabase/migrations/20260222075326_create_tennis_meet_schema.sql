/*
  # Tennis Meet 데이터베이스 스키마 생성

  1. 새로운 테이블
    - `profiles` - 사용자 프로필 정보
      - `id` (uuid, primary key)
      - `user_id` (uuid, auth.users 참조)
      - `name` (text) - 사용자 이름
      - `age` (integer) - 나이
      - `gender` (text) - 성별 (남성/여성)
      - `photo_url` (text) - 프로필 사진 URL
      - `experience` (text) - 구력 (한글)
      - `purpose` (text) - 목적 (tennis/dating)
      - `profile_completed` (boolean) - 프로필 완성 여부
      - `created_at` (timestamptz)
    
    - `courts` - 코트/만남 게시글
      - `id` (uuid, primary key)
      - `user_id` (uuid, profiles 참조)
      - `purpose` (text) - tennis/dating
      - `court_name` (text) - 코트 이름
      - `date` (date) - 날짜
      - `start_time` (time) - 시작 시간
      - `end_time` (time) - 종료 시간
      - `format` (text) - 경기 형식
      - `experience_wanted` (text) - 원하는 구력
      - `cost` (text) - 비용
      - `description` (text) - 설명
      - `male_slots` (integer) - 남성 모집 인원
      - `female_slots` (integer) - 여성 모집 인원
      - `created_at` (timestamptz)
    
    - `applications` - 참가 신청
      - `id` (uuid, primary key)
      - `court_id` (uuid, courts 참조)
      - `applicant_id` (uuid, profiles 참조)
      - `owner_id` (uuid, profiles 참조)
      - `status` (text) - pending/accepted/rejected
      - `created_at` (timestamptz)
    
    - `chats` - 채팅방
      - `id` (uuid, primary key)
      - `user1_id` (uuid, profiles 참조)
      - `user2_id` (uuid, profiles 참조)
      - `created_at` (timestamptz)
    
    - `messages` - 메시지
      - `id` (uuid, primary key)
      - `chat_id` (uuid, chats 참조)
      - `sender_id` (uuid, profiles 참조)
      - `content` (text) - 메시지 내용
      - `is_read` (boolean) - 읽음 여부
      - `created_at` (timestamptz)

  2. 보안
    - 모든 테이블에 RLS 활성화
    - 각 테이블별로 적절한 정책 설정
    - 인증된 사용자만 접근 가능
    - 본인 데이터만 수정 가능
*/

-- profiles 테이블 생성
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  name text NOT NULL,
  age integer,
  gender text,
  photo_url text,
  experience text,
  purpose text,
  profile_completed boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "사용자는 모든 프로필 조회 가능"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "사용자는 본인 프로필 생성 가능"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "사용자는 본인 프로필 수정 가능"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "사용자는 본인 프로필 삭제 가능"
  ON profiles FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- courts 테이블 생성
CREATE TABLE IF NOT EXISTS courts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(user_id) ON DELETE CASCADE NOT NULL,
  purpose text NOT NULL,
  court_name text NOT NULL,
  date date NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  format text,
  experience_wanted text,
  cost text,
  description text,
  male_slots integer DEFAULT 0,
  female_slots integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE courts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "사용자는 모든 코트 조회 가능"
  ON courts FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "사용자는 코트 생성 가능"
  ON courts FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "사용자는 본인 코트 수정 가능"
  ON courts FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "사용자는 본인 코트 삭제 가능"
  ON courts FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- applications 테이블 생성
CREATE TABLE IF NOT EXISTS applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  court_id uuid REFERENCES courts(id) ON DELETE CASCADE NOT NULL,
  applicant_id uuid REFERENCES profiles(user_id) ON DELETE CASCADE NOT NULL,
  owner_id uuid REFERENCES profiles(user_id) ON DELETE CASCADE NOT NULL,
  status text DEFAULT 'pending' NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "사용자는 관련된 신청 조회 가능"
  ON applications FOR SELECT
  TO authenticated
  USING (auth.uid() = applicant_id OR auth.uid() = owner_id);

CREATE POLICY "사용자는 신청 생성 가능"
  ON applications FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = applicant_id);

CREATE POLICY "코트 주인은 신청 상태 변경 가능"
  ON applications FOR UPDATE
  TO authenticated
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "신청자는 본인 신청 삭제 가능"
  ON applications FOR DELETE
  TO authenticated
  USING (auth.uid() = applicant_id);

-- chats 테이블 생성
CREATE TABLE IF NOT EXISTS chats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user1_id uuid REFERENCES profiles(user_id) ON DELETE CASCADE NOT NULL,
  user2_id uuid REFERENCES profiles(user_id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user1_id, user2_id)
);

ALTER TABLE chats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "사용자는 본인 채팅방 조회 가능"
  ON chats FOR SELECT
  TO authenticated
  USING (auth.uid() = user1_id OR auth.uid() = user2_id);

CREATE POLICY "사용자는 채팅방 생성 가능"
  ON chats FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user1_id OR auth.uid() = user2_id);

-- messages 테이블 생성
CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id uuid REFERENCES chats(id) ON DELETE CASCADE NOT NULL,
  sender_id uuid REFERENCES profiles(user_id) ON DELETE CASCADE NOT NULL,
  content text NOT NULL,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "사용자는 본인 채팅방 메시지 조회 가능"
  ON messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM chats
      WHERE chats.id = messages.chat_id
      AND (chats.user1_id = auth.uid() OR chats.user2_id = auth.uid())
    )
  );

CREATE POLICY "사용자는 본인 채팅방에 메시지 전송 가능"
  ON messages FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (
      SELECT 1 FROM chats
      WHERE chats.id = messages.chat_id
      AND (chats.user1_id = auth.uid() OR chats.user2_id = auth.uid())
    )
  );

CREATE POLICY "사용자는 본인 채팅방 메시지 수정 가능"
  ON messages FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM chats
      WHERE chats.id = messages.chat_id
      AND (chats.user1_id = auth.uid() OR chats.user2_id = auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM chats
      WHERE chats.id = messages.chat_id
      AND (chats.user1_id = auth.uid() OR chats.user2_id = auth.uid())
    )
  );

-- 인덱스 생성 (성능 최적화)
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_courts_user_id ON courts(user_id);
CREATE INDEX IF NOT EXISTS idx_courts_purpose ON courts(purpose);
CREATE INDEX IF NOT EXISTS idx_applications_court_id ON applications(court_id);
CREATE INDEX IF NOT EXISTS idx_applications_applicant_id ON applications(applicant_id);
CREATE INDEX IF NOT EXISTS idx_applications_owner_id ON applications(owner_id);
CREATE INDEX IF NOT EXISTS idx_chats_user1_id ON chats(user1_id);
CREATE INDEX IF NOT EXISTS idx_chats_user2_id ON chats(user2_id);
CREATE INDEX IF NOT EXISTS idx_messages_chat_id ON messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);