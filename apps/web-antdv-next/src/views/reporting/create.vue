<script lang="ts" setup>
import { computed, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';

import { Page } from '@vben/common-ui';

import { Button, Card, Form, FormItem, Input, InputNumber, Space, message } from 'antdv-next';

import { createReportJobApi, type CreateReportJobData } from '#/api/reporting';

const router = useRouter();
const formRef = ref();
const submitting = ref(false);

const createDefaultProjectId = () => `REP-${new Date().toISOString().slice(0, 10).replaceAll('-', '')}-${Date.now().toString().slice(-6)}`;

const form = reactive<CreateReportJobData>({
  project_type: 'proteomics',
  project_name: '',
  project_id: createDefaultProjectId(),
  client_org: '',
  client_name: '',
  remark: '',
  case_name: 'A',
  n_case: 5,
  control_name: 'B',
  n_control: 5,
});

const projectTypeOptions = [
  { label: '蛋白组学', value: 'proteomics', description: '定量蛋白表达分析', accent: 'blue' },
  { label: '修饰组学', value: 'ptm', description: 'PTM 位点与功能富集', accent: 'cyan' },
  { label: '代谢组学', value: 'metabolism', description: '代谢物差异与通路分析', accent: 'amber' },
  { label: '转录组学', value: 'rnaseq', description: 'RNA-seq 表达与差异分析', accent: 'emerald' },
] as const;

const ensureReportDetailRoute = () => {
  if (!router.hasRoute('MockReportDetail')) {
    router.addRoute('Root', {
      name: 'MockReportDetail',
      path: 'mock-report/:id/view',
      component: () => import('./detail.vue'),
      meta: {
        title: '查看报告',
        hideInMenu: true,
      },
    });
  }
};

const selectedProjectType = computed(
  () => projectTypeOptions.find((item) => item.value === form.project_type) ?? projectTypeOptions[0],
);

const totalSamples = computed(() => Number(form.n_case || 0) + Number(form.n_control || 0));

const rules: Record<string, any[]> = {
  project_name: [{ required: true, message: '请输入项目名称', trigger: 'blur' }],
  project_id: [{ required: true, message: '请输入项目编号', trigger: 'blur' }],
  client_org: [{ required: true, message: '请输入客户单位', trigger: 'blur' }],
  client_name: [{ required: true, message: '请输入联系人', trigger: 'blur' }],
  case_name: [{ required: true, message: '请输入实验组名称', trigger: 'blur' }],
  control_name: [{ required: true, message: '请输入对照组名称', trigger: 'blur' }],
  n_case: [{ required: true, type: 'number', min: 1, message: '实验组样本数必须大于 0', trigger: 'change' }],
  n_control: [{ required: true, type: 'number', min: 1, message: '对照组样本数必须大于 0', trigger: 'change' }],
};

const resetForm = () => {
  form.project_type = 'proteomics';
  form.project_name = '';
  form.project_id = createDefaultProjectId();
  form.client_org = '';
  form.client_name = '';
  form.remark = '';
  form.case_name = 'A';
  form.n_case = 5;
  form.control_name = 'B';
  form.n_control = 5;
};

const submit = async () => {
  try {
    await formRef.value?.validate();
    if (form.case_name === form.control_name) {
      message.error('实验组和对照组名称不能相同');
      return;
    }
    submitting.value = true;
    const res = await createReportJobApi({ ...form });
    message.success('报告任务已创建');
    ensureReportDetailRoute();
    router.push(`/mock-report/${res.id}/view`);
  } catch (error: any) {
    if (!error?.errorFields) {
      message.error('创建失败');
    }
  } finally {
    submitting.value = false;
  }
};
</script>

<template>
  <Page content-class="report-create-page">
    <div class="report-shell">
      <section class="report-hero">
        <div>
          <p class="eyebrow">REPORT WORKBENCH</p>
          <h1>创建报告任务</h1>
          <p class="hero-copy">填写项目与分组信息后，系统会自动生成可预览、可下载的分析报告。</p>
        </div>
        <div class="hero-flow" aria-label="报告生成流程">
          <span>录入信息</span>
          <i />
          <span>生成报告</span>
          <i />
          <span>预览下载</span>
        </div>
      </section>

      <div class="report-layout">
        <Card :bordered="false" class="form-card">
          <Form ref="formRef" :model="form" :rules="rules" layout="vertical">
            <section class="form-section">
              <div class="section-heading">
                <span class="section-index">01</span>
                <div>
                  <h2>选择项目类型</h2>
                  <p>不同类型会使用对应的 mock 报告模板和绘图逻辑。</p>
                </div>
              </div>
              <FormItem name="project_type" class="mb-0">
                <div class="type-grid">
                  <button
                    v-for="item in projectTypeOptions"
                    :key="item.value"
                    type="button"
                    class="type-card"
                    :class="[`type-card--${item.accent}`, { 'is-active': form.project_type === item.value }]"
                    @click="form.project_type = item.value"
                  >
                    <span class="type-orb" />
                    <strong>{{ item.label }}</strong>
                    <small>{{ item.description }}</small>
                  </button>
                </div>
              </FormItem>
            </section>

            <section class="form-section">
              <div class="section-heading">
                <span class="section-index">02</span>
                <div>
                  <h2>项目基础信息</h2>
                  <p>这些内容会写入报告首页和报告详情。</p>
                </div>
              </div>
              <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
                <FormItem label="项目名称" name="project_name">
                  <Input v-model:value="form.project_name" placeholder="请输入项目名称" size="large" />
                </FormItem>
                <FormItem label="项目编号" name="project_id">
                  <Input v-model:value="form.project_id" placeholder="请输入项目编号" size="large" />
                </FormItem>
                <FormItem label="客户单位" name="client_org">
                  <Input v-model:value="form.client_org" placeholder="请输入客户单位" size="large" />
                </FormItem>
                <FormItem label="联系人" name="client_name">
                  <Input v-model:value="form.client_name" placeholder="请输入联系人" size="large" />
                </FormItem>
              </div>
              <FormItem label="备注" name="remark">
                <textarea v-model="form.remark" rows="4" class="remark-input" placeholder="可填写项目背景、特殊说明或交付要求" />
              </FormItem>
            </section>

            <section class="form-section">
              <div class="section-heading">
                <span class="section-index">03</span>
                <div>
                  <h2>样本分组</h2>
                  <p>样本名会按“分组名_序号”自动生成，并同步替换到报告图表中。</p>
                </div>
              </div>
              <div class="group-panel">
                <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <FormItem label="实验组名称" name="case_name">
                    <Input v-model:value="form.case_name" placeholder="例如 A" size="large" />
                  </FormItem>
                  <FormItem label="实验组样本数" name="n_case">
                    <InputNumber v-model:value="form.n_case" :min="1" class="w-full" size="large" />
                  </FormItem>
                  <FormItem label="对照组名称" name="control_name">
                    <Input v-model:value="form.control_name" placeholder="例如 B" size="large" />
                  </FormItem>
                  <FormItem label="对照组样本数" name="n_control">
                    <InputNumber v-model:value="form.n_control" :min="1" class="w-full" size="large" />
                  </FormItem>
                </div>
              </div>
            </section>
          </Form>
        </Card>

        <aside class="summary-card">
          <div class="summary-glow" />
          <p class="eyebrow">LIVE SUMMARY</p>
          <h2>{{ form.project_name || '待命名项目' }}</h2>
          <p class="summary-id">{{ form.project_id }}</p>

          <div class="summary-list">
            <div>
              <span>项目类型</span>
              <strong>{{ selectedProjectType.label }}</strong>
            </div>
            <div>
              <span>客户单位</span>
              <strong>{{ form.client_org || '未填写' }}</strong>
            </div>
            <div>
              <span>联系人</span>
              <strong>{{ form.client_name || '未填写' }}</strong>
            </div>
            <div>
              <span>样本设计</span>
              <strong>{{ form.case_name || '-' }} ({{ form.n_case || 0 }}) vs {{ form.control_name || '-' }} ({{ form.n_control || 0 }})</strong>
            </div>
          </div>

          <div class="sample-meter">
            <span>总样本数</span>
            <strong>{{ totalSamples }}</strong>
          </div>

          <Space direction="vertical" class="w-full">
            <Button type="primary" size="large" block :loading="submitting" @click="submit">生成报告</Button>
            <Button size="large" block @click="resetForm">重置表单</Button>
          </Space>
        </aside>
      </div>
    </div>
  </Page>
</template>

<style scoped>
:deep(.report-create-page) {
  min-height: calc(100vh - 96px);
  padding: 24px;
  background:
    radial-gradient(circle at 10% 0%, rgb(16 185 129 / 14%), transparent 30%),
    radial-gradient(circle at 92% 12%, rgb(59 130 246 / 14%), transparent 26%),
    linear-gradient(135deg, #f7fbff 0%, #eef4f8 48%, #f8fafc 100%);
}

.report-shell {
  width: min(1280px, 100%);
  margin: 0 auto;
}

.report-hero {
  position: relative;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 24px;
  padding: 30px 34px;
  margin-bottom: 18px;
  overflow: hidden;
  color: #f8fafc;
  background:
    linear-gradient(135deg, rgb(8 47 73 / 96%), rgb(15 118 110 / 92%)),
    linear-gradient(45deg, transparent, rgb(255 255 255 / 12%));
  border: 1px solid rgb(255 255 255 / 24%);
  border-radius: 28px;
  box-shadow: 0 24px 70px rgb(15 23 42 / 18%);
}

.report-hero::after {
  position: absolute;
  top: -72px;
  right: -44px;
  width: 260px;
  height: 260px;
  content: '';
  background: radial-gradient(circle, rgb(255 255 255 / 22%), transparent 64%);
  border-radius: 999px;
}

.eyebrow {
  margin: 0 0 8px;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  opacity: 0.72;
}

.report-hero h1 {
  margin: 0;
  font-size: clamp(28px, 4vw, 44px);
  font-weight: 850;
  letter-spacing: -0.04em;
}

.hero-copy {
  max-width: 560px;
  margin: 12px 0 0;
  font-size: 15px;
  line-height: 1.7;
  color: rgb(226 232 240 / 88%);
}

.hero-flow {
  z-index: 1;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  font-size: 13px;
  font-weight: 700;
  color: #dff7f1;
  white-space: nowrap;
  background: rgb(255 255 255 / 12%);
  border: 1px solid rgb(255 255 255 / 18%);
  border-radius: 999px;
  backdrop-filter: blur(12px);
}

.hero-flow i {
  width: 18px;
  height: 1px;
  background: rgb(255 255 255 / 52%);
}

.report-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 330px;
  gap: 18px;
  align-items: start;
}

.form-card,
.summary-card {
  border: 1px solid rgb(148 163 184 / 22%);
  border-radius: 24px;
  box-shadow: 0 18px 54px rgb(15 23 42 / 8%);
}

:deep(.form-card > .ant-card-body) {
  padding: 4px;
}

.form-section {
  padding: 24px;
  border-bottom: 1px solid #eef2f7;
}

.form-section:last-child {
  border-bottom: 0;
}

.section-heading {
  display: flex;
  gap: 14px;
  margin-bottom: 20px;
}

.section-index {
  display: grid;
  flex: 0 0 42px;
  width: 42px;
  height: 42px;
  place-items: center;
  font-size: 13px;
  font-weight: 900;
  color: #0f766e;
  background: #dff7f1;
  border-radius: 14px;
}

.section-heading h2 {
  margin: 0;
  font-size: 18px;
  font-weight: 800;
  color: #172033;
}

.section-heading p {
  margin: 4px 0 0;
  font-size: 13px;
  line-height: 1.6;
  color: #64748b;
}

.type-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}

.type-card {
  min-height: 118px;
  padding: 16px;
  text-align: left;
  cursor: pointer;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 20px;
  transition: transform 180ms ease, border-color 180ms ease, box-shadow 180ms ease;
}

.type-card:hover,
.type-card:focus-visible,
.type-card.is-active {
  border-color: var(--type-color);
  box-shadow: 0 16px 34px rgb(15 23 42 / 10%);
  transform: translateY(-2px);
}

.type-card:focus-visible {
  outline: 3px solid rgb(20 184 166 / 28%);
  outline-offset: 2px;
}

.type-card strong,
.type-card small {
  display: block;
}

.type-card strong {
  margin-top: 14px;
  font-size: 15px;
  color: #0f172a;
}

.type-card small {
  margin-top: 5px;
  font-size: 12px;
  line-height: 1.45;
  color: #64748b;
}

.type-orb {
  display: block;
  width: 28px;
  height: 28px;
  background: linear-gradient(135deg, var(--type-color), rgb(255 255 255 / 20%));
  border-radius: 12px;
  box-shadow: inset 0 0 0 1px rgb(255 255 255 / 42%);
}

.type-card--blue {
  --type-color: #2563eb;
}

.type-card--cyan {
  --type-color: #0891b2;
}

.type-card--amber {
  --type-color: #d97706;
}

.type-card--emerald {
  --type-color: #059669;
}

.remark-input {
  width: 100%;
  min-height: 116px;
  padding: 12px 14px;
  font-size: 14px;
  line-height: 1.6;
  resize: vertical;
  background: #fff;
  border: 1px solid #d9d9d9;
  border-radius: 10px;
  transition: border-color 180ms ease, box-shadow 180ms ease;
}

.remark-input:focus {
  border-color: #14b8a6;
  outline: none;
  box-shadow: 0 0 0 3px rgb(20 184 166 / 14%);
}

.group-panel {
  padding: 18px;
  background: linear-gradient(135deg, #f8fafc, #eefbf8);
  border: 1px solid #e2e8f0;
  border-radius: 20px;
}

.summary-card {
  position: sticky;
  top: 88px;
  padding: 24px;
  overflow: hidden;
  color: #f8fafc;
  background:
    linear-gradient(160deg, #0f172a 0%, #134e4a 58%, #0f766e 100%);
}

.summary-glow {
  position: absolute;
  top: -68px;
  right: -58px;
  width: 190px;
  height: 190px;
  background: radial-gradient(circle, rgb(45 212 191 / 34%), transparent 68%);
  border-radius: 999px;
}

.summary-card h2 {
  position: relative;
  z-index: 1;
  margin: 0;
  font-size: 24px;
  font-weight: 850;
  line-height: 1.25;
  word-break: break-word;
}

.summary-id {
  position: relative;
  z-index: 1;
  margin: 8px 0 22px;
  font-size: 13px;
  color: rgb(226 232 240 / 76%);
  word-break: break-all;
}

.summary-list {
  position: relative;
  z-index: 1;
  display: grid;
  gap: 10px;
  margin-bottom: 18px;
}

.summary-list div {
  padding: 12px;
  background: rgb(255 255 255 / 10%);
  border: 1px solid rgb(255 255 255 / 12%);
  border-radius: 16px;
}

.summary-list span,
.sample-meter span {
  display: block;
  margin-bottom: 4px;
  font-size: 12px;
  color: rgb(226 232 240 / 68%);
}

.summary-list strong {
  font-size: 14px;
  color: #fff;
  word-break: break-word;
}

.sample-meter {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  margin-bottom: 18px;
  background: rgb(20 184 166 / 18%);
  border: 1px solid rgb(94 234 212 / 32%);
  border-radius: 18px;
}

.sample-meter strong {
  font-size: 34px;
  font-weight: 900;
  line-height: 1;
}

@media (max-width: 1180px) {
  .report-layout {
    grid-template-columns: 1fr;
  }

  .summary-card {
    position: static;
  }
}

@media (max-width: 768px) {
  :deep(.report-create-page) {
    padding: 12px;
  }

  .report-hero {
    align-items: flex-start;
    padding: 24px;
    border-radius: 22px;
    flex-direction: column;
  }

  .hero-flow {
    width: 100%;
    justify-content: center;
    overflow-x: auto;
  }

  .form-section {
    padding: 18px;
  }

  .type-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 480px) {
  .type-grid {
    grid-template-columns: 1fr;
  }
}
</style>
