"use client";

import React, { useState, useEffect } from 'react';
import { Habit } from '../types';
import { calculateCompletionStatus } from '../utils/habits';

interface DatePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDateSelect: (date: Date) => void;
  initialDate: Date;
  habits?: Habit[];
  highlightedDates?: Set<string>;
}

export const DatePickerModal: React.FC<DatePickerModalProps> = ({
  isOpen,
  onClose,
  onDateSelect,
  initialDate,
  habits,
  highlightedDates,
}) => {
  const [displayDate, setDisplayDate] = useState(initialDate);

  useEffect(() => {
    if (isOpen) {
      setDisplayDate(initialDate);
    }
  }, [isOpen, initialDate]);

  if (!isOpen) return null;

  const changeMonth = (amount: number) => {
    setDisplayDate(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(newDate.getMonth() + amount);
      return newDate;
    });
  };

  const generateCalendar = () => {
    const year = displayDate.getFullYear();
    const month = displayDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const calendarDays = [];
    for (let i = 0; i < firstDay; i++) {
      calendarDays.push(<div key={`empty-${i}`} className="w-10 h-10"></div>);
    }
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const dateStr = date.toLocaleDateString('sv-SE');
      const isSelected = initialDate.toLocaleDateString('sv-SE') === dateStr;
      const completionStatus = habits ? calculateCompletionStatus(date, habits) : 'none';
      const hasRecord = highlightedDates?.has(dateStr);

      calendarDays.push(
        <div
          key={day}
          className="w-10 h-10 flex items-center justify-center text-sm cursor-pointer hover:bg-indigo-100 relative"
          onClick={() => onDateSelect(date)}
        >
          <span className={`${isSelected ? 'w-9 h-9 rounded-[10px] scale-105 transform bg-indigo-600 text-white flex items-center justify-center font-semibold' : 'w-8 h-8 rounded-full flex items-center justify-center'}`}>
            {day}
          </span>
          <div className="absolute bottom-1 flex items-center justify-center space-x-1">
            {completionStatus === 'full' && <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>}
            {completionStatus === 'partial' && <div className="w-1.5 h-1.5 rounded-full bg-yellow-400"></div>}
            {hasRecord && completionStatus === 'none' && <div className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white' : 'bg-indigo-500'}`}></div>}
          </div>
        </div>
      );
    }
    return calendarDays;
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-xs p-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => changeMonth(-1)} className="p-2 rounded-full hover:bg-gray-100">&larr;</button>
          <h3 className="font-bold text-lg">{`${displayDate.getFullYear()}年 ${displayDate.getMonth() + 1}月`}</h3>
          <button onClick={() => changeMonth(1)} className="p-2 rounded-full hover:bg-gray-100">&rarr;</button>
        </div>
        <div className="grid grid-cols-7 gap-2 text-center text-xs text-gray-500 mb-2">
          {['日', '月', '火', '水', '木', '金', '土'].map(d => <div key={d}>{d}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-y-1 place-items-center">
          {generateCalendar()}
        </div>
      </div>
    </div>
  );
};

export default DatePickerModal;