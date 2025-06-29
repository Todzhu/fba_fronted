<template>
  <div class="min-h-screen bg-gradient-to-br from-gray-50 via-slate-50 to-blue-50">
    <!-- 顶部导航栏 -->
    <header class="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm shadow-sm border-b border-gray-100 transition-all duration-300">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex items-center justify-between h-16">
          <!-- Logo -->
          <div class="flex items-center">
            <div class="flex-shrink-0 flex items-center">
              <div class="w-8 h-8 bg-gradient-to-br from-blue-600 to-cyan-500 rounded-lg flex items-center justify-center">
                <span class="text-white font-bold text-sm">BC</span>
              </div>
              <span class="ml-2 text-xl font-bold text-gray-900">BioCloud</span>
            </div>
          </div>

          <!-- 导航菜单 -->
          <nav class="hidden md:flex items-center space-x-8">
            <router-link 
              to="/index"
              :class="[
                'px-3 py-2 rounded-md text-base font-semibold transition-all duration-200',
                $route.path === '/index'
                  ? 'bg-blue-100 text-blue-700 shadow-sm'
                  : 'text-gray-800 hover:text-blue-600 hover:bg-gray-50'
              ]"
            >
              云工具
            </router-link>
            <router-link 
              to="/cloud-workflows"
              :class="[
                'px-3 py-2 rounded-md text-base font-semibold transition-all duration-200',
                $route.path === '/cloud-workflows'
                  ? 'bg-blue-100 text-blue-700 shadow-sm'
                  : 'text-gray-800 hover:text-blue-600 hover:bg-gray-50'
              ]"
            >
              云流程
            </router-link>
            <router-link 
              to="/article-reproduction"
              :class="[
                'px-3 py-2 rounded-md text-base font-semibold transition-all duration-200',
                $route.path === '/article-reproduction'
                  ? 'bg-blue-100 text-blue-700 shadow-sm'
                  : 'text-gray-800 hover:text-blue-600 hover:bg-gray-50'
              ]"
            >
              文章复现
            </router-link>
            <router-link 
              to="/example-reports"
              :class="[
                'px-3 py-2 rounded-md text-base font-semibold transition-all duration-200',
                $route.path === '/example-reports'
                  ? 'bg-blue-100 text-blue-700 shadow-sm'
                  : 'text-gray-800 hover:text-blue-600 hover:bg-gray-50'
              ]"
            >
              示例报告
            </router-link>
            <router-link 
              to="/data-management"
              :class="[
                'px-3 py-2 rounded-md text-base font-semibold transition-all duration-200',
                $route.path === '/data-management'
                  ? 'bg-blue-100 text-blue-700 shadow-sm'
                  : 'text-gray-800 hover:text-blue-600 hover:bg-gray-50'
              ]"
            >
              数据管理
            </router-link>
          </nav>

          <!-- 搜索框和登录注册按钮 -->
          <div class="flex items-center space-x-4">
            <!-- 搜索框 -->
            <div class="relative">
              <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search class="h-4 w-4 text-gray-400" />
              </div>
              <input
                v-model="searchQuery"
                type="text"
                placeholder="搜索文件..."
                class="block w-64 pl-9 pr-9 py-2 border border-gray-300 rounded-lg text-sm leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <div v-if="searchQuery" class="absolute inset-y-0 right-0 pr-3 flex items-center">
                <button @click="clearSearch" class="text-gray-400 hover:text-gray-600">
                  <X class="h-4 w-4" />
                </button>
              </div>
            </div>
            
            <!-- 登录注册按钮 -->
            <a href="/auth/register" class="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium transition-colors">
              注册
            </a>
            <router-link to="/auth/login" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
              登录
            </router-link>
          </div>
        </div>
      </div>
    </header>

    <!-- 页面头部 -->
    <div class="bg-white shadow-sm border-b border-gray-200 pt-16">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div class="flex items-center justify-between">
          <div>
            <h1 class="text-2xl font-bold text-gray-900">数据管理</h1>
            <p class="text-gray-600 mt-1">上传、管理和组织您的生物数据文件</p>
          </div>
          <div class="flex items-center space-x-3">
            <button
              @click="showCreateFolderModal = true"
              class="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
            >
              <FolderPlus class="h-5 w-5" />
              <span>新建文件夹</span>
            </button>
            <button
              @click="showUploadModal = true"
              class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
            >
              <Upload class="h-5 w-5" />
              <span>上传文件</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <!-- 存储使用情况 -->
      <div class="bg-white/90 backdrop-blur-sm rounded-lg shadow-sm p-6 mb-8">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-lg font-semibold text-gray-900">存储使用情况</h2>
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

      <!-- 面包屑导航 -->
      <div class="bg-white/80 backdrop-blur-sm rounded-lg shadow-sm p-4 mb-6">
        <nav class="flex items-center space-x-2 text-sm">
          <button
            @click="navigateToFolder(null)"
            class="flex items-center text-blue-600 hover:text-blue-800 transition-colors"
          >
            <Home class="h-4 w-4 mr-1" />
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
        </nav>
      </div>

      <!-- 文件操作栏 -->
      <div class="bg-white/80 backdrop-blur-sm rounded-lg shadow-sm p-4 mb-6">
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
          <!-- 搜索和筛选 -->
          <div class="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
            <div class="relative">
              <Search class="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                v-model="searchQuery"
                type="text"
                placeholder="搜索文件和文件夹..."
                class="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <select
              v-model="selectedFileType"
              class="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">所有类型</option>
              <option value="folder">文件夹</option>
              <option v-for="type in fileTypes" :key="type.value" :value="type.value">
                {{ type.label }}
              </option>
            </select>
          </div>

          <!-- 视图切换和排序 -->
          <div class="flex items-center space-x-2">
            <div class="flex border border-gray-300 rounded-lg">
              <button
                @click="viewMode = 'grid'"
                :class="[
                  'p-2 transition-colors',
                  viewMode === 'grid' ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:text-gray-900'
                ]"
              >
                <Grid class="h-4 w-4" />
              </button>
              <button
                @click="viewMode = 'list'"
                :class="[
                  'p-2 transition-colors border-l border-gray-300',
                  viewMode === 'list' ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:text-gray-900'
                ]"
              >
                <List class="h-4 w-4" />
              </button>
            </div>
            <select
              v-model="sortBy"
              class="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="name">按名称排序</option>
              <option value="size">按大小排序</option>
              <option value="date">按日期排序</option>
              <option value="type">按类型排序</option>
            </select>
          </div>
        </div>
      </div>

      <!-- 文件和文件夹列表 -->
      <div class="bg-white/90 backdrop-blur-sm rounded-lg shadow-sm">
        <!-- 网格视图 -->
        <div v-if="viewMode === 'grid'" class="p-6">
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            <div
              v-for="item in filteredItems"
              :key="item.id"
              class="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
              @click="handleItemClick(item)"
              @contextmenu.prevent="showContextMenu($event, item)"
            >
              <div class="flex items-center justify-between mb-3">
                <div class="flex items-center space-x-2">
                  <component 
                    :is="item.type === 'folder' ? Folder : getFileIcon(item.type)" 
                    :class="[
                      'h-8 w-8',
                      item.type === 'folder' ? 'text-yellow-600' : 'text-blue-600'
                    ]" 
                  />
                  <div class="flex-1 min-w-0">
                    <p class="text-sm font-medium text-gray-900 truncate">{{ item.name }}</p>
                  </div>
                </div>
                <div class="relative">
                  <button
                    @click.stop="toggleItemMenu(item.id)"
                    class="p-1 text-gray-400 hover:text-gray-600"
                  >
                    <MoreVertical class="h-4 w-4" />
                  </button>
                  <div
                    v-if="activeItemMenu === item.id"
                    class="absolute right-0 mt-1 w-48 bg-white rounded-md shadow-lg z-10 border border-gray-200"
                  >
                    <div class="py-1">
                      <button
                        v-if="item.type !== 'folder'"
                        @click="downloadFile(item)"
                        class="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                      >
                        <Download class="h-4 w-4 mr-2" />
                        下载
                      </button>
                      <button
                        @click="renameItem(item)"
                        class="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                      >
                        <Edit class="h-4 w-4 mr-2" />
                        重命名
                      </button>
                      <button
                        @click="moveItem(item)"
                        class="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                      >
                        <Move class="h-4 w-4 mr-2" />
                        移动
                      </button>
                      <button
                        @click="deleteItem(item)"
                        class="flex items-center px-4 py-2 text-sm text-red-600 hover:bg-red-50 w-full text-left"
                      >
                        <Trash2 class="h-4 w-4 mr-2" />
                        删除
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              <div class="text-xs text-gray-500 space-y-1">
                <p v-if="item.type !== 'folder'">{{ formatFileSize(item.size) }}</p>
                <p v-else>{{ getFolderItemCount(item.id) }} 项</p>
                <p>{{ formatDate(item.createdDate || item.uploadDate) }}</p>
              </div>
            </div>
          </div>
        </div>

        <!-- 列表视图 -->
        <div v-else class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  名称
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  类型
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  大小
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  修改时间
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  操作
                </th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              <tr
                v-for="item in filteredItems"
                :key="item.id"
                class="hover:bg-gray-50 cursor-pointer"
                @click="handleItemClick(item)"
              >
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="flex items-center">
                    <component 
                      :is="item.type === 'folder' ? Folder : getFileIcon(item.type)" 
                      :class="[
                        'h-6 w-6 mr-3',
                        item.type === 'folder' ? 'text-yellow-600' : 'text-blue-600'
                      ]" 
                    />
                    <div>
                      <div class="text-sm font-medium text-gray-900">{{ item.name }}</div>
                    </div>
                  </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <span 
                    :class="[
                      'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                      item.type === 'folder' ? 'bg-yellow-100 text-yellow-800' : 'bg-blue-100 text-blue-800'
                    ]"
                  >
                    {{ item.type === 'folder' ? '文件夹' : item.type.toUpperCase() }}
                  </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {{ item.type === 'folder' ? `${getFolderItemCount(item.id)} 项` : formatFileSize(item.size) }}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {{ formatDate(item.createdDate || item.uploadDate) }}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <div class="flex items-center space-x-2">
                    <button
                      v-if="item.type !== 'folder'"
                      @click.stop="downloadFile(item)"
                      class="text-blue-600 hover:text-blue-900"
                    >
                      <Download class="h-4 w-4" />
                    </button>
                    <button
                      @click.stop="renameItem(item)"
                      class="text-gray-600 hover:text-gray-900"
                    >
                      <Edit class="h-4 w-4" />
                    </button>
                    <button
                      @click.stop="moveItem(item)"
                      class="text-gray-600 hover:text-gray-900"
                    >
                      <Move class="h-4 w-4" />
                    </button>
                    <button
                      @click.stop="deleteItem(item)"
                      class="text-red-600 hover:text-red-900"
                    >
                      <Trash2 class="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- 空状态 -->
        <div v-if="filteredItems.length === 0" class="text-center py-12">
          <Folder class="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 class="text-lg font-medium text-gray-900 mb-2">
            {{ currentFolderId ? '文件夹为空' : '暂无文件' }}
          </h3>
          <p class="text-gray-600 mb-4">
            {{ currentFolderId ? '开始上传文件或创建子文件夹' : '开始上传您的生物数据文件' }}
          </p>
          <div class="flex justify-center space-x-3">
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

    <!-- 新建文件夹模态框 -->
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

    <!-- 移动文件/文件夹模态框 -->
    <div v-if="showMoveModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <div class="flex items-center justify-between mb-6">
          <h3 class="text-lg font-semibold text-gray-900">移动到</h3>
          <button
            @click="showMoveModal = false"
            class="text-gray-400 hover:text-gray-600"
          >
            <X class="h-6 w-6" />
          </button>
        </div>
        <div class="mb-4">
          <label class="block text-sm font-medium text-gray-700 mb-2">选择目标文件夹</label>
          <div class="border border-gray-300 rounded-lg max-h-64 overflow-y-auto">
            <div
              @click="selectedMoveTarget = null"
              :class="[
                'p-3 cursor-pointer hover:bg-gray-50 border-b border-gray-200',
                selectedMoveTarget === null ? 'bg-blue-50 text-blue-600' : ''
              ]"
            >
              <div class="flex items-center">
                <Home class="h-4 w-4 mr-2" />
                根目录
              </div>
            </div>
            <div
              v-for="folder in allFolders"
              :key="folder.id"
              @click="selectedMoveTarget = folder.id"
              :class="[
                'p-3 cursor-pointer hover:bg-gray-50 border-b border-gray-200 last:border-b-0',
                selectedMoveTarget === folder.id ? 'bg-blue-50 text-blue-600' : ''
              ]"
            >
              <div class="flex items-center" :style="{ paddingLeft: `${folder.level * 20}px` }">
                <Folder class="h-4 w-4 mr-2 text-yellow-600" />
                {{ folder.name }}
              </div>
            </div>
          </div>
        </div>
        <div class="flex justify-end space-x-3">
          <button
            @click="showMoveModal = false"
            class="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            取消
          </button>
          <button
            @click="confirmMove"
            class="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors"
          >
            移动
          </button>
        </div>
      </div>
    </div>

    <!-- 文件上传模态框 -->
    <div v-if="showUploadModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg p-6 w-full max-w-2xl mx-4">
        <div class="flex items-center justify-between mb-6">
          <h3 class="text-lg font-semibold text-gray-900">
            上传文件{{ currentFolderName ? ` 到 "${currentFolderName}"` : ' 到根目录' }}
          </h3>
          <button
            @click="closeUploadModal"
            class="text-gray-400 hover:text-gray-600"
          >
            <X class="h-6 w-6" />
          </button>
        </div>

        <!-- 拖拽上传区域 -->
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
          <p class="text-gray-600 mb-4">支持 FASTA, FASTQ, BAM, VCF, GFF, CSV, TSV 等格式</p>
          <input
            ref="fileInput"
            type="file"
            multiple
            @change="handleFileSelect"
            class="hidden"
            accept=".fasta,.fa,.fastq,.fq,.bam,.sam,.vcf,.gff,.gtf,.bed,.csv,.tsv,.txt,.gz"
          />
          <button
            @click="$refs.fileInput.click()"
            class="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors"
          >
            选择文件
          </button>
        </div>

        <!-- 上传队列 -->
        <div v-if="uploadQueue.length > 0" class="mt-6">
          <h4 class="text-sm font-medium text-gray-900 mb-3">上传队列</h4>
          <div class="space-y-3">
            <div
              v-for="upload in uploadQueue"
              :key="upload.id"
              class="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
            >
              <div class="flex items-center space-x-3">
                <component :is="getFileIcon(getFileExtension(upload.file.name))" class="h-6 w-6 text-blue-600" />
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
                <div v-else-if="upload.status === 'error'" class="text-red-600">
                  <AlertCircle class="h-5 w-5" />
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
import { useRoute } from 'vue-router'
import {
  Upload, Search, Grid, List, MoreVertical, Download, Edit, Trash2,
  FileText, X, CheckCircle, AlertCircle, File, Database, Code, Image,
  Folder, FolderPlus, Home, ChevronRight, Move
} from 'lucide-vue-next'

// 获取当前路由
const route = useRoute()

// 响应式数据
const showUploadModal = ref(false)
const showCreateFolderModal = ref(false)
const showMoveModal = ref(false)
const isDragOver = ref(false)
const searchQuery = ref('')
const selectedFileType = ref('')
const viewMode = ref('grid')
const sortBy = ref('name')
const activeItemMenu = ref(null)
const uploadQueue = ref([])
const newFolderName = ref('')
const currentFolderId = ref(null)
const selectedMoveTarget = ref(null)
const itemToMove = ref(null)

// 存储信息
const usedStorage = ref(2.5 * 1024 * 1024 * 1024) // 2.5GB
const totalStorage = ref(10 * 1024 * 1024 * 1024) // 10GB

// 文件类型
const fileTypes = ref([
  { value: 'fasta', label: 'FASTA 序列文件' },
  { value: 'fastq', label: 'FASTQ 测序文件' },
  { value: 'bam', label: 'BAM 比对文件' },
  { value: 'vcf', label: 'VCF 变异文件' },
  { value: 'gff', label: 'GFF 注释文件' },
  { value: 'csv', label: 'CSV 数据文件' },
  { value: 'tsv', label: 'TSV 数据文件' }
])

// 文件夹和文件数据
const items = ref([
  // 根目录文件夹
  {
    id: 'folder-1',
    name: '基因组数据',
    type: 'folder',
    parentId: null,
    createdDate: new Date('2024-01-10')
  },
  {
    id: 'folder-2',
    name: '转录组分析',
    type: 'folder',
    parentId: null,
    createdDate: new Date('2024-01-11')
  },
  {
    id: 'folder-3',
    name: '蛋白质组学',
    type: 'folder',
    parentId: null,
    createdDate: new Date('2024-01-12')
  },
  // 基因组数据子文件夹
  {
    id: 'folder-4',
    name: '参考基因组',
    type: 'folder',
    parentId: 'folder-1',
    createdDate: new Date('2024-01-13')
  },
  {
    id: 'folder-5',
    name: '变异数据',
    type: 'folder',
    parentId: 'folder-1',
    createdDate: new Date('2024-01-14')
  },
  // 根目录文件
  {
    id: 1,
    name: 'sample_metadata.csv',
    type: 'csv',
    size: 1024 * 1024 * 2, // 2MB
    parentId: null,
    uploadDate: new Date('2024-01-15')
  },
  // 基因组数据文件夹中的文件
  {
    id: 2,
    name: 'human_genome.fasta',
    type: 'fasta',
    size: 1024 * 1024 * 800, // 800MB
    parentId: 'folder-4',
    uploadDate: new Date('2024-01-16')
  },
  {
    id: 3,
    name: 'genome_annotation.gff3',
    type: 'gff',
    size: 1024 * 1024 * 50, // 50MB
    parentId: 'folder-4',
    uploadDate: new Date('2024-01-17')
  },
  // 变异数据文件夹中的文件
  {
    id: 4,
    name: 'variants_chr1.vcf',
    type: 'vcf',
    size: 1024 * 1024 * 120, // 120MB
    parentId: 'folder-5',
    uploadDate: new Date('2024-01-18')
  },
  {
    id: 5,
    name: 'variants_chr2.vcf',
    type: 'vcf',
    size: 1024 * 1024 * 110, // 110MB
    parentId: 'folder-5',
    uploadDate: new Date('2024-01-19')
  },
  // 转录组分析文件夹中的文件
  {
    id: 6,
    name: 'sample1_R1.fastq.gz',
    type: 'fastq',
    size: 1024 * 1024 * 500, // 500MB
    parentId: 'folder-2',
    uploadDate: new Date('2024-01-20')
  },
  {
    id: 7,
    name: 'sample1_R2.fastq.gz',
    type: 'fastq',
    size: 1024 * 1024 * 480, // 480MB
    parentId: 'folder-2',
    uploadDate: new Date('2024-01-20')
  },
  {
    id: 8,
    name: 'expression_matrix.tsv',
    type: 'tsv',
    size: 1024 * 1024 * 25, // 25MB
    parentId: 'folder-2',
    uploadDate: new Date('2024-01-21')
  }
])

// 计算属性
const storagePercentage = computed(() => {
  return (usedStorage.value / totalStorage.value) * 100
})

const currentItems = computed(() => {
  return items.value.filter(item => item.parentId === currentFolderId.value)
})

const filteredItems = computed(() => {
  let filtered = currentItems.value

  // 按搜索关键词筛选
  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase().trim()
    filtered = filtered.filter(item => 
      item.name.toLowerCase().includes(query)
    )
  }

  // 按文件类型筛选
  if (selectedFileType.value) {
    if (selectedFileType.value === 'folder') {
      filtered = filtered.filter(item => item.type === 'folder')
    } else {
      filtered = filtered.filter(item => item.type === selectedFileType.value)
    }
  }

  // 排序 - 文件夹优先
  filtered.sort((a, b) => {
    // 文件夹排在前面
    if (a.type === 'folder' && b.type !== 'folder') return -1
    if (a.type !== 'folder' && b.type === 'folder') return 1
    
    // 同类型内部排序
    switch (sortBy.value) {
      case 'name':
        return a.name.localeCompare(b.name)
      case 'size':
        if (a.type === 'folder' && b.type === 'folder') return 0
        return (b.size || 0) - (a.size || 0)
      case 'date':
        const dateA = new Date(a.createdDate || a.uploadDate)
        const dateB = new Date(b.createdDate || b.uploadDate)
        return dateB - dateA
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

const currentFolderName = computed(() => {
  if (!currentFolderId.value) return null
  const folder = items.value.find(item => item.id === currentFolderId.value)
  return folder ? folder.name : null
})

const allFolders = computed(() => {
  const folders = items.value.filter(item => item.type === 'folder')
  
  // 构建层级结构
  const buildHierarchy = (parentId = null, level = 0) => {
    return folders
      .filter(folder => folder.parentId === parentId)
      .map(folder => ({
        ...folder,
        level
      }))
      .concat(
        folders
          .filter(folder => folder.parentId === parentId)
          .flatMap(folder => buildHierarchy(folder.id, level + 1))
      )
  }
  
  return buildHierarchy()
})

// 方法
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
    month: 'short',
    day: 'numeric'
  })
}

const getFileIcon = (type) => {
  const iconMap = {
    fasta: Database,
    fastq: Database,
    bam: File,
    vcf: Code,
    gff: Code,
    csv: FileText,
    tsv: FileText
  }
  return iconMap[type] || File
}

const getFileExtension = (filename) => {
  return filename.split('.').pop().toLowerCase()
}

const getFolderItemCount = (folderId) => {
  return items.value.filter(item => item.parentId === folderId).length
}

const handleItemClick = (item) => {
  if (item.type === 'folder') {
    navigateToFolder(item.id)
  } else {
    console.log('Selected file:', item)
  }
}

const navigateToFolder = (folderId) => {
  currentFolderId.value = folderId
  activeItemMenu.value = null
}

const toggleItemMenu = (itemId) => {
  activeItemMenu.value = activeItemMenu.value === itemId ? null : itemId
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
  activeItemMenu.value = null
}

const moveItem = (item) => {
  itemToMove.value = item
  selectedMoveTarget.value = item.parentId
  showMoveModal.value = true
  activeItemMenu.value = null
}

const confirmMove = () => {
  if (itemToMove.value) {
    itemToMove.value.parentId = selectedMoveTarget.value
    showMoveModal.value = false
    itemToMove.value = null
    selectedMoveTarget.value = null
  }
}

const deleteItem = (item) => {
  const itemType = item.type === 'folder' ? '文件夹' : '文件'
  const message = item.type === 'folder' 
    ? `确定要删除文件夹 "${item.name}" 及其所有内容吗？` 
    : `确定要删除文件 "${item.name}" 吗？`
    
  if (confirm(message)) {
    if (item.type === 'folder') {
      // 递归删除文件夹及其内容
      const deleteRecursive = (folderId) => {
        const childItems = items.value.filter(child => child.parentId === folderId)
        childItems.forEach(child => {
          if (child.type === 'folder') {
            deleteRecursive(child.id)
          } else {
            usedStorage.value -= child.size
          }
        })
        items.value = items.value.filter(i => i.parentId !== folderId)
      }
      deleteRecursive(item.id)
    } else {
      usedStorage.value -= item.size
    }
    
    const index = items.value.findIndex(i => i.id === item.id)
    if (index > -1) {
      items.value.splice(index, 1)
    }
  }
  activeItemMenu.value = null
}

const downloadFile = (file) => {
  console.log('Downloading file:', file.name)
  activeItemMenu.value = null
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
        
        // 添加到当前文件夹
        items.value.push({
          id: Date.now() + Math.random(),
          name: upload.file.name,
          type: getFileExtension(upload.file.name),
          size: upload.file.size,
          parentId: currentFolderId.value,
          uploadDate: new Date()
        })
        
        // 更新存储使用量
        usedStorage.value += upload.file.size
        
        resolve()
      }
    }, 200)
  })
}

// 点击外部关闭菜单
const handleClickOutside = (e) => {
  if (!e.target.closest('.relative')) {
    activeItemMenu.value = null
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})

// 新增方法
const clearSearch = () => {
  searchQuery.value = ''
}
</script>

<style scoped>
/* 拖拽样式 */
.drag-over {
  border-color: #3b82f6;
  background-color: #eff6ff;
}
</style>
