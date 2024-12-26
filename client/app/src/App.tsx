
import { useEffect, useState } from "react";
import useComment from "./hooks/useComment";
import "./App.css";

import MyCalendar from './MyCalendar';
import { EventInput } from '@fullcalendar/core';

import Table from './ReactTable';

function App() {
  //const [todayCounter, setTodayCounter] = useState<number>(0);
  //const [totalCounter, setTotalCounter] = useState<number>(0);

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
      {/* <VisitorComment
        id="['직원 명단', 'fluent:comment-add-24-regular']"
        backgroundColor={COLOR.MAIN_COLOR}
        theme="basic" // 'basic' | 'box' | 'vertical'
        inputBackgroundColor={COLOR.POINT_COLOR}
        inputFontColor={COLOR.MAIN_COLOR}
        inputPlacehoderColor={COLOR.SIMPLE_GREY}
        userInputLineColor={COLOR.CLEAN_BLUE}
        buttonColor={COLOR.CLEAN_BLUE}
        listBackgroundColor={COLOR.POINT_COLOR}
        listCommentColor={COLOR.MAIN_COLOR}
        listNicknameColor={COLOR.CLEAN_BLUE}
        listDateColor={COLOR.CLEAN_BLUE}
        progressbarColor={COLOR.CLEAN_BLUE}
        isShowScrollDownIcon={true}
        scrollDownIconColor={COLOR.CLEAN_BLUE}
        descriptionPlaceholder="방명록을 남겨주세요 :D"
        nicknamePlaceholder="닉네임"
        passwordPlaceholder="비밀번호"
        comment={comment} // Your fetched variable
        nickname={nickname} // Your fetched variable
        password={password} // Your fetched variable
        commentList={commentList} // Your fetched variable
        handleCreateComment={handleCreateComment} // Event handling variable
        handleChangeDescription={handleChangeDescription} // Event handling variable
        handleChangeNickname={handleChangeNickname} // Event handling variable
        handleChangePassword={handleChangePassword} // Event handling variable
      /> */}

    </div>
  );
}

export default App;