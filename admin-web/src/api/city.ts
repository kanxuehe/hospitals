import request from './request';

export function getCities(provinceCode?: string) {
  return request.get('/admin/cities', { params: { provinceCode } });
}
