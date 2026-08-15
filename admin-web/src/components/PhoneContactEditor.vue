<template>
  <div class="phone-editor">
    <el-table :data="phones" border size="small">
      <el-table-column label="联系人" width="100">
        <template #default="{ row }">
          <el-input v-model="row.contactPerson" size="small" />
        </template>
      </el-table-column>
      <el-table-column label="电话号码" width="160">
        <template #default="{ row }">
          <el-input v-model="row.phoneNumber" size="small" />
        </template>
      </el-table-column>
      <el-table-column label="电话类型" width="140">
        <template #default="{ row }">
          <el-select v-model="row.phoneType" size="small" filterable>
            <el-option v-for="t in phoneTypes" :key="t.value" :label="t.label" :value="t.value" />
          </el-select>
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
      <template #append>
        <div style="text-align: center; padding: 8px 0;">
          <el-button size="small" type="primary" link @click="handleAdd">+ 添加电话</el-button>
        </div>
      </template>
    </el-table>
    <div style="margin-top: 8px">
      <el-button size="small" type="primary" plain @click="handleSave" :loading="saving">
        保存联系电话
      </el-button>
    </div>
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
const saving = ref(false);

onMounted(async () => {
  phoneTypes.value = await getDictItems('phone_type') as unknown as any[];
  phones.value = (props.initialPhones || []).map((p) => ({ ...p, isNew: false, changed: false }));
});

function handleAdd() {
  phones.value.push({
    phoneType: 'consultation',
    phoneNumber: '',
    contactPerson: '',
    remark: '',
    sortOrder: phones.value.length,
    isNew: true,
    changed: true,
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

/** 提取 DTO 允许的字段，避免 forbidNonWhitelisted 报错 */
function buildPayload(phone: any) {
  return {
    phoneType: phone.phoneType,
    phoneNumber: phone.phoneNumber,
    contactPerson: phone.contactPerson || '',
    remark: phone.remark || '',
    sortOrder: phone.sortOrder ?? 0,
  };
}

async function handleSave() {
  saving.value = true;
  try {
    for (const phone of phones.value) {
      if (phone.isNew) {
        const created = await createPhone(props.clinicServiceId, buildPayload(phone));
        // 用服务端返回的数据替换本地新增项
        Object.assign(phone, created, { isNew: false, changed: false });
      } else if (phone.id) {
        await updatePhone(phone.id, buildPayload(phone));
        phone.changed = false;
      }
    }
    ElMessage.success('联系电话已保存');
  } finally {
    saving.value = false;
  }
}
</script>
