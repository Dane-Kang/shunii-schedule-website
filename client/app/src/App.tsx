import { useEffect, useState } from "react";
import { useAgent } from "./hooks/useAgentinfo";
import "./App.css";
import "./styles.css";

import MyCalendar from "./MyCalendar";
import { EventInput } from "@fullcalendar/core";
import { DateObject } from "react-multi-date-picker"; // DateObject를 임포트
import Table from "./ReactTable";
import { execPath } from "process";

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
    annualLeaveList,
  } = useAgent();

  const [agentData, setAgentData] = useState<Agentinfo[]>([]);
  const [leaveSchedule, setLeaveSchedule] = useState<EventInput[]>([]);
  const [leaveCount, setLeaveCount] = useState<{ [key: string]: number }>({});

  useEffect(() => {
    if (agentList) {
      setAgentData(agentList);
    }
  }, [agentList]);

  const generateLeaveSchedule = () => {
    if (!agentData || agentData.length === 0 || !scheduleEssentialWork || scheduleEssentialWork.length < 5) return;

    const daysInMonth = 28; // 달의 총 일수 (현재 31일 기준으로 설정)
    const maxLeavesPerEmployee = scheduleEssentialWork[0]; // 직원당 최대 휴무 일수
    const minDailyEmployees = scheduleEssentialWork[1]; // 하루 최소 근무 인원
    const minManagers = scheduleEssentialWork[2]; // 하루 최소 매니저 이상 근무 인원
    const minFirstFloor = scheduleEssentialWork[3]; // 하루 최소 1층 근무 직원
    const minSecondFloor = scheduleEssentialWork[4]; // 하루 최소 2층 근무 직원
    const minWorkGap = 3; // 최소 연속 근무 일수 (휴무 후 최소 3일 이상 근무하도록 설정)

    const result: EventInput[] = [];

    const employeeSchedule: { [key: string]: string[] } = {}; // 직원별 휴무 일정 저장
    const leaveCounter: { [key: string]: number } = {}; // 직원별 현재까지의 휴무 횟수 저장
    const lastLeaveDay: { [key: string]: number } = {};  // 직원별 마지막 휴무일 추적 (연속 근무 조건 확인용)
    
    agentData.forEach((employee) => {
      employeeSchedule[employee.name] = [];
      leaveCounter[employee.name] = 0;
      lastLeaveDay[employee.name] = -minWorkGap; // 초기값 설정 (최소 근무 일수 보장)
    });

    // 1. leaveList에 있는 사전 설정된 휴무를 먼저 반영
    const allLeaves: { name: string; date: string; day: number }[] = [];
    leaveList.forEach(({ title, start }: EventInput) => {
      if (title && start && employeeSchedule[title]) {
        const date = start.toString();
        const day = parseInt(date.split("-")[2]);
        if (!employeeSchedule[title].includes(date)) {
          employeeSchedule[title].push(date);
          leaveCounter[title] += 1;
          allLeaves.push({ name: title, date, day });
        }
      }
    });

    // 1-1. annualLeaveList에 있는 연차 휴무 반영
    annualLeaveList.forEach(({ title, start }: EventInput) => {
      if (title && start && employeeSchedule[title]) {
        const date = start.toString();
        const day = parseInt(date.split("-")[2]);
        if (!employeeSchedule[title].includes(date)) {
          employeeSchedule[title].push(date);
          allLeaves.push({ name: title, date, day });
        }
      }
    });

    // 2. 랜덤 휴무 추가 (근무 간격 및 조건 고려)
    for (let day = 1; day <= daysInMonth; day++) {
      const date = `2025-02-${day.toString().padStart(2, "0")}`;
      console.log('date : ',date);
      
      // 전체 휴무일이 있는 경우 스킵
      if (scheduleDate && scheduleDate.some((d: DateObject) => d.toDate().toISOString().split("T")[0] === date)) {
        continue;
      }

      // 모든 날의 사전 설정된 휴무가 있으면 lastLeaveDay 반영
      agentData.forEach((employee) => {
        employeeSchedule[employee.name].forEach((tmp_date) => {
          if(day === parseInt(tmp_date.split("-")[2])){
            lastLeaveDay[employee.name] = day;
            console.log('lastLeaveDay name : ',employee.name);
          }
        });
      });
      
      // 휴무 후보군 선정 (최대 휴무 초과 X, 최소 연속 근무 충족 O, 이미 사전 설정된 휴무 직원 제외)
      let remainingEmployees = agentData.filter(emp =>
        emp.job_level !== "점장" &&
        leaveCounter[emp.name] < maxLeavesPerEmployee &&
        (day - lastLeaveDay[emp.name] > minWorkGap) &&
        !employeeSchedule[emp.name].includes(date) // 이미 사전 설정된 휴무 제외
      );
      console.log('remainingEmployees : ');
      remainingEmployees.forEach(emp => console.log(emp.name));

      let offDutyEmployees: string[] = [];

      // 점장은 사전 설정된 휴무일이 아니면 근무하는 것으로 설정정
      let dailyWorkforce = agentData.filter(emp => 
        (emp.job_level === "점장" && !employeeSchedule[emp.name].includes(date)) || 
        !employeeSchedule[emp.name].includes(date)
      );

      while (offDutyEmployees.length < 5 && remainingEmployees.length > 0) {
        const randomIndex = ((Math.random() * 100000) | 0) % remainingEmployees.length;
        const randomEmployee = remainingEmployees[randomIndex];

        offDutyEmployees.push(randomEmployee.name);

        let tempWorkforce = dailyWorkforce.filter(emp => !offDutyEmployees.includes(emp.name));
        let managers = tempWorkforce.filter(emp => emp.job_level === "점장" || emp.job_level === "1층 매니저" || emp.job_level === "2층 매니저").length;
        let firstFloor = tempWorkforce.filter(emp => emp.job_level === "1층 사원" || emp.job_level === "1층 매니저").length;
        let secondFloor = tempWorkforce.filter(emp => emp.job_level === "2층 사원" || emp.job_level === "2층 매니저").length;
        
        // 필수 근무 조건 체크
        if (
          tempWorkforce.length < minDailyEmployees ||
          managers < minManagers ||
          firstFloor < minFirstFloor ||
          secondFloor < minSecondFloor
        ) {
          console.log('##### condition check failed ', randomEmployee.name);
          console.log('tempWorkforce.length : ',tempWorkforce.length);
          console.log('managers : ',managers, 'firstFloor : ',firstFloor, 'secondFloor : ',secondFloor);
          offDutyEmployees.pop();
          remainingEmployees.splice(randomIndex, 1);
          continue;
        }

        leaveCounter[randomEmployee.name] += 1;
        lastLeaveDay[randomEmployee.name] = day;
        employeeSchedule[randomEmployee.name].push(date);
        allLeaves.push({ name: randomEmployee.name, date, day });
        remainingEmployees.splice(randomIndex, 1);
      }
    }

    agentData.forEach((employee) => {
      console.log('추가 확인 employee.name : ',employee.name, '사용 휴무 ', leaveCounter[employee.name]);
      while (leaveCounter[employee.name] < maxLeavesPerEmployee) {
        if(employee.job_level === "점장") 
          break;
        for (let day = 1; day <= daysInMonth; day++) {
          const date = `2025-02-${day.toString().padStart(2, "0")}`;
          const lowLeaveDays = allLeaves.filter(l => l.day === day).length;
          if (!employeeSchedule[employee.name].includes(date) && lowLeaveDays < 3) {
            if(leaveCounter[employee.name] < maxLeavesPerEmployee) {
              console.log(date,'현재 휴가인원 ', lowLeaveDays, '추가 - ',employee.name);
              employeeSchedule[employee.name].push(date);
              leaveCounter[employee.name] += 1;
              allLeaves.push({ name: employee.name, date, day });
              continue;
            }
          }
        }

        if(leaveCounter[employee.name] < maxLeavesPerEmployee) {
          let count = 0;
          while(count < 100){
            let day = ((Math.random() * 100000) | 0) % daysInMonth;
            if(day === 0) continue;
            const date = `2025-02-${day.toString().padStart(2, "0")}`;
            console.log(date);
            const lowLeaveDays = allLeaves.filter(l => l.day === day).length;
            if (!employeeSchedule[employee.name].includes(date) && lowLeaveDays < 4) {
              if(leaveCounter[employee.name] < maxLeavesPerEmployee) {
                console.log(date,'현재 휴가인원 ', lowLeaveDays, '추가 - ',employee.name);
                employeeSchedule[employee.name].push(date);
                leaveCounter[employee.name] += 1;
                allLeaves.push({ name: employee.name, date, day });
              }
              else
                break;
            }
            count++;
          }
        }
        break;
      }
    });
    console.log('after leaveCounter : ',leaveCounter);

    // 3. 날짜순으로 정렬 후 휴무 카운트 증가
    allLeaves.sort((a, b) => a.day - b.day);
    const tempLeaveCounter: { [key: string]: number } = {};
    allLeaves.forEach(({ name, date }) => {
      if (!tempLeaveCounter[name]) {
        tempLeaveCounter[name] = 0;
      }
      tempLeaveCounter[name] += 1;
      result.push({ title: `${name} (${tempLeaveCounter[name]}일)`, start: date });
    });

    console.log('After tempLeaveCounter : ',tempLeaveCounter);

    setLeaveSchedule(result);
    setLeaveCount(tempLeaveCounter);
  };

  const genSch = () => {
    generateLeaveSchedule();
  };

  return (
    <div className="App">
      <MyCalendar events={leaveSchedule} />
      <div style={{ height: "10px" }}></div>
      <div style={{ display: 'flex', marginLeft: '400px', marginTop: '10px' }}>
        <button onClick={genSch}> Generate </button>
      </div>
      <div style={{ height: "10px" }}></div>
      <Table />
    </div>
  );
}

export default App;
