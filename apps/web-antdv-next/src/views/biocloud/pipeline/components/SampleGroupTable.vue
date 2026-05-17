<script setup lang="ts">
import { Folder, Loader2, Pencil, Table2 } from 'lucide-vue-next';

export interface SampleRow {
  group: string;
  sample: string;
  sampleName: string;
}

defineProps<{
  loading?: boolean;
  rows: SampleRow[];
}>();

const emit = defineEmits<{
  change: [];
}>();
</script>

<template>
  <div class="!-mt-px overflow-hidden rounded-b-xl rounded-t-none border border-slate-200 bg-white">
    <div v-if="loading" class="flex items-center justify-center py-12">
      <Loader2 class="h-6 w-6 animate-spin text-blue-500" />
      <span class="ml-2 text-sm text-slate-500">正在扫描样本...</span>
    </div>

    <div v-else-if="rows.length > 0">
      <div class="flex items-center justify-between border-b border-slate-100 px-8 py-4">
        <h3 class="flex items-center gap-2 text-base font-bold text-slate-800">
          <Table2 class="h-5 w-5 text-blue-500" />
          样本列表
          <span class="ml-2 text-sm font-normal text-slate-400">
            共 {{ rows.length }} 个样本
          </span>
        </h3>
      </div>

      <div class="px-8 py-4">
        <div class="overflow-hidden rounded-lg border border-slate-200">
          <table class="w-full">
            <thead>
              <tr class="bg-slate-50">
                <th class="px-5 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-600">
                  Sample
                </th>
                <th class="px-5 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-600">
                  <span class="flex items-center gap-1">
                    Sample Name
                    <Pencil class="h-3 w-3 text-slate-400" />
                  </span>
                </th>
                <th class="px-5 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-600">
                  <span class="flex items-center gap-1">
                    Group
                    <Pencil class="h-3 w-3 text-slate-400" />
                  </span>
                </th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              <tr
                v-for="row in rows"
                :key="row.sample"
                class="transition-colors hover:bg-slate-50/50"
              >
                <td class="px-5 py-3">
                  <span class="flex items-center gap-2 text-sm font-medium text-slate-700">
                    <Folder class="h-3.5 w-3.5 text-amber-500" />
                    {{ row.sample }}
                  </span>
                </td>
                <td class="px-5 py-2">
                  <input
                    v-model="row.sampleName"
                    class="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 transition-colors focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    type="text"
                    @input="emit('change')"
                  />
                </td>
                <td class="px-5 py-2">
                  <input
                    v-model="row.group"
                    class="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 transition-colors focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    type="text"
                    @input="emit('change')"
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <div v-else class="flex flex-col items-center justify-center py-12">
      <p class="text-slate-500">所选文件夹下没有找到样本数据</p>
      <p class="mt-1 text-sm text-slate-400">请确认数据目录下包含样本文件夹</p>
    </div>
  </div>
</template>
