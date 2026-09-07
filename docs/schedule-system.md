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

## 0. 최근 변경 요약 (2026-09)

이 세션에서 추가·수정된 것들. 아래 3·4·5절 본문은 갱신 완료.

### 입력 표 (`ReactTable.tsx`)
- **`필수 근무일` 열 추가** — `agent_informations.mandatory_workday`. 해당 인원은 그 날 **절대 휴무 배정 안 됨**(사전 신청 휴무보다 우선). `description`/`annualleave` 와 같은 `"YYYY-MM-DD, ..."` 콤마 문자열.
- **필수 조건 5칸 의미 변경**: `[의무 휴무일, 평일 근무 인원, 최소 책임급 수, 필수 1층 인원, 필수 2층 인원]`. **주말 근무 인원 = 평일 + 1**. 기본값 `[8, 6, 1, 3, 2]`.
- **표를 직급 순으로 표시**: 점장 > 부점장 > 매니저 > 대리 > 사원 (같은 직급이면 1층 < 2층). 키워드 포함으로 판정해 옛 라벨·유니코드 차이에도 견고 (`useAgentinfo.tsx` `sortByJobRank`).

### 알고리즘 (`generateLeaveSchedule`)
- **직무 헬퍼 재정의**: `isDirector`(점장), `isTopAdmin`(점장·부점장), `isSenior`(책임급=점장·매니저·부점장), `isFirstFloor`/`isSecondFloor`(층 소속, **점장 제외**), `isFirstFloorLeadPure`/`isSecondFloorLeadPure`(대리급 이상, 점장 제외). 옛 `isMainAdmin/isSubAdmin/isManager/…` 는 폐기.
- **점장은 알고리즘 휴무 배정 대상에서 제외** — 사전 확정 휴무일에만 쉰다.
- **점장 = 층 유동 인원**: `floorCoverageOk()` 가 1·2층 최소 인원·리드를 검사하되, 부족한 한 층을 점장이 메울 수 있게 허용(두 층 동시 부족이면 불가).
- **하루 목표 근무 인원 = 평일/주말 분리** (`workTargetOf(day)`). 채우기·막판·강제휴무 단계는 **`목표 − 1`** 만 지키면 됨.
- **한국 공휴일 자동 반영**: `"설날"`/`"추석"` **당일** → 전체 휴무(`offday`, 휴무 카운트 제외). 그 외 공휴일 → 근무 + **대체휴무 크레딧**(`alteroffday`).
- **대체휴무(`comp`)**: 공휴일 근무 일수만큼 그 사람 의무 휴무 목표가 `8 + credit` 으로 늘고, 그만큼 추가 휴무를 배치. `leave_type='comp'` 로 저장.
- **연속 근무 최대 4일** (목표 3일). 4일 도달 시 강제 휴무 + 5일 이상 구간을 잘라 하루 끼워넣는 별도 패스. `scoreAttempt` 도 5일↑ 연속을 크게 벌점.
- **분산/간격 개선**: 최소 근무 간격을 모든 채우기 단계에서 강제, "가장 오래 못 쉰 사람" 우선 배정, 막판 배치는 "기존 휴무와 멀고 그 날 휴무자 적은 날" 선택.
- Best-of-N **40 → 60회**.

### 달력 (`MyCalendar.tsx` / `App.tsx`)
- **표기**: 대체휴무 → `이름 (n일) 대체`, 연차 → `이름 연차`(숫자 없음, 누적 휴무에서 제외). `(n일)` = 일반 + 대체 누적.
- **드래그 이동**: 생성 직후(확정 전, `isPreview`) 상태에서 휴무 이벤트를 다른 날짜로 드래그 → `generatedLeaves` 갱신 → **`확정` 시 그대로 저장**. 연차 이벤트는 드래그 불가(표에서 수정). 확정 저장본은 드래그 불가.

### DB / API
- **`monthly_leaves.leave_type` ENUM**: `('leave','annual')` → **`('leave','annual','comp')`**.
- **`POST /schedule/confirm` body**: `entries[].compLeaveDates[]` 추가. 유형 판별 우선순위 `annual` > `comp` > `leave`.
- **기존 DB 마이그레이션** — 서버 기동 시 `AgentinfoRepository.ensureAgentSchema()` 실행: `agent_informations.mandatory_workday` 컬럼 추가 + `monthly_leaves.leave_type` ENUM 확장(`ALTER … MODIFY`). MySQL 5.7 은 `ADD COLUMN IF NOT EXISTS` 미지원이라 `information_schema` 확인 후 ALTER.
- **`POST /schedule/reset`** 은 이제 `mandatory_workday` 도 함께 비운다.
- `koreanHolidays.ts`: `2026-09-28` 삭제(대체공휴일 아님).

---

## 1. 전체 그림

```
[ReactTable 입력]                 [App.tsx]                        [server /apis/agentinfo]        [MySQL]
 직원(이름/직무)          ─────►  agentList (직급 순 정렬) ────────► GET  /infos ───────────────►  agent_informations
 원하는 휴일(description)         leaveList                         POST /infos
 연차 신청(annualleave)          annualLeaveList                    PATCH/DELETE /infos/:id
 필수 근무일(mandatory_workday)  mandatoryWorkList
 매장 필수 조건 5개              scheduleEssentialWork
 전체/대체 휴일, 보조직무        + koreanHolidays.ts (자동)

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
| 직원 표 | 이름, 직무 등급, 원하는 휴일, 연차 신청, **필수 근무일**, **누적 사용 연차(읽기전용)** | `agent_informations` (앞 5개) / `monthly_leaves` 집계(마지막). **직급 순 정렬** |
| 필수 조건 | `1인당 휴일`, `평일 근무 인원(주말+1)`, `최소 책임급 수`, `필수 1층 인원`, `필수 2층 인원` | **`app_settings` (`essentialWork`)** — 변경 시 자동 저장, 앱 시작 시 로드. 기본값 `[8,6,1,3,2]` |
| 휴일 | 전체 휴일, 대체 휴일 | 클라이언트 상태 `holiday`, `alternativeholiday` (DateObject 배열) — 저장 안 됨(매번 입력). **한국 공휴일은 자동 반영되므로 여기 다시 넣을 필요 없음** |
| 보조직무 | 온라인 업무 2명, RT 업무 2명 | **`app_settings` (`subjob1`, `subjob2`)** — 변경 시 자동 저장, 앱 시작 시 로드 |

- `원하는 휴일`(`description`) / `연차 신청`(`annualleave`) / `필수 근무일`(`mandatory_workday`) 은 `"YYYY-MM-DD, YYYY-MM-DD, ..."` 콤마 문자열로 서버에 저장.
- 표에서 행 저장 시 `POST/PATCH /apis/agentinfo/infos` 호출 → `syncAgentList()` 로 재조회.
- 훅의 `setSelectedDateList()` 가 콤마 문자열을 파싱해 `leaveList` / `annualLeaveList` (FullCalendar `EventInput[]`, `{title:이름, start:날짜}`) 로 만든다. 빈 문자열은 걸러낸다.

### 2.2 직무 등급 (8종) 과 그룹

| 직무 | 책임급 | 점장·부점장 | 1층 소속 | 2층 소속 | 1층 리드 | 2층 리드 |
|---|:-:|:-:|:-:|:-:|:-:|:-:|
| 점장 | ● | ● | (유동) | (유동) | (유동) | (유동) |
| 2층 부점장 | ● | ● | | ● | | ● |
| 1층 매니저 | ● | | ● | | ● | |
| 2층 매니저 | ● | | | ● | | ● |
| 1층 대리 | | | ● | | ● | |
| 2층 대리 | | | | ● | | ● |
| 1층 사원 | | | ● | | | |
| 2층 사원 | | | | ● | | |

- 그룹 판별: `App.tsx` 의 `isSenior`(책임급), `isTopAdmin`(점장·부점장), `isFirstFloor`/`isSecondFloor`(층 소속, 점장 제외), `isFirstFloorLeadPure`/`isSecondFloorLeadPure`(대리급 이상, 점장 제외), `isDirector`(점장).
- **점장은 층 고정이 아니라 유동** — `floorCoverageOk()` 에서 부족한 층에 배치. 하루에 한 층만.

### 2.3 버튼

| 버튼 | 동작 |
|---|---|
| **Generate** | 달력이 보는 달 기준으로 스케줄 생성. 이미 확정본이 있으면 경고. 결과는 화면에만 표시(미저장). 이후 달력에서 휴무를 드래그해 수정 가능(§2.4). |
| **확정** | 화면의 제안(드래그 수정 포함)을 `POST /schedule/confirm` 으로 저장. 저장 후 제안 상태를 비워 서버 저장본을 표시. |
| **스케줄·휴일 입력 초기화** (빨강) | `POST /schedule/reset` — `monthly_leaves` 전체 삭제 후 재생성 + 모든 직원의 `원하는 휴일`/`연차 신청`/`필수 근무일` 비움(이름·직무 유지). 기존 DB에서 새 테이블을 만드는 용도도 겸함. |

### 2.4 달력 표시 규칙 (`App.tsx` `calendarEvents` = `useMemo`)

```
generatedMonth === currentMonth 이고 generatedLeaves 가 있으면
  → 방금 생성한 제안을 표시
아니면
  → monthlySchedule (서버 확정 저장본)을 표시
```

- 이벤트 제목:
  - 일반 휴무 → `이름 (n일)` — `n` 은 그 달 누적 휴무일(날짜순).
  - 대체휴무(`leave_type='comp'`) → `이름 (n일) 대체` — `n` 에 대체휴무도 포함.
  - 연차(`leave_type='annual'`) → `이름 연차` — **숫자 없음**, `n` 누계에도 미포함(월 휴무가 아님).
- 색상은 직무 등급별 색(`jobLevelColors`).
- **드래그 이동**: `isPreview`(생성 직후·확정 전)일 때만 일반/대체 휴무 이벤트를 다른 날짜로 드래그 → `handleEventDrop` 이 `generatedLeaves` 의 해당 항목 날짜를 교체 → `확정` 시 반영. 보이는 달 밖·중복 날짜면 되돌림. 연차·확정 저장본은 드래그 불가.

### 2.5 주말·공휴일 표시 (`MyCalendar.tsx` + `koreanHolidays.ts`)

- 일요일 = 빨강 숫자, 토요일 = 파랑 숫자 (CSS `.fc-day-sun`/`.fc-day-sat`).
- 공휴일 = 옅은 빨간 배경 + 빨간 굵은 숫자 + 셀에 공휴일 이름 소형 표시.
- `koreanHolidays.ts` 의 `KOREAN_HOLIDAYS` 는 **정적 맵**(`'YYYY-MM-DD' → 이름`, 2025~2027, 음력 명절·대체공휴일·임시공휴일 포함). 음력/대체공휴일은 매년 바뀌므로 **연말에 다음 해 날짜를 추가·검증**해야 함.
- **알고리즘도 이 맵을 읽는다**(§3): 이름이 정확히 `"설날"`/`"추석"` 이면 전체 휴무, 그 외 공휴일이면 대체휴무 크레딧 대상. 표의 `홀리데이`(전체/대체 휴일) 입력과 **합쳐진다**.

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
- 이를 **60회 반복**하고 `scoreAttempt()` 점수가 가장 낮은(=위반 적은) 결과를 채택한다.
- **절대적으로 지키는 건 "인원별 의무 휴무일수"** 뿐. 나머지(근무 인원·층·책임급 등)는 "최대한" 맞추고, 못 맞추면 `scoreAttempt` 벌점으로 반영 → 60개 중 최선을 낸다.

### 3.2 입력 파라미터 (0단계)

`scheduleEssentialWork` = `[maxLeavesPerEmployee, weekdayWorkers, minSeniors, minFirstFloor, minSecondFloor]`

| 이름 | 값 | 의미 |
|---|---|---|
| `maxLeavesPerEmployee` | `[0]` (기본 8) | 1인당 의무 휴무일 (연차 제외). 대체휴무로 개인별 상향됨 |
| `weekdayWorkers` / `weekendWorkers` | `[1]` / `[1]+1` | 평일 / 주말 **목표** 근무 인원. `workTargetOf(day)` |
| `minSeniors` | `[2]` | 하루 최소 책임급 인원 |
| `minFirstFloor` / `minSecondFloor` | `[3]` / `[4]` | 하루 최소 1층 / 2층 인원 (`floorCoverageOk`, 점장 유동 반영) |
| `minWorkGap` | 3 (상수) | 목표 연속 근무일 상한 |
| `maxWorkGap` | 5 (상수) | **절대 한계 = 연속 4일**. 4일 도달 시 다음 날 강제 휴무 |
| `leaveTargetOf(day)` | `N − workTargetOf(day)` | 그 날 쉬게 할 목표 인원 |
| `offday` / `alteroffday` | 표의 `holiday`/`alternativeholiday` + **한국 공휴일 자동** | 전체 휴무 / 대체휴무 크레딧 대상일 |
| `mandatoryWorkSet` | 직원별 `필수 근무일` | 그 인원은 그 날 휴무 배정 금지 |

### 3.3 사전 확정 휴무 (1단계)

- `applyPreset(leaveList, true)` — 신청 휴무. **의무 휴무 카운트 포함**. (단, `필수 근무일` 과 겹치면 무시)
- `applyPreset(annualLeaveList, false)` — 연차. **의무 휴무 카운트 제외**.
- 대상 월 날짜만 반영.

### 3.4 조건 검사 `checkConditionToLeave(date, dailyWorkforce, member, strict)`

그 사람을 쉬게 했을 때 남는 근무 인원(`temp`)이 조건을 만족하는지. 직무별 분기 없이 **결과 인원 기준**으로 판정.

- `strict === false` (채우기·막판·강제휴무) **또는** 연속 근무 4일 초과자 → **`temp.length ≥ workTargetOf(day) − 1`** 만 확인.
- `strict === true` (2-1/2-3 일반 배정) → 위에 더해:
  - `floorCoverageOk(temp)` — 1·2층 최소 인원 + 각 층 대리급 이상 1명 (부족한 한 층은 점장이 커버 가능)
  - `책임급 ≥ minSeniors`, `점장·부점장 ≥ 1`
  - 신청자가 보조직무 명단이면 그 조가 최소 1명 근무
  - `temp.length ≥ workTargetOf(day)`

### 3.5 한 번의 시도 `runAttempt()`

| 단계 | 내용 |
|---|---|
| **초기화** | 사전 확정 휴무 복제 |
| **2-1~2-3 날짜 루프** (1일~말일, `offday` skip) | ① 사전 휴무 반영 → ② **연속 4일 도달자 강제 휴무**(의무일수·간격 무관, 최소 인원만) → ③ `leaveTargetOf(day)` 까지 배정: 1순위 "목표 간격 지난 사람", 2순위 "최소 간격만 지난 사람", **가장 오래 못 쉰 순** |
| **3 부족일 보충** `fillSparseDays()` | 휴무자가 목표에 못 미친 날을 순회, **휴무 적은 사람·기존 휴무와 먼 날** 우선 보충 (최소 간격 준수) |
| **4 대체 휴무** | 각 인원의 `alteroffday` 근무 일수 = `holidayCredit`. 개인 목표를 `8 + credit` 로 상향 |
| **5 미달 인원 배치** | 목표 미달 인원마다 "기존 휴무와 멀고 그 날 휴무자 적은 날" 선택. 1차 최소 간격, 못 채우면 간격 완화(≥2) |
| **5-1 연속 근무 차단** | 각 인원의 휴무 간격(월초~첫 휴무, 마지막 휴무~월말 포함)이 **5일 이상**이면 그 구간 중앙에 하루 휴무 삽입 |

(점장은 2-1~5 어디에서도 휴무 배정 대상이 아님)

### 3.6 품질 점수 `scoreAttempt(state)` — 낮을수록 좋음

| 항목 | 벌점(대략) |
|---|---|
| 의무 휴무(+대체) 쿼터 **미달** | `부족일수 × 1000` |
| 쿼터 **초과** | `초과일수 × 400` |
| 하루 근무 인원 < `목표` / < `목표−1` | `× 120` / `× 600` |
| 하루 책임급 부족 / 점장·부점장 0명 | `× 500` / `400` |
| `floorCoverageOk` 위반 | `500` |
| subjob 조 전원 휴무 | `150` |
| 일자별 휴무 인원 분산 | `분산 × 45` |
| **연속 근무 5일 이상** | `초과일수 × 300` |
| 연속 근무 4일 | `25` |
| 휴무 몰림(간격 < minWorkGap) / 간격 분산 | `× 40` / `분산 × 12` |

→ 60회 중 최저 점수 결과를 채택. 유형 분류(일반/대체/연차) 후 `generatedLeaves` 에 저장(화면 표시).

---

## 4. 서버 API (`/apis/agentinfo`)

| 메서드 | 경로 | 설명 |
|---|---|---|
| GET | `/infos` | 직원 전체 목록 (`agent_informations`) |
| GET | `/count` | 직원 수 |
| POST | `/infos` | 직원 생성 |
| PATCH | `/infos/:id` | 직원 수정 |
| DELETE | `/infos/:id` | 직원 삭제 |
| **GET** | **`/schedule?month=YYYY-MM`** | 그 달의 확정 휴일/연차 전체. 응답 `{ leaves: [{ agentId, name, jobLevel, date, type }] }` (`type` ∈ `leave`/`annual`/`comp`) |
| **POST** | **`/schedule/confirm`** | body `{ scheduleMonth, entries: [{ agentId, leaveDates[], compLeaveDates[], annualLeaveDates[] }] }`. 인원별 해당 월 통째 교체 저장. 유형 판별 우선순위 `annual` > `comp` > `leave` |
| **GET** | **`/annual-leave/usage?month=YYYY-MM`** | 해당 연도 1월~그 달까지 **연차**(`leave_type='annual'`) 누계. 응답 `{ usage: { [agentId]: number } }` |
| **GET** | **`/settings`** | 앱 전역 설정. 응답 `{ settings: { subjob1, subjob2, essentialWork, ... } }` (값은 JSON 파싱됨) |
| **PUT** | **`/settings`** | body `{ [key]: value }` 각 키를 JSON 문자열로 upsert. 응답 `{ success, count }` |
| **POST** | **`/schedule/reset`** | `monthly_leaves` DROP&CREATE + 모든 직원 `description`/`annualleave`/`mandatory_workday` 비움. **`app_settings` 는 건드리지 않음.** 응답 `{ success, clearedAgents }` |

계층: `agentinfo.ctrl.ts` (요청/응답) → `service/agentinfo.ts` (검증·비즈니스 로직) → `model/agentinfoRepository.ts` (SQL). 오류는 `service/error.ts` 의 `BadRequestError(400)/NotFoundError(404)/ServerError(500)` → `apis/module/error.ts` 에서 JSON 변환.

**서버 기동 시 마이그레이션** (`main.ts` → `AgentinfoRepository.ensureAgentSchema()`): `agent_informations.mandatory_workday` 컬럼이 없으면 추가, `monthly_leaves.leave_type` ENUM 에 `'comp'` 가 없으면 `ALTER … MODIFY` 로 확장. `information_schema` 로 존재 여부 확인 후 실행(MySQL 5.7).

---

## 5. DB 테이블 동작 원리

### 5.1 `agent_informations` — 직원 마스터

| 컬럼 | 타입 | 비고 |
|---|---|---|
| `agent_information_id` | CHAR(36) PK | `UUID()` |
| `created_at` | TIMESTAMP | 서버 목록은 `created_at ASC`. 클라이언트가 받은 뒤 **직급 순으로 재정렬**해 표시 |
| `name` | varchar(20) | |
| `job_level` | varchar(20) | 직무 등급 8종 중 하나 |
| `description` | varchar(255) | **원하는 휴일** — `"YYYY-MM-DD, ..."` 콤마 문자열 (모든 달 섞여 저장) |
| `annualleave` | varchar(255) | **연차 신청** — 동일 형식 |
| `mandatory_workday` | varchar(255) DEFAULT `''` | **필수 근무일** — 동일 형식. (기존 DB 는 `ensureAgentSchema` 로 추가) |

- "스케줄·휴일 입력 초기화" 는 여기의 `description`, `annualleave`, `mandatory_workday` 만 `''` 로 비운다. `name`/`job_level` 은 유지.

### 5.1a `app_settings` — 앱 전역 설정 (키-값)

| 컬럼 | 타입 | 비고 |
|---|---|---|
| `setting_key` | VARCHAR(64) PK | `subjob1`, `subjob2`, `essentialWork` (필요 시 자유롭게 추가) |
| `setting_value` | TEXT | **JSON 문자열** (`["김","이"]`, `essentialWork` 은 `[8,6,1,3,2]` 등) |
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
| `leave_type` | ENUM('leave','annual','comp') | `annual` = 연차 신청일 / `comp` = 공휴일 근무 대체휴무 / `leave` = 일반. (기존 DB 는 `ensureAgentSchema` 로 ENUM 확장) |
| `confirmed_at` | TIMESTAMP | 저장/수정 시각 |
| — | UNIQUE `(agent_information_id, leave_date)` | 한 직원이 같은 날 두 번 못 들어감 |
| — | KEY `(schedule_month)` | 월별 조회 인덱스 |

이전 버전의 `monthly_schedules`(직원×월 한 행 + 콤마 문자열 + `annual_leave_count`) 는 폐기됨.
`resetMonthlyLeavesTable()` 이 `monthly_schedules` 도 함께 `DROP TABLE IF EXISTS` 로 정리한다.

### 5.3 확정 저장 = "그 달 그 직원 것 통째 교체" (`replaceAgentMonthLeaves`)

`POST /schedule/confirm` → 각 `entry` 마다:

1. `entry.annualLeaveDates` / `entry.compLeaveDates` → `annualSet` / `compSet` (대상 월·형식 검증 후 중복 제거)
2. `entry.leaveDates` ∪ `annualSet` ∪ `compSet` → `allDates` (연차·대체일도 휴무일로 포함)
3. 각 날짜 → `leaveType` = `annualSet.has` ? `'annual'` : `compSet.has` ? `'comp'` : `'leave'`
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
2. 표에서 직원별 원하는 휴일/연차/필수 근무일, 매장 필수조건, (필요 시) 전체·대체 휴일 입력 → 저장. (한국 공휴일은 자동)
3. **Generate** → `generateLeaveSchedule()` 60회 시도 → 최선안이 달력에 표시. 아직 서버 저장 안 됨.
4. 마음에 안 들면 다시 Generate (매번 다른 결과). 미세 수정은 달력에서 휴무를 **드래그**. 마음에 들면 **확정**.
5. 확정 → 인원별 `entries`(`leaveDates`/`compLeaveDates`/`annualLeaveDates`) 생성 → `POST /schedule/confirm { scheduleMonth:"2026-03", entries }`.
   - 서버: 각 직원의 `monthly_leaves` 에서 `schedule_month='2026-03'` 행 삭제 후 새로 INSERT.
6. 저장 성공 → 훅이 `GET /schedule?month=2026-03` + `GET /annual-leave/usage?month=2026-03` 재조회 → 달력은 저장본 표시, 표의 누적 연차 갱신.
7. 나중에 다시 3월로 오면 6번의 저장본이 그대로 달력에 뜬다. 4월로 가면 4월 저장본(있으면).

---

## 7. 알려진 제약 / 주의점

- **이름 기준 매칭**: `leaveList`/`annualLeaveList`/`mandatoryWorkList`/confirm entries 가 모두 직원 *이름* 으로 매칭된다. 동명이인이 있으면 꼬인다.
- `create_table.sql` 은 **DB 볼륨 최초 생성 시에만** 실행. 기존 DB 는 서버 기동 시 `ensureAgentSchema()` + "초기화" 버튼으로 스키마를 맞춘다.
- 확정 스케줄의 직무 색/이름은 **조회 시점의** `agent_informations` 값을 쓴다(과거 직무 스냅샷 없음).
- 생성 알고리즘은 백트래킹이 없다. **인원이 부족하면** 일부 인원이 의무 휴무일수·대체휴무를 다 못 받거나 목표 근무 인원을 못 맞출 수 있고, 그 경우 `scoreAttempt` 벌점이 큰 결과라도 60개 중 최선을 낸다. (예: 7인 매장에서 주말 목표 7명 = 주말 휴무 0 → 8일 채우기 불가)
- 하루 목표 휴무 인원은 평일/주말로 나뉜다(`N − workTargetOf(day)`).
- 달력 드래그 수정은 **확정 전(미리보기)** 에서만 가능. 확정 저장본은 다시 Generate 하거나 별도 이동 API(미구현) 필요.
- 서버 `agentinfoRepository` 의 일부 구(舊) 메서드(`getAgentinfoById` 등)는 `conn.release()` 가 빠져 있다(기존 코드). 신규 메서드에는 추가돼 있다.
