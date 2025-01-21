import { useEffect, useState } from "react";
import {useAgent} from "./hooks/useAgentinfo";
import "./App.css";

import MyCalendar from './MyCalendar';
import { EventInput } from '@fullcalendar/core';

import Table from './ReactTable';

function App() {
  const {
    agentList,
    selectedDates,
    leaveList,
  } = useAgent();

  useEffect(() => {
    if(leaveList){
      console.log('Get leaveList :', leaveList);
    }
  }, [leaveList]); // leaveList 변경될 때마다 실행

  return (
      <div className="App">
        <MyCalendar events={leaveList} />
        <Table />
        {}
      </div>
  );
}

export default App;