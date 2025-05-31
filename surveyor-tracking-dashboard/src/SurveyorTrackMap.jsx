// filepath: /Users/valluri/Personal/Projects/Tracking/surveyor-tracking-dashboard/src/SurveyorTrackMap.jsx
import React, { useEffect, useRef, useState } from 'react';
import { Map, View } from 'ol';
import { LineString, Point } from 'ol/geom';
import { Vector as VectorLayer, Tile as TileLayer } from 'ol/layer';
import { Vector as VectorSource } from 'ol/source';
import { OSM } from 'ol/source';
import { Feature } from 'ol';
import { Stroke, Style, Text, Fill, Circle as CircleStyle } from 'ol/style';
import { fromLonLat } from 'ol/proj';
import Overlay from 'ol/Overlay';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import config from './config';
import './SurveyorTrackMap.css';

// Helper: assign a color per surveyor
const COLORS = [
  '#2563eb', '#16a34a', '#f59e42', '#e11d48', '#a21caf', '#0e7490', '#facc15', '#ea580c', 
  '#64748b', '#7c3aed', '#059669', '#be185d', '#b91c1c', '#f43f5e', '#0ea5e9', '#fbbf24'
];

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
  const coordsMapRef = useRef({});
  const pollingRefs = useRef({});

  // State
  const [surveyorDetails, setSurveyorDetails] = useState({});

  // Initialize popup with debugging
  useEffect(() => {
    console.log("Initializing popup overlay");
    
    if (!popupOverlayRef.current && popupElementRef.current) {
      console.log("Creating new overlay with element:", popupElementRef.current);
      
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
          console.log("Popup closer clicked, hiding popup");
          popupElementRef.current.style.display = 'none';
          overlay.setPosition(undefined);
          return false;
        };
      }
      
      // Add overlay to map if map exists
      if (mapRef.current) {
        console.log("Adding overlay to existing map");
        mapRef.current.addOverlay(overlay);
      }
    }
  }, []);
  
  // Get surveyor details
  const loadSurveyorDetails = async () => {
    if (!surveyorIds || surveyorIds.length === 0) return;
    
    try {
      console.log("Attempting to fetch surveyor details from:", `${config.backendHost}/api/surveyors`);
      
      const response = await fetch(`/api/surveyors`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        // Add credentials to allow cookies
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch surveyor details: ${response.status}`);
      }
      
      const data = await response.json();
      console.log("Received surveyor data:", data);
      
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
      
      console.log("Processed surveyor details:", details);
      setSurveyorDetails(details);
    } catch (error) {
      // Use the enhanced error handling from config
      config.handleFetchError(error, `${config.backendHost}/api/surveyors`);
    }
  };
  
  // Draw paths and markers
  const drawAllPaths = (coordsMap) => {
    if (!pathLayerRef.current || !markerLayerRef.current) {
      console.error("Layer refs not initialized. Cannot draw paths.");
      return;
    }
    
    const pathSource = pathLayerRef.current.getSource();
    const markerSource = markerLayerRef.current.getSource();
    
    // Clear existing features
    pathSource.clear();
    markerSource.clear();
    
    console.log(`Drawing paths for ${Object.keys(coordsMap).length} surveyors`);
    
    // Log IDs before drawing to help with debugging
    const surveyorIds = Object.keys(coordsMap);
    console.log(`Starting to draw paths for ${surveyorIds.length} surveyors:`, surveyorIds);
    
    // Process each surveyor
    Object.entries(coordsMap).forEach(([id, coords], idx) => {
      if (!coords || !coords.length) {
        console.log(`No coordinates for surveyor ${id}, skipping`);
        return;
      }
      
      console.log(`Drawing path for surveyor ${id} with ${coords.length} points`);
      
      try {
        // Path - line representing the surveyor's track
        const line = new LineString(coords);
        const lineFeature = new Feature({ 
          geometry: line,
          surveyorId: id,  // Store ID for potential clicking on path
          featureType: 'path'
        });
        lineFeature.setStyle(new Style({ 
          stroke: new Stroke({ color: COLORS[idx % COLORS.length], width: 3 }) 
        }));
        pathSource.addFeature(lineFeature);
        
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
        
        // Create a prominent style for better visibility and clicking
        const color = COLORS[idx % COLORS.length];
        const markerStyle = new Style({
          image: new CircleStyle({
            radius: 15,  // Larger radius for easier clicking
            fill: new Fill({ color }),
            stroke: new Stroke({ color: '#ffffff', width: 3 })
          }),
          text: new Text({
            text: (surveyorDetails[id]?.name || id || '?').substring(0, 1).toUpperCase(),
            font: 'bold 14px Arial',
            fill: new Fill({ color: '#ffffff' }),
            offsetY: 1
          }),
          // Add a larger transparent circle for easier clicking
          zIndex: 100 + idx  // Ensure markers are above paths with consistent stacking
        });
        
        markerFeature.setStyle(markerStyle);
        markerSource.addFeature(markerFeature);
        
        console.log(`Added marker for surveyor ${id}, feature ID: ${uniqueId}`);
      } catch (err) {
        console.error(`Error creating features for surveyor ${id}:`, err);
      }
    });
    
    // Debug: Count features after drawing
    console.log(`Path source has ${pathSource.getFeatures().length} features`);
    console.log(`Marker source has ${markerSource.getFeatures().length} features`);
    
    // Fit view to all tracks if we have data
    const allCoords = Object.values(coordsMap).flat();
    if (allCoords.length > 0) {
      const extent = new LineString(allCoords).getExtent();
      mapRef.current.getView().fit(extent, { 
        padding: [50, 50, 50, 50], 
        maxZoom: 17 
      });
    }
  };
  
  // Initialize map
  useEffect(() => {
    console.log("Initializing map");
    
    // Create sources and layers
    const pathSource = new VectorSource();
    const pathLayer = new VectorLayer({
      source: pathSource,
      zIndex: 0
    });
    
    const markerSource = new VectorSource();
    const markerLayer = new VectorLayer({
      source: markerSource,
      zIndex: 1
    });
    
    // Create the map
    const map = new Map({
      target: mapContainerRef.current,
      layers: [
        new TileLayer({ source: new OSM() }),
        pathLayer,
        markerLayer
      ],
      view: new View({
        center: fromLonLat([78.9629, 20.5937]),
        zoom: 5
      })
    });
    
    // Add existing popup overlay if it exists
    if (popupOverlayRef.current) {
      console.log("Adding existing popup overlay to new map");
      map.addOverlay(popupOverlayRef.current);
    }
    
    // Click handler
    map.on('click', function(evt) {
      console.log("Map clicked at pixel:", evt.pixel);
      
      // Get ALL features at the clicked pixel with enhanced hit detection
      // This addresses the issue where only the first surveyor's popup was showing
      let selectedFeature = null;
      
      // Explicitly check for features with surveyorId
      map.forEachFeatureAtPixel(
        evt.pixel, 
        (feature) => {
          if (feature.get('surveyorId')) {
            console.log(`Found feature with surveyorId: ${feature.get('surveyorId')}`);
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
      
      console.log("Feature found:", feature);
      
      // DEBUG: If no feature found, log all features in the map to help diagnose
      if (!feature) {
        console.log("No feature found. Logging all features in map:");
        let allFeatures = [];
        
        // Get all features from the marker layer
        if (markerSource.getFeatures) {
          const markerFeatures = markerSource.getFeatures();
          console.log("Marker features:", markerFeatures);
          allFeatures = allFeatures.concat(markerFeatures);
        }
        
        // Check if any features exist
        if (allFeatures.length === 0) {
          console.log("No features available in the map. Check if data is loaded correctly.");
        } else {
          console.log(`${allFeatures.length} features found in map`);
          
          // Log the first few features for debugging
          allFeatures.slice(0, 3).forEach((f, i) => {
            console.log(`Feature ${i}: ID=${f.get('surveyorId')}, Geometry=${f.getGeometry().getType()}`);
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
        console.log("Click coordinate:", clickCoord);
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
        console.log("Surveyor ID from feature:", surveyorId);
        
        // Try to find surveyor with different case variations
        let surveyor = surveyorDetails[surveyorId];
        
        if (!surveyor && typeof surveyorId === 'string') {
          // Try case variations if the exact match failed
          surveyor = surveyorDetails[surveyorId.toLowerCase()] || 
                     surveyorDetails[surveyorId.toUpperCase()];
                     
          // If still not found, try to reload surveyor details
          if (!surveyor) {
            console.log("Surveyor details not found, attempting to reload...");
            // Trigger a reload of surveyor details
            loadSurveyorDetails();
          }
        }
        
        console.log("Surveyor details:", surveyor);
        
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
          console.log("Setting popup position to coordinates:", coordinate);
          
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
            console.log(`Showing popup for surveyor: ${surveyorId}`);
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
    
    // Handle resize
    const updateSize = () => map.updateSize();
    window.addEventListener('resize', updateSize);
    
    return () => {
      window.removeEventListener('resize', updateSize);
      map.setTarget(null);
    };
  }, []);
  
  // Load surveyor details when IDs change
  useEffect(() => {
    loadSurveyorDetails();
  }, [surveyorIds]);
  
  // Update paths when surveyor details change
  useEffect(() => {
    if (Object.keys(surveyorDetails).length > 0 && coordsMapRef.current) {
      drawAllPaths(coordsMapRef.current);
      
      // Run debug function after a short delay to ensure all features are created
      setTimeout(() => {
        debugSurveyorIdsAndFeatures();
      }, 500);
    }
  }, [surveyorDetails]);
  
  // Load track data
  useEffect(() => {
    if (!surveyorIds?.length || !from || !to || !mapRef.current) return;
    
    console.log("Loading track data for surveyors:", surveyorIds);
    console.log("Time range:", from, "to", to);
    
    const fetches = surveyorIds.map((id) =>
      fetch(`/api/location/${id}/track?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`)
        .then(res => res.json())
        .then(data => {
          console.log(`Received ${data.length} track points for surveyor ${id}`);
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
        console.log(`Stored ${coords.length} coordinates for surveyor ${id}`);
      });
      
      // Debug output for the coordinates map
      console.log("Coordinate map has entries for:", Object.keys(coordsMap));
      coordsMapRef.current = coordsMap;
      
      console.log("Drawing paths with coordinate map");
      drawAllPaths(coordsMap);
    });
  }, [surveyorIds, from, to]);
  
  // Live tracking setup
  useEffect(() => {
    if (!liveTracking || !surveyorIds?.length || !mapRef.current) return;
    
    let clients = {};
    let fallbackStarted = {};
    
    // Helper for polling fallback
    const startPolling = (id) => {
      fallbackStarted[id] = true;
      pollingRefs.current[id] = setInterval(() => {
        fetch(`/api/location/${id}/latest`)
          .then(res => res.json())
          .then(data => {
            const coord = fromLonLat([data.longitude, data.latitude]);
            coordsMapRef.current[id] = [...(coordsMapRef.current[id] || []), coord];
            drawAllPaths(coordsMapRef.current);
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
                drawAllPaths(coordsMapRef.current);
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
  }, [liveTracking, surveyorIds]);

  // Debug function to check feature creation and surveyor ID matching
  const debugSurveyorIdsAndFeatures = () => {
    console.log("==== DEBUGGING SURVEYOR DATA ====");
    
    // 1. Check what surveyor IDs we have in state
    const detailIds = Object.keys(surveyorDetails);
    console.log("Surveyor IDs in surveyorDetails state:", detailIds);
    
    // 2. Check what IDs are in the coordsMapRef
    const coordIds = Object.keys(coordsMapRef.current);
    console.log("Surveyor IDs in coordsMapRef:", coordIds);
    
    // 3. Check if we have features in the vector sources
    if (pathLayerRef.current && markerLayerRef.current) {
      const pathFeatures = pathLayerRef.current.getSource().getFeatures();
      const markerFeatures = markerLayerRef.current.getSource().getFeatures();
      
      console.log(`Path layer has ${pathFeatures.length} features`);
      console.log(`Marker layer has ${markerFeatures.length} features`);
      
      // 4. Log the surveyorIds stored in the features
      const pathIds = pathFeatures.map(f => f.get('surveyorId'));
      const markerIds = markerFeatures.map(f => f.get('surveyorId'));
      
      console.log("Path feature surveyorIds:", pathIds);
      console.log("Marker feature surveyorIds:", markerIds);
      
      // 5. Check if any marker feature IDs don't have corresponding details
      markerIds.forEach(id => {
        if (!surveyorDetails[id]) {
          console.log(`WARNING: No details found for surveyorId "${id}"`);
          
          // Try case variations
          const lowercaseMatch = surveyorDetails[id?.toLowerCase()];
          const uppercaseMatch = surveyorDetails[id?.toUpperCase()]; 
          
          if (lowercaseMatch) {
            console.log(`Found match with lowercase: "${id.toLowerCase()}"`);
          }
          
          if (uppercaseMatch) {
            console.log(`Found match with uppercase: "${id.toUpperCase()}"`);
          }
        }
      });
    }
    
    console.log("==== END DEBUG ====");
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '90vh', background: 'linear-gradient(135deg, #e0e7ff 0%, #f8fafc 100%)' }}>
      <div style={{ boxShadow: '0 4px 24px rgba(0,0,0,0.12)', borderRadius: '18px', overflow: 'hidden', background: '#fff', width: '90vw', maxWidth: '1100px', minWidth: '320px' }}>
        <div style={{ background: 'linear-gradient(90deg, #6366f1 0%, #60a5fa 100%)', color: '#fff', padding: '18px 28px', fontSize: '1.3rem', fontWeight: 600, letterSpacing: '0.5px', borderBottom: '1px solid #e0e7ff' }}>
          Surveyor Live Track Map
        </div>
        
        {/* Map Container */}
        <div style={{ position: 'relative', width: '100%', height: '70vh', minHeight: '400px' }}>
          <div ref={mapContainerRef} style={{ width: '100%', height: '100%', borderRadius: '0 0 18px 18px' }}></div>
          
          {/* Legend */}
          <div className="map-legend">
            <div className="legend-dot" style={{ background: COLORS[0] }}></div>
            <span>Click on surveyor icons to see details</span>
          </div>
        </div>
        
        {/* OpenLayers Popup - Improved for better visibility and interaction */}
        <div ref={popupElementRef} className="ol-popup" style={{ display: 'none', visibility: 'visible' }}>
          <button ref={popupCloserRef} className="ol-popup-close" title="Close">&times;</button>
          <div ref={popupContentRef} className="ol-popup-content"></div>
        </div>
      </div>
    </div>
  );
};

export default SurveyorTrackMap;
