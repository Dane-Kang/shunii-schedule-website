import React, { createContext, useContext, useState, useEffect } from "react";
import agentAPI from "../apis/agent";
import { DateObject } from 'react-multi-date-picker'; // DateObject를 임포트
import { EventInput } from '@fullcalendar/core';

// Context 생성
const AgentContext = createContext<any>(null);

export const AgentProvider = ({ children }: { children: React.ReactNode }) => {
  const [rows, setRows] = useState<number>(0);
  const [agentList, setAgentList] = useState<any[] | undefined>(undefined);
  const [selectedDates, setSelectedDates] = useState<{ [key: number]: {name:string; date:DateObject[]} }>({});
  const [selectedAnnualleave, setSelectedAnnualleave] = useState<{ [key: number]: {name:string; date:DateObject[]} }>({});
  const [leaveList, setLeaveList] = useState<EventInput[]>([]);
  const [annualLeaveList, setAnnualLeaveList] = useState<EventInput[]>([]);
  const [scheduleEssentialWork, setScheduleEssentialWork] = useState<number[]>([8,7,1,3,3]);
  const [holiday, setHoliday] = useState<DateObject[]>([]);
  const [alternativeholiday, setAlternativeholiday] = useState<DateObject[]>([]);
  const [selectedSubjob1, setSelectedSubjob1] = useState<string[]>([]);
  const [selectedSubjob2, setSelectedSubjob2] = useState<string[]>([]);
  const [currentMonth, setCurrentMonth] = useState<string>(""); // 초기값 현재 달
  const [annualLeaveUsage, setAnnualLeaveUsage] = useState<{ [agentId: string]: number }>({}); // 인원별 누적 사용 연차
  // 현재 보고 있는 달의 확정 휴일/연차 (서버 저장본)
  const [monthlySchedule, setMonthlySchedule] = useState<
    { agentId: string; name: string; jobLevel: string; date: string; type: "leave" | "annual" }[]
  >([]);

  const handleCreateAgent = async (
    name: string, joblevel: string, description: string, annualleave: string
  ) => {
    const data = { name, joblevel, description, annualleave};
    console.log('handleCreateAgent data',data);
    const result = await agentAPI.createAgentinfo(data);
    if (result.statusCode === 400) {
      alert(result.detail[0].constraints.isLength);
      return;
    }

    syncAgentList();
  };

  const handleUpdateAgent = async (id:string,
    name: string, joblevel: string, description: string, annualleave: string
  ) => {
    const data = { name, joblevel, description, annualleave};
    console.log('handleUpdateAgent data',data, 'id ',id);
    const result = await agentAPI.updateAgentinfo(id, data);
    if (result.statusCode === 400) {
      alert(result.detail[0].constraints.isLength);
      return;
    }

    syncAgentList();
  };

  const handleDeleteAgent = async (id:string,
    name: string, joblevel: string, description: string, annualleave: string
  ) => {
    const data = { name, joblevel, description, annualleave};
    console.log('deleteAgentinfo data',data, 'id ',id);
    
    const result = await agentAPI.deleteAgentinfo(id, data);
    if (result.statusCode === 400) {
      alert(result.detail[0].constraints.isLength);
      return;
    }

    syncAgentList(); 
  };

  const syncAgentList = async () => {
    console.log("syncAgentList");
    const result = await agentAPI.getAgentinfo();
    setAgentList(result.agentinfos);
    const count = await agentAPI.getAgentCount();
    setRows(count.response);
  };

  // 해당 연도 1월부터 지정한 달('YYYY-MM')까지의 인원별 누적 사용 연차 수를 서버에서 조회
  const fetchAnnualLeaveUsage = async (month: string) => {
    if (!/^\d{4}-\d{2}$/.test(month)) return;
    try {
      const result = await agentAPI.getAnnualLeaveUsage(month);
      setAnnualLeaveUsage(result?.usage ?? {});
    } catch (err) {
      console.error("fetchAnnualLeaveUsage error", err);
    }
  };

  // 특정 달('YYYY-MM')의 확정 휴일/연차(서버 저장본)를 조회
  const fetchMonthlySchedule = async (month: string) => {
    if (!/^\d{4}-\d{2}$/.test(month)) return;
    try {
      const result = await agentAPI.getMonthlySchedule(month);
      setMonthlySchedule(result?.leaves ?? []);
    } catch (err) {
      console.error("fetchMonthlySchedule error", err);
      setMonthlySchedule([]);
    }
  };

  // 스케줄 초기화: monthly_leaves DROP/재생성 + 모든 직원의 원하는 휴일/연차 신청 입력값 비움
  const resetMonthlyScheduleTable = async () => {
    const result = await agentAPI.resetMonthlyScheduleTable();
    if (result?.statusCode && result.statusCode !== 200) {
      alert(result.msg ?? "테이블 초기화에 실패했습니다.");
      return false;
    }
    setAnnualLeaveUsage({});
    setMonthlySchedule([]);
    await syncAgentList(); // 비워진 직원 입력값을 화면에 반영
    return true;
  };

  // 확정된 월 스케줄을 서버에 저장 (인원 x 월 별 통째 교체)
  const confirmSchedule = async (
    scheduleMonth: string,
    entries: { agentId: string; leaveDates: string[]; annualLeaveDates: string[] }[]
  ) => {
    const result = await agentAPI.confirmMonthlySchedule({ scheduleMonth, entries });
    if (result?.statusCode && result.statusCode !== 200) {
      alert(result.msg ?? "스케줄 확정에 실패했습니다.");
      return false;
    }
    // 저장 후 해당 달 저장본 + 그 달까지의 누적 연차 갱신
    await fetchMonthlySchedule(scheduleMonth);
    await fetchAnnualLeaveUsage(scheduleMonth);
    return true;
  };

  const setSelectedDateList = async () => {
    const selectedDatesMapping: { [key: number]: {name:string; date:DateObject[]} } = {};
    const selectedleaveMapping:EventInput[] = [];
    const selectedANDatesMapping: { [key: number]: {name:string; date:DateObject[]} } = {};
    const selectedannualleaveMapping:EventInput[] = [];

    if(agentList){
      const filteredinfo = agentList.map(({id, ...rest}) => rest); // id를 제외한 데이터로 변환
      filteredinfo.forEach((agent, rowid) => {
        const description = agent.description;
        const annualleave = agent.annualleave;
        const name = agent.name;
        // 빈 값('')은 날짜가 없는 것으로 처리 (초기화된 직원 등)
        const serverDates = description.split(',').map((date: string) => date.trim()).filter((date: string) => date.length > 0);
        const serverANDates = annualleave.split(',').map((date: string) => date.trim()).filter((date: string) => date.length > 0);

        const dateObjects = serverDates.map((dateStr: string) => {
          const [year, month, day] = dateStr.split('-').map(Number);
          return new DateObject({ year, month, day });
        });
        selectedDatesMapping[rowid] = { name, date: dateObjects };

        const dateANObjects = serverANDates.map((dateStr: string) => {
          const [year, month, day] = dateStr.split('-').map(Number);
          return new DateObject({ year, month, day });
        });
        selectedANDatesMapping[rowid] = { name, date: dateANObjects };

        const eventInput:EventInput[] = serverDates.map((date: string) => {
          return {title:name,start:date};
        });
        selectedleaveMapping.push(...eventInput); //selectedleaveMapping에 eventInput 추가

        const eventANInput:EventInput[] = serverANDates.map((date: string) => {
          return {title:name,start:date};
        });
        selectedannualleaveMapping.push(...eventANInput); //selectedannualleaveMapping eventInput 추가
      });

      // setLeaveList 업데이트
      setLeaveList(selectedleaveMapping);

      // setAnnualLeaveList 업데이트
      setAnnualLeaveList(selectedannualleaveMapping);

      // selectedDates 업데이트
      setSelectedDates(selectedDatesMapping);

      // selectedDates 업데이트
      setSelectedAnnualleave(selectedANDatesMapping);
    }
  };

  useEffect(() => {
    (async () => {
      const result = await agentAPI.getAgentinfo();
      setAgentList(result.agentinfos);
      console.log(agentList);
      const count = await agentAPI.getAgentCount();
      setRows(count.response);
    })();
  }, []);

  useEffect(() => {
    setSelectedDateList();
  }, [agentList]);

  // 달력에서 보고 있는 달이 바뀌면 그 달의 확정 저장본과 그 달까지의 누적 사용 연차를 다시 조회
  useEffect(() => {
    if (currentMonth && /^\d{4}-\d{2}$/.test(currentMonth)) {
      fetchMonthlySchedule(currentMonth);
      fetchAnnualLeaveUsage(currentMonth);
    }
  }, [currentMonth]);

  return (
    <AgentContext.Provider
      value={{
        handleCreateAgent,
        handleUpdateAgent,
        handleDeleteAgent,
        rows,
        agentList,
        selectedDates,
        selectedAnnualleave,
        leaveList,
        annualLeaveList,
        scheduleEssentialWork,
        holiday,
        alternativeholiday,
        selectedSubjob1,
        selectedSubjob2,
        currentMonth,
        annualLeaveUsage,
        fetchAnnualLeaveUsage,
        monthlySchedule,
        fetchMonthlySchedule,
        confirmSchedule,
        resetMonthlyScheduleTable,
        setLeaveList,
        syncAgentList,
        setSelectedDates,
        setSelectedAnnualleave,
        setSelectedDateList,
        setScheduleEssentialWork,
        setHoliday,
        setAlternativeholiday,
        setSelectedSubjob1,
        setSelectedSubjob2,
        setCurrentMonth,
      }}
    >
      {children}
    </AgentContext.Provider>
  );
};

// Context를 사용하기 위한 커스텀 훅
export const useAgent = () => {
  const context = useContext(AgentContext);
  if (!context) {
    throw new Error("useAgent must be used within an AgentProvider");
  }
  return context;
};
