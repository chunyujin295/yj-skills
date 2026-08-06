import axios from 'axios'
import { MessageBox, Message, Loading } from 'element-ui'

let downloadLoadingInstance

const service = axios.create({
  baseURL: process.env.VUE_APP_BASE_API || '/api',
  timeout: 15000
})

service.interceptors.request.use(
  config => config,
  error => Promise.reject(error)
)

service.interceptors.response.use(
  response => response.data,
  error => {
    let msg = error.message
    if (error.response) {
      if (error.response.status === 401) {
        MessageBox.confirm('登录状态已过期，请重新登录', '系统提示', {
          confirmButtonText: '重新登录',
          cancelButtonText: '取消',
          type: 'warning'
        }).then(() => {
          location.href = '/login'
        })
        return Promise.reject('无效的会话，或者会话已过期，请重新登录。')
      } else if (error.response.status === 500) {
        msg = '服务器内部错误'
      } else {
        msg = error.response.data.msg || msg
      }
    }
    Message({ message: msg, type: 'error' })
    return Promise.reject(error)
  }
)

// 通用下载方法
export function download(url, name) {
  downloadLoadingInstance = Loading.service({
    text: '正在下载数据，请稍候',
    spinner: 'el-icon-loading',
    background: 'rgba(0, 0, 0, 0.7)'
  })
  return service({
    url: url,
    method: 'get',
    responseType: 'blob'
  }).then(async (data) => {
    const blob = new Blob([data])
    const fileName = name || 'download'
    const elink = document.createElement('a')
    elink.href = URL.createObjectURL(blob)
    elink.download = fileName
    document.body.appendChild(elink)
    elink.click()
    document.body.removeChild(elink)
    URL.revokeObjectURL(elink.href)
    downloadLoadingInstance.close()
  }).catch((r) => {
    console.error(r)
    Message.error('下载文件出现错误，请联系管理员！')
    downloadLoadingInstance.close()
  })
}

export default service
