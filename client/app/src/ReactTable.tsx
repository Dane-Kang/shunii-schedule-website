import React, { useEffect, useState } from 'react';
import useAgent from "./hooks/useAgentinfo";
import DatePicker from 'react-multi-date-picker';
import "react-multi-date-picker/styles/layouts/mobile.css";
import "react-multi-date-picker/styles/colors/green.css";
import { DateObject } from 'react-multi-date-picker'; // DateObject를 임포트
import './styles.css';
import Day from 'react-datepicker/dist/day';

export interface Agent {
  name: string;
  job_level: string;
  description: string;
  isNew?: boolean; // 추가된 행 여부를 나타내는 필드
  ischecked?: boolean;
}

const Table: React.FC = () => {
  const {
    agentList,
    // description,
    // name,
    // joblevel,
    rows,
    handleChangeDescription,
    handleChangeName,
    handleChangeJoblevel,
    handleCreateAgent,
    handleUpdateAgent,
    handleDeleteAgent,
  } = useAgent();

  const [data, setData] = useState<Agent[]>([]); // Agent[] 타입으로 초기화
  const [selectedDates, setSelectedDates] = useState<{ [key: number]: DateObject[] }>({});

  // 수동으로 열 너비 설정
  const columnWidths = [60, 160, 300];
  // Header 이름 설정
  const headerNames = ['이름','직무 등급','원하는 연차 날짜'];
  // 수동으로 열 수정 가능 여부 설정
  const editableColumns = [true, true, true, true];

  const getDescriptionValue = (value: any): Date[] => {
    if (Array.isArray(value)) {
      return value;
    }
    return [];
  };

  // agentList를 기반으로 데이터 설정
  useEffect(() => {
    if (agentList) {
      const filteredinfo = agentList.map(({id, ...rest}) => rest); // id를 제외한 데이터로 변환
      console.log('filteredinfo :',filteredinfo);
      setData(filteredinfo);

      const selectedDatesMapping: { [key: number]: DateObject[] } = {};

      let rowid: number = 0;
      filteredinfo.forEach((agent) => {
        const description = agent.description;

        const serverDates = description.split(',').map((date: string) => date.trim());  // 공백을 제거하고 배열로 변환
        console.log('foreach serverDates :',serverDates);

        const dateObjects = serverDates.map((dateStr: string) => {
          const trimmedDateStr = dateStr.trim(); // 공백 제거
          const [year, month, day] = trimmedDateStr.split('-').map(Number);
          return new DateObject({ year, month, day });
        });
        console.log('selecetdata :',dateObjects);

        selectedDatesMapping[rowid] = dateObjects;
        rowid++;
      });

      // selectedDates 업데이트
      setSelectedDates(selectedDatesMapping);
    }
  }, [agentList]);

  // 새로운 행 추가 함수
  const addRow = () => {
    const newRow: Agent = { name: '', job_level: '', description: ''}; // 기본값을 가진 새 행
    setData([...data, newRow]);
  };

  // 새로운 행 저장/삭제 함수
  const setRowEvent = (row: Agent, rowIndex: number) => {
    
    if(row){
      if(!row.ischecked){
        if(rows >= rowIndex + 1){
          console.log("Update Existing Agent");
          handleUpdateAgent(rowIndex+1, row.name, row.job_level, row.description);
        }
        else {
          console.log("Save New Agent");
          handleCreateAgent(row.name, row.job_level, row.description);
        }
      }
      else{
        console.log("Delete Agent");
        handleDeleteAgent(rowIndex+1, row.name, row.job_level, row.description);
      }
    }
  };

  const handleDateChange = (rowIndex: number, dates: DateObject[]) => {
    selectedDates[rowIndex] = dates;

    setSelectedDates(selectedDates);
    console.log(dates);
  };

  const handleDatePickerClose = (rowIndex: number) => {
    // DatePicker가 닫힐 때 호출되는 함수
    // 선택된 날짜들을 처리
    const formattedDates = selectedDates[rowIndex].map(date => {
        const dateInstance = date.toDate();
        const year = dateInstance.getFullYear();
        const month = dateInstance.getMonth() + 1;
        const day = dateInstance.getDate();
        return `${year}-${month}-${day}`; // 월/일 형식으로 변환
      })
      .join(", "); // 여러 날짜들을 쉼표로 구분하여 연결

    console.log("handleDatePickerClose: ", formattedDates); // 선택된 날짜들 출력
    // 상태를 처리하는 함수 호출
    handleInputChange(rowIndex, 'description', formattedDates);
  };

  const handleInputChange = (rowIndex: number, field: keyof Agent, value: string) => {
    const newData = data.map((row, rIdx) => {
      if (rIdx === rowIndex) {
        const updatedRow = { ...row, [field]: value };
        updatedRow.isNew = true;
        return updatedRow;
      }
      return row;
    });
    setData(newData);
  };

  const handleCheckboxChange = (rowIndex: number, checked: boolean) => {
    const newData = data.map((row, rIdx) => {
      if(rIdx === rowIndex){
        row.ischecked = checked;
        row.isNew = checked;
        console.log(row);
        return row;
      }
      return row;
    });
    setData(newData);
  };

  // Header Table의 Checkbox 설정
  const handleHeaderCheckboxChange = (checked: boolean) => {
    const newData = data.map((row, rIdx) => {
      row.ischecked = checked;
      row.isNew = checked;
      console.log(row);
      return row;
    });
    setData(newData);
  };

  return (
    <div>
      <table className='table-style'>
        <thead>
          <tr>
            <th>
              <input
                type="checkbox"
                onChange={(e) => handleHeaderCheckboxChange(e.target.checked)}
              />
            </th>
            {columnWidths.map((width, colIndex) => (
              <th key={colIndex} style={{ width: `${width}px` }}>
                {headerNames[colIndex]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, rowIndex) => (
            <tr key={rowIndex}>
              <td>
                <input
                  type="checkbox"
                  checked={row.ischecked}
                  onChange={(e) => handleCheckboxChange(rowIndex, e.target.checked)}
                />
              </td>
              {['name', 'job_level', 'description'].map((field, colIndex) => (
                <td key={colIndex} style={{ width: `${columnWidths[colIndex]}px` }}>
                {field === 'description' ? (
                  <DatePicker
                    onChange={(dates: DateObject[]) => handleDateChange(rowIndex, dates)}
                    onClose={() => handleDatePickerClose(rowIndex)}
                    value={selectedDates[rowIndex]}
                    multiple
                    readOnly={!editableColumns[colIndex]}
                    format="MM/DD"
                    calendarPosition="bottom-center"
                    className="black"
                  />
                ) : (
                  <input
                    type="text"
                    value={row[field as keyof Agent] as string}
                    onChange={(e) => handleInputChange(rowIndex, field as keyof Agent, e.target.value)}
                    readOnly={!editableColumns[colIndex]}
                  />
                )}
                </td>
              ))}
              {row.isNew && (
                <button onClick={() => setRowEvent(row, rowIndex)}>
                    {row.ischecked ? 'Delete' : 'Save'}</button>
              )}
            </tr>
          ))}
        </tbody>
      </table>
      <button onClick={addRow}> 추가 </button>
    </div>
  );
};

export default Table;