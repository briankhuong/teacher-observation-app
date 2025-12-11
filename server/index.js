// server/index.js
import dotenv from "dotenv";
dotenv.config({ path: ".env.azure" });

import express from "express";
import cors from "cors";
import ocrAzureRoute from "./ocrAzureRoute.js";

const app = express();

// Allow your Vite frontend to talk to this server
app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: false,
  })
);

app.use(express.json());

// OCR endpoint (The only thing this server does now)
app.use(ocrAzureRoute);

const PORT = process.env.OCR_SERVER_PORT || 4000;

app.listen(PORT, () => {
  console.log(`OCR server running at http://localhost:${PORT}`);
});