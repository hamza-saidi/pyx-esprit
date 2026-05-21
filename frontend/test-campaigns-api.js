// Test script to check campaigns API
const testCampaignsAPI = async () => {
  try {
    const token = localStorage.getItem('token');
    console.log('Token:', token ? 'Present' : 'Missing');
    
    const response = await fetch('http://localhost:5000/api/campagnes', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('API Error:', errorText);
      return;
    }
    
    const data = await response.json();
    console.log('API Response:', data);
    console.log('Items type:', typeof data);
    console.log('Items length:', data?.data?.length || data?.length || 'N/A');
    
    if (data?.data) {
      console.log('First item:', data.data[0]);
    } else if (Array.isArray(data)) {
      console.log('First item:', data[0]);
    }
    
  } catch (error) {
    console.error('Fetch error:', error);
  }
};

// Run the test
testCampaignsAPI();

