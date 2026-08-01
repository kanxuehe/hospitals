<template>
  <el-card>
    <!-- 操作栏 -->
    <div class="toolbar">
      <el-select v-model="selectedProvince" placeholder="选择省份" @change="fetchData" style="width: 150px">
        <el-option v-for="p in provinces" :key="p.id" :label="p.name" :value="p.id" />
      </el-select>
      <el-button type="primary" @click="openDialog()" :disabled="!selectedProvince">新增城市</el-button>
    </div>
    <el-table :data="list" v-loading="loading" border>
      <el-table-column prop="code" label="编码" width="100" />
      <el-table-column prop="name" label="城市名称" />
      <el-table-column label="医院数" width="80">
        <template #default="{ row }">{{ row._count?.hospitals || 0 }}</template>
      </el-table-column>
      <el-table-column prop="sortOrder" label="排序" width="80" />
      <el-table-column label="状态" width="80">
        <template #default="{ row }">
          <el-tag :type="row.isEnabled ? 'success' : 'info'">{{ row.isEnabled ? '启用' : '禁用' }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="70">
        <template #default="{ row }">
          <el-dropdown trigger="click" @command="(cmd: string) => handleAction(cmd, row)">
            <el-button size="small" link>更多<el-icon style="margin-left: 2px"><ArrowDown /></el-icon></el-button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="edit">编辑</el-dropdown-item>
                <el-dropdown-item command="delete" divided>删除</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog v-model="dialogVisible" :title="editing ? '编辑城市' : '新增城市'" width="400px">
      <el-form :model="form" label-width="80px">
        <el-form-item label="编码"><el-input v-model="form.code" placeholder="6位数字，如210100" /></el-form-item>
        <el-form-item label="名称"><el-input v-model="form.name" /></el-form-item>
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
import { ElMessage, ElMessageBox } from 'element-plus';
import { ArrowDown } from '@element-plus/icons-vue';
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
const form = reactive({ code: '', name: '', sortOrder: 0, isEnabled: true, provinceId: 0 });

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
    Object.assign(form, { code: '', name: '', sortOrder: 0, isEnabled: true, provinceId: selectedProvince.value });
  }
  dialogVisible.value = true;
}

async function handleSave() {
  const payload = { code: form.code, name: form.name, sortOrder: form.sortOrder, isEnabled: form.isEnabled, provinceId: form.provinceId };
  if (editing.value) {
    await request.put(`/admin/cities/${editing.value.id}`, payload);
  } else {
    await request.post('/admin/cities', payload);
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

async function handleAction(cmd: string, row: any) {
  if (cmd === 'edit') openDialog(row);
  else if (cmd === 'delete') {
    await ElMessageBox.confirm('确定删除？', '提示', { type: 'warning' });
    handleDelete(row.id);
  }
}

onMounted(async () => {
  provinces.value = await getProvinces() as unknown as any[];
  if (!authStore.isSuperAdmin() && authStore.getProvinceIds().length > 0) {
    selectedProvince.value = authStore.getProvinceIds()[0];
  } else if (provinces.value.length > 0) {
    selectedProvince.value = provinces.value[0].id;
  }
  if (selectedProvince.value) {
    fetchData();
  }
});
</script>
