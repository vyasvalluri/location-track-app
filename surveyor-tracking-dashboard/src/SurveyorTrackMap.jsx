// filepath: /Users/valluri/Personal/Projects/Tracking/surveyor-tracking-dashboard/src/SurveyorTrackMap.jsx
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Map, View } from 'ol';
import { LineString, Point } from 'ol/geom';
import { Vector as VectorLayer, Tile as TileLayer } from 'ol/layer';
import { Vector as VectorSource } from 'ol/source';
import { XYZ } from 'ol/source';
import { Feature } from 'ol';
import { Stroke, Style, Text, Fill, Circle as CircleStyle, Icon } from 'ol/style';
import { fromLonLat, toLonLat } from 'ol/proj';
import Overlay from 'ol/Overlay';
import { defaults as defaultControls, Zoom } from 'ol/control';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import config from './config';
import './SurveyorTrackMap.css';

// Helper: assign a color per surveyor
const COLORS = [
  '#2563eb', '#16a34a', '#f59e42', '#e11d48', '#a21caf', '#0e7490', '#facc15', '#ea580c', 
  '#64748b', '#7c3aed', '#059669', '#be185d', '#b91c1c', '#f43f5e', '#0ea5e9', '#fbbf24'
];

// Module-level cache for route data to avoid React ref issues
let routeCache = new Map();

// Module-level view state preservation with localStorage backup
let preservedMapView = (() => {
  try {
    const saved = localStorage.getItem('surveyorMapView');
    if (saved) {
      const parsed = JSON.parse(saved);
      return parsed;
    }
  } catch (e) {
    console.warn('Failed to restore view from localStorage:', e);
  }
  return {
    center: fromLonLat([78.9629, 20.5937]), // Default India center
    zoom: 5
  };
})();

// Track if this is the initial data load (should fit view) vs subsequent updates (preserve zoom)
let isInitialDataLoad = true;
let lastSurveyorIds = [];
let lastHistoricalSurveyorId = null; // Track historical surveyor changes

// Initialize cache function with defensive checks
const getRouteCache = () => {
  try {
    if (!routeCache || typeof routeCache.has !== 'function') {
      routeCache = new Map();
    }
    return routeCache;
  } catch (error) {
    console.error('Error with route cache, creating new one:', error);
    routeCache = new Map();
    return routeCache;
  }
};

const SurveyorTrackMap = ({ surveyorIds, from, to, liveTracking }) => {
  // Refs
  const mapRef = useRef(null);
  const mapContainerRef = useRef(null);
  const popupElementRef = useRef(null);
  const popupContentRef = useRef(null);
  const popupCloserRef = useRef(null);
  const popupOverlayRef = useRef(null);
  const pathLayerRef = useRef(null);
  const markerLayerRef = useRef(null);
  const gpsPointsLayerRef = useRef(null); // New layer for individual GPS points
  const coordsMapRef = useRef({});
  const pollingRefs = useRef({});

  // State
  const [surveyorDetails, setSurveyorDetails] = useState({});
  const [useStreetRoutes, setUseStreetRoutes] = useState(true); // Enable street routes by default
  const [routingStatus, setRoutingStatus] = useState('ready'); // 'ready', 'routing', 'success', 'fallback'
  const [activeRoutingService, setActiveRoutingService] = useState(''); // Track which routing service is being used

  // Simple OSRM routing function for long segments
  const getOSRMRoute = useCallback(async (startPoint, endPoint) => {
    const { lon: startLon, lat: startLat } = startPoint;
    const { lon: endLon, lat: endLat } = endPoint;
    
    const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${startLon},${startLat};${endLon},${endLat}?overview=full&geometries=geojson`;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    
    try {
      const response = await fetch(osrmUrl, {
        method: 'GET',
        signal: controller.signal,
        mode: 'cors',
        headers: { 'Accept': 'application/json' }
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data && data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        if (route.geometry && route.geometry.coordinates) {
          // Return coordinates in the expected format
          return route.geometry.coordinates.map(coord => ({
            lon: coord[0],
            lat: coord[1]
          }));
        }
      }
      
      return null;
    } catch (error) {
      clearTimeout(timeoutId);
      return null;
    }
  }, []);

  // Enhanced interpolated path that better simulates street-following behavior
  const createEnhancedInterpolatedPath = useCallback((startCoord, endCoord) => {
    const [startLon, startLat] = toLonLat(startCoord);
    const [endLon, endLat] = toLonLat(endCoord);
    
    // Calculate distance
    const distance = Math.sqrt(
      Math.pow(endLon - startLon, 2) + Math.pow(endLat - startLat, 2)
    );
    
    // For very short distances, use direct line
    if (distance < 0.00005) {
      return [startCoord, endCoord];
    }
    
    // Create enhanced interpolated points with more sophisticated street-like behavior
    const points = [startCoord];
    const numPoints = Math.max(3, Math.min(Math.ceil(distance * 12000), 15)); // More points than basic interpolation
    
    for (let i = 1; i < numPoints; i++) {
      const t = i / numPoints;
      
      // Base linear interpolation
      let lat = startLat + (endLat - startLat) * t;
      let lon = startLon + (endLon - startLon) * t;
      
      // Enhanced curves to better simulate street following
      const curveIntensity = Math.min(distance * 800, 0.8); // More pronounced curves
      
      // Multiple sine wave variations for more realistic street patterns
      const primaryCurve = Math.sin(t * Math.PI) * curveIntensity;
      const secondaryCurve = Math.sin(t * Math.PI * 2) * curveIntensity * 0.3;
      const tertiaryCurve = Math.sin(t * Math.PI * 4) * curveIntensity * 0.1;
      
      const totalCurve = primaryCurve + secondaryCurve + tertiaryCurve;
      
      // Apply curve perpendicular to the main direction
      const mainDirection = Math.atan2(endLat - startLat, endLon - startLon);
      const perpDirection = mainDirection + Math.PI / 2;
      
      // Add enhanced curve variation
      lat += Math.sin(perpDirection) * totalCurve * 0.0001;
      lon += Math.cos(perpDirection) * totalCurve * 0.0001;
      
      // Add more realistic random variation for street-like behavior
      const randomVariation = distance * 0.1;
      lat += (Math.random() - 0.5) * randomVariation * 0.0001;
      lon += (Math.random() - 0.5) * randomVariation * 0.0001;
      
      points.push(fromLonLat([lon, lat]));
    }
    
    points.push(endCoord);
    
    return points;
  }, []);

  const getStreetRoute = useCallback(async (startCoord, endCoord) => {
    const debugId = Math.random().toString(36).substring(7);
    
    try {
      // Convert from map projection back to lon/lat for routing API
      const [startLon, startLat] = toLonLat(startCoord);
      const [endLon, endLat] = toLonLat(endCoord);
      
      
      // Create cache key
      const cacheKey = `${startLon.toFixed(6)},${startLat.toFixed(6)}-${endLon.toFixed(6)},${endLat.toFixed(6)}`;
      
      // Get cache with defensive initialization
      const cache = getRouteCache();
      
      // Check cache first
      if (cache && typeof cache.has === 'function' && cache.has(cacheKey)) {
        return cache.get(cacheKey);
      }
      
      // Calculate distance to determine if we need routing
      const distance = Math.sqrt(
        Math.pow(endLon - startLon, 2) + Math.pow(endLat - startLat, 2)
      );
      const distanceInMeters = Math.round(distance * 111000);
      
      
      // For very short distances (< 50m), use direct line
      if (distance < 0.0005) {
        return [startCoord, endCoord];
      }
      
      
      // Try OSRM (Open Source Routing Machine) - Working reliably
      const timeStart = Date.now();
      const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${startLon},${startLat};${endLon},${endLat}?overview=full&geometries=geojson`;
      const osrmHeaders = { 'Accept': 'application/json' };
      
      
      // Set up timeout for the request
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
      }, 10000);
      
      try {
        const fetchOptions = {
          method: 'GET',
          signal: controller.signal,
          mode: 'cors',
          headers: osrmHeaders
        };
        
        
        const response = await fetch(osrmUrl, fetchOptions);
        clearTimeout(timeoutId);
        
        const responseTime = Date.now() - timeStart;
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        // Parse OSRM response
        if (data && data.routes && Array.isArray(data.routes) && data.routes.length > 0) {
          const route = data.routes[0];
          
          if (route.geometry && route.geometry.coordinates && Array.isArray(route.geometry.coordinates)) {
            const coordinates = route.geometry.coordinates;
            
            const mapCoords = coordinates.map(coord => fromLonLat([coord[0], coord[1]]));
            
            // EXPERIMENTAL: Test coordinate order swap for debugging
            const mapCoordsSwapped = coordinates.map(coord => fromLonLat([coord[1], coord[0]]));
            
            // Calculate which one is closer to the expected start coordinate
            const originalDiff = Math.sqrt(Math.pow(startCoord[0] - mapCoords[0][0], 2) + Math.pow(startCoord[1] - mapCoords[0][1], 2));
            const swappedDiff = Math.sqrt(Math.pow(startCoord[0] - mapCoordsSwapped[0][0], 2) + Math.pow(startCoord[1] - mapCoordsSwapped[0][1], 2));
            
            if (swappedDiff < originalDiff) {
              console.warn(`🚨 [${debugId}] COORDINATE ORDER ISSUE DETECTED! Swapped coordinates are closer to expected position!`);
              console.warn(`🔧 [${debugId}] OSRM might be returning [lat,lon] instead of [lon,lat]. Consider fixing the coordinate order.`);
            } else {
            }
            
            // ENHANCED DEBUG: Compare input and output coordinate ranges
            
            // Validate coordinate ranges - projected coordinates should be large numbers
            const avgX = mapCoords[0][0];
            const avgY = mapCoords[0][1];
            if (Math.abs(avgX) < 1000 || Math.abs(avgY) < 1000) {
              console.error(`❌ [${debugId}] COORDINATE ISSUE: Projected coordinates too small! [${avgX}, ${avgY}]`);
            } else {
            }
            
            // Cache the result
            if (cache && typeof cache.set === 'function') {
              cache.set(cacheKey, mapCoords);
            }
            
            // ENHANCED DEBUG: Verify start/end coordinate alignment
            
            const startDiff = Math.sqrt(Math.pow(startCoord[0] - mapCoords[0][0], 2) + Math.pow(startCoord[1] - mapCoords[0][1], 2));
            const endDiff = Math.sqrt(Math.pow(endCoord[0] - mapCoords[mapCoords.length-1][0], 2) + Math.pow(endCoord[1] - mapCoords[mapCoords.length-1][1], 2));
            
            if (startDiff > 1000 || endDiff > 1000) {
              console.warn(`⚠️ [${debugId}] Large coordinate differences detected! Route may not connect properly.`);
            }
            
            // ENHANCED DEBUG: Show coordinate comparison in a clear format
            
            // POTENTIAL FIX: Check if OSRM coordinates are in the wrong order (lat,lon instead of lon,lat)
            if (Math.abs(coordinates[0][0]) < 90 && Math.abs(coordinates[0][1]) > 90) {
              console.warn(`🚨 [${debugId}] POTENTIAL COORDINATE ORDER ISSUE: OSRM may be returning [lat,lon] instead of [lon,lat]!`);
              console.warn(`  📍 First coordinate: [${coordinates[0][0]}, ${coordinates[0][1]}] - if first < 90 and second > 90, this looks like [lat,lon]`);
              console.warn(`  🔧 Consider swapping coordinate order in transformation!`);
            }
            
            
            setRoutingStatus('success');
            setActiveRoutingService('OSRM');
            return mapCoords;
          } else {
            console.warn(`⚠️ [${debugId}] OSRM route has no valid geometry.coordinates:`, route.geometry);
            throw new Error('OSRM route has no valid geometry coordinates');
          }
        } else {
          console.warn(`⚠️ [${debugId}] OSRM response has no valid routes:`, data);
          throw new Error('OSRM response has no valid routes');
        }
      } catch (error) {
        clearTimeout(timeoutId);
        const errorTime = Date.now() - timeStart;
        console.error(`❌ [${debugId}] OSRM failed after ${errorTime}ms:`, error);
        
        // OSRM failed, fall back to enhanced interpolation
        setRoutingStatus('fallback');
        setActiveRoutingService('Enhanced Street Simulation');
        const fallbackResult = createEnhancedInterpolatedPath(startCoord, endCoord);
        return fallbackResult;
      }
      
    } catch (error) {
      console.error(`� [${debugId}] Outer catch - Street routing error, using enhanced interpolated path:`, error);
      setRoutingStatus('fallback');
      setActiveRoutingService('Enhanced Street Simulation');
      const errorFallbackResult = createEnhancedInterpolatedPath(startCoord, endCoord);
      return errorFallbackResult;
    }
  }, [setRoutingStatus, setActiveRoutingService, createEnhancedInterpolatedPath]); // Dependencies for getStreetRoute useCallback
  
  // Helper function to create an interpolated path (better than straight line)
  const createInterpolatedPath = useCallback((startCoord, endCoord) => {
    const [startLon, startLat] = toLonLat(startCoord);
    const [endLon, endLat] = toLonLat(endCoord);
    
    // Calculate distance
    const distance = Math.sqrt(
      Math.pow(endLon - startLon, 2) + Math.pow(endLat - startLat, 2)
    );
    
    // For very short distances, use direct line
    if (distance < 0.00005) {
      return [startCoord, endCoord];
    }
    
    // Create interpolated points with realistic street-like curves
    const points = [startCoord];
    const numPoints = Math.max(2, Math.min(Math.ceil(distance * 8000), 8)); // 2-8 intermediate points
    
    for (let i = 1; i < numPoints; i++) {
      const t = i / numPoints;
      
      // Base linear interpolation
      let lat = startLat + (endLat - startLat) * t;
      let lon = startLon + (endLon - startLon) * t;
      
      // Add gentle curves to simulate street following
      const curveIntensity = Math.min(distance * 500, 0.5); // Scale curve with distance
      
      // Add sine wave variation for natural curves
      const curveOffset = Math.sin(t * Math.PI) * curveIntensity;
      
      // Apply curve perpendicular to the main direction
      const mainDirection = Math.atan2(endLat - startLat, endLon - startLon);
      const perpDirection = mainDirection + Math.PI / 2;
      
      // Add curve variation
      lat += Math.sin(perpDirection) * curveOffset * 0.0001;
      lon += Math.cos(perpDirection) * curveOffset * 0.0001;
      
      // Add small random variation for realism (very small for short distances)
      const randomVariation = distance * 0.05;
      lat += (Math.random() - 0.5) * randomVariation * 0.0001;
      lon += (Math.random() - 0.5) * randomVariation * 0.0001;
      
      points.push(fromLonLat([lon, lat]));
    }
    
    points.push(endCoord);
    
    return points;
  }, []); // No dependencies needed for interpolated path

  // Enhanced street path creation specifically for GPS track points
  const createEnhancedStreetPath = useCallback(async (coords) => {
    if (!coords || coords.length < 2) {
      return coords;
    }
    
    
    // Remove duplicate consecutive coordinates to improve routing
    const dedupedCoords = [];
    dedupedCoords.push(coords[0]); // Always include first point
    
    for (let i = 1; i < coords.length; i++) {
      const currentCoord = coords[i];
      const prevCoord = coords[i - 1];
      
      // Calculate distance between consecutive points
      const [prevLon, prevLat] = toLonLat(prevCoord);
      const [currLon, currLat] = toLonLat(currentCoord);
      const distance = Math.sqrt(Math.pow(currLon - prevLon, 2) + Math.pow(currLat - prevLat, 2));
      const distanceInMeters = distance * 111000;
      
      // Only include points that are at least 1 meter apart
      if (distanceInMeters >= 1) {
        dedupedCoords.push(currentCoord);
      }
    }
    
    
    if (dedupedCoords.length < 2) {
      return coords;
    }

    // FOR DEBUGGING: Let's temporarily disable OSRM and use enhanced interpolation for all segments
    const streetPath = [];
    streetPath.push(dedupedCoords[0]); // Start with first point
    
    
    // Process each pair of consecutive GPS points (now deduplicated)
    for (let i = 0; i < dedupedCoords.length - 1; i++) {
      const currentCoord = dedupedCoords[i];
      const nextCoord = dedupedCoords[i + 1];
      
      // Calculate distance between points
      const [currentLon, currentLat] = toLonLat(currentCoord);
      const [nextLon, nextLat] = toLonLat(nextCoord);
      
      const distance = Math.sqrt(
        Math.pow(nextLon - currentLon, 2) + Math.pow(nextLat - currentLat, 2)
      );
      
      const distanceInMeters = Math.round(distance * 111000);
      
      let segmentPath;
      
      if (distance < 0.00005) {
        // Very short distance (<5m) - use direct line
        segmentPath = [currentCoord, nextCoord];
      } else if (distanceInMeters >= 1000) {
        // For long distances (>1km), use OSRM to follow actual streets
        try {
          const [currentLon, currentLat] = toLonLat(currentCoord);
          const [nextLon, nextLat] = toLonLat(nextCoord);
          
          const osrmPath = await getOSRMRoute(
            { lon: currentLon, lat: currentLat },
            { lon: nextLon, lat: nextLat }
          );
          
          if (osrmPath && osrmPath.length > 2) {
            // Convert OSRM coordinates to OpenLayers format
            segmentPath = osrmPath.map(point => fromLonLat([point.lon, point.lat]));
          } else {
            segmentPath = createEnhancedInterpolatedPath(currentCoord, nextCoord);
          }
        } catch (error) {
          segmentPath = createEnhancedInterpolatedPath(currentCoord, nextCoord);
        }
      } else {
        // For medium distances, use enhanced interpolation
        segmentPath = createEnhancedInterpolatedPath(currentCoord, nextCoord);
      }
      
      // Validate segment path
      if (!segmentPath || segmentPath.length < 2) {
        console.warn(`🛣️ ROUTING DEBUG:    ⚠️ Invalid segment path, using direct line`);
        segmentPath = [currentCoord, nextCoord];
      }
      
      // Add the segment (excluding the first point to avoid duplication)
      if (segmentPath.length > 1) {
        const segmentToAdd = segmentPath.slice(1);
        streetPath.push(...segmentToAdd);
      }
    }
    
    const totalPoints = streetPath.length;
    const originalPoints = coords.length;
    const dedupedPoints = dedupedCoords.length;
    const enhancement = ((totalPoints - dedupedPoints) / dedupedPoints * 100).toFixed(1);
    
    
    return streetPath;
  }, [createInterpolatedPath, createEnhancedInterpolatedPath, getStreetRoute]); // Dependencies for createEnhancedStreetPath useCallback

  // Initialize popup with debugging
  useEffect(() => {
    
    if (!popupOverlayRef.current && popupElementRef.current) {
      
      // Initially hide the popup element but make sure it exists in the DOM
      popupElementRef.current.style.display = 'none';
      
      // Create an overlay with the popup element - improved configuration
      const overlay = new Overlay({
        element: popupElementRef.current,
        positioning: 'bottom-center',
        offset: [0, -15], // Slightly increased offset for better positioning
        stopEvent: true,
        autoPan: {
          animation: {
            duration: 250
          },
          margin: 20 // Add margin to ensure popup is fully visible
        },
        className: 'surveyor-popup-overlay' // Add custom class for better targeting
      });
      
      // Store the overlay reference
      popupOverlayRef.current = overlay;
      
      // Add click handler to closer button
      if (popupCloserRef.current) {
        popupCloserRef.current.onclick = () => {
          popupElementRef.current.style.display = 'none';
          overlay.setPosition(undefined);
          return false;
        };
      }
      
      // Add overlay to map if map exists
      if (mapRef.current) {
        mapRef.current.addOverlay(overlay);
      }
    }
  }, []);
  
  // Get surveyor details - wrapped in useCallback to avoid re-creation
  const loadSurveyorDetails = useCallback(async () => {
    if (!surveyorIds || surveyorIds.length === 0) return;
    
    try {
      
      const response = await fetch(`${config.backendHost}/api/surveyors`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        // Remove credentials to avoid CORS issues
        mode: 'cors'
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch surveyor details: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Create a normalized map of surveyor details (case insensitive keys)
      const details = {};
      data.forEach(surveyor => {
        if (surveyor && surveyor.id) {
          // Store with original ID
          details[surveyor.id] = surveyor;
          
          // Also store with lowercase ID for case-insensitive lookups
          const lowercaseId = surveyor.id.toLowerCase();
          if (lowercaseId !== surveyor.id) {
            details[lowercaseId] = surveyor;
          }
          
          // Also store with uppercase ID for case-insensitive lookups
          const uppercaseId = surveyor.id.toUpperCase();
          if (uppercaseId !== surveyor.id) {
            details[uppercaseId] = surveyor;
          }
        }
      });
      
      setSurveyorDetails(details);
    } catch (error) {
      // Use the enhanced error handling from config
      config.handleFetchError(error, `${config.backendHost}/api/surveyors`);
      
      // Create fallback surveyor details when API is unavailable
      const fallbackDetails = {};
      surveyorIds.forEach(id => {
        fallbackDetails[id] = {
          id: id,
          name: `Surveyor ${id}`,
          email: `${id.toLowerCase()}@surveyor.com`,
          status: 'Unknown'
        };
        // Also store with case variations
        fallbackDetails[id.toLowerCase()] = fallbackDetails[id];
        fallbackDetails[id.toUpperCase()] = fallbackDetails[id];
      });
      
      setSurveyorDetails(fallbackDetails);
    }
  }, [surveyorIds]);
  
  // Draw only latest positions for live tracking (no paths)
  const drawLatestPositions = useCallback(async (coordsMap, shouldFitView = false) => {
    if (!markerLayerRef.current) {
      console.error("Marker layer ref not initialized. Cannot draw latest positions.");
      return;
    }

    const markerSource = markerLayerRef.current.getSource();
    
    // Clear existing markers
    markerSource.clear();
    
    // If pathLayer exists, clear it too since we don't want paths in live mode
    if (pathLayerRef.current) {
      pathLayerRef.current.getSource().clear();
    }
    if (gpsPointsLayerRef.current) {
      gpsPointsLayerRef.current.getSource().clear();
    }
    
    
    const latestPositions = [];
    
    // Process each surveyor - only get their latest position
    for (const [id, coords] of Object.entries(coordsMap)) {
      const idx = Object.keys(coordsMap).indexOf(id);
      const color = COLORS[idx % COLORS.length];
      
      if (!coords || coords.length === 0) {
        continue;
      }
      
      // Get only the latest position
      const latestCoord = coords[coords.length - 1];
      latestPositions.push(latestCoord);
      
      
      // Create marker for latest position
      const details = surveyorDetails[id] || { name: id };
      const name = details.name || details.fullName || id;
      
      const markerFeature = new Feature({
        geometry: new Point(latestCoord),
        surveyorId: id,
        surveyorName: name,
        isLatest: true
      });

      // Enhanced marker style for live tracking with pulsing effect
      markerFeature.setStyle(new Style({
        image: new CircleStyle({
          radius: 15, // Larger radius for live tracking
          fill: new Fill({ color: color }),
          stroke: new Stroke({ color: '#ffffff', width: 4 }),
        }),
        text: new Text({
          text: `📍 ${name}`, // Add location pin emoji
          font: 'bold 13px Arial',
          fill: new Fill({ color: '#333' }),
          stroke: new Stroke({ color: '#ffffff', width: 3 }),
          offsetY: -25,
          textAlign: 'center',
          textBaseline: 'bottom'
        })
      }));

      markerSource.addFeature(markerFeature);
    }

    // Fit view to latest positions if requested
    if (latestPositions.length > 0 && shouldFitView) {
      
      if (latestPositions.length === 1) {
        // Single surveyor - center on their position with good zoom level
        const view = mapRef.current.getView();
        view.animate({
          center: latestPositions[0],
          zoom: 15,
          duration: 1000
        });
      } else {
        // Multiple surveyors - fit to show all latest positions
        const extent = new LineString(latestPositions).getExtent();
        const view = mapRef.current.getView();
        view.fit(extent, { 
          padding: [50, 50, 50, 50], 
          maxZoom: 16,
          duration: 1000
        });
      }
    } else if (latestPositions.length > 0) {
    }

    // Update map display
    if (mapRef.current) {
      mapRef.current.updateSize();
    }
  }, [surveyorDetails]);

  // Draw paths and markers with street-following routes (for historical tracking)
  const drawAllPaths = useCallback(async (coordsMap, shouldFitView = false) => {
    if (!pathLayerRef.current || !markerLayerRef.current || !gpsPointsLayerRef.current) {
      console.error("Layer refs not initialized. Cannot draw paths.");
      return;
    }

    setRoutingStatus('routing'); // Set status to routing when starting
    
    const pathSource = pathLayerRef.current.getSource();
    const markerSource = markerLayerRef.current.getSource();
    const gpsPointsSource = gpsPointsLayerRef.current.getSource();
    
    // Clear existing features
    pathSource.clear();
    markerSource.clear();
    gpsPointsSource.clear();
    
    
    // Log IDs before drawing to help with debugging
    const surveyorIds = Object.keys(coordsMap);
    
    // Track routing statistics
    let streetRoutedCount = 0;
    let directPathCount = 0;
    
    // Process each surveyor
    for (const [id, coords] of Object.entries(coordsMap)) {
      const idx = Object.keys(coordsMap).indexOf(id);
      
      if (!coords || !coords.length) {
        continue;
      }
      
      
      // Debug: Log first few coordinates
      if (coords.length > 0) {
        
        // Check coordinate spacing
        if (coords.length > 1) {
          const [firstLon, firstLat] = toLonLat(coords[0]);
          const [secondLon, secondLat] = toLonLat(coords[1]);
          const distance = Math.sqrt(Math.pow(secondLon - firstLon, 2) + Math.pow(secondLat - firstLat, 2));
          const distanceInMeters = distance * 111000;
        }
      }
      
      try {
        // Create street-following path or direct path based on toggle
        let pathCoords;
        if (useStreetRoutes) {
          
          try {
            // Always use enhanced street path creation for consistent results
            pathCoords = await createEnhancedStreetPath(coords);
            streetRoutedCount++;
            
            // Validate the street path
            if (!pathCoords || pathCoords.length < coords.length) {
              console.warn(`🏛️ HISTORICAL ROUTING: ⚠️ Street path for ${id} has fewer points than original, using fallback`);
              throw new Error('Insufficient street path points');
            }
          } catch (streetError) {
            console.warn(`🏛️ HISTORICAL ROUTING: ⚠️ Street routing failed for ${id}, using direct coordinates:`, streetError.message);
            pathCoords = coords; // Fallback to original coordinates
            directPathCount++;
          }
        } else {
          pathCoords = coords;
          directPathCount++;
        }
        
        // Ensure pathCoords is valid
        if (!pathCoords || pathCoords.length < 2) {
          console.warn(`Invalid path coordinates for surveyor ${id}, using original coords`);
          pathCoords = coords; // Use original coordinates as final fallback
        }
        
        if (!pathCoords || pathCoords.length < 2) {
          console.warn(`Still no valid coordinates for surveyor ${id}, skipping`);
          continue;
        }
        
        
        // ENHANCED DEBUG: Check coordinate validity
        const validCoords = pathCoords.filter(coord => 
          Array.isArray(coord) && coord.length === 2 && 
          typeof coord[0] === 'number' && typeof coord[1] === 'number' &&
          !isNaN(coord[0]) && !isNaN(coord[1])
        );
        
        if (validCoords.length < 2) {
          console.error(`Not enough valid coordinates for ${id}, skipping path creation`);
          continue;
        }
        
        // Path - line representing the surveyor's track
        const line = new LineString(validCoords);
        const lineFeature = new Feature({ 
          geometry: line,
          surveyorId: id,  // Store ID for potential clicking on path
          featureType: 'path'
        });
        
        // Clean path styling with thinner lines
        const pathColor = COLORS[idx % COLORS.length]; // Use the predefined color palette
        
        
        // Log feature coordinates for debugging
        const sampleCoords = validCoords.slice(0, 5).map(coord => `[${coord[0].toFixed(2)}, ${coord[1].toFixed(2)}]`);
        
        lineFeature.setStyle(new Style({ 
          stroke: new Stroke({ 
            color: pathColor,        // Use color from palette
            width: 3,                // Thinner line (reduced from 12 to 3)
            lineCap: 'round',
            lineJoin: 'round'
            // Removed dashed pattern for cleaner appearance
          }) 
        }));
        pathSource.addFeature(lineFeature);
        
        // ENHANCED DEBUG: Check if feature was actually added
        const featuresInSource = pathSource.getFeatures();
        
        // Marker at latest position - this is the clickable icon
        const lastCoord = coords[coords.length - 1];
        
        // Create a unique ID that will persist through app lifecycle
        const uniqueId = `surveyor-${id}-${Date.now()}`;
        
        const point = new Point(lastCoord);
        const markerFeature = new Feature({ 
          geometry: point,
          surveyorId: id,  // This is the actual surveyor ID we need to look up details
          id: uniqueId,    // Unique identifier for this feature instance
          featureType: 'marker',
          surveyorColor: COLORS[idx % COLORS.length]
        });
        
        // Set feature properties explicitly so they're easier to debug
        markerFeature.set('clickable', true);
        markerFeature.set('surveyorId', id); // Setting it again to ensure it's properly set
        
        // Clean marker styling with location pin icons
        
        // Use red color for all pin markers (different from route)
        const markerColor = '#e11d48'; // Red color for better visibility and distinction from routes
        
        // Create a proper location pin icon using Canvas
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        const size = 32;
        canvas.width = size;
        canvas.height = size;

        // Draw location pin shape
        context.fillStyle = markerColor;
        context.strokeStyle = '#FFFFFF';
        context.lineWidth = 2;
        
        // Draw the circular top part of the pin
        const centerX = size / 2;
        const centerY = size / 3;
        const radius = 10;
        
        context.beginPath();
        context.arc(centerX, centerY, radius, 0, 2 * Math.PI);
        context.fill();
        context.stroke();
        
        // Draw the pointed bottom part
        context.beginPath();
        context.moveTo(centerX - 4, centerY + radius - 2);
        context.lineTo(centerX, size - 4);
        context.lineTo(centerX + 4, centerY + radius - 2);
        context.closePath();
        context.fill();
        context.stroke();
        
        // Draw inner circle for the pin head
        context.fillStyle = '#FFFFFF';
        context.beginPath();
        context.arc(centerX, centerY, radius - 4, 0, 2 * Math.PI);
        context.fill();
        
        // Add text
        context.fillStyle = markerColor;
        context.font = 'bold 12px Arial';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        const text = (surveyorDetails[id]?.name || id || '?').substring(0, 1).toUpperCase();
        context.fillText(text, centerX, centerY);

        const markerStyle = new Style({
          image: new Icon({
            img: canvas,
            imgSize: [size, size],
            anchor: [0.5, 1], // Anchor at bottom center of the pin
            anchorXUnits: 'fraction',
            anchorYUnits: 'fraction'
          }),
          zIndex: 1000 + idx  // High z-index to ensure visibility
        });
        
        markerFeature.setStyle(markerStyle);
        markerSource.addFeature(markerFeature);
        
        // ENHANCED DEBUG: Log marker position and check if it was added
        const markersInSource = markerSource.getFeatures();
        
        // NEW: Add individual GPS points for visibility
        coords.forEach((coord, pointIdx) => {
          const gpsPoint = new Point(coord);
          const gpsPointFeature = new Feature({
            geometry: gpsPoint,
            surveyorId: id,
            featureType: 'gpsPoint',
            pointIndex: pointIdx,
            totalPoints: coords.length
          });
          
          // Style GPS points as small dots with surveyor color
          const gpsPointStyle = new Style({
            image: new CircleStyle({
              radius: 4, // Small radius for GPS points
              fill: new Fill({ 
                color: `${pathColor}CC` // Same color as path but with transparency (80% opacity)
              }),
              stroke: new Stroke({ 
                color: '#FFFFFF', 
                width: 1 
              })
            }),
            zIndex: 500 + idx // Lower than main markers but higher than paths
          });
          
          gpsPointFeature.setStyle(gpsPointStyle);
          gpsPointsSource.addFeature(gpsPointFeature);
        });
        
        
      } catch (err) {
        console.error(`Error creating features for surveyor ${id}:`, err);
        
        // Emergency fallback: create features with original coordinates
        try {
          const line = new LineString(coords);
          const lineFeature = new Feature({ 
            geometry: line,
            surveyorId: id,
            featureType: 'path'
          });
          
          lineFeature.setStyle(new Style({ 
            stroke: new Stroke({ 
              color: COLORS[idx % COLORS.length], // Use color from palette instead of red
              width: 3,        // Thinner line (reduced from 15 to 3)
              lineCap: 'round',
              lineJoin: 'round'
              // Removed dashed pattern for cleaner appearance
            }) 
          }));
          pathSource.addFeature(lineFeature);
          
          // Also add marker
          const lastCoord = coords[coords.length - 1];
          const point = new Point(lastCoord);
          const markerFeature = new Feature({ 
            geometry: point,
            surveyorId: id,
            featureType: 'marker'
          });
          
          const color = COLORS[idx % COLORS.length]; // Use color from palette
          const markerStyle = new Style({
            image: new CircleStyle({
              radius: 12,     // Normal size marker (reduced from 25)
              fill: new Fill({ color }),
              stroke: new Stroke({ color: '#FFFFFF', width: 2 }) // Normal white border
            }),
            text: new Text({
              text: (id || '?').substring(0, 1).toUpperCase(),
              font: 'bold 14px Arial', // Normal font size
              fill: new Fill({ color: '#FFFFFF' }),
              stroke: new Stroke({ color: '#000000', width: 2 }), // Normal outline
              offsetY: 1
            }),
            zIndex: 1000 + idx // Normal z-index
          });
          
          markerFeature.setStyle(markerStyle);
          markerSource.addFeature(markerFeature);
          
          // Also add GPS points in fallback
          coords.forEach((coord, pointIdx) => {
            const gpsPoint = new Point(coord);
            const gpsPointFeature = new Feature({
              geometry: gpsPoint,
              surveyorId: id,
              featureType: 'gpsPoint',
              pointIndex: pointIdx,
              totalPoints: coords.length
            });
            
            const gpsPointStyle = new Style({
              image: new CircleStyle({
                radius: 4,
                fill: new Fill({ 
                  color: `${color}CC` // Same color as path but with transparency
                }),
                stroke: new Stroke({ 
                  color: '#FFFFFF', 
                  width: 1 
                })
              }),
              zIndex: 500 + idx
            });
            
            gpsPointFeature.setStyle(gpsPointStyle);
            gpsPointsSource.addFeature(gpsPointFeature);
          });
          
        } catch (fallbackErr) {
          console.error(`Emergency fallback failed for ${id}:`, fallbackErr);
        }
      }
    }
    
    // Debug: Count features after drawing
    
    // ENHANCED DEBUG: Check individual features
    const pathFeatures = pathSource.getFeatures();
    const markerFeatures = markerSource.getFeatures();
    const gpsPointsFeatures = gpsPointsSource.getFeatures();
    
    pathFeatures.forEach((feature, idx) => {
      const geometry = feature.getGeometry();
      const surveyorId = feature.get('surveyorId');
      const coords = geometry.getCoordinates();
      
      // Check if style is applied
      const style = feature.getStyle();
      if (style) {
      } else {
      }
    });
    
    markerFeatures.forEach((feature, idx) => {
      const geometry = feature.getGeometry();
      const surveyorId = feature.get('surveyorId');
      const coords = geometry.getCoordinates();
    });
    
    const gpsPointsBySurveyor = {};
    gpsPointsFeatures.forEach((feature) => {
      const surveyorId = feature.get('surveyorId');
      if (!gpsPointsBySurveyor[surveyorId]) {
        gpsPointsBySurveyor[surveyorId] = 0;
      }
      gpsPointsBySurveyor[surveyorId]++;
    });
    
    Object.entries(gpsPointsBySurveyor).forEach(([surveyorId, count]) => {
    });
    
    // ENHANCED DEBUG: Check layer visibility
    
    // Update routing status to indicate completion with street routing
    setRoutingStatus('success'); // Using enhanced street routing simulation
    
    // Log routing statistics
    
    // FORCE MAP REFRESH AND LAYER UPDATES
    if (mapRef.current) {
      // Check and set layer properties
      
      // Ensure layers are visible and opaque
      pathLayerRef.current.setVisible(true);
      markerLayerRef.current.setVisible(true);
      gpsPointsLayerRef.current.setVisible(true);
      pathLayerRef.current.setOpacity(1.0);
      markerLayerRef.current.setOpacity(1.0);
      gpsPointsLayerRef.current.setOpacity(1.0);
      
      // Force layer refresh
      pathLayerRef.current.getSource().changed();
      markerLayerRef.current.getSource().changed();
      gpsPointsLayerRef.current.getSource().changed();
      
      // Force map render
      mapRef.current.render();
      mapRef.current.renderSync();
      
      // Update map size (sometimes fixes rendering issues)
      mapRef.current.updateSize();
      
      
      // Additional layer debugging
      const mapLayers = mapRef.current.getLayers();
      mapLayers.forEach((layer, i) => {
      });
    }
    
    // Fit view to all tracks with better precision for street-level accuracy (only if requested)
    const allCoords = Object.values(coordsMap).flat();
    if (allCoords.length > 0 && shouldFitView) {
      
      const extent = new LineString(allCoords).getExtent();
      
      // Get current view info
      const view = mapRef.current.getView();
      const currentCenter = view.getCenter();
      const currentZoom = view.getZoom();
      
      view.fit(extent, { 
        padding: [50, 50, 50, 50], 
        maxZoom: 17, // Adjusted to provide good street detail without CORS issues
        duration: 1000 // Smooth animation to the fitted view
      });
      
      // CRITICAL DEBUG: Check layer visibility and properties after fitting
      setTimeout(() => {
        const newCenter = view.getCenter();
        const newZoom = view.getZoom();
        
        // Check layer properties
        
        // Force layer visibility and refresh
        pathLayerRef.current.setVisible(true);
        markerLayerRef.current.setVisible(true);
        gpsPointsLayerRef.current.setVisible(true);
        pathLayerRef.current.setOpacity(1.0);
        markerLayerRef.current.setOpacity(1.0);
        gpsPointsLayerRef.current.setOpacity(1.0);
        
        
        // Get feature counts from sources
        const pathFeatures = pathLayerRef.current.getSource().getFeatures();
        const markerFeatures = markerLayerRef.current.getSource().getFeatures();
        const gpsPointsFeatures = gpsPointsLayerRef.current.getSource().getFeatures();
        
        // Check if features have geometries
        pathFeatures.forEach((feature, i) => {
          const geom = feature.getGeometry();
          const coords = geom ? geom.getCoordinates() : null;
        });
        
        markerFeatures.forEach((feature, i) => {
          const geom = feature.getGeometry();
          const coords = geom ? geom.getCoordinates() : null;
        });
      }, 1100);
    } else if (allCoords.length > 0) {
    } else {
    }
  }, [useStreetRoutes, surveyorDetails, createEnhancedStreetPath]); // Dependencies: useStreetRoutes affects routing behavior, surveyorDetails for marker names
  
  // Initialize map
  useEffect(() => {
    
    // Preserve current view state if map already exists
    if (mapRef.current) {
      const view = mapRef.current.getView();
      const currentCenter = view.getCenter();
      const currentZoom = view.getZoom();
      preservedMapView = {
        center: currentCenter,
        zoom: currentZoom
      };
      
      // Also update localStorage
      try {
        localStorage.setItem('surveyorMapView', JSON.stringify({ center: currentCenter, zoom: currentZoom }));
      } catch (e) {
        console.warn('Failed to save preserved view to localStorage:', e);
      }
    }
    
    // Create sources and layers
    const pathSource = new VectorSource();
    const pathLayer = new VectorLayer({
      source: pathSource,
      zIndex: 10,     // Increased z-index to ensure it's above base map
      visible: true,  // Explicitly set visible
      opacity: 1      // Explicitly set opacity
    });
    
    const markerSource = new VectorSource();
    const markerLayer = new VectorLayer({
      source: markerSource,
      zIndex: 20,     // Higher z-index for markers to be above paths
      visible: true,  // Explicitly set visible  
      opacity: 1      // Explicitly set opacity
    });
    
    const gpsPointsSource = new VectorSource();
    const gpsPointsLayer = new VectorLayer({
      source: gpsPointsSource,
      zIndex: 15,     // Between paths and markers
      visible: true,  // Explicitly set visible
      opacity: 1      // Explicitly set opacity
    });
    
    
    // 🔥 DEBUGGING: Add a test feature to confirm basic rendering works
    
    // Add a bright red test line across the map center
    const testLine = new LineString([
      fromLonLat([78.0, 17.0]),   // Start point
      fromLonLat([79.0, 18.0])    // End point
    ]);
    
    const testFeature = new Feature({
      geometry: testLine,
      name: 'DEBUG_TEST_LINE'
    });
    
    testFeature.setStyle(new Style({
      stroke: new Stroke({
        color: '#FF0000',
        width: 10,
        lineDash: [20, 10]
      })
    }));
    
    pathSource.addFeature(testFeature);
    
    // Add a test marker
    const testMarker = new Feature({
      geometry: new Point(fromLonLat([78.5, 17.5])),
      name: 'DEBUG_TEST_MARKER'
    });
    
    testMarker.setStyle(new Style({
      image: new CircleStyle({
        radius: 30,
        fill: new Fill({ color: '#00FF00' }),
        stroke: new Stroke({ color: '#000000', width: 5 })
      }),
      text: new Text({
        text: 'TEST',
        font: 'bold 16px Arial',
        fill: new Fill({ color: '#000000' })
      })
    }));
    
    markerSource.addFeature(testMarker);
    // Create the map with enhanced street-level accuracy
    const map = new Map({
      target: mapContainerRef.current,
      controls: defaultControls().extend([
        new Zoom({
          zoomInLabel: '+',
          zoomOutLabel: '−',
          zoomInTipLabel: 'Zoom in',
          zoomOutTipLabel: 'Zoom out'
        })
      ]),
      layers: [
        // Use alternative tile source without CORS restrictions
        new TileLayer({ 
          source: new XYZ({
            // Use OpenStreetMap tiles via a CORS-friendly proxy
            url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
            attributions: '© OpenStreetMap contributors',
            maxZoom: 19,
            crossOrigin: 'anonymous' // Enable CORS
          })
        }),
        // Alternative: CartoDB tiles (also CORS-friendly)
        // new TileLayer({
        //   source: new XYZ({
        //     url: 'https://{1-4}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
        //     attributions: '© CARTO © OpenStreetMap contributors',
        //     maxZoom: 20
        //   })
        // }),
        pathLayer,
        gpsPointsLayer,
        markerLayer
      ],
      view: new View({
        center: preservedMapView.center, // Use preserved center
        zoom: preservedMapView.zoom,     // Use preserved zoom
        maxZoom: 19, // Adjusted to match tile source max zoom
        minZoom: 2,
        enableRotation: false, // Disable rotation for better accuracy
        constrainResolution: true // Ensure clean zoom levels
      })
    });
    
    // Add existing popup overlay if it exists
    if (popupOverlayRef.current) {
      map.addOverlay(popupOverlayRef.current);
    }
    
    // Click handler
    map.on('click', function(evt) {
      
      // Get ALL features at the clicked pixel with enhanced hit detection
      // This addresses the issue where only the first surveyor's popup was showing
      let selectedFeature = null;
      
      // Explicitly check for features with surveyorId
      map.forEachFeatureAtPixel(
        evt.pixel, 
        (feature) => {
          if (feature.get('surveyorId')) {
            selectedFeature = feature;
            return true; // Stop iteration when we find a valid feature
          }
          return false;
        }, 
        { 
          hitTolerance: 15,  // Increased hit tolerance for better detection
          layerFilter: (layer) => layer === markerLayer // Only check the marker layer for better performance
        }
      );
      
      const feature = selectedFeature;
      
      
      // DEBUG: If no feature found, log all features in the map to help diagnose
      if (!feature) {
        let allFeatures = [];
        
        // Get all features from the marker layer
        if (markerSource.getFeatures) {
          const markerFeatures = markerSource.getFeatures();
          allFeatures = allFeatures.concat(markerFeatures);
        }
        
        // Check if any features exist
        if (allFeatures.length === 0) {
        } else {
          
          // Log the first few features for debugging
          allFeatures.slice(0, 3).forEach((f, i) => {
          });
          
          // Show a visual feedback that click was registered but no surveyor was found
          const mapElement = map.getTargetElement();
          if (mapElement) {
            // Add a brief highlight effect to show the click was registered
            const flashElement = document.createElement('div');
            flashElement.style.position = 'absolute';
            flashElement.style.left = `${evt.pixel[0] - 15}px`;
            flashElement.style.top = `${evt.pixel[1] - 15}px`;
            flashElement.style.width = '30px';
            flashElement.style.height = '30px';
            flashElement.style.borderRadius = '50%';
            flashElement.style.backgroundColor = 'rgba(255, 255, 255, 0.5)';
            flashElement.style.border = '2px solid #f0f0f0';
            flashElement.style.opacity = '1';
            flashElement.style.pointerEvents = 'none';
            flashElement.style.transition = 'all 0.5s ease-out';
            
            mapElement.appendChild(flashElement);
            
            // Animate and remove the element
            setTimeout(() => {
              flashElement.style.transform = 'scale(2)';
              flashElement.style.opacity = '0';
              setTimeout(() => {
                if (mapElement.contains(flashElement)) {
                  mapElement.removeChild(flashElement);
                }
              }, 500);
            }, 10);
          }
        }
        
        // Get mouse coordinates for debugging
        const clickCoord = map.getCoordinateFromPixel(evt.pixel);
      }
      
      // Hide the popup first by default
      if (popupElementRef.current) {
        popupElementRef.current.style.display = 'none';
      }
      if (popupOverlayRef.current) {
        popupOverlayRef.current.setPosition(undefined);
      }
      
      if (feature && feature.get('surveyorId')) {
        // Get surveyor info
        const surveyorId = feature.get('surveyorId');
        
        // Try to find surveyor with different case variations
        let surveyor = surveyorDetails[surveyorId];
        
        if (!surveyor && typeof surveyorId === 'string') {
          // Try case variations if the exact match failed
          surveyor = surveyorDetails[surveyorId.toLowerCase()] || 
                     surveyorDetails[surveyorId.toUpperCase()];
                     
          // If still not found, try to reload surveyor details
          if (!surveyor) {
            // Trigger a reload of surveyor details
            loadSurveyorDetails();
          }
        }
        
        
        // Get coordinates for positioning regardless of whether we have details
        const coordinate = feature.getGeometry().getCoordinates();
        
        if (popupContentRef.current && popupOverlayRef.current && popupElementRef.current) {
          // Fill popup content - handle the case where surveyor details might be missing
          if (surveyor) {
            popupContentRef.current.innerHTML = `
              <div class="ol-popup-title">${surveyor.name || 'Surveyor'}</div>
              <div class="ol-popup-row">
                <div class="ol-popup-label">ID:</div>
                <div>${surveyor.id || surveyorId || 'N/A'}</div>
              </div>
              <div class="ol-popup-row">
                <div class="ol-popup-label">City:</div>
                <div>${surveyor.city || 'N/A'}</div>
              </div>
              <div class="ol-popup-row">
                <div class="ol-popup-label">Project:</div>
                <div>${surveyor.projectName || 'N/A'}</div>
              </div>
              <div class="ol-popup-row">
                <div class="ol-popup-label">Username:</div>
                <div>${surveyor.username || 'N/A'}</div>
              </div>
            `;
          } else {
            // If no surveyor details, still show something useful
            popupContentRef.current.innerHTML = `
              <div class="ol-popup-title">Surveyor Information</div>
              <div class="ol-popup-row">
                <div class="ol-popup-label">ID:</div>
                <div>${surveyorId || 'Unknown'}</div>
              </div>
              <div class="ol-popup-note">
                Additional details not available
              </div>
            `;
          }
          
          // Make the popup visible
          popupElementRef.current.style.display = 'block';
          
          // Position the popup at the feature's coordinates with improved positioning
          
          // Ensure the popup is properly positioned relative to the marker
          // This is critical for ensuring popup works for all surveyors
          popupOverlayRef.current.setPosition(undefined); // Clear position first to reset any previous state
          setTimeout(() => {
            popupOverlayRef.current.setPosition(coordinate);
            
            // Ensure the popup is visible on screen by panning the map if needed
            map.getView().animate({
              center: coordinate,
              duration: 200
            });
            
            // Ensure the map is updated to show the popup
            map.render();
            
            // Debug - log which surveyor's popup is being shown
          }, 10);
        }
      }
    });
    
    // Pointer interaction
    map.on('pointermove', function(evt) {
      const pixel = map.getEventPixel(evt.originalEvent);
      const hit = map.hasFeatureAtPixel(pixel);
      const feature = map.forEachFeatureAtPixel(pixel, feature => feature);
      
      map.getTargetElement().style.cursor = hit && feature && feature.get('surveyorId') 
        ? 'pointer' 
        : '';
    });
    
    // Save references
    mapRef.current = map;
    pathLayerRef.current = pathLayer;
    markerLayerRef.current = markerLayer;
    gpsPointsLayerRef.current = gpsPointsLayer;
    
    // Save view state when user interacts with map (for preservation across updates)
    const view = map.getView();
    const saveViewState = () => {
      const center = view.getCenter();
      const zoom = view.getZoom();
      preservedMapView = { center, zoom };
      
      // Also save to localStorage for persistence across page refreshes
      try {
        localStorage.setItem('surveyorMapView', JSON.stringify({ center, zoom }));
      } catch (e) {
        console.warn('Failed to save view to localStorage:', e);
      }
    };
    
    // Listen for view changes (zoom, pan) with debouncing
    let viewChangeTimeout;
    const handleViewChange = () => {
      clearTimeout(viewChangeTimeout);
      viewChangeTimeout = setTimeout(saveViewState, 500); // Save state 500ms after user stops interacting
    };
    
    view.on('change', handleViewChange);
    
    // Handle resize
    const updateSize = () => map.updateSize();
    window.addEventListener('resize', updateSize);
    
    return () => {
      window.removeEventListener('resize', updateSize);
      map.setTarget(null);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  // Load surveyor details when IDs change
  useEffect(() => {
    loadSurveyorDetails();
  }, [surveyorIds, loadSurveyorDetails]);
  
  // Update paths when surveyor details change
  useEffect(() => {
    if (Object.keys(surveyorDetails).length > 0 && coordsMapRef.current) {
      if (liveTracking) {
        // For live tracking, only show latest positions
        drawLatestPositions(coordsMapRef.current, false).catch(err => {
          console.error('Error drawing latest positions:', err);
        });
      } else {
        // For historical tracking, show full paths
        drawAllPaths(coordsMapRef.current, false).catch(err => { // Don't fit view - preserve user's zoom
          console.error('Error drawing street paths:', err);
        });
      }
      
      // Debug info: Surveyor details loaded and paths drawn
      setTimeout(() => {
      }, 1500);
    }
  }, [surveyorDetails, drawAllPaths, drawLatestPositions, liveTracking]);
  
  // Load track data
  useEffect(() => {
    if (!surveyorIds?.length || !mapRef.current) return;
    
    // For live tracking mode, load recent historical data to show current path
    if (liveTracking) {
      
      // Load last hour of data for context even in live mode
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      
      
      const fetches = surveyorIds.map((id) =>
        fetch(`${config.backendHost}/api/location/${id}/track?from=${encodeURIComponent(oneHourAgo.toISOString())}&to=${encodeURIComponent(now.toISOString())}`)
          .then(res => res.json())
          .then(data => {
            
            const coords = data.map(point => fromLonLat([point.longitude, point.latitude]));
            return { id, coords };
          })
          .catch(err => {
            console.error(`Error loading recent data for surveyor ${id}:`, err);
            return { id, coords: [] };
          })
      );

      Promise.all(fetches).then(results => {
        const coordsMap = {};
        results.forEach(({ id, coords }) => {
          coordsMap[id] = coords;
        });
        coordsMapRef.current = coordsMap;
        
        
        // Check if surveyorIds have changed (new selection)
        const surveyorIdsStr = surveyorIds.sort().join(',');
        const lastSurveyorIdsStr = lastSurveyorIds.sort().join(',');
        const surveyorSelectionChanged = surveyorIdsStr !== lastSurveyorIdsStr;
        lastSurveyorIds = [...surveyorIds];
        
        
        // For live tracking, fit view if:
        // 1. No saved view exists (first time user) OR
        // 2. Surveyor selection changed (user picked different surveyor) OR  
        // 3. Initial app load with data
        const hasData = Object.values(coordsMap).some(coords => coords.length > 0);
        const isDefaultView = !localStorage.getItem('surveyorMapView');
        const shouldFitView = isDefaultView || surveyorSelectionChanged || (hasData && isInitialDataLoad);
        isInitialDataLoad = false;
        
        
        // Use drawLatestPositions for live tracking instead of drawAllPaths
        drawLatestPositions(coordsMap, shouldFitView).catch(err => {
          console.error('Error drawing latest positions for live tracking:', err);
        });
      });
      
      return;
    }
    
    // For historical tracking, we need from and to dates
    if (!from || !to) return;
    
    // Clear route cache when surveyors change to ensure fresh routing
    routeCache = new Map();
    
    
    const fetches = surveyorIds.map((id) =>
      fetch(`${config.backendHost}/api/location/${id}/track?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`)
        .then(res => res.json())
        .then(data => {
          
          // ENHANCED DEBUG: Test coordinate transformation
          if (data.length > 0) {
            const firstPoint = data[0];
            const transformedCoord = fromLonLat([firstPoint.longitude, firstPoint.latitude]);
            
            // Check if coordinates are reasonable (should be large numbers for projected coordinates)
            if (Math.abs(transformedCoord[0]) < 1000 || Math.abs(transformedCoord[1]) < 1000) {
              console.error(`❌ COORDINATE TRANSFORM ISSUE: Transformed coordinates seem too small!`);
            } else {
            }
          }
          
          return [id, data.map(p => fromLonLat([p.longitude, p.latitude]))];
        })
        .catch(error => {
          console.error(`Failed to fetch track for ${id}:`, error);
          return [id, []];
        })
    );
    
    Promise.all(fetches).then(results => {
      const coordsMap = {};
      results.forEach(([id, coords]) => { 
        coordsMap[id] = coords; 
      });
      
      // Update data status based on results
      
      // Debug output for the coordinates map
      Object.entries(coordsMap).forEach(([id, coords]) => {
        if (coords.length > 0) {
        }
      });
      coordsMapRef.current = coordsMap;
      
      // Ensure street routing is enabled when switching surveyors
      if (!useStreetRoutes) {
        setUseStreetRoutes(true);
      }
      
      // TEMPORARY: Force street routing for historical routes to debug
      if (!liveTracking && !useStreetRoutes) {
        setUseStreetRoutes(true);
      }
      
      
      // Determine if we should fit the view to the new route
      let shouldFitView = false;
      
      if (!liveTracking) {
        // In historical mode, detect if surveyor has changed
        const currentHistoricalSurveyorId = surveyorIds.length === 1 ? surveyorIds[0] : null;
        const surveyorChanged = currentHistoricalSurveyorId !== lastHistoricalSurveyorId;
        
        if (surveyorChanged) {
          shouldFitView = true;
          lastHistoricalSurveyorId = currentHistoricalSurveyorId;
        } else if (isInitialDataLoad) {
          shouldFitView = true;
        } else {
          shouldFitView = false;
        }
      } else {
        // In live mode, use the existing logic
        shouldFitView = isInitialDataLoad || !localStorage.getItem('surveyorMapView');
      }
      
      isInitialDataLoad = false; // Mark that initial load is complete
      
      
      drawAllPaths(coordsMap, shouldFitView).catch(err => {
        console.error('Error drawing street paths:', err);
      });
    });
  }, [surveyorIds, from, to, drawAllPaths, useStreetRoutes, liveTracking]);
  
  // Live tracking setup
  useEffect(() => {
    if (!liveTracking || !surveyorIds?.length || !mapRef.current) return;
    
    let clients = {};
    let fallbackStarted = {};
    
    // Helper for polling fallback
    const startPolling = (id) => {
      fallbackStarted[id] = true;
      pollingRefs.current[id] = setInterval(() => {
        fetch(`${config.backendHost}/api/location/${id}/latest`)
          .then(res => res.json())
          .then(data => {
            const coord = fromLonLat([data.longitude, data.latitude]);
            coordsMapRef.current[id] = [...(coordsMapRef.current[id] || []), coord];
            // For live tracking, only show latest positions
            drawLatestPositions(coordsMapRef.current, false).catch(err => {
              console.error('Error updating latest positions:', err);
            });
          })
          .catch(() => {});
      }, 5000);
    };
    
    // Setup STOMP for each surveyor
    surveyorIds.forEach((id) => {
      clients[id] = new Client({
        webSocketFactory: () => new SockJS(config.webSocketUrl),
        reconnectDelay: 5000,
        onConnect: () => {
          clients[id].subscribe(`/topic/location/${id}`, (message) => {
            try {
              const data = JSON.parse(message.body);
              if (typeof data.longitude === 'number' && typeof data.latitude === 'number') {
                const coord = fromLonLat([data.longitude, data.latitude]);
                coordsMapRef.current[id] = [...(coordsMapRef.current[id] || []), coord];
                // For live tracking, only show latest positions
                drawLatestPositions(coordsMapRef.current, false).catch(err => {
                  console.error('Error updating latest positions:', err);
                });
              }
            } catch (err) {
              console.error('Error processing location update:', err);
            }
          });
        },
        onStompError: () => { if (!fallbackStarted[id]) startPolling(id); },
        onWebSocketError: () => { if (!fallbackStarted[id]) startPolling(id); },
        onWebSocketClose: () => { if (!fallbackStarted[id]) startPolling(id); },
      });
      clients[id].activate();
    });
    
    return () => {
      Object.values(clients).forEach(client => client.deactivate());
      Object.values(pollingRefs.current).forEach(timer => clearInterval(timer));
      pollingRefs.current = {};
    };
  }, [liveTracking, surveyorIds, drawAllPaths]);

  // TEST FUNCTION: Manual OSRM test for debugging
  const testOSRMManually = useCallback(async () => {
    
    // Use SF coordinates in map projection format
    const startCoord = fromLonLat([-122.4194, 37.7749]);
    const endCoord = fromLonLat([-122.4094, 37.7849]);
    
    try {
      const result = await getStreetRoute(startCoord, endCoord);
      
      if (result && result.length > 0) {
      } else {
        console.warn('⚠️ MANUAL OSRM TEST returned no results');
      }
    } catch (error) {
      console.error('❌ MANUAL OSRM TEST FAILED:', error);
    }
  }, [getStreetRoute]); // Dependencies: getStreetRoute function used in the test
  
  // Expose test function to window for browser console access
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.testOSRMManually = testOSRMManually;
    }
  }, [testOSRMManually]);

  // JSX Return
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      {/* Map Container */}
      <div 
        ref={mapContainerRef} 
        className={liveTracking ? 'map-container live-tracking' : 'map-container'}
        style={{ 
          width: '100%', 
          height: '100%',
          position: 'relative'
        }}
      />
      
      {/* Street Routing Controls - Hidden in live tracking mode */}
      {!liveTracking && (
        <div style={{
          position: 'absolute',
          top: '10px',
          left: '10px',
          background: 'rgba(255, 255, 255, 0.95)',
          padding: '15px',
          borderRadius: '8px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
          zIndex: 1000,
          minWidth: '300px'
        }}>
          <div style={{ marginBottom: '10px' }}>
            <label style={{ 
              display: 'flex', 
              alignItems: 'center', 
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }}>
              <input
                type="checkbox"
                checked={useStreetRoutes}
                onChange={(e) => setUseStreetRoutes(e.target.checked)}
                style={{ marginRight: '8px' }}
              />
              🛣️ Enable Street-Following Routes
            </label>
          </div>
          
          {/* Routing Status Indicator */}
          <div style={{ fontSize: '12px', color: '#666' }}>
            Status: {
              (routingStatus === 'ready' && '⚪ Ready') ||
              (routingStatus === 'routing' && '🟡 Loading routes...') ||
              (routingStatus === 'success' && `✅ ${activeRoutingService}`) ||
              (routingStatus === 'fallback' && '🔴 Using enhanced simulation') ||
              '❓ Unknown'
            }
          </div>
          
          {/* Active Routing Service Info */}
          {activeRoutingService && (
            <div style={{ 
              fontSize: '11px', 
              color: '#555',
              marginTop: '5px',
              padding: '5px',
              background: '#f8f9fa',
              borderRadius: '4px'
            }}>
              Active: {activeRoutingService}
            </div>
          )}
          
          {/* Manual Test Button */}
          <div style={{ marginTop: '10px' }}>
            <button
              onClick={testOSRMManually}
              style={{
                background: '#007bff',
                color: 'white',
                border: 'none',
                padding: '5px 10px',
                borderRadius: '4px',
                fontSize: '11px',
                cursor: 'pointer'
              }}
            >
              🧪 Test OSRM
            </button>
          </div>
        </div>
      )}

      {/* Popup */}
      <div
        ref={popupElementRef}
        className="ol-popup"
        style={{
          position: 'absolute',
          backgroundColor: 'white',
          boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
          padding: '15px',
          borderRadius: '10px',
          border: '1px solid #cccccc',
          bottom: '12px',
          left: '-50px',
          minWidth: '200px',
          display: 'none'
        }}
      >
        <button
          ref={popupCloserRef}
          className="ol-popup-closer"
          style={{
            position: 'absolute',
            top: '2px',
            right: '8px',
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            fontSize: '16px'
          }}
        >
          ×
        </button>
        <div ref={popupContentRef}></div>
      </div>
    </div>
  );
};

export default SurveyorTrackMap;
