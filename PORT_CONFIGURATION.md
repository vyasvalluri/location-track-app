# Centralized Port Configuration

This document explains how the port configuration is centralized in the Surveyor Tracking application.

## Overview

Port numbers are now centralized in a single configuration file to make it easier to:
- Change ports across the entire application
- Deploy to different environments
- Avoid hardcoded port numbers spread throughout the codebase

## Configuration Files

### 1. Main Configuration File

The primary configuration file is located at:
```
/deploy/config.sh
```

This file contains all port definitions and is the source of truth for port numbers across the application.

### 2. Application Configuration

The React application configuration is in:
```
/surveyor-tracking-dashboard/src/config.js
```

This file is automatically updated based on the values in `config.sh` when running the build or start scripts.

## How to Change Ports

To change any port number in the application:

1. Edit `/deploy/config.sh` and update the port values:
   ```bash
   # Backend API port
   BACKEND_PORT=6060  # Change this value
   
   # Frontend port
   FRONTEND_PORT=3000  # Change this value
   
   # Database port
   DATABASE_PORT=5433  # Change this value
   ```

2. Run the setup script to apply changes:
   ```bash
   cd surveyor-tracking-dashboard
   npm run setup
   ```

3. Restart the application for changes to take effect.

## Automatic Port Configuration

The following scripts work with the centralized port configuration:

- `npm run setup` - Updates the config.js file with values from config.sh
- `npm run build:config` - Builds the application with the correct port values
- `start.sh` - Uses the port values from config.sh when starting services
- `check-status.sh` - Uses the port values from config.sh when checking service status

## Verification

To verify that your port changes have been applied correctly, run:

```bash
./check-status.sh
```

This will show which ports are active and being used by the application.
