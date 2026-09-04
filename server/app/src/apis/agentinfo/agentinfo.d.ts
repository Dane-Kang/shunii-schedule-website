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

export type LeaveType = 'leave' | 'annual';

export interface MonthlyLeaveDto {
  agentId: string;
  scheduleMonth: string; // 'YYYY-MM'
  leaveDate: string; // 'YYYY-MM-DD'
  leaveType: LeaveType;
}

export interface ConfirmScheduleBody {
  scheduleMonth: string;
  entries: {
    agentId: string;
    leaveDates: string[];
    annualLeaveDates: string[];
  }[];
}

export interface MonthlyLeaveRow extends RowDataPacket {
  agentId: string;
  name: string;
  jobLevel: string;
  date: string; // 'YYYY-MM-DD'
  type: LeaveType;
}

export interface AnnualLeaveUsageEntity extends RowDataPacket {
  agent_information_id: string;
  used: number;
}