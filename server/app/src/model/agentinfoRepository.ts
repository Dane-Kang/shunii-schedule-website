import { OkPacket, ResultSetHeader, RowDataPacket } from 'mysql2';
import {
  AgentinfoEntity, AgentinfoDto,
} from '../apis/agentinfo/agentinfo';
import db from '../config/db';
import { ServerError } from '../service/error';

class AgentinfoRepository {

  async createAgent({
    nickname,
    joblevel,
    description,
  }: AgentinfoDto): Promise<number> {
    let conn;
    try {
      conn = await db.getConnection();

      const query = `
        INSERT INTO agent_informations (nickname, joblevel, description) 
        VALUES (?, ?, ?);`;

      const [row] = await conn.execute<ResultSetHeader>(query, [
        nickname,
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
    nickname: string,
    joblevel: string,
    description: string
  ): Promise<number> {
    let conn;
    try {
      conn = await db.getConnection();

      const query = `UPDATE agent_informations SET nickname = ?, joblevel = ?, description = ? WHERE agent_information_id = ?`;

      const [row] = await conn.execute<OkPacket>(query, [
        nickname,
        joblevel,
        description,
        agentId,
      ]);

      return row.affectedRows;
    } catch (error) {
      throw new ServerError('Database Error Occurred');
    }
  }

  async getAgentinfos(): Promise<AgentinfoEntity[]> {
    let conn;
    try {
      conn = await db.getConnection();

      const query = `
        SELECT agent_information_id AS id, nickname, joblevel, description FROM agent_informations;`;

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
