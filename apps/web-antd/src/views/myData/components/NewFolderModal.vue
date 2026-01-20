<script setup lang="ts">
import { ref, watch } from 'vue';
import { Modal, Input, Form, FormItem } from 'ant-design-vue';

interface Props {
  open: boolean;
}

const props = defineProps<Props>();
const emit = defineEmits(['update:open', 'create']);

const folderName = ref('');
const inputRef = ref();

watch(() => props.open, (val) => {
  if (val) {
    folderName.value = '';
    setTimeout(() => inputRef.value?.focus(), 100);
  }
});

const handleOk = () => {
  if (!folderName.value.trim()) return;
  emit('create', folderName.value.trim());
  emit('update:open', false);
};

const handleCancel = () => {
  emit('update:open', false);
};
</script>

<template>
  <Modal
    :open="open"
    title="新建文件夹"
    @ok="handleOk"
    @cancel="handleCancel"
    :okButtonProps="{ disabled: !folderName.trim() }"
  >
    <Form layout="vertical" class="mt-4">
      <FormItem label="文件夹名称">
        <Input 
          ref="inputRef"
          v-model:value="folderName" 
          placeholder="请输入文件夹名称"
          @pressEnter="handleOk"
        />
      </FormItem>
    </Form>
  </Modal>
</template>
