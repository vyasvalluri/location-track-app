package com.neogeo.tracking;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.neogeo.tracking.model.LocationTrack;
import com.neogeo.tracking.model.Surveyor;
import com.neogeo.tracking.repository.LocationTrackRepository;
import com.neogeo.tracking.repository.SurveyorRepository;

@Service
public class LocationTrackService {

    @Autowired
    private LocationTrackRepository locationTrackRepository;

    @Autowired
    private SurveyorRepository surveyorRepository;

    @Autowired
    private com.neogeo.tracking.service.SurveyorService surveyorService;
    
    // Get surveyor online/offline status
    public Map<String, String> getSurveyorStatuses() {
        List<Surveyor> surveyors = surveyorRepository.findAll();
        Map<String, String> statusMap = new HashMap<>();
        Map<String, Boolean> activityStatusMap = surveyorService.getAllSurveyorStatuses();
        
        // Get the current time
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime threshold = now.minusMinutes(5); // Consider offline if no update in 5 minutes
        
        for (Surveyor surveyor : surveyors) {
            // Check both location tracking and activity tracking for better accuracy
            LocationTrack lastLocation = getLatestLocation(surveyor.getId());
            boolean isLocationActive = lastLocation != null && lastLocation.getTimestamp().isAfter(threshold);
            boolean isActiveFromStatus = activityStatusMap.getOrDefault(surveyor.getId(), false);
            
            // Consider online if either method shows activity
            boolean isOnline = isLocationActive || isActiveFromStatus;
            statusMap.put(surveyor.getId(), isOnline ? "Online" : "Offline");
        }
        
        return statusMap;
    }

    // Get filtered surveyors
    public List<Surveyor> filterSurveyors(String city, String project, String status) {
        List<Surveyor> surveyors;
        if (city != null && project != null) {
            surveyors = surveyorRepository.findByCityAndProjectName(city, project);
            System.out.println("Filtering by city=" + city + " AND project=" + project + " - Found: " + surveyors.size() + " surveyors");
        } else if (city != null) {
            surveyors = surveyorRepository.findByCity(city);
            System.out.println("Filtering by city=" + city + " - Found: " + surveyors.size() + " surveyors");
        } else if (project != null) {
            surveyors = surveyorRepository.findByProjectName(project);
            System.out.println("Filtering by project=" + project + " - Found: " + surveyors.size() + " surveyors");
        } else {
            surveyors = surveyorRepository.findAll();
            System.out.println("No filters applied. Found: " + surveyors.size() + " total surveyors");
            // Log each surveyor detail
            for (Surveyor s : surveyors) {
                System.out.println("Surveyor: ID=" + s.getId() + ", Name=" + s.getName() + ", City=" + s.getCity() + ", Project=" + s.getProjectName());
            }
        }
        return surveyors;
    }

    // Get latest location
    public LocationTrack getLatestLocation(String surveyorId) {
        return locationTrackRepository
                .findTopBySurveyorIdOrderByTimestampDesc(surveyorId)
                .orElse(null);
    }

    // Get location history
    public List<LocationTrack> getTrackHistory(String surveyorId, LocalDateTime start, LocalDateTime end) {
        if (start != null && end != null) {
            return locationTrackRepository.findBySurveyorIdAndTimestampBetweenOrderByTimestampAsc(surveyorId, start, end);
        } else {
            // Only start or only end provided, fallback to full range (since repo does not support After/Before methods)
            return locationTrackRepository.findBySurveyorIdOrderByTimestampAsc(surveyorId);
        }
    }
}
