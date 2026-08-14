import request from './request';

export function login(username: string, password: string, rememberMe: boolean) {
  return request.post('/auth/login', { username, password, rememberMe: String(rememberMe) });
}

export function getProfile() {
  return request.get('/auth/profile');
}

export function changePassword(oldPassword: string, newPassword: string) {
  return request.post('/auth/change-password', { oldPassword, newPassword });
}
