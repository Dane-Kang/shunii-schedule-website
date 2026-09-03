import { RowDataPacket } from 'mysql2';

export interface AgentinfoDto {
  name: string;
  joblevel: string;
  description: string;
  annualleave: string;
}

export interface AgentinfoEntity extends RowDataPacket {
  id: string;
  name: string;
  joblevel: string;
  description: string;
  annualleave: string;
}

export interface MonthlyScheduleDto {
  agentId: string;
  scheduleMonth: string; // 'YYYY-MM'
  leaveDates: string; // 콤마 구분 'YYYY-MM-DD'
  annualLeaveDates: string; // 콤마 구분 'YYYY-MM-DD'
  annualLeaveCount: number;
}

export interface ConfirmScheduleBody {
  scheduleMonth: string;
  entries: {
    agentId: string;
    leaveDates: string[];
    annualLeaveDates: string[];
  }[];
}

export interface AnnualLeaveUsageEntity extends RowDataPacket {
  agent_information_id: string;
  used: number;
}