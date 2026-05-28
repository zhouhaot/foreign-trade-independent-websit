<template>
  <el-drawer v-model="visible" :title="isEdit ? '编辑轮播图' : '新增轮播图'" size="500px">
    <el-form ref="formRef" :model="form" :rules="rules" label-width="100px" @submit.prevent="handleSave">
      <el-form-item label="图片">
        <div class="upload-row">
          <el-upload
            action="/admin/api/upload"
            :headers="{ Authorization: `Bearer ${token}` }"
            :show-file-list="false"
            :on-success="handleUploadSuccess"
            accept="image/*"
          >
            <el-button type="primary" size="small"><el-icon><Upload /></el-icon> 上传</el-button>
          </el-upload>
          <el-image v-if="form.image" :src="form.image" style="width:120px;height:68px;margin-left:12px" fit="cover" />
        </div>
      </el-form-item>
      <el-form-item label="中文标题" prop="titleCn">
        <el-input v-model="form.titleCn" />
      </el-form-item>
      <el-form-item label="英文标题" prop="titleEn">
        <el-input v-model="form.titleEn" />
      </el-form-item>
      <el-form-item label="中文副标题">
        <el-input v-model="form.subtitleCn" />
      </el-form-item>
      <el-form-item label="英文副标题">
        <el-input v-model="form.subtitleEn" />
      </el-form-item>
      <el-form-item label="链接地址">
        <el-input v-model="form.linkUrl" placeholder="/products" />
      </el-form-item>
      <el-form-item label="排序">
        <el-input-number v-model="form.sortOrder" :min="0" />
      </el-form-item>
      <el-form-item label="状态">
        <el-radio-group v-model="form.status">
          <el-radio :value="1">启用</el-radio>
          <el-radio :value="0">禁用</el-radio>
        </el-radio-group>
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
import { banners } from '../../api'
import { ElMessage } from 'element-plus'

const props = defineProps({ visible: Boolean, banner: Object })
const emit = defineEmits(['update:visible', 'saved'])

const formRef = ref(null)
const saving = ref(false)
const token = localStorage.getItem('admin_token')

const defaultForm = { titleCn: '', titleEn: '', subtitleCn: '', subtitleEn: '', image: '', linkUrl: '', sortOrder: 0, status: 1 }
const form = ref({ ...defaultForm })

const isEdit = computed(() => !!props.banner?.id)
const visible = computed({ get: () => props.visible, set: v => emit('update:visible', v) })

const rules = {
  titleCn: [{ required: true, message: '请输入中文标题', trigger: 'blur' }],
  titleEn: [{ required: true, message: '请输入英文标题', trigger: 'blur' }]
}

watch(() => props.visible, v => {
  if (v) {
    form.value = props.banner ? { ...props.banner } : { ...defaultForm }
  }
})

function handleUploadSuccess(res) {
  if (res.code === 200) {
    form.value.image = res.data
    ElMessage.success('图片上传成功')
  }
}

async function handleSave() {
  if (!formRef.value) return
  await formRef.value.validate()
  saving.value = true
  try {
    if (isEdit.value) {
      await banners.update(props.banner.id, form.value)
      ElMessage.success('更新成功')
    } else {
      await banners.create(form.value)
      ElMessage.success('创建成功')
    }
    emit('saved')
    visible.value = false
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.upload-row { display: flex; align-items: center; }
</style>
