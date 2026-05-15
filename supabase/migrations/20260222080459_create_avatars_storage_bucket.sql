/*
  # Storage 버킷 생성 및 정책 설정

  1. Storage 버킷
    - `avatars` - 사용자 프로필 사진 저장용 버킷
  
  2. 보안
    - 인증된 사용자만 업로드 가능
    - 모든 사용자가 조회 가능
*/

INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "인증된 사용자는 아바타 업로드 가능"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'avatars');

CREATE POLICY "모든 사용자는 아바타 조회 가능"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'avatars');

CREATE POLICY "사용자는 본인 아바타 삭제 가능"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'avatars' AND owner_id::text = auth.uid()::text);

CREATE POLICY "사용자는 본인 아바타 수정 가능"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'avatars' AND owner_id::text = auth.uid()::text)
  WITH CHECK (bucket_id = 'avatars' AND owner_id::text = auth.uid()::text);