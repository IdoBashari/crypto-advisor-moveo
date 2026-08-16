import express from "express";
import cors from "cors";
import "dotenv/config";
import healthRouter from "./routes/health.js";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.use("/health", healthRouter);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
