import {
  Header,
  Contact,
  VisitorCounter,
  VisitorComment,
} from "dev-portfolio";

import { useEffect, useState } from "react";
import styled from "styled-components";
import useComment from "./hooks/useComment";
import "./App.css";
import COLOR from "./common/style/theme";
import countAPI from "./apis/count";

import MyCalendar from './MyCalendar';
import { EventInput } from '@fullcalendar/core';

import Table from './ReactTable';

function App() {
  const [todayCounter, setTodayCounter] = useState<number>(0);
  const [totalCounter, setTotalCounter] = useState<number>(0);

  useEffect(() => {
    (async () => {
      const result = await countAPI.getCount();
      setTodayCounter(result.todayCount);
      setTotalCounter(result.totalCount);
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
      <Header
        headerBackgroundColor={COLOR.POINT_COLOR}
        logoOption={{
          redirectUrl: "/",
          title: "Monthly Scheduler",
          logoImg: "./박우림_일러스트.png",
          // logoHidden: true,
          titleColor: `${COLOR.CLEAN_BLUE}`,
          titleSize: "24px",
        }}
        channels={[
          { name: "github", redirectUrl: "/", color: `black`, size: "1px", margin: "0 1px 0 0",},
          { name: "linkedin", redirectUrl:"/", color: `black`, size: "1px", margin: "0 1px 0 0",},
          { name: "youtube", redirectUrl:"https://www.youtube.com/@yokkang4661", color: `${COLOR.CLEAN_BLUE}`, size: "26px", margin: "0 1px 0 0", },
        ]}
        sideBarOption={{
          mainTitle: "Management Member :D",
          mainTitleSize: "20px",
          mainTitleColor: "white",
          mainTitleAlign: "left",
          mainTitleBorderColor: "white",
          iconName: "ant-design:menu-fold-outlined", //Refer to the guidelines.
          iconSize: "30px",
          iconColor: `${COLOR.MAIN_COLOR}`,
          iconMargin: "0px 12px",
          itemTextColor: `${COLOR.MAIN_COLOR}`,
          itemTextAlign: "left",
          itemBackgroundColor: `${COLOR.POINT_COLOR}`,
          itemHoverdBackgroundColor: `${COLOR.CLEAN_BLUE}`,
          backgroundColor: `${COLOR.POINT_COLOR}`,
        }}
      />

      <VisitorCounter
        theme="big-size"
        backgroundColor={COLOR.MAIN_COLOR}
        size="14px"
        title="조회수"
        titleColor={COLOR.POINT_COLOR}
        todayTitle="오늘"
        todayTitleColor={COLOR.POINT_COLOR}
        todayVisitor={todayCounter}
        todayVisitorColor={COLOR.CLEAN_BLUE}
        totalTitle="전체"
        totalTitleColor={COLOR.POINT_COLOR}
        totalVisitor={totalCounter}
        totalVisitorColor={COLOR.CLEAN_BLUE}
      />

      <UnderLine></UnderLine>

      <MyCalendar events={events} />
      <Table rows={5}/>
      <VisitorComment
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
      />

      <Contact
        title="Schedule Calendar"
        titleColor={COLOR.CLEAN_BLUE}
        backgroundColor={COLOR.POINT_COLOR}
        channels={[
          {
            name: "youtube",
            redirectUrl:
              "https://www.youtube.com/@yokkang4661",
            color: `${COLOR.CLEAN_BLUE}`,
            margin: "0 10px 0 0",
          },
        ]}
        aboutMeInfos={[
          {
            title: "이 메 일",
            titleColor: `${COLOR.CLEAN_BLUE}`,
            description: "kangyosoon1636@gmail.com",
            descriptionColor: `${COLOR.MAIN_COLOR}`,
          },
        ]}
      />
    </div>
  );
}

export default App;

const ContactTitle = styled.h1`
  margin: 0;
  padding: 0 1em 0 1em;
`;

const FavoriteText = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  font-weight: 600;
  padding: 10px 20px;
  background-color: ${COLOR.MAIN_COLOR};
  border-radius: 8px;
`;

const SkillContainer = styled.div`
  display: flex;
  direction: row;
  margin: 2em 2em 0 2em;
`;

const SkillBox = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  width: 100%;
`;

const UnderLine = styled.hr`
  border: 0.5px dashed ${COLOR.SIMPLE_GREY};
`;
