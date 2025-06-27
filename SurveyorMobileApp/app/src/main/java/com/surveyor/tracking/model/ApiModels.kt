package com.surveyor.tracking.model

data class LoginRequest(
    val username: String,
    val password: String
)

data class LoginResponse(
    val success: Boolean,
    val message: String,
    val surveyor: Surveyor?
)
