import Vue from 'vue'
import ElementUI from 'element-ui'
import 'element-ui/lib/theme-chalk/index.css'
import App from './App.vue'
import router from './router'
import plugins from './plugins'
import { parseTime, resetForm, addDateRange } from '@/utils/common'
import { download } from '@/utils/request'
import Pagination from '@/components/Pagination'

Vue.use(ElementUI, { size: 'small' })
Vue.use(plugins)

Vue.prototype.parseTime = parseTime
Vue.prototype.resetForm = resetForm
Vue.prototype.addDateRange = addDateRange
Vue.prototype.download = download

Vue.component('Pagination', Pagination)
Vue.config.productionTip = false

new Vue({
  router,
  render: h => h(App)
}).$mount('#app')
