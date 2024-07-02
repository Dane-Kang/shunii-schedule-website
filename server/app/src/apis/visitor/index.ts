import * as express from 'express';
import visitorCtrl from './visitor.ctrl';
import validationCheck from '../middlewares/validationCheck';
const router: express.Router = express.Router();

router.patch('/count', visitorCtrl.updateAndGetVisitor);

/** 설정된 API 순서대로 실행됨, validationCheck 먼저 실행되고 그다음 visitorCtrl.createVisitComment 이 실행됨. */
router.post('/comment', validationCheck, visitorCtrl.createVisitComment);

router.get('/comments', visitorCtrl.getVisitorComments);
router.delete('/comment/:id', visitorCtrl.deleteVisitorCommentById);
router.patch(
  '/comment/:id',
  validationCheck,
  visitorCtrl.updateVisitCommentById
);

export default router;
