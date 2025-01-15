#!/bin/bash

# Start Katana node
katana --disable-fee --block-time 1000 --host 0.0.0.0 --port 5050 &

# Wait for Katana to start
sleep 5

# Export environment variables
export STARKNET_RPC="http://localhost:5050"
export MONGO_URL="mongodb://localhost:27017"

# Keep container running
tail -f /dev/null
