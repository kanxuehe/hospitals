<template>
  <div class="schedule-editor">
    <el-table :data="schedules" border size="small">
      <el-table-column label="星期" width="80" prop="dayLabel" />
      <el-table-column label="上午" width="80" align="center">
        <template #default="{ row }">
          <el-checkbox v-model="row.hasMorning" />
        </template>
      </el-table-column>
      <el-table-column label="下午" width="80" align="center">
        <template #default="{ row }">
          <el-checkbox v-model="row.hasAfternoon" />
        </template>
      </el-table-column>
      <el-table-column label="备注">
        <template #default="{ row }">
          <el-input v-model="row.remark" placeholder="如：需预约" size="small" />
        </template>
      </el-table-column>
    </el-table>
    <el-button type="primary" size="small" plain style="margin-top: 8px" @click="handleSave" :loading="saving">
      保存门诊时间
    </el-button>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import { saveSchedule } from '../api/clinic-service';

const props = defineProps<{ clinicServiceId: number; initialSchedules: any[] }>();

const dayLabels = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
const saving = ref(false);

const schedules = ref(
  Array.from({ length: 7 }, (_, i) => ({
    dayOfWeek: i + 1,
    dayLabel: dayLabels[i],
    hasMorning: false,
    hasAfternoon: false,
    hasEvening: false,
    remark: '',
  })),
);

onMounted(() => {
  if (props.initialSchedules && props.initialSchedules.length > 0) {
    props.initialSchedules.forEach((s) => {
      const idx = s.dayOfWeek - 1;
      if (idx >= 0 && idx < 7) {
        schedules.value[idx] = {
          ...schedules.value[idx],
          ...s,
          dayLabel: dayLabels[idx],
        };
      }
    });
  }
});

async function handleSave() {
  saving.value = true;
  try {
    await saveSchedule(
      props.clinicServiceId,
      schedules.value.map(({ dayLabel, ...rest }) => rest),
    );
    ElMessage.success('门诊时间已保存');
  } finally {
    saving.value = false;
  }
}
</script>
