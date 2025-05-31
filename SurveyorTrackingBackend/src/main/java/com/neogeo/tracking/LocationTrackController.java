package com.neogeo.tracking;

import java.time.LocalDateTime;
import java.util.Base64;
import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.web.bind.annotation.*;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.neogeo.tracking.dto.LiveLocationMessage;
import com.neogeo.tracking.model.LocationTrack;
import com.neogeo.tracking.model.Surveyor;
import com.neogeo.tracking.repository.LocationTrackRepository;
import com.neogeo.tracking.service.SurveyorService;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;

@RestController
@RequestMapping("/api")
@Tag(name = "Location Tracking", description = "APIs for tracking surveyor locations and managing location data")
public class LocationTrackController {

    @Autowired
    private LocationTrackService locationTrackService;

    private final SimpMessagingTemplate messagingTemplate;
    private final LocationTrackRepository repository;
    private final ObjectMapper objectMapper;
    private final SurveyorService surveyorService;

    public LocationTrackController(SimpMessagingTemplate messagingTemplate, 
                                 LocationTrackRepository repository,
                                 SurveyorService surveyorService) {
        this.messagingTemplate = messagingTemplate;
        this.repository = repository;
        this.surveyorService = surveyorService;
        this.objectMapper = new ObjectMapper()
            .registerModule(new com.fasterxml.jackson.datatype.jsr310.JavaTimeModule())
            .configure(com.fasterxml.jackson.databind.SerializationFeature.WRITE_DATES_AS_TIMESTAMPS, false);
    }

    @Operation(summary = "Filter surveyors", description = "Filter surveyors by city, project, and online status")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Successfully retrieved filtered surveyors",
            content = @Content(mediaType = "application/json", schema = @Schema(implementation = Surveyor.class)))
    })
    @GetMapping("/surveyors/filter")
    public List<Surveyor> filterSurveyors(
            @Parameter(description = "City to filter by") @RequestParam(required = false) String city,
            @Parameter(description = "Project to filter by") @RequestParam(required = false) String project,
            @Parameter(description = "Online status to filter by") @RequestParam(required = false) String status
    ) {
        return locationTrackService.filterSurveyors(city, project, status);
    }

    @Operation(summary = "Get latest location", description = "Get the most recent location for a specific surveyor")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Successfully retrieved latest location",
            content = @Content(mediaType = "application/json", schema = @Schema(implementation = LocationTrack.class))),
        @ApiResponse(responseCode = "404", description = "Surveyor not found")
    })
    @GetMapping("/location/{surveyorId}/latest")
    public LocationTrack getLatestLocation(
            @Parameter(description = "ID of the surveyor", required = true) 
            @PathVariable String surveyorId) {
        return locationTrackService.getLatestLocation(surveyorId);
    }

    @Operation(summary = "Get location history", description = "Get location history for a surveyor within a time range")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Successfully retrieved location history",
            content = @Content(mediaType = "application/json", schema = @Schema(implementation = LocationTrack.class)))
    })
    @GetMapping("/location/{surveyorId}/track")
    public List<LocationTrack> getTrackHistory(
            @Parameter(description = "ID of the surveyor", required = true) 
            @PathVariable String surveyorId,
            @Parameter(description = "Start time (ISO format)", example = "2025-05-30T00:00:00")
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime start,
            @Parameter(description = "End time (ISO format)", example = "2025-05-30T23:59:59")
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime end
    ) {
        return locationTrackService.getTrackHistory(surveyorId, start, end);
    }

    @Operation(summary = "Get surveyor statuses", description = "Get online/offline status for all surveyors")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Successfully retrieved surveyor statuses")
    })
    @GetMapping("/surveyors/status")
    public Map<String, String> getSurveyorStatus() {
        return locationTrackService.getSurveyorStatuses();
    }

    @Operation(summary = "Update live location", description = "Update and broadcast a surveyor's current location")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Location update accepted"),
        @ApiResponse(responseCode = "401", description = "Unauthorized"),
        @ApiResponse(responseCode = "400", description = "Invalid input")
    })
    @PostMapping("live/location")
    public ResponseEntity<String> publishLiveLocation(
            @Parameter(description = "Location update message", required = true)
            @RequestBody LiveLocationMessage message,
            @Parameter(description = "Authorization header")
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        // Simple HTTP Basic Auth check
        if (authHeader == null || !authHeader.startsWith("Basic ")) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Missing or invalid Authorization header");
        }
        
        try {
            String base64Credentials = authHeader.substring("Basic ".length());
            String credentials = new String(Base64.getDecoder().decode(base64Credentials));
            String[] values = credentials.split(":", 2);
            
            if (values.length != 2) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Invalid Authorization header");
            }
            
            String username = values[0];
            String password = values[1];
            
            // Use SurveyorService for authentication
            boolean isAuthenticated = surveyorService.authenticateSurveyor(username, password);
            if (!isAuthenticated) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Invalid username or password");
            }
            
            // Find the surveyor by username to get their ID
            Surveyor surveyor = surveyorService.findByUsername(username);
            if (surveyor != null) {
                // Update activity to mark surveyor as online
                surveyorService.updateSurveyorActivity(surveyor.getId());
            }
            
            // 1. Broadcast via WebSocket as JSON string
            String json = objectMapper.writeValueAsString(message);
            System.out.println("Broadcasting live location: " + json);
            messagingTemplate.convertAndSend("/topic/location/" + message.surveyorId, json);
            
            // 2. Save to DB (geom set to null to avoid PostGIS error)
            LocationTrack entity = new LocationTrack(message.surveyorId, message.latitude, message.longitude, message.timestamp, null);
            repository.save(entity);
            
            return ResponseEntity.ok("Location accepted");
            
        } catch (JsonProcessingException e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Error processing location data");
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Invalid Base64 encoding in Authorization header");
        }
    }
}






