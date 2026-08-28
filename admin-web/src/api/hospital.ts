import request from './request';
import axios from 'axios';
import { getAccessToken } from '../utils/auth';

export interface HospitalQuery {
  page?: number;
  pageSize?: number;
  name?: string;
  provinceCode?: string;
  cityCode?: string;
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

export function importHospitals(file: File, provinceId: number) {
  const formData = new FormData();
  formData.append('file', file);
  return request.post(
    `/admin/import/hospitals?provinceId=${provinceId}`,
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } },
  );
}

export async function downloadHospitalTemplate() {
  const res = await axios.get('/api/admin/import/template', {
    headers: { Authorization: `Bearer ${getAccessToken()}` },
    responseType: 'blob',
  });
  const url = URL.createObjectURL(res.data);
  const a = document.createElement('a');
  a.href = url;
  a.download = '医院导入模板.xlsx';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
