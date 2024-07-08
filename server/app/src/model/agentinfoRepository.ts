import { OkPacket, ResultSetHeader, RowDataPacket } from 'mysql2';
import {
  AgentinfoEntity, AgentinfoDto,
} from '../apis/agentinfo/agentinfo';
import db from '../config/db';
import { ServerError } from '../service/error';

class AgentinfoRepository {

  async createAgent({
    name,
    joblevel,
    description,
  }: AgentinfoDto): Promise<number> {
    let conn;
    try {
      conn = await db.getConnection();

      const query = `
        INSERT INTO agent_informations (name, job_level, description) 
        VALUES (?, ?, ?);`;

      const [row] = await conn.execute<ResultSetHeader>(query, [
        name,
        joblevel,
        description,
      ]);

      return row.insertId;
    } catch (error) {
      throw new ServerError('Database Error Occurred');
    } finally {
      conn?.release();
    }
  }

  async getAgentinfoById(
    agentId: number
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
    agentId: number,
    name: string,
    joblevel: string,
    description: string
  ): Promise<number> {
    let conn;
    try {
      conn = await db.getConnection();

      const query = `UPDATE agent_informations SET name = ?, job_level = ?, description = ? WHERE agent_information_id = ?`;

      const [row] = await conn.execute<OkPacket>(query, [
        name,
        joblevel,
        description,
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
        SELECT agent_information_id AS id, name, job_level, description FROM agent_informations;`;

      const [row] = await conn.execute<AgentinfoEntity[]>(query);

      return row;
    } catch (error) {
      throw new ServerError('Database Error Occurred');
    }
  }

  async deleteAgentinfoById(id: number): Promise<number> {
    let conn;
    try {
      conn = await db.getConnection();

      const query = 'DELETE FROM agent_informations WHERE agent_information_id=?;';

      const [row] = await conn.execute<OkPacket>(query, [id]);

      return row.affectedRows;
    } catch (error) {
      throw new ServerError('Database Error Occurred');
    }
  }
}

export default AgentinfoRepository;
