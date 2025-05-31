package com.neogeo.tracking.dto;

import java.time.LocalDateTime;

public class LiveLocationMessage {
    public String surveyorId;
    public double latitude;
    public double longitude;
    public LocalDateTime timestamp;

    public LiveLocationMessage() {
    }

    public LiveLocationMessage(String surveyorId, double latitude, double longitude, LocalDateTime timestamp) {
        this.surveyorId = surveyorId;
        this.latitude = latitude;
        this.longitude = longitude;
        this.timestamp = timestamp;
    }

    @Override
    public String toString() {
        return "LiveLocationMessage{" +
                "surveyorId='" + surveyorId + '\'' +
                ", latitude=" + latitude +
                ", longitude=" + longitude +
                ", timestamp=" + timestamp +
                '}';
    }
}
