package com.surveyor.tracking.api

import okhttp3.Interceptor
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.util.concurrent.TimeUnit
import android.util.Base64

object ApiClient {
    private const val BASE_URL = "http://183.82.114.29:6565/api/"
    
    private val loggingInterceptor = HttpLoggingInterceptor().apply {
        level = HttpLoggingInterceptor.Level.BODY
    }
    
    // Basic Auth interceptor for location updates
    private val basicAuthInterceptor = Interceptor { chain ->
        val request = chain.request()
        
        // Add Basic Auth header for location update requests
        val newRequest = if (request.url.encodedPath.contains("live/location")) {
            val credentials = "admin:admin123"
            val basicAuth = "Basic " + Base64.encodeToString(credentials.toByteArray(), Base64.NO_WRAP)
            request.newBuilder()
                .addHeader("Authorization", basicAuth)
                .build()
        } else {
            request
        }
        
        chain.proceed(newRequest)
    }
    
    private val httpClient = OkHttpClient.Builder()
        .addInterceptor(loggingInterceptor)
        .addInterceptor(basicAuthInterceptor)
        .connectTimeout(30, TimeUnit.SECONDS)
        .readTimeout(30, TimeUnit.SECONDS)
        .writeTimeout(30, TimeUnit.SECONDS)
        .build()
    
    private val retrofit = Retrofit.Builder()
        .baseUrl(BASE_URL)
        .client(httpClient)
        .addConverterFactory(GsonConverterFactory.create())
        .build()
    
    val apiService: ApiService = retrofit.create(ApiService::class.java)
}
