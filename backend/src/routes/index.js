import { Router } from "express";
import activitiesRouter from "./activities.routes.js";
import authRouter from "./auth.routes.js";
import blocksRouter from "./blocks.routes.js";
import certificatesRouter from "./certificates.routes.js";
import coursesRouter from "./courses.routes.js";
import enrollmentsRouter from "./enrollments.routes.js";
import gradesRouter from "./grades.routes.js";
import organizationsRouter from "./organizations.routes.js";
import progressRouter from "./progress.routes.js";
import reportsRouter from "./reports.routes.js";
import settingsRouter from "./settings.routes.js";
import topicsRouter from "./topics.routes.js";
import usersRouter from "./users.routes.js";

const router = Router();

router.use("/auth", authRouter);
router.use("/users", usersRouter);
router.use("/organizations", organizationsRouter);
router.use("/courses", coursesRouter);
router.use("/blocks", blocksRouter);
router.use("/topics", topicsRouter);
router.use("/activities", activitiesRouter);
router.use("/enrollments", enrollmentsRouter);
router.use("/progress", progressRouter);
router.use("/grades", gradesRouter);
router.use("/certificates", certificatesRouter);
router.use("/reports", reportsRouter);
router.use("/settings", settingsRouter);

export default router;
