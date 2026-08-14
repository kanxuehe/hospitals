<template>
  <div>
    <!-- 搜索栏 -->
    <el-card style="margin-bottom: 16px">
      <el-form class="search-form" :model="query" @keyup.enter="handleSearch">
        <el-form-item label="医院名称">
          <el-input v-model="query.name" placeholder="搜索医院名称" clearable />
        </el-form-item>
        <el-form-item label="省份">
          <el-select v-model="query.provinceCode" placeholder="全部" clearable @change="onProvinceChange">
            <el-option v-for="p in provinces" :key="p.code" :label="p.name" :value="p.code" />
          </el-select>
        </el-form-item>
        <el-form-item label="城市">
          <el-select v-model="query.cityCode" placeholder="全部" clearable filterable>
            <el-option v-for="c in cities" :key="c.code" :label="c.name" :value="c.code" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="query.isPublished" placeholder="全部" clearable>
            <el-option label="已发布" :value="true" />
            <el-option label="未发布" :value="false" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSearch">搜索</el-button>
          <el-button @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 表格 -->
    <el-card>
      <!-- 操作栏 -->
      <div class="toolbar">
        <span v-if="selectedIds.length > 0">已选 {{ selectedIds.length }} 项</span>
        <el-button type="success" :disabled="selectedIds.length === 0" @click="handleBatchPublish(true)">批量发布</el-button>
        <el-button type="warning" :disabled="selectedIds.length === 0" @click="handleBatchPublish(false)">批量隐藏</el-button>
        <el-button type="danger" :disabled="selectedIds.length === 0" @click="handleBatchDelete">批量删除</el-button>
        <el-button type="primary" @click="goCreate">新增医院</el-button>
      </div>
      <el-table
        :data="tableData"
        v-loading="loading"
        @selection-change="handleSelectionChange"
        style="width: 100%"
      >
        <el-table-column type="selection" width="38" />
        <el-table-column prop="name" label="医院名称" min-width="140" show-overflow-tooltip />
        <el-table-column prop="province.name" label="省份" width="80" />
        <el-table-column prop="city.name" label="城市" width="80" />
        <!-- <el-table-column prop="level" label="等级" width="80" />
        <el-table-column label="门诊服务" width="90">
          <template #default="{ row }">{{ row._count?.clinicServices || 0 }}</template>
        </el-table-column> -->
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
        <el-table-column label="操作" width="58" fixed="right">
          <template #default="{ row }">
            <el-dropdown trigger="click" @command="(cmd: string) => handleAction(cmd, row)">
              <el-button size="small" link>更多<el-icon style="margin-left: 2px"><ArrowDown /></el-icon></el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item command="detail">详情</el-dropdown-item>
                  <el-dropdown-item command="edit">编辑</el-dropdown-item>
                  <el-dropdown-item command="delete" divided>删除</el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
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
import { ElMessage, ElMessageBox } from 'element-plus';
import { ArrowDown } from '@element-plus/icons-vue';
import { useAuthStore } from '../../stores/auth';
import { getHospitals, deleteHospital, batchPublish, batchDelete, updateHospital } from '../../api/hospital';
import { getProvinces } from '../../api/province';
import { getCities } from '../../api/city';

const router = useRouter();
const authStore = useAuthStore();

const loading = ref(false);
const tableData = ref<any[]>([]);
const total = ref(0);
const selectedIds = ref<number[]>([]);

const provinces = ref<any[]>([]);
const cities = ref<any[]>([]);

const query = reactive({
  page: 1,
  pageSize: 10,
  name: '',
  provinceCode: undefined as string | undefined,
  cityCode: undefined as string | undefined,
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
}

async function onProvinceChange() {
  query.cityCode = undefined;
  if (query.provinceCode) {
    cities.value = await getCities(query.provinceCode) as unknown as any[];
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
  query.cityCode = undefined;
  query.isPublished = undefined;
  query.provinceCode = undefined;
  cities.value = [];
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

async function handleAction(cmd: string, row: any) {
  if (cmd === 'detail') goDetail(row.id);
  else if (cmd === 'edit') goEdit(row.id);
  else if (cmd === 'delete') {
    await ElMessageBox.confirm('确定删除？', '提示', { type: 'warning' });
    handleDelete(row.id);
  }
}

async function handleBatchPublish(isPublished: boolean) {
  await batchPublish(selectedIds.value, isPublished);
  ElMessage.success('操作成功');
  fetchData();
}

async function handleBatchDelete() {
  await ElMessageBox.confirm(`确定删除选中的 ${selectedIds.value.length} 项？`, '提示', { type: 'warning' });
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
  fetchData();
});
</script>
