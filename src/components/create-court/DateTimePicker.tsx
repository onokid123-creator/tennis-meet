import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface DateTimePickerProps {
  title: string;
  accentColor: string;
  selectedDate: string;
  selectedTime: string;
  selectedEndTime?: string;
  showEndTime?: boolean;
  onDateChange: (date: string) => void;
  onTimeChange: (time: string) => void;
  onEndTimeChange?: (time: string) => void;
}

const ALL_TIMES = [
  '06:00', '07:00', '08:00', '09:00', '10:00', '11:00',
  '12:00', '13:00', '14:00', '15:00', '16:00', '17:00',
  '18:00', '19:00', '20:00', '21:00', '22:00',
];

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];
const MONTHS = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'];
const DATING_ACCENT = '#C9A84C';

function TimeColumn({
  label,
  times,
  selected,
  onSelect,
  disabled,
  accentColor,
}: {
  label: string;
  times: string[];
  selected: string;
  onSelect: (t: string) => void;
  disabled?: boolean;
  accentColor: string;
}) {
  const amTimes = times.filter(t => parseInt(t) < 12);
  const pmTimes = times.filter(t => parseInt(t) >= 12);

  const selectedHour = selected ? parseInt(selected) : -1;
  const defaultPanel: 'am' | 'pm' = selectedHour >= 12 ? 'pm' : selectedHour >= 0 ? (selectedHour < 12 ? 'am' : 'pm') : 'am';
  const [panel, setPanel] = useState<'am' | 'pm'>(defaultPanel);

  const visibleTimes = panel === 'am' ? amTimes : pmTimes;

  return (
    <div className={`flex-1 flex flex-col gap-1.5 ${disabled ? 'opacity-40 pointer-events-none' : ''}`}>
      <p className="text-xs font-semibold text-gray-500 text-center">{label}</p>
      <div className="flex gap-1 mb-1">
        <button
          type="button"
          onClick={() => setPanel('am')}
          className="flex-1 py-1 rounded-lg text-xs font-semibold transition border"
          style={panel === 'am' ? { backgroundColor: accentColor, borderColor: accentColor, color: '#fff' } : { borderColor: '#E5E7EB', color: '#6B7280', backgroundColor: '#F9FAFB' }}
        >
          오전
        </button>
        <button
          type="button"
          onClick={() => setPanel('pm')}
          className="flex-1 py-1 rounded-lg text-xs font-semibold transition border"
          style={panel === 'pm' ? { backgroundColor: accentColor, borderColor: accentColor, color: '#fff' } : { borderColor: '#E5E7EB', color: '#6B7280', backgroundColor: '#F9FAFB' }}
        >
          오후
        </button>
      </div>
      <div className="flex flex-col gap-1">
        {visibleTimes.length === 0 ? (
          <p className="text-xs text-gray-300 text-center py-2">없음</p>
        ) : (
          visibleTimes.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => onSelect(t)}
              className="w-full py-2 rounded-xl text-xs font-medium transition border"
              style={
                selected === t
                  ? { backgroundColor: accentColor, borderColor: accentColor, color: '#fff' }
                  : { borderColor: '#F3F4F6', backgroundColor: '#F9FAFB', color: '#4B5563' }
              }
            >
              {t}
            </button>
          ))
        )}
      </div>
    </div>
  );
}

export default function DateTimePicker({
  title,
  accentColor,
  selectedDate,
  selectedTime,
  selectedEndTime,
  showEndTime = false,
  onDateChange,
  onTimeChange,
  onEndTimeChange,
}: DateTimePickerProps) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };

  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };

  const selectDate = (day: number) => {
    const d = new Date(viewYear, viewMonth, day);
    if (d < today) return;
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    onDateChange(`${yyyy}-${mm}-${dd}`);
  };

  const isSelected = (day: number) => {
    if (!selectedDate) return false;
    const mm = String(viewMonth + 1).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    return selectedDate === `${viewYear}-${mm}-${dd}`;
  };

  const isPast = (day: number) => new Date(viewYear, viewMonth, day) < today;

  const handleStartTime = (t: string) => {
    onTimeChange(t);
    if (onEndTimeChange) onEndTimeChange('');
  };

  const endTimes = selectedTime
    ? ALL_TIMES.filter(t => parseInt(t) > parseInt(selectedTime))
    : [];

  const tennisAccent = accentColor;
  const startAccent = showEndTime ? DATING_ACCENT : tennisAccent;

  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-xl font-bold text-gray-900">{title}</h2>

      {/* Compact Calendar */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-3">
        <div className="flex items-center justify-between mb-2">
          <button onClick={prevMonth} className="p-1 rounded-full hover:bg-gray-100 transition">
            <ChevronLeft className="w-4 h-4 text-gray-600" />
          </button>
          <span className="font-bold text-gray-900 text-sm">
            {viewYear}년 {MONTHS[viewMonth]}
          </span>
          <button onClick={nextMonth} className="p-1 rounded-full hover:bg-gray-100 transition">
            <ChevronRight className="w-4 h-4 text-gray-600" />
          </button>
        </div>

        <div className="grid grid-cols-7 mb-1">
          {WEEKDAYS.map((d, i) => (
            <div key={d} className={`text-center text-xs font-semibold py-0.5 ${i === 0 ? 'text-red-400' : i === 6 ? 'text-blue-400' : 'text-gray-400'}`}>
              {d}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-y-0.5">
          {Array.from({ length: firstDay }, (_, i) => <div key={`e-${i}`} />)}
          {Array.from({ length: daysInMonth }, (_, i) => {
            const day = i + 1;
            const sel = isSelected(day);
            const past = isPast(day);
            const isToday = new Date(viewYear, viewMonth, day).toDateString() === today.toDateString();
            return (
              <button
                key={day}
                type="button"
                disabled={past}
                onClick={() => selectDate(day)}
                className={`mx-auto w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium transition ${
                  sel
                    ? 'text-white font-bold'
                    : past
                    ? 'text-gray-300 cursor-not-allowed'
                    : isToday
                    ? 'text-gray-900 border border-gray-200'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
                style={sel ? { backgroundColor: accentColor } : undefined}
              >
                {day}
              </button>
            );
          })}
        </div>
      </div>

      {/* Time Selection - standard (tennis) */}
      {!showEndTime && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-3">
          <TimeColumn
            label="시간 선택"
            times={ALL_TIMES}
            selected={selectedTime}
            onSelect={onTimeChange}
            accentColor={tennisAccent}
          />
        </div>
      )}

      {/* Time Selection - side by side (dating) */}
      {showEndTime && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-3">
          <div className="flex gap-3">
            <TimeColumn
              label="시작 시간"
              times={ALL_TIMES}
              selected={selectedTime}
              onSelect={handleStartTime}
              accentColor={startAccent}
            />
            <div className="w-px bg-gray-100 self-stretch" />
            <TimeColumn
              label="종료 시간"
              times={endTimes}
              selected={selectedEndTime ?? ''}
              onSelect={(t) => onEndTimeChange?.(t)}
              disabled={!selectedTime}
              accentColor={DATING_ACCENT}
            />
          </div>
        </div>
      )}
    </div>
  );
}
