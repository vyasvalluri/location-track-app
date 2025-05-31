# Surveyor Tracking API Documentation

## Base URL
```
http://localhost:6060/api
```

## Authentication Endpoints

### Login
Authenticate a surveyor and get their details.

```
POST /surveyors/login
```

**Request Body:**
```json
{
    "username": "john_smith",
    "password": "password123"
}
```

**Success Response (200 OK):**
```json
{
    "success": true,
    "message": "Login successful",
    "surveyor": {
        "id": "SURV001",
        "name": "John Smith",
        "city": "New York",
        "projectName": "CityMapping",
        "username": "john_smith"
    }
}
```

**Error Response (401 Unauthorized):**
```json
{
    "success": false,
    "message": "Invalid username or password"
}
```

### Check Username Availability

```
GET /surveyors/check-username?username={username}
```

**Success Response (200 OK):**
```json
{
    "available": true
}
```

## Surveyor Management Endpoints

### Get All Surveyors

```
GET /surveyors
```

**Success Response (200 OK):**
```json
[
    {
        "id": "SURV001",
        "name": "John Smith",
        "city": "New York",
        "projectName": "CityMapping",
        "username": "john_smith"
    },
    {
        "id": "SURV002",
        "name": "Alice Johnson",
        "city": "Chicago",
        "projectName": "RoadSurvey",
        "username": "alice_j"
    }
]
```

### Create/Update Surveyor

```
POST /surveyors
```

**Request Body:**
```json
{
    "id": "SURV003",
    "name": "Robert Davis",
    "city": "Los Angeles",
    "projectName": "UrbanPlanning",
    "username": "rob_davis",
    "password": "survey789"
}
```

**Success Response (200 OK):**
```json
{
    "id": "SURV003",
    "name": "Robert Davis",
    "city": "Los Angeles",
    "projectName": "UrbanPlanning",
    "username": "rob_davis"
}
```

## Location Tracking Endpoints

### Filter Surveyors

```
GET /surveyors/filter?city={city}&project={project}&status={status}
```

**Parameters:**
- `city` (optional): Filter by city
- `project` (optional): Filter by project name
- `status` (optional): Filter by online status

**Success Response (200 OK):**
```json
[
    {
        "id": "SURV001",
        "name": "John Smith",
        "city": "New York",
        "projectName": "CityMapping",
        "username": "john_smith"
    }
]
```

### Get Latest Location

```
GET /location/{surveyorId}/latest
```

**Success Response (200 OK):**
```json
{
    "id": 123,
    "surveyorId": "SURV001",
    "latitude": 40.7128,
    "longitude": -74.0060,
    "timestamp": "2025-05-30T15:30:00"
}
```

### Get Track History

```
GET /location/{surveyorId}/track?start={startTime}&end={endTime}
```

**Parameters:**
- `startTime` (optional): ISO datetime (e.g., "2025-05-30T00:00:00")
- `endTime` (optional): ISO datetime (e.g., "2025-05-30T23:59:59")

**Success Response (200 OK):**
```json
[
    {
        "id": 121,
        "surveyorId": "SURV001",
        "latitude": 40.7128,
        "longitude": -74.0060,
        "timestamp": "2025-05-30T15:00:00"
    },
    {
        "id": 122,
        "surveyorId": "SURV001",
        "latitude": 40.7130,
        "longitude": -74.0062,
        "timestamp": "2025-05-30T15:15:00"
    }
]
```

### Get Surveyor Status

```
GET /surveyors/status
```

**Success Response (200 OK):**
```json
{
    "SURV001": "Online",
    "SURV002": "Offline",
    "SURV003": "Online"
}
```

### Update Live Location

```
POST /live/location
```

**Request Headers:**
- `Authorization` (optional): Basic authentication header

**Request Body:**
```json
{
    "surveyorId": "SURV001",
    "latitude": 40.7128,
    "longitude": -74.0060,
    "timestamp": "2025-05-30T15:30:00"
}
```

**Success Response (200 OK):**
```text
Location accepted
```

## WebSocket Endpoints

### Live Location Updates
Connect to WebSocket endpoint and subscribe to location updates for specific surveyors.

```
WebSocket: ws://localhost:6060/ws/location
Subscribe to: /topic/location/{surveyorId}
```

**Sample Message:**
```json
{
    "surveyorId": "SURV001",
    "latitude": 40.7128,
    "longitude": -74.0060,
    "timestamp": "2025-05-30T15:30:00"
}
```

## Status Codes

- 200 OK: Request successful
- 400 Bad Request: Invalid input
- 401 Unauthorized: Authentication failed
- 404 Not Found: Resource not found
- 500 Internal Server Error: Server error

## Notes

1. All timestamps should be in ISO 8601 format
2. Coordinates use WGS84 datum (standard GPS coordinates)
3. WebSocket connection will fall back to polling if connection fails
4. Password fields are never returned in responses

## Base URL
`http://localhost:6060`

## Authentication
Most endpoints require no authentication. WebSocket/STOMP connections use basic authentication for live location updates.

## REST Endpoints

### 1. Surveyors

#### List/Filter Surveyors
```http
GET /api/surveyors/filter?city={city}&project={project}&status={status}
```

Query Parameters:
- `city` (optional): Filter by city name
- `project` (optional): Filter by project name
- `status` (optional): Filter by status ('Online'/'Offline')

Sample Response:
```json
[
  {
    "id": "SURV001",
    "name": "John Smith",
    "city": "New York",
    "projectName": "CityMapping",
    "username": "john_smith"
  }
]
```

#### Get Surveyor Status
```http
GET /api/surveyors/status
```

Sample Response:
```json
{
  "SURV001": "Online",
  "SURV002": "Offline"
}
```

### 2. Location Tracking

#### Get Latest Location
```http
GET /api/location/{surveyorId}/latest
```

Sample Response:
```json
{
  "id": 123,
  "surveyorId": "SURV001",
  "latitude": 17.385044,
  "longitude": 78.486671,
  "timestamp": "2025-05-14T10:00:00"
}
```

#### Get Track History
```http
GET /api/location/{surveyorId}/track?from={fromDateTime}&to={toDateTime}
```

Query Parameters:
- `from`: Start datetime (ISO-8601 format)
- `to`: End datetime (ISO-8601 format)

Sample Response:
```json
[
  {
    "id": 123,
    "surveyorId": "SURV001",
    "latitude": 17.385044,
    "longitude": 78.486671,
    "timestamp": "2025-05-14T10:00:00"
  },
  {
    "id": 124,
    "surveyorId": "SURV001",
    "latitude": 17.385100,
    "longitude": 78.486700,
    "timestamp": "2025-05-14T10:01:00"
  }
]
```

#### Push Live Location
```http
POST /api/live/location
Authorization: Basic <base64-encoded-credentials>
Content-Type: application/json
```

Request Body:
```json
{
  "surveyorId": "SURV001",
  "latitude": 17.385044,
  "longitude": 78.486671,
  "timestamp": "2025-05-14T10:00:00"
}
```

Sample Response:
```json
{
  "message": "Location accepted"
}
```

### 3. WebSocket/STOMP

#### Connect to WebSocket
```
WebSocket URL: ws://localhost:6060/ws/location
```

#### Subscribe to Live Updates
```
STOMP Subscribe: /topic/location/{surveyorId}
```

Sample Message:
```json
{
  "surveyorId": "SURV001",
  "latitude": 17.385044,
  "longitude": 78.486671,
  "timestamp": "2025-05-14T10:00:00"
}
```

## Error Responses

### 400 Bad Request
```json
{
  "error": "Invalid request parameters",
  "message": "Latitude must be between -90 and 90"
}
```

### 404 Not Found
```json
{
  "error": "Resource not found",
  "message": "Surveyor with ID SURV999 not found"
}
```

### 500 Internal Server Error
```json
{
  "error": "Internal server error",
  "message": "An unexpected error occurred"
}
```

## Running the API
1. Start PostgreSQL database (port 5433)
2. Run the Spring Boot application:
   ```bash
   ./mvnw spring-boot:run
   ```
3. Access Swagger UI: http://localhost:6060/swagger-ui.html

## Code Examples

### JavaScript/React (Using Fetch API)
```javascript
// Get surveyor list
fetch('http://localhost:6060/api/surveyors/filter?city=Mumbai')
  .then(res => res.json())
  .then(surveyors => console.log(surveyors));

// Get track history
const from = new Date().toISOString();
const to = new Date().toISOString();
fetch(`http://localhost:6060/api/location/SURV001/track?from=${from}&to=${to}`)
  .then(res => res.json())
  .then(tracks => console.log(tracks));
```

### WebSocket Connection (Using STOMP.js)
```javascript
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

const client = new Client({
  webSocketFactory: () => new SockJS('http://localhost:6060/ws/location'),
  onConnect: () => {
    client.subscribe('/topic/location/SURV001', message => {
      const location = JSON.parse(message.body);
      console.log('Live location update:', location);
    });
  }
});

client.activate();
```

### cURL Examples
```bash
# Get surveyors
curl http://localhost:6060/api/surveyors/filter?city=Mumbai

# Push live location
curl -X POST http://localhost:6060/api/live/location \
  -H "Content-Type: application/json" \
  -d '{"surveyorId":"SURV001","latitude":17.385044,"longitude":78.486671}'
```
