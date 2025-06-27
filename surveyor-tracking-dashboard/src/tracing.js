// Simple OpenTelemetry Web SDK Initialization for Surveyor Tracking Dashboard
import { WebTracerProvider } from '@opentelemetry/sdk-trace-web';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { OTLPTraceExporter } from '@opentelemetry/exporter-otlp-http';
import { FetchInstrumentation } from '@opentelemetry/instrumentation-fetch';
import { XMLHttpRequestInstrumentation } from '@opentelemetry/instrumentation-xml-http-request';
import { registerInstrumentations } from '@opentelemetry/instrumentation';
import { trace } from '@opentelemetry/api';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';

/**
 * Initialize OpenTelemetry for the Surveyor Tracking React Dashboard
 */
export function initializeOpenTelemetry() {
  console.log('🔭 Initializing OpenTelemetry for Surveyor Tracking Dashboard...');

  // Create resource with proper attributes
  const resource = new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: 'surveyor-tracking-dashboard',
    [SemanticResourceAttributes.SERVICE_VERSION]: '1.0.0',
    [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: 'development',
    [SemanticResourceAttributes.SERVICE_INSTANCE_ID]: `dashboard-${Date.now()}`,
  });

  // Create a tracer provider with proper resource
  const provider = new WebTracerProvider({
    resource: resource,
  });

  // Configure exporters
  const isDevelopment = process.env.NODE_ENV === 'development';
  const otlpEndpoint = process.env.REACT_APP_OTLP_ENDPOINT || 'http://localhost:4318';

  // OTLP Exporter for Jaeger
  const otlpExporter = new OTLPTraceExporter({
    url: `${otlpEndpoint}/v1/traces`,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  // Add span processors
  provider.addSpanProcessor(new BatchSpanProcessor(otlpExporter));

  // Debug logging for development
  if (isDevelopment) {
    console.log('🔭 OpenTelemetry configured for development with OTLP endpoint:', otlpEndpoint);
  }

  // Register the provider
  provider.register();

  // Register instrumentations for automatic HTTP tracing
  registerInstrumentations({
    instrumentations: [
      // Instrument fetch() calls
      new FetchInstrumentation({
        // Propagate trace headers to backend
        propagateTraceHeaderCorsUrls: [
          /^http:\/\/localhost:8080.*/, // Backend URL pattern
          /^https:\/\/.*\.your-domain\.com.*/, // Production URLs
        ],
        // Ignore certain URLs
        ignoreUrls: [
          /^.*\/health$/, // Health check endpoints
          /.*\.js$/, /.*\.css$/, /.*\.png$/, /.*\.jpg$/, // Static assets
        ],
        // Add custom attributes
        applyCustomAttributesOnSpan: (span, request, result) => {
          span.setAttribute('http.request.method', request.method || 'GET');
          span.setAttribute('http.url', request.url);
          if (result instanceof Response) {
            span.setAttribute('http.response.status_code', result.status);
          }
        },
      }),

      // Instrument XMLHttpRequest calls
      new XMLHttpRequestInstrumentation({
        propagateTraceHeaderCorsUrls: [
          /^http:\/\/localhost:8080.*/,
          /^https:\/\/.*\.your-domain\.com.*/,
        ],
        ignoreUrls: [/^.*\/health$/],
      }),
    ],
  });

  console.log('✅ OpenTelemetry initialized successfully!');
  console.log(`📊 Traces will be sent to: ${otlpEndpoint}`);
  
  return trace.getTracer('surveyor-tracking-dashboard', '1.0.0');
}

/**
 * Custom tracing utilities for Surveyor Tracking specific operations
 */
export class SurveyorTracingService {
  constructor(tracer) {
    this.tracer = tracer;
  }

  /**
   * Trace map interactions (zoom, pan, layer changes)
   */
  traceMapInteraction(action, attributes = {}) {
    const span = this.tracer.startSpan(`map.${action}`, {
      attributes: {
        'map.action': action,
        'component': 'surveyor-map',
        ...attributes,
      },
    });

    return {
      end: (additionalAttributes = {}) => {
        Object.entries(additionalAttributes).forEach(([key, value]) => {
          span.setAttribute(key, value);
        });
        span.end();
      },
      addEvent: (name, eventAttributes = {}) => {
        span.addEvent(name, eventAttributes);
      },
    };
  }

  /**
   * Trace route calculations and visualizations
   */
  traceRouteOperation(operation, routeData = {}) {
    const span = this.tracer.startSpan(`route.${operation}`, {
      attributes: {
        'route.operation': operation,
        'component': 'route-calculator',
        'route.surveyor_id': routeData.surveyorId || 'unknown',
        'route.points_count': routeData.pointsCount || 0,
        ...routeData,
      },
    });

    return {
      end: (success = true, error = null) => {
        span.setAttribute('operation.success', success);
        if (error) {
          span.setAttribute('error.message', error.message);
          span.setAttribute('error.type', error.constructor.name);
        }
        span.end();
      },
      addEvent: (name, eventAttributes = {}) => {
        span.addEvent(name, eventAttributes);
      },
    };
  }

  /**
   * Trace user interactions with filters and controls
   */
  traceUserInteraction(action, component, data = {}) {
    const span = this.tracer.startSpan(`user.${action}`, {
      attributes: {
        'user.action': action,
        'ui.component': component,
        'component': 'dashboard-ui',
        ...data,
      },
    });

    return {
      end: (result = {}) => {
        Object.entries(result).forEach(([key, value]) => {
          span.setAttribute(key, value);
        });
        span.end();
      },
    };
  }

  /**
   * Trace data fetching operations
   */
  traceDataFetch(endpoint, params = {}) {
    const span = this.tracer.startSpan(`data.fetch`, {
      attributes: {
        'data.endpoint': endpoint,
        'data.operation': 'fetch',
        'component': 'data-service',
        ...params,
      },
    });

    return {
      end: (success = true, responseSize = 0, error = null) => {
        span.setAttribute('operation.success', success);
        span.setAttribute('data.response.size', responseSize);
        if (error) {
          span.setAttribute('error.message', error.message);
          span.setAttribute('error.type', error.constructor.name);
        }
        span.end();
      },
    };
  }
}

// Export singleton tracer
let tracerInstance = null;
let tracingServiceInstance = null;

export function getTracer() {
  if (!tracerInstance) {
    tracerInstance = initializeOpenTelemetry();
  }
  return tracerInstance;
}

export function getTracingService() {
  if (!tracingServiceInstance) {
    tracingServiceInstance = new SurveyorTracingService(getTracer());
  }
  return tracingServiceInstance;
}
