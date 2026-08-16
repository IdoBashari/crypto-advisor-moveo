import express from "express";
import cors from "cors";
import "dotenv/config";
import healthRouter from "./routes/health.js";

const app = express();
const PORT = process.env.PORT || 3000;

const allowlist = (process.env.CLIENT_ORIGIN ?? "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

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

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
