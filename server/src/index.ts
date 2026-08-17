// Imported first and before the app is constructed: this validates the
// environment on import, so a missing variable fails the boot.
import { env } from "./config/env.js";

import express from "express";
import cors from "cors";
import healthRouter from "./routes/health.js";
import authRouter from "./routes/auth.routes.js";
import preferencesRouter from "./preferences/preferences.routes.js";
import pricesRouter from "./prices/prices.routes.js";
import votesRouter from "./votes/votes.routes.js";

const app = express();
const PORT = env.port;

const allowlist = env.clientOrigins;

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowlist.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
  }),
);
app.use(express.json());

app.use("/health", healthRouter);
app.use("/auth", authRouter);
app.use("/preferences", preferencesRouter);
app.use("/prices", pricesRouter);
app.use("/votes", votesRouter);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
