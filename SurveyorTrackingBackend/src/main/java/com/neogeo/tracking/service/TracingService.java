package com.neogeo.tracking.service;

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
     * Trace database operations
     */
    public <T> T traceDatabaseOperation(String operationType, String tableName, 
                                        TracedOperation<T> operation) {
        Span span = tracer.spanBuilder("db." + operationType)
                .setAttribute("db.operation", operationType)
                .setAttribute("db.table", tableName)
                .setAttribute("operation.type", "database")
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
     * Trace external API calls (OSRM, geocoding, etc.)
     */
    public <T> T traceExternalApiCall(String apiName, String endpoint, 
                                      Map<String, String> parameters,
                                      TracedOperation<T> operation) {
        Span span = tracer.spanBuilder("external." + apiName)
                .setAttribute("external.api", apiName)
                .setAttribute("external.endpoint", endpoint)
                .setAttribute("operation.type", "external_api")
                .startSpan();

        // Add parameters as attributes
        if (parameters != null) {
            parameters.forEach((key, value) -> 
                span.setAttribute("external.param." + key, value));
        }

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
     * Trace WebSocket operations
     */
    public <T> T traceWebSocketOperation(String operationType, String topic, 
                                         TracedOperation<T> operation) {
        Span span = tracer.spanBuilder("websocket." + operationType)
                .setAttribute("websocket.operation", operationType)
                .setAttribute("websocket.topic", topic)
                .setAttribute("operation.type", "websocket")
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
     * Functional interface for traced operations
     */
    @FunctionalInterface
    public interface TracedOperation<T> {
        T execute() throws RuntimeException;
    }
}
