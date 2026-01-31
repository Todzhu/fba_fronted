<script setup lang="ts">
import { ref, watch } from 'vue';
import { Modal, Input, Form, FormItem } from 'ant-design-vue';

interface Props {
  open: boolean;
  name: string;
}

const props = defineProps<Props>();
const emit = defineEmits(['update:open', 'ok']);

const fileName = ref('');
const inputRef = ref();

watch(() => props.open, (val) => {
  if (val) {
    fileName.value = props.name;
    setTimeout(() => inputRef.value?.focus(), 100);
  }
});

const handleOk = () => {
  if (!fileName.value.trim() || fileName.value === props.name) {
      emit('update:open', false);
      return;
  }
  emit('ok', fileName.value.trim());
  emit('update:open', false);
};

const handleCancel = () => {
  emit('update:open', false);
};
</script>

<template>
  <Modal
    :open="open"
    title="重命名"
    @ok="handleOk"
    @cancel="handleCancel"
    :okButtonProps="{ disabled: !fileName.trim() }"
  >
    <Form layout="vertical" class="mt-4">
      <FormItem label="文件名称">
        <Input 
          ref="inputRef"
          v-model:value="fileName" 
          placeholder="请输入名称"
          @pressEnter="handleOk"
        />
      </FormItem>
    </Form>
  </Modal>
</template>
