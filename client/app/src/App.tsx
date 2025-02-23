import { useEffect, useState } from "react";
import { useAgent } from "./hooks/useAgentinfo";
import "./App.css";
import "./styles.css";

import MyCalendar from "./MyCalendar";
import { EventInput } from "@fullcalendar/core";
import { DateObject } from "react-multi-date-picker"; // DateObject를 임포트
import Table from "./ReactTable";

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
    selectedSubjob1,
    selectedSubjob2,
    leaveList,
    annualLeaveList,
    holiday,
    alternativeholiday,
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

    const daysInMonth = 31; // 달의 총 일수 (현재 31일 기준으로 설정)
    const maxLeavesPerEmployee = scheduleEssentialWork[0]; // 직원당 최대 휴무 일수
    const minDailyEmployees = scheduleEssentialWork[1]; // 하루 최소 근무 인원
    const avgDailyEmployees: number = Math.floor(agentList.length - (scheduleEssentialWork[0] * agentList.length / daysInMonth)) +1; // 하루 평균 근무 인원
    const minManagers = scheduleEssentialWork[2]; // 하루 최소 매니저 이상 근무 인원
    const minFirstFloor = scheduleEssentialWork[3]; // 하루 최소 1층 근무 직원
    const minSecondFloor = scheduleEssentialWork[4]; // 하루 최소 2층 근무 직원
    const minSubjobEmployee = 1;
    const minWorkGap = 3; // 최소 연속 근무 일수 (휴무 후 최소 3일 이상 근무하도록 설정)
    const maxWorkGap = 5; // 최대 연속 근무 일수 (휴무 후 최소 5일 이상 근무하도록 설정)

    const offday:number[] = [];  // 전체 휴무 날 설정
    const alteroffday:number[] = [];  // 대체 휴무 날 설정
    
    const result: EventInput[] = [];

    const employeeleaveSchedule: { [key: string]: string[] } = {}; // 직원별 휴무 일정 저장
    const leaveCounter: { [key: string]: number } = {}; // 직원별 현재까지의 휴무 횟수 저장
    const lastLeaveDay: { [key: string]: number } = {};  // 직원별 마지막 휴무일 추적 (연속 근무 조건 확인용)
    
    const randomBuffer = new Uint32Array(1);


    holiday.forEach((day: DateObject) => {offday.push(day.toDate().getDate());}); // 전체 휴무 날 설정
    alternativeholiday.forEach((day: DateObject) => {alteroffday.push(day.toDate().getDate());}); // 대체 휴무 날 설정

    agentData.forEach((employee) => {
      employeeleaveSchedule[employee.name] = [];
      leaveCounter[employee.name] = 0;
      lastLeaveDay[employee.name] = -minWorkGap; // 초기값 설정 (최소 근무 일수 보장)
    });

    //#################### 1. leaveList에 있는 사전 설정된 휴무를 먼저 반영
    const allLeaves: { name: string; date: string; day: number }[] = [];

    leaveList.forEach(({ title, start }: EventInput) => {
      if (title && start && employeeleaveSchedule[title]) {
        const date = start.toString();
        // 잘못된 것이 들어있으면 무시
        if(!date.includes("NaN")){
          const day = parseInt(date.split("-")[2]);
          if (!employeeleaveSchedule[title].includes(date)) {
            employeeleaveSchedule[title].push(date);
            leaveCounter[title] += 1;
            allLeaves.push({ name: title, date, day });
          }
        }
      }
    });

    //#################### 1-1. annualLeaveList에 있는 연차 휴무 반영
    annualLeaveList.forEach(({ title, start }: EventInput) => {
      if (title && start && employeeleaveSchedule[title]) {
        const date = start.toString();
        // 잘못된 것이 들어있으면 무시
        if(!date.includes("NaN")){
          const day = parseInt(date.split("-")[2]);
          if (!employeeleaveSchedule[title].includes(date)) {
            employeeleaveSchedule[title].push(date);
            allLeaves.push({ name: title, date, day });
          }
        }
      }
    });

    let offDutyEmployees: { [key: string]: string[] } = {}; // 날짜별 휴무하는 사람 저장

    // 필수 근무 조건 확인 함수 생성
    const checkconditiontoleave = (date: string, dailyWorkforce: Agentinfo[], member: Agentinfo, checkworkingday: boolean, limitWorkingMember: number) => {
      let result = true;

      let tempWorkforce = dailyWorkforce.filter(emp => !offDutyEmployees[date].includes(emp.name));

      let mainAdmin = tempWorkforce.filter(emp => emp.job_level === "점장" || emp.job_level === "2층 부점장").length;
      let subAdmin = tempWorkforce.filter(emp => emp.job_level === "2층 부점장" || emp.job_level === "1층 매니저").length;
      let managers = tempWorkforce.filter(emp => emp.job_level === "점장" || emp.job_level === "1층 매니저" || emp.job_level === "2층 매니저" || emp.job_level === "2층 부점장").length;
      let firstFloor = tempWorkforce.filter(emp => emp.job_level === "1층 사원" || emp.job_level === "1층 대리" || emp.job_level === "1층 매니저").length;
      let secondFloor = tempWorkforce.filter(emp => emp.job_level === "2층 사원" || emp.job_level === "2층 대리" || emp.job_level === "2층 매니저" || emp.job_level === "2층 부점장").length;
      let subjobpart1 = tempWorkforce.filter(emp => emp.name === selectedSubjob1[0] || emp.name === selectedSubjob1[1]).length;
      let subjobpart2 = tempWorkforce.filter(emp => emp.name === selectedSubjob2[0] || emp.name === selectedSubjob2[1]).length;
      let firstflooradmin = tempWorkforce.filter(emp => emp.job_level === "1층 대리" || emp.job_level === "1층 매니저").length;
      let secondflooradmin = tempWorkforce.filter(emp => emp.job_level === "2층 대리" || emp.job_level === "2층 매니저" || emp.job_level === "2층 부점장").length;

      if(checkworkingday == false){
        if (
          subAdmin >= 1 && 
          mainAdmin >= 1 && 
          managers >= minManagers && 
          tempWorkforce.length >= limitWorkingMember
        ){
          console.log('최소 조건 만족 휴무 설정',member.name, 'day ',parseInt(date.split("-")[2]));
          result = true;
        }else 
          result = false;
      }
      else if((checkworkingday) && (lastLeaveDay[member.name] > 0) && (parseInt(date.split("-")[2]) - lastLeaveDay[member.name] >= maxWorkGap)){ // 4일 연속 일하는 사람은 최소 조건 만족하면 휴무 설정
        if (
          subAdmin >= 1 && 
          mainAdmin >= 1 && 
          managers >= minManagers && 
          tempWorkforce.length >= limitWorkingMember
        ){
          console.log('연속 근무로 인한 강제 휴무 ',member.name, 'day ',parseInt(date.split("-")[2]), 'lastLeaveDay ',lastLeaveDay[member.name]);
          result = true;
        }else {
          console.log('강제 휴무 실패 ',member.name, 'day ',parseInt(date.split("-")[2]), 'lastLeaveDay ',lastLeaveDay[member.name]);
          console.log('minManagers:', minManagers, ' subAdmin:',subAdmin, ' mainAdmin:',mainAdmin, ' managers:',managers, ' tempWorkforce.length:',tempWorkforce.length);

          result = false;
        }
      }else {
      //{
        if(member.job_level === "점장"){
          if (
            mainAdmin < 1 || 
            tempWorkforce.length < limitWorkingMember || 
            managers < minManagers
          ){result = false;}
        }else if(member.job_level === "2층 부점장"){
          if (
            mainAdmin < 1 || 
            tempWorkforce.length < limitWorkingMember || 
            managers < minManagers || 
            subAdmin < 1 || 
            secondFloor < minSecondFloor || 
            secondflooradmin < 1
          ) {result = false;}
        }else if(member.job_level === "2층 매니저"){
          if (
            tempWorkforce.length < limitWorkingMember || 
            subAdmin < 1 || 
            managers < minManagers || 
            secondFloor < minSecondFloor || 
            secondflooradmin < 1
          ) {result = false;}
        }else if(member.job_level === "1층 매니저"){
          if (
            tempWorkforce.length < limitWorkingMember || 
            subAdmin < 1 || 
            managers < minManagers || 
            firstFloor < minFirstFloor || 
            firstflooradmin < 1
          ) {result = false;}
        }else if(member.job_level === "2층 대리"){
          if (
            tempWorkforce.length < limitWorkingMember || 
            secondFloor < minSecondFloor ||
            secondflooradmin < 1
          ) {result = false;}
        }else if(member.job_level === "1층 대리"){
          if (
            tempWorkforce.length < limitWorkingMember || 
            firstFloor < minFirstFloor ||
            firstflooradmin < 1
          ) {result = false;}
        }else if(member.job_level === "2층 사원"){
          if (
            tempWorkforce.length < limitWorkingMember || 
            secondFloor < minSecondFloor
          ) {result = false;}
        }else if(member.job_level === "1층 사원"){
          if (
            tempWorkforce.length < limitWorkingMember || 
            firstFloor < minFirstFloor
          ) {result = false;}
        }

        // 보조직무 명단에 포함되는 이름에 한해서만 확인하기
        if(selectedSubjob1.includes(member.name)){ 
          if(subjobpart1 < 1)
            result  = false;
        } else if (selectedSubjob2.includes(member.name)){
          if(subjobpart2 < 1)
            result  = false;
        }
      }


      if (result === false) {
        console.log('##### condition check failed ', member.name, member.job_level);
        //console.log('managers:',managers, ' firstFloor:',firstFloor, ' secondFloor:',secondFloor, ' subAdmin:',subAdmin, ' mainAdmin:',mainAdmin);
        //console.log('subjobpart1:',subjobpart1, ' subjobpart2:',subjobpart2, ' firstflooradmin:',firstflooradmin, ' secondflooradmin:',secondflooradmin);
        return false;
      }
      return true;
    }

    //#################### 2. 날짜별로 랜덤 휴무 추가 (근무 간격 및 조건 고려)
    for (let day = 1; day <= daysInMonth; day++) {
      const date = `2025-03-${day.toString().padStart(2, "0")}`;
      console.log('date : ',date);
      
      offDutyEmployees[date] = [];  // 휴무 직원 값 초기화 

      // 전체 휴무일이 있는 경우 스킵
      if (holiday && holiday.some((d: DateObject) => d.toDate().toISOString().split("T")[0] === date)) {
        continue;
      }

      agentData.forEach((employee) => {
        // 직원들 중 해당 날의 사전 설정된 휴무가 있으면 lastLeaveDay 반영
        employeeleaveSchedule[employee.name].forEach((tmp_date) => {
          if(day === parseInt(tmp_date.split("-")[2])){
            lastLeaveDay[employee.name] = day;
            offDutyEmployees[date].push(employee.name);
          }
        });
      });
      
      //#################### 2-1 휴무 후보군 선정 (최대 휴무 초과 X, 최소 연속 근무 충족 O, 이미 사전 설정된 휴무 직원 제외)
      let remainingEmployees = agentData.filter(emp =>
        leaveCounter[emp.name] < maxLeavesPerEmployee &&
        (day - lastLeaveDay[emp.name] >= minWorkGap) &&
        !(allLeaves.some(leave => leave.name === emp.name && leave.day === (day + 1))) && // 다음날에 이미 사전 설정된 휴무가 있으면 제외
        !employeeleaveSchedule[emp.name].includes(date) // 이미 사전 설정된 휴무 제외
      );
      console.log('remainingEmployees : ');
      remainingEmployees.forEach(emp => console.log(emp.name));


      //#################### 2-2 근무할 수 있는 인원 설정
      // 사전 근무 신청한 인원들 employeeleaveSchedule을 제외하고 우선 다 근무가능한 인원으로 다 집어 넣음.
      // 이후 while()돌면서 랜덤으로 한명씩 휴무를 설정하고 그 인원을 dailyWorkforce에서 제외.
      let dailyWorkforce = agentData.filter(emp => 
        !employeeleaveSchedule[emp.name].includes(date)
      );
      
      //#################### 2-3 최대 연속 근무일수가 도달한 사람부터 확인 진행
      remainingEmployees.forEach((emp, index) => {
        if((lastLeaveDay[emp.name] > 0) && (day - lastLeaveDay[emp.name] >= maxWorkGap)){ // 4일 연속 일하는 사람은 최소 조건 만족하면 휴무 설정
          offDutyEmployees[date].push(emp.name);
          //근무 인원을 평균에서 낮춰서 넣기  avgDailyEmployees-1
          if(checkconditiontoleave(date, dailyWorkforce, emp,true, avgDailyEmployees-1) === false){
            offDutyEmployees[date].pop();
          }
          else{
            leaveCounter[emp.name] += 1;
            lastLeaveDay[emp.name] = day;
            employeeleaveSchedule[emp.name].push(date);
            allLeaves.push({ name: emp.name, date, day });
          }
          remainingEmployees.splice(index, 1);
        }
      });

      //#################### 2-4 휴가 가능한 인원들 중 랜덤 픽으로 조건 확인 후 추가
      while (offDutyEmployees[date].length < 5 && remainingEmployees.length > 0) {
        window.crypto.getRandomValues(randomBuffer);
        const randomIndex = randomBuffer[0] % remainingEmployees.length;
        //const randomIndex = ((Math.random() * 100000) | 0) % remainingEmployees.length;
        const randomEmployee = remainingEmployees[randomIndex];

        offDutyEmployees[date].push(randomEmployee.name);

        //let tempWorkforce = dailyWorkforce.filter(emp => !offDutyEmployees[date].includes(emp.name));
        if(checkconditiontoleave(date, dailyWorkforce, randomEmployee, true, avgDailyEmployees) === false){
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

    //#################### 3. 한달 치 다 설정한 후 각 인원당 남아있는 휴무 채우기
    console.log('########################### ');
    console.log('########################### ');
    for(let remainleave = 0; remainleave < agentData.length - avgDailyEmployees; remainleave++){
      //설정되어 있는 휴무인원이 remainleave 만큼 설정되어 있는 날짜 검색 
      console.log('점검 : ',remainleave);
      for(const date in offDutyEmployees){
        if(offDutyEmployees[date].length == remainleave){
          // console.log('추가 휴무 점검 : ',date);
          // console.log('기존 휴무 인원 ');
          // offDutyEmployees[date].forEach(check => console.log(check));
          let day = parseInt(date.split("-")[2]);
          let candidateleave = agentData.filter(emp => !offDutyEmployees[date].includes(emp.name));
          let dailyWorkforce = agentData.filter(emp => !employeeleaveSchedule[emp.name].includes(date));

          //let workingmember = agentData.filter(emp => !employeeleaveSchedule[emp.name].includes(date));
          while (offDutyEmployees[date].length < 5 && candidateleave.length > 0) {
            window.crypto.getRandomValues(randomBuffer);
            const randomIndex = randomBuffer[0] % candidateleave.length;
            const randomEmployee = candidateleave[randomIndex];
  
            if(leaveCounter[randomEmployee.name] < maxLeavesPerEmployee) {
              offDutyEmployees[date].push(randomEmployee.name);
              if(checkconditiontoleave(date, dailyWorkforce, randomEmployee, false, avgDailyEmployees-1) === false){
                offDutyEmployees[date].pop();
              }else {
                leaveCounter[randomEmployee.name] += 1;
                lastLeaveDay[randomEmployee.name] = day;
                employeeleaveSchedule[randomEmployee.name].push(date);
                allLeaves.push({ name: randomEmployee.name, date, day });
                candidateleave.splice(randomIndex, 1);
                console.log('휴무에 추가 : ',randomEmployee.name);
              }
            }
            candidateleave.splice(randomIndex, 1);
          }
        }
      }
    }

    //#################### 4. 대체 휴무가 있으면, 해당 날에 근무한 사람들에 한해 휴무 하루씩 추가
    if(alteroffday){
      alteroffday.forEach(day => {
        const date = `2025-03-${day.toString().padStart(2, "0")}`;
        let dailyWorkforce = agentData.filter(emp => !employeeleaveSchedule[emp.name].includes(date));
        console.log('대체휴무날 근무한 인원', dailyWorkforce);
        dailyWorkforce.forEach(emp => {
          leaveCounter[emp.name] -= 1;
        });
      });
    }

    for(let remainleave = 0; remainleave < agentData.length - avgDailyEmployees; remainleave++){
      //설정되어 있는 휴무인원이 remainleave 만큼 설정되어 있는 날짜 검색 
      console.log('점검 : ',remainleave);
      for(const date in offDutyEmployees){
        if(offDutyEmployees[date].length == remainleave){
          console.log('추가 휴무 점검 : ',date);
          // console.log('기존 휴무 인원 ');
          offDutyEmployees[date].forEach(check => console.log(check));
          let day = parseInt(date.split("-")[2]);
          
          if(alteroffday.includes(day)) //대체 휴무날은 패스
            continue;
          
          let candidateleave = agentData.filter(emp => !offDutyEmployees[date].includes(emp.name));
          let dailyWorkforce = agentData.filter(emp => !employeeleaveSchedule[emp.name].includes(date));

          //let workingmember = agentData.filter(emp => !employeeleaveSchedule[emp.name].includes(date));
          while (offDutyEmployees[date].length < 5 && candidateleave.length > 0) {
            window.crypto.getRandomValues(randomBuffer);
            const randomIndex = randomBuffer[0] % candidateleave.length;
            const randomEmployee = candidateleave[randomIndex];
  
            if(leaveCounter[randomEmployee.name] < maxLeavesPerEmployee) {
              offDutyEmployees[date].push(randomEmployee.name);
              if(checkconditiontoleave(date, dailyWorkforce, randomEmployee, false, avgDailyEmployees-1) === false){
                offDutyEmployees[date].pop();
              }else {
                leaveCounter[randomEmployee.name] += 1;
                lastLeaveDay[randomEmployee.name] = day;
                employeeleaveSchedule[randomEmployee.name].push(date);
                allLeaves.push({ name: randomEmployee.name, date, day });
                candidateleave.splice(randomIndex, 1);
                console.log('휴무에 추가 : ',randomEmployee.name);
              }
            }
            candidateleave.splice(randomIndex, 1);
          }
        }
      }
    }

    //#################### 5. 최종으로 휴무가 남은 사람들은 랜덤 날짜에 조건 확인 후 설정.
    agentData.forEach((employee) => {
      console.log('추가 확인 employee.name : ',employee.name, '사용 휴무 ', leaveCounter[employee.name]);
      while (leaveCounter[employee.name] < maxLeavesPerEmployee) {
        let count  = 0;
        while(count < 100){
          count++;
          window.crypto.getRandomValues(randomBuffer);
          let day = randomBuffer[0] % daysInMonth;
          if(day === 0) continue;
          if(alteroffday.includes(day)) //대체 휴무날은 패스
            continue;
          const date = `2025-03-${day.toString().padStart(2, "0")}`;
          if (!employeeleaveSchedule[employee.name].includes(date)) {  //해당 날짜에 이미 휴무로 되어 있는지 확인인
            if(leaveCounter[employee.name] < maxLeavesPerEmployee) {
              employeeleaveSchedule[employee.name].push(date);
              let dailyWorkforce = agentData.filter(emp => !employeeleaveSchedule[emp.name].includes(date));
              console.log(date);
              if(checkconditiontoleave(date, dailyWorkforce, employee,false, minDailyEmployees) === true){
                console.log(date, '휴무 추가 - ',employee.name);
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
        break;
    }});

    //#################### 6. 날짜순으로 정렬 후 휴무 카운트 증가
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
