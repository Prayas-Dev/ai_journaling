// backend/server.ts
import dotenv from "dotenv";
dotenv.config({ path: "src/config/.env" }); // Adjust path if necessary

import app from "./app";
import cors from "cors";

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
