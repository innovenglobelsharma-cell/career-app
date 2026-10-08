import { Router, type IRouter } from "express";
import healthRouter from "./health";
import interviewEmailRouter from "./interview-email";
import authRouter from "./auth";
import jobsRouter from "./jobs";
import applicationsRouter from "./applications";
import messagesRouter from "./messages";

const router: IRouter = Router();

router.use(healthRouter);
router.use(interviewEmailRouter);
router.use(authRouter);
router.use(jobsRouter);
router.use(applicationsRouter);
router.use(messagesRouter);

export default router;
