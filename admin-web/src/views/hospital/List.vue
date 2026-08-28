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
        <el-button v-if="authStore.isSuperAdmin()" type="info" @click="showImportDialog = true">导入Excel</el-button>
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
        <!-- 医生数量列暂时隐藏
        <el-table-column label="医生" width="70">
          <template #default="{ row }">{{ row._count?.doctors || 0 }}</template>
        </el-table-column>
        -->
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

    <!-- 导入 Excel 对话框 -->
    <el-dialog v-model="showImportDialog" title="导入 Excel 数据" width="520px">
      <el-form label-width="100px">
        <el-form-item label="目标省份" required>
          <el-select v-model="importProvinceId" placeholder="请选择省份" filterable style="width: 100%">
            <el-option v-for="p in provinces" :key="p.id" :label="p.name" :value="p.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="Excel 文件" required>
          <el-upload
            ref="importUploadRef"
            :auto-upload="false"
            :limit="1"
            accept=".xlsx,.xls"
            :on-change="handleImportFileChange"
            :on-exceed="() => ElMessage.warning('只能上传一个文件')"
            drag
          >
            <el-icon class="el-icon--upload"><UploadFilled /></el-icon>
            <div class="el-upload__text">将 Excel 文件拖到此处，或<em>点击上传</em></div>
            <template #tip>
              <div class="el-upload__tip">
                仅支持 .xlsx / .xls 格式。列说明：城市、行政区划代码、医院名称、门诊名称、出诊人员，以及 周一上午~周日晚上 共 21 个时段勾选列（填 1 或 ✓ 表示出诊，留空表示不出诊）。
                <el-link type="primary" :underline="false" @click="downloadTemplate">下载 Excel 模板</el-link>
              </div>
            </template>
          </el-upload>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showImportDialog = false">取消</el-button>
        <el-button type="primary" :loading="importLoading" @click="handleImport">确定导入</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import { ArrowDown, UploadFilled } from '@element-plus/icons-vue';
import type { UploadInstance } from 'element-plus';
import { useAuthStore } from '../../stores/auth';
import { getHospitals, deleteHospital, batchPublish, batchDelete, updateHospital, importHospitals, downloadHospitalTemplate } from '../../api/hospital';
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

const showImportDialog = ref(false);
const importProvinceId = ref<number | undefined>(undefined);
const importFile = ref<File | null>(null);
const importLoading = ref(false);
const importUploadRef = ref<UploadInstance>();

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

function handleImportFileChange(uploadFile: any) {
  importFile.value = uploadFile.raw;
}

function downloadTemplate() {
  downloadHospitalTemplate();
}

async function handleImport() {
  if (!importProvinceId.value) {
    ElMessage.warning('请选择目标省份');
    return;
  }
  if (!importFile.value) {
    ElMessage.warning('请选择 Excel 文件');
    return;
  }
  importLoading.value = true;
  try {
    const res: any = await importHospitals(importFile.value, importProvinceId.value);
    ElMessage.success(
      `导入完成：共 ${res.total} 行，新建医院 ${res.hospitalsCreated}，新建门诊 ${res.clinicServicesCreated}`,
    );
    if (res.errors?.length) {
      ElMessageBox.alert(res.errors.join('\n'), '部分行导入失败', { type: 'warning' });
    }
    showImportDialog.value = false;
    importFile.value = null;
    importProvinceId.value = undefined;
    importUploadRef.value?.clearFiles();
    fetchData();
  } catch (e) {
    ElMessage.error('导入失败，请检查文件格式');
  } finally {
    importLoading.value = false;
  }
}

onMounted(async () => {
  await loadProvinces();
  fetchData();
});
</script>
