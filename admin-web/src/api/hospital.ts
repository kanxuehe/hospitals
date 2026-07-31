import request from './request';

export interface HospitalQuery {
  page?: number;
  pageSize?: number;
  name?: string;
  provinceId?: number;
  cityId?: number;
  level?: string;
  isPublished?: boolean;
}

export function getHospitals(params: HospitalQuery) {
  return request.get('/admin/hospitals', { params });
}

export function getHospitalDetail(id: number) {
  return request.get(`/admin/hospitals/${id}`);
}

export function createHospital(data: any) {
  return request.post('/admin/hospitals', data);
}

export function updateHospital(id: number, data: any) {
  return request.put(`/admin/hospitals/${id}`, data);
}

export function deleteHospital(id: number) {
  return request.delete(`/admin/hospitals/${id}`);
}

export function batchPublish(ids: number[], isPublished: boolean) {
  return request.post('/admin/hospitals/batch/publish', { ids, isPublished });
}

export function batchDelete(ids: number[]) {
  return request.post('/admin/hospitals/batch/delete', { ids });
}
