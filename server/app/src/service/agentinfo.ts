import {
  AgentinfoDto,
  AgentinfoEntity,
  ConfirmScheduleBody,
} from '../apis/agentinfo/agentinfo';
import AgentinfoRepository from '../model/agentinfoRepository';
import { BadRequestError, NotFoundError, ServerError } from './error';

interface Response {
  success: boolean;
  msg: string;
}

class Agentinfo {
  private readonly agentinfoRepository: AgentinfoRepository;
  readonly body;
  constructor(agentinfoRepository: AgentinfoRepository, body?: any) {
    this.agentinfoRepository = agentinfoRepository;
    this.body = body;
  }

  async createAgent(): Promise<string> {
    const { body } = this;

    const agentdata: AgentinfoDto = {
      name: body.name,
      joblevel: body.joblevel,
      description: body.description,
      annualleave: body.annualleave,
    };

    const commentId = await this.agentinfoRepository.createAgent(
      agentdata
    );

    if (commentId) return commentId;
    throw new ServerError('Interver Server Error');
  }
  
  async updateAgentinfoById(agentinfoId: string): Promise<Response> {
    const { name, joblevel, description, annualleave }: AgentinfoDto = this.body;

    const agentinfo = await this.agentinfoRepository.getAgentinfoById(
      agentinfoId
    );

    if (!agentinfo) throw new NotFoundError('No data exists');

    await this.agentinfoRepository.updateAgentinfo(
      agentinfoId,
      name,
      joblevel,
      description,
      annualleave
    );

    return { success: true, msg: 'Visitor comment update complete' };
  }

  async getAgentCount(): Promise<number> {
    const agentcount = await this.agentinfoRepository.getAgentCount();

    return agentcount;
  }

  async getAgentinfos(): Promise<{ agentinfos: AgentinfoEntity[] }> {
    const agentinfos = await this.agentinfoRepository.getAgentinfos();

    return { agentinfos };
  }

  // 월 스케줄 확정: 인원별 확정 휴무/연차를 저장(덮어쓰기)
  async confirmMonthlySchedule(
    body: ConfirmScheduleBody
  ): Promise<{ success: boolean; count: number }> {
    const { scheduleMonth, entries } = body;

    if (!/^\d{4}-\d{2}$/.test(scheduleMonth ?? ''))
      throw new BadRequestError('scheduleMonth must be "YYYY-MM"');
    if (!Array.isArray(entries) || entries.length === 0)
      throw new BadRequestError('entries must be a non-empty array');

    const inMonth = (d: string) => d.startsWith(`${scheduleMonth}-`);
    const clean = (arr: unknown): string[] =>
      Array.isArray(arr)
        ? [...new Set(arr.map((v) => String(v).trim()).filter((v) => /^\d{4}-\d{2}-\d{2}$/.test(v) && inMonth(v)))]
        : [];

    for (const entry of entries) {
      if (!entry.agentId) throw new BadRequestError('entry.agentId is required');

      const leaveDates = clean(entry.leaveDates);
      const annualLeaveDates = clean(entry.annualLeaveDates);

      await this.agentinfoRepository.upsertMonthlySchedule({
        agentId: entry.agentId,
        scheduleMonth,
        leaveDates: leaveDates.join(','),
        annualLeaveDates: annualLeaveDates.join(','),
        annualLeaveCount: annualLeaveDates.length,
      });
    }

    return { success: true, count: entries.length };
  }

  // 특정 연도의 인원별 누적 사용 연차 수
  async getAnnualLeaveUsage(
    year: string
  ): Promise<{ usage: { [agentId: string]: number } }> {
    if (!/^\d{4}$/.test(year ?? ''))
      throw new BadRequestError('year must be "YYYY"');

    const rows = await this.agentinfoRepository.getAnnualLeaveUsageByYear(year);

    const usage: { [agentId: string]: number } = {};
    rows.forEach((r) => {
      usage[r.agent_information_id] = Number(r.used) || 0;
    });

    return { usage };
  }

  async deleteAgentinfoById(agentinfoId: string): Promise<boolean> {
    const agentdata = await this.agentinfoRepository.getAgentinfoById(
      agentinfoId
    );

    if (!agentdata) throw new NotFoundError('No data exists');

    const isDelete = await this.agentinfoRepository.deleteAgentinfoById(
      agentinfoId
    );

    if (isDelete) return true;
    throw new ServerError('Interver Server Error');
  }
}
export default Agentinfo;
