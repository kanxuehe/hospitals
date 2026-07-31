import request from './request';

export function getDictItems(typeCode: string) {
  return request.get('/admin/dict/items', { params: { typeCode } });
}
