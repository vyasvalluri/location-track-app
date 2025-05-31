package com.neogeo.tracking.controller;

import java.util.List;
import java.util.Map;
import java.util.HashMap;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.neogeo.tracking.model.Surveyor;
import com.neogeo.tracking.service.SurveyorService;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;

@RestController
@RequestMapping("/api/surveyors")
@Tag(name = "Surveyor Management", description = "APIs for managing surveyors and authentication")
public class SurveyorController {

    private final SurveyorService service;

    public SurveyorController(SurveyorService service) {
        this.service = service;
    }

    @Operation(summary = "Get all surveyors", description = "Retrieves a list of all registered surveyors")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Successfully retrieved surveyors",
            content = @Content(mediaType = "application/json", schema = @Schema(implementation = Surveyor.class)))
    })
    @GetMapping
    public List<Surveyor> getAll() {
        List<Surveyor> surveyors = service.listAll();
        
        // Update the online status for each surveyor based on their last activity
        for (Surveyor surveyor : surveyors) {
            surveyor.setOnline(service.isSurveyorOnline(surveyor.getId()));
        }
        
        return surveyors;
    }

    @Operation(summary = "Create or update surveyor", description = "Creates a new surveyor or updates an existing one")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Surveyor created/updated successfully",
            content = @Content(mediaType = "application/json", schema = @Schema(implementation = Surveyor.class))),
        @ApiResponse(responseCode = "400", description = "Invalid input")
    })
    @PostMapping
    public Surveyor createOrUpdate(@RequestBody Surveyor surveyor) {
        return service.save(surveyor);
    }

    @Operation(summary = "Authenticate surveyor", description = "Validates surveyor credentials and returns authentication status")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Authentication successful"),
        @ApiResponse(responseCode = "401", description = "Invalid credentials")
    })
    @PostMapping("/login")
    public ResponseEntity<?> login(
            @Parameter(description = "Login credentials", required = true)
            @RequestBody Map<String, String> credentials) {
        String username = credentials.get("username");
        String password = credentials.get("password");
        
        boolean isAuthenticated = service.authenticateSurveyor(username, password);
        
        if (isAuthenticated) {
            Surveyor surveyor = service.findByUsername(username);
            // Update surveyor activity to mark them as online
            service.updateSurveyorActivity(surveyor.getId());
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Login successful");
            response.put("surveyor", surveyor);
            return ResponseEntity.ok(response);
        } else {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", "Invalid username or password");
            return ResponseEntity.status(401).body(response);
        }
    }
    
    @Operation(summary = "Check username availability", description = "Checks if a username is available for registration")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Availability check completed")
    })
    @GetMapping("/check-username")
    public ResponseEntity<?> checkUsernameAvailability(
            @Parameter(description = "Username to check", required = true)
            @RequestParam String username) {
        boolean isAvailable = service.isUsernameAvailable(username);
        Map<String, Object> response = new HashMap<>();
        response.put("available", isAvailable);
        return ResponseEntity.ok(response);
    }
    
    @Operation(summary = "Update surveyor activity", description = "Updates the last activity timestamp for a surveyor to mark them as online")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Successfully updated status")
    })
    @PostMapping("/{id}/activity")
    public ResponseEntity<Void> updateSurveyorActivity(
            @Parameter(description = "Surveyor ID", required = true)
            @PathVariable String id) {
        service.updateSurveyorActivity(id);
        return ResponseEntity.ok().build();
    }
}
