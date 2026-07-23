import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'https://sms-backend-r0tn.onrender.com',
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' }
});

export async function requestParentOtp(phone) {
  const { data } = await api.post('/api/parents/request-otp', { phone });
  return data;
}

export async function verifyParentOtp(session_id, code) {
  const { data } = await api.post('/api/parents/verify-otp', { session_id, code });
  return data;
}

export async function getParentDashboard(phone) {
  const { data } = await api.get(`/api/parents/dashboard/${encodeURIComponent(phone)}`);
  return data;
}

export async function getAd(schoolId) {
  const { data } = await api.get('/api/ads/active', { params: { school_id: schoolId } });
  return data;
}

export async function getRandomAd() {
  const { data } = await api.get('/api/ads/random');
  return data;
}

export async function upgradePremium(phone) {
  const { data } = await api.post('/api/parents/upgrade', { phone });
  return data;
}

export async function getPremiumStatus(phone) {
  const { data } = await api.get(`/api/parents/premium-status/${encodeURIComponent(phone)}`);
  return data;
}

export async function registerMerchant(body) {
  const { data } = await api.post('/api/merchants/register', body);
  return data;
}

export async function requestMerchantOtp(phone) {
  const { data } = await api.post('/api/merchants/request-otp', { phone });
  return data;
}

export async function verifyMerchantOtp(session_id, code) {
  const { data } = await api.post('/api/merchants/verify-otp', { session_id, code });
  return data;
}

export default api;
