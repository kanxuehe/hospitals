import request from './request';

export function getProvinces() {
  return request.get('/admin/provinces');
}
