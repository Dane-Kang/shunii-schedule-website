import { useEffect, useState } from "react";
import {useAgent} from "./hooks/useAgentinfo";
import "./App.css";
import './styles.css';

import MyCalendar from './MyCalendar';
import { EventInput } from '@fullcalendar/core';
import { DateObject } from 'react-multi-date-picker'; // DateObject를 임포트
import Table from './ReactTable';

export interface Agentinfo {
  name: string;
  job_level: string;
}

function App() {
  const {
    agentList,
    selectedDates,
    scheduleEssentialWork,
    scheduleDate,
    leaveList,
  } = useAgent();

  const [agentData, setAgentData] = useState<Agentinfo[]>([]); // Agent[] 타입으로 초기화
  const [workSchedule, setWorkSchedule] = useState<EventInput[]>([]);

  useEffect(() => {
    if(leaveList){
      console.log('Get leaveList :', leaveList);
    }
    // leavelist data example 
    // 0: {title: '미래', start: '2025-01-07'}
    // 1: {title: '미래', start: '2025-01-21'}
    if(agentList){
      setAgentData(agentList);
      console.log('agentData ', agentData);
    }
  }, [leaveList, agentList]); // leaveList 변경될 때마다 실행

  const generateWorkSchedule = () => {
    if (!agentData || agentData.length === 0) return;

    const totalEmployees = agentData.length;
    console.log('totalEmployees',totalEmployees);
    const daysInMonth = 31; // Assume 31 days in the current month

    const result: EventInput[] = [];

    // Create a map for employee-specific schedules
    const employeeSchedule: { [key: string]: string[] } = {};

    // Initialize employee schedules
    agentData.forEach((employee) => {
      employeeSchedule[employee.name] = [];
    });

    // Parse leaveList for preferred holidays
    leaveList.forEach(({ title, start }: EventInput) => {
      if (title && start && employeeSchedule[title]) {
        employeeSchedule[title].push(start.toString());
      }
    });
    
    // Helper to check if a specific role requirement is met
    const checkRoleRequirement = (daySchedule: string[]) => {
      const roles = agentData.filter((emp) => daySchedule.includes(emp.name)).map((emp) => emp.job_level);
      const managerOrAbove = roles.filter((role) => role === "점장" || role === "매니저").length;
      const firstFloor = roles.filter((role) => role === "1층 사원").length;
      const secondFloor = roles.filter((role) => role === "2층 사원").length;

      return managerOrAbove >= 1 && firstFloor >= 4 && secondFloor >= 3;
    };
    console.log('4');
    
    // Generate work schedule for each day
    for (let day = 1; day <= daysInMonth; day++) {
      const date = `2025-01-${day.toString().padStart(2, "0")}`;
      console.log(date);

      // Skip if it's a scheduled holiday
      if (scheduleDate.some((d: DateObject) => d.toDate().toISOString().split("T")[0] === date)) {
        continue;
      }

      let daySchedule: string[] = [];

      console.log('51');
      // Fill daySchedule with employees
      // // 문제가 있음. 여기서 checkRoleRequirement()이 계속 false면 무한루프 돔.
      while (daySchedule.length < 7 || !checkRoleRequirement(daySchedule)) {
        const randomEmployee = agentData[Math.floor(Math.random() * totalEmployees)];
        // Skip if the employee is already scheduled or it's their holiday
        if (
          daySchedule.includes(randomEmployee.name) ||
          employeeSchedule[randomEmployee.name].includes(date)
        ) {
          continue;
        }
        daySchedule.push(randomEmployee.name);
        console.log(daySchedule);
      }
      console.log('52');
      // // Add the schedule for this day
      // daySchedule.forEach((employee) => {
      //   result.push({ title: `${employee} (근무)`, start: date });
      // });

      // Calculate off-duty employees
      const offDutyEmployees = agentData
        .map((emp) => emp.name)
        .filter((name) => !daySchedule.includes(name));

      // Add off-duty employees to the result
      offDutyEmployees.forEach((employee) => {
        result.push({ title: `${employee} (휴무)`, start: date });
      });
    }
    console.log('6');
    
    // Assign remaining random holidays to employees
    agentData.forEach((employee) => {
      const scheduledDays = result
        .filter((entry) => entry.title && entry.title.includes(employee.name) && entry.title.includes("(근무)"))
        .map((entry) => entry.start);

      const holidays = scheduleDate ? scheduleDate.map((d: DateObject) => d.toDate().toISOString().split("T")[0]) : [];

      let remainingHolidays = 8 - employeeSchedule[employee.name].length;
      console.log('7');
      while (remainingHolidays > 0) {
        const randomDay = `2025-01-${Math.floor(Math.random() * daysInMonth + 1).toString().padStart(2, "0")}`;

        if (
          !scheduledDays.includes(randomDay) &&
          !employeeSchedule[employee.name].includes(randomDay) &&
          !holidays.includes(randomDay)
        ) {
          employeeSchedule[employee.name].push(randomDay);
          remainingHolidays--;
        }
      }
      console.log('8');
    });

    setWorkSchedule(result);
  };
  //
  const genSch = () => {
    generateWorkSchedule();
  };
  
  return (
    <div className="App">
      <MyCalendar events={leaveList} />
      <div style={{ height: "10px" }}></div> {/* 여백 추가 */}
      <div style={{
          display: 'flex',
          marginLeft: '400px',
          marginTop: '10px', // 버튼 위쪽에 여백 추가
        }}>
        <button onClick={genSch}> Generate </button>
      </div>
      <div style={{ height: "10px" }}></div> {/* 여백 추가 */}
      <Table />
      {}
    </div>
  );
}

export default App;