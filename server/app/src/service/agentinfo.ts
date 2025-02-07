import { AgentinfoDto, AgentinfoEntity } from '../apis/agentinfo/agentinfo';
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
