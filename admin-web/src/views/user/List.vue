<template>
  <el-card>
    <div style="margin-bottom: 12px">
      <el-button type="success" @click="openDialog()">新增账号</el-button>
    </div>
    <el-table :data="list" v-loading="loading" border>
      <el-table-column prop="username" label="用户名" width="120" />
      <el-table-column prop="name" label="姓名" width="100" />
      <el-table-column prop="phone" label="手机号" width="130" />
      <el-table-column prop="role" label="角色" width="120">
        <template #default="{ row }">
          <el-tag :type="row.role === 'super_admin' ? 'danger' : 'warning'">
            {{ row.role === 'super_admin' ? '超级管理员' : '省管理员' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="分配省份">
        <template #default="{ row }">{{ row.provinces?.map((p: any) => p.name).join('、') || '-' }}</template>
      </el-table-column>
      <el-table-column label="状态" width="80">
        <template #default="{ row }">
          <el-switch :model-value="row.isEnabled" @change="(val: boolean) => toggleEnabled(row.id)" />
        </template>
      </el-table-column>
      <el-table-column prop="lastLoginAt" label="最后登录" width="160">
        <template #default="{ row }">{{ row.lastLoginAt ? formatDate(row.lastLoginAt) : '从未' }}</template>
      </el-table-column>
      <el-table-column label="操作" width="200" fixed="right">
        <template #default="{ row }">
          <el-button size="small" link type="primary" @click="openDialog(row)">编辑</el-button>
          <el-button size="small" link type="warning" @click="handleResetPassword(row.id)">重置密码</el-button>
          <el-popconfirm title="确定删除？" @confirm="handleDelete(row.id)">
            <template #reference><el-button size="small" link type="danger">删除</el-button></template>
          </el-popconfirm>
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
          <el-select v-model="form.provinceIds" multiple style="width: 100%">
            <el-option v-for="p in provinces" :key="p.id" :label="p.name" :value="p.id" />
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
import { ref, reactive, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { getUsers, createUser, updateUser, toggleUserEnabled, resetPassword, deleteUser } from '../../api/user';
import { getProvinces } from '../../api/province';

const loading = ref(false);
const list = ref<any[]>([]);
const provinces = ref<any[]>([]);
const dialogVisible = ref(false);
const editing = ref<any>(null);
const form = reactive<any>({ username: '', password: '', name: '', phone: '', role: 'province_admin', provinceIds: [] });

async function fetchData() {
  loading.value = true;
  try {
    list.value = await getUsers() as unknown as any[];
  } finally {
    loading.value = false;
  }
}

function openDialog(row?: any) {
  editing.value = row || null;
  if (row) {
    Object.assign(form, { ...row, provinceIds: row.provinces?.map((p: any) => p.id) || [] });
  } else {
    Object.assign(form, { username: '', password: '', name: '', phone: '', role: 'province_admin', provinceIds: [] });
  }
  dialogVisible.value = true;
}

async function handleSave() {
  if (editing.value) {
    const { password, ...data } = form;
    await updateUser(editing.value.id, data);
  } else {
    await createUser(form);
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

function formatDate(d: string) {
  return new Date(d).toLocaleString('zh-CN');
}

onMounted(async () => {
  provinces.value = await getProvinces() as unknown as any[];
  fetchData();
});
</script>
