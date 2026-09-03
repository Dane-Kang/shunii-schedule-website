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
    currentMonth,
    confirmSchedule,
  } = useAgent();

  const [agentData, setAgentData] = useState<Agentinfo[]>([]);
  const [leaveSchedule, setLeaveSchedule] = useState<EventInput[]>([]);
  const [leaveCount, setLeaveCount] = useState<{ [key: string]: number }>({});
  // 확정 저장을 위해 마지막으로 생성된 휴무(가공 전 원본)를 보관
  const [generatedLeaves, setGeneratedLeaves] = useState<{ name: string; date: string }[]>([]);
  const [isConfirming, setIsConfirming] = useState(false);

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

  useEffect(() => {
    if (currentMonth) {
      console.log("currentMonth ", currentMonth);
    }
  }, [currentMonth]);

  // 한 번 생성한 결과(스케줄 상태 묶음)
  type AttemptState = {
    employeeleaveSchedule: { [key: string]: string[] };
    leaveCounter: { [key: string]: number };
    lastLeaveDay: { [key: string]: number };
    offDutyEmployees: { [key: string]: string[] };
    allLeaves: { name: string; date: string; day: number }[];
  };

  const generateLeaveSchedule = () => {
    if (!agentData || agentData.length === 0 || !scheduleEssentialWork || scheduleEssentialWork.length < 5) return;

    const DEBUG = false;
    const log = (...args: unknown[]) => { if (DEBUG) console.log(...args); };

    //#################### 0. 대상 연/월 및 일수 (currentMonth 기준으로 동기 계산)
    const now = new Date();
    const ym = currentMonth && /^\d{4}-\d{2}$/.test(currentMonth)
      ? currentMonth
      : `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, "0")}`;
    const [targetYear, targetMonth] = ym.split("-").map(Number); // targetMonth: 1~12
    const daysInMonth = new Date(targetYear, targetMonth, 0).getDate(); // 해당 월의 마지막 날
    const pad2 = (n: number) => n.toString().padStart(2, "0");
    const dateOf = (day: number) => `${targetYear}-${pad2(targetMonth)}-${pad2(day)}`;

    //#################### 0-1. 필수 근무 조건
    const maxLeavesPerEmployee = scheduleEssentialWork[0]; // 직원당 최대(의무) 휴무 일수
    const minDailyEmployees = scheduleEssentialWork[1];    // 하루 최소 근무 인원
    const avgDailyEmployees: number =
      Math.floor(agentData.length - (maxLeavesPerEmployee * agentData.length) / daysInMonth) + 1; // 하루 평균 근무 인원
    const minManagers = scheduleEssentialWork[2];    // 하루 최소 매니저 이상 근무 인원
    const minFirstFloor = scheduleEssentialWork[3];  // 하루 최소 1층 근무 직원
    const minSecondFloor = scheduleEssentialWork[4]; // 하루 최소 2층 근무 직원
    const minWorkGap = 3; // 휴무 후 최소 연속 근무 일수
    const maxWorkGap = 5; // 이 일수 이상 연속 근무하면 강제 휴무 후보
    // 하루에 쉬어야 하는 목표 인원 (인원수에 따라 가변)
    const dailyLeaveTarget = Math.max(1, agentData.length - avgDailyEmployees);

    //#################### 0-2. 전체 휴무 / 대체 휴무 (대상 월의 '일' 숫자만)
    const offday: number[] = [];
    const alteroffday: number[] = [];
    holiday.forEach((d: DateObject) => {
      const jd = d.toDate();
      if (jd.getFullYear() === targetYear && jd.getMonth() + 1 === targetMonth) offday.push(jd.getDate());
    });
    alternativeholiday.forEach((d: DateObject) => {
      const jd = d.toDate();
      if (jd.getFullYear() === targetYear && jd.getMonth() + 1 === targetMonth) alteroffday.push(jd.getDate());
    });

    //#################### 0-3. 직급 판별 헬퍼
    const isMainAdmin = (e: Agentinfo) => e.job_level === "점장" || e.job_level === "2층 부점장";
    const isSubAdmin = (e: Agentinfo) => e.job_level === "2층 부점장" || e.job_level === "1층 매니저";
    const isManager = (e: Agentinfo) =>
      e.job_level === "점장" || e.job_level === "1층 매니저" || e.job_level === "2층 매니저" || e.job_level === "2층 부점장";
    const isFirstFloor = (e: Agentinfo) =>
      e.job_level === "1층 사원" || e.job_level === "1층 대리" || e.job_level === "1층 매니저";
    const isSecondFloor = (e: Agentinfo) =>
      e.job_level === "2층 사원" || e.job_level === "2층 대리" || e.job_level === "2층 매니저" || e.job_level === "2층 부점장";
    const isFirstFloorAdmin = (e: Agentinfo) => e.job_level === "1층 대리" || e.job_level === "1층 매니저";
    const isSecondFloorAdmin = (e: Agentinfo) =>
      e.job_level === "2층 대리" || e.job_level === "2층 매니저" || e.job_level === "2층 부점장";

    //#################### 1. 사전 확정 휴무 (결정적: 모든 시도에서 동일)
    //  - leaveList        : 직원 신청 휴무   → 의무 휴무 카운트에 포함
    //  - annualLeaveList  : 연차             → 의무 휴무 카운트에서 제외
    const baseLeaveSchedule: { [key: string]: string[] } = {};
    const baseLeaveCounter: { [key: string]: number } = {};
    const basePreLeaves: { name: string; date: string; day: number }[] = [];

    agentData.forEach((emp) => {
      baseLeaveSchedule[emp.name] = [];
      baseLeaveCounter[emp.name] = 0;
    });

    const applyPreset = (list: EventInput[], countsTowardQuota: boolean) => {
      list.forEach(({ title, start }: EventInput) => {
        if (!title || !start || !baseLeaveSchedule[title]) return;
        const date = start.toString();
        if (date.includes("NaN")) return;
        const [y, m, d] = date.split("-").map(Number);
        if (y !== targetYear || m !== targetMonth) return; // 대상 월만 반영
        if (baseLeaveSchedule[title].includes(date)) return;
        baseLeaveSchedule[title].push(date);
        if (countsTowardQuota) baseLeaveCounter[title] += 1;
        basePreLeaves.push({ name: title, date, day: d });
      });
    };
    applyPreset(leaveList, true);
    applyPreset(annualLeaveList, false);

    //#################### 2. 한 번의 스케줄 생성 시도 (랜덤 기반)
    const randomBuffer = new Uint32Array(1);
    const randInt = (n: number) => {
      window.crypto.getRandomValues(randomBuffer);
      return randomBuffer[0] % n;
    };

    const runAttempt = (): AttemptState => {
      const employeeleaveSchedule: { [key: string]: string[] } = {};
      const leaveCounter: { [key: string]: number } = {};
      const lastLeaveDay: { [key: string]: number } = {};
      const offDutyEmployees: { [key: string]: string[] } = {};
      const allLeaves = basePreLeaves.map((l) => ({ ...l }));

      agentData.forEach((emp) => {
        employeeleaveSchedule[emp.name] = [...baseLeaveSchedule[emp.name]];
        leaveCounter[emp.name] = baseLeaveCounter[emp.name];
        lastLeaveDay[emp.name] = -minWorkGap;
      });

      // 특정 인원을 그 날 쉬게 해도 매장 운영 조건이 유지되는지 검사
      const checkConditionToLeave = (
        date: string,
        dailyWorkforce: Agentinfo[],
        member: Agentinfo,
        checkworkingday: boolean,
        limitWorkingMember: number
      ): boolean => {
        const day = parseInt(date.split("-")[2]);
        const tempWorkforce = dailyWorkforce.filter((emp) => !offDutyEmployees[date].includes(emp.name));

        const mainAdmin = tempWorkforce.filter(isMainAdmin).length;
        const subAdmin = tempWorkforce.filter(isSubAdmin).length;
        const managers = tempWorkforce.filter(isManager).length;
        const firstFloor = tempWorkforce.filter(isFirstFloor).length;
        const secondFloor = tempWorkforce.filter(isSecondFloor).length;
        const firstFloorAdmin = tempWorkforce.filter(isFirstFloorAdmin).length;
        const secondFloorAdmin = tempWorkforce.filter(isSecondFloorAdmin).length;
        const subjobpart1 = tempWorkforce.filter(
          (emp) => emp.name === selectedSubjob1[0] || emp.name === selectedSubjob1[1]
        ).length;
        const subjobpart2 = tempWorkforce.filter(
          (emp) => emp.name === selectedSubjob2[0] || emp.name === selectedSubjob2[1]
        ).length;

        const meetsBaseline =
          subAdmin >= 1 && mainAdmin >= 1 && managers >= minManagers && tempWorkforce.length >= limitWorkingMember;

        // 1) 최소 운영조건만 확인
        if (!checkworkingday) return meetsBaseline;

        // 2) 연속 근무가 maxWorkGap 이상이면 최소조건만 만족하면 강제 휴무 허용
        if (lastLeaveDay[member.name] > 0 && day - lastLeaveDay[member.name] >= maxWorkGap) {
          return meetsBaseline;
        }

        // 3) 직급별 상세 조건
        let ok = true;
        switch (member.job_level) {
          case "점장":
            if (mainAdmin < 1 || tempWorkforce.length < limitWorkingMember || managers < minManagers) ok = false;
            break;
          case "2층 부점장":
            if (
              mainAdmin < 1 || tempWorkforce.length < limitWorkingMember || managers < minManagers ||
              subAdmin < 1 || secondFloor < minSecondFloor || secondFloorAdmin < 1
            ) ok = false;
            break;
          case "2층 매니저":
            if (
              tempWorkforce.length < limitWorkingMember || subAdmin < 1 || managers < minManagers ||
              secondFloor < minSecondFloor || secondFloorAdmin < 1
            ) ok = false;
            break;
          case "1층 매니저":
            if (
              tempWorkforce.length < limitWorkingMember || subAdmin < 1 || managers < minManagers ||
              firstFloor < minFirstFloor || firstFloorAdmin < 1
            ) ok = false;
            break;
          case "2층 대리":
            if (tempWorkforce.length < limitWorkingMember || secondFloor < minSecondFloor || secondFloorAdmin < 1) ok = false;
            break;
          case "1층 대리":
            if (tempWorkforce.length < limitWorkingMember || firstFloor < minFirstFloor || firstFloorAdmin < 1) ok = false;
            break;
          case "2층 사원":
            if (tempWorkforce.length < limitWorkingMember || secondFloor < minSecondFloor) ok = false;
            break;
          case "1층 사원":
            if (tempWorkforce.length < limitWorkingMember || firstFloor < minFirstFloor) ok = false;
            break;
        }

        // 보조직무 명단에 포함되는 인원만 확인
        if (selectedSubjob1.includes(member.name) && subjobpart1 < 1) ok = false;
        else if (selectedSubjob2.includes(member.name) && subjobpart2 < 1) ok = false;

        return ok;
      };

      //#################### 2-1. 날짜별로 랜덤 휴무 배정 (근무 간격 및 조건 고려)
      for (let day = 1; day <= daysInMonth; day++) {
        if (offday.includes(day)) continue; // 전체 휴무일은 근무/휴무 개념 없음
        const date = dateOf(day);
        offDutyEmployees[date] = [];

        // 사전 확정 휴무 반영
        agentData.forEach((emp) => {
          if (employeeleaveSchedule[emp.name].includes(date)) {
            lastLeaveDay[emp.name] = day;
            if (!offDutyEmployees[date].includes(emp.name)) offDutyEmployees[date].push(emp.name);
          }
        });

        // 휴무 후보군: 의무휴무 미달 + 최소 연속근무 충족 + 다음날 사전휴무 없음 + 오늘 사전휴무 아님
        let remainingEmployees = agentData.filter(
          (emp) =>
            leaveCounter[emp.name] < maxLeavesPerEmployee &&
            day - lastLeaveDay[emp.name] >= minWorkGap &&
            !allLeaves.some((lv) => lv.name === emp.name && lv.day === day + 1) &&
            !employeeleaveSchedule[emp.name].includes(date)
        );

        // 사전휴무 인원을 제외한 전체 근무 가능 인원
        const dailyWorkforce = agentData.filter((emp) => !employeeleaveSchedule[emp.name].includes(date));

        //#################### 2-2. 최대 연속 근무일 도달자 우선 강제 휴무
        const forced = remainingEmployees.filter(
          (emp) => lastLeaveDay[emp.name] > 0 && day - lastLeaveDay[emp.name] >= maxWorkGap
        );
        forced.forEach((emp) => {
          offDutyEmployees[date].push(emp.name);
          if (!checkConditionToLeave(date, dailyWorkforce, emp, true, avgDailyEmployees - 1)) {
            offDutyEmployees[date].pop();
          } else {
            leaveCounter[emp.name] += 1;
            lastLeaveDay[emp.name] = day;
            employeeleaveSchedule[emp.name].push(date);
            allLeaves.push({ name: emp.name, date, day });
          }
        });
        const forcedSet = new Set(forced.map((e) => e.name));
        remainingEmployees = remainingEmployees.filter((emp) => !forcedSet.has(emp.name));

        //#################### 2-3. 휴가 가능 인원 중 랜덤 픽으로 목표 인원까지 배정
        while (offDutyEmployees[date].length < dailyLeaveTarget && remainingEmployees.length > 0) {
          const idx = randInt(remainingEmployees.length);
          const picked = remainingEmployees[idx];
          remainingEmployees.splice(idx, 1); // 뽑은 인원은 후보에서 제거 (재검토 X)

          offDutyEmployees[date].push(picked.name);
          if (!checkConditionToLeave(date, dailyWorkforce, picked, true, avgDailyEmployees)) {
            offDutyEmployees[date].pop();
            continue;
          }
          leaveCounter[picked.name] += 1;
          lastLeaveDay[picked.name] = day;
          employeeleaveSchedule[picked.name].push(date);
          allLeaves.push({ name: picked.name, date, day });
        }
      }

      //#################### 3. 휴무 인원이 적은 날부터 채우기
      const fillSparseDays = (skipAlternative: boolean) => {
        for (let level = 0; level < dailyLeaveTarget; level++) {
          for (const date in offDutyEmployees) {
            const day = parseInt(date.split("-")[2]);
            if (offday.includes(day)) continue;
            if (skipAlternative && alteroffday.includes(day)) continue;
            if (offDutyEmployees[date].length !== level) continue;

            const candidates = agentData.filter((emp) => !offDutyEmployees[date].includes(emp.name));
            const dailyWorkforce = agentData.filter((emp) => !employeeleaveSchedule[emp.name].includes(date));

            while (offDutyEmployees[date].length < dailyLeaveTarget && candidates.length > 0) {
              const idx = randInt(candidates.length);
              const picked = candidates[idx];
              candidates.splice(idx, 1); // 한 번만 제거
              if (leaveCounter[picked.name] >= maxLeavesPerEmployee) continue;

              offDutyEmployees[date].push(picked.name);
              if (!checkConditionToLeave(date, dailyWorkforce, picked, false, avgDailyEmployees - 1)) {
                offDutyEmployees[date].pop();
                continue;
              }
              leaveCounter[picked.name] += 1;
              lastLeaveDay[picked.name] = day;
              employeeleaveSchedule[picked.name].push(date);
              allLeaves.push({ name: picked.name, date, day });
            }
          }
        }
      };
      fillSparseDays(false);

      //#################### 4. 대체 휴무: 해당일 근무자에게 휴무 크레딧 1일 부여 후 재보충
      alteroffday.forEach((day) => {
        const date = dateOf(day);
        const worked = agentData.filter((emp) => !employeeleaveSchedule[emp.name].includes(date));
        worked.forEach((emp) => {
          leaveCounter[emp.name] -= 1;
        });
      });
      fillSparseDays(true);

      //#################### 5. 의무 휴무가 남은 인원은 랜덤 날짜에 조건 확인 후 배치
      agentData.forEach((employee) => {
        let attempts = 0;
        while (leaveCounter[employee.name] < maxLeavesPerEmployee && attempts < 300) {
          attempts++;
          const day = randInt(daysInMonth) + 1; // 1 ~ daysInMonth (마지막 날 포함)
          if (offday.includes(day) || alteroffday.includes(day)) continue;
          const date = dateOf(day);
          if (employeeleaveSchedule[employee.name].includes(date)) continue;

          employeeleaveSchedule[employee.name].push(date);
          const dailyWorkforce = agentData.filter((emp) => !employeeleaveSchedule[emp.name].includes(date));
          if (checkConditionToLeave(date, dailyWorkforce, employee, false, minDailyEmployees)) {
            leaveCounter[employee.name] += 1;
            lastLeaveDay[employee.name] = day;
            allLeaves.push({ name: employee.name, date, day });
            if (!offDutyEmployees[date]) offDutyEmployees[date] = [];
            offDutyEmployees[date].push(employee.name);
          } else {
            employeeleaveSchedule[employee.name].pop();
          }
        }
      });

      return { employeeleaveSchedule, leaveCounter, lastLeaveDay, offDutyEmployees, allLeaves };
    };

    //#################### 6. 여러 번 생성 후 품질 점수가 가장 좋은(=낮은) 결과 채택
    //  랜덤은 유지하되(매번 다른 결과), best-of-N 으로 품질을 끌어올린다.
    const scoreAttempt = (st: AttemptState): number => {
      let penalty = 0;

      // (1) 의무 휴무 쿼터 미달/초과
      agentData.forEach((emp) => {
        const diff = st.leaveCounter[emp.name] - maxLeavesPerEmployee;
        if (diff < 0) penalty += -diff * 1000; // 미달: 매우 나쁨
        else if (diff > 0) penalty += diff * 400; // 초과
      });

      // (2) 일자별 근무 인원 / 매장 조건 + 휴무 분포
      const offCounts: number[] = [];
      for (let day = 1; day <= daysInMonth; day++) {
        if (offday.includes(day)) continue;
        const date = dateOf(day);
        const offNames = st.offDutyEmployees[date] || [];
        const working = agentData.filter(
          (e) => !offNames.includes(e.name) && !st.employeeleaveSchedule[e.name].includes(date)
        );
        offCounts.push(agentData.length - working.length);

        if (working.length < minDailyEmployees) penalty += (minDailyEmployees - working.length) * 600;
        const managers = working.filter(isManager).length;
        if (managers < minManagers) penalty += (minManagers - managers) * 500;
        if (working.filter(isMainAdmin).length < 1) penalty += 500;
        if (working.filter(isSubAdmin).length < 1) penalty += 500;
        const ff = working.filter(isFirstFloor).length;
        if (ff < minFirstFloor) penalty += (minFirstFloor - ff) * 250;
        const sf = working.filter(isSecondFloor).length;
        if (sf < minSecondFloor) penalty += (minSecondFloor - sf) * 250;
      }

      // (3) 휴무 인원 균등 분포 (분산이 작을수록 좋음)
      if (offCounts.length > 1) {
        const mean = offCounts.reduce((a, b) => a + b, 0) / offCounts.length;
        const variance = offCounts.reduce((a, b) => a + (b - mean) ** 2, 0) / offCounts.length;
        penalty += variance * 30;
      }

      // (4) 연속 근무 초과 (maxWorkGap 를 넘겨 일하는 구간)
      agentData.forEach((emp) => {
        const leaveDays = st.employeeleaveSchedule[emp.name]
          .map((d) => parseInt(d.split("-")[2]))
          .filter((d) => !Number.isNaN(d))
          .sort((a, b) => a - b);
        let prev = 0;
        [...leaveDays, daysInMonth + 1].forEach((d) => {
          const streak = d - prev - 1;
          if (streak > maxWorkGap) penalty += (streak - maxWorkGap) * 60;
          prev = d;
        });
      });

      return penalty;
    };

    const ATTEMPTS = 40;
    let best: AttemptState | null = null;
    let bestScore = Infinity;
    for (let i = 0; i < ATTEMPTS; i++) {
      const st = runAttempt();
      const s = scoreAttempt(st);
      if (s < bestScore) {
        bestScore = s;
        best = st;
      }
    }
    if (!best) return;
    log("best score", bestScore, "/ attempts", ATTEMPTS);

    //#################### 7. 날짜순 정렬 후 인원별 휴무 카운트 라벨링
    const { allLeaves } = best;
    allLeaves.sort((a, b) => a.day - b.day);
    const result: EventInput[] = [];
    const tempLeaveCounter: { [key: string]: number } = {};
    allLeaves.forEach(({ name, date }) => {
      tempLeaveCounter[name] = (tempLeaveCounter[name] || 0) + 1;
      const jobLevel = agentData.find((emp) => emp.name === name)?.job_level || "";
      result.push({ title: `${name} (${tempLeaveCounter[name]}일)`, start: date, color: jobLevelColors[jobLevel] });
    });
    log("Result allLeaves : ", allLeaves);
    log("Result tempLeaveCounter : ", tempLeaveCounter);

    setLeaveSchedule(result);
    setLeaveCount(tempLeaveCounter);
    setGeneratedLeaves(allLeaves.map(({ name, date }) => ({ name, date })));
  };

  const genSch = () => {
    generateLeaveSchedule();
  };

  // 생성된 스케줄을 확인하고 마음에 들면 서버에 확정 저장
  const confirmGeneratedSchedule = async () => {
    if (isConfirming) return;
    if (generatedLeaves.length === 0) {
      alert("먼저 Generate 로 스케줄을 생성하세요.");
      return;
    }
    if (!currentMonth || !/^\d{4}-\d{2}$/.test(currentMonth)) {
      alert("달력에서 확정할 달을 먼저 선택하세요.");
      return;
    }
    if (!agentList || agentList.length === 0) return;
    if (!window.confirm(`${currentMonth} 스케줄을 확정하고 저장할까요? (기존 확정본은 덮어씁니다)`)) return;

    const monthPrefix = `${currentMonth}-`;
    const entries = agentList.map((agent: any) => {
      const leaveDates = Array.from(
        new Set(
          generatedLeaves
            .filter((l) => l.name === agent.name && l.date.startsWith(monthPrefix))
            .map((l) => l.date)
        )
      );
      const annualLeaveDates = Array.from(
        new Set(
          annualLeaveList
            .filter(
              (e: EventInput) =>
                e.title === agent.name &&
                typeof e.start === "string" &&
                (e.start as string).startsWith(monthPrefix)
            )
            .map((e: EventInput) => e.start as string)
        )
      );
      return { agentId: agent.id, leaveDates, annualLeaveDates };
    });

    try {
      setIsConfirming(true);
      const ok = await confirmSchedule(currentMonth, entries);
      if (ok) alert(`${currentMonth} 스케줄을 확정 저장했습니다.`);
    } catch (err) {
      console.error("confirm schedule error", err);
      alert("스케줄 확정 저장 중 오류가 발생했습니다.");
    } finally {
      setIsConfirming(false);
    }
  };

  return (
    <div className="App">
      <MyCalendar events={leaveSchedule} />
      <div style={{ height: "10px" }}></div>
      <div style={{ display: 'flex', gap: '10px', marginLeft: '400px', marginTop: '10px' }}>
        <button onClick={genSch}> Generate </button>
        <button onClick={confirmGeneratedSchedule} disabled={isConfirming || generatedLeaves.length === 0}>
          {isConfirming ? '확정 중...' : '확정'}
        </button>
      </div>
      <div style={{ height: "10px" }}></div>
      <Table />
    </div>
  );
}

export default App;
