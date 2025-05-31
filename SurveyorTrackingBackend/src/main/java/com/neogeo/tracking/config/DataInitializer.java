package com.neogeo.tracking.config;

import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import com.neogeo.tracking.model.Surveyor;
import com.neogeo.tracking.repository.SurveyorRepository;

@Configuration
public class DataInitializer {

    @Bean
    public CommandLineRunner initializeData(SurveyorRepository repository) {
        return args -> {
            // Check if we have any surveyors
            long count = repository.count();
            if (count == 0) {
                System.out.println("Initializing sample surveyors...");
                
                // Create test surveyors with username/password
                Surveyor surveyor1 = new Surveyor("SURV001", "John Smith", "New York", "CityMapping", "john_smith", "password123");
                Surveyor surveyor2 = new Surveyor("SURV002", "Alice Johnson", "Chicago", "RoadSurvey", "alice_j", "secure456");
                Surveyor surveyor3 = new Surveyor("SURV003", "Robert Davis", "Los Angeles", "UrbanPlanning", "rob_davis", "survey789");
                Surveyor admin = new Surveyor("ADMIN001", "Admin User", "Central", "Administration", "admin", "admin123");
                
                // Save to database
                repository.save(surveyor1);
                repository.save(surveyor2);
                repository.save(surveyor3);
                repository.save(admin);
                
                System.out.println("Sample surveyors created with login credentials");
            } else {
                System.out.println("Database already contains " + count + " surveyors. Skipping initialization.");
            }
        };
    }
}
