import React, { useState, useEffect } from "react";
import agentAPI from "../apis/agent";

const useAgent = () => {
  const [rows, setRows] = useState<number>(0);
  const [agentList, setAgentList] = useState<any[] | undefined>(undefined);
  // const [description, setDescription] = useState("");
  // const [name, setName] = useState("");
  // const [joblevel, setJoblevel] = useState("");
  // const initializeAgentState = () => {
  //   setDescription("");
  //   setName("");
  //   setJoblevel("");
  // };
  const handleChangeDescription = (e?: React.ChangeEvent<HTMLElement>) => {
    if (!e) return;
    const target = e.currentTarget as HTMLTextAreaElement;
    // setDescription(target.value);
  };
  const handleChangeName = (e?: React.ChangeEvent<HTMLElement>) => {
    if (!e) return;
    const target = e.currentTarget as HTMLInputElement;
    // setName(target.value);
  };
  const handleChangeJoblevel = (e?: React.ChangeEvent<HTMLElement>) => {
    if (!e) return;
    const target = e.currentTarget as HTMLInputElement;
    // setJoblevel(target.value);
  };

  const handleCreateAgent = async (
    name: string, joblevel: string, description: string
  ) => {
    const data = { name, joblevel, description};
    console.log('handleCreateAgent data',data);
    const result = await agentAPI.createAgentinfo(data);
    if (result.statusCode === 400) {
      alert(result.detail[0].constraints.isLength);
      // initializeAgentState();
      return;
    }
    console.log('handleCreateAgent 1');
    if (!agentList) {
      setAgentList([data]);
    } else {
      setAgentList([
        ...agentList,
        { ...data},
      ]);
      // initializeAgentState();
      console.log(result);
    }
  };

  useEffect(() => {
    (async () => {
      const result = await agentAPI.getAgentinfo();
      console.log(result);
      setAgentList(result.agentinfos);
      const count = await agentAPI.getAgentCount();
      setRows(count.response);
    })();
  }, []);

  return {
    handleChangeDescription,
    handleChangeName,
    handleChangeJoblevel,
    handleCreateAgent,
    agentList,
    // description,
    // name,
    // joblevel,
    rows,
  };
};

export default useAgent;
