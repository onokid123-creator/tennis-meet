import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronLeft, Plus, X, Upload, MessageSquare,
  CheckCircle, Clock, AlertCircle, MoreVertical, Pencil, Trash2,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

type InquiryCategory = 'bug' | 'feature' | 'inconvenience' | 'other';
type InquiryStatus = 'received' | 'reviewing' | 'answered';
type ViewMode = 'list' | 'write' | 'edit' | 'detail';

interface Inquiry {
  id: string;
  category: InquiryCategory;
  title: string;
  content: string;
  image_urls: string[];
  status: InquiryStatus;
  admin_reply: string | null;
  created_at: string;
  answered_at: string | null;
  is_deleted: boolean;
}

const CATEGORY_LABELS: Record<InquiryCategory, string> = {
  bug: '버그 신고',
  feature: '기능 요청',
  inconvenience: '불편 사항',
  other: '기타',
};

const CATEGORY_COLORS: Record<InquiryCategory, { bg: string; text: string }> = {
  bug: { bg: 'rgba(220,38,38,0.1)', text: '#DC2626' },
  feature: { bg: 'rgba(37,99,235,0.1)', text: '#2563EB' },
  inconvenience: { bg: 'rgba(217,119,6,0.1)', text: '#D97706' },
  other: { bg: 'rgba(75,85,99,0.1)', text: '#4B5563' },
};

const STATUS_CONFIG: Record<InquiryStatus, { label: string; icon: typeof Clock; color: string; bg: string }> = {
  received: { label: '접수됨', icon: Clock, color: '#6B7280', bg: 'rgba(107,114,128,0.1)' },
  reviewing: { label: '확인중', icon: AlertCircle, color: '#D97706', bg: 'rgba(217,119,6,0.1)' },
  answered: { label: '답변완료', icon: CheckCircle, color: '#059669', bg: 'rgba(5,150,105,0.1)' },
};

function formatDate(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}

function CategorySelector({
  value,
  onChange,
}: {
  value: InquiryCategory;
  onChange: (v: InquiryCategory) => void;
}) {
  return (
    <div className="bg-white rounded-2xl p-5" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
      <p className="text-xs font-semibold text-gray-500 mb-2">카테고리</p>
      <div className="grid grid-cols-2 gap-2">
        {(Object.keys(CATEGORY_LABELS) as InquiryCategory[]).map((cat) => {
          const col = CATEGORY_COLORS[cat];
          const isSelected = value === cat;
          return (
            <button
              key={cat}
              onClick={() => onChange(cat)}
              className="py-2.5 px-3 rounded-xl text-sm font-semibold transition active:scale-95"
              style={{
                background: isSelected ? col.bg : 'rgba(0,0,0,0.04)',
                color: isSelected ? col.text : '#9CA3AF',
                border: isSelected ? `1.5px solid ${col.text}30` : '1.5px solid transparent',
              }}
            >
              {CATEGORY_LABELS[cat]}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function InquiryPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedInquiry, setSelectedInquiry] = useState<Inquiry | null>(null);

  const [category, setCategory] = useState<InquiryCategory>('bug');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [existingImageUrls, setExistingImageUrls] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const fetchInquiries = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data } = await supabase
        .from('inquiries')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false });
      setInquiries(data ?? []);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchInquiries();
  }, [fetchInquiries]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenuId(null);
      }
    };
    if (openMenuId) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [openMenuId]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    const totalExisting = existingImageUrls.length + imageFiles.length;
    if (totalExisting + files.length > 3) {
      alert('사진은 최대 3장까지 첨부 가능합니다.');
      return;
    }
    const newFiles = [...imageFiles, ...files].slice(0, 3 - existingImageUrls.length);
    setImageFiles(newFiles);
    const previews = newFiles.map((f) => URL.createObjectURL(f));
    setImagePreviews(previews);
  };

  const removeNewImage = (idx: number) => {
    const newFiles = imageFiles.filter((_, i) => i !== idx);
    setImageFiles(newFiles);
    setImagePreviews(newFiles.map((f) => URL.createObjectURL(f)));
  };

  const removeExistingImage = (idx: number) => {
    setExistingImageUrls((prev) => prev.filter((_, i) => i !== idx));
  };

  const resetForm = () => {
    setTitle('');
    setContent('');
    setCategory('bug');
    setImageFiles([]);
    setImagePreviews([]);
    setExistingImageUrls([]);
  };

  const handleSubmit = async () => {
    if (!user || !title.trim() || !content.trim()) return;
    setSubmitting(true);
    try {
      const uploadedUrls: string[] = [];
      for (const file of imageFiles) {
        const ext = file.name.split('.').pop();
        const path = `inquiries/${user.id}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
        const { error: uploadErr } = await supabase.storage
          .from('profile-images')
          .upload(path, file, { upsert: true });
        if (!uploadErr) {
          const { data: urlData } = supabase.storage.from('profile-images').getPublicUrl(path);
          if (urlData?.publicUrl) uploadedUrls.push(urlData.publicUrl);
        }
      }

      const finalUrls = [...existingImageUrls, ...uploadedUrls];

      if (viewMode === 'edit' && selectedInquiry) {
        const { error } = await supabase.from('inquiries').update({
          category,
          title: title.trim(),
          content: content.trim(),
          image_urls: finalUrls,
        }).eq('id', selectedInquiry.id);

        if (!error) {
          await fetchInquiries();
          resetForm();
          setSelectedInquiry(null);
          setViewMode('list');
        }
      } else {
        const { error } = await supabase.from('inquiries').insert({
          user_id: user.id,
          category,
          title: title.trim(),
          content: content.trim(),
          image_urls: finalUrls,
        });

        if (!error) {
          await fetchInquiries();
          resetForm();
          setViewMode('list');
        }
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditOpen = (inq: Inquiry) => {
    setOpenMenuId(null);
    setSelectedInquiry(inq);
    setCategory(inq.category);
    setTitle(inq.title);
    setContent(inq.content);
    setExistingImageUrls(inq.image_urls ?? []);
    setImageFiles([]);
    setImagePreviews([]);
    setViewMode('edit');
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTargetId || deleteSubmitting) return;
    setDeleteSubmitting(true);
    try {
      await supabase.from('inquiries').update({ is_deleted: true }).eq('id', deleteTargetId);
      setInquiries((prev) => prev.filter((i) => i.id !== deleteTargetId));
      setDeleteTargetId(null);
    } finally {
      setDeleteSubmitting(false);
    }
  };

  const isWriteMode = viewMode === 'write' || viewMode === 'edit';
  const isEditMode = viewMode === 'edit';
  const totalImages = existingImageUrls.length + imageFiles.length;

  if (viewMode === 'detail' && selectedInquiry) {
    const cfg = STATUS_CONFIG[selectedInquiry.status];
    const StatusIcon = cfg.icon;
    const catColor = CATEGORY_COLORS[selectedInquiry.category];
    const canEdit = selectedInquiry.status !== 'answered';

    return (
      <div className="min-h-screen flex flex-col" style={{ background: '#F9FAFB', maxWidth: 480, margin: '0 auto' }}>
        <div
          className="flex items-center justify-between px-4 pt-12 pb-4 sticky top-0 z-10"
          style={{ background: '#F9FAFB', borderBottom: '1px solid rgba(0,0,0,0.06)' }}
        >
          <div className="flex items-center gap-3">
            <button
              onClick={() => { setSelectedInquiry(null); setViewMode('list'); }}
              className="w-9 h-9 rounded-full flex items-center justify-center transition active:scale-95"
              style={{ background: 'rgba(0,0,0,0.06)' }}
            >
              <ChevronLeft className="w-5 h-5 text-gray-600" />
            </button>
            <h1 className="text-base font-bold text-gray-900">문의 상세</h1>
          </div>
          <div className="relative" ref={openMenuId === selectedInquiry.id ? menuRef : undefined}>
            <button
              onClick={() => setOpenMenuId(openMenuId === selectedInquiry.id ? null : selectedInquiry.id)}
              className="w-9 h-9 rounded-full flex items-center justify-center transition active:scale-95"
              style={{ background: 'rgba(0,0,0,0.06)' }}
            >
              <MoreVertical className="w-4 h-4 text-gray-600" />
            </button>
            {openMenuId === selectedInquiry.id && (
              <div
                className="absolute right-0 top-10 rounded-xl overflow-hidden z-50"
                style={{ boxShadow: '0 8px 24px rgba(0,0,0,0.14)', background: '#fff', minWidth: 128 }}
              >
                {canEdit && (
                  <button
                    onClick={() => handleEditOpen(selectedInquiry)}
                    className="flex items-center gap-2.5 w-full px-4 py-3 text-sm font-medium text-gray-700 transition"
                    style={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(0,0,0,0.04)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <Pencil className="w-4 h-4 text-gray-500" />
                    수정하기
                  </button>
                )}
                <button
                  onClick={() => { setOpenMenuId(null); setDeleteTargetId(selectedInquiry.id); }}
                  className="flex items-center gap-2.5 w-full px-4 py-3 text-sm font-medium transition"
                  style={{ color: '#DC2626' }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(220,38,38,0.06)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <Trash2 className="w-4 h-4" />
                  삭제하기
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-4">
          <div className="bg-white rounded-2xl p-5" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
            <div className="flex items-center gap-2 mb-3">
              <span
                className="text-xs font-semibold px-2.5 py-1 rounded-full"
                style={{ background: catColor.bg, color: catColor.text }}
              >
                {CATEGORY_LABELS[selectedInquiry.category]}
              </span>
              <span
                className="text-xs font-semibold px-2.5 py-1 rounded-full flex items-center gap-1"
                style={{ background: cfg.bg, color: cfg.color }}
              >
                <StatusIcon className="w-3 h-3" />
                {cfg.label}
              </span>
              <span className="text-xs text-gray-400 ml-auto">{formatDate(selectedInquiry.created_at)}</span>
            </div>
            <h2 className="text-base font-bold text-gray-900 mb-2">{selectedInquiry.title}</h2>
            <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">{selectedInquiry.content}</p>
            {selectedInquiry.image_urls?.length > 0 && (
              <div className="flex gap-2 mt-3 flex-wrap">
                {selectedInquiry.image_urls.map((url, i) => (
                  <img
                    key={i}
                    src={url}
                    alt=""
                    className="w-20 h-20 rounded-xl object-cover"
                    style={{ border: '1px solid rgba(0,0,0,0.08)' }}
                  />
                ))}
              </div>
            )}
          </div>

          {selectedInquiry.admin_reply && (
            <div
              className="rounded-2xl p-5"
              style={{
                background: 'linear-gradient(135deg, #F0FDF4 0%, #ECFDF5 100%)',
                border: '1.5px solid rgba(5,150,105,0.2)',
              }}
            >
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="w-4 h-4" style={{ color: '#059669' }} />
                <span className="text-sm font-bold" style={{ color: '#065F46' }}>운영팀 답변</span>
                {selectedInquiry.answered_at && (
                  <span className="text-xs text-gray-400 ml-auto">{formatDate(selectedInquiry.answered_at)}</span>
                )}
              </div>
              <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: '#065F46' }}>
                {selectedInquiry.admin_reply}
              </p>
            </div>
          )}

          {selectedInquiry.status !== 'answered' && (
            <div
              className="rounded-2xl p-4 flex items-center gap-3"
              style={{ background: 'rgba(107,114,128,0.06)', border: '1px solid rgba(107,114,128,0.12)' }}
            >
              <Clock className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <p className="text-xs text-gray-500">문의가 접수됐습니다. 영업일 기준 1-3일 내로 답변드려요.</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (isWriteMode) {
    return (
      <div className="min-h-screen flex flex-col" style={{ background: '#F9FAFB', maxWidth: 480, margin: '0 auto' }}>
        <div
          className="flex items-center gap-3 px-4 pt-12 pb-4 sticky top-0 z-10"
          style={{ background: '#F9FAFB', borderBottom: '1px solid rgba(0,0,0,0.06)' }}
        >
          <button
            onClick={() => {
              resetForm();
              setSelectedInquiry(null);
              setViewMode('list');
            }}
            className="w-9 h-9 rounded-full flex items-center justify-center transition active:scale-95"
            style={{ background: 'rgba(0,0,0,0.06)' }}
          >
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          </button>
          <h1 className="text-base font-bold text-gray-900">{isEditMode ? '문의 수정' : '문의 작성'}</h1>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-4">
          <CategorySelector value={category} onChange={setCategory} />

          <div className="bg-white rounded-2xl p-5" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
            <p className="text-xs font-semibold text-gray-500 mb-2">제목</p>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="문의 제목을 입력해주세요"
              maxLength={100}
              className="w-full text-sm text-gray-900 outline-none placeholder-gray-400"
              style={{ background: 'transparent' }}
            />
          </div>

          <div className="bg-white rounded-2xl p-5" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
            <p className="text-xs font-semibold text-gray-500 mb-2">내용</p>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="문의 내용을 자세히 작성해주세요"
              rows={6}
              maxLength={2000}
              className="w-full text-sm text-gray-900 outline-none placeholder-gray-400 resize-none"
              style={{ background: 'transparent' }}
            />
            <p className="text-right text-xs text-gray-400 mt-1">{content.length} / 2000</p>
          </div>

          <div className="bg-white rounded-2xl p-5" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
            <p className="text-xs font-semibold text-gray-500 mb-3">사진 첨부 (선택, 최대 3장)</p>
            <div className="flex gap-2 flex-wrap">
              {existingImageUrls.map((url, i) => (
                <div key={`existing-${i}`} className="relative w-20 h-20">
                  <img
                    src={url}
                    alt=""
                    className="w-20 h-20 rounded-xl object-cover"
                    style={{ border: '1px solid rgba(0,0,0,0.08)' }}
                  />
                  <button
                    onClick={() => removeExistingImage(i)}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center"
                    style={{ background: '#374151' }}
                  >
                    <X className="w-3 h-3 text-white" />
                  </button>
                </div>
              ))}
              {imagePreviews.map((src, i) => (
                <div key={`new-${i}`} className="relative w-20 h-20">
                  <img
                    src={src}
                    alt=""
                    className="w-20 h-20 rounded-xl object-cover"
                    style={{ border: '1px solid rgba(0,0,0,0.08)' }}
                  />
                  <button
                    onClick={() => removeNewImage(i)}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center"
                    style={{ background: '#374151' }}
                  >
                    <X className="w-3 h-3 text-white" />
                  </button>
                </div>
              ))}
              {totalImages < 3 && (
                <label
                  className="w-20 h-20 rounded-xl flex flex-col items-center justify-center cursor-pointer transition active:scale-95"
                  style={{ background: 'rgba(0,0,0,0.04)', border: '1.5px dashed rgba(0,0,0,0.15)' }}
                >
                  <Upload className="w-5 h-5 text-gray-400 mb-1" />
                  <span className="text-xs text-gray-400">추가</span>
                  <input type="file" accept="image/*" multiple className="hidden" onChange={handleImageChange} />
                </label>
              )}
            </div>
          </div>
        </div>

        <div className="px-4 pb-8 pt-2">
          <button
            onClick={handleSubmit}
            disabled={!title.trim() || !content.trim() || submitting}
            className="w-full py-4 rounded-2xl text-sm font-bold text-white transition active:scale-95 disabled:opacity-50"
            style={{
              background: 'linear-gradient(135deg, #1B4332 0%, #2D6A4F 100%)',
              boxShadow: '0 4px 16px rgba(27,67,50,0.25)',
            }}
          >
            {submitting ? (isEditMode ? '수정 중...' : '등록 중...') : isEditMode ? '수정 완료' : '문의 등록하기'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: '#F9FAFB', maxWidth: 480, margin: '0 auto' }}
      onClick={() => setOpenMenuId(null)}
    >
      <div
        className="flex items-center justify-between px-4 pt-12 pb-4 sticky top-0 z-10"
        style={{ background: '#F9FAFB', borderBottom: '1px solid rgba(0,0,0,0.06)' }}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="w-9 h-9 rounded-full flex items-center justify-center transition active:scale-95"
            style={{ background: 'rgba(0,0,0,0.06)' }}
          >
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          </button>
          <h1 className="text-base font-bold text-gray-900">1:1 문의</h1>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); setViewMode('write'); }}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold text-white transition active:scale-95"
          style={{ background: 'linear-gradient(135deg, #1B4332 0%, #2D6A4F 100%)' }}
        >
          <Plus className="w-4 h-4" />
          문의하기
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-6 h-6 rounded-full border-2 border-gray-300 border-t-gray-600 animate-spin" />
          </div>
        ) : inquiries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
              style={{ background: 'rgba(27,67,50,0.08)' }}
            >
              <MessageSquare className="w-7 h-7" style={{ color: '#2D6A4F' }} />
            </div>
            <p className="text-sm font-semibold text-gray-500 mb-1">아직 문의 내역이 없어요</p>
            <p className="text-xs text-gray-400">불편한 점이나 의견을 자유롭게 보내주세요</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {inquiries.map((inq) => {
              const cfg = STATUS_CONFIG[inq.status];
              const StatusIcon = cfg.icon;
              const catColor = CATEGORY_COLORS[inq.category];
              const canEdit = inq.status !== 'answered';
              const isMenuOpen = openMenuId === inq.id;

              return (
                <div
                  key={inq.id}
                  className="bg-white rounded-2xl overflow-visible relative"
                  style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}
                >
                  <button
                    onClick={() => { setSelectedInquiry(inq); setViewMode('detail'); }}
                    className="w-full p-4 text-left transition active:scale-[0.98] rounded-2xl"
                  >
                    <div className="flex items-center gap-2 mb-2 pr-8">
                      <span
                        className="text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0"
                        style={{ background: catColor.bg, color: catColor.text }}
                      >
                        {CATEGORY_LABELS[inq.category]}
                      </span>
                      <span
                        className="text-xs font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 flex-shrink-0"
                        style={{ background: cfg.bg, color: cfg.color }}
                      >
                        <StatusIcon className="w-3 h-3" />
                        {cfg.label}
                      </span>
                      <span className="text-xs text-gray-400 ml-auto">{formatDate(inq.created_at)}</span>
                    </div>
                    <p className="text-sm font-semibold text-gray-900 mb-1 truncate pr-2">{inq.title}</p>
                    <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed pr-2">{inq.content}</p>
                    {inq.status === 'answered' && inq.admin_reply && (
                      <div
                        className="mt-2 pt-2 flex items-center gap-1.5"
                        style={{ borderTop: '1px solid rgba(5,150,105,0.15)' }}
                      >
                        <CheckCircle className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#059669' }} />
                        <p className="text-xs font-medium truncate" style={{ color: '#065F46' }}>
                          {inq.admin_reply}
                        </p>
                      </div>
                    )}
                  </button>

                  <div
                    className="absolute top-3.5 right-3.5"
                    ref={isMenuOpen ? menuRef : undefined}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      onClick={() => setOpenMenuId(isMenuOpen ? null : inq.id)}
                      className="w-7 h-7 rounded-full flex items-center justify-center transition active:scale-95"
                      style={{ background: isMenuOpen ? 'rgba(0,0,0,0.08)' : 'transparent' }}
                    >
                      <MoreVertical className="w-4 h-4 text-gray-400" />
                    </button>

                    {isMenuOpen && (
                      <div
                        className="absolute right-0 top-8 rounded-xl overflow-hidden z-50"
                        style={{ boxShadow: '0 8px 24px rgba(0,0,0,0.14)', background: '#fff', minWidth: 128 }}
                      >
                        {canEdit && (
                          <button
                            onClick={() => handleEditOpen(inq)}
                            className="flex items-center gap-2.5 w-full px-4 py-3 text-sm font-medium text-gray-700 transition"
                            style={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}
                            onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(0,0,0,0.04)')}
                            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                          >
                            <Pencil className="w-4 h-4 text-gray-500" />
                            수정하기
                          </button>
                        )}
                        <button
                          onClick={() => { setOpenMenuId(null); setDeleteTargetId(inq.id); }}
                          className="flex items-center gap-2.5 w-full px-4 py-3 text-sm font-medium transition"
                          style={{ color: '#DC2626' }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(220,38,38,0.06)')}
                          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                        >
                          <Trash2 className="w-4 h-4" />
                          삭제하기
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {deleteTargetId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-6"
          style={{ background: 'rgba(0,0,0,0.5)' }}
          onClick={() => setDeleteTargetId(null)}
        >
          <div
            className="bg-white rounded-2xl p-6 w-full max-w-sm"
            style={{ boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-base font-bold text-gray-900 mb-2 text-center">문의를 삭제할까요?</h2>
            <p className="text-sm text-gray-500 text-center mb-6">삭제하면 복구할 수 없습니다.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteTargetId(null)}
                className="flex-1 py-3 rounded-xl text-sm font-semibold text-gray-600 transition"
                style={{ background: '#F3F4F6' }}
              >
                취소
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={deleteSubmitting}
                className="flex-1 py-3 rounded-xl text-sm font-semibold text-white transition disabled:opacity-50"
                style={{ background: '#DC2626' }}
              >
                {deleteSubmitting ? '삭제 중...' : '삭제'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
