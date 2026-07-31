import request from './request';

export function getDoctors(params: any) {
  return request.get('/admin/doctors', { params });
}

export function createDoctor(data: any) {
  return request.post('/admin/doctors', data);
}

export function updateDoctor(id: number, data: any) {
  return request.put(`/admin/doctors/${id}`, data);
}

export function deleteDoctor(id: number) {
  return request.delete(`/admin/doctors/${id}`);
}
