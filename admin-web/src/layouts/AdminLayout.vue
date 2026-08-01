<template>
  <el-container class="layout-container">
    <!-- 桌面端侧边栏 -->
    <el-aside v-if="!isMobile" :width="isCollapse ? '64px' : '220px'" class="sidebar">
      <div class="logo">
        <span v-if="!isCollapse">造口伤口门诊后台</span>
        <span v-else>🏥</span>
      </div>
      <el-menu
        :default-active="activeMenu"
        :collapse="isCollapse"
        router
        background-color="#304156"
        text-color="#bfcbd9"
        active-text-color="#409EFF"
      >
        <el-sub-menu index="hospital">
          <template #title>
            <el-icon><OfficeBuilding /></el-icon>
            <span>医院管理</span>
          </template>
          <el-menu-item index="/hospitals">医院列表</el-menu-item>
          <el-menu-item index="/doctors">医生管理</el-menu-item>
        </el-sub-menu>

        <el-sub-menu index="base">
          <template #title>
            <el-icon><Folder /></el-icon>
            <span>基础数据</span>
          </template>
          <el-menu-item v-if="authStore.isSuperAdmin()" index="/provinces">省份管理</el-menu-item>
          <el-menu-item index="/cities">城市管理</el-menu-item>
          <el-menu-item index="/dict">数据字典</el-menu-item>
        </el-sub-menu>

        <el-menu-item v-if="authStore.isSuperAdmin()" index="/users">
          <el-icon><User /></el-icon>
          <span>账号管理</span>
        </el-menu-item>
      </el-menu>
    </el-aside>

    <el-container>
      <!-- 顶栏 -->
      <el-header class="header">
        <div class="header-left">
          <!-- 桌面端折叠按钮 -->
          <el-icon v-if="!isMobile" class="collapse-btn" @click="isCollapse = !isCollapse">
            <Fold v-if="!isCollapse" />
            <Expand v-else />
          </el-icon>
          <!-- 移动端汉堡菜单按钮 -->
          <el-icon v-else class="collapse-btn" @click="drawerVisible = true">
            <Expand />
          </el-icon>
          <span v-if="isMobile" class="mobile-title">造口伤口门诊后台</span>
        </div>
        <div class="header-right">
          <el-dropdown @command="handleCommand">
            <span class="user-info">
              {{ authStore.user?.name }}
              <el-icon><ArrowDown /></el-icon>
            </span>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="changePassword">修改密码</el-dropdown-item>
                <el-dropdown-item command="logout" divided>退出登录</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </el-header>

      <!-- 内容区 -->
      <el-main class="main-content">
        <router-view />
      </el-main>
    </el-container>

    <!-- 移动端抽屉菜单 -->
    <el-drawer
      v-if="isMobile"
      v-model="drawerVisible"
      direction="ltr"
      size="220px"
      :with-header="false"
    >
      <div class="drawer-sidebar">
        <div class="logo">
          <span>造口伤口门诊后台</span>
        </div>
        <el-menu
          :default-active="activeMenu"
          router
          background-color="#304156"
          text-color="#bfcbd9"
          active-text-color="#409EFF"
          @select="drawerVisible = false"
        >
          <el-sub-menu index="hospital">
            <template #title>
              <el-icon><OfficeBuilding /></el-icon>
              <span>医院管理</span>
            </template>
            <el-menu-item index="/hospitals">医院列表</el-menu-item>
            <el-menu-item index="/doctors">医生管理</el-menu-item>
          </el-sub-menu>

          <el-sub-menu index="base">
            <template #title>
              <el-icon><Folder /></el-icon>
              <span>基础数据</span>
            </template>
            <el-menu-item v-if="authStore.isSuperAdmin()" index="/provinces">省份管理</el-menu-item>
            <el-menu-item index="/cities">城市管理</el-menu-item>
            <el-menu-item index="/dict">数据字典</el-menu-item>
          </el-sub-menu>

          <el-menu-item v-if="authStore.isSuperAdmin()" index="/users">
            <el-icon><User /></el-icon>
            <span>账号管理</span>
          </el-menu-item>
        </el-menu>
      </div>
    </el-drawer>

    <!-- 修改密码弹窗 -->
    <el-dialog v-model="passwordDialogVisible" title="修改密码" width="400px">
      <el-form :model="passwordForm" label-width="80px">
        <el-form-item label="旧密码">
          <el-input v-model="passwordForm.oldPassword" type="password" show-password />
        </el-form-item>
        <el-form-item label="新密码">
          <el-input v-model="passwordForm.newPassword" type="password" show-password />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="passwordDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitChangePassword">确认</el-button>
      </template>
    </el-dialog>
  </el-container>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import { useAuthStore } from '../stores/auth';
import { useIsMobile } from '../composables/useIsMobile';
import { changePassword } from '../api/auth';

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const { isMobile } = useIsMobile();

const isCollapse = ref(false);
const drawerVisible = ref(false);
const activeMenu = computed(() => route.path);

const passwordDialogVisible = ref(false);
const passwordForm = ref({ oldPassword: '', newPassword: '' });

function handleCommand(command: string) {
  if (command === 'logout') {
    ElMessageBox.confirm('确定要退出登录吗？', '提示', { type: 'warning' })
      .then(() => {
        authStore.logout();
        router.push('/login');
      })
      .catch(() => {});
  } else if (command === 'changePassword') {
    passwordForm.value = { oldPassword: '', newPassword: '' };
    passwordDialogVisible.value = true;
  }
}

async function submitChangePassword() {
  try {
    await changePassword(passwordForm.value.oldPassword, passwordForm.value.newPassword);
    ElMessage.success('密码修改成功');
    passwordDialogVisible.value = false;
  } catch (e) {
    // 错误已在拦截器处理
  }
}
</script>

<style scoped>
.layout-container {
  height: 100vh;
}
.sidebar {
  background-color: #304156;
  transition: width 0.3s;
  overflow: hidden;
}
.drawer-sidebar {
  height: 100%;
  background-color: #304156;
}
.logo {
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 16px;
  font-weight: bold;
  white-space: nowrap;
}
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid #e6e6e6;
  background: #fff;
}
.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}
.collapse-btn {
  cursor: pointer;
  font-size: 20px;
}
.mobile-title {
  font-size: 16px;
  font-weight: bold;
}
.user-info {
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 4px;
}
.main-content {
  background: #f0f2f5;
  padding: 16px;
  overflow-y: auto;
}
:deep(.el-menu) {
  border-right: none;
}
:deep(.el-drawer__body) {
  padding: 0;
}
</style>
