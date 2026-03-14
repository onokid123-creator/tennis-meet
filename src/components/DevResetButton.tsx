import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { RotateCcw } from 'lucide-react';

export default function DevResetButton() {
  const { user } = useAuth();
  const [resetting, setResetting] = useState(false);

  const handleReset = async () => {
    if (!confirm('[개발용] 코트/채팅/신청 데이터를 초기화합니다.\n프로필 및 계정 데이터는 유지됩니다.\n계속하시겠습니까?')) return;
    if (!user) return;

    setResetting(true);
    try {
      await supabase.from('court_group_chat_messages').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('court_group_chat_participants').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('court_group_chats').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('messages').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('chat_participants').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('chats').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('applications').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('courts').delete().neq('id', '00000000-0000-0000-0000-000000000000');

      alert('초기화 완료! 코트/채팅/신청 데이터가 삭제되었습니다.');
      window.location.reload();
    } catch (err) {
      console.error('초기화 실패:', err);
      alert('일부 초기화에 실패했습니다. 콘솔을 확인하세요.');
      setResetting(false);
    }
  };


  return (
    <button
      onClick={handleReset}
      disabled={resetting}
      className="w-full flex items-center justify-center gap-2 py-3 rounded-lg border-2 border-dashed border-red-300 text-red-400 text-sm font-medium hover:border-red-400 hover:text-red-500 hover:bg-red-50 transition disabled:opacity-50"
    >
      <RotateCcw className="w-4 h-4" />
      {resetting ? '초기화 중...' : '[개발용] 전체 데이터 리셋'}
    </button>
  );
}
