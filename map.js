// Set your Mapbox access token here
mapboxgl.accessToken = 'pk.eyJ1Ijoic2ZlcnJhZ3V0IiwiYSI6ImNtN2M1cGJxZzBucngyaXB2YmcxM2JnZmsifQ.nViZIh-I9TVBRzDezlSoaA';

// Initialize the map
const map = new mapboxgl.Map({
    container: 'map', // ID of the div where the map will render
    // Default style 
    // style: 'mapbox://styles/mapbox/streets-v12', // Map style
    // Custom style 
    style: 'mapbox://styles/sferragut/cm7c6i6my005p01so7vh1cgbd',
    center: [-71.09415, 42.36027], // [longitude, latitude]
    zoom: 12, // Initial zoom level
    minZoom: 5, // Minimum allowed zoom
    maxZoom: 18 // Maximum allowed zoom
});

