<template>
  <el-card>
    <div style="margin-bottom: 12px; display: flex; gap: 12px; align-items: center">
      <el-select v-model="selectedProvince" placeholder="选择省份" @change="fetchData" style="width: 150px">
        <el-option v-for="p in provinces" :key="p.id" :label="p.name" :value="p.id" />
      </el-select>
      <el-button type="success" @click="openDialog()" :disabled="!selectedProvince">新增城市</el-button>
    </div>
    <el-table :data="list" v-loading="loading" border>
      <el-table-column prop="name" label="城市名称" />
      <el-table-column prop="pinyin" label="拼音" width="150" />
      <el-table-column label="医院数" width="80">
        <template #default="{ row }">{{ row._count?.hospitals || 0 }}</template>
      </el-table-column>
      <el-table-column prop="sortOrder" label="排序" width="80" />
      <el-table-column label="状态" width="80">
        <template #default="{ row }">
          <el-tag :type="row.isEnabled ? 'success' : 'info'">{{ row.isEnabled ? '启用' : '禁用' }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="120">
        <template #default="{ row }">
          <el-button size="small" link type="primary" @click="openDialog(row)">编辑</el-button>
          <el-popconfirm title="确定删除？" @confirm="handleDelete(row.id)">
            <template #reference><el-button size="small" link type="danger">删除</el-button></template>
          </el-popconfirm>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog v-model="dialogVisible" :title="editing ? '编辑城市' : '新增城市'" width="400px">
      <el-form :model="form" label-width="80px">
        <el-form-item label="名称"><el-input v-model="form.name" /></el-form-item>
        <el-form-item label="拼音"><el-input v-model="form.pinyin" /></el-form-item>
        <el-form-item label="排序"><el-input-number v-model="form.sortOrder" :min="0" /></el-form-item>
        <el-form-item label="启用"><el-switch v-model="form.isEnabled" /></el-form-item>
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
import { ElMessage } from 'element-plus';
import { useAuthStore } from '../../stores/auth';
import request from '../../api/request';
import { getProvinces } from '../../api/province';

const authStore = useAuthStore();
const loading = ref(false);
const list = ref<any[]>([]);
const provinces = ref<any[]>([]);
const selectedProvince = ref<number | undefined>();
const dialogVisible = ref(false);
const editing = ref<any>(null);
const form = reactive({ name: '', pinyin: '', sortOrder: 0, isEnabled: true, provinceId: 0 });

async function fetchData() {
  if (!selectedProvince.value) return;
  loading.value = true;
  try {
    list.value = await request.get('/admin/cities', { params: { provinceId: selectedProvince.value } }) as unknown as any[];
  } finally {
    loading.value = false;
  }
}

function openDialog(row?: any) {
  editing.value = row || null;
  if (row) {
    Object.assign(form, row);
  } else {
    Object.assign(form, { name: '', pinyin: '', sortOrder: 0, isEnabled: true, provinceId: selectedProvince.value });
  }
  dialogVisible.value = true;
}

async function handleSave() {
  if (editing.value) {
    await request.put(`/admin/cities/${editing.value.id}`, form);
  } else {
    await request.post('/admin/cities', form);
  }
  ElMessage.success('保存成功');
  dialogVisible.value = false;
  fetchData();
}

async function handleDelete(id: number) {
  await request.delete(`/admin/cities/${id}`);
  ElMessage.success('删除成功');
  fetchData();
}

onMounted(async () => {
  provinces.value = await getProvinces() as unknown as any[];
  if (!authStore.isSuperAdmin() && authStore.getProvinceIds().length > 0) {
    selectedProvince.value = authStore.getProvinceIds()[0];
    fetchData();
  }
});
</script>
