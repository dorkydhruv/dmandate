import * as os from "os";
import dotenv from "dotenv";

// Load environment variables from .env file if present
dotenv.config();

export interface MandateProcessorConfig {
  // How often to check for payable mandates (in milliseconds)
  checkInterval: number;

  // RPC URL for Solana connection
  rpcUrl: string;

  // The path to your keypair file for the payer
  keypairPath: string;

  // Program ID of the dmandate program
  programId: string;

  // Maximum number of mandates to process in one batch
  batchSize: number;

  // Buffer time in seconds to process a mandate before its exact due time
  bufferTime: number;

  // Log level (debug, info, warn, error)
  logLevel: string;

  // Whether to notify on successful payments (could integrate with external notification service)
  enableNotifications: boolean;
}

// Default configuration
const defaultConfig: MandateProcessorConfig = {
  checkInterval: 60000, // Every minute
  rpcUrl: "http://localhost:8899",
  keypairPath: `${os.homedir()}/.config/solana/id.json`,
  programId: "BXXJENjyLn4ZGYfkDpSxZ6Vt7TcxW7BQJgWaGiQGbfed",
  batchSize: 100,
  bufferTime: 60, // 60 seconds
  logLevel: "info",
  enableNotifications: false,
};

// Load config from environment
export const config: MandateProcessorConfig = {
  checkInterval:
    Number(process.env.CHECK_INTERVAL) || defaultConfig.checkInterval,
  rpcUrl: process.env.RPC_URL || defaultConfig.rpcUrl,
  keypairPath: process.env.KEYPAIR_PATH || defaultConfig.keypairPath,
  programId: process.env.PROGRAM_ID || defaultConfig.programId,
  batchSize: Number(process.env.BATCH_SIZE) || defaultConfig.batchSize,
  bufferTime: Number(process.env.BUFFER_TIME) || defaultConfig.bufferTime,
  logLevel: process.env.LOG_LEVEL || defaultConfig.logLevel,
  enableNotifications:
    process.env.ENABLE_NOTIFICATIONS === "true" ||
    defaultConfig.enableNotifications,
};

export default config;
