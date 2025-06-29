<template>
  <header class="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm shadow-sm border-b border-gray-100 transition-all duration-300">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="flex items-center justify-between h-16">
        <!-- Logo（点击返回首页） -->
        <router-link
          to="/index"
          class="flex items-center group cursor-pointer select-none"
        >
          <div class="flex-shrink-0 flex items-center">
            <div class="w-8 h-8 bg-gradient-to-br from-blue-600 to-cyan-500 rounded-lg flex items-center justify-center group-hover:shadow group-hover:scale-105 transition-all">
              <span class="text-white font-bold text-sm">BC</span>
            </div>
            <span class="ml-2 text-xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors">BioCloud</span>
          </div>
        </router-link>

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
              :placeholder="searchPlaceholder"
              class="block w-64 pl-9 pr-9 py-2 border border-gray-300 rounded-lg text-sm leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              @input="$emit('search', searchQuery)"
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
</template>

<script setup>
import { ref } from 'vue'
import { useRoute } from 'vue-router'
import { Search, X } from 'lucide-vue-next'

// 定义props
const props = defineProps({
  searchPlaceholder: {
    type: String,
    default: '搜索...'
  }
})

// 定义emits
const emit = defineEmits(['search'])

// 获取当前路由
const route = useRoute()

// 响应式数据
const searchQuery = ref('')

// 方法
const clearSearch = () => {
  searchQuery.value = ''
  emit('search', '')
}
</script> 