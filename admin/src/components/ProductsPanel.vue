<script setup lang="ts">
import { onMounted, reactive, ref } from "vue";
import { api, money } from "../api";
import type { PreviewNote, Product, Sku } from "../types";

const products = ref<Product[]>([]);
const notes = ref<PreviewNote[]>([]);
const error = ref("");
const loading = ref(true);
const saving = ref(false);

interface FormState {
  id: string;
  name: string;
  subtitle: string;
  category: string;
  priceYuan: number;
  image: string;
  preview: boolean;
  active: boolean;
  skus: Sku[];
}

const open = ref(false);
const form = reactive<FormState>({
  id: "",
  name: "",
  subtitle: "",
  category: "",
  priceYuan: 0,
  image: "/media/linen-jacket.svg",
  preview: false,
  active: true,
  skus: []
});

async function load() {
  loading.value = true;
  error.value = "";
  try {
    const [list, previewNotes] = await Promise.all([api.products(true), api.previewNotes()]);
    products.value = list;
    notes.value = previewNotes;
  } catch (err) {
    error.value = (err as Error).message;
  } finally {
    loading.value = false;
  }
}

onMounted(load);

function startCreate() {
  Object.assign(form, {
    id: "",
    name: "",
    subtitle: "",
    category: "外套",
    priceYuan: 0,
    image: "/media/linen-jacket.svg",
    preview: false,
    active: true,
    skus: [{ id: "", color: "", size: "", stock: 0 }]
  });
  open.value = true;
}

function startEdit(product: Product) {
  Object.assign(form, {
    id: product.id,
    name: product.name,
    subtitle: product.subtitle,
    category: product.category,
    priceYuan: product.price / 100,
    image: product.image,
    preview: product.preview,
    active: product.active,
    skus: product.skus.map((sku) => ({ ...sku }))
  });
  open.value = true;
}

function addSku() {
  form.skus.push({ id: "", color: "", size: "", stock: 0 });
}

function removeSku(index: number) {
  form.skus.splice(index, 1);
}

async function save() {
  saving.value = true;
  error.value = "";
  try {
    await api.saveProduct(
      {
        name: form.name,
        subtitle: form.subtitle,
        category: form.category,
        price: Math.round(Number(form.priceYuan) * 100),
        image: form.image,
        preview: form.preview,
        active: form.active,
        skus: form.skus
      },
      form.id || undefined
    );
    open.value = false;
    await load();
  } catch (err) {
    error.value = (err as Error).message;
  } finally {
    saving.value = false;
  }
}

async function toggle(product: Product, key: "active" | "preview") {
  try {
    await api.saveProduct({ ...product, [key]: !product[key] }, product.id);
    await load();
  } catch (err) {
    error.value = (err as Error).message;
  }
}
</script>

<template>
  <section class="panel">
    <header class="panel-head">
      <div>
        <h2>商品管理</h2>
        <p class="muted">新增 / 编辑商品、维护颜色尺码库存、上下架与新款预告。演示图片为本地占位图。</p>
      </div>
      <button class="primary" @click="startCreate">新增商品</button>
    </header>

    <p v-if="error" class="alert">{{ error }}</p>
    <p v-if="loading" class="muted">正在加载商品…</p>

    <table v-else class="table">
      <thead>
        <tr>
          <th>商品</th>
          <th>分类</th>
          <th>售价</th>
          <th>规格 / 库存</th>
          <th>状态</th>
          <th>操作</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="product in products" :key="product.id">
          <td>
            <div class="media">
              <img :src="product.image" :alt="product.name" />
              <div>
                <strong>{{ product.name }}</strong>
                <div class="muted">{{ product.subtitle || "—" }}</div>
              </div>
            </div>
          </td>
          <td>{{ product.category }}</td>
          <td>{{ money(product.price) }}</td>
          <td>
            <span v-for="sku in product.skus" :key="sku.id" class="chip">
              {{ sku.color }}/{{ sku.size }} · {{ sku.stock }}
            </span>
          </td>
          <td>
            <span class="badge" :class="{ on: product.active }">{{ product.active ? "已上架" : "已下架" }}</span>
            <span v-if="product.preview" class="badge dark">新款预告</span>
          </td>
          <td class="actions">
            <button @click="startEdit(product)">编辑</button>
            <button @click="toggle(product, 'active')">{{ product.active ? "下架" : "上架" }}</button>
            <button @click="toggle(product, 'preview')">
              {{ product.preview ? "取消预告" : "设为预告" }}
            </button>
          </td>
        </tr>
      </tbody>
    </table>

    <h3 class="sub-title">新款预定意向 <span class="muted">{{ notes.length }} 条</span></h3>
    <p v-if="!notes.length" class="muted">暂无顾客登记预定意向。</p>
    <table v-else class="table">
      <thead>
        <tr>
          <th>编号</th>
          <th>新款</th>
          <th>期望规格</th>
          <th>联系方式</th>
          <th>登记时间</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="note in notes" :key="note.id">
          <td>{{ note.id }}</td>
          <td>{{ note.productName }}</td>
          <td>{{ note.skuHint || "未指定" }}</td>
          <td>{{ note.contact }}</td>
          <td>{{ note.createdAt.replace("T", " ").slice(0, 16) }}</td>
        </tr>
      </tbody>
    </table>

    <div v-if="open" class="modal-mask" @click.self="open = false">
      <div class="modal">
        <h3>{{ form.id ? "编辑商品" : "新增商品" }}</h3>
        <div class="grid-2">
          <label>商品名称<input v-model="form.name" placeholder="例如 亚麻轻旅西装" /></label>
          <label>分类<input v-model="form.category" placeholder="例如 外套" /></label>
          <label>副标题<input v-model="form.subtitle" placeholder="例如 轻盈廓形 / 春秋常备" /></label>
          <label>售价（元）<input v-model.number="form.priceYuan" type="number" min="0.01" step="0.01" /></label>
          <label>
            图片地址
            <select v-model="form.image">
              <option value="/media/linen-jacket.svg">亚麻轻旅西装（占位）</option>
              <option value="/media/cotton-dress.svg">棉质收腰连衣裙（占位）</option>
              <option value="/media/trench.svg">城市漫游风衣（占位）</option>
            </select>
          </label>
          <div class="switches">
            <label class="inline"><input v-model="form.active" type="checkbox" /> 上架销售</label>
            <label class="inline"><input v-model="form.preview" type="checkbox" /> 标记为「新款预告」</label>
          </div>
        </div>

        <h4>颜色 / 尺码 / 库存</h4>
        <div v-for="(sku, index) in form.skus" :key="index" class="sku-row">
          <input v-model="sku.color" placeholder="颜色" />
          <input v-model="sku.size" placeholder="尺码" />
          <input v-model.number="sku.stock" type="number" min="0" placeholder="库存" />
          <button class="ghost" @click="removeSku(index)">删除</button>
        </div>
        <button class="ghost" @click="addSku">+ 添加规格</button>

        <footer class="modal-foot">
          <button class="ghost" @click="open = false">取消</button>
          <button class="primary" :disabled="saving" @click="save">
            {{ saving ? "保存中…" : "保存" }}
          </button>
        </footer>
      </div>
    </div>
  </section>
</template>
