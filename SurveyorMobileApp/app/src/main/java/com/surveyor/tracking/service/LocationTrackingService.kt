package com.surveyor.tracking.service

import android.app.*
import android.content.Context
import android.content.Intent
import android.location.Location
import android.os.Build
import android.os.IBinder
import android.os.Looper
import android.util.Log
import androidx.core.app.NotificationCompat
import com.google.android.gms.location.*
import com.surveyor.tracking.R
import com.surveyor.tracking.api.ApiClient
import com.surveyor.tracking.model.LocationData
import com.surveyor.tracking.model.LiveLocationMessage
import kotlinx.coroutines.*
import android.util.Base64
import java.text.SimpleDateFormat
import java.util.*

class LocationTrackingService : Service() {
    
    private lateinit var fusedLocationClient: FusedLocationProviderClient
    private lateinit var locationCallback: LocationCallback
    private val serviceScope = CoroutineScope(Dispatchers.IO + SupervisorJob())
    private var currentSurveyorId: String? = null
    
    companion object {
        const val CHANNEL_ID = "LocationTrackingChannel"
        const val NOTIFICATION_ID = 1
        const val EXTRA_SURVEYOR_ID = "surveyor_id"
        
        fun startService(context: Context, surveyorId: String) {
            val intent = Intent(context, LocationTrackingService::class.java).apply {
                putExtra(EXTRA_SURVEYOR_ID, surveyorId)
            }
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(intent)
            } else {
                context.startService(intent)
            }
        }
        
        fun stopService(context: Context) {
            val intent = Intent(context, LocationTrackingService::class.java)
            context.stopService(intent)
        }
    }
    
    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
        fusedLocationClient = LocationServices.getFusedLocationProviderClient(this)
        setupLocationCallback()
    }
    
    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val surveyorId = intent?.getStringExtra(EXTRA_SURVEYOR_ID) ?: return START_NOT_STICKY
        
        currentSurveyorId = surveyorId
        Log.d("LocationService", "Starting location tracking for surveyor: $surveyorId")
        
        val notification = createNotification()
        startForeground(NOTIFICATION_ID, notification)
        
        startLocationUpdates(surveyorId)
        
        return START_STICKY
    }
    
    override fun onBind(intent: Intent?): IBinder? = null
    
    override fun onDestroy() {
        super.onDestroy()
        stopLocationUpdates()
        serviceScope.cancel()
    }
    
    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "Location Tracking",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Tracks surveyor location in background"
            }
            
            val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            notificationManager.createNotificationChannel(channel)
        }
    }
    
    private fun createNotification(): Notification {
        val surveyorInfo = if (currentSurveyorId != null) "ID: $currentSurveyorId" else "Starting..."
        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("Surveyor Location Tracking")
            .setContentText("Tracking location every 10 minutes - $surveyorInfo")
            .setSmallIcon(R.drawable.ic_location)
            .setOngoing(true)
            .build()
    }
    
    private fun setupLocationCallback() {
        locationCallback = object : LocationCallback() {
            override fun onLocationResult(locationResult: LocationResult) {
                locationResult.lastLocation?.let { location ->
                    handleLocationUpdate(location)
                }
            }
        }
    }
    
    private fun startLocationUpdates(surveyorId: String) {
        val locationRequest = LocationRequest.Builder(
            Priority.PRIORITY_HIGH_ACCURACY,
            600000L // 10 minutes (600 seconds)
        ).apply {
            setMinUpdateIntervalMillis(300000L) // 5 minutes minimum
            setMaxUpdateDelayMillis(900000L) // 15 minutes maximum delay
        }.build()
        
        try {
            fusedLocationClient.requestLocationUpdates(
                locationRequest,
                locationCallback,
                Looper.getMainLooper()
            )
        } catch (securityException: SecurityException) {
            // Handle permission not granted
            stopSelf()
        }
    }
    
    private fun stopLocationUpdates() {
        fusedLocationClient.removeLocationUpdates(locationCallback)
    }
    
    private fun handleLocationUpdate(location: Location) {
        Log.d("LocationService", "Location update: ${location.latitude}, ${location.longitude}")
        
        // Send to backend
        serviceScope.launch {
            try {
                val surveyorId = currentSurveyorId ?: return@launch
                Log.d("LocationService", "Sending location update for surveyor: $surveyorId")
                
                // Create ISO 8601 timestamp format as expected by backend
                val isoFormat = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", Locale.getDefault())
                val timestamp = isoFormat.format(Date())
                
                // Create LiveLocationMessage in the format expected by backend
                val liveLocationMessage = LiveLocationMessage(
                    surveyorId = surveyorId,
                    latitude = location.latitude,
                    longitude = location.longitude,
                    timestamp = timestamp
                )
                
                Log.d("LocationService", "Sending to /api/live/location: $liveLocationMessage")
                val response = ApiClient.apiService.updateLocation(liveLocationMessage)
                
                if (response.isSuccessful) {
                    Log.d("LocationService", "Location update sent successfully")
                    val responseText = response.body()?.string() ?: "No response body"
                    Log.d("LocationService", "Response: $responseText")
                } else {
                    Log.e("LocationService", "Failed to send location update: ${response.code()}")
                    Log.e("LocationService", "Error response: ${response.errorBody()?.string()}")
                }
            } catch (e: Exception) {
                Log.e("LocationService", "Error sending location update", e)
                // Handle error - could store locally for later sync
                e.printStackTrace()
            }
        }
    }
}
