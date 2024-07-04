import instance from "./instance";

class AgentinfoHTTP {
  private instance = instance;

  async getAgentinfo() {
    return await this.instance.get("/apis/agent/infos");
  }

  async createAgentinfo(body: any) {
    return await this.instance.post("/apis/agent/infos", body);
  }
}

const agentAPI = new AgentinfoHTTP();

export default agentAPI;
