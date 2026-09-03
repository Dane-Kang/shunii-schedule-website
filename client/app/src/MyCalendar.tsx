import React, { useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import { EventInput, DatesSetArg } from '@fullcalendar/core';
import './MyCalendar.css'
import { useAgent } from "./hooks/useAgentinfo";

interface MyCalendarProps {
  events: EventInput[];
}

const MyCalendar: React.FC<MyCalendarProps> = ({ events }) => {
  const {
    currentMonth, 
    setCurrentMonth,
  } = useAgent();

  const handleDatesSet = (arg: DatesSetArg) => {
    const currentDate = arg.view.currentStart;
    const year = currentDate.getFullYear();
    const month = (currentDate.getMonth() + 1).toString().padStart(2, "0");
    const yearMonth = `${year}-${month}`;

    setCurrentMonth(yearMonth);
  };

  return (
    <div className="optimized_calendar">
      <FullCalendar
        plugins={[dayGridPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        headerToolbar={{
          left: 'prev,next',
          center: 'title',
          right: 'dayGridMonth',
        }}
        events={events}
        datesSet={handleDatesSet} // 현재 달 변경 감지
      />
    </div>
  );
};

export default MyCalendar;