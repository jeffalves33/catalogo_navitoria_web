const CONFIG = {
  supabaseUrl: "https://szwkksgfelpxvdcqgaoh.supabase.co",
  supabaseAnonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN6d2trc2dmZWxweHZkY3FnYW9oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMxMTUwNjgsImV4cCI6MjA5ODY5MTA2OH0.DY5VzU-qOO5FxAwuXbm3_VvQF6oQ0VVfNJhWCn6wO9E",
  whatsappNumber: "5527999214164",
};

const state = {
  products: [],
  selectedCategory: "Todos",
  cart: new Map(),
};

const productsList = document.querySelector("#productsList");
const statusEl = document.querySelector("#status");
const categoryFilters = document.querySelector("#categoryFilters");
const cartBar = document.querySelector("#cartBar");
const cartCount = document.querySelector("#cartCount");
const whatsappButton = document.querySelector("#whatsappButton");
const productDialog = document.querySelector("#productDialog");
const dialogContent = document.querySelector("#dialogContent");
const closeDialog = document.querySelector("#closeDialog");

whatsappButton.addEventListener("click", () => {
  const items = [...state.cart.values()];
  const lines = items.map((product) => `- ${product.name} (${product.category}) - ${formatMoney(product.price)}`);
  const message = encodeURIComponent(`Ola! Tenho interesse nos produtos:\n${lines.join("\n")}`);
  window.open(`https://wa.me/${CONFIG.whatsappNumber}?text=${message}`, "_blank", "noopener,noreferrer");
});

closeDialog.addEventListener("click", () => productDialog.close());
productDialog.addEventListener("click", (event) => {
  if (event.target === productDialog) productDialog.close();
});

loadProducts();

async function loadProducts() {
  setStatus("Carregando catalogo...");

  try {
    const response = await fetch(`${CONFIG.supabaseUrl}/rest/v1/products?active=eq.true&select=*&order=sort_order.asc,created_at.desc`, {
      headers: {
        apikey: CONFIG.supabaseAnonKey,
        authorization: `Bearer ${CONFIG.supabaseAnonKey}`,
      },
    });

    if (!response.ok) {
      throw new Error(await response.text());
    }

    state.products = await response.json();
    setStatus("");
    render();
  } catch (error) {
    console.error(error);
    setStatus("Nao foi possivel carregar o catalogo.");
  }
}

function render() {
  renderCategories();
  renderProducts();
  renderCart();
}

function renderCategories() {
  const categories = ["Todos", ...new Set(state.products.map((product) => product.category).filter(Boolean))];

  categoryFilters.innerHTML = categories.map((category) => `
    <button class="category-chip ${category === state.selectedCategory ? "is-active" : ""}" type="button" data-category="${escapeAttribute(category)}">
      ${escapeHtml(category)}
    </button>
  `).join("");

  categoryFilters.querySelectorAll("button").forEach((button) => {
    button.addEventListener("click", () => {
      state.selectedCategory = button.dataset.category;
      render();
    });
  });
}

function renderProducts() {
  const products = getFilteredProducts();

  if (!products.length) {
    productsList.innerHTML = "";
    setStatus(state.products.length ? "Nenhum produto nessa categoria." : "Nenhum produto ativo no catalogo.");
    return;
  }

  setStatus("");
  productsList.innerHTML = products.map((product) => {
    const selected = state.cart.has(product.id);

    return `
      <article class="product-row">
        <button class="product-image" type="button" data-detail-id="${escapeAttribute(product.id)}" aria-label="Ver detalhes de ${escapeAttribute(product.name)}">
          ${product.image_url ? `<img src="${escapeAttribute(product.image_url)}" alt="${escapeAttribute(product.name)}" loading="lazy" />` : `<span class="image-placeholder">Sem imagem</span>`}
        </button>
        <div class="product-content">
          <span class="product-category">${escapeHtml(product.category || "Geral")}</span>
          <h2 class="product-name">${escapeHtml(product.name)}</h2>
          ${product.description ? `<p class="product-description">${escapeHtml(product.description)}</p>` : ""}
          <div class="product-meta">
            <strong class="product-price">${formatMoney(product.price)}</strong>
            <div class="row-actions">
              <button class="details-button" type="button" data-detail-id="${escapeAttribute(product.id)}">Detalhes</button>
              <button class="interest-button ${selected ? "is-selected" : ""}" type="button" data-product-id="${escapeAttribute(product.id)}">
                ${selected ? "Ok" : "Quero"}
              </button>
            </div>
          </div>
        </div>
      </article>
    `;
  }).join("");

  productsList.querySelectorAll(".interest-button").forEach((button) => {
    button.addEventListener("click", () => toggleCart(button.dataset.productId));
  });

  productsList.querySelectorAll("[data-detail-id]").forEach((button) => {
    button.addEventListener("click", () => openDetails(button.dataset.detailId));
  });
}

function renderCart() {
  const total = state.cart.size;
  cartBar.hidden = total === 0;
  cartCount.textContent = `${total} selecionado${total === 1 ? "" : "s"}`;
}

function getFilteredProducts() {
  return state.products.filter((product) => {
    return state.selectedCategory === "Todos" || product.category === state.selectedCategory;
  });
}

function toggleCart(productId) {
  const product = state.products.find((item) => item.id === productId);
  if (!product) return;

  if (state.cart.has(productId)) {
    state.cart.delete(productId);
  } else {
    state.cart.set(productId, product);
  }

  renderProducts();
  renderCart();
}

function openDetails(productId) {
  const product = state.products.find((item) => item.id === productId);
  if (!product) return;

  const features = Array.isArray(product.features) ? product.features.filter(Boolean) : [];
  const selected = state.cart.has(product.id);

  dialogContent.innerHTML = `
    <div class="dialog-image">
      ${product.image_url ? `<img src="${escapeAttribute(product.image_url)}" alt="${escapeAttribute(product.name)}" />` : `<span class="image-placeholder">Sem imagem</span>`}
    </div>
    <div class="dialog-body">
      <span class="product-category">${escapeHtml(product.category || "Geral")}</span>
      <h2>${escapeHtml(product.name)}</h2>
      <div class="dialog-price">${formatMoney(product.price)}</div>
      ${product.description ? `<p class="dialog-description">${escapeHtml(product.description)}</p>` : `<p class="dialog-description">Sem descricao cadastrada.</p>`}
      ${features.length ? `<ul class="features">${features.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>` : ""}
      <button class="interest-button ${selected ? "is-selected" : ""}" type="button" data-dialog-interest="${escapeAttribute(product.id)}">
        ${selected ? "Remover da lista" : "Tenho interesse"}
      </button>
    </div>
  `;

  dialogContent.querySelector("[data-dialog-interest]").addEventListener("click", (event) => {
    toggleCart(event.currentTarget.dataset.dialogInterest);
    productDialog.close();
  });

  productDialog.showModal();
}

function setStatus(message) {
  statusEl.textContent = message;
}

function formatMoney(value) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(value || 0));
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttribute(value) {
  return escapeHtml(value).replaceAll("`", "&#096;");
}
