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
  const [scheduleEssentialWork, setScheduleEssentialWork] = useState<number[]>([8,7,1,4,3]);
  const [holiday, setHoliday] = useState<DateObject[]>([]);
  const [alternativeholiday, setAlternativeholiday] = useState<DateObject[]>([]);
  const [selectedSubjob1, setSelectedSubjob1] = useState<string[]>([]);
  const [selectedSubjob2, setSelectedSubjob2] = useState<string[]>([]);

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
        const serverDates = description.split(',').map((date: string) => date.trim());  // 공백을 제거하고 배열로 변환
        const serverANDates = annualleave.split(',').map((date: string) => date.trim());  // 공백을 제거하고 배열로 변환

        const dateObjects = serverDates.map((dateStr: string) => {
          const trimmedDateStr = dateStr.trim(); // 공백 제거
          const [year, month, day] = trimmedDateStr.split('-').map(Number);
          return new DateObject({ year, month, day });
        });
        selectedDatesMapping[rowid] = { name, date: dateObjects };

        const dateANObjects = serverANDates.map((dateStr: string) => {
          const trimmedDateStr = dateStr.trim(); // 공백 제거
          const [year, month, day] = trimmedDateStr.split('-').map(Number);
          return new DateObject({ year, month, day });
        });
        selectedANDatesMapping[rowid] = { name, date: dateANObjects };

        const eventInput:EventInput[] = description.split(',').map((date: string) => {
          return {title:name,start:date.trim()};
        });
        selectedleaveMapping.push(...eventInput); //selectedleaveMapping에 eventInput 추가

        const eventANInput:EventInput[] = annualleave.split(',').map((date: string) => {
          return {title:name,start:date.trim()};
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
