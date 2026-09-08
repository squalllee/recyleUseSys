import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('../components/Login.vue'),
    meta: { requiresAuth: false },
  },
  {
    path: '/',
    component: () => import('../layouts/DefaultLayout.vue'),
    meta: { requiresAuth: true },
    children: [
      {
        path: '',
        name: 'Home',
        component: () => import('../pages/HomePage.vue'),
      },
      {
        path: 'repairable-parts',
        redirect: { name: 'MaintTypeMaintenance' },
      },
      {
        path: 'maintenance-object-types',
        name: 'MaintTypeMaintenance',
        component: () => import('../pages/MaintTypeMaintenance.vue'),
      },
      {
        path: 'repairable-devices',
        name: 'RepairableDevices',
        component: () => import('../pages/RepairableDevices.vue'),
      },
      {
        path: 'action-types',
        name: 'ActionTypeMaintenance',
        component: () => import('../pages/ActionTypeMaintenance.vue'),
      },
      {
        path: 'fault-reason-types',
        name: 'FaultReasonTypeMaintenance',
        component: () => import('../pages/FaultReasonTypeMaintenance.vue'),
      },
      {
        path: 'maintenance-records',
        name: 'MaintenanceRecords',
        component: () => import('../pages/MaintenanceRecords.vue'),
      },
    ],
  },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

router.beforeEach((to, _from, next) => {
  const auth = useAuthStore()
  const isLoggedIn = auth.isLoggedIn || localStorage.getItem('isLoggedIn') === 'true'

  if (to.meta.requiresAuth && !isLoggedIn) {
    next({ path: '/login', query: { redirect: to.fullPath } })
    return
  }

  if (to.path === '/login' && isLoggedIn) {
    next('/')
    return
  }

  next()
})

export default router
