<template>
  <div>
    <!-- 搜索栏 -->
    <el-card style="margin-bottom: 16px">
      <el-form :inline="true" :model="query" @keyup.enter="handleSearch">
        <el-form-item label="医院名称">
          <el-input v-model="query.name" placeholder="搜索医院名称" clearable />
        </el-form-item>
        <el-form-item label="省份" v-if="authStore.isSuperAdmin()">
          <el-select v-model="query.provinceId" placeholder="全部" clearable @change="onProvinceChange" style="width: 120px">
            <el-option v-for="p in provinces" :key="p.id" :label="p.name" :value="p.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="城市">
          <el-select v-model="query.cityId" placeholder="全部" clearable style="width: 120px">
            <el-option v-for="c in cities" :key="c.id" :label="c.name" :value="c.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="等级">
          <el-select v-model="query.level" placeholder="全部" clearable style="width: 120px">
            <el-option v-for="l in levels" :key="l.value" :label="l.label" :value="l.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="query.isPublished" placeholder="全部" clearable style="width: 100px">
            <el-option label="已发布" :value="true" />
            <el-option label="未发布" :value="false" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSearch">搜索</el-button>
          <el-button @click="handleReset">重置</el-button>
          <el-button type="success" @click="goCreate">新增医院</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 批量操作栏 -->
    <el-card style="margin-bottom: 16px" v-if="selectedIds.length > 0">
      <div style="display: flex; gap: 12px; align-items: center">
        <span>已选 {{ selectedIds.length }} 项</span>
        <el-button size="small" type="success" @click="handleBatchPublish(true)">批量发布</el-button>
        <el-button size="small" type="warning" @click="handleBatchPublish(false)">批量隐藏</el-button>
        <el-button size="small" type="danger" @click="handleBatchDelete">批量删除</el-button>
      </div>
    </el-card>

    <!-- 表格 -->
    <el-card>
      <el-table
        :data="tableData"
        v-loading="loading"
        @selection-change="handleSelectionChange"
        style="width: 100%"
      >
        <el-table-column type="selection" width="50" />
        <el-table-column prop="name" label="医院名称" min-width="200" show-overflow-tooltip />
        <el-table-column prop="province.name" label="省份" width="80" />
        <el-table-column prop="city.name" label="城市" width="80" />
        <el-table-column prop="level" label="等级" width="80" />
        <el-table-column label="门诊服务" width="90">
          <template #default="{ row }">{{ row._count?.clinicServices || 0 }}</template>
        </el-table-column>
        <el-table-column label="医生" width="70">
          <template #default="{ row }">{{ row._count?.doctors || 0 }}</template>
        </el-table-column>
        <el-table-column label="状态" width="80">
          <template #default="{ row }">
            <el-switch
              :model-value="row.isPublished"
              @change="(val: boolean) => togglePublish(row, val)"
            />
          </template>
        </el-table-column>
        <el-table-column prop="updatedAt" label="更新时间" width="160">
          <template #default="{ row }">{{ formatDate(row.updatedAt) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="180" fixed="right">
          <template #default="{ row }">
            <el-button size="small" link @click="goDetail(row.id)">详情</el-button>
            <el-button size="small" link type="primary" @click="goEdit(row.id)">编辑</el-button>
            <el-popconfirm title="确定删除？" @confirm="handleDelete(row.id)">
              <template #reference>
                <el-button size="small" link type="danger">删除</el-button>
              </template>
            </el-popconfirm>
          </template>
        </el-table-column>
      </el-table>

      <el-pagination
        v-model:current-page="query.page"
        v-model:page-size="query.pageSize"
        :total="total"
        :page-sizes="[10, 20, 50]"
        layout="total, sizes, prev, pager, next"
        style="margin-top: 16px; justify-content: flex-end"
        @size-change="fetchData"
        @current-change="fetchData"
      />
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { useAuthStore } from '../../stores/auth';
import { getHospitals, deleteHospital, batchPublish, batchDelete, updateHospital } from '../../api/hospital';
import { getProvinces } from '../../api/province';
import { getCities } from '../../api/city';
import { getDictItems } from '../../api/dict';

const router = useRouter();
const authStore = useAuthStore();

const loading = ref(false);
const tableData = ref<any[]>([]);
const total = ref(0);
const selectedIds = ref<number[]>([]);

const provinces = ref<any[]>([]);
const cities = ref<any[]>([]);
const levels = ref<any[]>([]);

const query = reactive({
  page: 1,
  pageSize: 20,
  name: '',
  provinceId: undefined as number | undefined,
  cityId: undefined as number | undefined,
  level: '',
  isPublished: undefined as boolean | undefined,
});

async function fetchData() {
  loading.value = true;
  try {
    const data: any = await getHospitals(query);
    tableData.value = data.list;
    total.value = data.total;
  } finally {
    loading.value = false;
  }
}

async function loadProvinces() {
  provinces.value = await getProvinces() as unknown as any[];
  // 省管理员默认选自己的省份
  if (!authStore.isSuperAdmin() && authStore.getProvinceIds().length > 0) {
    query.provinceId = authStore.getProvinceIds()[0];
    await onProvinceChange();
  }
}

async function onProvinceChange() {
  query.cityId = undefined;
  if (query.provinceId) {
    cities.value = await getCities(query.provinceId) as unknown as any[];
  } else {
    cities.value = [];
  }
}

function handleSearch() {
  query.page = 1;
  fetchData();
}

function handleReset() {
  query.name = '';
  query.cityId = undefined;
  query.level = '';
  query.isPublished = undefined;
  if (authStore.isSuperAdmin()) query.provinceId = undefined;
  handleSearch();
}

function handleSelectionChange(rows: any[]) {
  selectedIds.value = rows.map((r) => r.id);
}

async function togglePublish(row: any, val: boolean) {
  try {
    await updateHospital(row.id, { isPublished: val });
    row.isPublished = val;
    ElMessage.success(val ? '已发布' : '已隐藏');
  } catch (e) {}
}

async function handleDelete(id: number) {
  await deleteHospital(id);
  ElMessage.success('删除成功');
  fetchData();
}

async function handleBatchPublish(isPublished: boolean) {
  await batchPublish(selectedIds.value, isPublished);
  ElMessage.success('操作成功');
  fetchData();
}

async function handleBatchDelete() {
  await batchDelete(selectedIds.value);
  ElMessage.success('删除成功');
  fetchData();
}

function goCreate() {
  router.push('/hospitals/new');
}
function goDetail(id: number) {
  router.push(`/hospitals/${id}`);
}
function goEdit(id: number) {
  router.push(`/hospitals/${id}?edit=1`);
}

function formatDate(d: string) {
  return new Date(d).toLocaleString('zh-CN');
}

onMounted(async () => {
  await loadProvinces();
  levels.value = await getDictItems('hospital_level') as unknown as any[];
  fetchData();
});
</script>
