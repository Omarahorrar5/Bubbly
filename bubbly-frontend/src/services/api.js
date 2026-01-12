const API_BASE = 'http://localhost:3000/api';

async function request(endpoint, options = {}) {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.error || 'Something went wrong');
  }
  
  return data;
}

// Auth API
export const authAPI = {
  login: (email, password) => 
    request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  
  logout: () => 
    request('/auth/logout', { method: 'POST' }),
  
  getCurrentUser: () => 
    request('/auth/me'),
};

// Bubbles API
export const bubblesAPI = {
  getAll: (status) => 
    request(`/bubbles${status ? `?status=${status}` : ''}`),
  
  getById: (id) => 
    request(`/bubbles/${id}`),
  
  getMyBubbles: () => 
    request('/bubbles/my'),
  
  create: (bubbleData) => 
    request('/bubbles', {
      method: 'POST',
      body: JSON.stringify(bubbleData),
    }),
  
  join: (id) => 
    request(`/bubbles/${id}/join`, { method: 'POST' }),
  
  leave: (id) => 
    request(`/bubbles/${id}/leave`, { method: 'POST' }),
  
  close: (id) => 
    request(`/bubbles/${id}/close`, { method: 'POST' }),
};

// Messages API
export const messagesAPI = {
  getBubbleMessages: (bubbleId) => 
    request(`/messages/${bubbleId}`),
  
  sendMessage: (bubbleId, content) => 
    request(`/messages/${bubbleId}`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    }),
  
  getRecent: () => 
    request('/messages'),
};

// Interests API
export const interestsAPI = {
  getAll: () => 
    request('/interests'),
  
  getCategories: () => 
    request('/interests/categories'),
  
  getByCategory: (category) => 
    request(`/interests/category/${category}`),
};
