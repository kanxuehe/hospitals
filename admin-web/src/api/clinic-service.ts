import request from './request';

export function createClinicService(data: any) {
  return request.post('/admin/clinic-services', data);
}

export function updateClinicService(id: number, data: any) {
  return request.put(`/admin/clinic-services/${id}`, data);
}

export function deleteClinicService(id: number) {
  return request.delete(`/admin/clinic-services/${id}`);
}

export function saveSchedule(clinicServiceId: number, schedules: any[]) {
  return request.put(`/admin/clinic-services/${clinicServiceId}/schedules`, { schedules });
}

export function createPhone(clinicServiceId: number, data: any) {
  return request.post(`/admin/clinic-services/${clinicServiceId}/phones`, data);
}

export function updatePhone(phoneId: number, data: any) {
  return request.put(`/admin/clinic-services/phones/${phoneId}`, data);
}

export function deletePhone(phoneId: number) {
  return request.delete(`/admin/clinic-services/phones/${phoneId}`);
}
