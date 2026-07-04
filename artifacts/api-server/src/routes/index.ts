import { Router, type IRouter } from "express";
import healthRouter from "./health";
import profileRouter from "./profile";
import accountsRouter from "./accounts";
import transactionsRouter from "./transactions";
import categoriesRouter from "./categories";
import goalsRouter from "./goals";
import consentRouter from "./consent";
import onboardingRouter from "./onboarding";
import summaryRouter from "./summary";
import aiRouter from "./ai";
import regretScoreRouter from "./regretScore";
import rescuePlansRouter from "./rescuePlans";
import moneyStoryRouter from "./moneyStory";

const router: IRouter = Router();

router.use(healthRouter);
router.use(profileRouter);
router.use(accountsRouter);
router.use(transactionsRouter);
router.use(categoriesRouter);
router.use(goalsRouter);
router.use(consentRouter);
router.use(onboardingRouter);
router.use(summaryRouter);
router.use(aiRouter);
router.use(regretScoreRouter);
router.use(rescuePlansRouter);
router.use(moneyStoryRouter);

export default router;
