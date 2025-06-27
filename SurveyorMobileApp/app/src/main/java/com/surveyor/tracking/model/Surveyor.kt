package com.surveyor.tracking.model

data class Surveyor(
    val id: String,
    val name: String,
    val city: String,
    val projectName: String,
    val username: String,
    val password: String? = null,
    val online: Boolean = false
)
