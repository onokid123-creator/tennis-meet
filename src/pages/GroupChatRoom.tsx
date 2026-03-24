import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { GroupChatMessage, GroupChatParticipant, Court, Profile } from '../types';
import { ArrowLeft, Send, LogOut, Users, X, UtensilsCrossed } from 'lucide-react';

interface ParticipantWithRead extends GroupChatParticipant {
  last_read_at?: string | null;
}

export default function GroupChatRoom() {
  const { groupChatId } = useParams();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [messages, setMessages] = useState<GroupChatMessage[]>([]);
  const [participants, setParticipants] = useState<ParticipantWithRead[]>([]);
  const [participantLastReads, setParticipantLastReads] = useState<Record<string, string | null>>({});
  const [court, setCourt] = useState<Court | null>(null);
  const [hostId, setHostId] = useState<string | null>(null);
  const [hostProfile, setHostProfile] = useState<{ name: string; photo_url: string | null; tennis_photo_url?: string | null } | null>(null);
  const [purpose, setPurpose] = useState<'tennis' | 'dating'>('tennis');
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [showParticipants, setShowParticipants] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [matchConfirmed, setMatchConfirmed] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [leaveReason, setLeaveReason] = useState('');
  const [blockedUserIds, setBlockedUserIds] = useState<string[]>([]);
  const [profilePopupUser, setProfilePopupUser] = useState<Profile | null>(null);
  const [showKickConfirm, setShowKickConfirm] = useState(false);
  const [kickTarget, setKickTarget] = useState<{ user_id: string; name: string } | null>(null);
  const [kickingId, setKickingId] = useState<string | null>(null);
  const [showBlockConfirm, setShowBlockConfirm] = useState(false);
  const [blockTarget, setBlockTarget] = useState<{ user_id: string; name: string } | null>(null);
  const [showReportPopup, setShowReportPopup] = useState(false);
  const [reportTarget, setReportTarget] = useState<{ user_id: string; name: string } | null>(null);
  const [reportReason, setReportReason] = useState('');
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [showUnblockMessagePopup, setShowUnblockMessagePopup] = useState(false);
  const [unblockMessageTarget, setUnblockMessageTarget] = useState<{ user_id: string } | null>(null);
  const [showUnblockFromListPopup, setShowUnblockFromListPopup] = useState(false);
  const [unblockListTarget, setUnblockListTarget] = useState<{ user_id: string } | null>(null);
  const [profilePopupKickTarget, setProfilePopupKickTarget] = useState<{ user_id: string; name: string } | null>(null);
  const [showConversationSheet, setShowConversationSheet] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [confirmedParticipants, setConfirmedParticipants] = useState<Array<{ user_id: string; name: string; photo_url?: string; tennis_photo_url?: string }>>([]);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [includeMealProposal, setIncludeMealProposal] = useState(false);
  const [showMealProposalPicker, setShowMealProposalPicker] = useState(false);
  const [mealProposalSubmitting, setMealProposalSubmitting] = useState(false);
  const [showMealRejectPopup, setShowMealRejectPopup] = useState(false);
  const [mealRejectProposalId, setMealRejectProposalId] = useState<string | null>(null);
  const [mealRejectReason, setMealRejectReason] = useState('');
  const [mealRejectSubmitting, setMealRejectSubmitting] = useState(false);
  const [pendingMealProposals, setPendingMealProposals] = useState<Array<{ id: string; sender_id: string; receiver_id: string; sender_name?: string }>>([]);
  const [showMealSentPopup, setShowMealSentPopup] = useState(false);
  const [showMealAcceptPopup, setShowMealAcceptPopup] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const showToastMsg = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  const isDating = purpose === 'dating';
  const isHost = user?.id === hostId;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const updateMyLastRead = useCallback(async () => {
    if (!groupChatId || !user) return;
    const now = new Date().toISOString();
    setParticipantLastReads((prev) => ({ ...prev, [user.id]: now }));
    await supabase
      .from('court_group_chat_participants')
      .update({ last_read_at: now })
      .eq('group_chat_id', groupChatId)
      .eq('user_id', user.id);
    await supabase
      .from('court_group_chat_messages')
      .update({ is_read: true })
      .eq('group_chat_id', groupChatId)
      .eq('is_read', false)
      .neq('sender_id', user.id);
  }, [groupChatId, user]);

  const getGroupUnreadCount = (msgCreatedAt: string): number => {
    if (!user) return 0;
    const otherIds = Object.keys(participantLastReads).filter((id) => id !== user.id);
    if (otherIds.length === 0) return 0;
    const unread = otherIds.filter((id) => {
      const lr = participantLastReads[id];
      if (!lr) return true;
      return new Date(msgCreatedAt) > new Date(lr);
    }).length;
    return unread;
  };

  useEffect(() => {
    if (!user) return;
    const local: string[] = (() => { try { return JSON.parse(localStorage.getItem('blocked_users') ?? '[]'); } catch { return []; } })();
    supabase.from('blocks').select('blocked_id').eq('blocker_id', user.id).then(({ data }) => {
      const db = (data ?? []).map((r: { blocked_id: string }) => r.blocked_id);
      setBlockedUserIds(Array.from(new Set([...local, ...db])));
    });
  }, [user]);

  const fetchMessages = useCallback(async () => {
    setLoading(true);
    try {
      if (!user) { setLoading(false); return; }
      const { data: myPartData } = await supabase
        .from('court_group_chat_participants')
        .select('created_at')
        .eq('group_chat_id', groupChatId)
        .eq('user_id', user.id)
        .maybeSingle();
      const joinedAt = (myPartData as { created_at?: string | null } | null)?.created_at ?? null;

      let query = supabase
        .from('court_group_chat_messages')
        .select(`*, sender:sender_id (*)`)
        .eq('group_chat_id', groupChatId)
        .order('created_at', { ascending: true });
      if (joinedAt) query = query.gte('created_at', joinedAt);

      const { data } = await query;
      setMessages(data || []);
    } catch (err) {
      console.error('메시지 가져오기 실패:', err);
    } finally {
      setLoading(false);
    }
  }, [groupChatId, user]);

  const fetchParticipants = useCallback(async () => {
    const { data } = await supabase
      .from('court_group_chat_participants')
      .select(`*, profile:user_id (*)`)
      .eq('group_chat_id', groupChatId)
      .neq('status', 'rejected');

    const rows = (data || []) as ParticipantWithRead[];
    setParticipants(rows);
    const reads: Record<string, string | null> = {};
    rows.forEach((p) => { reads[p.user_id] = (p as never as { last_read_at?: string | null }).last_read_at ?? null; });
    setParticipantLastReads((prev) => ({ ...prev, ...reads }));
  }, [groupChatId]);

  const fetchConfirmedParticipants = useCallback(async () => {
    const { data: gcData } = await supabase
      .from('court_group_chats')
      .select('confirmed_user_ids')
      .eq('id', groupChatId)
      .maybeSingle();
    const confirmedIds: string[] = (gcData as { confirmed_user_ids?: string[] | null } | null)?.confirmed_user_ids ?? [];
    if (confirmedIds.length === 0) {
      setConfirmedParticipants([]);
      return;
    }
    const { data: profs } = await supabase
      .from('profiles')
      .select('user_id, name, photo_url, tennis_photo_url')
      .in('user_id', confirmedIds);
    setConfirmedParticipants(
      (profs ?? []).map((p) => ({
        user_id: p.user_id,
        name: p.name,
        photo_url: (p as { photo_url?: string | null }).photo_url ?? undefined,
        tennis_photo_url: (p as { tennis_photo_url?: string | null }).tennis_photo_url ?? undefined,
      }))
    );
  }, [groupChatId]);

  const fetchGroupChatData = useCallback(async () => {
    const { data } = await supabase
      .from('court_group_chats')
      .select(`*, court:court_id (*), host:host_id (*), confirmed_user_ids`)
      .eq('id', groupChatId)
      .maybeSingle();

    if (data) {
      setHostId(data.host_id);
      setCourt(data.court || null);
      if (data.host) {
        setHostProfile({ name: data.host.name, photo_url: data.host.photo_url || null, tennis_photo_url: data.host.tennis_photo_url || null });
      }
      if (data.purpose) setPurpose(data.purpose as 'tennis' | 'dating');
      if ((data.confirmed_user_ids ?? []).length > 0) setMatchConfirmed(true);
      fetchConfirmedParticipants();
    }
  }, [groupChatId, fetchConfirmedParticipants]);

  useEffect(() => {
    if (user && groupChatId) loadPendingMealProposals();
  }, [groupChatId, user]);

  useEffect(() => {
    fetchGroupChatData();
    fetchMessages();
    fetchParticipants();
    fetchConfirmedParticipants();

    const msgChannel = supabase
      .channel(`group_chat_${groupChatId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'court_group_chat_messages', filter: `group_chat_id=eq.${groupChatId}` },
        (payload) => {
          const newMsg = payload.new as GroupChatMessage;
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            const matchingTemp = prev.find(
              (m) => m.id.startsWith('temp_') && m.sender_id === newMsg.sender_id && m.content === newMsg.content
            );
            if (matchingTemp) {
              return prev.map((m) => (m.id === matchingTemp.id ? newMsg : m));
            }
            return [...prev, newMsg];
          });
          scrollToBottom();
        }
      )
      .subscribe();

    const participantChannel = supabase
      .channel(`group_participants_${groupChatId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'court_group_chat_participants', filter: `group_chat_id=eq.${groupChatId}` },
        (payload) => {
          if (payload.eventType === 'UPDATE') {
            const updated = payload.new as { user_id: string; last_read_at?: string | null };
            if (updated.last_read_at !== undefined) {
              setParticipantLastReads((prev) => ({ ...prev, [updated.user_id]: updated.last_read_at ?? null }));
            }
          }
          fetchParticipants();
        }
      )
      .subscribe();

    const kickChannel = supabase
      .channel(`group_kick_${groupChatId}_${user?.id}`)
      .on('broadcast', { event: 'group_kick_user' }, (payload) => {
        const { kicked_user_id } = payload.payload as { kicked_user_id: string };
        if (kicked_user_id === user?.id) {
          navigate('/chats', { replace: true });
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(msgChannel);
      supabase.removeChannel(participantChannel);
      supabase.removeChannel(kickChannel);
    };
  }, [groupChatId, fetchGroupChatData, fetchMessages, fetchParticipants, fetchConfirmedParticipants, navigate, user]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (!loading) updateMyLastRead();
  }, [loading, updateMyLastRead]);

  useEffect(() => {
    updateMyLastRead();
  }, [messages.length, updateMyLastRead]);

  const sendMessage = async (content: string, type: string = 'user') => {
    if (!content.trim() || !user) return;

    const trimmed = content.trim();
    const tempId = `temp_${Date.now()}_${Math.random()}`;
    const optimistic: GroupChatMessage = {
      id: tempId,
      group_chat_id: groupChatId!,
      sender_id: user.id,
      content: trimmed,
      type: type as GroupChatMessage['type'],
      is_read: false,
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, optimistic]);
    if (type === 'user') setNewMessage('');

    const { data: inserted, error } = await supabase
      .from('court_group_chat_messages')
      .insert({
        group_chat_id: groupChatId!,
        sender_id: user.id,
        content: trimmed,
        type,
        is_read: false,
      })
      .select(`*, sender:sender_id (*)`)
      .maybeSingle();

    if (error) {
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      if (type === 'user') alert(`메시지 전송 실패: ${error.message}`);
      return;
    }
    if (inserted) {
      setMessages((prev) => prev.map((m) => (m.id === tempId ? (inserted as GroupChatMessage) : m)));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(newMessage);
  };

  const handleConfirmParticipant = async (participant: GroupChatParticipant) => {
    if (!participant.profile) return;
    if (blockedUserIds.includes(participant.user_id)) {
      showToastMsg('차단된 유저는 매칭 확정이 불가합니다.');
      return;
    }
    setActionLoading(participant.user_id);

    const nextConfirmedIds = confirmedParticipants.some((p) => p.user_id === participant.user_id)
      ? confirmedParticipants.map((p) => p.user_id)
      : [...confirmedParticipants.map((p) => p.user_id), participant.user_id];

    const { error } = await supabase
      .from('court_group_chats')
      .update({ confirmed_user_ids: nextConfirmedIds })
      .eq('id', groupChatId!);

    if (error) {
      showToastMsg('확정 중 오류가 발생했습니다.');
      setActionLoading(null);
      return;
    }

    const participantGender = participant.profile.gender;
    if (court) {
      const isMale = participantGender === 'male' || participantGender === '남성';
      const newConfirmedMale = isMale
        ? ((court.male_slots ?? 0) > (court.confirmed_male_slots ?? 0) ? (court.confirmed_male_slots ?? 0) + 1 : (court.confirmed_male_slots ?? 0))
        : (court.confirmed_male_slots ?? 0);
      const newConfirmedFemale = !isMale
        ? ((court.female_slots ?? 0) > (court.confirmed_female_slots ?? 0) ? (court.confirmed_female_slots ?? 0) + 1 : (court.confirmed_female_slots ?? 0))
        : (court.confirmed_female_slots ?? 0);

      const courtExtra = court as Court & { current_participants?: number; capacity?: number };
      const newCurrentParticipants = (courtExtra.current_participants ?? 0) + 1;
      const totalSlots = (court.male_slots ?? 0) + (court.female_slots ?? 0);
      const newTotalConfirmed = newConfirmedMale + newConfirmedFemale;
      const capacityVal = courtExtra.capacity ?? 0;
      const shouldClose = (totalSlots > 0 && newTotalConfirmed >= totalSlots) || (capacityVal > 0 && newCurrentParticipants >= capacityVal);

      await supabase.from('courts').update({
        confirmed_male_slots: newConfirmedMale,
        confirmed_female_slots: newConfirmedFemale,
        current_participants: newCurrentParticipants,
        ...(shouldClose ? { status: 'closed' } : {}),
      } as never).eq('id', court.id);
    }

    await supabase.from('court_group_chat_messages').insert({
      group_chat_id: groupChatId!,
      sender_id: null,
      content: isDating ? `💕 매칭 확정! 설레는 만남 기대해요 🥂` : `🎾 라인업 확정!`,
      type: 'system',
      is_read: false,
    });

    fetchGroupChatData();
    setConfirmedParticipants((prev) => {
      if (prev.some((p) => p.user_id === participant.user_id)) return prev;
      const prof = participant.profile;
      if (!prof) return prev;
      return [...prev, {
        user_id: participant.user_id,
        name: prof.name,
        photo_url: prof.photo_url ?? undefined,
        tennis_photo_url: (prof as { tennis_photo_url?: string | null }).tennis_photo_url ?? undefined,
      }];
    });
    setActionLoading(null);
  };

  const handleRejectParticipant = async (participant: GroupChatParticipant) => {
    if (!participant.profile) return;
    if (!confirm(`${participant.profile.name}님을 채팅방에서 내보낼까요?`)) return;
    setActionLoading(participant.user_id);

    await supabase.from('court_group_chat_messages').insert({
      group_chat_id: groupChatId!,
      sender_id: null,
      content: isDating ? `😢 ${participant.profile.name}님, 이번엔 아쉽게도 자리가 찼어요` : `😢 ${participant.profile.name}님, 이번엔 아쉽게도 자리가 찼어요`,
      type: 'system',
      is_read: false,
    });

    await supabase.from('court_group_chat_participants').update({ status: 'rejected' }).eq('group_chat_id', groupChatId!).eq('user_id', participant.user_id);
    setActionLoading(null);
  };

  const handleMatchConfirm = async () => {
    const blockedConfirmed = participants.filter((p) => p.status === 'confirmed' && p.user_id !== hostId && blockedUserIds.includes(p.user_id));
    if (blockedConfirmed.length > 0) {
      showToastMsg('차단된 유저는 매칭 확정이 불가합니다.');
      return;
    }
    const confirmedList = participants.filter((p) => p.status === 'confirmed' && p.user_id !== hostId);
    const confirmedIds = confirmedList.map((p) => p.user_id);
    if (court) {
      let totalMaleToAdd = 0;
      let totalFemaleToAdd = 0;
      for (const p of confirmedList) {
        const gender = p.profile?.gender;
        if (gender === 'male' || gender === '남성') totalMaleToAdd++;
        else totalFemaleToAdd++;
      }
      const courtExtra = court as Court & { current_participants?: number; capacity?: number };
      const newConfirmedMale = Math.min((court.male_slots ?? 0), (court.confirmed_male_slots ?? 0) + totalMaleToAdd);
      const newConfirmedFemale = Math.min((court.female_slots ?? 0), (court.confirmed_female_slots ?? 0) + totalFemaleToAdd);
      const newCurrentParticipants = (courtExtra.current_participants ?? 0) + confirmedList.length;
      const totalSlots = (court.male_slots ?? 0) + (court.female_slots ?? 0);
      const newTotalConfirmed = newConfirmedMale + newConfirmedFemale;
      const capacityVal = courtExtra.capacity ?? 0;
      const shouldClose = (totalSlots > 0 && newTotalConfirmed >= totalSlots) || (capacityVal > 0 && newCurrentParticipants >= capacityVal);
      await supabase.from('courts').update({
        confirmed_male_slots: newConfirmedMale,
        confirmed_female_slots: newConfirmedFemale,
        current_participants: newCurrentParticipants,
        ...(shouldClose ? { status: 'closed' } : {}),
      } as never).eq('id', court.id);
      setCourt((prev) => prev ? { ...prev, confirmed_male_slots: newConfirmedMale, confirmed_female_slots: newConfirmedFemale } as Court : prev);
    }
    await supabase
      .from('court_group_chats')
      .update({ confirmed_user_ids: confirmedIds })
      .eq('id', groupChatId!);
    if (isDating && includeMealProposal && user) {
      const mealInserts = confirmedIds.map((receiverId) =>
        supabase.from('meal_proposals').insert({
          group_chat_id: groupChatId,
          court_id: court?.id ?? null,
          sender_id: user.id,
          receiver_id: receiverId,
          status: 'pending',
        })
      );
      await Promise.all(mealInserts);
      loadPendingMealProposals();
    }
    const msg = isDating ? '💕 매칭 확정! 설레는 만남 기대해요 🥂' : '🎾 라인업 확정!';
    const ok = await supabase.from('court_group_chat_messages').insert({
      group_chat_id: groupChatId!,
      sender_id: null,
      content: msg,
      type: 'system',
      is_read: false,
    });
    if (!ok.error) {
      setMatchConfirmed(true);
      await fetchConfirmedParticipants();
      if (isDating && includeMealProposal) setShowMealSentPopup(true);
    }
    setIncludeMealProposal(false);
  };

  const handleMatchCancel = () => {
    setShowCancelConfirm(true);
  };

  const handleMatchCancelConfirm = async () => {
    setShowCancelConfirm(false);

    await supabase
      .from('court_group_chats')
      .update({ confirmed_user_ids: [] })
      .eq('id', groupChatId!);

    if (court) {
      const courtExtra = court as Court & { current_participants?: number; status?: string };
      const count = confirmedParticipants.length;
      const newCurrentParticipants = Math.max(0, (courtExtra.current_participants ?? 0) - count);
      const wasClosedNowOpen = courtExtra.status === 'closed';
      await supabase.from('courts').update({
        confirmed_male_slots: 0,
        confirmed_female_slots: 0,
        current_participants: newCurrentParticipants,
        ...(wasClosedNowOpen ? { status: 'open' } : {}),
      } as never).eq('id', court.id);
      setCourt((prev) => prev ? { ...prev, confirmed_male_slots: 0, confirmed_female_slots: 0 } as Court : prev);
    }
    await supabase.from('court_group_chat_messages').insert({
      group_chat_id: groupChatId!,
      sender_id: null,
      content: isDating ? '😢 아쉽게도 매칭이 취소됐어요.' : '😢 아쉽게도 매칭이 취소됐어요.',
      type: 'system',
      is_read: false,
    });
    setMatchConfirmed(false);
    setConfirmedParticipants([]);
  };

  const handleLeave = () => {
    setShowLeaveConfirm(true);
  };

  const confirmLeave = async () => {
    if (leaveReason.trim().length < 10) return;

    const myName = profile?.name ?? '알 수 없음';
    const leaveRequestMsg = `${myName}님이 나가기를 요청했어요. 사유: '${leaveReason.trim()}'`;
    await supabase.from('court_group_chat_messages').insert({
      group_chat_id: groupChatId!,
      sender_id: user!.id,
      content: leaveRequestMsg,
      type: 'leave_request',
      is_read: false,
      payload: { reason: leaveReason.trim(), requester_id: user!.id, status: 'pending' },
    });

    setShowLeaveConfirm(false);
    setLeaveReason('');
  };

  const handleLeaveRequestAccept = async (messageId: string, requesterId: string, reason: string) => {
    const { data: requesterProfile } = await supabase
      .from('profiles')
      .select('name')
      .eq('user_id', requesterId)
      .maybeSingle();

    const requesterName = requesterProfile?.name ?? '알 수 없음';
    const systemMsg = `${requesterName}님이 나갔어요`;

    await supabase.from('court_group_chat_messages').update({ payload: { reason, requester_id: requesterId, status: 'accepted' } }).eq('id', messageId);
    await supabase.from('court_group_chat_messages').insert({
      group_chat_id: groupChatId!,
      sender_id: null,
      content: systemMsg,
      type: 'system',
      is_read: false,
    });
    await supabase.from('court_group_chat_participants').delete().eq('group_chat_id', groupChatId!).eq('user_id', requesterId);
    await supabase.channel(`group_kick_${groupChatId}_${requesterId}`).send({
      type: 'broadcast',
      event: 'group_kick_user',
      payload: { kicked_user_id: requesterId },
    });

    if (court) {
      const { data: reqProfile } = await supabase.from('profiles').select('gender').eq('user_id', requesterId).maybeSingle();
      const courtExtra = court as Court & { current_participants?: number; status?: string };
      const isMaleLeaver = reqProfile?.gender === 'male' || reqProfile?.gender === '남성';
      const updates: Record<string, unknown> = {};
      if (isMaleLeaver && (court.confirmed_male_slots ?? 0) > 0) {
        updates.confirmed_male_slots = (court.confirmed_male_slots ?? 1) - 1;
        updates.male_slots = (court.male_slots ?? 0) + 1;
      } else if (!isMaleLeaver && (court.confirmed_female_slots ?? 0) > 0) {
        updates.confirmed_female_slots = (court.confirmed_female_slots ?? 1) - 1;
        updates.female_slots = (court.female_slots ?? 0) + 1;
      }
      updates.current_participants = Math.max(0, (courtExtra.current_participants ?? 0) - 1);
      if (courtExtra.status === 'closed') updates.status = 'open';
      await supabase.from('courts').update(updates as never).eq('id', court.id);
    }
  };

  const handleKickConfirm = async () => {
    if (!kickTarget || !user || !groupChatId) return;
    const { user_id: targetId, name: targetName } = kickTarget;
    setKickingId(targetId);
    try {
      const kickMsg = `${targetName}님이 퇴장되었습니다`;
      await supabase.from('court_group_chat_participants').delete().eq('group_chat_id', groupChatId).eq('user_id', targetId);
      await supabase.from('court_group_chat_messages').insert({
        group_chat_id: groupChatId,
        sender_id: null,
        content: kickMsg,
        type: 'system',
        is_read: false,
      });

      if (court) {
        const [courtRes, kickedProfRes] = await Promise.all([
          supabase.from('courts').select('male_slots, female_slots, confirmed_male_slots, confirmed_female_slots, status, current_participants').eq('id', court.id).maybeSingle(),
          supabase.from('profiles').select('gender').eq('user_id', targetId).maybeSingle(),
        ]);
        const courtData = courtRes.data as { male_slots?: number; female_slots?: number; confirmed_male_slots?: number; confirmed_female_slots?: number; status?: string; current_participants?: number } | null;
        const kickedGender = kickedProfRes.data?.gender;
        if (courtData) {
          const isMaleKicked = kickedGender === 'male' || kickedGender === '남성';
          const updates: Record<string, unknown> = {};
          if (isMaleKicked) {
            updates.confirmed_male_slots = Math.max(0, (courtData.confirmed_male_slots ?? 0) - 1);
          } else {
            updates.confirmed_female_slots = Math.max(0, (courtData.confirmed_female_slots ?? 0) - 1);
          }
          updates.current_participants = Math.max(0, (courtData.current_participants ?? 0) - 1);
          if (courtData.status === 'closed') updates.status = 'open';
          await supabase.from('courts').update(updates as never).eq('id', court.id);
        }
      }

      await supabase.channel(`group_kick_${groupChatId}_${targetId}`).send({
        type: 'broadcast',
        event: 'group_kick_user',
        payload: { kicked_user_id: targetId },
      });
      setParticipants((prev) => prev.filter((p) => p.user_id !== targetId));
    } catch (e) { console.error(e); }
    setKickingId(null);
    setShowKickConfirm(false);
    setKickTarget(null);
    setShowParticipants(false);
  };

  const handleBlockConfirm = async () => {
    if (!blockTarget || !user) return;
    const { user_id: targetId } = blockTarget;
    try {
      await supabase.from('blocks').upsert({ blocker_id: user.id, blocked_id: targetId }, { onConflict: 'blocker_id,blocked_id' });
      const raw = localStorage.getItem('blocked_users');
      const arr: string[] = raw ? JSON.parse(raw) : [];
      if (!arr.includes(targetId)) { arr.push(targetId); localStorage.setItem('blocked_users', JSON.stringify(arr)); }
      setBlockedUserIds((prev) => Array.from(new Set([...prev, targetId])));
    } catch (e) { console.error(e); }
    setShowBlockConfirm(false);
    setBlockTarget(null);
    setProfilePopupUser(null);
    setProfilePopupKickTarget(null);
  };

  const handleReportSubmit = async () => {
    if (!reportTarget || !user || !reportReason.trim()) return;
    setReportSubmitting(true);
    try {
      await supabase.from('reports').insert({ reporter_id: user.id, reported_id: reportTarget.user_id, reason: reportReason.trim() });
    } catch (e) { console.error(e); }
    setReportSubmitting(false);
    setShowReportPopup(false);
    setReportTarget(null);
    setReportReason('');
    setProfilePopupUser(null);
  };

  const loadPendingMealProposals = async () => {
    if (!user || !groupChatId) return;
    const { data: proposals } = await supabase
      .from('meal_proposals')
      .select('id, sender_id, receiver_id')
      .eq('group_chat_id', groupChatId)
      .eq('status', 'pending');
    if (!proposals || proposals.length === 0) {
      setPendingMealProposals([]);
      return;
    }
    const userIds = [...new Set([...proposals.map((p) => p.sender_id), ...proposals.map((p) => p.receiver_id)])];
    const { data: profilesData } = await supabase.from('profiles').select('user_id, name').in('user_id', userIds);
    const nameMap: Record<string, string> = {};
    (profilesData ?? []).forEach((p) => { nameMap[p.user_id] = p.name; });
    setPendingMealProposals(proposals.map((p) => ({
      id: p.id,
      sender_id: p.sender_id,
      receiver_id: p.receiver_id,
      sender_name: nameMap[p.sender_id],
    })));
  };

  const handleSendMealProposal = async (receiverId: string) => {
    if (!user || !groupChatId || mealProposalSubmitting) return;
    const existingPending = pendingMealProposals.find(
      (p) => p.sender_id === user.id && p.receiver_id === receiverId
    );
    if (existingPending) {
      showToastMsg('이미 식사 제안을 보냈습니다.');
      setShowMealProposalPicker(false);
      return;
    }
    setMealProposalSubmitting(true);
    try {
      await supabase.from('meal_proposals').insert({
        group_chat_id: groupChatId,
        court_id: court?.id ?? null,
        sender_id: user.id,
        receiver_id: receiverId,
        status: 'pending',
      });
      setShowMealProposalPicker(false);
      setShowMealSentPopup(true);
      loadPendingMealProposals();
    } catch (e) {
      console.error(e);
    } finally {
      setMealProposalSubmitting(false);
    }
  };

  const handleMealProposalAccept = async (proposalId: string) => {
    await supabase.from('meal_proposals').update({ status: 'accepted' }).eq('id', proposalId);
    loadPendingMealProposals();
    setShowMealAcceptPopup(true);
  };

  const handleMealProposalReject = async () => {
    if (!mealRejectProposalId || !mealRejectReason.trim()) return;
    setMealRejectSubmitting(true);
    try {
      await supabase.from('meal_proposals').update({
        status: 'rejected',
        rejection_reason: mealRejectReason.trim(),
      }).eq('id', mealRejectProposalId);
      setShowMealRejectPopup(false);
      setMealRejectProposalId(null);
      setMealRejectReason('');
      showToastMsg('식사 제안을 거절했어요.');
      loadPendingMealProposals();
    } catch (e) {
      console.error(e);
    } finally {
      setMealRejectSubmitting(false);
    }
  };

  const accentColor = isDating ? '#C9A84C' : '#C9A84C';
  const hostAccentColor = isDating ? '#C9A84C' : '#C9A84C';
  const headerBg = isDating ? 'linear-gradient(135deg, #C9547A 0%, #E8A0BF 100%)' : 'linear-gradient(135deg, #2D6A4F 0%, #40916C 100%)';
  const chatBg = isDating
    ? 'linear-gradient(160deg, #FFF4F7 0%, #FFF8F2 50%, #FFF5EC 100%)'
    : '#F0F4F1';
  const myBubbleBg = isDating
    ? 'linear-gradient(135deg, #8B2252 0%, #C9547A 100%)'
    : 'linear-gradient(135deg, #1B4332 0%, #2D6A4F 100%)';
  const otherBubbleBg = isDating ? '#FFF5F8' : '#fff';
  const otherBubbleBorder = isDating ? '1px solid rgba(201,84,122,0.15)' : '1px solid rgba(45,106,79,0.12)';
  const participantPanelBg = isDating
    ? 'linear-gradient(135deg, #FFFBF7 0%, #FFF5F8 100%)'
    : '#fff';
  const participantItemBg = isDating ? 'rgba(201,84,122,0.05)' : 'rgba(45,106,79,0.05)';
  const participantTitleColor = isDating ? '#2D1820' : '#1B4332';

  return (
    <div className="min-h-screen flex flex-col" style={{ background: chatBg }}>
      {toast && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-[100] px-4 py-2.5 rounded-2xl text-sm font-semibold text-white shadow-lg pointer-events-none" style={{ background: 'rgba(30,30,30,0.88)', backdropFilter: 'blur(8px)', maxWidth: '80vw', textAlign: 'center' }}>
          {toast}
        </div>
      )}
      <header
        className="px-4 pt-3 pb-2.5 flex items-start gap-3 sticky top-0 z-10 flex-shrink-0"
        style={{ background: headerBg, borderBottom: `1px solid ${isDating ? 'rgba(201,84,122,0.25)' : 'rgba(45,106,79,0.25)'}`, boxShadow: isDating ? '0 2px 16px rgba(201,84,122,0.2)' : '0 2px 16px rgba(45,106,79,0.2)' }}
      >
        <button onClick={() => navigate(-1)} className="p-1.5 rounded-full transition active:scale-90 mt-0.5" style={{ background: 'rgba(255,255,255,0.08)' }}>
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>
        <div className="flex items-start gap-2.5 flex-1 min-w-0">
          <button
            onClick={() => setShowConversationSheet(true)}
            className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0 overflow-hidden active:opacity-75 transition focus:outline-none mt-0.5"
            style={{ background: isDating ? 'linear-gradient(135deg, #8B2252 0%, #C9547A 100%)' : 'linear-gradient(135deg, #1B4332 0%, #2D6A4F 100%)', boxShadow: `0 0 0 2px ${accentColor}40` }}
          >
            {(isDating ? hostProfile?.photo_url : (hostProfile?.tennis_photo_url || hostProfile?.photo_url)) ? (
              <img
                src={(isDating ? hostProfile!.photo_url : (hostProfile!.tennis_photo_url || hostProfile!.photo_url))!}
                alt={hostProfile!.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-sm">{hostProfile?.name?.charAt(0) ?? (isDating ? '🥂' : '🎾')}</span>
            )}
          </button>
          <div className="flex-1 min-w-0">
            {/* 1줄: 호스트 이름 + GROUP 뱃지 + 인원 */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <p className="font-bold text-[15px] text-white leading-tight">
                {hostProfile?.name ?? (isDating ? '설레는 만남 그룹' : '테니스 그룹')}
              </p>
              <span
                className="text-[9px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 tracking-wide"
                style={{ background: 'rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.8)' }}
              >
                GROUP
              </span>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ background: 'rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.75)' }}>
                {participants.length}명
              </span>
            </div>
            {/* 2줄: 장소명 + 코트번호 */}
            {court?.court_name && (
              <p className="text-[12px] font-semibold mt-1 leading-snug" style={{ color: 'rgba(255,255,255,0.9)' }}>
                {court.court_name}{(court as { court_number?: string }).court_number ? ` · ${/^\d+$/.test(String((court as { court_number?: string }).court_number).trim()) ? `${String((court as { court_number?: string }).court_number).trim()}번 코트` : (court as { court_number?: string }).court_number}` : ''}
              </p>
            )}
            {/* 3줄: 날짜 · 시간 */}
            {court?.date && (
              <p className="text-[11px] mt-0.5 leading-snug" style={{ color: 'rgba(255,255,255,0.6)' }}>
                {new Date(court.date).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' })}{court.start_time ? `  ${court.start_time}${court.end_time ? ` – ${court.end_time}` : ''}` : ''}
              </p>
            )}
          </div>
        </div>
        <button
          onClick={() => setShowParticipants(true)}
          className="flex items-center gap-0.5 px-1 py-1 rounded-full transition active:scale-95 focus:outline-none"
          style={{ background: 'rgba(255,255,255,0.06)' }}
          aria-label="참가자 목록 보기"
        >
          {participants.slice(0, 4).map((av, i) => {
            const avBlocked = blockedUserIds.includes(av.user_id);
            const avPhoto = avBlocked ? null : (isDating ? av.profile?.photo_url : (av.profile?.tennis_photo_url || av.profile?.photo_url));
            return (
              <div
                key={av.id}
                className="w-7 h-7 rounded-full flex-shrink-0 overflow-hidden flex items-center justify-center text-white font-bold text-xs border-2"
                style={{
                  background: avBlocked ? '#E5E7EB' : (isDating ? 'linear-gradient(135deg, #8B2252 0%, #C9547A 100%)' : 'linear-gradient(135deg, #1B4332 0%, #2D6A4F 100%)'),
                  borderColor: isDating ? '#3D2230' : '#0F2118',
                  marginLeft: i > 0 ? -8 : 0,
                  zIndex: 4 - i,
                  position: 'relative' as const,
                }}
              >
                {avBlocked ? (
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="#9CA3AF" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                ) : avPhoto ? (
                  <img src={avPhoto} alt={av.profile?.name ?? ''} className="w-full h-full object-cover" />
                ) : (
                  <span style={{ fontSize: 9 }}>{av.profile?.name?.charAt(0) ?? '?'}</span>
                )}
              </div>
            );
          })}
          {participants.length > 4 && (
            <div
              className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-white font-bold border-2"
              style={{ background: 'rgba(255,255,255,0.18)', borderColor: isDating ? '#3D2230' : '#0F2118', marginLeft: -8, zIndex: 0, position: 'relative', fontSize: 9 }}
            >
              +{participants.length - 4}
            </div>
          )}
          <Users className="w-4 h-4 text-white ml-1.5 opacity-70" />
        </button>
        {!isHost && (
          <button
            onClick={handleLeave}
            className="p-2 rounded-full transition active:scale-90"
            style={{ background: 'rgba(239,68,68,0.15)' }}
          >
            <LogOut className="w-4 h-4 text-red-400" />
          </button>
        )}
      </header>

      {court && (() => {
        const totalMale = court.male_slots ?? 0;
        const totalFemale = court.female_slots ?? 0;
        const filledMale = Math.min(court.confirmed_male_slots ?? 0, totalMale);
        const filledFemale = Math.min(court.confirmed_female_slots ?? 0, totalFemale);
        const totalSlots = totalMale + totalFemale;
        const filledSlots = filledMale + filledFemale;
        const isFull = totalSlots > 0 && filledSlots >= totalSlots;
        if (totalSlots === 0) return null;
        return (
          <div
            className="px-4 py-2 flex items-center justify-between flex-shrink-0"
            style={{ background: isDating ? '#2A1525' : '#162f22', borderBottom: `1px solid ${accentColor}25` }}
          >
            <span className="text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.7)' }}>
              {isFull ? '마감 ✅' : `현재 ${filledSlots}/${totalSlots}명 모집중 ${isDating ? '🥂' : '🎾'}`}
            </span>
            <div className="flex items-center gap-3">
              {totalMale > 0 && (
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.6)' }}>남</span>
                  <span className="text-xs font-bold" style={{ color: filledMale >= totalMale ? '#4ADE80' : 'rgba(255,255,255,0.85)' }}>
                    {filledMale}/{totalMale}{filledMale >= totalMale ? ' 마감' : ''}
                  </span>
                </div>
              )}
              {totalFemale > 0 && (
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.6)' }}>여</span>
                  <span className="text-xs font-bold" style={{ color: filledFemale >= totalFemale ? '#4ADE80' : 'rgba(255,255,255,0.85)' }}>
                    {filledFemale}/{totalFemale}{filledFemale >= totalFemale ? ' 마감' : ''}
                  </span>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {isHost && (
        <div
          className="px-3 py-2 flex-shrink-0"
          style={{ background: isDating ? 'rgba(255,245,250,0.95)' : '#fff', borderBottom: `1px solid ${isDating ? 'rgba(201,84,122,0.12)' : 'rgba(45,106,79,0.1)'}` }}
        >
          {matchConfirmed ? (
            <div className="flex items-center justify-center gap-1.5 py-1.5">
              <span className="text-sm font-semibold" style={{ color: hostAccentColor }}>✅ 매칭 확정됨</span>
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              {isDating && (
                <button
                  type="button"
                  onClick={() => setIncludeMealProposal((v) => !v)}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-xl transition active:scale-95"
                  style={{
                    background: includeMealProposal
                      ? 'linear-gradient(135deg, #FFF0F5 0%, #FFE4EF 100%)'
                      : 'rgba(0,0,0,0.04)',
                    border: includeMealProposal
                      ? '1.5px solid rgba(224,92,138,0.35)'
                      : '1.5px solid rgba(0,0,0,0.07)',
                  }}
                >
                  <div
                    className="w-4 h-4 rounded flex items-center justify-center flex-shrink-0"
                    style={{
                      background: includeMealProposal
                        ? 'linear-gradient(135deg, #E05C8A 0%, #C9547A 100%)'
                        : '#fff',
                      border: includeMealProposal ? 'none' : '1.5px solid rgba(0,0,0,0.2)',
                    }}
                  >
                    {includeMealProposal && (
                      <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 12 12" stroke="#fff" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2 6l3 3 5-5" />
                      </svg>
                    )}
                  </div>
                  <UtensilsCrossed className="w-3.5 h-3.5 flex-shrink-0" style={{ color: includeMealProposal ? '#C9547A' : '#9CA3AF' }} />
                  <span className="text-xs font-semibold" style={{ color: includeMealProposal ? '#7C2D5E' : '#6B7280' }}>
                    경기 후 식사도 함께 제안하기
                  </span>
                </button>
              )}
              <div className="flex gap-2">
                <button
                  onClick={handleMatchConfirm}
                  className="flex-1 py-2 rounded-xl text-sm font-semibold active:scale-[0.98] transition flex items-center justify-center gap-1"
                  style={{ background: isDating ? 'linear-gradient(135deg, #C9A84C 0%, #E8C66A 100%)' : 'linear-gradient(135deg, #2D6A4F 0%, #40916C 100%)', boxShadow: isDating ? '0 2px 12px rgba(201,168,76,0.3)' : '0 2px 12px rgba(45,106,79,0.25)', color: '#fff' }}
                >
                  ✅ 매칭 확정하기
                </button>
                <button
                  onClick={handleMatchCancel}
                  className="flex-1 py-2 rounded-xl text-sm font-semibold active:scale-[0.98] transition flex items-center justify-center gap-1"
                  style={{ background: isDating ? 'rgba(255,220,230,0.6)' : 'rgba(210,230,220,0.65)', color: isDating ? '#A83060' : '#2D6A4F', border: `1px solid ${isDating ? 'rgba(168,48,96,0.2)' : 'rgba(45,106,79,0.2)'}` }}
                >
                  ❌ 매칭 취소하기
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {showParticipants && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
          style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)' }}
          onClick={() => setShowParticipants(false)}
        >
          <div
            className="w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl"
            style={{ background: participantPanelBg, maxHeight: '70vh', display: 'flex', flexDirection: 'column' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 pt-5 pb-3 flex items-center justify-between flex-shrink-0">
              <p className="text-base font-bold" style={{ color: participantTitleColor }}>
                참가자 {participants.length}명
              </p>
              <button
                onClick={() => setShowParticipants(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center"
                style={{ background: isDating ? 'rgba(201,84,122,0.1)' : 'rgba(45,106,79,0.1)' }}
              >
                <X className="w-4 h-4" style={{ color: isDating ? '#C9547A' : '#2D6A4F' }} />
              </button>
            </div>
            <div className="overflow-y-auto px-4 pb-5 flex flex-col gap-2">
              {participants.map((p) => {
                const pProfile = p.profile;
                const isParticipantHost = p.user_id === hostId;
                const isMe = p.user_id === user?.id;
                const isBlocked = blockedUserIds.includes(p.user_id);
                const displayName = isBlocked ? '알 수 없음' : (pProfile?.name ?? '알 수 없음');
                const photo = isBlocked ? null : (isDating ? pProfile?.photo_url : (pProfile?.tennis_photo_url || pProfile?.photo_url));

                return (
                  <div
                    key={p.id}
                    className="flex items-center gap-3 px-3 py-3 rounded-2xl cursor-pointer active:opacity-75 transition"
                    style={{ background: participantItemBg }}
                    onClick={() => {
                      if (isBlocked) {
                        showToastMsg('차단된 유저입니다.');
                        return;
                      }
                      if (isMe) {
                        if (pProfile) setProfilePopupUser(pProfile);
                        return;
                      }
                      if (pProfile) {
                        setProfilePopupUser(pProfile);
                        if (isHost && !isParticipantHost) {
                          setProfilePopupKickTarget({ user_id: p.user_id, name: displayName });
                        } else {
                          setProfilePopupKickTarget(null);
                        }
                      }
                    }}
                  >
                    <div
                      className="w-10 h-10 rounded-full flex-shrink-0 overflow-hidden flex items-center justify-center text-white font-bold text-sm"
                      style={{ background: isBlocked ? '#E5E7EB' : (isDating ? 'linear-gradient(135deg, #8B2252 0%, #C9547A 100%)' : 'linear-gradient(135deg, #1B4332 0%, #2D6A4F 100%)') }}
                    >
                      {isBlocked ? (
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="#9CA3AF" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      ) : photo ? (
                        <img src={photo} alt={displayName} className="w-full h-full object-cover" />
                      ) : (
                        <span>{displayName.charAt(0)}</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-semibold truncate" style={{ color: isBlocked ? '#9CA3AF' : participantTitleColor }}>
                          {displayName}
                        </span>
                        {isParticipantHost && (
                          <span className="text-xs font-bold px-1.5 py-0.5 rounded-full flex-shrink-0" style={{ background: isDating ? 'rgba(201,168,76,0.15)' : 'rgba(201,168,76,0.15)', color: '#C9A84C' }}>호스트</span>
                        )}
                        {isMe && !isParticipantHost && (
                          <span className="text-xs opacity-40 flex-shrink-0">(나)</span>
                        )}
                      </div>
                      {p.status === 'confirmed' && (
                        <span className="text-xs font-medium" style={{ color: isDating ? '#C9547A' : '#2D6A4F' }}>
                          확정 {isDating ? '💌' : '🎾'}
                        </span>
                      )}
                    </div>
                    {isHost && !isParticipantHost && (
                      <button
                        disabled={kickingId === p.user_id}
                        onClick={(e) => {
                          e.stopPropagation();
                          setKickTarget({ user_id: p.user_id, name: displayName });
                          setShowKickConfirm(true);
                        }}
                        className="text-xs font-bold px-2.5 py-1.5 rounded-xl transition active:scale-95 flex-shrink-0"
                        style={{ color: '#DC2626', background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.2)' }}
                      >
                        {kickingId === p.user_id ? '...' : '강퇴'}
                      </button>
                    )}
                  </div>
                );
              })}
              {participants.length === 0 && (
                <p className="text-sm text-center py-4" style={{ color: isDating ? 'rgba(139,48,96,0.4)' : 'rgba(27,67,50,0.4)' }}>참가자가 없습니다.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {isHost && participants.filter((p) => p.status === 'pending' && p.user_id !== hostId).length > 0 && (
        <div
          className="flex-shrink-0 px-4 py-3"
          style={{ background: isDating ? 'rgba(255,248,235,0.95)' : 'rgba(255,250,235,0.95)', borderTop: `1px solid ${accentColor}30` }}
        >
          <p className="text-xs font-semibold mb-2" style={{ color: isDating ? '#8B6000' : '#7A5C00' }}>대기 중인 참가 신청</p>
          <div className="flex flex-col gap-2">
            {participants
              .filter((p) => p.status === 'pending' && p.user_id !== hostId)
              .map((p) => (
                <div key={p.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 overflow-hidden"
                      style={{ background: isDating ? 'linear-gradient(135deg, #8B2252 0%, #C9547A 100%)' : 'linear-gradient(135deg, #1B4332 0%, #2D6A4F 100%)' }}
                    >
                      {p.profile?.photo_url ? (
                        <img src={p.profile.photo_url} alt={p.profile.name} className="w-full h-full rounded-full object-cover" />
                      ) : (
                        p.profile?.name?.charAt(0) || 'U'
                      )}
                    </div>
                    <span className="text-sm font-medium" style={{ color: participantTitleColor }}>{p.profile?.name}</span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      disabled={actionLoading === p.user_id}
                      onClick={() => handleConfirmParticipant(p)}
                      className="text-xs px-3 py-1.5 rounded-lg font-semibold text-white transition disabled:opacity-50 active:scale-95"
                      style={{ background: isDating ? 'linear-gradient(135deg, #8B2252 0%, #C9547A 100%)' : '#2D6A4F' }}
                    >
                      매칭 확정
                    </button>
                    <button
                      disabled={actionLoading === p.user_id}
                      onClick={() => handleRejectParticipant(p)}
                      className="text-xs bg-gray-200 text-gray-600 px-3 py-1.5 rounded-lg hover:bg-gray-300 transition disabled:opacity-50 font-semibold active:scale-95"
                    >
                      매칭 취소
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {isDating && pendingMealProposals.filter((p) => p.receiver_id === user?.id).map((proposal) => (
        <div
          key={proposal.id}
          className="mx-3 my-2 rounded-2xl px-4 py-3.5 flex items-center gap-3 flex-shrink-0"
          style={{ background: 'linear-gradient(135deg, #FFF0F5 0%, #FFE8F0 100%)', border: '1.5px solid rgba(224,92,138,0.28)', boxShadow: '0 2px 10px rgba(224,92,138,0.1)' }}
        >
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #F9A8C9 0%, #F472B6 100%)' }}
          >
            <UtensilsCrossed className="w-3.5 h-3.5 text-white" />
          </div>
          <p className="flex-1 text-xs font-semibold leading-snug" style={{ color: '#7C2D5E' }}>
            <span style={{ color: '#C9547A' }}>{proposal.sender_name ?? '호스트'}</span>님이<br />경기 후 식사를 제안했어요 :)
          </p>
          <div className="flex gap-1.5 flex-shrink-0">
            <button
              onClick={() => handleMealProposalAccept(proposal.id)}
              className="px-3 py-1.5 rounded-xl text-xs font-bold text-white transition active:scale-95"
              style={{ background: 'linear-gradient(135deg, #E05C8A 0%, #C9547A 100%)', boxShadow: '0 2px 6px rgba(224,92,138,0.35)' }}
            >
              수락
            </button>
            <button
              onClick={() => { setMealRejectProposalId(proposal.id); setShowMealRejectPopup(true); }}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold transition active:scale-95"
              style={{ background: 'rgba(156,28,67,0.07)', color: '#9C1C43', border: '1px solid rgba(156,28,67,0.15)' }}
            >
              다음에
            </button>
          </div>
        </div>
      ))}

      <div className="flex-1 overflow-y-auto px-4 py-4">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div
              className="w-7 h-7 border-2 border-t-transparent rounded-full animate-spin"
              style={{ borderColor: isDating ? 'rgba(201,84,122,0.4)' : 'rgba(45,106,79,0.4)', borderTopColor: 'transparent' }}
            />
          </div>
        ) : (
          <div className="space-y-1">
            {messages.map((message, idx) => {
              if (message.type === 'system') {
                return (
                  <div key={message.id} className="flex justify-center py-2">
                    <span
                      className="text-xs px-4 py-1.5 rounded-full font-medium"
                      style={{ background: isDating ? 'rgba(201,84,122,0.08)' : 'rgba(45,106,79,0.08)', color: isDating ? '#8B3060' : '#2D6A4F' }}
                    >
                      {message.content}
                    </span>
                  </div>
                );
              }

              if (message.type === 'leave_request') {
                const payload = message.payload as { reason: string; requester_id: string; status: string } | null;
                const reqStatus = payload?.status ?? 'pending';
                const requesterId = payload?.requester_id ?? '';
                const reason = payload?.reason ?? '';
                const isMyRequest = requesterId === user?.id;
                return (
                  <div key={message.id} className="flex justify-center py-2">
                    <div className="max-w-[85%] rounded-2xl overflow-hidden" style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)' }}>
                      <div className="px-4 py-3 text-center">
                        <p className="text-xs font-semibold text-red-500 mb-1">나가기 요청</p>
                        <p className="text-xs text-gray-600 leading-relaxed">{message.content}</p>
                        {isHost && reason && (
                          <p className="text-xs text-gray-500 mt-1 leading-relaxed">사유: {reason}</p>
                        )}
                      </div>
                      {isHost && reqStatus === 'pending' && (
                        <div className="flex border-t border-red-100">
                          <button
                            onClick={() => handleLeaveRequestAccept(message.id, requesterId, reason)}
                            className="flex-1 py-2.5 text-xs font-semibold text-white bg-red-500 hover:bg-red-600 transition"
                          >
                            나가기 수락
                          </button>
                        </div>
                      )}
                      {!isHost && !isMyRequest && reqStatus === 'pending' && (
                        <div className="px-4 py-2 text-xs text-center text-gray-400 border-t border-red-100">호스트가 처리 중</div>
                      )}
                      {reqStatus === 'accepted' && (
                        <div className="px-4 py-2 text-xs text-center text-gray-400 border-t border-red-100">수락됨</div>
                      )}
                    </div>
                  </div>
                );
              }

              const isMe = message.sender_id === user!.id;
              const senderProfile = message.sender as Profile | undefined;
              const isBlocked = !isMe && message.sender_id ? blockedUserIds.includes(message.sender_id) : false;

              if (isBlocked && message.sender_id) {
                const blockedSenderId = message.sender_id;
                return (
                  <div key={message.id} className="flex items-center gap-2 py-0.5 px-1">
                    <button
                      className="flex items-center gap-2 focus:outline-none"
                      onClick={() => {
                        setUnblockMessageTarget({ user_id: blockedSenderId });
                        setShowUnblockMessagePopup(true);
                      }}
                    >
                      <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: '#E5E7EB' }}>
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="#9CA3AF" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                      <span className="text-sm font-medium" style={{ color: '#9CA3AF' }}>알 수 없음</span>
                    </button>
                  </div>
                );
              }

              const prevMsg = idx > 0 ? messages[idx - 1] : null;
              const nextMsg = idx < messages.length - 1 ? messages[idx + 1] : null;
              const showDate = !prevMsg || new Date(message.created_at).toDateString() !== new Date(prevMsg.created_at).toDateString();
              const isLastInSenderGroup = !nextMsg || nextMsg.sender_id !== message.sender_id || nextMsg.type === 'system';
              const showAvatar = !isMe && isLastInSenderGroup;
              const isFirstInGroup = !isMe && (!prevMsg || prevMsg.sender_id !== message.sender_id);
              const senderPhoto = senderProfile ? (isDating ? senderProfile.photo_url : (senderProfile.tennis_photo_url || senderProfile.photo_url)) : null;
              const groupUnread = !message.id.startsWith('temp_') ? getGroupUnreadCount(message.created_at) : 0;

              return (
                <div key={message.id}>
                  {showDate && (
                    <div className="flex justify-center py-3">
                      <span className="text-xs px-3 py-1 rounded-full font-medium" style={{ background: isDating ? 'rgba(183,110,121,0.1)' : 'rgba(0,100,0,0.08)', color: isDating ? '#8B4060' : '#2D6A4F' }}>
                        {new Date(message.created_at).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' })}
                      </span>
                    </div>
                  )}

                  {isMe ? (
                    <div className="flex justify-end items-end gap-1.5 py-[2px] pl-12">
                      <div className="flex flex-col items-end flex-shrink-0 gap-0.5 mb-0.5">
                        {groupUnread > 0 && (
                          <span className="text-xs font-bold leading-none" style={{ color: isDating ? '#B76E79' : '#C9A84C' }}>{groupUnread}</span>
                        )}
                        <span className="text-[10px] whitespace-nowrap" style={{ color: isDating ? 'rgba(139,48,96,0.45)' : 'rgba(27,67,50,0.45)' }}>
                          {new Date(message.created_at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <div
                        className="px-3.5 py-2.5 rounded-2xl rounded-br-sm max-w-[68%] text-white"
                        style={{ background: myBubbleBg }}
                      >
                        <p className="text-sm leading-relaxed break-words whitespace-pre-wrap">{message.content}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start gap-2 py-[2px] pr-12">
                      <div className="w-9 flex-shrink-0 flex flex-col items-center" style={{ minWidth: 36 }}>
                        {showAvatar ? (
                          (() => {
                            const avatarBlocked = message.sender_id ? blockedUserIds.includes(message.sender_id) : false;
                            return (
                              <div
                                className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold overflow-hidden cursor-pointer active:opacity-80"
                                style={{ background: avatarBlocked ? '#E5E7EB' : (isDating ? 'linear-gradient(135deg, #8B2252 0%, #B76E79 100%)' : 'linear-gradient(135deg, #004d20 0%, #006400 100%)'), boxShadow: avatarBlocked ? 'none' : `0 0 0 2px ${isDating ? 'rgba(183,110,121,0.25)' : 'rgba(0,100,0,0.18)'}` }}
                                onClick={!avatarBlocked && senderProfile ? () => setProfilePopupUser(senderProfile) : undefined}
                              >
                                {avatarBlocked ? (
                                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="#9CA3AF" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                  </svg>
                                ) : senderPhoto ? (
                                  <img src={senderPhoto} alt={senderProfile?.name ?? ''} className="w-full h-full object-cover" />
                                ) : (
                                  <span className="text-sm">{senderProfile?.name?.charAt(0) ?? '?'}</span>
                                )}
                              </div>
                            );
                          })()
                        ) : (
                          <div className="w-9 h-9" />
                        )}
                      </div>
                      <div className="flex flex-col items-start max-w-[68%]">
                        {isFirstInGroup && senderProfile?.name && (
                          <span className="text-xs font-semibold mb-1 ml-0.5" style={{ color: isDating ? '#B76E79' : '#006400' }}>
                            {senderProfile.name}
                          </span>
                        )}
                        <div className="flex items-end gap-1.5">
                          <div
                            className="px-3.5 py-2.5 rounded-2xl rounded-tl-sm shadow-sm"
                            style={{ background: otherBubbleBg, border: otherBubbleBorder }}
                          >
                            <p className="text-sm leading-relaxed break-words whitespace-pre-wrap" style={{ color: isDating ? '#2D1820' : '#0F2118' }}>{message.content}</p>
                          </div>
                          <div className="flex flex-col items-start flex-shrink-0 mb-1 gap-0.5">
                            {groupUnread > 0 && (
                              <span className="text-xs font-bold leading-none" style={{ color: isDating ? '#B76E79' : '#C9A84C' }}>{groupUnread}</span>
                            )}
                            <span className="text-[10px] whitespace-nowrap" style={{ color: isDating ? 'rgba(139,48,96,0.4)' : 'rgba(27,67,50,0.4)' }}>
                              {new Date(message.created_at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      <div
        className="px-4 py-3 flex-shrink-0"
        style={{ background: isDating ? 'rgba(255,248,244,0.97)' : '#fff', borderTop: isDating ? '1px solid rgba(201,84,122,0.12)' : '1px solid rgba(45,106,79,0.1)', backdropFilter: 'blur(16px)' }}
      >
        <form onSubmit={handleSubmit} className="flex gap-2 items-center">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="메시지를 입력하세요..."
            className="flex-1 px-4 py-3 rounded-full text-sm focus:outline-none transition"
            style={{
              background: isDating ? 'rgba(255,245,250,0.9)' : 'rgba(240,244,241,0.9)',
              border: isDating ? '1.5px solid rgba(201,84,122,0.2)' : '1.5px solid rgba(45,106,79,0.2)',
              color: isDating ? '#2D1820' : '#0F2118',
              fontSize: 16,
            }}
          />
          <button
            type="submit"
            disabled={!newMessage.trim()}
            className="w-12 h-12 rounded-full flex items-center justify-center transition active:scale-90 disabled:opacity-40"
            style={{ background: isDating ? 'linear-gradient(135deg, #8B2252 0%, #C9547A 100%)' : 'linear-gradient(135deg, #1B4332 0%, #2D6A4F 100%)' }}
          >
            <Send className="w-5 h-5 text-white" />
          </button>
        </form>
      </div>

      {showCancelConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center"
          style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}
          onClick={() => setShowCancelConfirm(false)}
        >
          <div
            className="w-full max-w-md rounded-t-3xl px-5 pt-5 shadow-xl"
            style={{
              background: isDating ? '#FFF8F2' : '#F4F8F5',
              paddingBottom: 'max(env(safe-area-inset-bottom), 24px)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="w-10 h-1 rounded-full mx-auto mb-4"
              style={{ background: isDating ? 'rgba(201,84,122,0.35)' : 'rgba(27,67,50,0.3)' }}
            />
            <p className="font-bold text-gray-900 text-base text-center mb-1">
              {isDating ? '매칭 취소할 참여자 목록' : '라인업 취소할 참여자 목록'}
            </p>
            <p className="text-xs text-gray-400 text-center mb-5">
              확정된 참여자만 표시됩니다
            </p>
            <div className="flex flex-col gap-2 mb-4">
              {confirmedParticipants.map((p) => (
                <div
                  key={p.user_id}
                  className="flex items-center gap-3 w-full px-4 py-3 rounded-2xl"
                  style={{ background: '#fff', border: `1.5px solid ${isDating ? 'rgba(201,84,122,0.18)' : 'rgba(27,67,50,0.15)'}` }}
                >
                  <div
                    className="w-10 h-10 rounded-full flex-shrink-0 overflow-hidden flex items-center justify-center text-white font-bold text-sm"
                    style={{ background: isDating ? 'linear-gradient(135deg, #8B2252 0%, #C9547A 100%)' : 'linear-gradient(135deg, #1B4332 0%, #2D6A4F 100%)' }}
                  >
                    {(isDating ? p.photo_url : (p.tennis_photo_url || p.photo_url))
                      ? <img src={(isDating ? p.photo_url : (p.tennis_photo_url || p.photo_url))!} alt={p.name} className="w-full h-full object-cover" />
                      : <span>{p.name?.charAt(0) ?? '?'}</span>}
                  </div>
                  <span className="flex-1 text-sm font-semibold" style={{ color: '#1a1a1a' }}>{p.name}</span>
                  <span
                    className="text-xs font-semibold px-2.5 py-1 rounded-full text-white"
                    style={{ background: isDating ? 'linear-gradient(135deg, #8B2252 0%, #C9547A 100%)' : 'linear-gradient(135deg, #1B4332 0%, #2D6A4F 100%)' }}
                  >
                    확정됨
                  </span>
                </div>
              ))}
              {confirmedParticipants.length === 0 && (
                <p className="text-sm text-center py-4" style={{ color: 'rgba(0,0,0,0.4)' }}>확정된 참여자가 없습니다.</p>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowCancelConfirm(false)}
                className="flex-1 py-3 rounded-2xl font-semibold text-sm transition active:scale-95"
                style={{ background: '#F3F4F6', color: '#374151' }}
              >
                닫기
              </button>
              <button
                onClick={handleMatchCancelConfirm}
                className="flex-1 py-3 rounded-2xl font-semibold text-sm text-white transition active:scale-95"
                style={{ background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' }}
              >
                매칭 취소하기
              </button>
            </div>
          </div>
        </div>
      )}

      {showLeaveConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center"
          style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
          onClick={() => { setShowLeaveConfirm(false); setLeaveReason(''); }}
        >
          <div
            className="rounded-t-3xl w-full max-w-md overflow-hidden shadow-xl px-5 pt-5 pb-8"
            style={{ background: isDating ? 'linear-gradient(135deg, #FFFBF7 0%, #FFF5F8 100%)' : '#fff' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-5" />
            <p className="font-bold text-base text-center mb-1" style={{ color: isDating ? '#2D1820' : '#0F2118' }}>
              나가기 전에 사유를 입력해주세요 😢
            </p>
            <p className="text-sm text-center mb-4 leading-relaxed" style={{ color: 'rgba(0,0,0,0.45)' }}>
              호스트에게 나가기 요청이 전달됩니다.
            </p>
            <textarea
              value={leaveReason}
              onChange={(e) => setLeaveReason(e.target.value)}
              placeholder="예) 갑자기 일정이 생겼어요. 죄송합니다 😢"
              className="w-full rounded-xl border px-4 py-3 text-sm resize-none focus:outline-none transition"
              style={{ border: isDating ? '1.5px solid rgba(201,84,122,0.25)' : '1.5px solid rgba(45,106,79,0.2)', fontSize: '16px', background: isDating ? 'rgba(255,245,250,0.7)' : '#FAFAFA' }}
              rows={3}
            />
            <p className="text-xs text-gray-400 mt-1 mb-4 text-right">{leaveReason.length}자 (최소 10자)</p>
            <div className="flex gap-2">
              <button
                onClick={() => { setShowLeaveConfirm(false); setLeaveReason(''); }}
                className="flex-1 py-3 rounded-xl text-sm font-semibold text-gray-500 transition"
                style={{ background: '#F3F4F6' }}
              >
                취소
              </button>
              <button
                onClick={confirmLeave}
                disabled={leaveReason.trim().length < 10}
                className="flex-1 py-3 rounded-xl text-sm font-semibold text-white transition disabled:opacity-40"
                style={{ background: '#EF4444' }}
              >
                나가기 요청
              </button>
            </div>
          </div>
        </div>
      )}

      {showKickConfirm && kickTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-6"
          style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)' }}
          onClick={() => { setShowKickConfirm(false); setKickTarget(null); }}
        >
          <div
            className="w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl px-6 py-7"
            style={{ background: isDating ? 'linear-gradient(135deg, #FFFBF7 0%, #FFF5F8 100%)' : '#fff' }}
            onClick={(e) => e.stopPropagation()}
          >
            <p className="font-bold text-base text-center mb-2" style={{ color: isDating ? '#2D1820' : '#0F2118' }}>
              {kickTarget.name}님을 강퇴할까요?
            </p>
            <p className="text-sm text-center mb-6" style={{ color: 'rgba(0,0,0,0.45)' }}>
              강퇴된 유저는 채팅방에서 즉시 퇴장됩니다.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => { setShowKickConfirm(false); setKickTarget(null); }}
                className="flex-1 py-3 rounded-xl text-sm font-semibold text-gray-500"
                style={{ background: '#F3F4F6' }}
              >
                취소
              </button>
              <button
                onClick={handleKickConfirm}
                disabled={kickingId === kickTarget.user_id}
                className="flex-1 py-3 rounded-xl text-sm font-semibold text-white disabled:opacity-50"
                style={{ background: '#EF4444' }}
              >
                강퇴
              </button>
            </div>
          </div>
        </div>
      )}

      {showConversationSheet && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center"
          style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}
          onClick={() => setShowConversationSheet(false)}
        >
          <div
            className="w-full max-w-md rounded-t-3xl shadow-2xl"
            style={{
              background: isDating ? 'linear-gradient(135deg, #FFFBF7 0%, #FFF5F8 100%)' : '#fff',
              paddingBottom: 'max(env(safe-area-inset-bottom), 24px)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="w-10 h-1 rounded-full mx-auto mt-4 mb-4"
              style={{ background: isDating ? 'rgba(201,84,122,0.3)' : 'rgba(27,67,50,0.25)' }}
            />
            <p
              className="text-sm font-bold text-center mb-3 px-5"
              style={{ color: isDating ? '#2D1820' : '#1B4332' }}
            >
              대화상대
            </p>
            <div className="flex flex-col gap-1 px-4 pb-2 max-h-72 overflow-y-auto">
              {participants.map((p) => {
                const pProfile = p.profile;
                const isMe = p.user_id === user?.id;
                const isParticipantHost = p.user_id === hostId;
                const isBlocked = blockedUserIds.includes(p.user_id);
                const displayName = isBlocked ? '알 수 없음' : (pProfile?.name ?? '알 수 없음');
                const photo = isBlocked ? null : (isDating ? pProfile?.photo_url : (pProfile?.tennis_photo_url || pProfile?.photo_url));
                return (
                  <button
                    key={p.id}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-2xl text-left transition active:opacity-70 focus:outline-none"
                    style={{ background: isDating ? 'rgba(201,84,122,0.05)' : 'rgba(45,106,79,0.05)' }}
                    onClick={() => {
                      if (isBlocked) {
                        setShowConversationSheet(false);
                        setUnblockListTarget({ user_id: p.user_id });
                        setShowUnblockFromListPopup(true);
                        return;
                      }
                      if (pProfile) {
                        setProfilePopupUser(pProfile);
                        if (isHost && !isParticipantHost && !isMe) {
                          setProfilePopupKickTarget({ user_id: p.user_id, name: displayName });
                        } else {
                          setProfilePopupKickTarget(null);
                        }
                      }
                      setShowConversationSheet(false);
                    }}
                  >
                    <div
                      className="w-10 h-10 rounded-full flex-shrink-0 overflow-hidden flex items-center justify-center text-white font-bold text-sm"
                      style={{ background: isBlocked ? '#E5E7EB' : (isDating ? 'linear-gradient(135deg, #8B2252 0%, #C9547A 100%)' : 'linear-gradient(135deg, #1B4332 0%, #2D6A4F 100%)') }}
                    >
                      {isBlocked ? (
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="#9CA3AF" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      ) : photo ? (
                        <img src={photo} alt={displayName} className="w-full h-full object-cover" />
                      ) : (
                        <span>{displayName.charAt(0)}</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span
                          className="text-sm font-semibold truncate"
                          style={{ color: isBlocked ? '#9CA3AF' : (isDating ? '#2D1820' : '#1B4332') }}
                        >
                          {displayName}
                        </span>
                        {isParticipantHost && (
                          <span className="text-xs font-bold px-1.5 py-0.5 rounded-full flex-shrink-0" style={{ background: 'rgba(201,168,76,0.15)', color: '#C9A84C' }}>호스트</span>
                        )}
                        {isMe && !isParticipantHost && (
                          <span className="text-xs opacity-40 flex-shrink-0">(나)</span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
            <div className="px-4 pt-2">
              <button
                onClick={() => setShowConversationSheet(false)}
                className="w-full py-3 rounded-2xl text-sm font-semibold transition active:scale-95"
                style={{ background: '#F3F4F6', color: '#374151' }}
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}

      {profilePopupUser && (() => {
        const popupPhoto = isDating
          ? (profilePopupUser.photo_url || null)
          : (profilePopupUser.tennis_photo_url || profilePopupUser.photo_url || null);
        const popupPhotos: string[] = [];
        if (isDating) {
          if (profilePopupUser.photo_url) popupPhotos.push(profilePopupUser.photo_url);
          if (profilePopupUser.photo_urls) profilePopupUser.photo_urls.forEach((u: string) => { if (u && !popupPhotos.includes(u)) popupPhotos.push(u); });
        }
        const genderLabel = profilePopupUser.gender === 'male' || profilePopupUser.gender === '남성' ? '남성' : profilePopupUser.gender === 'female' || profilePopupUser.gender === '여성' ? '여성' : profilePopupUser.gender ?? '';

        return (
          <div
            className="fixed inset-0 z-[55] flex items-end justify-center"
            style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}
            onClick={() => { setProfilePopupUser(null); setProfilePopupKickTarget(null); }}
          >
            {isDating ? (
              <div
                className="w-full max-w-md rounded-t-3xl overflow-hidden shadow-2xl"
                style={{ background: '#FFF5F7', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}
                onClick={(e) => e.stopPropagation()}
              >
                <div
                  className="flex-shrink-0 relative"
                  style={{ background: 'linear-gradient(135deg, #FDA4AF 0%, #FECDD3 100%)', paddingTop: 20, paddingBottom: 24, paddingLeft: 24, paddingRight: 24 }}
                >
                  <button
                    onClick={() => { setProfilePopupUser(null); setProfilePopupKickTarget(null); }}
                    className="absolute top-4 right-4 z-10 w-9 h-9 rounded-full flex items-center justify-center transition active:scale-90"
                    style={{ background: 'rgba(255,255,255,0.3)', border: '1px solid rgba(255,255,255,0.5)' }}
                  >
                    <X className="w-4 h-4 text-white" />
                  </button>
                  <div className="flex items-center gap-1 mb-1" style={{ opacity: 0.9 }}>
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                      <path d="M5 1.5 L6.2 4 L9 4.3 L7 6.2 L7.5 9 L5 7.6 L2.5 9 L3 6.2 L1 4.3 L3.8 4 Z" fill="#fff" />
                    </svg>
                    <span style={{ color: '#fff', fontSize: 10, letterSpacing: '0.18em', fontWeight: 700, textTransform: 'uppercase' }}>Flirty Meeting</span>
                  </div>
                  <p style={{ color: '#fff', fontSize: '1.75rem', fontWeight: 800, lineHeight: 1.1, letterSpacing: '-0.02em', textShadow: '0 1px 4px rgba(0,0,0,0.1)' }}>{profilePopupUser.name}</p>
                  <div className="flex items-center gap-2 mt-1.5">
                    {profilePopupUser.age && <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold" style={{ background: 'rgba(255,255,255,0.35)', color: '#fff', border: '1px solid rgba(255,255,255,0.5)' }}>{profilePopupUser.age}세</span>}
                    {genderLabel && <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold" style={{ background: 'rgba(255,255,255,0.35)', color: '#fff', border: '1px solid rgba(255,255,255,0.5)' }}>{genderLabel}</span>}
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto" style={{ background: '#FFF5F7' }}>
                  <div
                    className="relative mx-5 mt-5 rounded-2xl overflow-hidden"
                    style={{ aspectRatio: '4/3', border: '2px solid rgba(253,164,175,0.2)', boxShadow: '0 6px 24px rgba(253,164,175,0.15)' }}
                  >
                    {popupPhotos.length > 0 ? (
                      <img src={popupPhotos[0]} alt={profilePopupUser.name} className="w-full h-full object-cover" style={{ objectPosition: 'center top' }} />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #FDA4AF 0%, #FECDD3 100%)' }}>
                        <span style={{ fontSize: '4rem', color: '#fff', fontWeight: 700 }}>{profilePopupUser.name?.charAt(0) ?? '?'}</span>
                      </div>
                    )}
                  </div>
                  <div className="mx-5 mt-4 flex flex-col gap-2.5">
                    {profilePopupUser.experience && (
                      <div className="flex items-center gap-3 px-4 py-3 rounded-2xl" style={{ background: '#fff', border: '1.5px solid rgba(253,164,175,0.25)', boxShadow: '0 2px 8px rgba(253,164,175,0.08)' }}>
                        <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(253,164,175,0.15)' }}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FDA4AF" strokeWidth="2"><ellipse cx="12" cy="12" rx="10" ry="10" /><path d="M2 12 Q12 4 22 12" /><path d="M2 12 Q12 20 22 12" /></svg>
                        </div>
                        <div>
                          <p style={{ color: '#FDA4AF', fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase' }}>테니스 구력</p>
                          <p style={{ color: '#9f1239', fontSize: 14, fontWeight: 700, marginTop: 1 }}>{profilePopupUser.experience}</p>
                        </div>
                      </div>
                    )}
                    {profilePopupUser.height && (
                      <div className="flex items-center gap-3 px-4 py-3 rounded-2xl" style={{ background: '#fff', border: '1.5px solid rgba(253,164,175,0.25)', boxShadow: '0 2px 8px rgba(253,164,175,0.08)' }}>
                        <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(253,164,175,0.15)' }}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FDA4AF" strokeWidth="2"><path d="M12 3v18M8 6h8M8 12h8M8 18h8" strokeLinecap="round" /></svg>
                        </div>
                        <div>
                          <p style={{ color: '#FDA4AF', fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase' }}>키</p>
                          <p style={{ color: '#9f1239', fontSize: 14, fontWeight: 700, marginTop: 1 }}>{profilePopupUser.height}cm</p>
                        </div>
                      </div>
                    )}
                    {profilePopupUser.mbti && (
                      <div className="flex items-center gap-3 px-4 py-3 rounded-2xl" style={{ background: '#fff', border: '1.5px solid rgba(253,164,175,0.25)', boxShadow: '0 2px 8px rgba(253,164,175,0.08)' }}>
                        <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(253,164,175,0.15)' }}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FDA4AF" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" /></svg>
                        </div>
                        <div>
                          <p style={{ color: '#FDA4AF', fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase' }}>MBTI</p>
                          <p style={{ color: '#9f1239', fontSize: 14, fontWeight: 700, marginTop: 1 }}>{profilePopupUser.mbti}</p>
                        </div>
                      </div>
                    )}
                  </div>
                  {profilePopupUser.bio && (
                    <div className="mx-5 mt-3 p-4 rounded-2xl" style={{ background: '#fff', border: '1.5px solid rgba(253,164,175,0.25)' }}>
                      <p style={{ color: '#FDA4AF', fontSize: 10, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 8 }}>자기소개</p>
                      <p style={{ color: '#9f1239', fontSize: 13, lineHeight: 1.7, fontStyle: 'italic' }}>"{profilePopupUser.bio}"</p>
                    </div>
                  )}
                </div>
                {profilePopupUser.user_id !== user?.id && (
                  <div className="px-5 pb-6 pt-3 flex flex-col gap-2 flex-shrink-0" style={{ background: '#FFF5F7' }}>
                    {profilePopupKickTarget && (
                      <button onClick={() => { setKickTarget(profilePopupKickTarget); setShowKickConfirm(true); setProfilePopupUser(null); setProfilePopupKickTarget(null); }} className="w-full py-3 rounded-xl text-sm font-bold transition active:scale-95" style={{ background: 'rgba(220,38,38,0.1)', color: '#DC2626', border: '1px solid rgba(220,38,38,0.25)' }}>강퇴하기</button>
                    )}
                    <div className="flex gap-2">
                      <button onClick={() => { setBlockTarget({ user_id: profilePopupUser.user_id, name: profilePopupUser.name }); setShowBlockConfirm(true); }} className="flex-1 py-3 rounded-xl text-sm font-semibold transition active:scale-95" style={{ background: 'rgba(239,68,68,0.08)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.2)' }}>차단하기</button>
                      <button onClick={() => { setReportTarget({ user_id: profilePopupUser.user_id, name: profilePopupUser.name }); setReportReason(''); setShowReportPopup(true); setProfilePopupUser(null); setProfilePopupKickTarget(null); }} className="flex-1 py-3 rounded-xl text-sm font-semibold transition active:scale-95" style={{ background: 'rgba(249,115,22,0.08)', color: '#EA580C', border: '1px solid rgba(249,115,22,0.2)' }}>신고하기</button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div
                className="w-full max-w-md rounded-t-3xl overflow-hidden shadow-2xl"
                style={{ background: '#F0FAFB', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}
                onClick={(e) => e.stopPropagation()}
              >
                <div
                  className="flex-shrink-0 relative"
                  style={{ background: 'linear-gradient(135deg, #38BDF8 0%, #6EE7B7 60%, #86EFAC 100%)', paddingTop: 20, paddingBottom: 24, paddingLeft: 24, paddingRight: 24 }}
                >
                  <button
                    onClick={() => { setProfilePopupUser(null); setProfilePopupKickTarget(null); }}
                    className="absolute top-4 right-4 z-10 w-9 h-9 rounded-full flex items-center justify-center transition active:scale-90"
                    style={{ background: 'rgba(255,255,255,0.25)', border: '1px solid rgba(255,255,255,0.4)' }}
                  >
                    <X className="w-4 h-4 text-white" />
                  </button>
                  <div className="flex items-center gap-1 mb-1" style={{ opacity: 0.85 }}>
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                      <circle cx="5" cy="5" r="4" stroke="#fff" strokeWidth="1.2" />
                      <path d="M2 5 Q5 2 8 5 Q5 8 2 5Z" stroke="#fff" strokeWidth="1" fill="none" />
                    </svg>
                    <span style={{ color: '#fff', fontSize: 10, letterSpacing: '0.18em', fontWeight: 700, textTransform: 'uppercase' }}>Tennis Member</span>
                  </div>
                  <div className="flex items-end justify-between">
                    <div>
                      <p style={{ color: '#fff', fontSize: '1.75rem', fontWeight: 800, lineHeight: 1.1, letterSpacing: '-0.02em', textShadow: '0 1px 4px rgba(0,0,0,0.15)' }}>{profilePopupUser.name}</p>
                      <div className="flex items-center gap-2 mt-1.5">
                        {profilePopupUser.age && <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold" style={{ background: 'rgba(255,255,255,0.3)', color: '#fff', border: '1px solid rgba(255,255,255,0.45)' }}>{profilePopupUser.age}세</span>}
                        {genderLabel && <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold" style={{ background: 'rgba(255,255,255,0.3)', color: '#fff', border: '1px solid rgba(255,255,255,0.45)' }}>{genderLabel}</span>}
                      </div>
                    </div>
                    <div
                      className="rounded-2xl overflow-hidden flex-shrink-0"
                      style={{ width: 72, height: 72, border: '2.5px solid rgba(255,255,255,0.6)', boxShadow: '0 4px 20px rgba(0,0,0,0.2)' }}
                    >
                      {popupPhoto ? (
                        <img src={popupPhoto} alt={profilePopupUser.name} className="w-full h-full object-cover" style={{ objectPosition: 'center top' }} />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.2)' }}>
                          <span style={{ color: '#fff', fontSize: '1.8rem', fontWeight: 700 }}>{profilePopupUser.name?.charAt(0) ?? '?'}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto" style={{ background: '#F0FAFB' }}>
                  {popupPhoto && (
                    <div className="mx-5 mt-5 rounded-2xl overflow-hidden" style={{ aspectRatio: '4/3', border: '2px solid rgba(56,189,248,0.15)', boxShadow: '0 4px 16px rgba(56,189,248,0.1)' }}>
                      <img src={popupPhoto} alt={profilePopupUser.name} className="w-full h-full object-cover" style={{ objectPosition: 'center top' }} />
                    </div>
                  )}
                  <div className="mx-5 mt-4 grid grid-cols-3 gap-3">
                    {profilePopupUser.experience && (
                      <div className="flex flex-col items-center gap-1.5 py-3 px-2 rounded-2xl" style={{ background: '#fff', border: '1.5px solid rgba(56,189,248,0.2)', boxShadow: '0 2px 8px rgba(56,189,248,0.07)' }}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#38BDF8" strokeWidth="1.8"><ellipse cx="12" cy="12" rx="10" ry="10" /><path d="M2 12 Q12 4 22 12" /><path d="M2 12 Q12 20 22 12" /></svg>
                        <span style={{ color: '#0EA5E9', fontSize: 11, fontWeight: 700, textAlign: 'center' }}>구력</span>
                        <span style={{ color: '#0c4a6e', fontSize: 12, fontWeight: 800 }}>{profilePopupUser.experience}</span>
                      </div>
                    )}
                    {profilePopupUser.tennis_style && (
                      <div className="flex flex-col items-center gap-1.5 py-3 px-2 rounded-2xl" style={{ background: '#fff', border: '1.5px solid rgba(56,189,248,0.2)', boxShadow: '0 2px 8px rgba(56,189,248,0.07)' }}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#38BDF8" strokeWidth="1.8"><path d="M5.5 19L19 5.5" strokeLinecap="round" /><path d="M4 7a3 3 0 006 0 3 3 0 00-6 0z" /><path d="M14 17a3 3 0 006 0 3 3 0 00-6 0z" /><circle cx="8" cy="20" r="1.5" fill="#38BDF8" /></svg>
                        <span style={{ color: '#0EA5E9', fontSize: 11, fontWeight: 700, textAlign: 'center' }}>스타일</span>
                        <span style={{ color: '#0c4a6e', fontSize: 11, fontWeight: 800, textAlign: 'center', lineHeight: 1.3 }}>{profilePopupUser.tennis_style}</span>
                      </div>
                    )}
                    {profilePopupUser.height && (
                      <div className="flex flex-col items-center gap-1.5 py-3 px-2 rounded-2xl" style={{ background: '#fff', border: '1.5px solid rgba(56,189,248,0.2)', boxShadow: '0 2px 8px rgba(56,189,248,0.07)' }}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#38BDF8" strokeWidth="1.8"><path d="M12 3v18M8 6h8M8 12h8M8 18h8" strokeLinecap="round" /></svg>
                        <span style={{ color: '#0EA5E9', fontSize: 11, fontWeight: 700, textAlign: 'center' }}>키</span>
                        <span style={{ color: '#0c4a6e', fontSize: 12, fontWeight: 800 }}>{profilePopupUser.height}cm</span>
                      </div>
                    )}
                  </div>
                  {profilePopupUser.bio && (
                    <div className="mx-5 mt-4 p-4 rounded-2xl" style={{ background: '#fff', border: '1.5px solid rgba(56,189,248,0.18)' }}>
                      <p style={{ color: '#0EA5E9', fontSize: 10, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 8 }}>자기소개</p>
                      <p style={{ color: '#0c4a6e', fontSize: 13, lineHeight: 1.7, fontStyle: 'italic' }}>"{profilePopupUser.bio}"</p>
                    </div>
                  )}
                </div>
                {profilePopupUser.user_id !== user?.id && (
                  <div className="px-5 pb-6 pt-3 flex flex-col gap-2 flex-shrink-0" style={{ background: '#F0FAFB' }}>
                    {profilePopupKickTarget && (
                      <button onClick={() => { setKickTarget(profilePopupKickTarget); setShowKickConfirm(true); setProfilePopupUser(null); setProfilePopupKickTarget(null); }} className="w-full py-3 rounded-xl text-sm font-bold transition active:scale-95" style={{ background: 'rgba(220,38,38,0.1)', color: '#DC2626', border: '1px solid rgba(220,38,38,0.25)' }}>강퇴하기</button>
                    )}
                    <div className="flex gap-2">
                      <button onClick={() => { setBlockTarget({ user_id: profilePopupUser.user_id, name: profilePopupUser.name }); setShowBlockConfirm(true); }} className="flex-1 py-3 rounded-xl text-sm font-semibold transition active:scale-95" style={{ background: 'rgba(239,68,68,0.08)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.2)' }}>차단하기</button>
                      <button onClick={() => { setReportTarget({ user_id: profilePopupUser.user_id, name: profilePopupUser.name }); setReportReason(''); setShowReportPopup(true); setProfilePopupUser(null); setProfilePopupKickTarget(null); }} className="flex-1 py-3 rounded-xl text-sm font-semibold transition active:scale-95" style={{ background: 'rgba(249,115,22,0.08)', color: '#EA580C', border: '1px solid rgba(249,115,22,0.2)' }}>신고하기</button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })()}

      {showBlockConfirm && blockTarget && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center px-6"
          style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)' }}
          onClick={() => { setShowBlockConfirm(false); setBlockTarget(null); }}
        >
          <div
            className="w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl px-6 py-7"
            style={{ background: isDating ? 'linear-gradient(135deg, #FFFBF7 0%, #FFF5F8 100%)' : '#fff' }}
            onClick={(e) => e.stopPropagation()}
          >
            <p className="font-bold text-base text-center mb-2" style={{ color: isDating ? '#2D1820' : '#0F2118' }}>
              이 유저를 차단하시겠어요?
            </p>
            <p className="text-sm text-center mb-6" style={{ color: 'rgba(0,0,0,0.45)' }}>
              차단하면 해당 유저의 메시지가 보이지 않습니다.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => { setShowBlockConfirm(false); setBlockTarget(null); }}
                className="flex-1 py-3 rounded-xl text-sm font-semibold text-gray-500"
                style={{ background: '#F3F4F6' }}
              >
                취소
              </button>
              <button
                onClick={handleBlockConfirm}
                className="flex-1 py-3 rounded-xl text-sm font-semibold text-white"
                style={{ background: '#EF4444' }}
              >
                차단하기
              </button>
            </div>
          </div>
        </div>
      )}

      {showReportPopup && reportTarget && (
        <div
          className="fixed inset-0 z-[60] flex items-end justify-center"
          style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)' }}
          onClick={() => { setShowReportPopup(false); setReportTarget(null); }}
        >
          <div
            className="w-full max-w-md rounded-t-3xl overflow-hidden shadow-2xl px-5 pt-5 pb-8"
            style={{ background: isDating ? 'linear-gradient(135deg, #FFFBF7 0%, #FFF5F8 100%)' : '#fff' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-5" />
            <p className="font-bold text-base text-center mb-1" style={{ color: isDating ? '#2D1820' : '#0F2118' }}>
              {reportTarget.name}님을 신고하기
            </p>
            <textarea
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
              placeholder="신고 사유를 입력해주세요..."
              className="w-full rounded-xl border px-4 py-3 text-sm resize-none focus:outline-none mt-4 mb-4"
              style={{ border: isDating ? '1.5px solid rgba(201,84,122,0.25)' : '1.5px solid rgba(45,106,79,0.2)', fontSize: '16px' }}
              rows={3}
            />
            <div className="flex gap-2">
              <button
                onClick={() => { setShowReportPopup(false); setReportTarget(null); }}
                className="flex-1 py-3 rounded-xl text-sm font-semibold text-gray-500"
                style={{ background: '#F3F4F6' }}
              >
                취소
              </button>
              <button
                onClick={handleReportSubmit}
                disabled={!reportReason.trim() || reportSubmitting}
                className="flex-1 py-3 rounded-xl text-sm font-semibold text-white disabled:opacity-50"
                style={{ background: '#EF4444' }}
              >
                {reportSubmitting ? '제출 중...' : '신고'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showUnblockFromListPopup && unblockListTarget && (
        <div
          className="fixed inset-0 z-[65] flex items-center justify-center px-6"
          style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)' }}
          onClick={() => { setShowUnblockFromListPopup(false); setUnblockListTarget(null); }}
        >
          <div
            className="w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl px-6 py-7"
            style={{ background: isDating ? 'linear-gradient(135deg, #FFFBF7 0%, #FFF5F8 100%)' : '#fff' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: '#E5E7EB' }}>
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="#9CA3AF" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
            </div>
            <p className="font-bold text-base text-center mb-2" style={{ color: isDating ? '#2D1820' : '#0F2118' }}>
              알 수 없음
            </p>
            <p className="text-sm text-center mb-6" style={{ color: 'rgba(0,0,0,0.45)' }}>
              차단한 유저입니다. 차단을 해제하면 메시지와 프로필이 표시됩니다.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => { setShowUnblockFromListPopup(false); setUnblockListTarget(null); }}
                className="flex-1 py-3 rounded-xl text-sm font-semibold text-gray-500"
                style={{ background: '#F3F4F6' }}
              >
                닫기
              </button>
              <button
                onClick={async () => {
                  if (!unblockListTarget || !user) return;
                  const targetId = unblockListTarget.user_id;
                  await supabase.from('blocks').delete().eq('blocker_id', user.id).eq('blocked_id', targetId);
                  const raw = localStorage.getItem('blocked_users');
                  const arr: string[] = raw ? JSON.parse(raw) : [];
                  localStorage.setItem('blocked_users', JSON.stringify(arr.filter((id) => id !== targetId)));
                  setBlockedUserIds((prev) => prev.filter((id) => id !== targetId));
                  setShowUnblockFromListPopup(false);
                  setUnblockListTarget(null);
                }}
                className="flex-1 py-3 rounded-xl text-sm font-semibold transition active:scale-95"
                style={isDating
                  ? { background: 'transparent', color: '#C9A84C', border: '1.5px solid #C9A84C' }
                  : { background: '#1B4332', color: '#fff' }
                }
              >
                차단 해제하기
              </button>
            </div>
          </div>
        </div>
      )}

      {showMealSentPopup && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center px-6"
          style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(8px)' }}
          onClick={() => setShowMealSentPopup(false)}
        >
          <div
            className="w-full max-w-xs rounded-3xl shadow-2xl px-7 py-8 flex flex-col items-center gap-4"
            style={{ background: 'linear-gradient(135deg, #FFF0F5 0%, #FFE4EF 100%)', border: '1.5px solid rgba(224,92,138,0.25)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #F9A8C9 0%, #F472B6 100%)', boxShadow: '0 4px 20px rgba(244,114,182,0.4)' }}
            >
              <UtensilsCrossed className="w-7 h-7 text-white" />
            </div>
            <div className="text-center">
              <p className="text-lg font-bold mb-2" style={{ color: '#C9547A' }}>식사 제안이 전해졌어요 :)</p>
              <p className="text-sm" style={{ color: 'rgba(124,45,94,0.65)' }}>상대방의 답장을 기다려요!</p>
            </div>
            <button
              onClick={() => setShowMealSentPopup(false)}
              className="w-full py-3 rounded-2xl text-sm font-bold text-white transition active:scale-95"
              style={{ background: 'linear-gradient(135deg, #E05C8A 0%, #C9547A 100%)', boxShadow: '0 4px 16px rgba(224,92,138,0.4)' }}
            >
              알겠어요!
            </button>
          </div>
        </div>
      )}

      {showMealAcceptPopup && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center px-6"
          style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(8px)' }}
          onClick={() => setShowMealAcceptPopup(false)}
        >
          <div
            className="w-full max-w-xs rounded-3xl shadow-2xl px-7 py-8 flex flex-col items-center gap-4"
            style={{ background: 'linear-gradient(135deg, #FFF0F5 0%, #FFE4EF 100%)', border: '1.5px solid rgba(224,92,138,0.25)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #F9A8C9 0%, #F472B6 100%)', boxShadow: '0 4px 20px rgba(244,114,182,0.4)' }}
            >
              <UtensilsCrossed className="w-7 h-7 text-white" />
            </div>
            <div className="text-center">
              <p className="text-lg font-bold mb-1" style={{ color: '#7C2D5E' }}>경기 후 약속,</p>
              <p className="text-lg font-bold mb-2" style={{ color: '#C9547A' }}>미리 잡아봐요 :)</p>
              <p className="text-sm" style={{ color: 'rgba(124,45,94,0.65)' }}>수락이 전달됐어요. 경기 후 함께해요!</p>
            </div>
            <button
              onClick={() => setShowMealAcceptPopup(false)}
              className="w-full py-3 rounded-2xl text-sm font-bold text-white transition active:scale-95"
              style={{ background: 'linear-gradient(135deg, #E05C8A 0%, #C9547A 100%)', boxShadow: '0 4px 16px rgba(224,92,138,0.4)' }}
            >
              좋아요!
            </button>
          </div>
        </div>
      )}

      {showMealRejectPopup && mealRejectProposalId && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center px-6"
          style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)' }}
          onClick={() => { setShowMealRejectPopup(false); setMealRejectProposalId(null); setMealRejectReason(''); }}
        >
          <div
            className="w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl px-6 py-7"
            style={{ background: 'linear-gradient(135deg, #FFFBF7 0%, #FFF5F8 100%)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-base font-bold text-gray-900 mb-1 text-center">식사 제안 거절</h2>
            <p className="text-xs text-gray-400 text-center mb-4">거절 이유를 직접 입력해주세요</p>
            <textarea
              value={mealRejectReason}
              onChange={(e) => setMealRejectReason(e.target.value)}
              placeholder="거절 이유를 입력해주세요"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm resize-none outline-none focus:border-amber-400 mb-4"
              rows={3}
            />
            <div className="flex gap-3">
              <button
                onClick={() => { setShowMealRejectPopup(false); setMealRejectProposalId(null); setMealRejectReason(''); }}
                className="flex-1 py-3 rounded-xl text-sm font-semibold transition"
                style={{ background: '#F3F4F6', color: '#374151' }}
              >
                취소
              </button>
              <button
                onClick={handleMealProposalReject}
                disabled={!mealRejectReason.trim() || mealRejectSubmitting}
                className="flex-1 py-3 rounded-xl text-sm font-semibold text-white transition disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, #C9A84C 0%, #D4896A 100%)' }}
              >
                {mealRejectSubmitting ? '처리 중...' : '거절하기'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showUnblockMessagePopup && unblockMessageTarget && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center px-6"
          style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)' }}
          onClick={() => { setShowUnblockMessagePopup(false); setUnblockMessageTarget(null); }}
        >
          <div
            className="w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl px-6 py-7"
            style={{ background: isDating ? 'linear-gradient(135deg, #FFFBF7 0%, #FFF5F8 100%)' : '#fff' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: '#E5E7EB' }}>
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="#9CA3AF" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
            </div>
            <p className="font-bold text-base text-center mb-2" style={{ color: isDating ? '#2D1820' : '#0F2118' }}>
              알 수 없음
            </p>
            <p className="text-sm text-center mb-6" style={{ color: 'rgba(0,0,0,0.45)' }}>
              차단한 유저입니다. 차단을 해제하면 메시지가 표시됩니다.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => { setShowUnblockMessagePopup(false); setUnblockMessageTarget(null); }}
                className="flex-1 py-3 rounded-xl text-sm font-semibold text-gray-500"
                style={{ background: '#F3F4F6' }}
              >
                닫기
              </button>
              <button
                onClick={async () => {
                  if (!unblockMessageTarget || !user) return;
                  const targetId = unblockMessageTarget.user_id;
                  await supabase.from('blocks').delete().eq('blocker_id', user.id).eq('blocked_id', targetId);
                  const raw = localStorage.getItem('blocked_users');
                  const arr: string[] = raw ? JSON.parse(raw) : [];
                  localStorage.setItem('blocked_users', JSON.stringify(arr.filter((id) => id !== targetId)));
                  setBlockedUserIds((prev) => prev.filter((id) => id !== targetId));
                  setShowUnblockMessagePopup(false);
                  setUnblockMessageTarget(null);
                }}
                className="flex-1 py-3 rounded-xl text-sm font-semibold transition active:scale-95"
                style={isDating
                  ? { background: 'transparent', color: '#C9A84C', border: '1.5px solid #C9A84C' }
                  : { background: '#1B4332', color: '#fff' }
                }
              >
                차단 해제하기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
