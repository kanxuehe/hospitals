<template>
  <div>
    <!-- 搜索栏 -->
    <el-card style="margin-bottom: 16px">
      <el-form class="search-form" :model="query" @keyup.enter="handleSearch">
        <el-form-item label="医生姓名">
          <el-input v-model="query.name" placeholder="搜索医生姓名" clearable />
        </el-form-item>
        <el-form-item label="医院">
          <el-select v-model="query.hospitalId" placeholder="全部" clearable filterable>
            <el-option v-for="h in hospitals" :key="h.id" :label="h.name" :value="h.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="职称">
          <el-select v-model="query.title" placeholder="全部" clearable>
            <el-option v-for="t in titles" :key="t.value" :label="t.label" :value="t.value" />
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
        <el-button type="primary" @click="openDialog()">新增医生</el-button>
      </div>
      <el-table :data="tableData" v-loading="loading" style="width: 100%">
        <el-table-column prop="name" label="姓名" width="100" />
        <el-table-column prop="title" label="职称" width="100" />
        <el-table-column prop="hospital.name" label="所属医院" min-width="160" show-overflow-tooltip />
        <el-table-column prop="specialty" label="擅长领域" min-width="160" show-overflow-tooltip />
        <el-table-column prop="sortOrder" label="排序" width="70" />
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
        <el-table-column label="操作" width="70" fixed="right">
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

    <!-- 新增/编辑对话框 -->
    <el-dialog v-model="dialogVisible" :title="editing ? '编辑医生' : '新增医生'" width="500px">
      <el-form :model="form" label-width="100px">
        <el-form-item label="所属医院">
          <el-select v-model="form.hospitalId" style="width: 100%" placeholder="请选择医院">
            <el-option v-for="h in hospitals" :key="h.id" :label="h.name" :value="h.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="姓名"><el-input v-model="form.name" /></el-form-item>
        <el-form-item label="职称"><el-input v-model="form.title" /></el-form-item>
        <el-form-item label="擅长领域"><el-input v-model="form.specialty" type="textarea" :rows="2" placeholder="可选" /></el-form-item>
        <el-form-item label="简介"><el-input v-model="form.intro" type="textarea" :rows="3" placeholder="可选" /></el-form-item>
        <el-form-item label="排序"><el-input-number v-model="form.sortOrder" :min="0" /></el-form-item>
        <el-form-item label="发布"><el-switch v-model="form.isPublished" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSave">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { ArrowDown } from '@element-plus/icons-vue';
import { getDoctors, createDoctor, updateDoctor, deleteDoctor } from '../../api/doctor';
import { getDictItems } from '../../api/dict';
import request from '../../api/request';

const loading = ref(false);
const tableData = ref<any[]>([]);
const total = ref(0);

const hospitals = ref<any[]>([]);
const titles = ref<any[]>([]);

const dialogVisible = ref(false);
const editing = ref<any>(null);
const form = reactive<any>({
  hospitalId: undefined,
  name: '',
  title: '',
  specialty: '',
  intro: '',
  sortOrder: 0,
  isPublished: true,
});

const query = reactive({
  page: 1,
  pageSize: 10,
  name: '',
  hospitalId: undefined as number | undefined,
  title: '',
});

async function fetchData() {
  loading.value = true;
  try {
    const params: any = {
      page: query.page,
      pageSize: query.pageSize,
    };
    if (query.name) params.name = query.name;
    if (query.hospitalId) params.hospitalId = query.hospitalId;
    if (query.title) params.title = query.title;
    const data: any = await getDoctors(params);
    tableData.value = data.list;
    total.value = data.total;
  } finally {
    loading.value = false;
  }
}

async function loadHospitals() {
  const data: any = await request.get('/admin/hospitals', { params: { pageSize: 1000 } });
  hospitals.value = data.list || data;
}

async function loadTitles() {
  titles.value = await getDictItems('doctor_title') as unknown as any[];
}

function handleSearch() {
  query.page = 1;
  fetchData();
}

function handleReset() {
  query.name = '';
  query.hospitalId = undefined;
  query.title = '';
  handleSearch();
}

async function togglePublish(row: any, val: boolean) {
  try {
    await updateDoctor(row.id, { isPublished: val });
    row.isPublished = val;
    ElMessage.success(val ? '已发布' : '已隐藏');
  } catch (e) {}
}

function openDialog(row?: any) {
  editing.value = row || null;
  if (row) {
    Object.assign(form, {
      hospitalId: row.hospitalId,
      name: row.name,
      title: row.title,
      specialty: row.specialty || '',
      intro: row.intro || '',
      sortOrder: row.sortOrder,
      isPublished: row.isPublished,
    });
  } else {
    Object.assign(form, {
      hospitalId: undefined,
      name: '',
      title: '',
      specialty: '',
      intro: '',
      sortOrder: 0,
      isPublished: true,
    });
  }
  dialogVisible.value = true;
}

async function handleSave() {
  if (editing.value) {
    await updateDoctor(editing.value.id, form);
  } else {
    await createDoctor(form);
  }
  ElMessage.success('保存成功');
  dialogVisible.value = false;
  fetchData();
}

async function handleDelete(id: number) {
  await deleteDoctor(id);
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

function formatDate(d: string) {
  return new Date(d).toLocaleString('zh-CN');
}

onMounted(async () => {
  await loadHospitals();
  await loadTitles();
  fetchData();
});
</script>
