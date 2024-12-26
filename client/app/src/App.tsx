
import { useEffect, useState } from "react";
import useComment from "./hooks/useComment";
import "./App.css";

import MyCalendar from './MyCalendar';
import { EventInput } from '@fullcalendar/core';

import Table from './ReactTable';

function App() {

  useEffect(() => {
    (async () => {
      //const result = await countAPI.getCount();
      //setTodayCounter(result.todayCount);
      //setTotalCounter(result.totalCount);
    })();
  }, []);

  const {
    comment,
    commentList,
    password,
    nickname,
    handleChangeDescription,
    handleChangeNickname,
    handleChangePassword,
    handleCreateComment,
  } = useComment();

  const events: EventInput[] = [
    { title: '회의', start: '2024-07-01T10:00:00', end: '2024-07-01T12:00:00' },
    { title: '점심 식사', start: '2024-07-01T12:30:00' }
  ];

  return (
    <div className="App">

      <MyCalendar events={events} />
      <Table
        // id="['직원 명단', 'fluent:comment-add-24-regular']"
      />
      {}

    </div>
  );
}

export default App;