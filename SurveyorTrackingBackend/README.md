# SurveyorTrackingBackend

A Spring Boot backend for real-time surveyor location tracking with REST APIs and WebSocket (STOMP) live updates.

## Features
- REST API for surveyor filtering, location history, and live location updates
- WebSocket/STOMP endpoint for real-time location broadcasting
- CORS enabled for frontend integration
- PostgreSQL/PostGIS support (geom set to null to avoid PostGIS errors)

## Prerequisites
- Java 17+
- Maven
- PostgreSQL (running on `localhost:5433` with user `postgres`/`postgres`)

## Setup
1. Clone the repository and navigate to `SurveyorTrackingBackend`.
2. Configure your database in `src/main/resources/application.properties` if needed.
3. Build and run the backend:
   ```sh
   ./mvnw spring-boot:run
   ```
   The backend will start on `http://localhost:6060`.

## API Endpoints
- `GET /api/surveyors/filter` — Filter surveyors by city/project/status
- `GET /api/location/{surveyorId}/latest` — Get latest location for a surveyor
- `GET /api/location/{surveyorId}/track` — Get location history for a surveyor
- `POST /api/live/location` — Push live location (JSON: surveyorId, latitude, longitude, timestamp)
- `GET /api/surveyors/status` — Get online/offline status for all surveyors

## API Documentation

The API documentation is available in two formats:

1. Swagger UI (Interactive): 
   - Start the application and visit http://localhost:6060/swagger-ui.html
   - Explore and test API endpoints directly from your browser

2. Markdown Documentation:
   - See [API_DOCUMENTATION.md](API_DOCUMENTATION.md) for detailed API documentation
   - Includes sample requests, responses, and code examples

## WebSocket
- Connect to `/ws/location` using SockJS/STOMP
- Subscribe to `/topic/location/{surveyorId}` for live updates

## Sample Data Insertion
Example curl command:
```sh
curl -X POST http://localhost:6060/api/live/location \
  -H "Content-Type: application/json" \
  -d '{"surveyorId":"s001","latitude":17.385044,"longitude":78.486671,"timestamp":"2025-05-14T10:00:00"}'
```

## Notes
- CORS is enabled for `http://localhost:3000` (React frontend)
- WebSocket/STOMP is configured with SockJS
- LocationTrack `geom` is set to null to avoid PostGIS errors

---
For frontend setup, see the `surveyor-tracking-dashboard/README.md`.
