import { defineStore } from 'pinia';
import { ref } from 'vue';
import { login as loginApi, getProfile } from '../api/auth';
import { setTokens, clearTokens, getAccessToken } from '../utils/auth';

export interface UserInfo {
  id: number;
  username: string;
  name: string;
  role: string;
  provinces: { id: number; name: string }[];
}

export const useAuthStore = defineStore('auth', () => {
  const user = ref<UserInfo | null>(null);
  const isLoggedIn = ref(!!getAccessToken());

  async function login(username: string, password: string, rememberMe: boolean) {
    const data: any = await loginApi(username, password, rememberMe);
    setTokens(data.accessToken, data.refreshToken);
    isLoggedIn.value = true;

    // 获取完整 profile
    await fetchProfile();
  }

  async function fetchProfile() {
    const profile: any = await getProfile();
    user.value = profile;
    return profile;
  }

  function logout() {
    clearTokens();
    user.value = null;
    isLoggedIn.value = false;
  }

  function isSuperAdmin() {
    return user.value?.role === 'super_admin';
  }

  function getProvinceIds(): number[] {
    return user.value?.provinces?.map((p) => p.id) || [];
  }

  return { user, isLoggedIn, login, fetchProfile, logout, isSuperAdmin, getProvinceIds };
});
