import request from './request';

export function getUsers() {
  return request.get('/admin/users');
}

export function createUser(data: any) {
  return request.post('/admin/users', data);
}

export function updateUser(id: number, data: any) {
  return request.put(`/admin/users/${id}`, data);
}

export function toggleUserEnabled(id: number) {
  return request.put(`/admin/users/${id}/toggle-enabled`);
}

export function resetPassword(id: number, password: string) {
  return request.put(`/admin/users/${id}/reset-password`, { password });
}

export function deleteUser(id: number) {
  return request.delete(`/admin/users/${id}`);
}
