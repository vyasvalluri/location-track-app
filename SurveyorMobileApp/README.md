# Surveyor Mobile App

## Overview
A clean, modern Android application for surveyor location tracking with real-time synchronization to the backend API.

## Features
- ✅ User authentication (login/logout)
- ✅ Real-time location tracking via foreground service
- ✅ Background location updates with notifications
- ✅ API integration with backend at 183.82.114.29:6565
- ✅ Modern MVVM architecture with ViewModels and LiveData
- ✅ Permission handling for location services
- ✅ Clean UI with Material Design components

## Architecture
- **MVVM Pattern**: ViewModels manage UI state and business logic
- **Repository Pattern**: Clean separation of data sources
- **Retrofit**: HTTP client for API communication
- **Foreground Service**: Continuous location tracking
- **Material Design**: Modern, consistent UI

## Key Components

### Activities
- `LoginActivity` - User authentication
- `MainActivity` - Main dashboard with tracking controls

### ViewModels
- `AuthViewModel` - Manages authentication state
- `LocationViewModel` - Handles location tracking and history

### Services
- `LocationTrackingService` - Foreground service for GPS tracking

### API Integration
- `ApiService` - Retrofit interface for backend communication
- `ApiClient` - HTTP client configuration

## Build Status
✅ **Successfully Built**: APK generated at `app/build/outputs/apk/debug/app-debug.apk`

## Next Steps
1. Test on Android device/emulator
2. Verify API connectivity with backend
3. Test location permissions and tracking
4. Validate real-time synchronization

## Installation
```bash
# Build the project
./gradlew assembleDebug

# Install on device (with ADB)
adb install app/build/outputs/apk/debug/app-debug.apk
```

## Backend Integration
The app is configured to connect to:
- **Base URL**: http://183.82.114.29:6565/api/
- **Endpoints**: login, location updates, surveyor management

## Dependencies
- AndroidX libraries for modern Android development
- Retrofit for networking
- Google Play Services for location
- Material Design components
- Kotlin coroutines for async operations
