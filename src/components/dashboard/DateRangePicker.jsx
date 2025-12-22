import { useState, useRef, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import "./DateRangePicker.css";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const DAYS = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];

export const DateRangePicker = ({ dateFrom, dateTo, onDateChange, onCancel, onApply, autoApply = false }) => {
  const [startDate, setStartDate] = useState(dateFrom ? new Date(dateFrom) : null);
  const [endDate, setEndDate] = useState(dateTo ? new Date(dateTo) : null);
  const [leftMonth, setLeftMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [rightMonth, setRightMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth() + 1, 1);
  });

  // Update internal state when props change
  useEffect(() => {
    if (dateFrom) {
      const parsed = new Date(dateFrom + 'T00:00:00');
      if (!isNaN(parsed.getTime())) setStartDate(parsed);
    } else {
      setStartDate(null);
    }
    if (dateTo) {
      const parsed = new Date(dateTo + 'T00:00:00');
      if (!isNaN(parsed.getTime())) setEndDate(parsed);
    } else {
      setEndDate(null);
    }
  }, [dateFrom, dateTo]);

  const formatDateRange = () => {
    if (!startDate || !endDate) return "";
    const formatDate = (date) => {
      const month = MONTHS[date.getMonth()].substring(0, 3);
      const day = date.getDate();
      const year = date.getFullYear();
      return `${month} ${day}, ${year}`;
    };
    return `Range: ${formatDate(startDate)} - ${formatDate(endDate)}`;
  };

  const getDaysInMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const isDateInRange = (day, monthDate) => {
    if (!startDate || !endDate) return false;
    const checkDate = new Date(monthDate.getFullYear(), monthDate.getMonth(), day);
    checkDate.setHours(0, 0, 0, 0);
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(0, 0, 0, 0);
    return checkDate > start && checkDate < end;
  };

  const isStartDate = (day, monthDate) => {
    if (!startDate) return false;
    const checkDate = new Date(monthDate.getFullYear(), monthDate.getMonth(), day);
    checkDate.setHours(0, 0, 0, 0);
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    return checkDate.getTime() === start.getTime();
  };

  const isEndDate = (day, monthDate) => {
    if (!endDate) return false;
    const checkDate = new Date(monthDate.getFullYear(), monthDate.getMonth(), day);
    checkDate.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(0, 0, 0, 0);
    return checkDate.getTime() === end.getTime();
  };

  const isCurrentDate = (date, monthDate) => {
    const today = new Date();
    const checkDate = new Date(monthDate.getFullYear(), monthDate.getMonth(), date);
    return checkDate.toDateString() === today.toDateString();
  };

  const formatForInput = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const handleDateClick = (day, monthDate) => {
    const clickedDate = new Date(monthDate.getFullYear(), monthDate.getMonth(), day);
    
    if (!startDate || (startDate && endDate)) {
      // Start new selection
      setStartDate(clickedDate);
      setEndDate(null);
    } else if (startDate && !endDate) {
      // Complete selection
      let finalStartDate = startDate;
      let finalEndDate = clickedDate;
      if (clickedDate < startDate) {
        finalEndDate = startDate;
        finalStartDate = clickedDate;
      }
      setEndDate(finalEndDate);
      
      const formattedFrom = formatForInput(finalStartDate);
      const formattedTo = formatForInput(finalEndDate);
      
      // Always call onDateChange to update parent state
      onDateChange(formattedFrom, formattedTo);
      
      // Only call onApply if it's provided (old behavior with Apply button)
      // If onApply is null, the parent will handle auto-closing via useEffect
      if (onApply) {
        onApply(formattedFrom, formattedTo);
      }
    }
  };

  const navigateMonth = (direction, side) => {
    if (side === 'left') {
      const newMonth = new Date(leftMonth);
      newMonth.setMonth(newMonth.getMonth() + direction);
      setLeftMonth(newMonth);
      // Keep right month one month ahead
      const newRightMonth = new Date(newMonth);
      newRightMonth.setMonth(newRightMonth.getMonth() + 1);
      setRightMonth(newRightMonth);
    } else {
      const newMonth = new Date(rightMonth);
      newMonth.setMonth(newMonth.getMonth() + direction);
      setRightMonth(newMonth);
      // Keep left month one month behind
      const newLeftMonth = new Date(newMonth);
      newLeftMonth.setMonth(newLeftMonth.getMonth() - 1);
      setLeftMonth(newLeftMonth);
    }
  };

  const renderCalendar = (monthDate) => {
    const daysInMonth = getDaysInMonth(monthDate);
    const firstDay = getFirstDayOfMonth(monthDate);
    const days = [];
    
    // Previous month's trailing days
    const prevMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() - 1, 0);
    const prevMonthDays = prevMonth.getDate();
    for (let i = firstDay - 1; i >= 0; i--) {
      days.push({ day: prevMonthDays - i, isCurrentMonth: false, date: new Date(prevMonth.getFullYear(), prevMonth.getMonth(), prevMonthDays - i) });
    }
    
    // Current month's days
    for (let day = 1; day <= daysInMonth; day++) {
      days.push({ day, isCurrentMonth: true, date: new Date(monthDate.getFullYear(), monthDate.getMonth(), day) });
    }
    
    // Next month's leading days
    const totalCells = 42; // 6 weeks * 7 days
    const remainingDays = totalCells - days.length;
    for (let day = 1; day <= remainingDays; day++) {
      days.push({ day, isCurrentMonth: false, date: new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, day) });
    }

    return days;
  };

  const handleApply = () => {
    if (startDate && endDate && onApply) {
      const formattedFrom = formatForInput(startDate);
      const formattedTo = formatForInput(endDate);
      onDateChange(formattedFrom, formattedTo);
      onApply(formattedFrom, formattedTo);
    }
  };

  const handleCancel = () => {
    if (dateFrom) {
      const parsed = new Date(dateFrom + 'T00:00:00');
      if (!isNaN(parsed.getTime())) setStartDate(parsed);
      else setStartDate(null);
    } else {
      setStartDate(null);
    }
    if (dateTo) {
      const parsed = new Date(dateTo + 'T00:00:00');
      if (!isNaN(parsed.getTime())) setEndDate(parsed);
      else setEndDate(null);
    } else {
      setEndDate(null);
    }
    onCancel();
  };

  const leftDays = renderCalendar(leftMonth);
  const rightDays = renderCalendar(rightMonth);

  return (
    <div className="date-range-picker-container">
      {/* Calendar Panels */}
      <div className="date-range-calendars">
        {/* Left Calendar */}
        <div className="date-range-calendar-panel">
          <div className="date-range-calendar-header">
            <button
              onClick={() => navigateMonth(-1, 'left')}
              className="date-range-nav-button"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="date-range-month-year">
              {MONTHS[leftMonth.getMonth()]} {leftMonth.getFullYear()}
            </span>
            <button
              onClick={() => navigateMonth(1, 'left')}
              className="date-range-nav-button"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          
          <div className="date-range-day-headers">
            {DAYS.map(day => (
              <div key={day} className="date-range-day-header">{day}</div>
            ))}
          </div>
          
          <div className="date-range-days-grid">
            {leftDays.map(({ day, isCurrentMonth, date }, idx) => {
              const inRange = isDateInRange(day, leftMonth);
              const isStart = isStartDate(day, leftMonth);
              const isEnd = isEndDate(day, leftMonth);
              const isCurrent = isCurrentDate(day, leftMonth);
              
              return (
                <button
                  key={`left-${idx}`}
                  onClick={() => isCurrentMonth && handleDateClick(day, leftMonth)}
                  className={`date-range-day-cell ${
                    !isCurrentMonth ? 'date-range-day-other-month' : ''
                  } ${inRange ? 'date-range-day-in-range' : ''} ${
                    isStart ? 'date-range-day-start' : ''
                  } ${isEnd ? 'date-range-day-end' : ''} ${
                    isCurrent ? 'date-range-day-current' : ''
                  }`}
                  disabled={!isCurrentMonth}
                >
                  {day}
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Calendar */}
        <div className="date-range-calendar-panel">
          <div className="date-range-calendar-header">
            <button
              onClick={() => navigateMonth(-1, 'right')}
              className="date-range-nav-button"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="date-range-month-year">
              {MONTHS[rightMonth.getMonth()]} {rightMonth.getFullYear()}
            </span>
            <button
              onClick={() => navigateMonth(1, 'right')}
              className="date-range-nav-button"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          
          <div className="date-range-day-headers">
            {DAYS.map(day => (
              <div key={day} className="date-range-day-header">{day}</div>
            ))}
          </div>
          
          <div className="date-range-days-grid">
            {rightDays.map(({ day, isCurrentMonth, date }, idx) => {
              const inRange = isDateInRange(day, rightMonth);
              const isStart = isStartDate(day, rightMonth);
              const isEnd = isEndDate(day, rightMonth);
              const isCurrent = isCurrentDate(day, rightMonth);
              
              return (
                <button
                  key={`right-${idx}`}
                  onClick={() => isCurrentMonth && handleDateClick(day, rightMonth)}
                  className={`date-range-day-cell ${
                    !isCurrentMonth ? 'date-range-day-other-month' : ''
                  } ${inRange ? 'date-range-day-in-range' : ''} ${
                    isStart ? 'date-range-day-start' : ''
                  } ${isEnd ? 'date-range-day-end' : ''} ${
                    isCurrent ? 'date-range-day-current' : ''
                  }`}
                  disabled={!isCurrentMonth}
                >
                  {day}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bottom Action Bar - Only show if onApply is provided (old behavior) */}
      {onApply && (
        <div className="date-range-action-bar">
          <div className="date-range-display">
            {startDate && endDate ? formatDateRange() : "Select date range"}
          </div>
          <div className="date-range-actions">
            <button
              onClick={handleCancel}
              className="date-range-cancel-button"
            >
              Cancel
            </button>
            <button
              onClick={handleApply}
              className="date-range-apply-button"
              disabled={!startDate || !endDate}
            >
              Apply
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
