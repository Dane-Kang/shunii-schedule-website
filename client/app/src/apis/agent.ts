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
}

const agentAPI = new AgentinfoHTTP();

export default agentAPI;
