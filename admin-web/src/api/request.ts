import axios, { AxiosInstance, InternalAxiosRequestConfig, AxiosResponse } from 'axios';
import { ElMessage } from 'element-plus';
import { getAccessToken, getRefreshToken, setTokens, clearTokens } from '../utils/auth';
import router from '../router';

const request: AxiosInstance = axios.create({
  baseURL: '/api',
  timeout: 15000,
});

request.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

let isRefreshing = false;

request.interceptors.response.use(
  (response: AxiosResponse) => {
    const res = response.data;
    if (res.code !== 0) {
      ElMessage.error(res.message || '请求失败');
      return Promise.reject(new Error(res.message || 'Error'));
    }
    return res.data;
  },
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return Promise.reject(error);
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = getRefreshToken();
      if (refreshToken) {
        try {
          const res = await axios.post('/api/auth/refresh', null, {
            headers: { Authorization: `Bearer ${refreshToken}` },
          });
          const { accessToken } = res.data.data;
          setTokens(accessToken, refreshToken);
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          return request(originalRequest);
        } catch {
          clearTokens();
          router.push('/login');
          ElMessage.error('登录已过期，请重新登录');
        } finally {
          isRefreshing = false;
        }
      } else {
        clearTokens();
        router.push('/login');
      }
    } else if (error.response?.status === 403) {
      ElMessage.error('无权操作');
    } else {
      ElMessage.error(error.response?.data?.message || '网络错误');
    }

    return Promise.reject(error);
  },
);

export default request;
