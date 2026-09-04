import { OkPacket, ResultSetHeader, RowDataPacket } from 'mysql2';
import {
  AgentinfoEntity, AgentinfoDto, MonthlyLeaveDto, MonthlyLeaveRow, AnnualLeaveUsageEntity,
} from '../apis/agentinfo/agentinfo';
import db from '../config/db';
import { ServerError } from '../service/error';

class AgentinfoRepository {

  async createAgent({
    name,
    joblevel,
    description,
    annualleave,
  }: AgentinfoDto): Promise<string> {
    let conn;
    try {
      conn = await db.getConnection();
      console.log("enter createAgent");

      const query = `
        INSERT INTO agent_informations (agent_information_id, name, job_level, description, annualleave) 
        VALUES (UUID(), ?, ?, ?, ?);`;

      const [row] = await conn.execute<ResultSetHeader>(query, [
        name,
        joblevel,
        description,
        annualleave,
      ]);

      return "true";
    } catch (error) {
      throw new ServerError('Database Error Occurred');
    } finally {
      conn?.release();
    }
  }

  async getAgentinfoById(
    agentId: string
  ): Promise<AgentinfoEntity> {
    let conn;
    try {
      conn = await db.getConnection();

      const query = `SELECT * FROM agent_informations WHERE agent_information_id = ?;`;

      const [row] = await conn.execute<AgentinfoEntity[]>(query, [
        agentId,
      ]);

      return row[0];
    } catch (error) {
      throw new ServerError('Database Error Occurred');
    }
  }

  async updateAgentinfo(
    agentId: string,
    name: string,
    joblevel: string,
    description: string,
    annualleave: string
  ): Promise<number> {
    let conn;
    try {
      conn = await db.getConnection();

      const query = `UPDATE agent_informations SET name = ?, job_level = ?, description = ?, annualleave = ? WHERE agent_information_id = ?`;

      const [row] = await conn.execute<OkPacket>(query, [
        name,
        joblevel,
        description,
        annualleave,
        agentId,
      ]);

      return row.affectedRows;
    } catch (error) {
      throw new ServerError('Database Error Occurred');
    }
  }

  async getAgentCount(): Promise<number> {
    let conn;
    try {
      conn = await db.getConnection();

      const query = `
        SELECT COUNT(*) AS row_count FROM agent_informations;`;

        const [rows]: [any[], any] = await conn.execute(query);

        return rows[0].row_count;
    } catch (error) {
      throw new ServerError('Database Error Occurred');
    }
  }

  async getAgentinfos(): Promise<AgentinfoEntity[]> {
    let conn;
    try {
      conn = await db.getConnection();

      const query = `
        SELECT agent_information_id AS id, name, job_level, description, annualleave FROM agent_informations ORDER BY created_at ASC;`;

      const [row] = await conn.execute<AgentinfoEntity[]>(query);

      return row;
    } catch (error) {
      throw new ServerError('Database Error Occurred');
    }
  }

  async deleteAgentinfoById(id: string): Promise<number> {
    let conn;
    try {
      conn = await db.getConnection();

      const query = 'DELETE FROM agent_informations WHERE agent_information_id=?;';

      const [row] = await conn.execute<OkPacket>(query, [id]);

      return row.affectedRows;
    } catch (error) {
      throw new ServerError('Database Error Occurred');
    } finally {
      conn?.release();
    }
  }

  // 한 직원의 특정 월 확정 휴일/연차를 통째로 교체 (기존 행 삭제 후 재삽입)
  async replaceAgentMonthLeaves(
    agentId: string,
    scheduleMonth: string,
    rows: MonthlyLeaveDto[]
  ): Promise<void> {
    let conn;
    try {
      conn = await db.getConnection();
      await conn.beginTransaction();

      await conn.execute(
        'DELETE FROM monthly_leaves WHERE agent_information_id = ? AND schedule_month = ?;',
        [agentId, scheduleMonth]
      );

      if (rows.length > 0) {
        const placeholders = rows.map(() => '(UUID(), ?, ?, ?, ?)').join(', ');
        const params = rows.flatMap((r) => [
          r.agentId,
          r.scheduleMonth,
          r.leaveDate,
          r.leaveType,
        ]);
        await conn.query(
          `INSERT INTO monthly_leaves
             (monthly_leave_id, agent_information_id, schedule_month, leave_date, leave_type)
           VALUES ${placeholders};`,
          params
        );
      }

      await conn.commit();
    } catch (error) {
      await conn?.rollback();
      throw new ServerError('Database Error Occurred');
    } finally {
      conn?.release();
    }
  }

  // 특정 월('YYYY-MM')의 확정 휴일/연차 전체 (직원 이름/직무 포함)
  async getMonthlyLeaves(scheduleMonth: string): Promise<MonthlyLeaveRow[]> {
    let conn;
    try {
      conn = await db.getConnection();

      const query = `
        SELECT
          ml.agent_information_id AS agentId,
          a.name AS name,
          a.job_level AS jobLevel,
          DATE_FORMAT(ml.leave_date, '%Y-%m-%d') AS date,
          ml.leave_type AS type
        FROM monthly_leaves ml
        JOIN agent_informations a ON a.agent_information_id = ml.agent_information_id
        WHERE ml.schedule_month = ?
        ORDER BY ml.leave_date ASC, a.name ASC;`;

      const [rows] = await conn.execute<MonthlyLeaveRow[]>(query, [scheduleMonth]);

      return rows;
    } catch (error) {
      throw new ServerError('Database Error Occurred');
    } finally {
      conn?.release();
    }
  }

  // monthly_leaves 테이블을 통째로 DROP 후 재생성 (구 monthly_schedules 도 정리)
  async resetMonthlyLeavesTable(): Promise<void> {
    let conn;
    try {
      conn = await db.getConnection();

      await conn.query('DROP TABLE IF EXISTS `monthly_schedules`;');
      await conn.query('DROP TABLE IF EXISTS `monthly_leaves`;');
      await conn.query(`
        CREATE TABLE \`monthly_leaves\` (
          \`monthly_leave_id\` CHAR(36) NOT NULL,
          \`agent_information_id\` CHAR(36) NOT NULL,
          \`schedule_month\` CHAR(7) NOT NULL,
          \`leave_date\` DATE NOT NULL,
          \`leave_type\` ENUM('leave', 'annual') NOT NULL DEFAULT 'leave',
          \`confirmed_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          PRIMARY KEY (\`monthly_leave_id\`),
          UNIQUE KEY \`uq_agent_date\` (\`agent_information_id\`, \`leave_date\`),
          KEY \`idx_schedule_month\` (\`schedule_month\`)
        );`);
    } catch (error) {
      throw new ServerError('Database Error Occurred');
    } finally {
      conn?.release();
    }
  }

  // 모든 직원의 '원하는 휴일'(description) / '연차 신청'(annualleave) 입력값만 비움 (이름/직무는 유지)
  async clearAgentLeaveInputs(): Promise<number> {
    let conn;
    try {
      conn = await db.getConnection();

      const query = `UPDATE agent_informations SET description = '', annualleave = '';`;

      const [row] = await conn.execute<OkPacket>(query);

      return row.affectedRows;
    } catch (error) {
      throw new ServerError('Database Error Occurred');
    } finally {
      conn?.release();
    }
  }

  // 해당 연도 1월부터 지정한 달('YYYY-MM')까지의 인원별 누적 사용 연차 수
  async getAnnualLeaveUsageUpToMonth(
    month: string
  ): Promise<AnnualLeaveUsageEntity[]> {
    let conn;
    try {
      conn = await db.getConnection();

      const year = month.slice(0, 4);

      const query = `
        SELECT agent_information_id, COUNT(*) AS used
        FROM monthly_leaves
        WHERE leave_type = 'annual'
          AND schedule_month >= ?
          AND schedule_month <= ?
        GROUP BY agent_information_id;`;

      const [rows] = await conn.execute<AnnualLeaveUsageEntity[]>(query, [
        `${year}-01`,
        month,
      ]);

      return rows;
    } catch (error) {
      throw new ServerError('Database Error Occurred');
    } finally {
      conn?.release();
    }
  }
}

export default AgentinfoRepository;
