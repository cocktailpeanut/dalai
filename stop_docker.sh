#!/bin/bash

#Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "This script uses Docker and is currently not running, please start Docker and try again!"
    exit 1
else
    # Start dalai alpaca 7B model
    if [ $( docker ps | grep dalai | wc -l ) -gt 0 ]; then
        docker-compose -p dalai down
    fi
fi
