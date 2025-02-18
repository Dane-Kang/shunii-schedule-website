import React, { useEffect, useRef, useState } from 'react';
import Modal from 'react-modal';
import {useAgent} from "./hooks/useAgentinfo";
import DatePicker from 'react-multi-date-picker';
import "react-multi-date-picker/styles/layouts/mobile.css";
import "react-multi-date-picker/styles/colors/green.css";
import { DateObject } from 'react-multi-date-picker'; // DateObject를 임포트
import './styles.css';

export interface Agent {
  id: string;
  name: string;
  job_level: string;
  description: string;
  annualleave: string;
  isNew?: boolean; // 추가된 행 여부를 나타내는 필드
  ischecked?: boolean;
}

Modal.setAppElement('#root');

const Table: React.FC = () => {
  const {
    agentList,
    rows,
    selectedDates,
    selectedAnnualleave,
    handleCreateAgent,
    handleUpdateAgent,
    handleDeleteAgent,
    setSelectedDates,
    setSelectedAnnualleave,
    setSelectedDateList,
    scheduleEssentialWork,
    scheduleDate,
    selectedSubjob,
    setScheduleEssentialWork,
    setScheduleDate,
    setSelectedSubjob,
  } = useAgent();

  const [data, setData] = useState<Agent[]>([]); // Agent[] 타입으로 초기화
  const [isModalOpen, setIsModalOpen] = useState(false); // 모달 열기/닫기 상태
  const [modalMessage, setModalMessage] = useState(""); // 모달에 표시할 메시지
  const [confirmAction, setConfirmAction] = useState<(() => void) | null>(null); // 확인 버튼에서 실행할 함수 저장

  // 수동으로 열 너비 설정
  const columnWidths = [60, 130, 250, 250];

  // 스케줄 관련 너비 , Header 설정
  const colWidthSetSchedule = [100, 100];
  const colWidthSetSchedule2 = [100, 150, 150, 150, 150];
  const headerNamesSetSchedule = ['전체 휴일','대체 휴일'];
  const headerNamesSetSchedule2 = ['1인당 휴일','필수 근무 인원','필수 매니저↑ 수','필수 1층 사원 수', '필수 2층 사원 수'];
  
  const colWidthHeaderSubjobs = [160, 160];
  const colWidthSubjobs = [80, 80, 80, 80];
  const headerNamesSubjobs = ['온라인 업무','RT 업무'];

  // Header 이름 설정
  const headerNames = ['이름','직무 등급','원하는 휴일', '사용 연차'];
  // 수동으로 열 수정 가능 여부 설정
  const editableColumns = [true, true, true, true, true];

  const dataRef = useRef(data);

  // agentList를 기반으로 데이터 설정
  useEffect(() => {
    if (agentList) {
      console.log("useEffect agentList :",agentList);
      setData(agentList);
    }
  }, [agentList]);

  useEffect(() => {
    dataRef.current = data;
  }, [data]); // data가 변경될 때마다 실행됨

  useEffect(() => {

  }, [scheduleEssentialWork]); // data가 변경될 때마다 실행됨

  // 새로운 행 추가 함수
  const addRow = () => {
    const newRow: Agent = { id: '', name: '', job_level: '', description: '', annualleave: ''}; // 기본값을 가진 새 행
    setData([...data, newRow]);
  };

  const openModal = (message: string, onConfirm: () => void) => {
    setModalMessage(message); // 모달 메시지 설정
    setConfirmAction(() => onConfirm); // 확인 시 실행할 함수 설정
    setIsModalOpen(true); // 모달 열기
  };

  // 모달 닫기
  const closeModal = () => {
    setIsModalOpen(false); // 모달 닫기
  };

  // 확인 버튼 클릭 시 처리할 작업
  const handleConfirm = () => {
    if (confirmAction) {
      confirmAction(); // 저장된 확인 함수 실행
      closeModal(); // 모달 닫기
    }
  };

  // 취소 버튼 클릭 시 모달 닫기
  const handleCancel = () => {
    closeModal(); // 모달 닫기
  };

  // 새로운 행 저장/삭제 함수
  const setRowEvent = (row: Agent, rowIndex: number) => {    
    if(row){
      if(!row.ischecked){
        handleDatePickerClose(rowIndex);
        if(rows >= rowIndex + 1){
          openModal("Update this info??", () => {
            console.log("dataRef.current :", dataRef.current);
            row.description = dataRef.current[rowIndex].description;
            row.annualleave = dataRef.current[rowIndex].annualleave;
            handleUpdateAgent(row.id, row.name, row.job_level, row.description, row.annualleave); // 확인 후 업데이트
          });
          console.log("Update Existing Agent");
        }
        else {
          openModal("Create New Agent??", () => {
            console.log("dataRef.current :", dataRef.current);
            row.description = dataRef.current[rowIndex].description;
            row.annualleave = dataRef.current[rowIndex].annualleave;
            handleCreateAgent(row.name, row.job_level, row.description, row.annualleave); // 확인 후 업데이트
          });
          console.log("Save New Agent");
        }
      }
      else{
        openModal("Delete??", () => {
          handleDeleteAgent(row.id, row.name, row.job_level, row.description, row.annualleave); // 확인 후 업데이트
        });
        console.log("Delete Agent");
      }
    }
  };

  const handleDateChange = (rowIndex: number, dates: DateObject[]) => {
    if(!selectedDates[rowIndex]){
      selectedDates[rowIndex] = {name:"", date:[]};
    }
    selectedDates[rowIndex].date = dates;
    setSelectedDates(selectedDates);
  };

  const handleDatePickerClose = (rowIndex: number) => { // DatePicker가 닫힐 때 호출되는 함수
    if(selectedDates[rowIndex]){
      const formattedDates = selectedDates[rowIndex].date.map((date: DateObject) => {
          const dateInstance = date.toDate();
          const year = dateInstance.getFullYear();
          const month = dateInstance.getMonth() + 1;
          const day = dateInstance.getDate();
          return `${year}-`+ month.toString().padStart(2, "0") + `-`+ day.toString().padStart(2, "0"); // 월/일 형식으로 변환
        })
        .join(", "); // 여러 날짜들을 쉼표로 구분하여 연결
      // 상태를 처리하는 함수 호출
      handleInputChange(rowIndex, 'description', formattedDates);
    }
  };

  const handle_AN_DateChange = (rowIndex: number, dates: DateObject[]) => {
    console.log("handle_AN_DateChange : row " + rowIndex + ", dates " + dates);
    if(!selectedAnnualleave[rowIndex]){
      selectedAnnualleave[rowIndex] = {name:"", date:[]};
    }
    selectedAnnualleave[rowIndex].date = dates;
    setSelectedAnnualleave(selectedAnnualleave);
  };

  const handle_AN_DatePickerClose = (rowIndex: number) => { // DatePicker가 닫힐 때 호출되는 함수
    if(selectedAnnualleave[rowIndex]){
      const formattedDates = selectedAnnualleave[rowIndex].date.map((date: DateObject) => {
          const dateInstance = date.toDate();
          const year = dateInstance.getFullYear();
          const month = dateInstance.getMonth() + 1;
          const day = dateInstance.getDate();
          return `${year}-`+ month.toString().padStart(2, "0") + `-`+ day.toString().padStart(2, "0"); // 월/일 형식으로 변환
        })
        .join(", "); // 여러 날짜들을 쉼표로 구분하여 연결
      // 상태를 처리하는 함수 호출
      handleInputChange(rowIndex, 'annualleave', formattedDates);
    }
  };

  const handlescheduleDateChange = (colIndex: number, dates: DateObject[]) => {
    if(!scheduleDate[colIndex]){
      scheduleDate[colIndex] = {name:"", date:[]};
    }
    scheduleDate[colIndex].date = dates;
    setScheduleDate(scheduleDate);
  };

  const handlescheduleDatePickerClose = (colIndex: number) => { // DatePicker가 닫힐 때 호출되는 함수
    const formattedDates = scheduleDate[colIndex].date.map((date: DateObject) => {
        const dateInstance = date.toDate();
        const year = dateInstance.getFullYear();
        const month = dateInstance.getMonth() + 1;
        const day = dateInstance.getDate();
        return `${year}-`+ month.toString().padStart(2, "0") + `-`+ day.toString().padStart(2, "0"); // 월/일 형식으로 변환
      })
      .join(", "); // 여러 날짜들을 쉼표로 구분하여 연결
    // 상태를 처리하는 함수 호출
    //handleInputChange(colIndex, 'description', formattedDates);
  };

  const handleInputChange = (rowIndex: number, field: keyof Agent, value: string) => {
    setData(prevData => {
      const newData = prevData.map((row, rIdx) =>
        rIdx === rowIndex ? { ...row, [field]: value, isNew: true } : row
      );
      return newData; // 최신 데이터 반환
    });
  };

  const handleSubjobChange = (colIndex: number, value: string) => {
    selectedSubjob[colIndex] = value;
    setSelectedSubjob(selectedSubjob);
  };

  const handlePresetWorkNumberChange = (colIndex: number, value: string) => {
    const numericValue = parseFloat(value);
    setScheduleEssentialWork((prev: number[]) => {
      if (prev[colIndex] !== numericValue) {
        return prev.map((item, index) =>
          index === colIndex ? (isNaN(numericValue) ? 0 : numericValue) : item
        );
      }
      return prev;
    });
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
        <tr>
          {colWidthSetSchedule.map((width, colIndex) => (
            <th key={colIndex} style={{ width: `${width}px` }}>
              {headerNamesSetSchedule[colIndex]}
            </th>
          ))}
        </tr>
        <tbody>
          <tr>
            {colWidthSetSchedule.map((width, colIndex) => (
              <td key={colIndex} style={{ width: `${width}px` }}>
                <DatePicker
                  onChange={(dates: DateObject[]) => handlescheduleDateChange(colIndex, dates)}
                  //onClose={() => handlescheduleDatePickerClose(colIndex)}
                  value={scheduleDate[colIndex]?.date || []}
                  multiple
                  readOnly={!editableColumns[colIndex]}
                  format="MM/DD"
                  calendarPosition="bottom-center"
                  className="black"
                />
              </td>
            ))}
          </tr>
        </tbody>
      </table>
      <div style={{ height: "5px" }}></div> {/* 여백 추가 */}
      <table className='table-style'>
        <tr>
          {colWidthSetSchedule2.map((width, colIndex) => (
            <th key={colIndex} style={{ width: `${width}px` }}>
              {headerNamesSetSchedule2[colIndex]}
            </th>
          ))}
        </tr>
        <tbody>
          <tr>
            {colWidthSetSchedule2.map((width, colIndex) => (
              <td key={colIndex} style={{ width: `${width}px` }}>
                <input
                  type="text"
                  value={scheduleEssentialWork[colIndex]}
                  onChange={(e) => handlePresetWorkNumberChange(colIndex, e.target.value)}
                />
              </td>
            ))}
          </tr>
        </tbody>
      </table>
      <div style={{ height: "30px" }}></div> {/* 여백 추가 */}
      <table className='table-style'>
        <tr>
          {colWidthHeaderSubjobs.map((width, colIndex) => (
            <th key={colIndex} colSpan={2} style={{ width: `${width}px` }}>
              {headerNamesSubjobs[colIndex]}
            </th>
          ))}
        </tr>
        <tbody>
          <tr>
            {colWidthSubjobs.map((width, colIndex) => (
              <td key={colIndex} style={{ width: `${width}px` }}>
                <select
                  value={selectedSubjob[colIndex]}
                  onChange={(e) => handleSubjobChange(colIndex, e.target.value)}>
                  <option value="">직원 선택</option>
                  {data.map((peoples: Agent) => (
                    <option value ={peoples.name}>{peoples.name}</option>
                  ))}
                </select>
              </td>
            ))}
          </tr>
        </tbody>
      </table>
      <div style={{ height: "30px" }}></div> {/* 여백 추가 */}
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
              {['name', 'job_level', 'description', 'annualleave'].map((field, colIndex) => (
                <td key={colIndex} style={{ width: `${columnWidths[colIndex]}px` }}>
                  {field === "job_level" ? (
                    <select
                      value={row[field as keyof Agent] as string}
                      onChange={(e) => handleInputChange(rowIndex, field as keyof Agent, e.target.value)}
                    >
                      <option value="">직무를 선택하세요</option>
                      <option value="점장">점장</option>
                      <option value="1층 매니저">1층 매니저</option>
                      <option value="2층 매니저">2층 매니저</option>
                      <option value="2층 부점장">2층 부점장</option>
                      <option value="1층 대리">1층 대리</option>
                      <option value="2층 대리">2층 대리</option>
                      <option value="1층 사원">1층 사원</option>
                      <option value="2층 사원">2층 사원</option>
                    </select>
                  ) : field === "description" ? (
                    <DatePicker
                      style={{ width: "250px" }} 
                      onChange={(dates: DateObject[]) => handleDateChange(rowIndex, dates)}
                      onClose={() => handleDatePickerClose(rowIndex)}
                      value={selectedDates[rowIndex]?.date || []}
                      multiple
                      readOnly={!editableColumns[colIndex]}
                      format="MM/DD"
                      calendarPosition="bottom-center"
                      className="black"
                    />
                  ) : field === "annualleave" ? (
                    <DatePicker
                    style={{ width: "250px" }} 
                      onChange={(dates: DateObject[]) => handle_AN_DateChange(rowIndex, dates)}
                      onClose={() => handle_AN_DatePickerClose(rowIndex)}
                      value={selectedAnnualleave[rowIndex]?.date || []}
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
      <div style={{
          display: 'flex',
          marginLeft: '200px',
          marginTop: '10px', // 버튼 위쪽에 여백 추가
        }}>
        <button onClick={addRow}> 추가 </button>
      </div>
      <div style={{ height: "40px" }}></div> {/* 여백 추가 */}

      <Modal
        isOpen={isModalOpen}
        onRequestClose={handleCancel} // 모달 외부 클릭 시 닫기
        contentLabel="Action Confirmation"
        style={{
          overlay: {
            backgroundColor: 'rgba(255, 255, 255, 0.8)', // 흰색 반투명 배경
            zIndex: 1000, // 다른 콘텐츠 위로 띄우기
          },
          content: {
            backgroundColor: 'white', // 모달 배경 색을 흰색으로 설정
            padding: '20px', // padding을 줄여서 세로 크기 조절
            borderRadius: '10px',
            width: '200px',
            height: '100px', // 모달의 세로 크기 설정
            margin: '0 auto',
            top: '50%', // 화면 중앙에서 50% 위치
            left: '0%', // 화면 중앙에서 50% 위치
            boxShadow: '0 4px 10px rgba(0, 0, 0, 0.2)', // 모달 그림자
          },
        }}
      >
        <h2 style={{ 
          fontSize: '17px',
          textAlign: 'center',
          alignItems: 'center'
         }}>{modalMessage}</h2>
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          // justifyContent: 'space-between', // 버튼 간격을 양쪽으로 조정
          gap: '50px', // 버튼 간의 간격을 10px로 설정
          marginTop: '30px', // 버튼 위쪽에 여백 추가
        }}>
          <button onClick={handleConfirm}>확인</button>
          <button onClick={handleCancel}>취소</button>
        </div>
      </Modal>
    </div>
  );
};

export default Table;