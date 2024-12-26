import { useEffect, useState } from "react";
import useAgent from "./hooks/useAgentinfo";
import "./App.css";

import MyCalendar from './MyCalendar';
import { EventInput } from '@fullcalendar/core';

import Table from './ReactTable';

import { DateObject } from 'react-multi-date-picker';

function App() {

  const {
    agentList,
    selectedDates,
  } = useAgent();

  useEffect(() => {
    if(selectedDates){
      console.log('updated selectedDates :', selectedDates);
      const filterDates = selectedDates;
    }
  }, [selectedDates]); // selectedDates가 변경될 때마다 실행

  const events: EventInput[] = [
    { title: '회의', start: '2024-12-11' },
    { title: '점심 식사', start: '2024-12-11' }
  ];

  return (
    <div className="App">

      <MyCalendar events={events} />
      <Table />
      {}

    </div>
  );
}

export default App;