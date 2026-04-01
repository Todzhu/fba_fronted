<script setup lang="ts">
import { ref } from 'vue';
import { Card, Tabs, TabPane, Button, Input, Upload, Table, Alert } from 'ant-design-vue';
import { FileText, Settings, Sparkles, Upload as UploadIcon, Download, Trash2, ArrowRight } from 'lucide-vue-next';

const activeTab = ref('data');

// Mock Data for Preview Table
const columns = [
  { title: '#', dataIndex: 'index', width: 50 },
  { title: 'value', dataIndex: 'value' },
  { title: 'group', dataIndex: 'group' },
  { title: 'facet', dataIndex: 'facet' },
];

const data = [
  { index: 1, value: 12.1022779, group: 'AML', facet: 'High' },
  { index: 2, value: 12.6138178, group: 'AML', facet: 'Mid' },
  { index: 3, value: 12.5274079, group: 'AML', facet: 'Low' },
  { index: 4, value: 12.6799035, group: 'AML', facet: 'High' },
  { index: 5, value: 12.6483659, group: 'AML', facet: 'Mid' },
  { index: 6, value: 12.12146303, group: 'AML', facet: 'Low' },
  { index: 7, value: 12.82703057, group: 'AML', facet: 'High' },
  { index: 8, value: 12.49423763, group: 'AML', facet: 'Mid' },
];
</script>

<template>
  <div class="flex flex-col h-full gap-4 relative">
    <Card class="flex-grow rounded-xl border-none shadow-sm flex flex-col" :body-style="{ height: '100%', padding: '0' }">
      <Tabs v-model:activeKey="activeTab" class="custom-tabs h-full">
        <!-- DATA TAB -->
        <TabPane key="data">
          <template #tab>
            <span class="flex items-center gap-2 px-2">
              <FileText class="size-4" />
              数据文件
            </span>
          </template>
          
          <div class="p-4 flex flex-col gap-6 h-full overflow-y-auto">
            
            <!-- Actions -->
            <div class="flex gap-2">
              <Button type="primary" size="small" class="bg-[#1677ff] flex items-center gap-1">
                <template #icon><Sparkles class="size-3" /></template>
                加载示例
              </Button>
              <Button size="small" class="flex items-center gap-1">
                <template #icon><Download class="size-3" /></template>
                下载模板
              </Button>
            </div>

            <!-- File Upload -->
            <div>
              <div class="text-sm font-medium text-gray-700 mb-2">数据表 (支持 txt/csv)</div>
              <div class="flex gap-2">
                <Input value="data.txt" readonly class="flex-grow bg-gray-50" />
                <Upload :show-upload-list="false">
                  <Button type="primary" class="bg-[#1677ff] flex items-center gap-1">
                    <template #icon><UploadIcon class="size-3" /></template>
                    导入
                  </Button>
                </Upload>
                <Button class="flex items-center gap-1">
                    <template #icon><Trash2 class="size-3" /></template>
                    清空
                </Button>
              </div>
            </div>

            <!-- Data Preview -->
            <div class="flex-grow flex flex-col min-h-0">
               <div class="flex justify-between items-center mb-2">
                 <div class="text-sm font-medium text-gray-700">数据预览</div>
                 <div class="text-xs text-gray-500">共 27 行数据</div>
               </div>
               
               <div class="border rounded-md overflow-hidden flex-grow relative">
                 <div class="absolute inset-0 overflow-auto">
                    <Table 
                        :columns="columns" 
                        :data-source="data" 
                        size="small" 
                        :pagination="false"
                        :scroll="{ y: 300 }"
                    />
                 </div>
               </div>
            </div>
            
            <!-- Info Box -->
             <div class="bg-[#f0f5ff] border border-[#d6e4ff] rounded-md p-3 flex gap-2 items-start text-xs text-gray-600">
                <Info class="size-4 text-[#2f54eb] shrink-0 mt-0.5" />
                <div class="leading-relaxed">
                    数据格式：第一列为数值(value)，第二列为分组(group)，第三列为分面(facet)。支持 Tab 或逗号分隔。
                </div>
             </div>

          </div>
        </TabPane>

        <!-- SETTINGS TAB -->
        <TabPane key="settings">
          <template #tab>
            <span class="flex items-center gap-2 px-2">
              <Settings class="size-4" />
              参数设置
            </span>
          </template>
          <div class="p-6 text-center text-gray-400">
            参数设置面板 (开发中)
          </div>
        </TabPane>
      </Tabs>
    </Card>

    <!-- Next Step Button -->
    <div class="flex justify-end">
        <Button type="primary" size="large" class="bg-[#1677ff] flex items-center gap-2 px-6 rounded-lg shadow-lg shadow-blue-200">
            下一步
            <ArrowRight class="size-4" />
        </Button>
    </div>
  </div>
</template>

<style scoped>
:deep(.ant-tabs-nav) {
  @apply mb-0 px-4 pt-2 border-b border-gray-100;
}
:deep(.ant-tabs-tab) {
  @apply py-3 px-4 text-gray-500 transition-colors;
}
:deep(.ant-tabs-tab-active) {
  @apply text-[#1677ff] font-medium;
}
:deep(.ant-tabs-ink-bar) {
  @apply bg-[#1677ff];
}
:deep(.ant-table-thead > tr > th) {
  @apply bg-gray-50 text-gray-600 font-medium text-xs;
}
:deep(.ant-table-tbody > tr > td) {
    @apply text-xs text-gray-600;
}
</style>
