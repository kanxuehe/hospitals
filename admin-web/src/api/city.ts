import request from './request';

export function getCities(provinceId?: number) {
  return request.get('/admin/cities', { params: { provinceId } });
}
