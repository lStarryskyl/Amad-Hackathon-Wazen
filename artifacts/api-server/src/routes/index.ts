import { Router, type IRouter } from "express";
import healthRouter from "./health";
import profileRouter from "./profile";
import accountsRouter from "./accounts";
import connectionsRouter from "./connections";
import transactionsRouter from "./transactions";
import categoriesRouter from "./categories";
import goalsRouter from "./goals";
import consentRouter from "./consent";
import onboardingRouter from "./onboarding";
import summaryRouter from "./summary";
import aiRouter from "./ai";
import intelligenceRouter from "./intelligence";
import simulationsRouter from "./simulations";
import engagementRouter from "./engagement";
import devResetRouter from "./devReset";
import adminRouter from "./admin";

const router: IRouter = Router();

router.use(healthRouter);
router.use(profileRouter);
router.use(accountsRouter);
router.use(connectionsRouter);
router.use(transactionsRouter);
router.use(categoriesRouter);
router.use(goalsRouter);
router.use(consentRouter);
router.use(onboardingRouter);
router.use(summaryRouter);
router.use(aiRouter);
router.use(intelligenceRouter);
router.use(simulationsRouter);
router.use(engagementRouter);
router.use(devResetRouter);
router.use(adminRouter);

export default router;
