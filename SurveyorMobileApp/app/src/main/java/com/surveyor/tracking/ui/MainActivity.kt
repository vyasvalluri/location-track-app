package com.surveyor.tracking.ui

import android.Manifest
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.util.Log
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.activity.viewModels
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import com.surveyor.tracking.databinding.ActivityMainBinding
import com.surveyor.tracking.service.LocationTrackingService
import com.surveyor.tracking.viewmodel.AuthViewModel
import com.surveyor.tracking.viewmodel.LocationViewModel

class MainActivity : AppCompatActivity() {
    
    private lateinit var binding: ActivityMainBinding
    private val authViewModel: AuthViewModel by viewModels()
    private val locationViewModel: LocationViewModel by viewModels()
    
    private val requestPermissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) { permissions ->
        val fineLocationGranted = permissions[Manifest.permission.ACCESS_FINE_LOCATION] ?: false
        val coarseLocationGranted = permissions[Manifest.permission.ACCESS_COARSE_LOCATION] ?: false
        
        if (fineLocationGranted || coarseLocationGranted) {
            startLocationTracking()
        } else {
            Toast.makeText(this, "Location permission required for tracking", Toast.LENGTH_LONG).show()
        }
    }
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityMainBinding.inflate(layoutInflater)
        setContentView(binding.root)
        
        setupObservers()
        setupClickListeners()
        checkLoginStatus()
        
        // Debug SharedPreferences
        debugSharedPreferences()
        
        // Explicitly refresh surveyor data to handle timing issues
        Log.d("MainActivity", "Manually refreshing surveyor data")
        authViewModel.refreshSurveyorData()
        
        // Check if tracking service is already running
        locationViewModel.checkServiceStatus()
    }
    
    private fun setupObservers() {
        authViewModel.currentSurveyor.observe(this) { surveyor ->
            Log.d("MainActivity", "Surveyor observer triggered. Surveyor: $surveyor")
            
            if (surveyor == null) {
                Log.d("MainActivity", "No surveyor data - redirecting to login")
                // Not logged in, go to login
                startActivity(Intent(this, LoginActivity::class.java))
                finish()
                return@observe
            }
            
            Log.d("MainActivity", "Surveyor logged in: ${surveyor.name} (${surveyor.id})")
            binding.welcomeText.text = "Welcome, ${surveyor.name}!"
            binding.emailText.text = "${surveyor.city} - ${surveyor.projectName}"
            
            // Only auto-start tracking if we're not already tracking
            val isAlreadyTracking = locationViewModel.isTracking.value ?: false
            Log.d("MainActivity", "Already tracking: $isAlreadyTracking")
            
            if (!isAlreadyTracking) {
                Log.d("MainActivity", "Auto-starting location tracking")
                requestLocationPermissionAndStart()
            } else {
                Log.d("MainActivity", "Tracking already active, skipping auto-start")
            }
        }
        
        // Also observe login state changes
        authViewModel.loginState.observe(this) { loginState ->
            Log.d("MainActivity", "Login state changed: $loginState")
            
            // If we detect that there's no login data, redirect immediately
            if (loginState is AuthViewModel.LoginState.LoggedOut) {
                Log.d("MainActivity", "Detected logged out state, redirecting to login")
                startActivity(Intent(this, LoginActivity::class.java))
                finish()
            }
        }
        
        locationViewModel.isTracking.observe(this) { isTracking ->
            if (isTracking) {
                binding.startTrackingButton.text = "Stop Tracking"
                binding.statusText.text = "Status: Tracking Active"
            } else {
                binding.startTrackingButton.text = "Start Tracking"
                binding.statusText.text = "Status: Not Tracking"
            }
        }
        
        locationViewModel.currentLocation.observe(this) { location ->
            location?.let {
                binding.locationText.text = "Last Location: ${it.latitude}, ${it.longitude}"
            }
        }
    }
    
    private fun setupClickListeners() {
        binding.startTrackingButton.setOnClickListener {
            val isTracking = locationViewModel.isTracking.value ?: false
            if (isTracking) {
                stopLocationTracking()
            } else {
                requestLocationPermissionAndStart()
            }
        }
        
        binding.logoutButton.setOnClickListener {
            stopLocationTracking()
            authViewModel.logout()
        }
    }
    
    private fun checkLoginStatus() {
        // Check if we have a logged-in surveyor from the previous activity
        // If not, redirect to login
        // Note: This method is called in onCreate, but the observer will handle the redirect
    }
    
    private fun requestLocationPermissionAndStart() {
        Log.d("MainActivity", "Requesting location permission and start")
        when {
            ContextCompat.checkSelfPermission(
                this,
                Manifest.permission.ACCESS_FINE_LOCATION
            ) == PackageManager.PERMISSION_GRANTED -> {
                // Check if surveyor data is available before starting
                val surveyor = authViewModel.currentSurveyor.value
                if (surveyor != null) {
                    startLocationTracking()
                } else {
                    Log.d("MainActivity", "Surveyor data not ready yet, observing for changes")
                    // Try refreshing the data and retry after a short delay
                    authViewModel.refreshSurveyorData()
                    
                    Handler(Looper.getMainLooper()).postDelayed({
                        val retrysurveyor = authViewModel.currentSurveyor.value
                        if (retrysurveyor != null) {
                            Log.d("MainActivity", "Surveyor data available after retry")
                            startLocationTracking()
                        } else {
                            Log.d("MainActivity", "Surveyor data still not available, will wait for observer")
                        }
                    }, 500) // Wait 500ms and retry
                }
            }
            else -> {
                Log.d("MainActivity", "Requesting location permissions")
                requestPermissionLauncher.launch(
                    arrayOf(
                        Manifest.permission.ACCESS_FINE_LOCATION,
                        Manifest.permission.ACCESS_COARSE_LOCATION
                    )
                )
            }
        }
    }
    
    private fun startLocationTracking() {
        val surveyor = authViewModel.currentSurveyor.value
        Log.d("MainActivity", "Attempting to start tracking. Surveyor data: $surveyor")
        
        if (surveyor != null) {
            Log.d("MainActivity", "Starting location tracking for surveyor: ${surveyor.id}")
            LocationTrackingService.startService(this, surveyor.id)
            locationViewModel.startTracking(surveyor.id)
            Toast.makeText(this, "Location tracking started for ${surveyor.name}", Toast.LENGTH_SHORT).show()
        } else {
            Log.e("MainActivity", "Cannot start tracking - no surveyor data")
            Toast.makeText(this, "Error: No surveyor data available. Please login again.", Toast.LENGTH_LONG).show()
            
            // Clear any stale data and redirect to login
            authViewModel.logout()
        }
    }
    
    private fun stopLocationTracking() {
        LocationTrackingService.stopService(this)
        locationViewModel.stopTracking()
        Toast.makeText(this, "Location tracking stopped", Toast.LENGTH_SHORT).show()
    }
    
    private fun debugSharedPreferences() {
        val surveyorPrefs = getSharedPreferences("surveyor_prefs", Context.MODE_PRIVATE)
        val trackingPrefs = getSharedPreferences("tracking_prefs", Context.MODE_PRIVATE)
        
        Log.d("MainActivity", "=== SharedPreferences Debug ===")
        Log.d("MainActivity", "Surveyor prefs: ${surveyorPrefs.all}")
        Log.d("MainActivity", "Tracking prefs: ${trackingPrefs.all}")
        Log.d("MainActivity", "Current surveyor value: ${authViewModel.currentSurveyor.value}")
        Log.d("MainActivity", "==============================")
    }
}
