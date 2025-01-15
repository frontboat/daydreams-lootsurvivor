#!/bin/bash

# Stop any running containers
docker-compose down

# Remove existing volumes
docker-compose down -v

# Build and start services
docker-compose up -d

# Wait for Katana to be ready
echo "Waiting for Katana to start..."
sleep 10

# Deploy contracts (we'll add this later)
# ./deploy_contracts.sh

echo "Environment is ready!"
echo "Katana RPC: http://localhost:5050"
echo "GraphQL API: http://localhost:8080"
echo "MongoDB: mongodb://localhost:27017" 