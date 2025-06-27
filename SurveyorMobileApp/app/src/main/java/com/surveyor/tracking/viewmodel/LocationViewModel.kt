package com.surveyor.tracking.viewmodel

import android.app.Application
import android.content.Context
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.viewModelScope
import com.surveyor.tracking.api.ApiClient
import com.surveyor.tracking.model.LocationData
import kotlinx.coroutines.launch

class LocationViewModel(application: Application) : AndroidViewModel(application) {
    
    private val sharedPrefs = application.getSharedPreferences("tracking_prefs", Context.MODE_PRIVATE)
    
    private val _locationHistory = MutableLiveData<List<LocationData>>()
    val locationHistory: LiveData<List<LocationData>> = _locationHistory
    
    private val _isTracking = MutableLiveData<Boolean>()
    val isTracking: LiveData<Boolean> = _isTracking
    
    private val _currentLocation = MutableLiveData<LocationData?>()
    val currentLocation: LiveData<LocationData?> = _currentLocation
    
    init {
        // Load tracking state from preferences
        _isTracking.value = sharedPrefs.getBoolean("is_tracking", false)
    }
    
    fun startTracking(surveyorId: String) {
        _isTracking.value = true
        sharedPrefs.edit().putBoolean("is_tracking", true).apply()
        sharedPrefs.edit().putString("tracking_surveyor_id", surveyorId).apply()
        loadLocationHistory(surveyorId)
    }
    
    fun stopTracking() {
        _isTracking.value = false
        sharedPrefs.edit().putBoolean("is_tracking", false).apply()
        sharedPrefs.edit().remove("tracking_surveyor_id").apply()
    }
    
    fun updateCurrentLocation(location: LocationData) {
        _currentLocation.value = location
    }
    
    private fun loadLocationHistory(surveyorId: String) {
        viewModelScope.launch {
            try {
                val response = ApiClient.apiService.getLocationHistory(surveyorId)
                if (response.isSuccessful) {
                    _locationHistory.value = response.body() ?: emptyList()
                }
            } catch (e: Exception) {
                // Handle error
                e.printStackTrace()
            }
        }
    }
    
    fun checkServiceStatus() {
        // Update tracking state based on actual service status
        val isServiceRunning = isLocationServiceRunning()
        val prefTracking = sharedPrefs.getBoolean("is_tracking", false)
        
        // If service is running but we think we're not tracking, update the state
        if (isServiceRunning && !prefTracking) {
            _isTracking.value = true
            sharedPrefs.edit().putBoolean("is_tracking", true).apply()
        }
        // If we think we're tracking but service is not running, update the state
        else if (!isServiceRunning && prefTracking) {
            _isTracking.value = false
            sharedPrefs.edit().putBoolean("is_tracking", false).apply()
        }
    }
    
    private fun isLocationServiceRunning(): Boolean {
        val activityManager = getApplication<Application>().getSystemService(Context.ACTIVITY_SERVICE) as android.app.ActivityManager
        for (service in activityManager.getRunningServices(Integer.MAX_VALUE)) {
            if ("com.surveyor.tracking.service.LocationTrackingService" == service.service.className) {
                return true
            }
        }
        return false
    }
}
