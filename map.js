// Set Mapbox access token
mapboxgl.accessToken = 'pk.eyJ1Ijoic2ZlcnJhZ3V0IiwiYSI6ImNtN2M1cGJxZzBucngyaXB2YmcxM2JnZmsifQ.nViZIh-I9TVBRzDezlSoaA';

// Initialize the map
const map = new mapboxgl.Map({
    container: 'map', // ID of the div where the map will render
    style: 'mapbox://styles/mapbox/streets-v12', // Map style
    center: [-71.09415, 42.36027], // [longitude, latitude]
    zoom: 12, // Initial zoom level
    minZoom: 5, // Minimum allowed zoom
    maxZoom: 18 // Maximum allowed zoom
});

// Select the svg element before using it
const svg = d3.select('#map').select('svg');
let stations = []; // Initialize empty stations array

// Initialize arrays for filtered data
let filteredTrips = [];
let filteredArrivals = new Map();
let filteredDepartures = new Map();
let filteredStations = [];
let trips = [];
let timeFilter = -1;  // Default: No filtering applied

// Helper function to convert lat/lon to pixel coordinates
function getCoords(station) {
    const point = new mapboxgl.LngLat(+station.lon, +station.lat); // Convert lon/lat
    const { x, y } = map.project(point);  // Convert to pixel coordinates
    return { cx: x, cy: y };  // Return formatted position
}

// Helper function to convert Date to minutes since midnight
function minutesSinceMidnight(date) {
    return date.getHours() * 60 + date.getMinutes();
}

// Wait for the map to load before adding data
map.on('load', () => {
    // Add bike lane data source
    map.addSource('boston_route', {
      type: 'geojson',
      data: 'Existing_Bike_Network_2022.geojson' // Local file path
    });
  
    // Add bike lanes layer
    map.addLayer({
        id: 'b-bike-lanes',
        type: 'line',
        source: 'boston_route',
        paint: {
        'line-color': '#32D400', // Green bike lanes
        'line-width': 3,       // Line thickness
        'line-opacity': 0.5    // Transparency
        }
    });

    // Add bike lane data source
    map.addSource('cambridge_route', {
        type: 'geojson',
        data: 'RECREATION_BikeFacilities.geojson' // Local file path
    });
    
    // Add bike lanes layer
    map.addLayer({
        id: 'c-bike-lanes',
        type: 'line',
        source: 'cambridge_route',
        paint: {
            'line-color': '#32D400', // Green bike lanes
            'line-width': 3,       // Line thickness
            'line-opacity': 0.5    // Transparency
        }
    });

    // Load the Bluebikes JSON file
    const jsonurl = 'bluebikes-stations.json';
    d3.json(jsonurl).then(jsonData => {
        stations = jsonData.data.stations; // Extract stations array
         
        // Fetch and parse the traffic data (CSV file)
        d3.csv('bluebikes-traffic-2024-03.csv').then(loadedTrips => {
            // Process trips: convert start/end times to Date objects
            for (let trip of loadedTrips) {
                trip.started_at = new Date(trip.started_at);
                trip.ended_at = new Date(trip.ended_at);
            }  
            
            trips = loadedTrips; // Store the loaded trips
            
            const departures = d3.rollup(
                trips,
                (v) => v.length,
                (d) => d.start_station_id,
            );
            const arrivals = d3.rollup(
                trips,
                (v) => v.length,
                (d) => d.end_station_id,
            );
            
            stations = stations.map((station) => {
                let id = station.short_name;
                station.arrivals = arrivals.get(id) ?? 0;
                station.departures = departures.get(id) ?? 0; // Default to 0 if no departures
                station.totalTraffic = station.arrivals + station.departures; // Calculate total traffic
                return station;
            });
        
        function filterTripsbyTime() {
            filteredTrips = timeFilter === -1
                ? trips
                : trips.filter((trip) => {
                    const startedMinutes = minutesSinceMidnight(trip.started_at);
                    const endedMinutes = minutesSinceMidnight(trip.ended_at);
                    return (
                        Math.abs(startedMinutes - timeFilter) <= 60 ||
                        Math.abs(endedMinutes - timeFilter) <= 60
                    );
                    });
    
            // Recalculate arrivals and departures using filteredTrips
            filteredDepartures = d3.rollup(
                filteredTrips,
                (v) => v.length,
                (d) => d.start_station_id
            );
            filteredArrivals = d3.rollup(
                filteredTrips,
                (v) => v.length,
                (d) => d.end_station_id
            );    
            
            // Update cloned stations with filtered traffic data
            filteredStations = stations.map((station) => {
                let cloned = { ...station };
                let id = cloned.short_name;
                cloned.arrivals = filteredArrivals.get(id) ?? 0;
                cloned.departures = filteredDepartures.get(id) ?? 0;
                cloned.totalTraffic = cloned.arrivals + cloned.departures;
                return cloned;
            });
    
        }

        // Create the radius scale (square root scale for circle area)
        let radiusScale = d3.scaleSqrt()
                .domain([0, d3.max(stations, d => d.totalTraffic)])
                .range([2, 25]);
        
        // Append circles to the SVG for each station
        const circles = svg.selectAll('circle')
            .data(stations)
            .enter()
            .append('circle')
            .attr('r', (d) => radiusScale(d.totalTraffic))  // Radius based on traffic
            .attr('fill', 'steelblue')                      // Fill color
            .attr('stroke', 'white')                        // Border color
            .attr('stroke-width', 1)                        // Border thickness
            .attr('opacity', 0.8)                           // Transparency
            .each(function(d) {
                // Add <title> for browser tooltips
                d3.select(this)
                    .append('title')
                    .html(`Station: ${d.name} WITH TRAFFIC DATA: ${d.totalTraffic} trips (${d.departures} departures, ${d.arrivals} arrivals)`);
            });
            
        // Function to update circle positions
        function updatePositions() {
            circles
            .attr('cx', d => getCoords(d).cx)  // X-position
            .attr('cy', d => getCoords(d).cy); // Y-position
        }

        // Initial positioning
        updatePositions();

        // Update positions on map interactions
        map.on('move', updatePositions);
        map.on('zoom', updatePositions);
        map.on('resize', updatePositions);
        map.on('moveend', updatePositions);

        const timeSlider = document.getElementById('time-filter');
        const selectedTime = document.getElementById('selected-time');
        const anyTimeLabel = document.getElementById('any-time');

        // Helper function to format time in HH:MM AM/PM format
        function formatTime(minutes) {
            const date = new Date(0, 0, 0, 0, minutes);  // Set hours & minutes
            return date.toLocaleString('en-US', { timeStyle: 'short' }); // Format as HH:MM AM/PM
        }
        
        function updateTimeDisplay() {
            timeFilter = Number(timeSlider.value);  // Get slider value
        
            if (timeFilter === -1) {
                selectedTime.textContent = "11:59 PM";  // Set to 11:59 PM when slider is at -1
                anyTimeLabel.style.display = 'block';  // Show "Any Time" label
                selectedTime.style.display = 'none';  // Hide selected time
            } else {
                selectedTime.textContent = formatTime(timeFilter);  // Display formatted time
                anyTimeLabel.style.display = 'none';  // Hide "Any Time" label
                selectedTime.style.display = 'block';  // Hide selected time
            }
            
            // Add filtering logic here 
            filterTripsbyTime();
            // Update the circles' radii based on the filtered data
            // Recalculate the radius scale based on the filtered data
            const maxTraffic = timeFilter === -1
            ? d3.max(stations, d => d.totalTraffic) // Use full dataset if no filter
            : d3.max(filteredStations, d => d.totalTraffic); // Use filtered dataset

            radiusScale = d3.scaleSqrt()
                .domain([0, maxTraffic])
                .range(timeFilter === -1 ? [0, 20] : [0, 30]); // Adjust range based on filter

            // Update the circles' radii based on the filtered data
            circles.data(timeFilter === -1 ? stations : filteredStations)
                .attr('r', d => radiusScale(d.totalTraffic));
        }
          

        // Add the event listener for the slider input
        timeSlider.addEventListener('input', updateTimeDisplay);
        
        // Initialize display when the page loads
        updateTimeDisplay();
 

        }).catch(error => {
            console.error('Error loading CSV:', error);  // Handle errors
        });
    }).catch(error => {
        console.error('Error loading JSON:', error);  // Handle errors
    });
});