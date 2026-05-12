<script lang="ts" setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { Page } from '@vben/common-ui';
import { useTabs } from '@vben/hooks';

import { Alert, Button, Card, Empty, Spin, Tag, message } from 'antdv-next';

import {
  getReportFileUrl,
  getReportHtmlApi,
  getReportJobApi,
  retryReportJobApi,
  type ReportJobItem,
} from '#/api/reporting';

const route = useRoute();
const router = useRouter();
const { setTabTitle } = useTabs();
const loading = ref(true);
const previewLoading = ref(false);
const previewError = ref('');
const previewUrl = ref('');
const retrying = ref(false);
const job = ref<ReportJobItem | null>(null);
let timer: null | ReturnType<typeof setInterval> = null;

const jobId = computed(() => Number(route.params.id));
const reportUrl = computed(
  () => job.value?.report_url || getReportFileUrl(jobId.value),
);
const reportBaseUrl = computed(() => {
  const url = reportUrl.value;
  const index = url.lastIndexOf('/');
  return index >= 0 ? `${url.slice(0, index + 1)}` : url;
});

const statusColorMap: Record<string, string> = {
  pending: 'default',
  running: 'processing',
  completed: 'success',
  failed: 'error',
};

const statusLabelMap: Record<string, string> = {
  pending: '等待中',
  running: '生成中',
  completed: '已完成',
  failed: '失败',
};

const projectTypeLabelMap: Record<string, string> = {
  proteomics: '蛋白组学',
  ptm: '修饰组学',
  metabolism: '代谢组学',
  rnaseq: '转录组学',
};

const stopPolling = () => {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
};

const startPolling = () => {
  stopPolling();
  timer = setInterval(async () => {
    if (job.value?.status === 'completed' || job.value?.status === 'failed') {
      stopPolling();
      return;
    }
    await fetchJob(false);
  }, 5000);
};

const buildPreviewHtml = (html: string) => {
  const baseTag = `<base href="${reportBaseUrl.value}">`;
  if (html.includes('<head>')) {
    return html.replace('<head>', `<head>${baseTag}`);
  }
  return `${baseTag}${html}`;
};

const resetPreview = () => {
  previewError.value = '';
  if (previewUrl.value) {
    URL.revokeObjectURL(previewUrl.value);
    previewUrl.value = '';
  }
};

const loadReportPreview = async () => {
  if (!job.value || job.value.status !== 'completed') {
    resetPreview();
    return;
  }
  resetPreview();
  previewLoading.value = true;
  try {
    const html = await getReportHtmlApi(job.value.id);
    const reportBlob = new Blob([buildPreviewHtml(html)], {
      type: 'text/html;charset=utf-8',
    });
    previewUrl.value = URL.createObjectURL(reportBlob);
  } catch (error: any) {
    previewError.value = error?.message || error?.msg || '报告预览加载失败';
    message.error(previewError.value);
  } finally {
    previewLoading.value = false;
  }
};

const fetchJob = async (showLoading = true) => {
  if (showLoading) loading.value = true;
  try {
    job.value = await getReportJobApi(jobId.value);
    const tabName =
      job.value.project_name || job.value.project_id || String(job.value.id);
    setTabTitle(`查看报告 - ${tabName}`);
    if (job.value.status === 'pending' || job.value.status === 'running') {
      resetPreview();
      startPolling();
    } else {
      stopPolling();
      await loadReportPreview();
    }
  } finally {
    if (showLoading) loading.value = false;
  }
};

const openReport = () => {
  if (!previewUrl.value) {
    message.warning('报告内容尚未加载完成');
    return;
  }
  const reportWindow = window.open(previewUrl.value, '_blank');
  if (!reportWindow) {
    message.warning('浏览器拦截了新窗口，请允许弹窗后重试');
  }
};

const downloadReport = () => {
  if (!previewUrl.value) {
    message.warning('报告内容尚未加载完成');
    return;
  }
  const link = document.createElement('a');
  const projectId = job.value?.project_id || jobId.value;
  link.href = previewUrl.value;
  link.download = `report-${projectId}.html`;
  document.body.append(link);
  link.click();
  link.remove();
};

const retryJob = async () => {
  if (!job.value) return;
  retrying.value = true;
  try {
    await retryReportJobApi(job.value.id);
    message.success('已重新提交报告任务');
    await fetchJob();
  } finally {
    retrying.value = false;
  }
};

const backToList = () => {
  if (window.history.state?.back) {
    router.back();
    return;
  }
  router.replace('/mock-report');
};

onMounted(() => {
  fetchJob();
});

onBeforeUnmount(() => {
  stopPolling();
  resetPreview();
});
</script>

<template>
  <Page content-class="p-4">
    <Spin :spinning="loading">
      <div v-if="job" class="space-y-4">
        <Card :bordered="false">
          <div class="mb-4 flex items-center justify-between">
            <div>
              <div class="text-xl font-semibold">{{ job.project_name }}</div>
              <div class="text-sm text-gray-500">{{ job.project_id }}</div>
            </div>
            <div class="flex items-center gap-2">
              <Tag :color="statusColorMap[job.status]">
                {{ statusLabelMap[job.status] || job.status }}
              </Tag>
              <Button @click="fetchJob()">刷新</Button>
              <Button
                v-if="job.status === 'failed'"
                :loading="retrying"
                @click="retryJob"
              >
                重新生成
              </Button>
              <Button @click="backToList">返回列表</Button>
            </div>
          </div>

          <div class="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div class="rounded border p-3">
              <span class="mr-2 text-gray-500">项目类型</span>
              {{ projectTypeLabelMap[job.project_type] || job.project_type }}
            </div>
            <div class="rounded border p-3">
              <span class="mr-2 text-gray-500">委托单位</span>
              {{ job.client_org }}
            </div>
            <div class="rounded border p-3">
              <span class="mr-2 text-gray-500">委托人</span>
              {{ job.client_name }}
            </div>
            <div class="rounded border p-3">
              <span class="mr-2 text-gray-500">实验组</span>
              {{ job.case_name }} ({{ job.n_case }})
            </div>
            <div class="rounded border p-3">
              <span class="mr-2 text-gray-500">对照组</span>
              {{ job.control_name }} ({{ job.n_control }})
            </div>
            <div class="rounded border p-3">
              <span class="mr-2 text-gray-500">创建时间</span>
              {{ job.created_time }}
            </div>
            <div class="rounded border p-3">
              <span class="mr-2 text-gray-500">完成时间</span>
              {{ job.completed_at || '-' }}
            </div>
            <div class="rounded border p-3 md:col-span-2">
              <span class="mr-2 text-gray-500">备注</span>
              {{ job.remark || '-' }}
            </div>
          </div>
        </Card>

        <Alert
          v-if="job.status === 'running'"
          type="info"
          show-icon
          message="报告正在生成，请稍后刷新或等待自动更新。"
        />
        <Alert
          v-if="job.status === 'pending'"
          type="warning"
          show-icon
          message="报告任务正在等待执行。"
        />
        <Alert
          v-if="job.status === 'failed'"
          type="error"
          show-icon
          :message="job.error_message || '报告生成失败'"
        />

        <Card v-if="job.status === 'completed'" title="报告预览" :bordered="false">
          <div class="mb-3 flex items-center gap-3">
            <Button type="primary" @click="openReport">新窗口打开</Button>
            <Button @click="downloadReport">下载报告</Button>
          </div>
          <Alert
            v-if="previewError"
            class="mb-3"
            type="error"
            show-icon
            :message="previewError"
          />
          <Spin :spinning="previewLoading">
            <iframe :src="previewUrl" class="h-[900px] w-full rounded border" />
          </Spin>
        </Card>
      </div>
      <Empty v-else description="未找到报告任务" />
    </Spin>
  </Page>
</template>
