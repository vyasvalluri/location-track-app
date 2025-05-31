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

  // Initialize popup
  useEffect(() => {
    if (!popupOverlayRef.current && popupElementRef.current) {
      // Create an overlay with the popup element
      const overlay = new Overlay({
        element: popupElementRef.current,
        autoPan: true,
        autoPanAnimation: {
          duration: 250
        }
      });
      
      popupOverlayRef.current = overlay;
      
      // Add click handler to closer button
      if (popupCloserRef.current) {
        popupCloserRef.current.onclick = () => {
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
  
  // Get surveyor details
  const loadSurveyorDetails = async () => {
    if (!surveyorIds || surveyorIds.length === 0) return;
    
    try {
      console.log("Attempting to fetch surveyor details from:", `${config.backendHost}/api/surveyors`);
      
      const response = await fetch(`${config.backendHost}/api/surveyors`, {
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
      
      const details = {};
      data.forEach(surveyor => {
        details[surveyor.id] = surveyor;
      });
      
      setSurveyorDetails(details);
    } catch (error) {
      // Use the enhanced error handling from config
      config.handleFetchError(error, `${config.backendHost}/api/surveyors`);
    }
  };
  
  // Draw paths and markers
  const drawAllPaths = (coordsMap) => {
    if (!pathLayerRef.current || !markerLayerRef.current) return;
    
    const pathSource = pathLayerRef.current.getSource();
    const markerSource = markerLayerRef.current.getSource();
    
    pathSource.clear();
    markerSource.clear();
    
    Object.entries(coordsMap).forEach(([id, coords], idx) => {
      if (!coords || !coords.length) return;
      
      // Path
      const line = new LineString(coords);
      const lineFeature = new Feature({ geometry: line });
      lineFeature.setStyle(new Style({ 
        stroke: new Stroke({ color: COLORS[idx % COLORS.length], width: 3 }) 
      }));
      pathSource.addFeature(lineFeature);
      
      // Marker at latest position
      const lastCoord = coords[coords.length - 1];
      const point = new Point(lastCoord);
      const markerFeature = new Feature({ 
        geometry: point,
        surveyorId: id,
        surveyorColor: COLORS[idx % COLORS.length]
      });
      
      const color = COLORS[idx % COLORS.length];
      const markerStyle = new Style({
        image: new CircleStyle({
          radius: 12,
          fill: new Fill({ color }),
          stroke: new Stroke({ color: '#ffffff', width: 2 })
        }),
        text: new Text({
          text: (surveyorDetails[id]?.name || id || '?').substring(0, 1).toUpperCase(),
          font: 'bold 14px Arial',
          fill: new Fill({ color: '#ffffff' }),
          offsetY: 1
        })
      });
      
      markerFeature.setStyle(markerStyle);
      markerSource.addFeature(markerFeature);
    });
    
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
      map.addOverlay(popupOverlayRef.current);
    }
    
    // Click handler
    map.on('click', function(evt) {
      const feature = map.forEachFeatureAtPixel(evt.pixel, feature => feature);
      
      if (feature && feature.get('surveyorId')) {
        // Hide the popup first
        popupOverlayRef.current?.setPosition(undefined);
        
        // Get surveyor info
        const surveyorId = feature.get('surveyorId');
        const surveyor = surveyorDetails[surveyorId];
        
        if (surveyor && popupContentRef.current && popupOverlayRef.current) {
          // Fill popup content
          popupContentRef.current.innerHTML = `
            <div class="ol-popup-title">${surveyor.name}</div>
            <div class="ol-popup-row">
              <div class="ol-popup-label">ID:</div>
              <div>${surveyor.id || 'N/A'}</div>
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
          
          // Position the popup at the feature's coordinates
          const coordinate = feature.getGeometry().getCoordinates();
          popupOverlayRef.current.setPosition(coordinate);
          
          console.log("Showing popup at coordinates:", coordinate);
        }
      } else {
        // Close the popup when clicking elsewhere
        popupOverlayRef.current?.setPosition(undefined);
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
    }
  }, [surveyorDetails]);
  
  // Load track data
  useEffect(() => {
    if (!surveyorIds?.length || !from || !to || !mapRef.current) return;
    
    const fetches = surveyorIds.map((id) =>
      fetch(`${config.backendHost}/api/location/${id}/track?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`)
        .then(res => res.json())
        .then(data => [id, data.map(p => fromLonLat([p.longitude, p.latitude]))])
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
      coordsMapRef.current = coordsMap;
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
        fetch(`${config.backendHost}/api/location/${id}/latest`)
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
        webSocketFactory: () => new SockJS(`${config.backendHost}/ws/location`),
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

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '90vh', background: 'linear-gradient(135deg, #e0e7ff 0%, #f8fafc 100%)' }}>
      <div style={{ boxShadow: '0 4px 24px rgba(0,0,0,0.12)', borderRadius: '18px', overflow: 'hidden', background: '#fff', width: '90vw', maxWidth: '1100px', minWidth: '320px' }}>
        <div style={{ background: 'linear-gradient(90deg, #6366f1 0%, #60a5fa 100%)', color: '#fff', padding: '18px 28px', fontSize: '1.3rem', fontWeight: 600, letterSpacing: '0.5px', borderBottom: '1px solid #e0e7ff' }}>
          Surveyor Live Track Map
        </div>
        
        {/* Map Container */}
        <div style={{ position: 'relative', width: '100%', height: '70vh', minHeight: '400px' }}>
          <div ref={mapContainerRef} style={{ width: '100%', height: '100%', borderRadius: '0 0 18px 18px' }}></div>
          
          {/* OpenLayers Popup */}
          <div ref={popupElementRef} className="ol-popup">
            <button ref={popupCloserRef} className="ol-popup-close">&times;</button>
            <div ref={popupContentRef} className="ol-popup-content"></div>
          </div>
          
          {/* Legend */}
          <div className="map-legend">
            <div className="legend-dot" style={{ background: COLORS[0] }}></div>
            <span>Click on surveyor icons to see details</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SurveyorTrackMap;
