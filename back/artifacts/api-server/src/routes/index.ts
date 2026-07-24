import { Router, type IRouter } from "express";
import healthRouter from "./health";
import farmRouter from "./farm";
import openaiRouter from "./openai";
import agriDoctorRouter from "./agri-doctor";
import marketplaceRouter from "./marketplace";
import equipmentRouter from "./equipment";
import hireRouter from "./hire";
import adsRouter from "./ads";
import managerRouter from "./manager";
import errorsRouter from "./errors";

const router: IRouter = Router();

router.use(healthRouter);
router.use(farmRouter);
router.use(openaiRouter);
router.use(agriDoctorRouter);
router.use(marketplaceRouter);
router.use(equipmentRouter);
router.use(hireRouter);
router.use(adsRouter);
router.use(managerRouter);
router.use(errorsRouter);

export default router;
