// server/index.js
require("dotenv").config({ path: ".env.azure" });

const express = require("express");
const cors = require("cors");
const ocrAzureRoute = require("./ocrAzureRoute");

const app = express();

// Allow your front-end dev server to call this API
app.use(
  cors({
    origin: "http://localhost:5173", // or 3000 if you use CRA
    credentials: false,
  })
);

app.use(ocrAzureRoute);

const PORT = process.env.OCR_SERVER_PORT || 4000;

app.listen(PORT, () => {
  console.log(`OCR server listening on http://localhost:${PORT}`);
});
