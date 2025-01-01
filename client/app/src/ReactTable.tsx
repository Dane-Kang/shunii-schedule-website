import React, { useEffect, useState } from 'react';
import Modal from 'react-modal';
import useAgent from "./hooks/useAgentinfo";
import DatePicker from 'react-multi-date-picker';
import "react-multi-date-picker/styles/layouts/mobile.css";
import "react-multi-date-picker/styles/colors/green.css";
import { DateObject } from 'react-multi-date-picker'; // DateObject를 임포트
import './styles.css';
import Day from 'react-datepicker/dist/day';

export interface Agent {
  id: string;
  name: string;
  job_level: string;
  description: string;
  isNew?: boolean; // 추가된 행 여부를 나타내는 필드
  ischecked?: boolean;
}

Modal.setAppElement('#root');

const Table: React.FC = () => {
  const {
    agentList,
    rows,
    selectedDates,
    handleCreateAgent,
    handleUpdateAgent,
    handleDeleteAgent,
    setSelectedDates,
    setSelectedDateList,
  } = useAgent();

  const [data, setData] = useState<Agent[]>([]); // Agent[] 타입으로 초기화
  const [isModalOpen, setIsModalOpen] = useState(false); // 모달 열기/닫기 상태
  const [modalMessage, setModalMessage] = useState(""); // 모달에 표시할 메시지
  const [confirmAction, setConfirmAction] = useState<(() => void) | null>(null); // 확인 버튼에서 실행할 함수 저장

  // 수동으로 열 너비 설정
  const columnWidths = [60, 160, 300];
  // Header 이름 설정
  const headerNames = ['이름','직무 등급','원하는 휴일'];
  // 수동으로 열 수정 가능 여부 설정
  const editableColumns = [true, true, true, true];


  // agentList를 기반으로 데이터 설정
  useEffect(() => {
    if (agentList) {
      console.log(agentList);
      setData(agentList);
    }
  }, [agentList]);

  // 새로운 행 추가 함수
  const addRow = () => {
    const newRow: Agent = { id: '', name: '', job_level: '', description: ''}; // 기본값을 가진 새 행
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
          openModal("레알로 업데이트 하실??", () => {
            row.description = data[rowIndex].description;
            handleUpdateAgent(row.id, row.name, row.job_level, row.description); // 확인 후 업데이트
          });
          console.log("Update Existing Agent");
        }
        else {
          openModal("레알로 새거 만드실??", () => {
            row.description = data[rowIndex].description;
            handleCreateAgent(row.name, row.job_level, row.description); // 확인 후 업데이트
          });
          console.log("Save New Agent");
        }
      }
      else{
        openModal("지우실??", () => {
          handleDeleteAgent(row.id, row.name, row.job_level, row.description); // 확인 후 업데이트
        });
        console.log("Delete Agent");
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