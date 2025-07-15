import axios from 'axios';

const apiService = axios.create({
  baseURL: 'http://localhost:5000/api', 
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

export const get = async (endpoint: string): Promise<any> => {
  try {
    const response = await apiService.get(endpoint);
    return response.data;
  } catch (error: any) {
    console.error(`API Error (${endpoint}):`, error.message);
    throw new Error(error.message || 'Network error');
  }
};

export const post = async (endpoint: string, data: any): Promise<any> => {
  try {
    const response = await apiService.post(endpoint, data);
    return response.data;
  } catch (error: any) {
    console.error(`API Error (${endpoint}):`, error.message);
    throw new Error(error.message || 'Network error');
  }
};

export default apiService;