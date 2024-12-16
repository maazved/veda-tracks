'use client';

import 'leaflet/dist/leaflet.css';
import trackcentral from '../../data/trackcentral2.json'; // Ensure this path is correct
import {
  MapContainer,
  TileLayer,
  LayersControl,
  GeoJSON,
  LayerGroup,
} from 'react-leaflet';
import L from 'leaflet';
import proj4 from 'proj4';
import { useMemo } from 'react';
import 'leaflet-textpath';

export default function MapPage() {
  const EPSG_27700 =
    '+proj=tmerc +lat_0=49 +lon_0=-2 +k=0.9996012717 +x_0=400000 +y_0=-100000 +ellps=airy +datum=OSGB36 +units=m +no_defs';
  const EPSG_4326 = proj4.WGS84; // Shorthand for WGS84

  // Define a color-blind-friendly palette
  const colorPalette = [
    '#E69F00', // Orange
    '#56B4E9', // Sky Blue
    '#009E73', // Bluish Green
    '#F0E442', // Yellow
    '#0072B2', // Blue
    '#D55E00', // Vermillion
    '#CC79A7', // Reddish Purple
    '#000000', // Black
    '#FFB6C1', // Light Pink
    '#FFA500', // Orange (alternative)
    '#800080', // Purple
    '#00FFFF', // Cyan
  ];

  // Mapping from TRACK_ID to descriptive name
  const TRACK_NAME_MAP = {
    1100: 'UP MAIN FAST',
    1200: 'UP SLOW',
    1300: 'UP GOODS',
    1400: 'UP SINGLE',
    1500: 'UP LOOP',
    1600: 'UP TERMINAL',
    1700: 'UP CROSSOVER',
    1800: 'UP OTHER/ENGINE',
    1900: 'UP SIDING',

    2100: 'DOWN MAIN FAST',
    2200: 'DOWN SLOW',
    2300: 'DOWN GOODS',
    2400: 'DOWN SINGLE',
    2500: 'DOWN LOOP',
    2600: 'DOWN TERMINAL',
    2700: 'DOWN CROSSOVER',
    2800: 'DOWN OTHER/ENGINE',
    2900: 'DOWN SIDING',

    3100: 'REVERSIBLE/BI-DIRECTIONAL MAIN FAST',
    3200: 'REVERSIBLE/BI-DIRECTIONAL SLOW',
    3300: 'REVERSIBLE/BI-DIRECTIONAL GOODS',
    3400: 'REVERSIBLE/BI-DIRECTIONAL SINGLE',
    3500: 'REVERSIBLE/BI-DIRECTIONAL LOOP',
    3600: 'REVERSIBLE/BI-DIRECTIONAL TERMINAL',
    3700: 'REVERSIBLE/BI-DIRECTIONAL CROSSOVER',
    3800: 'REVERSIBLE/BI-DIRECTIONAL OTHER/ENGINE',
    3900: 'REVERSIBLE/BI-DIRECTIONAL SIDING',
  };

  /**
   * Reprojects GeoJSON from EPSG:27700 to EPSG:4326.
   * @param {Object} geojson - Original GeoJSON data in EPSG:27700.
   * @returns {Object} - Reprojected GeoJSON data in EPSG:4326.
   */
  function reprojectGeoJSON(geojson) {
    const cloned = JSON.parse(JSON.stringify(geojson)); // Deep clone to avoid mutating original data

    cloned.features.forEach((feature) => {
      const geom = feature.geometry;
      if (!geom || !geom.coordinates) return;

      if (geom.type === 'LineString') {
        geom.coordinates = geom.coordinates.map(([x, y]) => {
          const [lon, lat] = proj4(EPSG_27700, EPSG_4326, [x, y]);
          return [lon, lat];
        });
      } else if (geom.type === 'MultiLineString') {
        geom.coordinates = geom.coordinates.map((line) =>
          line.map(([x, y]) => {
            const [lon, lat] = proj4(EPSG_27700, EPSG_4326, [x, y]);
            return [lon, lat];
          })
        );
      }
      // Handle other geometry types if necessary
    });

    return cloned;
  }

  // Reproject the GeoJSON data once
  const railwayGeoJson4326 = useMemo(() => {
    return reprojectGeoJSON(trackcentral);
  }, [trackcentral]);

  /**
   * Assigns a unique color from the palette to each TRACK_ID.
   * Ensures consistent color assignment.
   */
  const trackColorMap = useMemo(() => {
    const map = {};
    let colorIndex = 0;
    railwayGeoJson4326.features.forEach((feature) => {
      const tid = feature.properties.TRACK_ID;
      if (tid && !map[tid]) {
        map[tid] = colorPalette[colorIndex % colorPalette.length];
        colorIndex += 1;
      }
    });
    return map;
  }, [railwayGeoJson4326.features]);

  /**
   * Style callback for GeoJSON features.
   * Assigns a unique color based on TRACK_ID.
   */
  const trackStyle = (feature) => {
    const tid = feature?.properties?.TRACK_ID;
    if (tid && trackColorMap[tid]) {
      return { color: trackColorMap[tid], weight: 4 };
    }
    // Fallback style if no TRACK_ID
    return { color: '#3388ff', weight: 3 };
  };

  /**
   * Automatically fits the map bounds to the railway tracks.
   * @param {Object} map - Leaflet map instance.
   */
  const handleMapCreated = (map) => {
    if (railwayGeoJson4326) {
      const geoJsonLayer = L.geoJSON(railwayGeoJson4326);
      const bounds = geoJsonLayer.getBounds();
      if (bounds.isValid()) {
        map.fitBounds(bounds);
      }
    }
  };

  return (
    <div style={{ width: '100%', height: '100vh' }}>
      <MapContainer
        center={[51.5, -0.1]} // Initial center; will be adjusted by fitBounds
        zoom={9}
        style={{ height: '100%', width: '100%' }}
        whenCreated={handleMapCreated} // Fit bounds upon map creation
      >
        <LayersControl position='topright'>
          {/* Base Layer: OpenStreetMap */}
          <LayersControl.BaseLayer checked name='OpenStreetMap'>
            <TileLayer
              url='https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
              attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors'
            />
          </LayersControl.BaseLayer>

          {/* Base Layer: Satellite (Esri) */}
          <LayersControl.BaseLayer name='Satellite'>
            <TileLayer
              url='https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
              attribution='&copy; <a href="https://www.esri.com/">Esri</a>'
            />
          </LayersControl.BaseLayer>

          {/* Overlay: Railway Tracks with Curved Text */}
          <LayersControl.Overlay checked name='Railway Tracks'>
            <LayerGroup>
              {/* Render the railway lines */}
              <GeoJSON
                data={railwayGeoJson4326}
                style={trackStyle}
                onEachFeature={(feature, layer) => {
                  layer.setText(
                    `${TRACK_NAME_MAP[feature.properties.TRACK_ID]}  ${
                      feature.properties.TRACK_ID
                    }
                     ${feature.properties.ELR}`,
                    {
                      repeat: false,
                      center: true,
                      offset: 5,

                      attributes: {
                        fill: feature.properties.color || 'black',
                        'font-weight': 'bold',
                        'font-size': '12px',
                      },
                    }
                  );
                }}
              />
            </LayerGroup>
          </LayersControl.Overlay>
        </LayersControl>
      </MapContainer>
    </div>
  );
}
