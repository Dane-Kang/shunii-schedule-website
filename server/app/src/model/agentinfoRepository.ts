import { OkPacket, ResultSetHeader, RowDataPacket } from 'mysql2';
import {
  AgentinfoEntity, AgentinfoDto, MonthlyScheduleDto, AnnualLeaveUsageEntity,
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

  // 인원 x 월 별 한 행 upsert (재확정 시 덮어씀)
  async upsertMonthlySchedule({
    agentId,
    scheduleMonth,
    leaveDates,
    annualLeaveDates,
    annualLeaveCount,
  }: MonthlyScheduleDto): Promise<void> {
    let conn;
    try {
      conn = await db.getConnection();

      const query = `
        INSERT INTO monthly_schedules
          (monthly_schedule_id, agent_information_id, schedule_month, leave_dates, annual_leave_dates, annual_leave_count)
        VALUES (UUID(), ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          leave_dates = VALUES(leave_dates),
          annual_leave_dates = VALUES(annual_leave_dates),
          annual_leave_count = VALUES(annual_leave_count);`;

      await conn.execute<ResultSetHeader>(query, [
        agentId,
        scheduleMonth,
        leaveDates,
        annualLeaveDates,
        annualLeaveCount,
      ]);
    } catch (error) {
      throw new ServerError('Database Error Occurred');
    } finally {
      conn?.release();
    }
  }

  // 특정 연도(예: '2026')의 인원별 누적 사용 연차 수
  async getAnnualLeaveUsageByYear(
    year: string
  ): Promise<AnnualLeaveUsageEntity[]> {
    let conn;
    try {
      conn = await db.getConnection();

      const query = `
        SELECT agent_information_id, COALESCE(SUM(annual_leave_count), 0) AS used
        FROM monthly_schedules
        WHERE schedule_month LIKE ?
        GROUP BY agent_information_id;`;

      const [rows] = await conn.execute<AnnualLeaveUsageEntity[]>(query, [
        `${year}-%`,
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
