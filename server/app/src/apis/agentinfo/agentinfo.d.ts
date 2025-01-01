import { RowDataPacket } from 'mysql2';

export interface AgentinfoDto {
  name: string;
  joblevel: string;
  description: string;
}

export interface AgentinfoEntity extends RowDataPacket {
  id: string;
  name: string;
  joblevel: string;
  description: string;
}