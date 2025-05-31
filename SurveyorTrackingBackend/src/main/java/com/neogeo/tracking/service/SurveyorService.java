package com.neogeo.tracking.service;

import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.time.Instant;

import org.springframework.stereotype.Service;

import com.neogeo.tracking.model.Surveyor;
import com.neogeo.tracking.repository.SurveyorRepository;

@Service
public class SurveyorService {
    private final SurveyorRepository repository;
    private final Map<String, Instant> lastActivityMap = new ConcurrentHashMap<>();
    // Consider a surveyor online if they've been active in the last 5 minutes
    private static final long ONLINE_TIMEOUT_SECONDS = 300; // 5 minutes

    public SurveyorService(SurveyorRepository repository) {
        this.repository = repository;
    }

    public List<Surveyor> listAll() {
        return repository.findAll();
    }

    public Surveyor save(Surveyor surveyor) {
        return repository.save(surveyor);
    }

    public List<Surveyor> filter(String city, String project) {
        return repository.findByCityContainingIgnoreCaseAndProjectNameContainingIgnoreCase(
                city == null ? "" : city,
                project == null ? "" : project
        );
    }
    
    public Surveyor findByUsername(String username) {
        return repository.findByUsername(username);
    }
    
    public boolean authenticateSurveyor(String username, String password) {
        Surveyor surveyor = repository.findByUsername(username);
        if (surveyor != null) {
            return password.equals(surveyor.getPassword());
        }
        return false;
    }
    
    public boolean isUsernameAvailable(String username) {
        return !repository.existsByUsername(username);
    }
    
    /**
     * Updates the last activity timestamp for a surveyor
     * @param surveyorId The ID of the surveyor
     */
    public void updateSurveyorActivity(String surveyorId) {
        lastActivityMap.put(surveyorId, Instant.now());
    }
    
    /**
     * Checks if a surveyor is considered online based on their last activity
     * @param surveyorId The ID of the surveyor
     * @return true if the surveyor has been active recently, false otherwise
     */
    public boolean isSurveyorOnline(String surveyorId) {
        Instant lastActivity = lastActivityMap.get(surveyorId);
        if (lastActivity == null) {
            return false;
        }
        
        long secondsSinceLastActivity = Instant.now().getEpochSecond() - lastActivity.getEpochSecond();
        return secondsSinceLastActivity <= ONLINE_TIMEOUT_SECONDS;
    }
    
    /**
     * Gets the online status of all surveyors
     * @return A map of surveyor IDs to their online status
     */
    public Map<String, Boolean> getAllSurveyorStatuses() {
        List<Surveyor> surveyors = listAll();
        Map<String, Boolean> statuses = new ConcurrentHashMap<>();
        
        for (Surveyor surveyor : surveyors) {
            boolean isOnline = isSurveyorOnline(surveyor.getId());
            statuses.put(surveyor.getId(), isOnline);
        }
        
        return statuses;
    }
}
