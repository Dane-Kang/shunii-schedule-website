import { RowDataPacket } from 'mysql2';

export interface AgentinfoDto {
  nickname: string;
  joblevel: string;
  description: string;
}

export interface AgentinfoEntity extends RowDataPacket {
  id: number;
  nickname: string;
  joblevel: string;
  description: string;
}