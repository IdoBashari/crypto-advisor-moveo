import { Router } from "express";
import { pingDb } from "../db.js";

const router = Router();

router.get("/", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

router.get("/db", async (_req, res) => {
  try {
    await pingDb();
    res.json({ status: "ok", db: "connected" });
  } catch (err) {
    console.error(err);
    res.status(503).json({ status: "error", db: "unreachable" });
  }
});

export default router;
