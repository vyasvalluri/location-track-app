package com.surveyor.tracking.viewmodel

import android.app.Application
import android.content.Context
import android.util.Log
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.viewModelScope
import com.google.gson.Gson
import com.surveyor.tracking.api.ApiClient
import com.surveyor.tracking.model.LoginRequest
import com.surveyor.tracking.model.Surveyor
import kotlinx.coroutines.launch

class AuthViewModel(application: Application) : AndroidViewModel(application) {
    
    private val sharedPrefs = application.getSharedPreferences("surveyor_prefs", Context.MODE_PRIVATE)
    private val gson = Gson()
    
    private val _loginState = MutableLiveData<LoginState>()
    val loginState: LiveData<LoginState> = _loginState
    
    private val _currentSurveyor = MutableLiveData<Surveyor?>()
    val currentSurveyor: LiveData<Surveyor?> = _currentSurveyor
    
    init {
        // Load saved surveyor data on initialization
        Log.d("AuthViewModel", "AuthViewModel initialized, loading surveyor data")
        loadSurveyorFromPrefs()
    }
    
    private fun loadSurveyorFromPrefs() {
        val surveyorJson = sharedPrefs.getString("current_surveyor", null)
        Log.d("AuthViewModel", "Loading surveyor from prefs: $surveyorJson")
        if (surveyorJson != null) {
            try {
                val surveyor = gson.fromJson(surveyorJson, Surveyor::class.java)
                Log.d("AuthViewModel", "Loaded surveyor: ${surveyor.name} (${surveyor.id})")
                _currentSurveyor.value = surveyor
                _loginState.value = LoginState.Success
                Log.d("AuthViewModel", "Surveyor data set in LiveData")
            } catch (e: Exception) {
                Log.e("AuthViewModel", "Error loading surveyor from prefs", e)
                clearSurveyorFromPrefs()
                _currentSurveyor.value = null
                _loginState.value = LoginState.LoggedOut
            }
        } else {
            Log.d("AuthViewModel", "No saved surveyor data found")
            _currentSurveyor.value = null
            _loginState.value = LoginState.LoggedOut
        }
    }
    
    private fun saveSurveyorToPrefs(surveyor: Surveyor) {
        val surveyorJson = gson.toJson(surveyor)
        Log.d("AuthViewModel", "Saving surveyor to prefs: $surveyorJson")
        sharedPrefs.edit().putString("current_surveyor", surveyorJson).apply()
    }
    
    private fun clearSurveyorFromPrefs() {
        sharedPrefs.edit().remove("current_surveyor").apply()
    }
    
    fun login(username: String, password: String) {
        if (username.isBlank() || password.isBlank()) {
            _loginState.value = LoginState.Error("Please enter username and password")
            return
        }
        
        _loginState.value = LoginState.Loading
        
        viewModelScope.launch {
            try {
                val response = ApiClient.apiService.login(LoginRequest(username, password))
                if (response.isSuccessful && response.body()?.success == true) {
                    val surveyor = response.body()?.surveyor
                    if (surveyor != null) {
                        _currentSurveyor.value = surveyor
                        saveSurveyorToPrefs(surveyor)
                        _loginState.value = LoginState.Success
                    } else {
                        _loginState.value = LoginState.Error("Invalid response data")
                    }
                } else {
                    val message = response.body()?.message ?: "Login failed"
                    _loginState.value = LoginState.Error(message)
                }
            } catch (e: Exception) {
                _loginState.value = LoginState.Error("Network error: ${e.message}")
            }
        }
    }
    
    fun logout() {
        _currentSurveyor.value = null
        clearSurveyorFromPrefs()
        _loginState.value = LoginState.LoggedOut
    }
    
    fun refreshSurveyorData() {
        Log.d("AuthViewModel", "Manually refreshing surveyor data")
        loadSurveyorFromPrefs()
    }
    
    sealed class LoginState {
        object Loading : LoginState()
        object Success : LoginState()
        object LoggedOut : LoginState()
        data class Error(val message: String) : LoginState()
    }
}
