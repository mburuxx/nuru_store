import axios from "axios";

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || "http://127.0.0.1:8000";

export const api = axios.create({
  baseURL: API_BASE_URL,
});

export function setAuthTokens({ access, refresh }) {
  if (access) localStorage.setItem("access", access);
  if (refresh) localStorage.setItem("refresh", refresh);
}

export function clearAuthTokens() {
  localStorage.removeItem("access");
  localStorage.removeItem("refresh");
}

function getAccess() {
  return localStorage.getItem("access");
}
function getRefresh() {
  return localStorage.getItem("refresh");
}


api.interceptors.request.use((config) => {
  const token = getAccess();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let isRefreshing = false;
let refreshQueue = [];

function processQueue(error, token = null) {
  refreshQueue.forEach((p) => (error ? p.reject(error) : p.resolve(token)));
  refreshQueue = [];
}


api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config;
    const status = err?.response?.status;

    if (status !== 401 || original?._retry) {
      return Promise.reject(err);
    }

    const refresh = getRefresh();
    if (!refresh) return Promise.reject(err);

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        refreshQueue.push({
          resolve: (token) => {
            original.headers.Authorization = `Bearer ${token}`;
            resolve(api(original));
          },
          reject,
        });
      });
    }

    original._retry = true;
    isRefreshing = true;

    try {
      const r = await axios.post(`${API_BASE_URL}/api/users/refresh/`, { refresh });
      const newAccess = r.data.access;
      setAuthTokens({ access: newAccess });

      processQueue(null, newAccess);
      original.headers.Authorization = `Bearer ${newAccess}`;
      return api(original);
    } catch (e) {
      processQueue(e, null);
      clearAuthTokens();
      return Promise.reject(e);
    } finally {
      isRefreshing = false;
    }
  }
);
