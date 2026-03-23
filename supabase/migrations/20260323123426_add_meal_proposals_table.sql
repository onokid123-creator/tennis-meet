/*
  # Add meal_proposals table

  ## Summary
  경기 후 식사 제안 기능을 위한 테이블을 생성합니다.

  ## New Tables
  - `meal_proposals`
    - `id` (uuid, primary key)
    - `chat_id` (uuid, FK → chats.id) — 어떤 채팅방에서 제안했는지
    - `court_id` (uuid, nullable) — 어떤 코트 관련인지
    - `sender_id` (uuid, FK → auth.users) — 제안한 호스트
    - `receiver_id` (uuid, FK → auth.users) — 제안 받은 참여자
    - `status` (text) — 'pending' | 'accepted' | 'rejected'
    - `rejection_reason` (text, nullable) — 거절 사유 (직접 입력)
    - `created_at` (timestamptz)

  ## Security
  - RLS 활성화
  - sender / receiver 만 자신의 제안 조회 가능
  - sender 만 INSERT 가능
  - receiver 만 status 업데이트(수락/거절) 가능

  ## Notes
  - 동일 sender+receiver+chat 조합으로 pending 중복 방지는 앱 레벨에서 처리
*/

CREATE TABLE IF NOT EXISTS meal_proposals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id uuid NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  court_id uuid REFERENCES courts(id) ON DELETE SET NULL,
  sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  rejection_reason text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE meal_proposals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "식사 제안 조회: sender 또는 receiver"
  ON meal_proposals FOR SELECT
  TO authenticated
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "식사 제안 생성: sender 본인"
  ON meal_proposals FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "식사 제안 수락/거절: receiver 본인"
  ON meal_proposals FOR UPDATE
  TO authenticated
  USING (auth.uid() = receiver_id)
  WITH CHECK (auth.uid() = receiver_id);

CREATE INDEX IF NOT EXISTS idx_meal_proposals_chat_id ON meal_proposals(chat_id);
CREATE INDEX IF NOT EXISTS idx_meal_proposals_receiver_id ON meal_proposals(receiver_id);
CREATE INDEX IF NOT EXISTS idx_meal_proposals_sender_id ON meal_proposals(sender_id);
