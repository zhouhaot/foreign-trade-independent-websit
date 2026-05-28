<template>
  <el-drawer v-model="visible" :title="isEdit ? '编辑分类' : '新增分类'" size="420px">
    <el-form ref="formRef" :model="form" :rules="rules" label-width="100px" @submit.prevent="handleSave">
      <el-form-item label="中文名称" prop="nameCn">
        <el-input v-model="form.nameCn" />
      </el-form-item>
      <el-form-item label="英文名称" prop="nameEn">
        <el-input v-model="form.nameEn" />
      </el-form-item>
      <el-form-item>
        <el-button type="primary" native-type="submit" :loading="saving">保存</el-button>
        <el-button @click="visible = false">取消</el-button>
      </el-form-item>
    </el-form>
  </el-drawer>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { categories } from '../../api'
import { ElMessage } from 'element-plus'

const props = defineProps({ visible: Boolean, category: Object })
const emit = defineEmits(['update:visible', 'saved'])

const formRef = ref(null)
const saving = ref(false)
const defaultForm = { nameCn: '', nameEn: '' }
const form = ref({ ...defaultForm })

const isEdit = computed(() => !!props.category?.id)
const visible = computed({ get: () => props.visible, set: v => emit('update:visible', v) })

const rules = {
  nameCn: [{ required: true, message: '请输入中文名称', trigger: 'blur' }],
  nameEn: [{ required: true, message: '请输入英文名称', trigger: 'blur' }]
}

watch(() => props.visible, v => {
  if (v) {
    form.value = props.category ? { ...props.category } : { ...defaultForm }
  }
})

async function handleSave() {
  if (!formRef.value) return
  await formRef.value.validate()
  saving.value = true
  try {
    if (isEdit.value) {
      await categories.update(props.category.id, form.value)
      ElMessage.success('更新成功')
    } else {
      await categories.create(form.value)
      ElMessage.success('创建成功')
    }
    emit('saved')
    visible.value = false
  } finally {
    saving.value = false
  }
}
</script>
