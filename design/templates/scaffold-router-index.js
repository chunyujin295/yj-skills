import Vue from 'vue'
import Router from 'vue-router'
import Layout from '@/layout'

Vue.use(Router)

const constantRoutes = [
  {
    path: '/',
    component: Layout,
    redirect: '/__DEFAULT_ROUTE__',
    children: [
      // __SCAFFOLD_ROUTES__
    ]
  }
]

const createRouter = () => new Router({
  mode: 'history',
  routes: constantRoutes
})

const router = createRouter()

export default router
