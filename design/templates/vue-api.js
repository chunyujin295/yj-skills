import request from '@/utils/request'

export function getList(params) {
  return request({
    url: '/api/v1/{{MODULE_NAME}}',
    method: 'get',
    params
  })
}

export function add(data) {
  return request({
    url: '/api/v1/{{MODULE_NAME}}',
    method: 'post',
    data
  })
}

export function update(id, data) {
  return request({
    url: '/api/v1/{{MODULE_NAME}}/' + id,
    method: 'put',
    data
  })
}

export function remove(id) {
  return request({
    url: '/api/v1/{{MODULE_NAME}}/' + id,
    method: 'delete'
  })
}
