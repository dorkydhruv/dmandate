import { MandateProcessor } from "./mandate-processor";
import config from "./config";
import logger from "./utils/logger";

async function main() {
  try {
    logger.info("Starting DMandate Payment Processor");
    logger.info(
      `Configuration: Check interval = ${config.checkInterval}ms, RPC URL = ${config.rpcUrl}`
    );

    // Initialize and start the processor
    const processor = new MandateProcessor(config);
    await processor.start();

    // Handle graceful shutdown
    process.on("SIGINT", async () => {
      logger.info("Received SIGINT signal. Shutting down gracefully...");
      await processor.stop();
      process.exit(0);
    });

    process.on("SIGTERM", async () => {
      logger.info("Received SIGTERM signal. Shutting down gracefully...");
      await processor.stop();
      process.exit(0);
    });
  } catch (error: any) {
    logger.error(`Fatal error: ${error.message}`);
    process.exit(1);
  }
}

// Run the main function
main();
