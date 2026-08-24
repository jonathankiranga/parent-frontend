import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'https://sms-backend-r0tn.onrender.com',
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' }
});

export async function requestParentOtp(identifier) {
  const value = String(identifier || '').trim();
  const body = value.includes('@') ? { email: value } : { phone: value };
  const { data } = await api.post('/api/parents/request-otp', body);
  return data;
}

export async function verifyParentOtp(session_id, code) {
  const { data } = await api.post('/api/parents/verify-otp', { session_id, code });
  return data;
}

export async function getParentDashboard(phone, schoolId) {
  const params = schoolId ? { school_id: schoolId } : {};
  const { data } = await api.get(`/api/parents/dashboard/${encodeURIComponent(phone)}`, { params });
  return data;
}

export async function getParentSchools(phone) {
  const { data } = await api.get(`/api/parents/my-schools/${encodeURIComponent(phone)}`);
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

export async function getAcademicReport(studentId, term, year, phone) {
  const { data } = await api.get(`/api/assessments/report/${encodeURIComponent(studentId)}/${encodeURIComponent(term)}`, {
    params: { year, phone }
  });
  return data;
}

export async function getFeeStatement(studentId, term, year) {
  const { data } = await api.get(`/api/fees/statement/${encodeURIComponent(studentId)}/${encodeURIComponent(term)}/${encodeURIComponent(year)}`);
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

export async function getAcademicRecords(phone) {
  const { data } = await api.get(`/api/parents/academic-records/${encodeURIComponent(phone)}`);
  return data;
}

export async function getPaymentStatus(checkoutRequestId, phone) {
  const { data } = await api.get('/api/parents/payment-status', {
    params: { checkout_request_id: checkoutRequestId, phone }
  });
  return data;
}

export default api;
