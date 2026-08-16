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
    const raw = await res.text();
    let data;
    try {
      data = raw ? JSON.parse(raw) : null;
    } catch (_) {
      // Non-JSON body (e.g. a plain-text 404/502 from the server or a proxy).
      // Surface the server's actual text instead of a cryptic JSON.parse error.
      if (!res.ok) throw new Error(raw.trim() || ('Request failed (' + res.status + ')'));
      throw new Error('Unexpected non-JSON response from server');
    }

    if (!res.ok) {
      throw new Error((data && data.error) || ('Request failed (' + res.status + ')'));
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
  async function updateEmail(email) {
    return request('/auth/me', { method: 'PATCH', auth: true, body: { email } });
  }
  async function updatePassword(current_password, new_password) {
    return request('/auth/password', {
      method: 'PATCH', auth: true, body: { current_password, new_password }
    });
  }

  // Workspaces
  // opts (optional): { lat, lng, radius, is_approved } — when lat & lng are provided the
  // backend filters to within `radius` metres and sorts nearest-first, adding a
  // `distance` (km) field to each result. No opts → the full unsorted list.
  async function listWorkspaces(opts = {}) {
    const { lat, lng, radius, is_approved } = opts;
    let path = '/workspaces';
    const p = new URLSearchParams();
    if (lat != null && lng != null) {
      p.set('lat', lat); p.set('lng', lng);
      if (radius != null) p.set('radius', radius);
    }
    if (is_approved != null) p.set('is_approved', String(is_approved));
    if ([...p.keys()].length) {
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
  // Short-lived Cloudinary upload signature so the browser can upload images
  // directly (see uploadToCloudinary in app.js). Returns { cloud_name, api_key,
  // timestamp, signature, folder, allowed_formats }.
  async function getUploadSignature() {
    return request('/workspaces/uploadsignature', { auth: true });
  }
  async function updateAvailability(workspaceId, availability) {
    return request('/workspaces/' + workspaceId + '/availability', {
      method: 'PATCH', auth: true, body: { availability }
    });
  }
  async function updateWorkspacePricing(workspaceId, pricing) {
    return request('/workspaces/' + workspaceId + '/pricing', {
      method: 'PATCH', auth: true, body: { pricing }
    });
  }
  // Update a workspace's location — pass a new address (re-geocoded server-side)
  // and/or an explicit latitude/longitude pin.
  async function updateWorkspaceLocation(workspaceId, location) {
    return request('/workspaces/' + workspaceId + '/location', {
      method: 'PATCH', auth: true, body: location
    });
  }
  async function updateWorkspaceApproval(workspaceId, is_approved) {
    return request('/workspaces/' + workspaceId + '/approval', {
      method: 'PATCH', auth: true, body: { is_approved }
    });
  }
  async function updateWorkspaceSchedule(workspaceId, schedule) {
    return request('/workspaces/' + workspaceId + '/schedule', { method: 'PATCH', auth: true, body: schedule });
  }
  async function suspendWorkspace(workspaceId, suspended) {
    return request('/workspaces/' + workspaceId + '/suspension', { method: 'PATCH', auth: true, body: { suspended } });
  }
  async function reportWorkspace(workspaceId, reason, details) {
    return request('/workspaces/' + workspaceId + '/reports', { method: 'POST', auth: true, body: { reason, details } });
  }

  // Bookings
  async function createBooking(booking) {
    return request('/bookings', { method: 'POST', auth: true, body: booking });
  }
  async function listBookings() {
    return request('/bookings', { auth: true });
  }
  async function getBooking(id) {
    return request('/bookings/' + id, { auth: true });
  }
  async function validateBookingCode(code) {
    return request('/bookings/validate/' + encodeURIComponent(code), { method: 'POST', auth: true });
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
    register, login, loginWithGoogle, me, updateEmail, updatePassword,
    listWorkspaces, getWorkspace, getReviews, createWorkspace, getUploadSignature, updateAvailability, updateWorkspacePricing, updateWorkspaceLocation, updateWorkspaceApproval, updateWorkspaceSchedule, suspendWorkspace, reportWorkspace,
    createBooking, listBookings, getBooking, validateBookingCode,
    listFavorites, addFavorite, removeFavorite,
    ownerStats, listWithdrawals, createWithdrawal,
    adminStats, adminUsers,
  };
})(window);
