import React, { useState, useEffect } from "react";
import agentAPI from "../apis/agent";

const useAgent = () => {
  const [rows, setRows] = useState<number>(0);
  const [agentList, setAgentList] = useState<any[] | undefined>(undefined);
  const [description, setDescription] = useState("");
  const [name, setName] = useState("");
  const [joblevel, setJoblevel] = useState("");
  const initializeAgentState = () => {
    setDescription("");
    setName("");
    setJoblevel("");
  };
  const handleChangeDescription = (e?: React.ChangeEvent<HTMLElement>) => {
    if (!e) return;
    const target = e.currentTarget as HTMLTextAreaElement;
    setDescription(target.value);
  };
  const handleChangeName = (e?: React.ChangeEvent<HTMLElement>) => {
    if (!e) return;
    const target = e.currentTarget as HTMLInputElement;
    setName(target.value);
  };
  const handleChangeJoblevel = (e?: React.ChangeEvent<HTMLElement>) => {
    if (!e) return;
    const target = e.currentTarget as HTMLInputElement;
    setJoblevel(target.value);
  };

  const handleCreateComment = async (
    e?: React.MouseEvent<HTMLButtonElement>
  ) => {
    const data = { name, joblevel, description};
    const result = await agentAPI.createAgentinfo(data);
    if (result.statusCode === 400) {
      alert(result.detail[0].constraints.isLength);
      initializeAgentState();
      return;
    }

    if (!agentList) {
      setAgentList([data]);
    } else {
      setAgentList([
        ...agentList,
        { ...data},
      ]);
      initializeAgentState();
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
    handleCreateComment,
    agentList,
    description,
    name,
    joblevel,
    rows,
  };
};

export default useAgent;
