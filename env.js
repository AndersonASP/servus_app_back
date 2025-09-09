import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// Ajusta __dirname no ESModules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define ambiente atual
const env = process.env.NODE_ENV || "dev";

// Caminho do arquivo correto
const envPath = path.resolve(__dirname, `../servus-backend/env/.env.${env}`);

// Carrega o arquivo correspondente
dotenv.config({ path: envPath });

export const config = {
  env,
  port: process.env.PORT || 3000,
  mongoUri: process.env.MONGO_URI,
  jwtSecret: process.env.JWT_SECRET,
};