#!/bin/bash

# Stop Backend
if [ -f backend.pid ]; then
    echo "Stopping backend..."
    kill $(cat backend.pid)
    rm backend.pid
fi

# Stop Frontend
if [ -f frontend.pid ]; then
    echo "Stopping frontend..."
    kill $(cat frontend.pid)
    rm frontend.pid
fi
