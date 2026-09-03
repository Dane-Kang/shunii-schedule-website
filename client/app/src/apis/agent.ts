import instance from "./instance";

class AgentinfoHTTP {
  private instance = instance;

  async getAgentCount() {
    return await this.instance.get("/apis/agentinfo/count");
  }

  async getAgentinfo() {
    return await this.instance.get("/apis/agentinfo/infos");
  }

  async createAgentinfo(body: any) {
    return await this.instance.post("/apis/agentinfo/infos", body);
  }

  async updateAgentinfo(agentid:string, body: any) {
    return await this.instance.patch(`/apis/agentinfo/infos/${agentid}`, body);
  }

  async deleteAgentinfo(agentid:string, body: any) {
    return await this.instance.delete(`/apis/agentinfo/infos/${agentid}`, body);
  }

  async confirmMonthlySchedule(body: any) {
    return await this.instance.post("/apis/agentinfo/schedule/confirm", body);
  }

  async getAnnualLeaveUsage(year: string) {
    return await this.instance.get(`/apis/agentinfo/annual-leave/usage?year=${year}`);
  }
}

const agentAPI = new AgentinfoHTTP();

export default agentAPI;
