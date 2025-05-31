#!/bin/bash

# Start Backend
echo "Starting Spring Boot Backend..."
nohup java -jar surveyor-tracking-backend.jar > backend.log 2>&1 &
echo $! > backend.pid

# Serve Frontend with nginx if installed, otherwise use serve
if command -v nginx >/dev/null 2>&1; then
    echo "Nginx detected, please configure nginx.conf"
else
    echo "Installing serve..."
    npm install -g serve
    echo "Starting Frontend server..."
    nohup serve -s frontend -l 3000 > frontend.log 2>&1 &
    echo $! > frontend.pid
fi

echo "Deployment complete!"
echo "Backend running on port 6060"
echo "Frontend running on port 3000"
