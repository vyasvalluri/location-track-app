package com.neogeo.SurveyorTrackingBackend.service;

import io.opentelemetry.api.trace.Span;
import io.opentelemetry.api.trace.Tracer;
import io.opentelemetry.context.Scope;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.Map;

@Service
public class TracingService {

    @Autowired
    private Tracer tracer;

    /**
     * Trace GPS data processing operations
     */
    public <T> T traceGpsOperation(String operationName, String surveyorId, 
                                   int dataPointsCount, TracedOperation<T> operation) {
        Span span = tracer.spanBuilder("gps." + operationName)
                .setAttribute("surveyor.id", surveyorId)
                .setAttribute("gps.data_points", dataPointsCount)
                .setAttribute("operation.type", "gps_processing")
                .startSpan();

        try (Scope scope = span.makeCurrent()) {
            T result = operation.execute();
            span.setAttribute("operation.success", true);
            return result;
        } catch (RuntimeException e) {
            span.setAttribute("operation.success", false)
                .setAttribute("error.message", e.getMessage())
                .setAttribute("error.type", e.getClass().getSimpleName());
            throw e;
        } finally {
            span.end();
        }
    }

    /**
     * Trace route calculation operations (OSRM calls)
     */
    public <T> T traceRouteCalculation(String startLat, String startLon, 
                                       String endLat, String endLon, 
                                       TracedOperation<T> operation) {
        Span span = tracer.spanBuilder("route.calculate")
                .setAttribute("route.start.lat", startLat)
                .setAttribute("route.start.lon", startLon)
                .setAttribute("route.end.lat", endLat)
                .setAttribute("route.end.lon", endLon)
                .setAttribute("operation.type", "route_calculation")
                .startSpan();

        try (Scope scope = span.makeCurrent()) {
            long startTime = System.currentTimeMillis();
            T result = operation.execute();
            long duration = System.currentTimeMillis() - startTime;
            
            span.setAttribute("operation.success", true)
                .setAttribute("route.calculation_time_ms", duration);
            return result;
        } catch (RuntimeException e) {
            span.setAttribute("operation.success", false)
                .setAttribute("error.message", e.getMessage())
                .setAttribute("error.type", e.getClass().getSimpleName());
            throw e;
        } finally {
            span.end();
        }
    }

    /**
     * Trace database operations
     */
    public <T> T traceDatabaseOperation(String operationName, String table, 
                                        TracedOperation<T> operation) {
        Span span = tracer.spanBuilder("db." + operationName)
                .setAttribute("db.table", table)
                .setAttribute("db.operation", operationName)
                .setAttribute("operation.type", "database")
                .startSpan();

        try (Scope scope = span.makeCurrent()) {
            long startTime = System.currentTimeMillis();
            T result = operation.execute();
            long duration = System.currentTimeMillis() - startTime;
            
            span.setAttribute("operation.success", true)
                .setAttribute("db.query_time_ms", duration);
            return result;
        } catch (RuntimeException e) {
            span.setAttribute("operation.success", false)
                .setAttribute("error.message", e.getMessage())
                .setAttribute("error.type", e.getClass().getSimpleName());
            throw e;
        } finally {
            span.end();
        }
    }

    /**
     * Trace API calls to external services
     */
    public <T> T traceExternalApiCall(String serviceName, String endpoint, 
                                      TracedOperation<T> operation) {
        Span span = tracer.spanBuilder("external." + serviceName)
                .setAttribute("http.url", endpoint)
                .setAttribute("external.service", serviceName)
                .setAttribute("operation.type", "external_api")
                .startSpan();

        try (Scope scope = span.makeCurrent()) {
            long startTime = System.currentTimeMillis();
            T result = operation.execute();
            long duration = System.currentTimeMillis() - startTime;
            
            span.setAttribute("operation.success", true)
                .setAttribute("http.response_time_ms", duration);
            return result;
        } catch (RuntimeException e) {
            span.setAttribute("operation.success", false)
                .setAttribute("error.message", e.getMessage())
                .setAttribute("error.type", e.getClass().getSimpleName());
            throw e;
        } finally {
            span.end();
        }
    }

    /**
     * Add custom attributes to current span
     */
    public void addCustomAttributes(Map<String, String> attributes) {
        Span currentSpan = Span.current();
        attributes.forEach(currentSpan::setAttribute);
    }

    /**
     * Functional interface for traced operations
     */
    @FunctionalInterface
    public interface TracedOperation<T> {
        T execute();
    }
}
