import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import { getAccessToken } from '../utils/auth';

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('../views/login/index.vue'),
    meta: { public: true },
  },
  {
    path: '/',
    component: () => import('../layouts/AdminLayout.vue'),
    redirect: '/dashboard',
    children: [
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: () => import('../views/dashboard/index.vue'),
        meta: { title: '首页' },
      },
      {
        path: 'hospitals',
        name: 'HospitalList',
        component: () => import('../views/hospital/List.vue'),
        meta: { title: '医院列表' },
      },
      {
        path: 'hospitals/:id',
        name: 'HospitalDetail',
        component: () => import('../views/hospital/Detail.vue'),
        meta: { title: '医院详情' },
      },
      {
        path: 'doctors',
        name: 'DoctorList',
        component: () => import('../views/doctor/List.vue'),
        meta: { title: '医生管理' },
      },
      {
        path: 'provinces',
        name: 'ProvinceList',
        component: () => import('../views/province/List.vue'),
        meta: { title: '省份管理', superAdmin: true },
      },
      {
        path: 'cities',
        name: 'CityList',
        component: () => import('../views/city/List.vue'),
        meta: { title: '城市管理' },
      },
      {
        path: 'dict',
        name: 'DictList',
        component: () => import('../views/dict/List.vue'),
        meta: { title: '数据字典' },
      },
      {
        path: 'users',
        name: 'UserList',
        component: () => import('../views/user/List.vue'),
        meta: { title: '账号管理', superAdmin: true },
      },
    ],
  },
];

const router = createRouter({
  history: createWebHistory('/admin/'),
  routes,
});

router.beforeEach(async (to, from, next) => {
  const token = getAccessToken();

  if (to.meta.public) {
    if (token && to.path === '/login') {
      next('/');
    } else {
      next();
    }
    return;
  }

  if (!token) {
    next('/login');
    return;
  }

  const authStore = useAuthStore();
  if (!authStore.user) {
    try {
      await authStore.fetchProfile();
    } catch {
      authStore.logout();
      next('/login');
      return;
    }
  }

  // 超管路由权限
  if (to.meta.superAdmin && !authStore.isSuperAdmin()) {
    next('/dashboard');
    return;
  }

  next();
});

export default router;
