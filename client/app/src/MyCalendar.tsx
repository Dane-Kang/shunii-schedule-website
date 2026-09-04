import React from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import { EventInput, DatesSetArg, DayCellContentArg } from '@fullcalendar/core';
import './MyCalendar.css'
import { useAgent } from "./hooks/useAgentinfo";
import { getHolidayName } from "./koreanHolidays";

interface MyCalendarProps {
  events: EventInput[];
}

const MyCalendar: React.FC<MyCalendarProps> = ({ events }) => {
  const { setCurrentMonth } = useAgent();

  const handleDatesSet = (arg: DatesSetArg) => {
    const currentDate = arg.view.currentStart;
    const year = currentDate.getFullYear();
    const month = (currentDate.getMonth() + 1).toString().padStart(2, "0");
    const yearMonth = `${year}-${month}`;

    setCurrentMonth(yearMonth);
  };

  // 공휴일 셀에 클래스 추가 (배경/글자색은 CSS 에서 처리)
  const dayCellClassNames = (arg: DayCellContentArg) =>
    getHolidayName(arg.date) ? ["kr-holiday"] : [];

  // 날짜 숫자 + (공휴일이면) 공휴일 이름 표시
  const dayCellContent = (arg: DayCellContentArg) => {
    const name = getHolidayName(arg.date);
    return (
      <div className="kr-day-cell">
        <span className="kr-day-num">{arg.dayNumberText}</span>
        {name && <span className="kr-holiday-name">{name}</span>}
      </div>
    );
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
        dayCellClassNames={dayCellClassNames}
        dayCellContent={dayCellContent}
        fixedWeekCount={false}
      />
    </div>
  );
};

export default MyCalendar;
