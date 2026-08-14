<template>
  <el-card>
    <!-- 操作栏 -->
    <div class="toolbar">
      <el-button type="primary" @click="openDialog()">新增账号</el-button>
    </div>
    <el-table :data="list" v-loading="loading" border>
      <el-table-column prop="username" label="用户名" width="120" />
      <el-table-column label="分配省份">
        <template #default="{ row }">{{ row.provinces?.map((p: any) => p.name).join('、') || '-' }}</template>
      </el-table-column>
      <el-table-column prop="name" label="姓名" width="100" />
      <el-table-column prop="phone" label="手机号" width="130" />
      <el-table-column prop="role" label="角色" width="120">
        <template #default="{ row }">
          <el-tag :type="row.role === 'super_admin' ? 'danger' : 'warning'">
            {{ row.role === 'super_admin' ? '超级管理员' : '省管理员' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="状态" width="80">
        <template #default="{ row }">
          <el-switch :model-value="row.isEnabled" @change="(val: boolean) => toggleEnabled(row.id)" />
        </template>
      </el-table-column>
      <el-table-column prop="lastLoginAt" label="最后登录" width="160">
        <template #default="{ row }">{{ row.lastLoginAt ? formatDate(row.lastLoginAt) : '从未' }}</template>
      </el-table-column>
      <el-table-column label="操作" width="58" fixed="right">
        <template #default="{ row }">
          <el-dropdown trigger="click" @command="(cmd: string) => handleAction(cmd, row)">
            <el-button size="small" link>更多<el-icon style="margin-left: 2px"><ArrowDown /></el-icon></el-button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="edit">编辑</el-dropdown-item>
                <el-dropdown-item command="resetPwd">重置密码</el-dropdown-item>
                <el-dropdown-item command="delete" divided>删除</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog v-model="dialogVisible" :title="editing ? '编辑账号' : '新增账号'" width="500px">
      <el-form :model="form" label-width="100px">
        <el-form-item label="用户名"><el-input v-model="form.username" :disabled="!!editing" /></el-form-item>
        <el-form-item label="密码" v-if="!editing"><el-input v-model="form.password" type="password" show-password /></el-form-item>
        <el-form-item label="姓名"><el-input v-model="form.name" /></el-form-item>
        <el-form-item label="手机号"><el-input v-model="form.phone" /></el-form-item>
        <el-form-item label="角色">
          <el-select v-model="form.role">
            <el-option label="超级管理员" value="super_admin" />
            <el-option label="省管理员" value="province_admin" />
          </el-select>
        </el-form-item>
        <el-form-item label="分配省份" v-if="form.role === 'province_admin'">
          <el-select v-model="form.provinceCodes" multiple style="width: 100%">
            <el-option v-for="p in provinces" :key="p.code" :label="p.name" :value="p.code" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSave">确定</el-button>
      </template>
    </el-dialog>
  </el-card>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { ArrowDown } from '@element-plus/icons-vue';
import { getUsers, createUser, updateUser, toggleUserEnabled, resetPassword, deleteUser } from '../../api/user';
import { getProvinces } from '../../api/province';
import { useAuthStore } from '../../stores/auth';

const authStore = useAuthStore();
const loading = ref(false);
const allList = ref<any[]>([]);
const list = computed(() =>
  allList.value.filter(u => u.username !== 'admin' && u.id !== authStore.user?.id)
);
const provinces = ref<any[]>([]);
const dialogVisible = ref(false);
const editing = ref<any>(null);
const form = reactive<any>({ username: '', password: '', name: '', phone: '', role: 'province_admin', provinceCodes: [] });

async function fetchData() {
  loading.value = true;
  try {
    allList.value = await getUsers() as unknown as any[];
  } finally {
    loading.value = false;
  }
}

function openDialog(row?: any) {
  editing.value = row || null;
  if (row) {
    Object.assign(form, { ...row, provinceCodes: row.provinces?.map((p: any) => p.code) || [] });
  } else {
    Object.assign(form, { username: '', password: '', name: '', phone: '', role: 'province_admin', provinceCodes: [] });
  }
  dialogVisible.value = true;
}

async function handleSave() {
  const payload: any = { username: form.username, name: form.name, phone: form.phone, role: form.role, provinceCodes: [...form.provinceCodes] };
  if (editing.value) {
    await updateUser(editing.value.id, payload);
  } else {
    payload.password = form.password;
    await createUser(payload);
  }
  ElMessage.success('保存成功');
  dialogVisible.value = false;
  fetchData();
}

async function toggleEnabled(id: number) {
  await toggleUserEnabled(id);
  fetchData();
}

async function handleResetPassword(id: number) {
  const { value } = await ElMessageBox.prompt('请输入新密码', '重置密码', { inputPattern: /.{6,}/, inputErrorMessage: '密码至少6位' });
  await resetPassword(id, value);
  ElMessage.success('密码重置成功');
}

async function handleDelete(id: number) {
  await deleteUser(id);
  ElMessage.success('删除成功');
  fetchData();
}

async function handleAction(cmd: string, row: any) {
  if (cmd === 'edit') openDialog(row);
  else if (cmd === 'resetPwd') handleResetPassword(row.id);
  else if (cmd === 'delete') {
    await ElMessageBox.confirm('确定删除？', '提示', { type: 'warning' });
    handleDelete(row.id);
  }
}

function formatDate(d: string) {
  return new Date(d).toLocaleString('zh-CN');
}

onMounted(async () => {
  provinces.value = await getProvinces() as unknown as any[];
  fetchData();
});
</script>
