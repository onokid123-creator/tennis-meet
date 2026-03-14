/*
  # accept_application 함수 교체 및 누락 컬럼/인덱스 추가

  기존 함수를 드롭하고 올바른 시그니처로 재생성
*/

-- 기존 함수 드롭
DROP FUNCTION IF EXISTS accept_application(uuid, uuid, uuid, uuid, text, text, text, integer, integer);

-- messages에 payload 컬럼 추가
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'messages' AND column_name = 'payload'
  ) THEN
    ALTER TABLE messages ADD COLUMN payload jsonb;
  END IF;
END $$;

-- profiles photos 컬럼을 jsonb로 변경
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'photos' AND udt_name = '_text'
  ) THEN
    ALTER TABLE profiles DROP COLUMN photos;
    ALTER TABLE profiles ADD COLUMN photos jsonb DEFAULT '[]';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'photos'
  ) THEN
    ALTER TABLE profiles ADD COLUMN photos jsonb DEFAULT '[]';
  END IF;
END $$;

-- phone_number unique partial index
CREATE UNIQUE INDEX IF NOT EXISTS profiles_phone_number_key
  ON profiles(phone_number)
  WHERE phone_number IS NOT NULL;

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_courts_user_id ON courts(user_id);
CREATE INDEX IF NOT EXISTS idx_courts_purpose ON courts(purpose);
CREATE INDEX IF NOT EXISTS idx_applications_court_id ON applications(court_id);
CREATE INDEX IF NOT EXISTS idx_applications_applicant_id ON applications(applicant_id);
CREATE INDEX IF NOT EXISTS idx_applications_owner_id ON applications(owner_id);
CREATE INDEX IF NOT EXISTS idx_chats_user1_id ON chats(user1_id);
CREATE INDEX IF NOT EXISTS idx_chats_user2_id ON chats(user2_id);
CREATE INDEX IF NOT EXISTS idx_chats_court_id ON chats(court_id);
CREATE INDEX IF NOT EXISTS idx_messages_chat_id ON messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);

-- storage 버킷
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- storage policies
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = '아바타 공개 조회 가능' AND tablename = 'objects'
  ) THEN
    CREATE POLICY "아바타 공개 조회 가능"
      ON storage.objects FOR SELECT
      USING (bucket_id = 'avatars');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = '인증된 사용자는 아바타 업로드 가능' AND tablename = 'objects'
  ) THEN
    CREATE POLICY "인증된 사용자는 아바타 업로드 가능"
      ON storage.objects FOR INSERT
      TO authenticated
      WITH CHECK (bucket_id = 'avatars');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = '사용자는 본인 아바타 수정 가능' AND tablename = 'objects'
  ) THEN
    CREATE POLICY "사용자는 본인 아바타 수정 가능"
      ON storage.objects FOR UPDATE
      TO authenticated
      USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = '사용자는 본인 아바타 삭제 가능' AND tablename = 'objects'
  ) THEN
    CREATE POLICY "사용자는 본인 아바타 삭제 가능"
      ON storage.objects FOR DELETE
      TO authenticated
      USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
  END IF;
END $$;

-- accept_application 함수 재생성
CREATE FUNCTION accept_application(
  p_application_id uuid,
  p_court_id uuid,
  p_owner_id uuid,
  p_applicant_id uuid,
  p_owner_name text,
  p_applicant_name text,
  p_purpose text,
  p_male_slots integer,
  p_female_slots integer
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_chat_id uuid;
  v_is_new_chat boolean := false;
  v_applicant_gender text;
BEGIN
  UPDATE applications
  SET status = 'accepted'
  WHERE id = p_application_id;

  SELECT gender INTO v_applicant_gender
  FROM profiles WHERE user_id = p_applicant_id;

  SELECT id INTO v_chat_id
  FROM chats
  WHERE (
    (user1_id = p_owner_id AND user2_id = p_applicant_id) OR
    (user1_id = p_applicant_id AND user2_id = p_owner_id)
  ) AND purpose = p_purpose AND court_id = p_court_id
  LIMIT 1;

  IF v_chat_id IS NULL THEN
    INSERT INTO chats (user1_id, user2_id, purpose, court_id)
    VALUES (p_owner_id, p_applicant_id, p_purpose, p_court_id)
    ON CONFLICT DO NOTHING
    RETURNING id INTO v_chat_id;

    IF v_chat_id IS NULL THEN
      SELECT id INTO v_chat_id
      FROM chats
      WHERE (
        (user1_id = p_owner_id AND user2_id = p_applicant_id) OR
        (user1_id = p_applicant_id AND user2_id = p_owner_id)
      ) AND purpose = p_purpose AND court_id = p_court_id
      LIMIT 1;
    ELSE
      v_is_new_chat := true;
    END IF;
  END IF;

  INSERT INTO chat_participants (chat_id, user_id)
  VALUES (v_chat_id, p_owner_id)
  ON CONFLICT (chat_id, user_id) DO NOTHING;

  INSERT INTO chat_participants (chat_id, user_id)
  VALUES (v_chat_id, p_applicant_id)
  ON CONFLICT (chat_id, user_id) DO NOTHING;

  IF v_is_new_chat THEN
    INSERT INTO messages (chat_id, sender_id, content, type)
    VALUES (
      v_chat_id,
      NULL,
      p_owner_name || '님이 ' || p_applicant_name || '님의 신청을 수락했습니다.',
      'system'
    );
  END IF;

  IF v_applicant_gender = '남성' AND p_male_slots > 0 THEN
    UPDATE courts
    SET
      male_slots = GREATEST(0, male_slots - 1),
      confirmed_male_slots = confirmed_male_slots + 1
    WHERE id = p_court_id;
  ELSIF v_applicant_gender = '여성' AND p_female_slots > 0 THEN
    UPDATE courts
    SET
      female_slots = GREATEST(0, female_slots - 1),
      confirmed_female_slots = confirmed_female_slots + 1
    WHERE id = p_court_id;
  END IF;

  RETURN json_build_object('chat_id', v_chat_id, 'error', null);
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('chat_id', null, 'error', SQLERRM);
END;
$$;

-- cleanup_empty_chat 트리거
CREATE OR REPLACE FUNCTION cleanup_empty_chat()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF array_length(NEW.left_by, 1) >= 2 THEN
    DELETE FROM chats WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_cleanup_empty_chat ON chats;
CREATE TRIGGER trigger_cleanup_empty_chat
  AFTER UPDATE OF left_by ON chats
  FOR EACH ROW
  EXECUTE FUNCTION cleanup_empty_chat();
