import request from './request';

export function getStats() {
  return request.get('/admin/dashboard/stats');
}
