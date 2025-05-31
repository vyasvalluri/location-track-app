package com.neogeo.tracking.service;

import java.util.List;

import org.springframework.stereotype.Service;

import com.neogeo.tracking.model.Surveyor;
import com.neogeo.tracking.repository.SurveyorRepository;

@Service
public class SurveyorService {
    private final SurveyorRepository repository;

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
}
