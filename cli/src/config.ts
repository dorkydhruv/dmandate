import fs from "fs";
import os from "os";
import path from "path";

/**
 * Interface for dmandate CLI configuration
 */
interface Config {
  // Network: mainnet, testnet, devnet, localnet
  network: string;

  // Path to wallet keypair
  keypairPath: string;

  // Current authenticated user
  currentUser?: {
    name: string;
    publicKey: string;
    userPda: string;
  };

  // Saved mandates for quick reference
  mandates?: Array<{
    pda: string;
    payee: string;
    token: string;
    amount: string;
    name: string;
  }>;
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: Config = {
  network: "devnet",
  keypairPath: "~/.config/solana/id.json",
};

export class ConfigManager {
  private configDir: string;
  private configPath: string;

  constructor() {
    this.configDir = path.join(os.homedir(), ".config", "dmandate");
    this.configPath = path.join(this.configDir, "config.json");
    this.ensureConfigExists();
  }

  /**
   * Make sure config directory and file exist
   */
  private ensureConfigExists(): void {
    // Create config directory if it doesn't exist
    if (!fs.existsSync(this.configDir)) {
      fs.mkdirSync(this.configDir, { recursive: true });
    }

    // Create config file with default values if it doesn't exist
    if (!fs.existsSync(this.configPath)) {
      fs.writeFileSync(
        this.configPath,
        JSON.stringify(DEFAULT_CONFIG, null, 2)
      );
    }
  }

  /**
   * Get the current config
   */
  public getConfig(): Config {
    try {
      const configData = fs.readFileSync(this.configPath, "utf-8");
      const config = JSON.parse(configData) as Config;
      return config;
    } catch (error) {
      console.error("Error reading config file, using defaults", error);
      return DEFAULT_CONFIG;
    }
  }

  /**
   * Update config with new values
   */
  public updateConfig(newValues: Partial<Config>): void {
    try {
      const currentConfig = this.getConfig();
      const updatedConfig = { ...currentConfig, ...newValues };
      fs.writeFileSync(this.configPath, JSON.stringify(updatedConfig, null, 2));
    } catch (error) {
      console.error("Error updating config file", error);
    }
  }

  /**
   * Reset config to default values
   */
  public resetConfig(): void {
    try {
      fs.writeFileSync(
        this.configPath,
        JSON.stringify(DEFAULT_CONFIG, null, 2)
      );
      console.log("Configuration reset to defaults");
    } catch (error) {
      console.error("Error resetting config file", error);
    }
  }
}
