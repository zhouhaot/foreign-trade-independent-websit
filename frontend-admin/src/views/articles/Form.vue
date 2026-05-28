<template>
  <el-drawer v-model="visible" :title="isEdit ? '编辑文章' : '新增文章'" size="650px">
    <el-form ref="formRef" :model="form" :rules="rules" label-width="100px" @submit.prevent="handleSave">
      <el-form-item label="中文标题" prop="titleCn">
        <el-input v-model="form.titleCn" />
      </el-form-item>
      <el-form-item label="英文标题" prop="titleEn">
        <el-input v-model="form.titleEn" />
      </el-form-item>
      <el-form-item label="封面图片">
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
          <el-image v-if="form.coverImage" :src="form.coverImage" style="width:60px;height:60px;margin-left:12px" fit="cover" />
        </div>
      </el-form-item>
      <el-form-item label="中文内容">
        <el-input v-model="form.contentCn" type="textarea" :rows="6" placeholder="支持 Markdown 格式" />
      </el-form-item>
      <el-form-item label="英文内容">
        <el-input v-model="form.contentEn" type="textarea" :rows="6" placeholder="Supports Markdown" />
      </el-form-item>
      <el-form-item label="状态">
        <el-radio-group v-model="form.status">
          <el-radio :value="1">发布</el-radio>
          <el-radio :value="0">草稿</el-radio>
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
import { articles } from '../../api'
import { ElMessage } from 'element-plus'

const props = defineProps({ visible: Boolean, article: Object })
const emit = defineEmits(['update:visible', 'saved'])

const formRef = ref(null)
const saving = ref(false)
const token = localStorage.getItem('admin_token')

const defaultForm = { titleCn: '', titleEn: '', contentCn: '', contentEn: '', coverImage: '', status: 1 }
const form = ref({ ...defaultForm })

const isEdit = computed(() => !!props.article?.id)
const visible = computed({ get: () => props.visible, set: v => emit('update:visible', v) })

const rules = {
  titleCn: [{ required: true, message: '请输入中文标题', trigger: 'blur' }],
  titleEn: [{ required: true, message: '请输入英文标题', trigger: 'blur' }]
}

watch(() => props.visible, v => {
  if (v) {
    form.value = props.article ? { ...props.article } : { ...defaultForm }
  }
})

function handleUploadSuccess(res) {
  if (res.code === 200) {
    form.value.coverImage = res.data
    ElMessage.success('图片上传成功')
  }
}

async function handleSave() {
  if (!formRef.value) return
  await formRef.value.validate()
  saving.value = true
  try {
    if (isEdit.value) {
      await articles.update(props.article.id, form.value)
      ElMessage.success('更新成功')
    } else {
      await articles.create(form.value)
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
