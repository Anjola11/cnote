import { useState, useEffect, useMemo } from 'react';
import './DatePicker.css';

interface DatePickerProps {
  includeYear: boolean;
  minDate?: string; // "YYYY-MM-DD" or "--MM-DD"
  maxDate?: string; // "YYYY-MM-DD" or "--MM-DD"
  value?: string;    // "YYYY-MM-DD" or "--MM-DD"
  onChange: (value: string) => void;
  error?: boolean;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function DatePicker({
  includeYear,
  minDate,
  maxDate,
  value,
  onChange,
  error
}: DatePickerProps) {
  // Parse initial values
  const { initialYear, initialMonth, initialDay } = useMemo(() => {
    if (!value) return { initialYear: '', initialMonth: '', initialDay: '' };
    if (value.startsWith('--')) {
      const parts = value.split('-');
      return {
        initialYear: '',
        initialMonth: parts[2] || '',
        initialDay: parts[3] || ''
      };
    } else {
      const parts = value.split('-');
      return {
        initialYear: parts[0] || '',
        initialMonth: parts[1] || '',
        initialDay: parts[2] || ''
      };
    }
  }, [value]);

  const [selectedYear, setSelectedYear] = useState(initialYear);
  const [selectedMonth, setSelectedMonth] = useState(initialMonth);
  const [selectedDay, setSelectedDay] = useState(initialDay);

  // Keep state synced with prop changes (e.g. form resets)
  useEffect(() => {
    setSelectedYear(initialYear);
    setSelectedMonth(initialMonth);
    setSelectedDay(initialDay);
  }, [initialYear, initialMonth, initialDay]);

  // Compute today's values
  const today = useMemo(() => {
    const d = new Date();
    return {
      year: d.getFullYear(),
      month: d.getMonth() + 1, // 1-indexed
      day: d.getDate()
    };
  }, []);

  // Compute limits
  const limits = useMemo(() => {
    let minY: number | null = null;
    let minM: number | null = null;
    let minD: number | null = null;

    let maxY: number | null = null;
    let maxM: number | null = null;
    let maxD: number | null = null;

    if (includeYear) {
      // Parse minDate
      if (minDate && !minDate.startsWith('--')) {
        const parts = minDate.split('-').map(Number);
        if (parts.length === 3) {
          minY = parts[0];
          minM = parts[1];
          minD = parts[2];
        }
      }
      // Parse maxDate
      if (maxDate && !maxDate.startsWith('--')) {
        const parts = maxDate.split('-').map(Number);
        if (parts.length === 3) {
          maxY = parts[0];
          maxM = parts[1];
          maxD = parts[2];
        }
      } else {
        // Default max is today
        maxY = today.year;
        maxM = today.month;
        maxD = today.day;
      }
    } else {
      // No-year limits
      if (minDate && minDate.startsWith('--')) {
        const parts = minDate.split('-');
        minM = Number(parts[2]);
        minD = Number(parts[3]);
      }
      if (maxDate && maxDate.startsWith('--')) {
        const parts = maxDate.split('-');
        maxM = Number(parts[2]);
        maxD = Number(parts[3]);
      }
    }

    return { minY, minM, minD, maxY, maxM, maxD };
  }, [includeYear, minDate, maxDate, today]);

  // Generate years list
  const years = useMemo(() => {
    if (!includeYear) return [];
    const currentYear = today.year;
    const startYear = limits.minY || 1900;
    const endYear = limits.maxY || currentYear + 10;
    const list = [];
    for (let y = endYear; y >= startYear; y--) {
      list.push(y);
    }
    return list;
  }, [includeYear, limits.minY, limits.maxY, today.year]);

  // Generate months list
  const months = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => i + 1);
  }, []);

  // Determine number of days in selected month/year
  const daysInMonth = useMemo(() => {
    const m = parseInt(selectedMonth, 10);
    if (isNaN(m)) return 31;

    if (m === 2) {
      if (includeYear && selectedYear) {
        const y = parseInt(selectedYear, 10);
        const isLeap = y % 4 === 0 && (y % 100 !== 0 || y % 400 === 0);
        return isLeap ? 29 : 28;
      }
      // Without year or before year is selected, allow 29 to support leap birthdays
      return 29;
    }

    if ([4, 6, 9, 11].includes(m)) return 30;
    return 31;
  }, [includeYear, selectedMonth, selectedYear]);

  // Generate days list
  const days = useMemo(() => {
    return Array.from({ length: daysInMonth }, (_, i) => i + 1);
  }, [daysInMonth]);

  // Fire onChange once selections are complete
  const handleSelection = (y: string, m: string, d: string) => {
    if (includeYear) {
      if (y && m && d) {
        onChange(`${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`);
      } else {
        onChange('');
      }
    } else {
      if (m && d) {
        onChange(`--${m.padStart(2, '0')}-${d.padStart(2, '0')}`);
      } else {
        onChange('');
      }
    }
  };

  // Clamp day if it exceeds the new month's days limit
  const updateMonth = (m: string) => {
    setSelectedMonth(m);
    let d = selectedDay;
    const maxDays = m ? ([4, 6, 9, 11].includes(Number(m)) ? 30 : Number(m) === 2 ? (selectedYear && (Number(selectedYear) % 4 === 0) ? 29 : 28) : 31) : 31;
    if (d && Number(d) > maxDays) {
      d = String(maxDays);
      setSelectedDay(d);
    }
    handleSelection(selectedYear, m, d);
  };

  const updateYear = (y: string) => {
    setSelectedYear(y);
    let d = selectedDay;
    if (selectedMonth === '02' || selectedMonth === '2') {
      const isLeap = y ? (Number(y) % 4 === 0 && (Number(y) % 100 !== 0 || Number(y) % 400 === 0)) : true;
      const maxDays = isLeap ? 29 : 28;
      if (d && Number(d) > maxDays) {
        d = String(maxDays);
        setSelectedDay(d);
      }
    }
    handleSelection(y, selectedMonth, d);
  };

  const updateDay = (d: string) => {
    setSelectedDay(d);
    handleSelection(selectedYear, selectedMonth, d);
  };

  // Helper validation checkers for rendering disabled options
  const isYearDisabled = (y: number) => {
    if (limits.minY && y < limits.minY) return true;
    if (limits.maxY && y > limits.maxY) return true;
    return false;
  };

  const isMonthDisabled = (m: number) => {
    if (includeYear && selectedYear) {
      const y = parseInt(selectedYear, 10);
      if (limits.minY && y === limits.minY && limits.minM && m < limits.minM) return true;
      if (limits.maxY && y === limits.maxY && limits.maxM && m > limits.maxM) return true;
    } else if (!includeYear) {
      if (limits.minM && m < limits.minM) return true;
      if (limits.maxM && m > limits.maxM) return true;
    }
    return false;
  };

  const isDayDisabled = (d: number) => {
    if (includeYear && selectedYear && selectedMonth) {
      const y = parseInt(selectedYear, 10);
      const m = parseInt(selectedMonth, 10);
      if (limits.minY && y === limits.minY && limits.minM && m === limits.minM && limits.minD && d < limits.minD) return true;
      if (limits.maxY && y === limits.maxY && limits.maxM && m === limits.maxM && limits.maxD && d > limits.maxD) return true;
    } else if (!includeYear && selectedMonth) {
      const m = parseInt(selectedMonth, 10);
      if (limits.minM && m === limits.minM && limits.minD && d < limits.minD) return true;
      if (limits.maxM && m === limits.maxM && limits.maxD && d > limits.maxD) return true;
    }
    return false;
  };

  return (
    <div className={`date-picker-row ${error ? 'date-picker-row--error' : ''}`}>
      {/* Month dropdown */}
      <div className="date-picker-col">
        <select
          className="date-picker-select"
          value={selectedMonth}
          onChange={(e) => updateMonth(e.target.value)}
        >
          <option value="">Month</option>
          {months.map((m) => (
            <option key={m} value={String(m)} disabled={isMonthDisabled(m)}>
              {MONTH_NAMES[m - 1]}
            </option>
          ))}
        </select>
      </div>

      {/* Day dropdown */}
      <div className="date-picker-col">
        <select
          className="date-picker-select"
          value={selectedDay}
          onChange={(e) => updateDay(e.target.value)}
        >
          <option value="">Day</option>
          {days.map((d) => (
            <option key={d} value={String(d)} disabled={isDayDisabled(d)}>
              {d}
            </option>
          ))}
        </select>
      </div>

      {/* Year dropdown */}
      {includeYear && (
        <div className="date-picker-col">
          <select
            className="date-picker-select"
            value={selectedYear}
            onChange={(e) => updateYear(e.target.value)}
          >
            <option value="">Year</option>
            {years.map((y) => (
              <option key={y} value={String(y)} disabled={isYearDisabled(y)}>
                {y}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}
