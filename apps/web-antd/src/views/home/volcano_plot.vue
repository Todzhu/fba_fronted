<template>
  <div class="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
    <!-- 顶部导航栏 -->
    <header class="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm shadow-sm border-b border-gray-100">
      <div class="max-w-full mx-auto px-2 sm:px-4 lg:px-8">
        <div class="flex items-center justify-between h-16">
          <!-- Logo -->
          <div class="flex items-center flex-shrink-0">
            <div class="flex-shrink-0 flex items-center">
              <div class="w-8 h-8 bg-gradient-to-br from-blue-600 to-cyan-500 rounded-lg flex items-center justify-center">
                <span class="text-white font-bold text-sm">BC</span>
              </div>
              <span class="ml-2 text-lg sm:text-xl font-bold text-gray-900">BioCloud</span>
            </div>
          </div>

          <!-- 工具标题 - 在小屏幕上隐藏 -->
          <div class="hidden md:flex flex-1 justify-center">
            <h1 class="text-lg font-semibold text-gray-900">火山图分析工具</h1>
          </div>

          <!-- 操作按钮 - 响应式调整 -->
          <div class="flex items-center space-x-1 sm:space-x-4">
            <button class="hidden sm:flex items-center text-gray-600 hover:text-blue-600 px-2 sm:px-3 py-2 rounded-md text-xs sm:text-sm font-medium transition-colors">
              <HelpCircle class="h-4 w-4 mr-1" />
              <span class="hidden lg:inline">使用指南</span>
            </button>
            <button class="hidden sm:flex items-center text-gray-600 hover:text-blue-600 px-2 sm:px-3 py-2 rounded-md text-xs sm:text-sm font-medium transition-colors">
              <FileText class="h-4 w-4 mr-1" />
              <span class="hidden lg:inline">预览PDF</span>
            </button>
            <button class="hidden sm:flex items-center text-gray-600 hover:text-blue-600 px-2 sm:px-3 py-2 rounded-md text-xs sm:text-sm font-medium transition-colors">
              <Download class="h-4 w-4 mr-1" />
              <span class="hidden lg:inline">下载</span>
            </button>
            <button class="bg-blue-600 hover:bg-blue-700 text-white px-2 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors">
              <span class="hidden sm:inline">返回首页</span>
              <span class="sm:hidden">首页</span>
            </button>
          </div>
        </div>
      </div>
    </header>

    <!-- 主内容区域 -->
    <main class="pt-16 min-h-screen">
      <!-- 在大屏幕上使用flex布局，小屏幕上使用垂直堆叠 -->
      <div class="flex flex-col lg:flex-row h-screen">
        <!-- 左侧可视化区域 -->
        <div class="flex-1 p-4 lg:p-6 bg-gradient-to-b from-transparent to-white/30">
          <div class="bg-white/90 backdrop-blur-sm rounded-xl shadow-lg h-full min-h-[400px] border border-gray-100">
            <!-- 工具栏 -->
            <div class="p-4 border-b border-gray-200">
              <div class="flex items-center justify-between">
                <div class="flex items-center space-x-4">
                  <button
                    @click="generatePlot"
                    :disabled="isGenerating"
                    class="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center"
                  >
                    <BarChart3 class="h-4 w-4 mr-2" />
                    {{ isGenerating ? '生成中...' : '生成图表' }}
                  </button>
                  <button
                    @click="downloadPlot"
                    class="text-gray-600 hover:text-gray-800 px-4 py-2 rounded-lg border border-gray-300 hover:border-gray-400 text-sm font-medium transition-colors flex items-center"
                  >
                    <Download class="h-4 w-4 mr-2" />
                    导出图片
                  </button>
                </div>
                
                <!-- 参数设置 -->
                <div class="flex items-center space-x-4">
                  <div class="flex items-center space-x-2">
                    <label class="text-sm text-gray-600">P值阈值:</label>
                    <input
                      v-model="plotParams.pValueThreshold"
                      type="number"
                      step="0.01"
                      min="0"
                      max="1"
                      class="w-20 px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div class="flex items-center space-x-2">
                    <label class="text-sm text-gray-600">FC阈值:</label>
                    <input
                      v-model="plotParams.foldChangeThreshold"
                      type="number"
                      step="0.1"
                      min="0"
                      class="w-20 px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>
            </div>

            <!-- 图表区域 -->
            <div class="p-6 h-full">
              <div v-if="!plotGenerated" class="h-full flex items-center justify-center">
                <div class="text-center">
                  <BarChart3 class="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h3 class="text-lg font-medium text-gray-900 mb-2">火山图可视化</h3>
                  <p class="text-gray-600 mb-4">请在右侧输入数据，然后点击"生成图表"按钮</p>
                  <div class="text-sm text-gray-500">
                    <p>支持的数据格式：</p>
                    <p>基因名 | log2FoldChange | pvalue</p>
                  </div>
                </div>
              </div>
              
              <!-- 模拟的火山图 -->
              <div v-else class="h-full">
                <div class="relative h-full bg-gray-50 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center">
                  <div class="text-center">
                    <div class="w-full h-96 bg-white rounded-lg shadow-sm border border-gray-200 mb-4 relative overflow-hidden">
                      <!-- 模拟火山图 -->
                      <div class="absolute inset-0 p-4">
                        <div class="text-center font-semibold text-gray-800 mb-4">Volcano Plot</div>
                        
                        <!-- Y轴标签 -->
                        <div class="absolute left-2 top-1/2 transform -rotate-90 text-sm text-gray-600">
                          -log₁₀(P Value)
                        </div>
                        
                        <!-- X轴标签 -->
                        <div class="absolute bottom-2 left-1/2 transform -translate-x-1/2 text-sm text-gray-600">
                          log₂(Fold Change)
                        </div>
                        
                        <!-- 模拟数据点 -->
                        <div class="relative h-full w-full">
                          <!-- 上调基因 (红色) -->
                          <div class="absolute w-2 h-2 bg-red-500 rounded-full" style="top: 20%; right: 25%;"></div>
                          <div class="absolute w-2 h-2 bg-red-500 rounded-full" style="top: 30%; right: 20%;"></div>
                          <div class="absolute w-2 h-2 bg-red-500 rounded-full" style="top: 25%; right: 30%;"></div>
                          
                          <!-- 下调基因 (蓝色) -->
                          <div class="absolute w-2 h-2 bg-blue-500 rounded-full" style="top: 20%; left: 25%;"></div>
                          <div class="absolute w-2 h-2 bg-blue-500 rounded-full" style="top: 35%; left: 20%;"></div>
                          <div class="absolute w-2 h-2 bg-blue-500 rounded-full" style="top: 28%; left: 30%;"></div>
                          
                          <!-- 非显著基因 (灰色) -->
                          <div class="absolute w-1 h-1 bg-gray-400 rounded-full" style="top: 60%; left: 45%;"></div>
                          <div class="absolute w-1 h-1 bg-gray-400 rounded-full" style="top: 65%; left: 55%;"></div>
                          <div class="absolute w-1 h-1 bg-gray-400 rounded-full" style="top: 70%; left: 40%;"></div>
                          <div class="absolute w-1 h-1 bg-gray-400 rounded-full" style="top: 75%; left: 60%;"></div>
                          
                          <!-- 阈值线 -->
                          <div class="absolute border-l-2 border-dashed border-gray-400" style="left: 30%; top: 10%; bottom: 10%;"></div>
                          <div class="absolute border-l-2 border-dashed border-gray-400" style="right: 30%; top: 10%; bottom: 10%;"></div>
                          <div class="absolute border-t-2 border-dashed border-gray-400" style="top: 50%; left: 10%; right: 10%;"></div>
                        </div>
                      </div>
                    </div>
                    
                    <!-- 图例 -->
                    <div class="flex justify-center space-x-6 text-sm">
                      <div class="flex items-center">
                        <div class="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
                        <span>上调基因 ({{ upRegulatedCount }})</span>
                      </div>
                      <div class="flex items-center">
                        <div class="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
                        <span>下调基因 ({{ downRegulatedCount }})</span>
                      </div>
                      <div class="flex items-center">
                        <div class="w-3 h-3 bg-gray-400 rounded-full mr-2"></div>
                        <span>非显著 ({{ notSignificantCount }})</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 右侧数据输入区域 -->
        <div class="w-full lg:w-1/2 p-4 lg:p-6 bg-gradient-to-b from-transparent to-white/30">
          <div class="bg-white/90 backdrop-blur-sm rounded-xl shadow-lg h-full min-h-[500px] border border-gray-100 flex flex-col">
            <!-- 数据区域标题栏 -->
            <div class="p-3 sm:p-4 border-b border-gray-200">
              <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
                <div class="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
                  <h2 class="text-base sm:text-lg font-semibold text-gray-900">数据表</h2>
                  <div class="flex items-center space-x-2 text-xs sm:text-sm">
                    <span class="text-gray-500">数据类型：</span>
                    <select class="border border-gray-300 rounded px-2 py-1 text-xs">
                      <option>请选择下方表格</option>
                    </select>
                  </div>
                </div>
                
                <div class="flex items-center space-x-1 sm:space-x-2">
                  <button
                    @click="showExampleData"
                    class="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded text-xs font-medium transition-colors"
                  >
                    示例
                  </button>
                  <button
                    @click="downloadExampleData"
                    class="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded text-xs font-medium transition-colors"
                  >
                    下载示例数据表
                  </button>
                  <button
                    @click="importSpreadsheetData"
                    class="bg-blue-600 hover:bg-blue-700 text-white px-2 sm:px-3 py-1.5 rounded text-xs sm:text-sm font-medium transition-colors flex items-center"
                  >
                    <Upload class="h-4 w-4 mr-1" />
                    导入
                  </button>
                  <button
                    @click="clearSpreadsheetData"
                    class="text-red-600 hover:text-red-800 px-2 sm:px-3 py-1.5 rounded border border-red-200 hover:border-red-300 text-xs sm:text-sm font-medium transition-colors"
                  >
                    清空
                  </button>
                  <button
                    @click="toggleEditMode"
                    class="bg-gray-600 hover:bg-gray-700 text-white px-2 sm:px-3 py-1.5 rounded text-xs sm:text-sm font-medium transition-colors"
                  >
                    切换模式
                  </button>
                </div>
              </div>
            </div>

            <!-- x-spreadsheet 容器 -->
            <div class="flex-1 p-2 min-h-0">
              <div class="h-full border border-gray-200 rounded-lg overflow-hidden bg-white">
                <div
                  ref="spreadsheetContainer"
                  class="h-full w-full"
                  style="min-height: 400px;"
                ></div>
              </div>
            </div>

            <!-- 数据统计和提示 -->
            <div class="p-4 border-t border-gray-200 bg-gray-50">
              <div class="grid grid-cols-3 gap-4 text-sm mb-2">
                <div class="text-center">
                  <div class="font-semibold text-gray-900">{{ spreadsheetValidDataCount }}</div>
                  <div class="text-gray-600">有效数据</div>
                </div>
                <div class="text-center">
                  <div class="font-semibold text-red-600">{{ spreadsheetUpRegulatedCount }}</div>
                  <div class="text-gray-600">上调基因</div>
                </div>
                <div class="text-center">
                  <div class="font-semibold text-blue-600">{{ spreadsheetDownRegulatedCount }}</div>
                  <div class="text-gray-600">下调基因</div>
                </div>
              </div>
              <div class="text-xs text-gray-500 bg-yellow-50 p-2 rounded border border-yellow-200">
                <div class="flex items-start">
                  <div class="w-4 h-4 rounded-full bg-yellow-400 flex-shrink-0 mt-0.5 mr-2"></div>
                  <div>
                    <p>对于较大的数据文件，在线编辑可能会导致卡顿，请切换到本地模式；</p>
                    <p>在文件不可编辑直接显示1000行；超过100M的文件请先上传到云空间</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>

    <!-- 文件上传模态框 -->
    <div v-if="showUploadModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <div class="flex items-center justify-between mb-6">
          <h3 class="text-lg font-semibold text-gray-900">导入数据</h3>
          <button
            @click="showUploadModal = false"
            class="text-gray-400 hover:text-gray-600"
          >
            <X class="h-6 w-6" />
          </button>
        </div>
        
        <div class="mb-4">
          <label class="block text-sm font-medium text-gray-700 mb-2">选择文件</label>
          <input
            ref="fileInput"
            type="file"
            accept=".csv,.xlsx,.xls,.txt"
            @change="handleFileUpload"
            class="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
        </div>
        
        <div class="text-sm text-gray-600 mb-4">
          <p>支持的文件格式：CSV, Excel (.xlsx, .xls), TXT</p>
          <p>数据格式：基因名, log2FoldChange, pvalue</p>
        </div>
        
        <div class="flex justify-end space-x-3">
          <button
            @click="showUploadModal = false"
            class="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            取消
          </button>
          <button
            @click="processUploadedFileForSpreadsheet"
            :disabled="!selectedFile"
            class="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white px-6 py-2 rounded-lg transition-colors"
          >
            导入
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'
import {
  HelpCircle, FileText, Download, BarChart3, Upload, Plus, Trash2, X
} from 'lucide-vue-next'

// 导入 x-spreadsheet（需要先安装：npm install x-spreadsheet）
import Spreadsheet from 'x-data-spreadsheet'
import 'x-data-spreadsheet/dist/xspreadsheet.css'

// 模拟x-spreadsheet的功能
// const spreadsheetContainer = ref(null)
// const spreadsheetInstance = ref(null)

// 响应式数据
const isGenerating = ref(false)
const plotGenerated = ref(false)
const showUploadModal = ref(false)
const selectedFile = ref(null)
const spreadsheetLoaded = ref(false)
const enhancedTableData = ref([
  { gene: 'DNASE1L3', log2fc: -2.1, pvalue: 0.001, group: 'down' },
  { gene: 'UB3', log2fc: 2.3, pvalue: 0.002, group: 'up' },
  { gene: 'MUC5AC', log2fc: 1.8, pvalue: 0.01, group: 'up' },
  { gene: 'BCAS1', log2fc: 1.5, pvalue: 0.03, group: 'up' },
  { gene: 'CPA1', log2fc: -1.2, pvalue: 0.04, group: 'down' },
  ...Array(15).fill().map((_, i) => ({ 
    gene: '', 
    log2fc: null, 
    pvalue: null, 
    group: '' 
  }))
])

// 图表参数
const plotParams = ref({
  pValueThreshold: 0.05,
  foldChangeThreshold: 1.0
})

// 表格数据
const tableData = ref([
  { gene: 'DNASE1L3', log2fc: -2.1, pvalue: 0.001 },
  { gene: 'UB3', log2fc: 2.3, pvalue: 0.002 },
  { gene: 'MUC5AC', log2fc: 1.8, pvalue: 0.01 },
  { gene: 'BCAS1', log2fc: 1.5, pvalue: 0.03 },
  { gene: 'CPA1', log2fc: -1.2, pvalue: 0.04 },
  { gene: '', log2fc: null, pvalue: null },
  { gene: '', log2fc: null, pvalue: null },
  { gene: '', log2fc: null, pvalue: null }
])

// 计算属性
const validDataCount = computed(() => {
  return enhancedTableData.value.filter(row => 
    row.gene && row.log2fc !== null && row.pvalue !== null
  ).length
})

const upRegulatedCount = computed(() => {
  return enhancedTableData.value.filter(row => 
    row.gene && 
    (row.group === 'up' || (
      row.log2fc > plotParams.value.foldChangeThreshold && 
      row.pvalue < plotParams.value.pValueThreshold
    ))
  ).length
})

const downRegulatedCount = computed(() => {
  return enhancedTableData.value.filter(row => 
    row.gene && 
    (row.group === 'down' || (
      row.log2fc < -plotParams.value.foldChangeThreshold && 
      row.pvalue < plotParams.value.pValueThreshold
    ))
  ).length
})

const notSignificantCount = computed(() => {
  return validDataCount.value - upRegulatedCount.value - downRegulatedCount.value
})

// 方法
const generatePlot = async () => {
  if (validDataCount.value === 0) {
    alert('请先输入数据')
    return
  }
  
  isGenerating.value = true
  
  // 模拟生成过程
  await new Promise(resolve => setTimeout(resolve, 2000))
  
  plotGenerated.value = true
  isGenerating.value = false
}

const downloadPlot = () => {
  if (!plotGenerated.value) {
    alert('请先生成图表')
    return
  }
  
  // 模拟下载
  const link = document.createElement('a')
  link.download = 'volcano_plot.png'
  link.href = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='
  link.click()
}

const addRow = () => {
  tableData.value.push({ gene: '', log2fc: null, pvalue: null })
}

const removeRow = (index) => {
  if (tableData.value.length > 1) {
    tableData.value.splice(index, 1)
  }
}

const showSampleData = () => {
  enhancedTableData.value = [
    { gene: 'DNASE1L3', log2fc: -2.1, pvalue: 0.001, group: 'down' },
    { gene: 'UB3', log2fc: 2.3, pvalue: 0.002, group: 'up' },
    { gene: 'MUC5AC', log2fc: 1.8, pvalue: 0.01, group: 'up' },
    { gene: 'BCAS1', log2fc: 1.5, pvalue: 0.03, group: 'up' },
    { gene: 'CPA1', log2fc: -1.2, pvalue: 0.04, group: 'down' },
    { gene: 'GENE6', log2fc: 0.5, pvalue: 0.2, group: '' },
    { gene: 'GENE7', log2fc: -0.3, pvalue: 0.15, group: '' },
    { gene: 'GENE8', log2fc: 2.1, pvalue: 0.005, group: '' }
  ]
}

const downloadTemplate = () => {
  const csvContent = "基因名,log2FoldChange,pvalue\nGENE1,1.5,0.01\nGENE2,-1.2,0.02\nGENE3,0.8,0.1"
  const blob = new Blob([csvContent], { type: 'text/csv' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = 'volcano_plot_template.csv'
  link.click()
}

const clearData = () => {
  if (confirm('确定要清空所有数据吗？')) {
    enhancedTableData.value = Array(20).fill().map(() => ({ 
      gene: '', 
      log2fc: null, 
      pvalue: null, 
      group: '' 
    }))
    plotGenerated.value = false
  }
}

const importData = () => {
  showUploadModal.value = true
}

const handleFileUpload = (event) => {
  selectedFile.value = event.target.files[0]
}

const processUploadedFile = () => {
  if (!selectedFile.value) return
  
  const file = selectedFile.value
  const fileType = file.name.split('.').pop().toLowerCase()
  
  if (fileType === 'csv' || fileType === 'txt') {
    importFromExcel(file)
  } else {
    alert('只支持 CSV 和 TXT 文件')
  }
  
  showUploadModal.value = false
  selectedFile.value = null
}

const initSpreadsheet = async () => {
  try {
    await nextTick()
    
    if (!spreadsheetContainer.value) {
      console.error('Spreadsheet container not found')
      return
    }

    const options = {
      mode: 'edit',
      showToolbar: true,
      showGrid: true,
      showContextmenu: true,
      view: {
        height: () => spreadsheetContainer.value.clientHeight - 10,
        width: () => spreadsheetContainer.value.clientWidth - 10,
      },
      row: {
        len: 1000,
        height: 25,
      },
      col: {
        len: 10,
        width: 100,
        indexWidth: 60,
        minWidth: 60,
      },
      style: {
        bgcolor: '#ffffff',
        align: 'left',
        valign: 'middle',
        textwrap: false,
        strike: false,
        underline: false,
        color: '#0a0a0a',
        font: {
          name: 'Arial',
          size: 10,
          bold: false,
          italic: false,
        },
      },
    }

    const s = new Spreadsheet(spreadsheetContainer.value, options)
    spreadsheetInstance.value = s

    // 设置默认数据和表头
    const defaultData = {
      rows: {
        0: { cells: { 0: { text: '基因名' }, 1: { text: 'log2FoldChange' }, 2: { text: 'pvalue' }, 3: { text: '分组' } } },
        1: { cells: { 0: { text: 'DNASE1L3' }, 1: { text: '-2.1' }, 2: { text: '0.001' }, 3: { text: 'down' } } },
        2: { cells: { 0: { text: 'UB3' }, 1: { text: '2.3' }, 2: { text: '0.002' }, 3: { text: 'up' } } },
        3: { cells: { 0: { text: 'MUC5AC' }, 1: { text: '1.8' }, 2: { text: '0.01' }, 3: { text: 'up' } } },
        4: { cells: { 0: { text: 'BCAS1' }, 1: { text: '1.5' }, 2: { text: '0.03' }, 3: { text: 'up' } } },
        5: { cells: { 0: { text: 'CPA1' }, 1: { text: '-1.2' }, 2: { text: '0.04' }, 3: { text: 'down' } } },
      }
    }

    s.loadData(defaultData)
    
    // 监听数据变化
    s.on('cell-edited', (cell, ri, ci) => {
      updateSpreadsheetDataArray()
    })

    updateSpreadsheetDataArray()
    
  } catch (error) {
    console.error('Failed to initialize x-spreadsheet:', error)
  }
}

const addMultipleRows = (count) => {
  for (let i = 0; i < count; i++) {
    enhancedTableData.value.push({ 
      gene: '', 
      log2fc: null, 
      pvalue: null, 
      group: '' 
    })
  }
}

const updateSpreadsheetData = () => {
  // 当数据更新时，同步到spreadsheet
  if (spreadsheetInstance.value) {
    // spreadsheetInstance.value.loadData(convertToSpreadsheetFormat())
  }
}

const exportToExcel = () => {
  // 导出Excel格式
  const data = enhancedTableData.value.filter(row => row.gene)
  const csvContent = [
    ['基因名', 'log2FoldChange', 'P值', '分组'],
    ...data.map(row => [row.gene, row.log2fc, row.pvalue, row.group])
  ].map(row => row.join(',')).join('\n')
  
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = 'volcano_plot_data.csv'
  link.click()
}

const importFromExcel = (file) => {
  const reader = new FileReader()
  reader.onload = (e) => {
    try {
      const text = e.target.result
      const lines = text.split('\n')
      const headers = lines[0].split(',')
      
      const newData = lines.slice(1).map(line => {
        const values = line.split(',')
        return {
          gene: values[0] || '',
          log2fc: parseFloat(values[1]) || null,
          pvalue: parseFloat(values[2]) || null,
          group: values[3] || ''
        }
      }).filter(row => row.gene)
      
      enhancedTableData.value = [
        ...newData,
        ...Array(Math.max(0, 20 - newData.length)).fill().map(() => ({ 
          gene: '', 
          log2fc: null, 
          pvalue: null, 
          group: '' 
        }))
      ]
      
      updateSpreadsheetData()
    } catch (error) {
      console.error('Error parsing file:', error)
      alert('文件格式错误，请检查数据格式')
    }
  }
  reader.readAsText(file)
}

// x-spreadsheet 相关变量
const spreadsheetContainer = ref(null)
const spreadsheetInstance = ref(null)
const spreadsheetData = ref([])
const isEditMode = ref(true)

// 计算属性for spreadsheet
const spreadsheetValidDataCount = computed(() => {
  return spreadsheetData.value.filter(row => 
    row[0] && row[1] !== null && row[2] !== null
  ).length
})

const spreadsheetUpRegulatedCount = computed(() => {
  return spreadsheetData.value.filter(row => 
    row[0] && row[1] > plotParams.value.foldChangeThreshold && row[2] < plotParams.value.pValueThreshold
  ).length
})

const spreadsheetDownRegulatedCount = computed(() => {
  return spreadsheetData.value.filter(row => 
    row[0] && row[1] < -plotParams.value.foldChangeThreshold && row[2] < plotParams.value.pValueThreshold
  ).length
})

// x-spreadsheet 方法
// const initSpreadsheet = async () => {
//   try {
//     await nextTick()
    
//     if (!spreadsheetContainer.value) {
//       console.error('Spreadsheet container not found')
//       return
//     }

//     const options = {
//       mode: 'edit',
//       showToolbar: true,
//       showGrid: true,
//       showContextmenu: true,
//       view: {
//         height: () => spreadsheetContainer.value.clientHeight - 10,
//         width: () => spreadsheetContainer.value.clientWidth - 10,
//       },
//       row: {
//         len: 1000,
//         height: 25,
//       },
//       col: {
//         len: 10,
//         width: 100,
//         indexWidth: 60,
//         minWidth: 60,
//       },
//       style: {
//         bgcolor: '#ffffff',
//         align: 'left',
//         valign: 'middle',
//         textwrap: false,
//         strike: false,
//         underline: false,
//         color: '#0a0a0a',
//         font: {
//           name: 'Arial',
//           size: 10,
//           bold: false,
//           italic: false,
//         },
//       },
//     }

//     const s = new Spreadsheet(spreadsheetContainer.value, options)
//     spreadsheetInstance.value = s

//     // 设置默认数据和表头
//     const defaultData = {
//       rows: {
//         0: { cells: { 0: { text: '基因名' }, 1: { text: 'log2FoldChange' }, 2: { text: 'pvalue' }, 3: { text: '分组' } } },
//         1: { cells: { 0: { text: 'DNASE1L3' }, 1: { text: '-2.1' }, 2: { text: '0.001' }, 3: { text: 'down' } } },
//         2: { cells: { 0: { text: 'UB3' }, 1: { text: '2.3' }, 2: { text: '0.002' }, 3: { text: 'up' } } },
//         3: { cells: { 0: { text: 'MUC5AC' }, 1: { text: '1.8' }, 2: { text: '0.01' }, 3: { text: 'up' } } },
//         4: { cells: { 0: { text: 'BCAS1' }, 1: { text: '1.5' }, 2: { text: '0.03' }, 3: { text: 'up' } } },
//         5: { cells: { 0: { text: 'CPA1' }, 1: { text: '-1.2' }, 2: { text: '0.04' }, 3: { text: 'down' } } },
//       }
//     }

//     s.loadData(defaultData)
    
//     // 监听数据变化
//     s.on('cell-edited', (cell, ri, ci) => {
//       updateSpreadsheetDataArray()
//     })

//     updateSpreadsheetDataArray()
    
//   } catch (error) {
//     console.error('Failed to initialize x-spreadsheet:', error)
//   }
// }

const updateSpreadsheetDataArray = () => {
  if (!spreadsheetInstance.value) return
  
  try {
    const data = spreadsheetInstance.value.getData()
    const rows = []
    
    for (let i = 1; i < 1000; i++) { // 跳过表头
      const row = data.rows[i]
      if (row && row.cells) {
        const gene = row.cells[0]?.text || ''
        const log2fc = parseFloat(row.cells[1]?.text) || null
        const pvalue = parseFloat(row.cells[2]?.text) || null
        
        if (gene || log2fc !== null || pvalue !== null) {
          rows.push([gene, log2fc, pvalue])
        }
      }
    }
    
    spreadsheetData.value = rows
  } catch (error) {
    console.error('Error updating spreadsheet data:', error)
  }
}

const showExampleData = () => {
  if (!spreadsheetInstance.value) return
  
  const exampleData = {
    rows: {
      0: { cells: { 0: { text: '基因名' }, 1: { text: 'log2FoldChange' }, 2: { text: 'pvalue' }, 3: { text: '分组' } } },
      1: { cells: { 0: { text: 'DNASE1L3' }, 1: { text: '-2.1' }, 2: { text: '0.001' }, 3: { text: 'down' } } },
      2: { cells: { 0: { text: 'UB3' }, 1: { text: '2.3' }, 2: { text: '0.002' }, 3: { text: 'up' } } },
      3: { cells: { 0: { text: 'MUC5AC' }, 1: { text: '1.8' }, 2: { text: '0.01' }, 3: { text: 'up' } } },
      4: { cells: { 0: { text: 'BCAS1' }, 1: { text: '1.5' }, 2: { text: '0.03' }, 3: { text: 'up' } } },
      5: { cells: { 0: { text: 'CPA1' }, 1: { text: '-1.2' }, 2: { text: '0.04' }, 3: { text: 'down' } } },
      6: { cells: { 0: { text: 'GENE6' }, 1: { text: '0.5' }, 2: { text: '0.2' }, 3: { text: 'ns' } } },
      7: { cells: { 0: { text: 'GENE7' }, 1: { text: '-0.3' }, 2: { text: '0.15' }, 3: { text: 'ns' } } },
      8: { cells: { 0: { text: 'GENE8' }, 1: { text: '2.1' }, 2: { text: '0.005' }, 3: { text: 'up' } } },
    }
  }
  
  spreadsheetInstance.value.loadData(exampleData)
  updateSpreadsheetDataArray()
}

const downloadExampleData = () => {
  const csvContent = "基因名,log2FoldChange,pvalue,分组\nDNASE1L3,-2.1,0.001,down\nUB3,2.3,0.002,up\nMUC5AC,1.8,0.01,up\nBCAS1,1.5,0.03,up\nCPA1,-1.2,0.04,down\nGENE6,0.5,0.2,ns\nGENE7,-0.3,0.15,ns\nGENE8,2.1,0.005,up"
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = 'volcano_plot_example_data.csv'
  link.click()
}

const clearSpreadsheetData = () => {
  if (confirm('确定要清空所有数据吗？')) {
    const emptyData = {
      rows: {
        0: { cells: { 0: { text: '基因名' }, 1: { text: 'log2FoldChange' }, 2: { text: 'pvalue' }, 3: { text: '分组' } } }
      }
    }
    spreadsheetInstance.value.loadData(emptyData)
    updateSpreadsheetDataArray()
    plotGenerated.value = false
  }
}

const importSpreadsheetData = () => {
  showUploadModal.value = true
}

const toggleEditMode = () => {
  isEditMode.value = !isEditMode.value
  // 可以在这里实现编辑模式的切换逻辑
}

// 修改 processUploadedFile 方法以支持 spreadsheet
const processUploadedFileForSpreadsheet = () => {
  if (!selectedFile.value || !spreadsheetInstance.value) return
  
  const file = selectedFile.value
  const reader = new FileReader()
  
  reader.onload = (e) => {
    try {
      const text = e.target.result
      const lines = text.split('\n')
      
      const data = { rows: {} }
      lines.forEach((line, index) => {
        const values = line.split(',')
        const cells = {}
        values.forEach((value, colIndex) => {
          if (value.trim()) {
            cells[colIndex] = { text: value.trim() }
          }
        })
        if (Object.keys(cells).length > 0) {
          data.rows[index] = { cells }
        }
      })
      
      spreadsheetInstance.value.loadData(data)
      updateSpreadsheetDataArray()
      
    } catch (error) {
      console.error('Error parsing file:', error)
      alert('文件格式错误，请检查数据格式')
    }
  }
  
  reader.readAsText(file)
  showUploadModal.value = false
  selectedFile.value = null
}

// 修改 generatePlot 方法以使用 spreadsheet 数据
const generatePlotFromSpreadsheet = async () => {
  if (spreadsheetValidDataCount.value === 0) {
    alert('请先在表格中输入数据')
    return
  }
  
  isGenerating.value = true
  
  // 模拟生成过程
  await new Promise(resolve => setTimeout(resolve, 2000))
  
  plotGenerated.value = true
  isGenerating.value = false
}

onMounted(async () => {
  await nextTick()
  initSpreadsheet()
})
</script>

<style scoped>
/* x-spreadsheet 自定义样式 */
:deep(.x-spreadsheet) {
  font-family: Arial, sans-serif;
}

:deep(.x-spreadsheet-toolbar) {
  background-color: #f8f9fa;
  border-bottom: 1px solid #e9ecef;
}

:deep(.x-spreadsheet-table) {
  border: 1px solid #e9ecef;
}

/* 其他现有样式保持不变 */
.grid-cols-4 {
  grid-template-columns: 1fr 1fr 1fr auto;
}

.overflow-y-auto::-webkit-scrollbar {
  width: 6px;
}

.overflow-y-auto::-webkit-scrollbar-track {
  background: #f1f5f9;
  border-radius: 3px;
}

.overflow-y-auto::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 3px;
}

.overflow-y-auto::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}
</style>
