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
    selectedSubjob,
    leaveList,
    annualLeaveList,
  } = useAgent();

  const [agentData, setAgentData] = useState<Agentinfo[]>([]);
  const [leaveSchedule, setLeaveSchedule] = useState<EventInput[]>([]);
  const [leaveCount, setLeaveCount] = useState<{ [key: string]: number }>({});

  const jobLevelColors: { [key: string]: string } = {
    "점장": "#b6003b",  // 짙은 빨강
    "1층 매니저": "#010f96",  // 짙은 파랑
    "2층 매니저": "#010f96",  // 짙은 파랑
    "2층 부점장": "#9f00a2",  // 연보라
    "1층 대리": "#e65802",  // 주황
    "2층 대리": "#e65802",  // 주황
    "1층 사원": "#3a9401",  // 녹색
    "2층 사원": "#3a9401",  // 녹색
  };

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
    const minSubjobEmployee = 1;
    const minWorkGap = 3; // 최소 연속 근무 일수 (휴무 후 최소 3일 이상 근무하도록 설정)

    const result: EventInput[] = [];

    const employeeleaveSchedule: { [key: string]: string[] } = {}; // 직원별 휴무 일정 저장
    const leaveCounter: { [key: string]: number } = {}; // 직원별 현재까지의 휴무 횟수 저장
    const lastLeaveDay: { [key: string]: number } = {};  // 직원별 마지막 휴무일 추적 (연속 근무 조건 확인용)
    
    const randomBuffer = new Uint32Array(1);

    agentData.forEach((employee) => {
      employeeleaveSchedule[employee.name] = [];
      leaveCounter[employee.name] = 0;
      lastLeaveDay[employee.name] = -minWorkGap; // 초기값 설정 (최소 근무 일수 보장)
    });

    // 1. leaveList에 있는 사전 설정된 휴무를 먼저 반영
    const allLeaves: { name: string; date: string; day: number }[] = [];

    leaveList.forEach(({ title, start }: EventInput) => {
      if (title && start && employeeleaveSchedule[title]) {
        const date = start.toString();
        const day = parseInt(date.split("-")[2]);
        if (!employeeleaveSchedule[title].includes(date)) {
          employeeleaveSchedule[title].push(date);
          leaveCounter[title] += 1;
          allLeaves.push({ name: title, date, day });
        }
      }
    });

    // 1-1. annualLeaveList에 있는 연차 휴무 반영
    annualLeaveList.forEach(({ title, start }: EventInput) => {
      if (title && start && employeeleaveSchedule[title]) {
        const date = start.toString();
        const day = parseInt(date.split("-")[2]);
        if (!employeeleaveSchedule[title].includes(date)) {
          employeeleaveSchedule[title].push(date);
          allLeaves.push({ name: title, date, day });
        }
      }
    });

    let offDutyEmployees: { [key: string]: string[] } = {}; // 날짜별 휴무하는 사람 저장

    // 필수 근무 조건 확인 함수 생성
    const checkconditiontoleave = (date: string, dailyWorkforce: Agentinfo[], name: string) => {
      let tempWorkforce = dailyWorkforce.filter(emp => !offDutyEmployees[date].includes(emp.name));

      let mainAdmin = tempWorkforce.filter(emp => emp.job_level === "점장" || emp.job_level === "2층 부점장").length;
      let managers = tempWorkforce.filter(emp => emp.job_level === "점장" || emp.job_level === "1층 매니저" || emp.job_level === "2층 매니저" || emp.job_level === "2층 부점장").length;
      let firstFloor = tempWorkforce.filter(emp => emp.job_level === "1층 사원" || emp.job_level === "1층 대리" || emp.job_level === "1층 매니저").length;
      let secondFloor = tempWorkforce.filter(emp => emp.job_level === "2층 사원" || emp.job_level === "2층 대리" || emp.job_level === "2층 매니저" || emp.job_level === "2층 부점장").length;
      let subjobpart1 = tempWorkforce.filter(emp => emp.name === selectedSubjob[0] || emp.name === selectedSubjob[1]).length;
      let subjobpart2 = tempWorkforce.filter(emp => emp.name === selectedSubjob[2] || emp.name === selectedSubjob[3]).length;
      let firstflooradmin = tempWorkforce.filter(emp => emp.job_level === "1층 대리" || emp.job_level === "1층 매니저").length;
      let secondflooradmin = tempWorkforce.filter(emp => emp.job_level === "2층 대리" || emp.job_level === "2층 매니저" || emp.job_level === "2층 부점장").length;
      if (
        tempWorkforce.length < minDailyEmployees ||
        managers < minManagers ||
        firstFloor < minFirstFloor ||
        secondFloor < minSecondFloor ||
        subjobpart1 < minSubjobEmployee ||
        subjobpart2 < minSubjobEmployee ||
        firstflooradmin < 1 ||
        secondflooradmin < 1 ||
        mainAdmin < 1
      ) {
        console.log('##### condition check failed ', name);
        console.log('managers : ',managers, 'firstFloor : ',firstFloor, 'secondFloor : ',secondFloor);
        console.log('subjobpart1 : ',subjobpart1, 'subjobpart2 : ',subjobpart2, 'firstflooradmin : ',firstflooradmin, 'secondflooradmin : ',secondflooradmin);
        return false;
      }
      return true;
    }

    // 2. 날짜별로 랜덤 휴무 추가 (근무 간격 및 조건 고려)
    for (let day = 1; day <= daysInMonth; day++) {
      const date = `2025-02-${day.toString().padStart(2, "0")}`;
      console.log('date : ',date);
      
      // 전체 휴무일이 있는 경우 스킵
      if (scheduleDate && scheduleDate.some((d: DateObject) => d.toDate().toISOString().split("T")[0] === date)) {
        continue;
      }

      // 해당 날의 사전 설정된 휴무가 있으면 lastLeaveDay 반영
      agentData.forEach((employee) => {
        employeeleaveSchedule[employee.name].forEach((tmp_date) => {
          if(day === parseInt(tmp_date.split("-")[2])){
            lastLeaveDay[employee.name] = day;
            console.log('lastLeaveDay name : ',employee.name);
          }
        });
      });
      
      // 휴무 후보군 선정 (최대 휴무 초과 X, 최소 연속 근무 충족 O, 이미 사전 설정된 휴무 직원 제외)
      let remainingEmployees = agentData.filter(emp =>
        leaveCounter[emp.name] < maxLeavesPerEmployee &&
        (day - lastLeaveDay[emp.name] > minWorkGap) &&
        !employeeleaveSchedule[emp.name].includes(date) // 이미 사전 설정된 휴무 제외
      );
      console.log('remainingEmployees : ');
      remainingEmployees.forEach(emp => console.log(emp.name));


      // 근무할 수 있는 인원 설정
      // 사전 근무 신청한 인원들 employeeleaveSchedule을 제외하고 우선 다 근무가능한 인원으로 다 집어 넣음.
      // 이후 while()돌면서 랜덤으로 한명씩 휴무를 설정하고 그 인원을 dailyWorkforce에서 제외.
      let dailyWorkforce = agentData.filter(emp => 
        !employeeleaveSchedule[emp.name].includes(date)
      );

      offDutyEmployees[date] = [];  // 휴무 직원 값 초기화 

      while (offDutyEmployees[date].length < 5 && remainingEmployees.length > 0) {
        window.crypto.getRandomValues(randomBuffer);
        const randomIndex = randomBuffer[0] % remainingEmployees.length;
        //const randomIndex = ((Math.random() * 100000) | 0) % remainingEmployees.length;
        console.log('randomIndex : ', randomIndex);
        const randomEmployee = remainingEmployees[randomIndex];

        offDutyEmployees[date].push(randomEmployee.name);
        if(lastLeaveDay[randomEmployee.name] > minWorkGap+1){ } // 4일 연속 근무한 사람한테는 .... 무조건 제외 ? 
        if(checkconditiontoleave(date, dailyWorkforce, randomEmployee.name) === false){
          offDutyEmployees[date].pop();
          remainingEmployees.splice(randomIndex, 1);
          continue;
        }

        leaveCounter[randomEmployee.name] += 1;
        lastLeaveDay[randomEmployee.name] = day;
        employeeleaveSchedule[randomEmployee.name].push(date);
        allLeaves.push({ name: randomEmployee.name, date, day });
        remainingEmployees.splice(randomIndex, 1);
        console.log('휴무에 추가 : ',randomEmployee.name);
      }
    }

    // 한바퀴 다 돌고 각 인원당 남아있는 휴무를 랜덤 선택 해서 사용
    agentData.forEach((employee) => {
      console.log('추가 확인 employee.name : ',employee.name, '사용 휴무 ', leaveCounter[employee.name]);
      while (leaveCounter[employee.name] < maxLeavesPerEmployee) {
        let count  = 0;
        while(count < 100){
          count++;
          window.crypto.getRandomValues(randomBuffer);
          let day = randomBuffer[0] % daysInMonth;
          //let day = ((Math.random() * 100000) | 0) % daysInMonth;
          if(day === 0) continue;
          const date = `2025-02-${day.toString().padStart(2, "0")}`;
          //console.log(date);
          const lowLeaveDays = allLeaves.filter(l => l.day === day).length;  //해당 날짜에 휴무로 설정된 인원 수 
          if (!employeeleaveSchedule[employee.name].includes(date) && lowLeaveDays < 3) {  //해당 날짜의 휴무인원이 3명 이하인 경우 추가
            if(leaveCounter[employee.name] < maxLeavesPerEmployee) {
              employeeleaveSchedule[employee.name].push(date);
              let dailyWorkforce = agentData.filter(emp => !employeeleaveSchedule[emp.name].includes(date));
              if(checkconditiontoleave(date, dailyWorkforce, employee.name) === true){
                console.log(date,'현재 휴가인원 ', lowLeaveDays, '추가 - ',employee.name);
                leaveCounter[employee.name] += 1;
                allLeaves.push({ name: employee.name, date, day });
              }
              else{
                employeeleaveSchedule[employee.name].pop();
              }
            }
            else
              break;
          }
        }

        if(leaveCounter[employee.name] < maxLeavesPerEmployee) {
          let count = 0;
          while(count < 100){
            window.crypto.getRandomValues(randomBuffer);
            let day = randomBuffer[0] % daysInMonth;
            if(day === 0) continue;
            const date = `2025-02-${day.toString().padStart(2, "0")}`;
            const lowLeaveDays = allLeaves.filter(l => l.day === day).length;
            if (!employeeleaveSchedule[employee.name].includes(date) && lowLeaveDays < 4) {
              if(leaveCounter[employee.name] < maxLeavesPerEmployee) {
                console.log(date);
                employeeleaveSchedule[employee.name].push(date);
                let dailyWorkforce = agentData.filter(emp => !employeeleaveSchedule[emp.name].includes(date));
                if(checkconditiontoleave(date, dailyWorkforce, employee.name) === true){
                  console.log(date,'현재 휴가인원 ', lowLeaveDays, '추가 - ',employee.name);
                  leaveCounter[employee.name] += 1;
                  allLeaves.push({ name: employee.name, date, day });
                }
                else{
                  employeeleaveSchedule[employee.name].pop();
                }
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
    console.log('after employeeleaveSchedule : ',employeeleaveSchedule);

    // 3. 날짜순으로 정렬 후 휴무 카운트 증가
    allLeaves.sort((a, b) => a.day - b.day);
    const tempLeaveCounter: { [key: string]: number } = {};
    allLeaves.forEach(({ name, date }) => {
      if (!tempLeaveCounter[name]) {
        tempLeaveCounter[name] = 0;
      }
      tempLeaveCounter[name] += 1;
      let agent: string = agentData.find(emp => emp.name === name)?.job_level || "";
      result.push({ title: `${name} (${tempLeaveCounter[name]}일)`, start: date ,color: jobLevelColors[agent]});
    });
    console.log('Result allLeaves : ',allLeaves);
    console.log('Result tempLeaveCounter : ',tempLeaveCounter);
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
