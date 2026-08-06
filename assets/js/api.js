// api.js — WorkSpot API client (plain JS, loaded before Babel app.js) -- I will change later
(function(window) {
  'use strict';

  const API_BASE = window.API_BASE ;
  const TOKEN_KEY = 'workspot_token';

  // Token helpers
  function getToken() {
    return localStorage.getItem(TOKEN_KEY);
  }
  function setToken(token) {
    localStorage.setItem(TOKEN_KEY, token);
  }
  function clearToken() {
    localStorage.removeItem(TOKEN_KEY);
  }

  // Generic request wrapper
  async function request(path, options = {}) {
    const config = {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    };

    if (options.auth) {
      const token = getToken();
      if (token) {
        config.headers['Authorization'] = 'Bearer ' + token;
      }
    }

    if (options.body) {
      config.body = JSON.stringify(options.body);
    }

    const res = await fetch(API_BASE + path, config);
    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || 'Request failed');
    }
    return data;
  }

  // Auth
  async function register(email, password, name, role) {
    return request('/auth/register', { method: 'POST', body: { email, password, name, role } });
  }
  async function login(email, password) {
    return request('/auth/login', { method: 'POST', body: { email, password } });
  }
  async function me() {
    const data = await request('/auth/me', { auth: true });
    return data.user;
  }

  // Workspaces
  // opts (optional): { lat, lng, radius } — when lat & lng are provided the
  // backend filters to within `radius` metres and sorts nearest-first, adding a
  // `distance` (km) field to each result. No opts → the full unsorted list.
  async function listWorkspaces(opts = {}) {
    const { lat, lng, radius } = opts;
    let path = '/workspaces';
    if (lat != null && lng != null) {
      const p = new URLSearchParams({ lat, lng });
      if (radius != null) p.set('radius', radius);
      path += '?' + p.toString();
    }
    return request(path);
  }
  async function getWorkspace(id) {
    return request('/workspaces/' + id);
  }
  async function getReviews(workspaceId) {
    return request('/workspaces/' + workspaceId + '/reviews');
  }
  async function createWorkspace(workspace) {
    return request('/workspaces', { method: 'POST', auth: true, body: workspace });
  }
  async function updateAvailability(workspaceId, availability) {
    return request('/workspaces/' + workspaceId + '/availability', {
      method: 'PATCH', auth: true, body: { availability }
    });
  }
  // Update a workspace's location — pass a new address (re-geocoded server-side)
  // and/or an explicit latitude/longitude pin.
  async function updateWorkspaceLocation(workspaceId, location) {
    return request('/workspaces/' + workspaceId + '/location', {
      method: 'PATCH', auth: true, body: location
    });
  }

  // Bookings
  async function createBooking(booking) {
    return request('/bookings', { method: 'POST', auth: true, body: booking });
  }
  async function listBookings() {
    return request('/bookings', { auth: true });
  }

  // Favorites
  async function listFavorites() {
    return request('/favorites', { auth: true });
  }
  async function addFavorite(workspaceId) {
    return request('/favorites/' + workspaceId, { method: 'POST', auth: true });
  }
  async function removeFavorite(workspaceId) {
    return request('/favorites/' + workspaceId, { method: 'DELETE', auth: true });
  }

  // Owner
  async function ownerStats() {
    return request('/owner/stats', { auth: true });
  }
  async function listWithdrawals() {
    return request('/withdrawals', { auth: true });
  }
  async function createWithdrawal(withdrawal) {
    return request('/withdrawals', { method: 'POST', auth: true, body: withdrawal });
  }

  // Admin
  async function adminStats() {
    return request('/admin/stats', { auth: true });
  }
  async function adminUsers() {
    return request('/admin/users', { auth: true });
  }

  // Google Sign-In — posts the GSI credential (JWT) to the backend.
  async function loginWithGoogle(credential, role) {
    return request('/auth/google', {
      method: 'POST',
      body: { credential, ...(role ? { role } : {}) }
    });
  }

  // Export to window
  window.api = {
    getToken, setToken, clearToken,
    register, login, loginWithGoogle, me,
    listWorkspaces, getWorkspace, getReviews, createWorkspace, updateAvailability, updateWorkspaceLocation,
    createBooking, listBookings,
    listFavorites, addFavorite, removeFavorite,
    ownerStats, listWithdrawals, createWithdrawal,
    adminStats, adminUsers,
  };
})(window);
