<template>
  <div class="min-h-screen bg-gray-50">
    <!-- Header Section -->
    <div class="bg-white shadow-sm border-b border-gray-200">
      <div class="max-w-full mx-auto px-8 py-6">
        <div class="flex items-center justify-between mb-0">
          <div>
            <h1 class="text-2xl font-bold text-gray-900">数据管理</h1>
            <p class="text-gray-600 mt-1">上传、管理和组织您的生物数据文件</p>
          </div>
          <!-- Storage Usage moved here -->
          <div class="bg-gray-50 rounded-lg p-4 min-w-80">
            <div class="flex items-center justify-between mb-2">
              <span class="text-sm font-medium text-gray-700">存储使用情况</span>
              <span class="text-sm text-gray-600">{{ formatFileSize(usedStorage) }} / {{ formatFileSize(totalStorage) }}</span>
            </div>
            <div class="w-full bg-gray-200 rounded-full h-3">
              <div 
                class="bg-gradient-to-r from-blue-500 to-cyan-500 h-3 rounded-full transition-all duration-300"
                :style="{ width: `${storagePercentage}%` }"
              ></div>
            </div>
            <div class="flex justify-between text-sm text-gray-600 mt-2">
              <span>已使用 {{ storagePercentage.toFixed(1) }}%</span>
              <span>剩余 {{ formatFileSize(totalStorage - usedStorage) }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Main Content -->
    <div class="max-w-full mx-auto px-8 py-6">
      <!-- Breadcrumb -->
      <div class="flex items-center gap-2 mb-6">
        <Home class="w-4 h-4 text-blue-600" />
        <button
          @click="navigateToFolder(null)"
          class="text-blue-600 hover:text-blue-800 transition-colors"
        >
          根目录
        </button>
        <template v-for="(folder, index) in breadcrumbs" :key="folder.id">
          <ChevronRight class="h-4 w-4 text-gray-400" />
          <button
            @click="navigateToFolder(folder.id)"
            :class="[
              'hover:text-blue-800 transition-colors',
              index === breadcrumbs.length - 1 ? 'text-gray-900 font-medium' : 'text-blue-600'
            ]"
          >
            {{ folder.name }}
          </button>
        </template>
      </div>

      <!-- Controls -->
      <div class="flex items-center justify-between mb-6">
        <div class="flex items-center space-x-4">
          <!-- Search -->
          <div class="relative">
            <Search class="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              v-model="searchQuery"
              type="text"
              placeholder="搜索文件和文件夹..."
              class="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent w-80"
            />
          </div>

          <!-- Action buttons moved here -->
          <button
            @click="showCreateFolderModal = true"
            class="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
          >
            <FolderPlus class="h-4 w-4" />
            <span>新建文件夹</span>
          </button>
          <button
            @click="showUploadModal = true"
            class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
          >
            <Upload class="h-4 w-4" />
            <span>上传文件</span>
          </button>
        </div>

        <div class="flex items-center gap-3">
          <!-- View Toggle -->
          <div class="flex border border-gray-300 rounded-lg">
            <button
              @click="viewMode = 'grid'"
              :class="[
                'p-2 transition-colors',
                viewMode === 'grid' 
                  ? 'bg-blue-600 text-white' 
                  : 'text-gray-600 hover:bg-gray-50'
              ]"
            >
              <Grid3X3 class="w-4 h-4" />
            </button>
            <button
              @click="viewMode = 'list'"
              :class="[
                'p-2 transition-colors border-l border-gray-300',
                viewMode === 'list' 
                  ? 'bg-blue-600 text-white' 
                  : 'text-gray-600 hover:bg-gray-50'
              ]"
            >
              <List class="w-4 h-4" />
            </button>
          </div>

          <!-- Sort -->
          <select 
            v-model="sortBy"
            class="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="name">按名称排序</option>
            <option value="date">按日期排序</option>
            <option value="size">按大小排序</option>
            <option value="type">按类型排序</option>
          </select>
        </div>
      </div>

      <!-- File List -->
      <div class="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <!-- Table Header -->
        <div class="grid grid-cols-12 gap-4 p-4 border-b border-gray-200 bg-gray-50 font-medium text-gray-700 text-sm">
          <div class="col-span-4">名称</div>
          <div class="col-span-2">类型</div>
          <div class="col-span-2">大小</div>
          <div class="col-span-2">修改时间</div>
          <div class="col-span-2">操作</div>
        </div>

        <!-- File Items -->
        <div
          v-for="item in filteredItems"
          :key="item.id"
          class="grid grid-cols-12 gap-4 p-4 border-b border-gray-200 hover:bg-gray-50 cursor-pointer transition-colors"
          @click="handleItemClick(item)"
        >
          <div class="col-span-4 flex items-center gap-3">
            <component 
              :is="item.type === 'folder' ? Folder : getFileIcon(item.type)" 
              :class="[
                'w-5 h-5',
                item.type === 'folder' ? 'text-yellow-500' : 'text-blue-500'
              ]" 
            />
            <span class="font-medium text-gray-900">{{ item.name }}</span>
          </div>
          <div class="col-span-2">
            <span 
              :class="[
                'inline-flex items-center px-2 py-1 rounded text-xs font-medium',
                item.type === 'folder' ? 'bg-yellow-100 text-yellow-800' : 'bg-blue-100 text-blue-800'
              ]"
            >
              {{ item.type === 'folder' ? '文件夹' : item.type.toUpperCase() }}
            </span>
          </div>
          <div class="col-span-2 text-sm text-gray-600">
            {{ item.type === 'folder' ? `${getFolderItemCount(item.id)} 项` : formatFileSize(item.size) }}
          </div>
          <div class="col-span-2 text-sm text-gray-600">
            {{ formatDate(item.createdDate || item.uploadDate) }}
          </div>
          <div class="col-span-2 flex items-center gap-2">
            <button
              v-if="item.type !== 'folder'"
              @click.stop="downloadFile(item)"
              class="p-1 text-blue-600 hover:text-blue-800 transition-colors"
              title="下载"
            >
              <Download class="w-4 h-4" />
            </button>
            <button
              @click.stop="renameItem(item)"
              class="p-1 text-gray-600 hover:text-gray-800 transition-colors"
              title="重命名"
            >
              <Edit class="w-4 h-4" />
            </button>
            <button
              @click.stop="moveItem(item)"
              class="p-1 text-gray-600 hover:text-gray-800 transition-colors"
              title="移动"
            >
              <Plus class="w-4 h-4" />
            </button>
            <button
              @click.stop="deleteItem(item)"
              class="p-1 text-red-600 hover:text-red-800 transition-colors"
              title="删除"
            >
              <Trash2 class="w-4 h-4" />
            </button>
          </div>
        </div>

        <!-- Empty State -->
        <div v-if="filteredItems.length === 0" class="text-center py-12">
          <FolderOpen class="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 class="text-lg font-medium text-gray-900 mb-2">暂无文件</h3>
          <p class="text-gray-500 mb-4">开始上传您的第一个文件</p>
          <div class="flex justify-center gap-3">
            <button
              @click="showCreateFolderModal = true"
              class="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              新建文件夹
            </button>
            <button
              @click="showUploadModal = true"
              class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              上传文件
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Create Folder Modal -->
    <div v-if="showCreateFolderModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <div class="flex items-center justify-between mb-6">
          <h3 class="text-lg font-semibold text-gray-900">新建文件夹</h3>
          <button
            @click="showCreateFolderModal = false"
            class="text-gray-400 hover:text-gray-600"
          >
            <X class="h-6 w-6" />
          </button>
        </div>
        <div class="mb-4">
          <label class="block text-sm font-medium text-gray-700 mb-2">文件夹名称</label>
          <input
            v-model="newFolderName"
            type="text"
            placeholder="输入文件夹名称"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            @keyup.enter="createFolder"
          />
        </div>
        <div class="flex justify-end space-x-3">
          <button
            @click="showCreateFolderModal = false"
            class="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            取消
          </button>
          <button
            @click="createFolder"
            :disabled="!newFolderName.trim()"
            class="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white px-6 py-2 rounded-lg transition-colors"
          >
            创建
          </button>
        </div>
      </div>
    </div>

    <!-- Upload Modal -->
    <div v-if="showUploadModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg p-6 w-full max-w-2xl mx-4">
        <div class="flex items-center justify-between mb-6">
          <h3 class="text-lg font-semibold text-gray-900">上传文件</h3>
          <button
            @click="closeUploadModal"
            class="text-gray-400 hover:text-gray-600"
          >
            <X class="h-6 w-6" />
          </button>
        </div>

        <!-- Upload Area -->
        <div
          @drop="handleDrop"
          @dragover.prevent
          @dragenter.prevent
          :class="[
            'border-2 border-dashed rounded-lg p-8 text-center transition-colors',
            isDragOver ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
          ]"
        >
          <Upload class="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p class="text-lg font-medium text-gray-900 mb-2">拖拽文件到此处或点击选择</p>
          <p class="text-gray-600 mb-4">支持 CSV, TSV, FASTA, FASTQ 等格式</p>
          <input
            ref="fileInput"
            type="file"
            multiple
            @change="handleFileSelect"
            class="hidden"
            accept=".csv,.tsv,.fasta,.fastq,.txt"
          />
          <button
            @click="$refs.fileInput.click()"
            class="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors"
          >
            选择文件
          </button>
        </div>

        <!-- Upload Queue -->
        <div v-if="uploadQueue.length > 0" class="mt-6">
          <h4 class="text-sm font-medium text-gray-900 mb-3">上传队列</h4>
          <div class="space-y-3">
            <div
              v-for="upload in uploadQueue"
              :key="upload.id"
              class="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
            >
              <div class="flex items-center space-x-3">
                <FileText class="h-6 w-6 text-blue-600" />
                <div>
                  <p class="text-sm font-medium text-gray-900">{{ upload.file.name }}</p>
                  <p class="text-xs text-gray-500">{{ formatFileSize(upload.file.size) }}</p>
                </div>
              </div>
              <div class="flex items-center space-x-2">
                <div v-if="upload.status === 'uploading'" class="flex items-center space-x-2">
                  <div class="w-32 bg-gray-200 rounded-full h-2">
                    <div
                      class="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      :style="{ width: `${upload.progress}%` }"
                    ></div>
                  </div>
                  <span class="text-xs text-gray-600">{{ upload.progress }}%</span>
                </div>
                <div v-else-if="upload.status === 'completed'" class="text-green-600">
                  <CheckCircle class="h-5 w-5" />
                </div>
                <button
                  @click="removeFromQueue(upload.id)"
                  class="text-gray-400 hover:text-gray-600"
                >
                  <X class="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
          <div class="flex justify-end space-x-3 mt-4">
            <button
              @click="clearQueue"
              class="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              清空队列
            </button>
            <button
              @click="startUpload"
              :disabled="uploadQueue.length === 0"
              class="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white px-6 py-2 rounded-lg transition-colors"
            >
              开始上传
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { 
  FolderPlus, 
  Upload, 
  Home, 
  Search, 
  Grid3X3, 
  List, 
  Folder, 
  FileText, 
  Download,
  Edit,
  Plus,
  Trash2,
  FolderOpen,
  X,
  CheckCircle,
  ChevronRight
} from 'lucide-vue-next'

// Reactive data
const searchQuery = ref('')
const viewMode = ref('list')
const sortBy = ref('name')
const showCreateFolderModal = ref(false)
const showUploadModal = ref(false)
const isDragOver = ref(false)
const newFolderName = ref('')
const uploadQueue = ref([])
const currentFolderId = ref(null)

// Storage data
const totalStorage = ref(10 * 1024 * 1024 * 1024) // 10 GB
const usedStorage = ref(2.5 * 1024 * 1024 * 1024) // 2.5 GB

// File types
// const fileTypes = ref([
//   { label: 'CSV文件', value: 'csv' },
//   { label: 'TSV文件', value: 'tsv' },
//   { label: 'FASTA文件', value: 'fasta' },
//   { label: 'FASTQ文件', value: 'fastq' }
// ])

// Sample data
const items = ref([
  {
    id: 'folder-1',
    name: '蛋白质组学',
    type: 'folder',
    parentId: null,
    createdDate: new Date('2024-01-12')
  },
  {
    id: 'folder-2',
    name: '基因组数据',
    type: 'folder',
    parentId: null,
    createdDate: new Date('2024-01-10')
  },
  {
    id: 'folder-3',
    name: '转录组分析',
    type: 'folder',
    parentId: null,
    createdDate: new Date('2024-01-11')
  },
  {
    id: 1,
    name: 'sample_metadata.csv',
    type: 'csv',
    size: 2 * 1024 * 1024, // 2MB
    parentId: null,
    uploadDate: new Date('2024-01-15')
  }
])

// Computed properties
const storagePercentage = computed(() => {
  return (usedStorage.value / totalStorage.value) * 100
})

const currentItems = computed(() => {
  return items.value.filter(item => item.parentId === currentFolderId.value)
})

const filteredItems = computed(() => {
  let filtered = currentItems.value

  // Search filter
  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase()
    filtered = filtered.filter(item => 
      item.name.toLowerCase().includes(query)
    )
  }

  // Sort
  filtered.sort((a, b) => {
    // Folders first
    if (a.type === 'folder' && b.type !== 'folder') return -1
    if (a.type !== 'folder' && b.type === 'folder') return 1
    
    switch (sortBy.value) {
      case 'name':
        return a.name.localeCompare(b.name)
      case 'date':
        const dateA = new Date(a.createdDate || a.uploadDate)
        const dateB = new Date(b.createdDate || b.uploadDate)
        return dateB - dateA
      case 'size':
        if (a.type === 'folder' && b.type === 'folder') return 0
        return (b.size || 0) - (a.size || 0)
      case 'type':
        return a.type.localeCompare(b.type)
      default:
        return 0
    }
  })

  return filtered
})

const breadcrumbs = computed(() => {
  const crumbs = []
  let currentId = currentFolderId.value
  
  while (currentId) {
    const folder = items.value.find(item => item.id === currentId && item.type === 'folder')
    if (folder) {
      crumbs.unshift(folder)
      currentId = folder.parentId
    } else {
      break
    }
  }
  
  return crumbs
})

// Methods
const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

const formatDate = (date) => {
  return new Date(date).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

const getFileIcon = (type) => {
  return FileText // Simplified for this example
}

const getFolderItemCount = (folderId) => {
  return items.value.filter(item => item.parentId === folderId).length
}

const handleItemClick = (item) => {
  if (item.type === 'folder') {
    navigateToFolder(item.id)
  }
}

const navigateToFolder = (folderId) => {
  currentFolderId.value = folderId
}

const createFolder = () => {
  if (!newFolderName.value.trim()) return
  
  const newFolder = {
    id: `folder-${Date.now()}`,
    name: newFolderName.value.trim(),
    type: 'folder',
    parentId: currentFolderId.value,
    createdDate: new Date()
  }
  
  items.value.push(newFolder)
  newFolderName.value = ''
  showCreateFolderModal.value = false
}

const renameItem = (item) => {
  const newName = prompt(`请输入新的${item.type === 'folder' ? '文件夹' : '文件'}名:`, item.name)
  if (newName && newName !== item.name) {
    item.name = newName
  }
}

const moveItem = (item) => {
  alert(`移动 ${item.name} 功能开发中...`)
}

const deleteItem = (item) => {
  const itemType = item.type === 'folder' ? '文件夹' : '文件'
  if (confirm(`确定要删除${itemType} "${item.name}" 吗？`)) {
    const index = items.value.findIndex(i => i.id === item.id)
    if (index > -1) {
      if (item.type !== 'folder' && item.size) {
        usedStorage.value -= item.size
      }
      items.value.splice(index, 1)
    }
  }
}

const downloadFile = (file) => {
  alert(`下载 ${file.name} 功能开发中...`)
}

const closeUploadModal = () => {
  showUploadModal.value = false
  uploadQueue.value = []
}

const handleDrop = (e) => {
  e.preventDefault()
  isDragOver.value = false
  const droppedFiles = Array.from(e.dataTransfer.files)
  addFilesToQueue(droppedFiles)
}

const handleFileSelect = (e) => {
  const selectedFiles = Array.from(e.target.files)
  addFilesToQueue(selectedFiles)
}

const addFilesToQueue = (fileList) => {
  fileList.forEach(file => {
    uploadQueue.value.push({
      id: Date.now() + Math.random(),
      file: file,
      progress: 0,
      status: 'pending'
    })
  })
}

const removeFromQueue = (uploadId) => {
  const index = uploadQueue.value.findIndex(upload => upload.id === uploadId)
  if (index > -1) {
    uploadQueue.value.splice(index, 1)
  }
}

const clearQueue = () => {
  uploadQueue.value = []
}

const startUpload = async () => {
  for (const upload of uploadQueue.value) {
    if (upload.status === 'pending') {
      upload.status = 'uploading'
      await simulateUpload(upload)
    }
  }
}

const simulateUpload = (upload) => {
  return new Promise((resolve) => {
    const interval = setInterval(() => {
      upload.progress += Math.random() * 20
      if (upload.progress >= 100) {
        upload.progress = 100
        upload.status = 'completed'
        clearInterval(interval)
        
        // Add to current folder
        const fileExtension = upload.file.name.split('.').pop().toLowerCase()
        items.value.push({
          id: Date.now() + Math.random(),
          name: upload.file.name,
          type: fileExtension,
          size: upload.file.size,
          parentId: currentFolderId.value,
          uploadDate: new Date()
        })
        
        // Update storage
        usedStorage.value += upload.file.size
        
        resolve()
      }
    }, 200)
  })
}

// Drag and drop handlers
onMounted(() => {
  document.addEventListener('dragenter', (e) => {
    if (showUploadModal.value) {
      isDragOver.value = true
    }
  })
  
  document.addEventListener('dragleave', (e) => {
    if (!e.relatedTarget) {
      isDragOver.value = false
    }
  })
})
</script>
