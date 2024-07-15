import { Request, Response } from 'express';
import Agentinfo from '../../service/agentinfo';
import AgentinfoRepository from '../../model/agentinfoRepository';
import { BadRequestError } from '../../service/error';
import errorResposne from '../module/error';

const createAgentinfo = async (req: Request, res: Response) => {
  const RequestAgentinfo = Object.assign(req.body);

  try {
    console.log('Enter createAgentinfo');
    if (RequestAgentinfo.name?.length === 0)
      req.body.name = '익명';

    const agentinfo = new Agentinfo(new AgentinfoRepository(), RequestAgentinfo);

    const response = await agentinfo.createAgent();

    if (response)
      return res.status(201).json({
        statusCode: 201,
        commentId: response,
        msg: 'Successful Agent info creation',
      });
  } catch (err) {
    return errorResposne(err, res);
  }
};

const updateAgentinfoById = async (req: Request, res: Response) => {
  const { id: AgentId } = req.params;

  const RequestAgentinfo = Object.assign(req.body);

  try {
    console.log('Enter updateAgentinfoById');
    const agentinfo = new Agentinfo(new AgentinfoRepository(), RequestAgentinfo);

    const response = await agentinfo.updateAgentinfoById(Number(AgentId));

    if (!response.success)
      return res.status(401).json({ statusCode: 401, msg: response.msg });
    return res.status(200).json({ statusCode: 200, msg: response.msg });
  } catch (err) {
    return errorResposne(err, res);
  }
};

const getAgentCount = async (req: Request, res: Response) => {
  try {
    console.log('Enter getAgentCount');
    const agentinfo = new Agentinfo(new AgentinfoRepository());
    const response = await agentinfo.getAgentCount();

    return res.status(200).json({ statusCode: 200, response });
  } catch (err) {
    return errorResposne(err, res);
  }
};

const getAgentinfos = async (req: Request, res: Response) => {
  try {
    console.log('Enter getAgentinfos');
    const agentinfo = new Agentinfo(new AgentinfoRepository());

    const response = await agentinfo.getAgentinfos();

    return res.status(200).json({ statusCode: 200, ...response });
  } catch (err) {
    return errorResposne(err, res);
  }
};

const deleteAgentinfoById = async (req: Request, res: Response) => {
  try {
    console.log('Enter deleteAgentinfoById');
    const AgentId = req.params.id;

    if (!AgentId) throw new BadRequestError('id params is undefined');

    const agentinfo = new Agentinfo(new AgentinfoRepository());

    const response = await agentinfo.deleteAgentinfoById(
      Number(AgentId)
    );

    if (response)
      return res.status(200).json({
        statusCode: 200,
        msg: 'Successful deletion of visitor comment',
      });
  } catch (err) {
    return errorResposne(err, res);
  }
};

export = {
  createAgentinfo,
  updateAgentinfoById,
  getAgentCount,
  getAgentinfos,
  deleteAgentinfoById,
};
