package com.surveyor.tracking.model

data class LiveLocationMessage(
    val surveyorId: String,
    val latitude: Double,
    val longitude: Double,
    val timestamp: String // ISO 8601 format string to match backend
)
