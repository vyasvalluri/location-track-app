package com.neogeo.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.web.servlet.HandlerInterceptor;
import org.springframework.lang.NonNull;

@Configuration
public class WebConfig implements WebMvcConfigurer {

    @Override
    public void addCorsMappings(@NonNull CorsRegistry registry) {
        // Important: When using allowCredentials(true), we cannot use * for origins
        registry.addMapping("/**")
                .allowedOrigins(
                        "http://localhost:3000", 
                        "http://127.0.0.1:3000")
                .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS")
                .allowedHeaders("*")
                .exposedHeaders("Access-Control-Allow-Origin", "Access-Control-Allow-Credentials")
                .allowCredentials(true)
                .maxAge(3600); // Cache preflight requests for 1 hour
        
        // Log CORS configuration
        System.out.println("CORS configuration set up with specific allowed origins: " + 
                          "http://localhost:3000, http://127.0.0.1:3000");
    }

    @Override
    public void addInterceptors(@NonNull InterceptorRegistry registry) {
        registry.addInterceptor(new HandlerInterceptor() {
            @Override
            public boolean preHandle(@NonNull HttpServletRequest request, @NonNull HttpServletResponse response, @NonNull Object handler) {
                // Explicitly set HTTP 1.1 protocol version headers
                response.setHeader("Content-Type", "application/json; charset=utf-8");
                response.setHeader("Server", "Spring Boot");
                // Additional headers for remote access
                response.setHeader("Connection", "keep-alive");
                response.setHeader("X-Content-Type-Options", "nosniff");
                response.setHeader("Access-Control-Allow-Origin", "*");
                response.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
                response.setHeader("Access-Control-Allow-Headers", "*");
                // Set cache control to prevent caching issues
                response.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
                // Explicitly set HTTP/1.1 status line
                response.setStatus(HttpServletResponse.SC_OK);
                return true;
            }
        });
    }
}
