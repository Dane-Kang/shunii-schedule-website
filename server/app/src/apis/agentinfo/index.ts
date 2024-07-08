import * as express from 'express';
import agentinfoCtrl from './agentinfo.ctrl';
import validationCheck from '../middlewares/validationCheck';
const router: express.Router = express.Router();

router.get('/count', agentinfoCtrl.getAgentCount);
router.get('/infos', agentinfoCtrl.getAgentinfos);
console.log('agentinfo index');
export default router;
