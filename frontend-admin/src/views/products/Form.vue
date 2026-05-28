<template>
  <el-drawer v-model="visible" :title="isEdit ? '编辑产品' : '新增产品'" size="600px" @close="resetForm">
    <el-form ref="formRef" :model="form" :rules="rules" label-width="100px" @submit.prevent="handleSave">
      <el-form-item label="中文名称" prop="nameCn">
        <el-input v-model="form.nameCn" />
      </el-form-item>
      <el-form-item label="英文名称" prop="nameEn">
        <el-input v-model="form.nameEn" />
      </el-form-item>
      <el-form-item label="分类" prop="categoryId">
        <el-select v-model="form.categoryId" placeholder="选择分类" style="width:100%">
          <el-option v-for="c in categories" :key="c.id" :label="c.nameCn" :value="c.id" />
        </el-select>
      </el-form-item>
      <el-form-item label="中文描述">
        <el-input v-model="form.descriptionCn" type="textarea" :rows="3" />
      </el-form-item>
      <el-form-item label="英文描述">
        <el-input v-model="form.descriptionEn" type="textarea" :rows="3" />
      </el-form-item>
      <el-form-item label="价格">
        <el-input v-model="form.price" placeholder="如: $199 或询价" />
      </el-form-item>
      <el-form-item label="产品图片">
        <div class="upload-row">
          <el-upload
            action="/admin/api/upload"
            :headers="{ Authorization: `Bearer ${token}` }"
            :show-file-list="false"
            :on-success="handleUploadSuccess"
            accept="image/*"
          >
            <el-button type="primary" size="small">
              <el-icon><Upload /></el-icon> 上传图片
            </el-button>
          </el-upload>
          <el-image v-if="form.mainImage" :src="form.mainImage" style="width:80px;height:80px;margin-left:12px" fit="cover" />
        </div>
      </el-form-item>
      <el-form-item label="规格参数">
        <el-input v-model="specText" type="textarea" :rows="6" placeholder='JSON 格式，如：{"容量":"800张","速度":"1500张/分"}' />
      </el-form-item>
      <el-form-item label="状态">
        <el-radio-group v-model="form.status">
          <el-radio :value="1">上架</el-radio>
          <el-radio :value="0">下架</el-radio>
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
import { products } from '../../api'
import { ElMessage } from 'element-plus'

const props = defineProps({
  visible: Boolean,
  product: Object,
  categories: Array
})

const emit = defineEmits(['update:visible', 'saved'])

const formRef = ref(null)
const saving = ref(false)
const token = localStorage.getItem('admin_token')

const defaultForm = { nameCn: '', nameEn: '', categoryId: null, descriptionCn: '', descriptionEn: '', price: '', mainImage: '', specifications: '', status: 1 }
const form = ref({ ...defaultForm })
const specText = ref('')

const isEdit = computed(() => !!props.product?.id)

const rules = {
  nameCn: [{ required: true, message: '请输入中文名称', trigger: 'blur' }],
  nameEn: [{ required: true, message: '请输入英文名称', trigger: 'blur' }],
  categoryId: [{ required: true, message: '请选择分类', trigger: 'change' }]
}

const visible = computed({
  get: () => props.visible,
  set: (v) => emit('update:visible', v)
})

watch(() => props.visible, (v) => {
  if (v) {
    if (props.product) {
      form.value = { ...props.product }
      try {
        specText.value = props.product.specifications ? JSON.stringify(JSON.parse(props.product.specifications), null, 2) : ''
      } catch { specText.value = '' }
    } else {
      form.value = { ...defaultForm }
      specText.value = ''
    }
  }
})

function handleUploadSuccess(res) {
  if (res.code === 200) {
    form.value.mainImage = res.data
    ElMessage.success('图片上传成功')
  }
}

function resetForm() {
  form.value = { ...defaultForm }
  specText.value = ''
}

async function handleSave() {
  if (!formRef.value) return
  await formRef.value.validate()
  saving.value = true
  try {
    // Parse specs JSON
    if (specText.value.trim()) {
      try {
        JSON.parse(specText.value) // validate
        form.value.specifications = specText.value
      } catch {
        ElMessage.error('规格参数 JSON 格式错误')
        saving.value = false
        return
      }
    } else {
      form.value.specifications = ''
    }

    if (isEdit.value) {
      await products.update(props.product.id, form.value)
      ElMessage.success('更新成功')
    } else {
      await products.create(form.value)
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
.upload-row {
  display: flex;
  align-items: center;
}
</style>
