package com.neogeo.tracking.repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.neogeo.tracking.model.LocationTrack;

public interface LocationTrackRepository extends JpaRepository<LocationTrack, Long> {

    List<LocationTrack> findBySurveyorIdOrderByTimestampAsc(String surveyorId);

    List<LocationTrack> findBySurveyorIdAndTimestampBetweenOrderByTimestampAsc(String surveyorId, LocalDateTime start, LocalDateTime end);

    Optional<LocationTrack> findTopBySurveyorIdOrderByTimestampDesc(String surveyorId);
}
