<template>
  <div class="dashboard">
    <el-row :gutter="20">
      <el-col :xs="12" :sm="6">
        <el-card class="stat-card">
          <div class="stat-icon" style="background: #409eff">
            <el-icon size="28"><OfficeBuilding /></el-icon>
          </div>
          <div class="stat-info">
            <div class="stat-value">{{ stats.hospitals?.total || 0 }}</div>
            <div class="stat-label">医院总数</div>
          </div>
        </el-card>
      </el-col>
      <el-col :xs="12" :sm="6">
        <el-card class="stat-card">
          <div class="stat-icon" style="background: #67c23a">
            <el-icon size="28"><Check /></el-icon>
          </div>
          <div class="stat-info">
            <div class="stat-value">{{ stats.hospitals?.published || 0 }}</div>
            <div class="stat-label">已发布</div>
          </div>
        </el-card>
      </el-col>
      <el-col :xs="12" :sm="6">
        <el-card class="stat-card">
          <div class="stat-icon" style="background: #e6a23c">
            <el-icon size="28"><User /></el-icon>
          </div>
          <div class="stat-info">
            <div class="stat-value">{{ stats.doctors?.total || 0 }}</div>
            <div class="stat-label">医生总数</div>
          </div>
        </el-card>
      </el-col>
      <el-col :xs="12" :sm="6">
        <el-card class="stat-card">
          <div class="stat-icon" style="background: #f56c6c">
            <el-icon size="28"><Clock /></el-icon>
          </div>
          <div class="stat-info">
            <div class="stat-value">{{ stats.recentUpdates || 0 }}</div>
            <div class="stat-label">本月更新</div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-card style="margin-top: 20px">
      <template #header>门诊服务概览</template>
      <el-descriptions :column="3" border>
        <el-descriptions-item label="门诊服务总数">{{ stats.clinicServices || 0 }}</el-descriptions-item>
        <el-descriptions-item label="已发布医生">{{ stats.doctors?.published || 0 }}</el-descriptions-item>
        <el-descriptions-item label="未发布医院">{{ stats.hospitals?.unpublished || 0 }}</el-descriptions-item>
      </el-descriptions>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { getStats } from '../../api/dashboard';

const stats = ref<any>({});

onMounted(async () => {
  stats.value = await getStats();
});
</script>

<style scoped>
.stat-card {
  display: flex;
  align-items: center;
}
.stat-card :deep(.el-card__body) {
  display: flex;
  align-items: center;
  gap: 16px;
  width: 100%;
  padding: 20px;
}
.stat-icon {
  width: 56px;
  height: 56px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  flex-shrink: 0;
}
.stat-value {
  font-size: 28px;
  font-weight: bold;
}
.stat-label {
  font-size: 14px;
  color: #909399;
}
</style>
