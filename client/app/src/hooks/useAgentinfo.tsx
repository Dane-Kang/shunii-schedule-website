import React, { useState, useEffect } from "react";
import agentAPI from "../apis/agent";
import { DateObject } from 'react-multi-date-picker'; // DateObject를 임포트

const useAgent = () => {
  const [rows, setRows] = useState<number>(0);
  const [agentList, setAgentList] = useState<any[] | undefined>(undefined);
  const [selectedDates, setSelectedDates] = useState<{ [key: number]: DateObject[] }>({});
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

  const handleUpdateAgent = async (id:number,
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

  const handleDeleteAgent = async (id:number,
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
    const result = await agentAPI.getAgentinfo();
    setAgentList(result.agentinfos);
  };

  const setSelectedDateList = async () => {
    const selectedDatesMapping: { [key: number]: DateObject[] } = {};
    let rowid: number = 0;
    if(agentList){
      const filteredinfo = agentList.map(({id, ...rest}) => rest); // id를 제외한 데이터로 변환
      filteredinfo.forEach((agent) => {
        const description = agent.description;
        const serverDates = description.split(',').map((date: string) => date.trim());  // 공백을 제거하고 배열로 변환
        
        const dateObjects = serverDates.map((dateStr: string) => {
          const trimmedDateStr = dateStr.trim(); // 공백 제거
          const [year, month, day] = trimmedDateStr.split('-').map(Number);
          return new DateObject({ year, month, day });
        });
        
        selectedDatesMapping[rowid] = dateObjects;
        rowid++;
      });
      
      // selectedDates 업데이트
      console.log('setSelectedDateList : ',selectedDatesMapping);
      setSelectedDates(selectedDatesMapping);
    }
  };

  useEffect(() => {
    (async () => {
      const result = await agentAPI.getAgentinfo();
      setAgentList(result.agentinfos);
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
  };
};

export default useAgent;
