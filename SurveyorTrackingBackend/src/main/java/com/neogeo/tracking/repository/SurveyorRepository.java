package com.neogeo.tracking.repository;


import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.neogeo.tracking.model.Surveyor;

public interface SurveyorRepository extends JpaRepository<Surveyor, String> {
    List<Surveyor> findByCity(String city);
    List<Surveyor> findByProjectName(String projectName);
    List<Surveyor> findByCityAndProjectName(String city, String projectName);
    List<Surveyor> findByCityContainingIgnoreCaseAndProjectNameContainingIgnoreCase(String city, String projectName);
    Surveyor findByUsername(String username);
    boolean existsByUsername(String username);
}
