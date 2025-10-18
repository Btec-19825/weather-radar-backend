const express = require('express');
const cors = require('cors');
const axios = require('axios');
const fs = require('fs').promises;
const zlib = require('zlib');
const path = require('path');

const app = express();

app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

app.use(cors());
app.use(express.json());

const MRMS_BASE_URL = 'https://mrms.ncep.noaa.gov/data/2D/ReflectivityAtLowestAltitude/';
const CACHE_DIR = path.join(__dirname, 'cache');
const DATA_CACHE_TIME = 120000; // 2 minutes

let cachedData = null;
let lastFetchTime = null;

function debugLog(category, message, data = null) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [${category}] ${message}`);
  if (data) {
    console.log(JSON.stringify(data, null, 2));
  }
}

async function ensureCacheDir() {
  try {
    await fs.mkdir(CACHE_DIR, { recursive: true });
  } catch (error) {
    console.error('Error creating cache directory:', error);
  }
}

// Generate realistic sample radar data covering continental US
function generateSampleRadarData() {
  const data = [];
  
  // Continental US bounds
  const minLat = 25;
  const maxLat = 49;
  const minLon = -125;
  const maxLon = -66;
  
  // Create a grid with some "weather patterns"
  const gridSize = 0.5; // Degrees between points
  
  // Create several "storm centers" - different each time for variety
  const storms = [
    { lat: 35.0 + (Math.random() - 0.5) * 2, lon: -90.0 + (Math.random() - 0.5) * 2, intensity: 40 + Math.random() * 15, radius: 3 },
    { lat: 40.0 + (Math.random() - 0.5) * 2, lon: -100.0 + (Math.random() - 0.5) * 2, intensity: 30 + Math.random() * 15, radius: 2.5 },
    { lat: 30.0 + (Math.random() - 0.5) * 2, lon: -95.0 + (Math.random() - 0.5) * 2, intensity: 45 + Math.random() * 15, radius: 2 },
    { lat: 38.0 + (Math.random() - 0.5) * 2, lon: -105.0 + (Math.random() - 0.5) * 2, intensity: 20 + Math.random() * 15, radius: 3.5 },
    { lat: 42.0 + (Math.random() - 0.5) * 2, lon: -85.0 + (Math.random() - 0.5) * 2, intensity: 25 + Math.random() * 15, radius: 2 },
  ];
  
  for (let lat = minLat; lat <= maxLat; lat += gridSize) {
    for (let lon = minLon; lon <= maxLon; lon += gridSize) {
      let maxValue = 0;
      
      for (const storm of storms) {
        const distance = Math.sqrt(
          Math.pow(lat - storm.lat, 2) + Math.pow(lon - storm.lon, 2)
        );
        
        if (distance < storm.radius) {
          const randomFactor = 0.7 + Math.random() * 0.6;
          const value = storm.intensity * (1 - distance / storm.radius) * randomFactor;
          maxValue = Math.max(maxValue, value);
        }
      }
      
      // Add some random light precipitation
      if (maxValue < 5 && Math.random() > 0.97) {
        maxValue = 5 + Math.random() * 10;
      }
      
      // Only add points with significant values
      if (maxValue > 5) {
        data.push({
          lat: parseFloat(lat.toFixed(2)),
          lon: parseFloat(lon.toFixed(2)),
          value: parseFloat(maxValue.toFixed(1))
        });
      }
    }
  }
  
  debugLog('GENERATE', `Generated ${data.length} radar data points`);
  return data;
}

// Try to fetch real MRMS data, fall back to sample data
async function fetchAndProcessRadarData() {
  const requestId = Date.now();
  debugLog('REQUEST', `Starting radar data fetch [${requestId}]`);
  
  try {
    // Try to fetch from MRMS with longer timeout
    debugLog('STEP', `[${requestId}] Attempting to fetch from MRMS...`);
    
    const response = await axios.get(MRMS_BASE_URL, { 
      timeout: 30000, // Increased to 30 seconds
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    const html = response.data;
    const filePattern = /MRMS_ReflectivityAtLowestAltitude_00\.50_\d{8}-\d{6}\.grib2\.gz/g;
    const files = html.match(filePattern);
    
    if (files && files.length > 0) {
      const fileName = files[files.length - 1];
      debugLog('STEP', `[${requestId}] Found latest file: ${fileName}`);
      
      // File exists but we can't parse GRIB2 without pygrib
      // Generate sample data but note the real file timestamp
      const sampleData = generateSampleRadarData();
      
      const result = {
        success: true,
        data: sampleData,
        timestamp: new Date().toISOString(),
        min: Math.min(...sampleData.map(d => d.value)),
        max: Math.max(...sampleData.map(d => d.value)),
        dataPoints: sampleData.length,
        source: 'simulated',
        note: 'Using sample data - GRIB2 parsing requires pygrib library',
        mrmsFile: fileName
      };
      
      debugLog('SUCCESS', `[${requestId}] Returning sample data`, {
        points: result.dataPoints,
        min: result.min,
        max: result.max
      });
      
      return result;
    }
    
    throw new Error('No GRIB2 files found in MRMS directory');
    
  } catch (error) {
    // If MRMS is unreachable, use sample data
    debugLog('WARNING', `[${requestId}] MRMS fetch failed, using sample data`, {
      error: error.message
    });
    
    const sampleData = generateSampleRadarData();
    
    const result = {
      success: true,
      data: sampleData,
      timestamp: new Date().toISOString(),
      min: Math.min(...sampleData.map(d => d.value)),
      max: Math.max(...sampleData.map(d => d.value)),
      dataPoints: sampleData.length,
      source: 'simulated',
      note: 'Using sample data - MRMS unavailable or GRIB2 parsing not available',
      mrmsError: error.message
    };
    
    debugLog('SUCCESS', `[${requestId}] Returning sample data`, {
      points: result.dataPoints,
      min: result.min,
      max: result.max
    });
    
    return result;
  }
}

app.get('/api/radar-data', async (req, res) => {
  try {
    const now = Date.now();
    
    // Return cached data if recent
    if (cachedData && lastFetchTime && (now - lastFetchTime < DATA_CACHE_TIME)) {
      debugLog('CACHE', 'Returning cached data', {
        age: Math.floor((now - lastFetchTime) / 1000)
      });
      return res.json({
        ...cachedData,
        cached: true,
        cacheAge: Math.floor((now - lastFetchTime) / 1000)
      });
    }
    
    // Fetch fresh data
    const data = await fetchAndProcessRadarData();
    cachedData = data;
    lastFetchTime = now;
    
    res.json({ ...data, cached: false });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    platform: process.platform,
    cacheStatus: cachedData ? 'populated' : 'empty'
  });
});

app.get('/', (req, res) => {
  res.json({
    message: 'Weather Radar API',
    version: '1.0.0',
    platform: process.platform,
    dataSource: 'simulated (GRIB2 parsing requires pygrib)',
    endpoints: {
      health: '/health',
      radarData: '/api/radar-data'
    }
  });
});

// Test endpoint that returns data immediately without MRMS fetch
app.get('/api/test-sample', (req, res) => {
  debugLog('TEST', 'Generating test sample data');
  const sampleData = generateSampleRadarData();
  
  res.json({
    success: true,
    data: sampleData,
    timestamp: new Date().toISOString(),
    min: Math.min(...sampleData.map(d => d.value)),
    max: Math.max(...sampleData.map(d => d.value)),
    dataPoints: sampleData.length,
    source: 'simulated-test'
  });
});

export default app;
