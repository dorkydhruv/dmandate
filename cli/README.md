# dmandate CLI Tool

A command-line interface for interacting with the dmandate Solana program.

## Installation

```bash
# Install dependencies
npm install

# Build the CLI
npm run build

# Create a symlink to use the CLI globally (optional)
npm link
```

## Configuration

Before using the CLI, set up your configuration:

```bash
# Set the Solana network (devnet, testnet, mainnet, or localnet)
dmandate set-network devnet

# Set your keypair file
dmandate set-keypair ~/.config/solana/id.json

# View your current configuration
dmandate config
```

## Usage

### User Management

Register a new user:

```bash
dmandate register-user "Your Name" --save
```

View user subscriptions:

```bash
dmandate get-user-subscriptions
```

### Mandate Management

Create a new payment mandate:

```bash
dmandate create-mandate <PAYEE_PUBKEY> <TOKEN_MINT> <AMOUNT> <FREQUENCY_SECONDS> "Mandate Name" "Description"

# Example:
dmandate create-mandate 5YNmS1R9nNSCDwYfFEXKQaHfRrPpBU3VyEFkdKSYqCErc UsJ4baBMgrkGQG2j3HyxKdYCdKWCXWFM1rqXJPcTrZ8 10000 86400 "Netflix" "Monthly subscription"
```

Reapprove a mandate with new amount:

```bash
dmandate reapprove-mandate <MANDATE_PDA> <NEW_AMOUNT>
```

Cancel a mandate:

```bash
dmandate cancel-mandate <MANDATE_PDA>
```

### Payment Management

Execute a payment for a mandate:

```bash
dmandate execute-payment <MANDATE_PDA>
```

Close a payment history record:

```bash
dmandate close-payment-history <MANDATE_PDA> <PAYMENT_NUMBER>
```

### Information

Get mandate details:

```bash
dmandate get-mandate <MANDATE_PDA>
```

## Network Commands

Change the Solana network:

```bash
dmandate set-network devnet
dmandate set-network mainnet
dmandate set-network testnet
dmandate set-network localnet
```

## Help

For general help:

```bash
dmandate help
```

For command-specific help:

```bash
dmandate [command] --help
```