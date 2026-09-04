# 직원 휴무 스케줄 시스템 정리

매장 직원들의 **월 단위 휴무(휴일 + 연차) 스케줄**을 자동 생성하고, 확정된 스케줄을
서버에 이력으로 저장·조회하는 기능에 대한 문서.

- 클라이언트: `client/app` (React + TypeScript, react-scripts)
- 서버: `server/app` (Express + TypeScript + mysql2)
- 핵심 파일
  - 알고리즘: [`client/app/src/App.tsx`](../client/app/src/App.tsx) `generateLeaveSchedule()`
  - 상태/통신 훅: [`client/app/src/hooks/useAgentinfo.tsx`](../client/app/src/hooks/useAgentinfo.tsx)
  - 입력 표: [`client/app/src/ReactTable.tsx`](../client/app/src/ReactTable.tsx)
  - 달력: [`client/app/src/MyCalendar.tsx`](../client/app/src/MyCalendar.tsx) / 공휴일 데이터 [`koreanHolidays.ts`](../client/app/src/koreanHolidays.ts)
  - 서버: `server/app/src/apis/agentinfo/*`, `service/agentinfo.ts`, `model/agentinfoRepository.ts`
  - 스키마: [`server/.db/initdb.d/create_table.sql`](../server/.db/initdb.d/create_table.sql)

---

## 1. 전체 그림

```
[ReactTable 입력]                 [App.tsx]                        [server /apis/agentinfo]        [MySQL]
 직원(이름/직무)          ─────►  agentList ──────────────────────► GET  /infos ───────────────►  agent_informations
 원하는 휴일(description)         leaveList                         POST /infos
 연차 신청(annualleave)          annualLeaveList                    PATCH/DELETE /infos/:id
 매장 필수 조건 5개              scheduleEssentialWork
 전체/대체 휴일, 보조직무

[달력에서 달 이동] ──► currentMonth 변경
        │
        ├─► GET /schedule?month=YYYY-MM      ─► monthly_leaves (해당 월 확정본)  ─► 달력 표시
        └─► GET /annual-leave/usage?month=… ─► monthly_leaves (1월~해당월 연차)  ─► 표의 "누적 사용 연차"

[Generate] ─► generateLeaveSchedule() ─► 화면에만 제안 표시 (미저장)
[확정]     ─► POST /schedule/confirm  ─► monthly_leaves 에 인원별 해당 월 통째 교체 저장
[초기화]   ─► POST /schedule/reset    ─► monthly_leaves DROP&CREATE + 직원 입력값 비움
```

- **생성(Generate)** 결과는 화면 미리보기일 뿐, **확정(확정 버튼)** 을 눌러야 서버에 저장된다.
- 달력에서 달을 바꾸면 그 달의 **확정 저장본**이 자동으로 달력에 그려진다.

---

## 2. 화면 기능

### 2.1 입력 표 (`ReactTable.tsx`)

| 표 | 항목 | 저장 위치 |
|---|---|---|
| 직원 표 | 이름, 직무 등급, 원하는 휴일, 연차 신청, **누적 사용 연차(읽기전용)** | `agent_informations` (앞 4개) / `monthly_leaves` 집계(마지막) |
| 필수 조건 | `1인당 휴일`, `최소 근무 인원`, `필수 매니저↑ 수`, `필수 1층 사원 수`, `필수 2층 사원 수` | **`app_settings` (`essentialWork`)** — 변경 시 자동 저장, 앱 시작 시 로드. 기본값 `[8,7,1,3,3]` |
| 휴일 | 전체 휴일, 대체 휴일 | 클라이언트 상태 `holiday`, `alternativeholiday` (DateObject 배열) — 저장 안 됨(매번 입력) |
| 보조직무 | 온라인 업무 2명, RT 업무 2명 | **`app_settings` (`subjob1`, `subjob2`)** — 변경 시 자동 저장, 앱 시작 시 로드 |

- `원하는 휴일`(`description`) / `연차 신청`(`annualleave`) 은 `"YYYY-MM-DD, YYYY-MM-DD, ..."` 콤마 문자열로 서버에 저장.
- 표에서 행 저장 시 `POST/PATCH /apis/agentinfo/infos` 호출 → `syncAgentList()` 로 재조회.
- 훅의 `setSelectedDateList()` 가 콤마 문자열을 파싱해 `leaveList` / `annualLeaveList` (FullCalendar `EventInput[]`, `{title:이름, start:날짜}`) 로 만든다. 빈 문자열은 걸러낸다.

### 2.2 직무 등급 (8종) 과 그룹

| 직무 | 색상 | mainAdmin | subAdmin | manager | 1층 | 2층 | 1층관리 | 2층관리 |
|---|---|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| 점장 | 진빨강 | ● | | ● | | | | |
| 2층 부점장 | 보라 | ● | ● | ● | | ● | | ● |
| 1층 매니저 | 파랑 | | ● | ● | ● | | ● | |
| 2층 매니저 | 파랑 | | | ● | | ● | | ● |
| 1층 대리 | 주황 | | | | ● | | ● | |
| 2층 대리 | 주황 | | | | | ● | | ● |
| 1층 사원 | 녹색 | | | | ● | | | |
| 2층 사원 | 녹색 | | | | | ● | | |

(그룹 판별은 `App.tsx` 의 `isMainAdmin / isSubAdmin / isManager / isFirstFloor / isSecondFloor / isFirstFloorAdmin / isSecondFloorAdmin` 헬퍼로 구현.)

### 2.3 버튼

| 버튼 | 동작 |
|---|---|
| **Generate** | 달력이 보는 달 기준으로 스케줄 생성. 이미 확정본이 있으면 경고. 결과는 화면에만 표시(미저장). |
| **확정** | 화면의 제안을 `POST /schedule/confirm` 으로 저장. 저장 후 제안 상태를 비워 서버 저장본을 표시. |
| **스케줄·휴일 입력 초기화** (빨강) | `POST /schedule/reset` — `monthly_leaves` 전체 삭제 후 재생성 + 모든 직원의 `원하는 휴일`/`연차 신청` 비움(이름·직무 유지). 기존 DB에서 새 테이블을 만드는 용도도 겸함. |

### 2.4 달력 표시 규칙 (`App.tsx` `calendarEvents` = `useMemo`)

```
generatedMonth === currentMonth 이고 generatedLeaves 가 있으면
  → 방금 생성한 제안을 표시
아니면
  → monthlySchedule (서버 확정 저장본)을 표시
```

- 이벤트 제목: `이름 (n일)` — `n` 은 그 달에서 그 사람의 몇 번째 휴무인지(날짜순 누계).
- 서버 저장본에서 `leave_type='annual'` 인 날은 `이름 (n일) 연차` 로 표시.
- 색상은 직무 등급별 색(`jobLevelColors`).

### 2.5 주말·공휴일 표시 (`MyCalendar.tsx` + `koreanHolidays.ts`)

- 일요일 = 빨강 숫자, 토요일 = 파랑 숫자 (CSS `.fc-day-sun`/`.fc-day-sat`).
- 공휴일 = 옅은 빨간 배경 + 빨간 굵은 숫자 + 셀에 공휴일 이름 소형 표시.
- `koreanHolidays.ts` 의 `KOREAN_HOLIDAYS` 는 **정적 맵**(`'YYYY-MM-DD' → 이름`, 2025~2027, 음력 명절·대체공휴일·임시공휴일 포함). 음력/대체공휴일은 매년 바뀌므로 **연말에 다음 해 날짜를 추가·검증**해야 함.
- 이 표시는 **순수 시각용**이며, 알고리즘의 `holiday`/`alternativeholiday`(표에서 직접 입력하는 매장 휴무)와는 **무관**하다.

### 2.6 "누적 사용 연차" 열

- 표의 마지막 읽기전용 열. 값 = `annualLeaveUsage[agentId]`.
- `currentMonth` 가 바뀔 때마다 `GET /annual-leave/usage?month=YYYY-MM` 재조회.
- 의미: **그 해 1월부터 현재 보는 달까지** 확정 저장된 `leave_type='annual'` 행 수.
  - 예) 달력이 `2026-07` → 2026-01 ~ 2026-07 확정분 합계.
  - 연도가 바뀌면 다시 0부터.

---

## 3. 스케줄 생성 알고리즘 (`generateLeaveSchedule`)

### 3.1 성격

**그리디 + 랜덤 기반 제약 충족 + Best-of-N**.
- 매번 `window.crypto` 난수로 뽑으므로 Generate 를 누를 때마다 결과가 달라진다.
- 한 번의 생성(`runAttempt`)은 백트래킹 없는 단일 패스.
- 이를 **40회 반복**하고 `scoreAttempt()` 점수가 가장 낮은(=위반 적은) 결과를 채택한다.

### 3.2 입력 파라미터 (0단계)

| 이름 | 계산 | 의미 |
|---|---|---|
| `ym` / `targetYear` / `targetMonth` | `currentMonth`("YYYY-MM"), 없으면 오늘 | 대상 연·월 |
| `daysInMonth` | `new Date(y, m, 0).getDate()` | 그 달의 일수(28~31) |
| `maxLeavesPerEmployee` | `scheduleEssentialWork[0]` | 1인당 의무 휴무일 |
| `minDailyEmployees` | `[1]` | 하루 최소 근무 인원 |
| `avgDailyEmployees` | `floor(N − maxLeave·N / daysInMonth) + 1` | 하루 평균 근무 인원 |
| `minManagers` / `minFirstFloor` / `minSecondFloor` | `[2] / [3] / [4]` | 하루 최소 매니저↑ / 1층 / 2층 인원 |
| `minWorkGap` | 3 (상수) | 휴무 후 최소 연속 근무일 |
| `maxWorkGap` | 5 (상수) | 이 일수 이상 연속 근무 시 강제 휴무 후보 |
| `dailyLeaveTarget` | `max(1, N − avgDailyEmployees)` | 하루에 쉬게 할 목표 인원 |
| `offday` / `alteroffday` | 대상 월의 `holiday` / `alternativeholiday` 의 '일' | 전체/대체 휴일 |

### 3.3 사전 확정 휴무 (1단계, 모든 시도에서 동일)

- `applyPreset(leaveList, true)` — 직원이 신청한 휴무. **의무 휴무 카운트에 포함**.
- `applyPreset(annualLeaveList, false)` — 연차. **의무 휴무 카운트에서 제외** (연차는 별도).
- 대상 월(`targetYear`/`targetMonth`)에 해당하는 날짜만 반영.
- 결과: `baseLeaveSchedule`(이름→날짜[]), `baseLeaveCounter`(이름→의무 카운트), `basePreLeaves`.

### 3.4 조건 검사 함수 `checkConditionToLeave(date, dailyWorkforce, member, checkworkingday, limitWorkingMember)`

그 사람을 그 날 쉬게 했을 때 남는 근무 인원(`tempWorkforce`)이 매장 운영 조건을 만족하는지 검사.

- **공통 최소조건** `meetsBaseline` = `subAdmin≥1 && mainAdmin≥1 && managers≥minManagers && tempWorkforce.length ≥ limitWorkingMember`
- `checkworkingday === false` → `meetsBaseline` 만 확인 (보충/막판 배치 단계)
- 연속 근무가 `maxWorkGap` 이상인 사람 → `meetsBaseline` 만족 시 강제 휴무 허용
- 그 외 → **신청자 직무별 상세 조건** 확인:

| 신청자 직무 | 추가로 만족해야 하는 조건 |
|---|---|
| 점장 | mainAdmin≥1, managers≥minManagers, 인원≥limit |
| 2층 부점장 | 위 + subAdmin≥1, secondFloor≥minSecondFloor, secondFloorAdmin≥1 |
| 2층 매니저 | subAdmin≥1, managers≥minManagers, secondFloor≥minSecondFloor, secondFloorAdmin≥1, 인원≥limit |
| 1층 매니저 | subAdmin≥1, managers≥minManagers, firstFloor≥minFirstFloor, firstFloorAdmin≥1, 인원≥limit |
| 2층 대리 | secondFloor≥minSecondFloor, secondFloorAdmin≥1, 인원≥limit |
| 1층 대리 | firstFloor≥minFirstFloor, firstFloorAdmin≥1, 인원≥limit |
| 2층 사원 | secondFloor≥minSecondFloor, 인원≥limit |
| 1층 사원 | firstFloor≥minFirstFloor, 인원≥limit |

- 추가로, 신청자가 보조직무(`selectedSubjob1`/`2`) 명단이면 그 조가 최소 1명 남아야 함.

### 3.5 한 번의 시도 `runAttempt()` — 7단계

| 단계 | 내용 |
|---|---|
| **초기화** | `baseLeaveSchedule/Counter` 복제, `lastLeaveDay = -minWorkGap` |
| **2-1 날짜 루프** (1일~말일, 전체휴일 skip) | ① 사전 확정 휴무 반영 → ② 후보군 `remainingEmployees` (의무휴무 미달 + 마지막 휴무로부터 `minWorkGap` 경과 + 다음날 사전휴무 없음 + 오늘 사전휴무 아님) 산정 |
| **2-2 강제 휴무** | 연속 근무 `maxWorkGap` 도달자 우선. 조건 통과 시 휴무 확정, 실패해도 후보에서 제외 |
| **2-3 랜덤 배정** | 하루 휴무자가 `dailyLeaveTarget` 될 때까지 후보 중 난수로 1명씩 뽑아 조건 검사 → 통과 시 확정 (뽑힌 인원은 후보에서 즉시 제거, 재검토 없음) |
| **3 부족일 보충** `fillSparseDays(false)` | 휴무자가 `0,1,2,…` 명뿐인 날을 순회하며 `dailyLeaveTarget` 까지 랜덤 보충 (최소조건만 확인) |
| **4 대체 휴무** | `alteroffday` 근무자에게 `leaveCounter -= 1` (휴무 1일 크레딧) → `fillSparseDays(true)` 재보충 |
| **5 막판 배치** | 의무 휴무가 아직 미달인 사람마다 랜덤 날짜(최대 300회 시도)에 조건 확인 후 배치 |
| **반환** | `{ employeeleaveSchedule, leaveCounter, lastLeaveDay, offDutyEmployees, allLeaves }` |

### 3.6 품질 점수 `scoreAttempt(state)` — 낮을수록 좋음

| 항목 | 벌점 |
|---|---|
| 의무 휴무 쿼터 **미달** | `부족일수 × 1000` |
| 의무 휴무 쿼터 **초과** | `초과일수 × 400` |
| 하루 근무 인원 < `minDailyEmployees` | `부족 × 600` |
| 하루 매니저↑ < `minManagers` | `부족 × 500` |
| 하루 mainAdmin / subAdmin 0명 | 각 `500` |
| 하루 1층 / 2층 인원 부족 | 각 `부족 × 250` |
| 일자별 휴무 인원 **분산** (불균등) | `분산 × 30` |
| `maxWorkGap` 초과 연속 근무 구간 | `초과일수 × 60` |

→ 40회 중 최저 점수 결과를 `best` 로 채택, 날짜순 정렬 후 `generatedLeaves` / `generatedMonth` 상태에 저장(화면 표시).

---

## 4. 서버 API (`/apis/agentinfo`)

| 메서드 | 경로 | 설명 |
|---|---|---|
| GET | `/infos` | 직원 전체 목록 (`agent_informations`) |
| GET | `/count` | 직원 수 |
| POST | `/infos` | 직원 생성 |
| PATCH | `/infos/:id` | 직원 수정 |
| DELETE | `/infos/:id` | 직원 삭제 |
| **GET** | **`/schedule?month=YYYY-MM`** | 그 달의 확정 휴일/연차 전체. 응답 `{ leaves: [{ agentId, name, jobLevel, date, type }] }` |
| **POST** | **`/schedule/confirm`** | body `{ scheduleMonth, entries: [{ agentId, leaveDates[], annualLeaveDates[] }] }`. 인원별 해당 월 통째 교체 저장 |
| **GET** | **`/annual-leave/usage?month=YYYY-MM`** | 해당 연도 1월~그 달까지 연차 누계. 응답 `{ usage: { [agentId]: number } }` |
| **GET** | **`/settings`** | 앱 전역 설정. 응답 `{ settings: { subjob1, subjob2, essentialWork, ... } }` (값은 JSON 파싱됨) |
| **PUT** | **`/settings`** | body `{ [key]: value }` 각 키를 JSON 문자열로 upsert. 응답 `{ success, count }` |
| **POST** | **`/schedule/reset`** | `monthly_leaves` DROP&CREATE + 모든 직원 `description`/`annualleave` 비움. **`app_settings` 는 건드리지 않음.** 응답 `{ success, clearedAgents }` |

계층: `agentinfo.ctrl.ts` (요청/응답) → `service/agentinfo.ts` (검증·비즈니스 로직) → `model/agentinfoRepository.ts` (SQL). 오류는 `service/error.ts` 의 `BadRequestError(400)/NotFoundError(404)/ServerError(500)` → `apis/module/error.ts` 에서 JSON 변환.

---

## 5. DB 테이블 동작 원리

### 5.1 `agent_informations` — 직원 마스터

| 컬럼 | 타입 | 비고 |
|---|---|---|
| `agent_information_id` | CHAR(36) PK | `UUID()` |
| `created_at` | TIMESTAMP | 정렬 기준 (목록은 `created_at ASC`) |
| `name` | varchar(20) | |
| `job_level` | varchar(20) | 직무 등급 8종 중 하나 |
| `description` | varchar(255) | **원하는 휴일** — `"YYYY-MM-DD, ..."` 콤마 문자열 (모든 달 섞여 저장) |
| `annualleave` | varchar(255) | **연차 신청** — 동일 형식 |

- "스케줄·휴일 입력 초기화" 는 여기의 `description`, `annualleave` 만 `''` 로 비운다. `name`/`job_level` 은 유지.

### 5.1a `app_settings` — 앱 전역 설정 (키-값)

| 컬럼 | 타입 | 비고 |
|---|---|---|
| `setting_key` | VARCHAR(64) PK | `subjob1`, `subjob2`, `essentialWork` (필요 시 자유롭게 추가) |
| `setting_value` | TEXT | **JSON 문자열** (`["김","이"]`, `[8,7,1,3,3]` 등) |
| `updated_at` | TIMESTAMP | |

- 클라이언트(`useAgentinfo`)가 앱 시작 시 `GET /settings` 로 로드해 `selectedSubjob1/2`, `scheduleEssentialWork` 에 적용.
- 이 값들이 바뀌면 800ms 디바운스 후 `PUT /settings` 로 자동 저장 (별도 저장 버튼 없음).
- "스케줄·휴일 입력 초기화" 는 이 테이블을 건드리지 않는다.

### 5.2 `monthly_leaves` — 확정된 휴일/연차 이력 (정규화: **하루 = 한 행**)

| 컬럼 | 타입 | 비고 |
|---|---|---|
| `monthly_leave_id` | CHAR(36) PK | `UUID()` |
| `agent_information_id` | CHAR(36) | 직원 |
| `schedule_month` | CHAR(7) | `'YYYY-MM'` — `leave_date` 가 속한 달 (조회·집계용 인덱스 키) |
| `leave_date` | DATE | `'YYYY-MM-DD'` |
| `leave_type` | ENUM('leave','annual') | 연차 신청 명단에 있던 날이면 `'annual'`, 아니면 `'leave'` |
| `confirmed_at` | TIMESTAMP | 저장/수정 시각 |
| — | UNIQUE `(agent_information_id, leave_date)` | 한 직원이 같은 날 두 번 못 들어감 |
| — | KEY `(schedule_month)` | 월별 조회 인덱스 |

이전 버전의 `monthly_schedules`(직원×월 한 행 + 콤마 문자열 + `annual_leave_count`) 는 폐기됨.
`resetMonthlyLeavesTable()` 이 `monthly_schedules` 도 함께 `DROP TABLE IF EXISTS` 로 정리한다.

### 5.3 확정 저장 = "그 달 그 직원 것 통째 교체" (`replaceAgentMonthLeaves`)

`POST /schedule/confirm` → 각 `entry` 마다:

1. `entry.annualLeaveDates` → `annualSet` (대상 월·형식 검증 후 중복 제거)
2. `entry.leaveDates` ∪ `annualSet` → `allDates` (연차일도 휴무일로 포함)
3. 각 날짜 → `{ leaveDate, leaveType: annualSet.has(날짜) ? 'annual' : 'leave' }`
4. **트랜잭션**:
   ```sql
   DELETE FROM monthly_leaves
    WHERE agent_information_id = ? AND schedule_month = ?;
   INSERT INTO monthly_leaves (monthly_leave_id, agent_information_id, schedule_month, leave_date, leave_type)
    VALUES (UUID(),?,?,?,?), (UUID(),?,?,?,?), ...;   -- 그 달치 한 번에
   COMMIT;
   ```

→ 재확정하면 그 (직원, 달) 행만 새로 덮어쓴다. **다른 달·다른 직원 데이터는 그대로** 남으므로 월별 이력이 계속 쌓인다.

### 5.4 월 스케줄 조회 (`getMonthlyLeaves`)

```sql
SELECT ml.agent_information_id AS agentId, a.name, a.job_level AS jobLevel,
       DATE_FORMAT(ml.leave_date, '%Y-%m-%d') AS date, ml.leave_type AS type
FROM monthly_leaves ml
JOIN agent_informations a ON a.agent_information_id = ml.agent_information_id
WHERE ml.schedule_month = ?
ORDER BY ml.leave_date ASC, a.name ASC;
```

- `DATE_FORMAT` 으로 DATE 를 문자열로 반환 (타임존 밀림 방지).
- 직무는 **현재** `agent_informations.job_level` 로 조인 (과거 시점 스냅샷 아님).

### 5.5 연간 누적 연차 (`getAnnualLeaveUsageUpToMonth`)

```sql
SELECT agent_information_id, COUNT(*) AS used
FROM monthly_leaves
WHERE leave_type = 'annual'
  AND schedule_month >= ?    -- 'YYYY-01'
  AND schedule_month <= ?    -- 요청한 'YYYY-MM'
GROUP BY agent_information_id;
```

- `schedule_month` 가 `'YYYY-MM'` 문자열이라 같은 해 안에서는 사전식 비교로 월 범위가 맞다.
- 결과를 `{ [agentId]: used }` 로 변환해 응답 → 표의 "누적 사용 연차" 열.

---

## 6. 데이터 흐름 예시

**"2026년 3월 스케줄을 만들고 확정"**

1. 달력을 3월로 이동 → `currentMonth = "2026-03"` → `GET /schedule?month=2026-03` (없으면 빈 달력), `GET /annual-leave/usage?month=2026-03`.
2. 표에서 직원별 원하는 휴일/연차, 매장 필수조건, 전체·대체 휴일 입력 → 저장.
3. **Generate** → `generateLeaveSchedule()` 40회 시도 → 최선안이 달력에 표시(파랑/주황/녹색 등). 아직 서버 저장 안 됨.
4. 마음에 안 들면 다시 Generate (매번 다른 결과). 마음에 들면 **확정**.
5. 확정 → 인원별 `entries` 생성 → `POST /schedule/confirm { scheduleMonth:"2026-03", entries }`.
   - 서버: 각 직원의 `monthly_leaves` 에서 `schedule_month='2026-03'` 행 삭제 후 새로 INSERT.
6. 저장 성공 → 훅이 `GET /schedule?month=2026-03` + `GET /annual-leave/usage?month=2026-03` 재조회 → 달력은 저장본 표시, 표의 누적 연차 갱신.
7. 나중에 다시 3월로 오면 6번의 저장본이 그대로 달력에 뜬다. 4월로 가면 4월 저장본(있으면).

---

## 7. 알려진 제약 / 주의점

- **이름 기준 매칭**: `leaveList`/`annualLeaveList`/confirm entries 가 모두 직원 *이름* 으로 매칭된다. 동명이인이 있으면 꼬인다.
- `create_table.sql` 은 **DB 볼륨 최초 생성 시에만** 실행. 기존 DB 는 "초기화" 버튼으로 `monthly_leaves` + `app_settings` 를 만들 수 있다(`app_settings` 는 DROP 없이 `CREATE TABLE IF NOT EXISTS` 만).
- 확정 스케줄의 직무 색/이름은 **조회 시점의** `agent_informations` 값을 쓴다(과거 직무 스냅샷 없음).
- 생성 알고리즘은 백트래킹이 없다. 조건이 빡빡하면(인원 부족 등) 일부 날/일부 인원이 조건을 못 맞출 수 있고, 그 경우 `scoreAttempt` 벌점이 큰 결과라도 40개 중 최선을 낸다.
- `minWorkGap = 3` 때문에 한 사람이 이틀 연속으로 쉬는 배치는 구조적으로 안 나온다(사전 신청 제외).
- 하루 목표 휴무 인원 `dailyLeaveTarget` 은 인원수에 따라 자동 계산된다(과거의 고정값 5 제거됨).
- 서버 `agentinfoRepository` 의 일부 구(舊) 메서드(`getAgentinfoById` 등)는 `conn.release()` 가 빠져 있다(기존 코드). 신규 메서드에는 추가돼 있다.
