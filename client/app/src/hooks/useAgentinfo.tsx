import React, { createContext, useContext, useState, useEffect } from "react";
import agentAPI from "../apis/agent";
import { DateObject } from 'react-multi-date-picker'; // DateObject를 임포트
import { EventInput } from '@fullcalendar/core';

// interface LeaveListContextType {
//   leaveList: EventInput[];
//   setLeaveList: React.Dispatch<React.SetStateAction<EventInput[]>>;
// }

// const LeaveListContext = createContext<LeaveListContextType | undefined>(undefined);
// export const LeaveListProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
//   const [leaveList, setLeaveList] = useState<EventInput[]>([]);

//   return (
//     <LeaveListContext.Provider value={{ leaveList, setLeaveList }}>
//       {children}
//     </LeaveListContext.Provider>
//   );
// };

// export const useLeaveList = () => {
//   const context = useContext(LeaveListContext);
//   if (!context) {
//     throw new Error("useLeaveList must be used within a LeaveListProvider");
//   }
//   return context;
// };


const useAgent = () => {
  const [rows, setRows] = useState<number>(0);
  const [agentList, setAgentList] = useState<any[] | undefined>(undefined);
  const [selectedDates, setSelectedDates] = useState<{ [key: number]: {name:string; date:DateObject[]} }>({});
  //const { leaveList, setLeaveList } = useLeaveList();
  const [leaveList, setLeaveList] = useState<EventInput[]>([]);
  // const [description, setDescription] = useState("");
  // const [name, setName] = useState("");
  // const [joblevel, setJoblevel] = useState("");
  // const initializeAgentState = () => {
  //   setDescription("");
  //   setName("");
  //   setJoblevel("");
  // };

  const handleCreateAgent = async (
    name: string, joblevel: string, description: string
  ) => {
    const data = { name, joblevel, description};
    console.log('handleCreateAgent data',data);
    const result = await agentAPI.createAgentinfo(data);
    if (result.statusCode === 400) {
      alert(result.detail[0].constraints.isLength);
      return;
    }

    syncAgentList();
  };

  const handleUpdateAgent = async (id:string,
    name: string, joblevel: string, description: string
  ) => {
    const data = { name, joblevel, description};
    console.log('handleUpdateAgent data',data, 'id ',id);
    const result = await agentAPI.updateAgentinfo(id, data);
    if (result.statusCode === 400) {
      alert(result.detail[0].constraints.isLength);
      return;
    }

    syncAgentList();
  };

  const handleDeleteAgent = async (id:string,
    name: string, joblevel: string, description: string
  ) => {
    const data = { name, joblevel, description};
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
    // let rowid: number = 0;
    if(agentList){
      const filteredinfo = agentList.map(({id, ...rest}) => rest); // id를 제외한 데이터로 변환
      filteredinfo.forEach((agent, rowid) => {
        const description = agent.description;
        const name = agent.name;
        const serverDates = description.split(',').map((date: string) => date.trim());  // 공백을 제거하고 배열로 변환
        
        const dateObjects = serverDates.map((dateStr: string) => {
          const trimmedDateStr = dateStr.trim(); // 공백 제거
          const [year, month, day] = trimmedDateStr.split('-').map(Number);
          return new DateObject({ year, month, day });
        });
        
        selectedDatesMapping[rowid] = { name, date: dateObjects };

        const eventInput:EventInput[] = description.split(',').map((date: string) => {
          return {title:name,start:date.trim()};
        });

        selectedleaveMapping.push(...eventInput); //selectedleaveMapping에 eventInput 추가
      });

      // setLeaveList 업데이트
      setLeaveList(selectedleaveMapping);
      // selectedDates 업데이트
      setSelectedDates(selectedDatesMapping);
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

  return {
    handleCreateAgent,
    handleUpdateAgent,
    handleDeleteAgent,
    setSelectedDates,
    setSelectedDateList,
    agentList,
    rows,
    selectedDates,
    leaveList,
  };
};

export default useAgent;
