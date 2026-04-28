#!/usr/bin/env bash
# Silently retries devnet SOL airdrop with exponential backoff.
# Stops once the target balance is reached.
#
# Usage: ./scripts/devnet-airdrop.sh [target_sol]
# Default target: 6 SOL (enough for 3 program deployments)

set -euo pipefail

TARGET_SOL="${1:-6}"
AMOUNT_PER_REQUEST=2
MIN_DELAY=15
MAX_DELAY=120
LOG_FILE="/tmp/entros-devnet-airdrop.log"

solana config set --url devnet --keypair ~/.config/solana/id.json > /dev/null 2>&1
PUBKEY=$(solana address)

echo "Airdrop target: ${TARGET_SOL} SOL to ${PUBKEY}"
echo "Logging to ${LOG_FILE}"
echo "---"

delay=$MIN_DELAY
consecutive_failures=0

while true; do
  balance=$(solana balance --output json 2>/dev/null | grep -o '"lamports":[0-9]*' | grep -o '[0-9]*' || echo "0")
  balance_sol=$(echo "scale=4; $balance / 1000000000" | bc 2>/dev/null || echo "0")

  # Check if target reached
  target_lamports=$(echo "$TARGET_SOL * 1000000000" | bc | cut -d. -f1)
  if [ "$balance" -ge "$target_lamports" ] 2>/dev/null; then
    echo "[$(date '+%H:%M:%S')] Done. Balance: ${balance_sol} SOL"
    exit 0
  fi

  # Try airdrop
  if solana airdrop $AMOUNT_PER_REQUEST >> "$LOG_FILE" 2>&1; then
    consecutive_failures=0
    delay=$MIN_DELAY
    new_balance=$(solana balance 2>/dev/null || echo "unknown")
    echo "[$(date '+%H:%M:%S')] +${AMOUNT_PER_REQUEST} SOL. Balance: ${new_balance}"
  else
    consecutive_failures=$((consecutive_failures + 1))
    # Exponential backoff: double delay each failure, cap at MAX_DELAY
    delay=$((delay * 2))
    if [ "$delay" -gt "$MAX_DELAY" ]; then
      delay=$MAX_DELAY
    fi
    echo "[$(date '+%H:%M:%S')] Rate limited. Retry in ${delay}s (balance: ${balance_sol} SOL)" >> "$LOG_FILE"
  fi

  sleep $delay
done
