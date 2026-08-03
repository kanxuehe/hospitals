<template>
  <div v-loading="loading">
    <el-page-header
      @back="$router.back()"
      :content="isCreate ? '新增医院' : hospital?.name || '医院详情'"
      style="margin-bottom: 16px"
    />

    <el-tabs v-model="activeTab" v-if="hospital">
      <!-- Tab 1: 基本信息 -->
      <el-tab-pane label="基本信息" name="basic">
        <el-card>
          <el-form :model="form" label-width="100px" style="max-width: 600px">
            <el-form-item label="医院名称">
              <el-input v-model="form.name" />
            </el-form-item>
            <el-form-item label="所属省份">
              <el-select
                v-model="form.provinceId"
                @change="onProvinceChange"
                :disabled="!authStore.isSuperAdmin()"
              >
                <el-option
                  v-for="p in provinces"
                  :key="p.id"
                  :label="p.name"
                  :value="p.id"
                />
              </el-select>
            </el-form-item>
            <el-form-item label="所属城市">
              <el-select v-model="form.cityId">
                <el-option
                  v-for="c in cities"
                  :key="c.id"
                  :label="c.name"
                  :value="c.id"
                />
              </el-select>
            </el-form-item>
            <el-form-item label="医院等级">
              <el-select v-model="form.level">
                <el-option
                  v-for="l in levels"
                  :key="l.value"
                  :label="l.label"
                  :value="l.value"
                />
              </el-select>
            </el-form-item>
            <el-form-item label="医院地址">
              <el-input v-model="form.address" />
            </el-form-item>
            <el-form-item label="简介">
              <el-input v-model="form.intro" type="textarea" :rows="3" />
            </el-form-item>
            <el-form-item label="排序">
              <el-input-number v-model="form.sortOrder" :min="0" />
            </el-form-item>
            <el-form-item label="发布状态">
              <el-switch v-model="form.isPublished" />
            </el-form-item>
            <el-form-item>
              <el-button type="primary" @click="saveBasic" :loading="saving"
                >保存</el-button
              >
            </el-form-item>
          </el-form>
        </el-card>
      </el-tab-pane>

      <!-- Tab 2: 门诊服务 -->
      <el-tab-pane label="门诊服务" name="clinic" v-if="!isCreate">
        <div style="margin-bottom: 12px">
          <el-button type="primary" @click="showClinicDialog = true"
            >新增门诊服务</el-button
          >
        </div>
        <el-collapse v-model="expandedClinics">
          <el-collapse-item
            v-for="cs in hospital.clinicServices"
            :key="cs.id"
            :name="cs.id"
          >
            <template #title>
              <span style="font-weight: bold">{{ cs.clinicType }}</span>
              <el-tag
                size="small"
                style="margin-left: 8px"
                :type="cs.isPublished ? 'success' : 'info'"
              >
                {{ cs.isPublished ? "已发布" : "未发布" }}
              </el-tag>
              <el-popconfirm
                title="确定删除该门诊服务？"
                @confirm="handleDeleteClinic(cs.id)"
              >
                <template #reference>
                  <el-button
                    size="small"
                    link
                    type="danger"
                    style="margin-left: 12px"
                    @click.stop
                    >删除</el-button
                  >
                </template>
              </el-popconfirm>
            </template>

            <div>
              <h4 style="margin-bottom: 12px">门诊时间</h4>
              <ClinicScheduleEditor
                :clinic-service-id="cs.id"
                :initial-schedules="cs.schedules"
              />

              <h4 style="margin: 12px 0">联系电话</h4>
              <PhoneContactEditor
                ref="phoneEditors"
                :clinic-service-id="cs.id"
                :initial-phones="cs.phones"
              />
            </div>
          </el-collapse-item>
        </el-collapse>
      </el-tab-pane>

      <!-- Tab 3: 医生（暂时隐藏） -->
      <el-tab-pane label="医生" name="doctors" v-if="false">
        <div style="margin-bottom: 12px">
          <el-button type="primary" @click="showDoctorDialog = true"
            >新增医生</el-button
          >
        </div>
        <el-table :data="hospital.doctors" border>
          <el-table-column prop="name" label="姓名" width="100" />
          <el-table-column prop="title" label="职称" width="120" />
          <el-table-column
            prop="specialty"
            label="擅长"
            show-overflow-tooltip
          />
          <el-table-column label="发布" width="80">
            <template #default="{ row }">
              <el-switch
                :model-value="row.isPublished"
                @change="(val: boolean) => toggleDoctorPublish(row, val)"
              />
            </template>
          </el-table-column>
          <el-table-column label="操作" width="70">
            <template #default="{ row }">
              <el-dropdown
                trigger="click"
                @command="(cmd: string) => handleDoctorAction(cmd, row)"
              >
                <el-button size="small" link
                  >更多<el-icon style="margin-left: 2px"><ArrowDown /></el-icon
                ></el-button>
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item command="edit">编辑</el-dropdown-item>
                    <el-dropdown-item command="delete" divided
                      >删除</el-dropdown-item
                    >
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>
    </el-tabs>

    <!-- 新增门诊服务弹窗 -->
    <el-dialog v-model="showClinicDialog" title="新增门诊服务" width="400px">
      <el-form :model="clinicForm" label-width="80px">
        <el-form-item label="门诊类型">
          <el-select v-model="clinicForm.clinicType">
            <el-option
              v-for="t in clinicTypes"
              :key="t.value"
              :label="t.label"
              :value="t.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="简介">
          <el-input v-model="clinicForm.intro" type="textarea" :rows="2" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showClinicDialog = false">取消</el-button>
        <el-button type="primary" @click="saveClinic">确定</el-button>
      </template>
    </el-dialog>

    <!-- 新增/编辑医生弹窗 -->
    <el-dialog
      v-model="showDoctorDialog"
      :title="editingDoctor ? '编辑医生' : '新增医生'"
      width="500px"
    >
      <el-form :model="doctorForm" label-width="80px">
        <el-form-item label="姓名"
          ><el-input v-model="doctorForm.name"
        /></el-form-item>
        <el-form-item label="职称"
          ><el-input v-model="doctorForm.title"
        /></el-form-item>
        <el-form-item label="简介"
          ><el-input v-model="doctorForm.intro" type="textarea" :rows="2"
        /></el-form-item>
        <el-form-item label="擅长"
          ><el-input v-model="doctorForm.specialty" type="textarea" :rows="2"
        /></el-form-item>
        <el-form-item label="发布"
          ><el-switch v-model="doctorForm.isPublished"
        /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showDoctorDialog = false">取消</el-button>
        <el-button type="primary" @click="saveDoctor">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { ElMessage, ElMessageBox } from "element-plus";
import { ArrowDown } from "@element-plus/icons-vue";
import { useAuthStore } from "../../stores/auth";
import { useIsMobile } from "../../composables/useIsMobile";
import {
  getHospitalDetail,
  updateHospital,
  createHospital,
} from "../../api/hospital";
import { getProvinces } from "../../api/province";
import { getCities } from "../../api/city";
import { getDictItems } from "../../api/dict";
import {
  createClinicService,
  deleteClinicService,
} from "../../api/clinic-service";
import { createDoctor, updateDoctor, deleteDoctor } from "../../api/doctor";
import ClinicScheduleEditor from "../../components/ClinicScheduleEditor.vue";
import PhoneContactEditor from "../../components/PhoneContactEditor.vue";

const route = useRoute();
const router = useRouter();
const { isMobile } = useIsMobile();
const authStore = useAuthStore();
const isCreate = route.params.id === "new";
const id = isCreate ? 0 : Number(route.params.id);

const loading = ref(true);
const saving = ref(false);
const hospital = ref<any>(null);
const activeTab = ref("basic");

const provinces = ref<any[]>([]);
const cities = ref<any[]>([]);
const levels = ref<any[]>([]);
const clinicTypes = ref<any[]>([]);

const form = reactive<any>({});

const expandedClinics = ref<number[]>([]);

const showClinicDialog = ref(false);
const clinicForm = reactive({
  clinicType: "",
  intro: "",
  sortOrder: 0,
  isPublished: true,
});

const showDoctorDialog = ref(false);
const editingDoctor = ref<any>(null);
const doctorForm = reactive<any>({
  name: "",
  title: "",
  intro: "",
  specialty: "",
  isPublished: true,
  sortOrder: 0,
});

const phoneEditors = ref<any[]>([]);

async function loadData() {
  loading.value = true;
  try {
    provinces.value = (await getProvinces()) as unknown as any[];
    levels.value = (await getDictItems("hospital_level")) as unknown as any[];
    clinicTypes.value = (await getDictItems("clinic_type")) as unknown as any[];

    if (isCreate) {
      // 新增模式：初始化空表单
      const provinceIds = authStore.getProvinceIds();
      const defaultProvinceId = authStore.isSuperAdmin()
        ? provinces.value[0]?.id
        : provinceIds[0];
      Object.assign(form, {
        name: "",
        provinceId: defaultProvinceId,
        cityId: undefined,
        level: "",
        address: "",
        intro: "",
        sortOrder: 0,
        isPublished: false,
      });
      hospital.value = { clinicServices: [], doctors: [] };
      if (defaultProvinceId) {
        const prov = provinces.value.find((p) => p.id === defaultProvinceId);
        if (prov) {
          cities.value = (await getCities(prov.code)) as unknown as any[];
        }
      }
    } else {
      // 编辑模式：加载医院详情
      hospital.value = await getHospitalDetail(id);
      Object.assign(form, hospital.value);
      if (form.provinceId) {
        const prov = provinces.value.find((p) => p.id === form.provinceId);
        if (prov) {
          cities.value = (await getCities(prov.code)) as unknown as any[];
        }
      }
      if (hospital.value.clinicServices?.length > 0) {
        expandedClinics.value = [hospital.value.clinicServices[0].id];
      }
    }
  } finally {
    loading.value = false;
  }
}

async function onProvinceChange() {
  form.cityId = undefined;
  if (form.provinceId) {
    const prov = provinces.value.find((p) => p.id === form.provinceId);
    if (prov) {
      cities.value = (await getCities(prov.code)) as unknown as any[];
    }
  } else {
    cities.value = [];
  }
}

async function saveBasic() {
  const payload = {
    name: form.name,
    provinceId: form.provinceId,
    cityId: form.cityId,
    level: form.level,
    address: form.address,
    mapLng: form.mapLng,
    mapLat: form.mapLat,
    intro: form.intro,
    sortOrder: form.sortOrder,
    isPublished: form.isPublished,
  };
  saving.value = true;
  try {
    if (isCreate) {
      const created = (await createHospital(payload)) as any;
      ElMessage.success("创建成功");
      router.replace(`/hospitals/${created.id}`);
    } else {
      await updateHospital(id, payload);
      ElMessage.success("保存成功");
    }
  } finally {
    saving.value = false;
  }
}

async function saveClinic() {
  await createClinicService({ ...clinicForm, hospitalId: id });
  ElMessage.success("新增成功");
  showClinicDialog.value = false;
  clinicForm.clinicType = "";
  clinicForm.intro = "";
  loadData();
}

async function handleDeleteClinic(csId: number) {
  await deleteClinicService(csId);
  ElMessage.success("删除成功");
  loadData();
}

function editDoctor(doc: any) {
  editingDoctor.value = doc;
  Object.assign(doctorForm, {
    name: doc.name,
    title: doc.title,
    intro: doc.intro || "",
    specialty: doc.specialty || "",
    sortOrder: doc.sortOrder,
    isPublished: doc.isPublished,
  });
  showDoctorDialog.value = true;
}

async function saveDoctor() {
  const payload = {
    name: doctorForm.name,
    title: doctorForm.title,
    intro: doctorForm.intro,
    specialty: doctorForm.specialty,
    sortOrder: doctorForm.sortOrder,
    isPublished: doctorForm.isPublished,
  };
  if (editingDoctor.value) {
    await updateDoctor(editingDoctor.value.id, payload);
  } else {
    await createDoctor({ ...payload, hospitalId: id });
  }
  ElMessage.success("保存成功");
  showDoctorDialog.value = false;
  editingDoctor.value = null;
  doctorForm.name = "";
  doctorForm.title = "";
  doctorForm.intro = "";
  doctorForm.specialty = "";
  doctorForm.isPublished = true;
  loadData();
}

async function handleDeleteDoctor(docId: number) {
  await deleteDoctor(docId);
  ElMessage.success("删除成功");
  loadData();
}

async function handleDoctorAction(cmd: string, row: any) {
  if (cmd === "edit") editDoctor(row);
  else if (cmd === "delete") {
    await ElMessageBox.confirm("确定删除？", "提示", { type: "warning" });
    handleDeleteDoctor(row.id);
  }
}

async function toggleDoctorPublish(row: any, val: boolean) {
  await updateDoctor(row.id, { isPublished: val });
  row.isPublished = val;
}

onMounted(loadData);
</script>

<style scoped>
:deep(.el-collapse-item__header) {
  padding: 0 16px;
}

:deep(.el-collapse-item__content) {
  padding: 16px;
  padding-top: 0;
}
</style>
