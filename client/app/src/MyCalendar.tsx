import React from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import { EventInput } from '@fullcalendar/core';
import './MyCalendar.css'

interface MyCalendarProps {
  events: EventInput[];
}

const MyCalendar: React.FC<MyCalendarProps> = ({ events }) => {
  return (
    <div className="optimized_calendar">
      <FullCalendar
        plugins={[dayGridPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        headerToolbar={{
          left: 'prev,next today',
          center: 'title',
          right: 'dayGridMonth,timeGridWeek,timeGridDay',
        }}
        events={events}
      />
    </div>
  );
};

export default MyCalendar;