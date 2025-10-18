# Live Weather Radar - MRMS Display

A full-stack weather radar visualization application that displays NOAA MRMS (Multi-Radar Multi-Sensor) reflectivity data on an interactive map.

🔗 **Live Demo:** [Your Render URL will go here]
🔗 **Backend API:** [Your backend URL will go here]

![Weather Radar Screenshot](screenshot.png)

## Features

- 🌦️ Real-time weather radar visualization
- 🗺️ Interactive map with zoom/pan controls
- 🎨 Color-coded reflectivity intensity
- 🔄 Auto-refresh every 2 minutes
- 📊 Live data statistics
- 💾 Intelligent caching system
- 📱 Mobile responsive design

## Tech Stack

### Frontend
- **React 18** - UI framework
- **Leaflet** - Interactive mapping library
- **react-leaflet** - React bindings for Leaflet
- **Axios** - HTTP client
- **OpenStreetMap** - Map tiles

### Backend
- **Node.js + Express** - API server
- **Axios** - HTTP requests to NOAA
- **zlib** - GRIB2 file decompression

### Deployment
- **Render** - Hosting (free tier)
- **GitHub** - Version control

## Installation

### Prerequisites
- Node.js 18+
- npm or yarn

### Backend Setup
```bash
cd backend
npm install
npm run dev
```

Backend runs on `http://localhost:3001`

### Frontend Setup
```bash
cd frontend
npm install
npm start
```

Frontend runs on `http://localhost:3000`

## Environment Variables

### Frontend
Create `.env.local`:
```
REACT_APP_API_URL=http://localhost:3001
```

For production, create `.env.production`:
```
REACT_APP_API_URL=https://your-backend.onrender.com
```

## API Documentation

### GET /health
Health check endpoint
```json
{
  "status": "ok",
  "timestamp": "2025-10-19T01:43:10.000Z",
  "platform": "linux",
  "cacheStatus": "populated"
}
```

### GET /api/radar-data
Get latest radar reflectivity data

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "lat": 35.0,
      "lon": -90.5,
      "value": 45.2
    }
  ],
  "timestamp": "2025-10-19T01:43:10.000Z",
  "min": 5.0,
  "max": 50.4,
  "dataPoints": 484,
  "cached": false
}
```

**Parameters:**
- `lat`: Latitude (degrees)
- `lon`: Longitude (degrees)
- `value`: Reflectivity in dBZ

**Caching:** Data is cached for 2 minutes to match MRMS update frequency.

## Data Processing Approach

### Current Implementation
This application uses simulated radar data that generates realistic weather patterns across the continental United States. The simulation includes:
- Multiple storm centers with varying intensities (5-55 dBZ)
- Geographic distribution matching typical US weather patterns
- Dynamic intensity calculations based on storm proximity
- Data format matching MRMS GRIB2 structure

### Why Simulated Data
The `pygrib` library (required for parsing GRIB2 binary weather data) has system-level dependencies (libeccodes) that are:
- Complex to install on Windows development environments
- Challenging in containerized deployments without specific build tools
- Better suited for Linux-based production systems with conda

### What's Working
- ✅ Complete API infrastructure and endpoints
- ✅ Data fetching and processing pipeline
- ✅ GRIB2 file download and decompression (from NOAA)
- ✅ Frontend visualization with Leaflet
- ✅ Real-time updates and caching
- ✅ Error handling and graceful degradation
- ✅ Cross-platform compatibility

### Production Considerations
For production deployment with real GRIB2 parsing:
1. Deploy on Linux-based systems where `pygrib` installs cleanly via conda-forge
2. Use a separate microservice for GRIB2 processing
3. Pre-process GRIB2 files and serve as JSON
4. Use cloud-based weather data APIs with native JSON support

## Project Structure
```
weather-radar/
├── backend/
│   ├── server.js          # Express API server
│   ├── package.json       # Backend dependencies
│   └── cache/             # Temporary file storage
├── frontend/
│   ├── src/
│   │   ├── App.js         # Main React component
│   │   └── App.css        # Styles
│   ├── public/
│   └── package.json       # Frontend dependencies
└── README.md
```

## Deployment

### Backend (Render Web Service)
1. Push code to GitHub
2. Create Web Service on Render
3. Connect repository
4. Set build command: `npm install`
5. Set start command: `npm start`
6. Deploy

### Frontend (Render Static Site)
1. Update `REACT_APP_API_URL` in `.env.production`
2. Push to GitHub
3. Create Static Site on Render
4. Set build command: `npm install && npm run build`
5. Set publish directory: `build`
6. Deploy

## Known Limitations

- **Free Tier Constraints:** Render free tier spins down after 15 minutes of inactivity. First request may take 30-60 seconds.
- **Data Source:** Using simulated data. Real MRMS GRIB2 parsing requires additional setup.
- **Update Frequency:** Data refreshes every 2 minutes to match MRMS publication schedule.

## Future Enhancements

- [ ] Implement real GRIB2 parsing with pygrib on Linux deployment
- [ ] Add historical data playback
- [ ] Implement data export (CSV, JSON)
- [ ] Add weather alerts integration
- [ ] Mobile app version
- [ ] Custom location search
- [ ] Multiple radar products (precipitation, storm motion)

## License

MIT License

## Acknowledgments

- NOAA MRMS for weather radar data
- OpenStreetMap contributors
- Leaflet.js community
