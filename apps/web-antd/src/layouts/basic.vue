<script lang="ts" setup>
import type { NotificationItem } from '@vben/layouts';

import { computed, onMounted, ref, watch } from 'vue';

import { AuthenticationLoginExpiredModal, useVbenModal } from '@vben/common-ui';
import { useWatermark } from '@vben/hooks';
import { MingcuteProfileLine } from '@vben/icons';
import {
  BasicLayout,
  LockScreen,
  Notification,
  UserDropdown,
} from '@vben/layouts';
import { $t } from '@vben/locales';
import { preferences } from '@vben/preferences';
import { useAccessStore, useUserStore } from '@vben/stores';

import {
  clearAllMessages,
  getMessageList,
  markAllAsRead,
  markAsRead,
} from '#/api/message';
import { router } from '#/router';
import { useAuthStore } from '#/store';
import LoginForm from '#/views/_core/authentication/login.vue';

const notifications = ref<NotificationItem[]>([]);
const allMessages = ref<NotificationItem[]>([]);
const allMessagesTotal = ref(0);
const allMessagesPage = ref(1);
const allMessagesLoading = ref(false);

const userStore = useUserStore();
const authStore = useAuthStore();
const accessStore = useAccessStore();
const { destroyWatermark, updateWatermark } = useWatermark();
const showDot = computed(() =>
  notifications.value.some((item) => !item.isRead),
);

const menus = computed(() => [
  {
    handler: () => {
      router.push('/profile');
    },
    icon: MingcuteProfileLine,
    text: $t('page.menu.profile'),
  },
]);

const avatar = computed(() => {
  return userStore.userInfo?.avatar ?? preferences.app.defaultAvatar;
});

// 获取消息类型对应的头像图标
function getMsgTypeAvatar(msgType?: string) {
  if (msgType === 'task_completed') {
    return 'https://avatar.vercel.sh/success.svg?text=✓';
  } else if (msgType === 'task_failed') {
    return 'https://avatar.vercel.sh/error.svg?text=✗';
  }
  return 'https://avatar.vercel.sh/notification.svg?text=N';
}

// 格式化日期
function formatDate(dateStr: string) {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes}分钟前`;
  if (hours < 24) return `${hours}小时前`;
  if (days < 7) return `${days}天前`;
  return date.toLocaleDateString();
}

// 转换消息格式
function transformMessage(msg: any): NotificationItem {
  return {
    id: msg.id,
    avatar: getMsgTypeAvatar(msg.msg_type),
    date: formatDate(msg.created_time),
    isRead: msg.is_read,
    message: msg.content,
    title: msg.title,
    relatedId: msg.related_id,
    msgType: msg.msg_type,
  };
}

// 加载消息列表（顶部通知栏）
async function loadMessages() {
  try {
    const res = await getMessageList({ page: 1, size: 20 });
    notifications.value = res.items.map((msg) => transformMessage(msg));
  } catch {
    // 加载失败时保持空列表
  }
}

// 加载全部消息（弹框用）
async function loadAllMessages(page = 1) {
  allMessagesLoading.value = true;
  try {
    const res = await getMessageList({ page, size: 50 });
    if (page === 1) {
      allMessages.value = res.items.map((msg) => transformMessage(msg));
    } else {
      allMessages.value.push(...res.items.map((msg) => transformMessage(msg)));
    }
    allMessagesTotal.value = res.total;
    allMessagesPage.value = page;
  } catch {
    // 加载失败
  } finally {
    allMessagesLoading.value = false;
  }
}

// 消息弹框
const [MessageModal, messageModalApi] = useVbenModal({
  onOpenChange(isOpen) {
    if (isOpen) {
      loadAllMessages(1);
    }
  },
});

async function handleLogout() {
  await authStore.logout(false);
}

async function handleNoticeClear() {
  try {
    await clearAllMessages();
    notifications.value = [];
    allMessages.value = [];
  } catch {
    // 清空失败
  }
}

async function handleMakeAll() {
  try {
    await markAllAsRead();
    notifications.value.forEach((item) => (item.isRead = true));
    allMessages.value.forEach((item) => (item.isRead = true));
  } catch {
    // 标记失败
  }
}

// 点击消息处理
async function handleNoticeRead(item: NotificationItem) {
  // 标记已读
  if (item.id && !item.isRead) {
    try {
      await markAsRead(item.id);
      item.isRead = true;
      // 同步更新顶部通知栏
      const notify = notifications.value.find((n) => n.id === item.id);
      if (notify) notify.isRead = true;
    } catch {
      // 标记失败
    }
  }
  // 关闭弹框并跳转到任务中心
  if (item.relatedId) {
    messageModalApi.close();
    router.push({
      path: '/analysis/tasks',
      query: { highlight: String(item.relatedId) },
    });
  }
}

// 查看全部消息
function handleViewAll() {
  messageModalApi.open();
}

// 页面加载时获取消息
onMounted(() => {
  loadMessages();
});

watch(
  () => preferences.app.watermark,
  async (enable) => {
    if (enable) {
      await updateWatermark({
        content: `${userStore.userInfo?.username} - ${userStore.userInfo?.realName}`,
      });
    } else {
      destroyWatermark();
    }
  },
  {
    immediate: true,
  },
);
</script>

<template>
  <BasicLayout @clear-preferences-and-logout="handleLogout">
    <template #user-dropdown>
      <UserDropdown
        :avatar
        :menus
        :text="userStore.userInfo?.realName"
        description="ann.vben@gmail.com"
        tag-text="Pro"
        @logout="handleLogout"
      />
    </template>
    <template #notification>
      <Notification
        :dot="showDot"
        :notifications="notifications"
        @clear="handleNoticeClear"
        @make-all="handleMakeAll"
        @read="handleNoticeRead"
        @view-all="handleViewAll"
      />
    </template>
    <template #extra>
      <AuthenticationLoginExpiredModal
        v-model:open="accessStore.loginExpired"
        :avatar
      >
        <LoginForm />
      </AuthenticationLoginExpiredModal>
    </template>
    <template #lock-screen>
      <LockScreen :avatar @to-login="handleLogout" />
    </template>
  </BasicLayout>

  <!-- 全部消息弹框 -->
  <MessageModal title="全部消息" :fullscreen-button="false" class="w-[600px]">
    <div class="max-h-[500px] overflow-y-auto">
      <div
        v-if="allMessages.length === 0 && !allMessagesLoading"
        class="py-10 text-center text-gray-400"
      >
        暂无消息
      </div>
      <ul v-else class="divide-y divide-gray-100">
        <li
          v-for="item in allMessages"
          :key="item.id"
          class="flex cursor-pointer items-start gap-3 px-4 py-3 transition hover:bg-gray-50"
          :class="{ 'bg-blue-50/50': !item.isRead }"
          @click="handleNoticeRead(item)"
        >
          <img :src="item.avatar" class="h-10 w-10 rounded-full" />
          <div class="flex-1">
            <div class="flex items-center gap-2">
              <span
                class="font-medium"
                :class="{ 'text-primary': !item.isRead }"
                >{{ item.title }}</span
              >
              <span
                v-if="!item.isRead"
                class="rounded bg-blue-500 px-1.5 py-0.5 text-xs text-white"
                >未读</span
              >
              <span
                v-else
                class="rounded bg-gray-200 px-1.5 py-0.5 text-xs text-gray-500"
                >已读</span
              >
            </div>
            <p class="mt-1 line-clamp-2 text-sm text-gray-500">
              {{ item.message }}
            </p>
            <p class="mt-1 text-xs text-gray-400">{{ item.date }}</p>
          </div>
        </li>
      </ul>
      <div v-if="allMessagesLoading" class="py-4 text-center text-gray-400">
        加载中...
      </div>
      <div
        v-if="allMessages.length > 0 && allMessages.length < allMessagesTotal"
        class="py-3 text-center"
      >
        <button
          class="text-primary text-sm hover:underline"
          :disabled="allMessagesLoading"
          @click="loadAllMessages(allMessagesPage + 1)"
        >
          加载更多
        </button>
      </div>
    </div>
  </MessageModal>
</template>
