// Test Google Maps API
const API_KEY = 'AIzaSyBBxkH4OxFvVDJ242aIOl7auZ2F4Lcf9fg';

export const testGoogleMapsAPI = async () => {
  try {
    console.log('🗺️ Testing Google Maps API...');
    
    // Test 1: Simple autocomplete request
    const autocompleteUrl = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=Lagos&key=${API_KEY}&components=country:ng&language=en`;
    
    console.log('📍 Testing autocomplete URL:', autocompleteUrl);
    
    const response = await fetch(autocompleteUrl);
    console.log('📡 Response status:', response.status);
    console.log('📡 Response headers:', response.headers);
    
    const data = await response.json();
    console.log('📊 API Response:', data);
    
    if (data.status === 'OK') {
      console.log('✅ Google Maps API is working!');
      console.log(`📍 Found ${data.predictions?.length || 0} predictions`);
      return { success: true, data };
    } else {
      console.log('❌ API Error:', data.error_message || data.status);
      return { success: false, error: data.error_message || data.status };
    }
    
  } catch (error) {
    console.log('🚨 Network Error:', error.message);
    return { success: false, error: error.message };
  }
};

// Test different endpoints
export const testAllEndpoints = async () => {
  console.log('🧪 Testing all Google Maps endpoints...');
  
  const tests = [
    {
      name: 'Places Autocomplete',
      url: `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=Lagos&key=${API_KEY}&components=country:ng`
    },
    {
      name: 'Geocoding',
      url: `https://maps.googleapis.com/maps/api/geocode/json?address=Lagos,Nigeria&key=${API_KEY}`
    },
    {
      name: 'Place Details',
      url: `https://maps.googleapis.com/maps/api/place/details/json?place_id=ChIJyc_U0TTFXhARZCRsNx_N0n4&key=${API_KEY}&fields=name,formatted_address`
    }
  ];
  
  for (const test of tests) {
    console.log(`\n🔍 Testing ${test.name}...`);
    try {
      const response = await fetch(test.url);
      const data = await response.json();
      console.log(`${test.name} status:`, data.status);
      if (data.error_message) {
        console.log(`${test.name} error:`, data.error_message);
      }
    } catch (error) {
      console.log(`${test.name} network error:`, error.message);
    }
  }
};