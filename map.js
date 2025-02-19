// Set your Mapbox access token here
mapboxgl.accessToken = 'pk.eyJ1Ijoic2ZlcnJhZ3V0IiwiYSI6ImNtN2M1cGJxZzBucngyaXB2YmcxM2JnZmsifQ.nViZIh-I9TVBRzDezlSoaA';

// Initialize the map
const map = new mapboxgl.Map({
    container: 'map', // ID of the div where the map will render
    // Default style 
    style: 'mapbox://styles/mapbox/streets-v12', // Map style
    // Custom style 
    // style: 'mapbox://styles/sferragut/cm7c6i6my005p01so7vh1cgbd',
    center: [-71.09415, 42.36027], // [longitude, latitude]
    zoom: 12, // Initial zoom level
    minZoom: 5, // Minimum allowed zoom
    maxZoom: 18 // Maximum allowed zoom
});

// Select the svg element before using it
const svg = d3.select('#map').select('svg');
let stations = []; // Initialize empty stations array

// Helper function to convert lat/lon to pixel coordinates
function getCoords(station) {
    const point = new mapboxgl.LngLat(+station.lon, +station.lat); // Convert lon/lat
    const { x, y } = map.project(point);  // Convert to pixel coordinates
    return { cx: x, cy: y };  // Return formatted position
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
        d3.csv('bluebikes-traffic-2024-03.csv').then(trips => {
            departures = d3.rollup(
                trips,
                (v) => v.length,
                (d) => d.start_station_id,
            );
            arrivals = d3.rollup(
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
             
            // Create the radius scale (square root scale for circle area)
        const radiusScale = d3
        .scaleSqrt()
        .domain([0, d3.max(stations, (d) => d.totalTraffic)]) // Domain: min to max traffic
        .range([2, 25]); // Range: min radius 2, max radius 25

        // Append circles to the SVG for each station
        const circles = svg.selectAll('circle')
            .data(stations)
            .enter()
            .append('circle')
            .attr('r', (d) => radiusScale(d.totalTraffic))  // Radius based on traffic
            .attr('fill', 'steelblue')                      // Fill color
            .attr('stroke', 'white')                        // Border color
            .attr('stroke-width', 1)                        // Border thickness
            .attr('opacity', 0.8);                          // Transparency
        
        svg.selectAll('circle').each(function() {
            console.log(d3.select(this).attr('r')); // Log the radius for each circle
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

        
        }).catch(error => {
            console.error('Error loading CSV:', error);  // Handle errors
        });
    }).catch(error => {
        console.error('Error loading JSON:', error);  // Handle errors
    });
});
