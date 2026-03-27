// API Configuration
// Use Vite env var if available, otherwise default to local Spring Boot backend
const API_BASE_URL = import.meta?.env?.VITE_API_BASE_URL || 'http://localhost:8082/api';

/**
 * Generic fetch wrapper with error handling
 */
async function fetchApi(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;

  const config = {
    ...options,
    headers: {
      ...options.headers,
    },
  };

  // Don't set Content-Type for multipart/form-data (file uploads)
  if (!options.body || !(options.body instanceof FormData)) {
    config.headers = {
      ...config.headers,
      'Content-Type': 'application/json',
    };
  }

  try {
    const response = await fetch(url, config);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
    }

    // Handle no-content responses
    if (response.status === 204) {
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error(`API Error [${endpoint}]:`, error);
    throw error;
  }
}

/**
 * Incident API Services
 */
export const incidentApi = {
  /**
   * Get all incidents
   * @returns {Promise<Array>} List of incidents
   */
  getAllIncidents() {
    return fetchApi('/incidents');
  },

  /**
   * Get single incident by ID with full report
   * @param {number|string} id - Incident ID
   * @returns {Promise<Object>} Incident details with full report
   */
  getIncidentById(id) {
    return fetchApi(`/incidents/${id}`);
  },

  /**
   * Get incident frames/evidence photos
   * @param {number|string} id - Incident ID
   * @returns {Promise<Array>} Array of frame objects with base64 images
   */
  getIncidentFrames(id) {
    return fetchApi(`/incidents/${id}/frames`);
  },

  /**
   * Analyze incident images
   * @param {FormData} formData - FormData with image files
   * @returns {Promise<Object>} Analysis result
   */
  analyzeIncidents(formData) {
    // Don't set Content-Type header - browser sets it for FormData
    return fetchApi('/incidents/analyze', {
      method: 'POST',
      body: formData,
    });
  },

  /**
   * Analyze video file
   * @param {FormData} formData - FormData with video file
   * @returns {Promise<Object>} Analysis result
   */
  analyzeVideo(formData) {
    // Don't set Content-Type header - browser sets it for FormData
    return fetchApi('/incidents/analyze-video', {
      method: 'POST',
      body: formData,
    });
  },

  /**
   * Delete an incident by ID
   * @param {number|string} id - Incident ID
   * @returns {Promise<Object>} Deletion result
   */
  deleteIncident(id) {
    return fetchApi(`/incidents/${id}`, {
      method: 'DELETE',
    });
  },
};

/**
 * Camera API Services
 */
export const cameraApi = {
  /**
   * Get list of available cameras
   * @returns {Promise<Array>} List of cameras
   */
  getCameras() {
    return fetchApi('/cameras');
  },

  /**
   * Get camera stream URL
   * @param {number|string} id - Camera ID
   * @returns {Promise<Object>} Stream URL
   */
  getCameraStream(id) {
    return fetchApi(`/cameras/${id}/stream`);
  },

  /**
   * Start camera capture
   * @param {number|string} id - Camera ID
   * @returns {Promise<Object>} Capture status
   */
  startCapture(id) {
    return fetchApi(`/cameras/${id}/start`, { method: 'POST' });
  },

  /**
   * Stop camera capture
   * @param {number|string} id - Camera ID
   * @returns {Promise<Object>} Capture status
   */
  stopCapture(id) {
    return fetchApi(`/cameras/${id}/stop`, { method: 'POST' });
  },

  /**
   * Get current frame from camera
   * @param {number|string} id - Camera ID
   * @returns {Promise<string>} Base64 image
   */
  getCameraFrame(id) {
    return fetchApi(`/cameras/${id}/frame`);
  },

  /**
   * Register virtual webcam as active camera
   * @returns {Promise<Object>} Registration status
   */
  registerWebcam() {
    return fetchApi('/cameras/webcam/register', { method: 'POST' });
  },

  /**
   * Unregister virtual webcam
   * @returns {Promise<Object>} Unregistration status
   */
  unregisterWebcam() {
    return fetchApi('/cameras/webcam/unregister', { method: 'POST' });
  },

  /**
   * Send webcam heartbeat (keep alive)
   * @returns {Promise<Object>} Status with timestamp
   */
  webcamHeartbeat() {
    return fetchApi('/cameras/webcam/heartbeat', { method: 'POST' });
  },
};

export default { incidentApi, cameraApi };
