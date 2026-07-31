<template>
  <div class="phone-editor">
    <el-table :data="phones" border size="small">
      <el-table-column label="电话名称" width="140">
        <template #default="{ row }">
          <el-select v-model="row.phoneName" size="small" filterable allow-create>
            <el-option v-for="t in phoneTypes" :key="t.value" :label="t.label" :value="t.value" />
          </el-select>
        </template>
      </el-table-column>
      <el-table-column label="电话号码" width="160">
        <template #default="{ row }">
          <el-input v-model="row.phoneNumber" size="small" />
        </template>
      </el-table-column>
      <el-table-column label="联系人" width="100">
        <template #default="{ row }">
          <el-input v-model="row.contactPerson" size="small" />
        </template>
      </el-table-column>
      <el-table-column label="备注">
        <template #default="{ row }">
          <el-input v-model="row.remark" size="small" />
        </template>
      </el-table-column>
      <el-table-column label="操作" width="80">
        <template #default="{ row, $index }">
          <el-button size="small" link type="danger" @click="handleDelete($index, row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>
    <el-button size="small" type="primary" plain style="margin-top: 8px" @click="handleAdd">
      + 添加电话
    </el-button>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { createPhone, updatePhone, deletePhone } from '../api/clinic-service';
import { getDictItems } from '../api/dict';

const props = defineProps<{ clinicServiceId: number; initialPhones: any[] }>();

const phones = ref<any[]>([]);
const phoneTypes = ref<any[]>([]);

onMounted(async () => {
  phoneTypes.value = await getDictItems('phone_type') as unknown as any[];
  phones.value = (props.initialPhones || []).map((p) => ({ ...p, isNew: false }));
});

function handleAdd() {
  phones.value.push({
    phoneName: '咨询电话',
    phoneNumber: '',
    contactPerson: '',
    remark: '',
    sortOrder: phones.value.length,
    isNew: true,
  });
}

async function handleDelete(index: number, row: any) {
  await ElMessageBox.confirm('确定删除此电话？', '提示', { type: 'warning' });
  if (!row.isNew && row.id) {
    await deletePhone(row.id);
  }
  phones.value.splice(index, 1);
  ElMessage.success('已删除');
}

defineExpose({
  async save() {
    for (const phone of phones.value) {
      if (phone.isNew) {
        await createPhone(props.clinicServiceId, phone);
      } else if (phone.id) {
        await updatePhone(phone.id, phone);
      }
    }
  },
});
</script>
