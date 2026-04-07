#!/bin/bash
# Sync entities from local workspace to VPS

LOCAL_DIR="/data/.openclaw/workspace/snuuu-telegram-entities/entities"
REMOTE_HOST="root@69.62.114.199"
REMOTE_DIR="/data/.openclaw/workspace/snuuu-telegram-entities/entities"

# Sync JSONL files
scp "${LOCAL_DIR}"/*.jsonl "${REMOTE_HOST}:${REMOTE_DIR}/" 2>/dev/null

echo "Entities synced at $(date)"
