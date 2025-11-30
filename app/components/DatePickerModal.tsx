"use client";

import React, { useState, useEffect } from 'react';

interface DatePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDateSelect: (date: Date) => void;
  initialDate: Date;
  highlightedDates?: Set<string>;
}

const DatePickerModal: React.FC<DatePickerModalProps> = ({ isOpen, onClose, onDateSelect, initialDate, highlightedDates }) => {
  const [displayDate, setDisplayDate] = useState<Date>(initialDate);
  useEffect(() => setDisplayDate(initialDate), [initialDate, isOpen]);
  if (!isOpen) return null;

  const changeMonth = (amount: number) => setDisplayDate(d => {
    const nd = new Date(d); nd.setMonth(nd.getMonth() + amount); return nd;
  });

  const generateCalendar = () => {
    const year = displayDate.getFullYear();
    const month = displayDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const nodes: React.ReactNode[] = [];
    for (let i = 0; i < firstDay; i++) nodes.push(<div key={`e-${i}`} className="w-10 h-10"></div>);
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const dateStr = date.toLocaleDateString('sv-SE');
      const hasRecord = highlightedDates?.has(dateStr);
      const isSelected = initialDate.toLocaleDateString('sv-SE') === dateStr;
      nodes.push(
        <div
          key={day}
          className="w-10 h-10 flex items-center justify-center rounded-full text-sm cursor-pointer hover:bg-indigo-50 relative"
          onClick={() => onDateSelect(date)}
        >
          <span className={`${isSelected ? 'w-9 h-9 rounded-[10px] scale-105 transform bg-indigo-600 text-white flex items-center justify-center font-semibold' : 'w-8 h-8 rounded-full flex items-center justify-center'}`}>
            {day}
          </span>
          {hasRecord && (
            <div className="absolute bottom-1">
              <div className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white' : 'bg-indigo-500'}`}></div>
            </div>
          )}
        </div>
      );
    }
    return nodes;
  };
  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-xs p-4 z-10" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => changeMonth(-1)} className="p-2 rounded-full hover:bg-gray-100">&larr;</button>
          <h3 className="font-bold text-lg">{`${displayDate.getFullYear()}年 ${displayDate.getMonth() + 1}月`}</h3>
          <button onClick={() => changeMonth(1)} className="p-2 rounded-full hover:bg-gray-100">&rarr;</button>
        </div>
        <div className="grid grid-cols-7 gap-2 text-center text-xs text-gray-500 mb-2">
          {['日','月','火','水','木','金','土'].map(d => <div key={d}>{d}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-y-1 place-items-center">
          {generateCalendar()}
        </div>
      </div>
    </div>
  );
};

export default DatePickerModal;