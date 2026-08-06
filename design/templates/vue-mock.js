export const mockList = [
  { id: 1, name: '示例数据一', status: '启用', createTime: '2026-05-20 09:30:00' },
  { id: 2, name: '示例数据二', status: '启用', createTime: '2026-05-20 10:15:00' },
  { id: 3, name: '示例数据三', status: '禁用', createTime: '2026-05-21 11:20:00' },
  { id: 4, name: '示例数据四', status: '启用', createTime: '2026-05-22 14:05:00' },
  { id: 5, name: '示例数据五', status: '禁用', createTime: '2026-05-23 16:40:00' }
]

export default {
  list: {
    data: {
      list: mockList,
      total: mockList.length
    }
  },
  add: { message: '操作成功' },
  update: { message: '操作成功' },
  remove: { message: '操作成功' }
}
