#!/bin/bash

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "This script uses Docker and is currently not running, please start Docker and try again!"
    exit 1
fi

# Start dalai alpaca 7B model
docker compose build
docker-compose run --rm dalai npx dalai alpaca install 7B # or a different model
docker-compose -p dalai up -d
