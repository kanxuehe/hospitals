<template>
  <el-card>
    <el-tabs v-model="activeType">
      <el-tab-pane
        v-for="dt in dictTypes"
        :key="dt.id"
        :label="dt.name"
        :name="dt.code"
      >
        <div style="margin-bottom: 12px">
          <el-button type="success" size="small" @click="openItemDialog(dt.id)">新增选项</el-button>
        </div>
        <el-table :data="dt.items" border size="small">
          <el-table-column prop="label" label="显示文本" />
          <el-table-column prop="value" label="存储值" />
          <el-table-column prop="sortOrder" label="排序" width="80" />
          <el-table-column label="状态" width="80">
            <template #default="{ row }">
              <el-tag :type="row.isEnabled ? 'success' : 'info'" size="small">{{ row.isEnabled ? '启用' : '禁用' }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="120">
            <template #default="{ row }">
              <el-button size="small" link type="primary" @click="openItemDialog(dt.id, row)">编辑</el-button>
              <el-popconfirm title="确定删除？" @confirm="handleDeleteItem(row.id)">
                <template #reference><el-button size="small" link type="danger">删除</el-button></template>
              </el-popconfirm>
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>
    </el-tabs>

    <el-dialog v-model="itemDialogVisible" :title="editingItem ? '编辑选项' : '新增选项'" width="400px">
      <el-form :model="itemForm" label-width="80px">
        <el-form-item label="显示文本"><el-input v-model="itemForm.label" /></el-form-item>
        <el-form-item label="存储值"><el-input v-model="itemForm.value" /></el-form-item>
        <el-form-item label="排序"><el-input-number v-model="itemForm.sortOrder" :min="0" /></el-form-item>
        <el-form-item label="启用"><el-switch v-model="itemForm.isEnabled" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="itemDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveItem">确定</el-button>
      </template>
    </el-dialog>
  </el-card>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import request from '../../api/request';

const dictTypes = ref<any[]>([]);
const activeType = ref('');
const itemDialogVisible = ref(false);
const editingItem = ref<any>(null);
const itemForm = reactive({ label: '', value: '', sortOrder: 0, isEnabled: true, dictTypeId: 0 });

async function fetchData() {
  dictTypes.value = await request.get('/admin/dict/types') as unknown as any[];
  if (dictTypes.value.length > 0 && !activeType.value) {
    activeType.value = dictTypes.value[0].code;
  }
}

function openItemDialog(dictTypeId: number, row?: any) {
  editingItem.value = row || null;
  if (row) {
    Object.assign(itemForm, row);
  } else {
    Object.assign(itemForm, { label: '', value: '', sortOrder: 0, isEnabled: true, dictTypeId });
  }
  itemDialogVisible.value = true;
}

async function saveItem() {
  if (editingItem.value) {
    await request.put(`/admin/dict/items/${editingItem.value.id}`, itemForm);
  } else {
    await request.post('/admin/dict/items', itemForm);
  }
  ElMessage.success('保存成功');
  itemDialogVisible.value = false;
  fetchData();
}

async function handleDeleteItem(id: number) {
  await request.delete(`/admin/dict/items/${id}`);
  ElMessage.success('删除成功');
  fetchData();
}

onMounted(fetchData);
</script>
