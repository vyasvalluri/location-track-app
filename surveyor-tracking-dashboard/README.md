# Surveyor Tracking Dashboard

A React frontend for real-time surveyor location tracking and visualization using OpenLayers and live WebSocket updates.

## Features
- Filter surveyors by city/project
- Select surveyor and date range to view track history
- Live tracking toggle (WebSocket/STOMP or REST fallback)
- Interactive map with OpenStreetMap basemap and surveyor tracks
- Modern, responsive UI

## Prerequisites
- Node.js 16+
- Backend running at `http://localhost:6060` (see SurveyorTrackingBackend)

## Setup
1. Navigate to `surveyor-tracking-dashboard`.
2. Install dependencies:
   ```sh
   npm install
   ```
3. Start the development server:
   ```sh
   npm start
   ```
   The app will open at `http://localhost:3000`.

## Configuration
- Port configuration is centralized in `/deploy/config.sh` (see PORT_CONFIGURATION.md)
- The React app automatically reads these settings from `src/config.js`
- Run the port configuration script to change all ports in one place:
  ```sh
  ./configure-ports.sh
  ```
- Ensure CORS is enabled on the backend for the configured frontend port.

## Usage
- Use the left panel to filter by city/project, select a surveyor, and pick a date range.
- Toggle "Enable Live Tracking" for real-time updates.
- The map on the right displays the surveyor's track and live location.

## Technologies
- React
- OpenLayers
- STOMP over SockJS for WebSocket
- react-datepicker

## Notes
- Works with the SurveyorTrackingBackend Spring Boot backend.
- For live tracking, ensure the backend is running and accessible.

---
For backend setup, see the `SurveyorTrackingBackend/README.md`.
