const header = document.querySelector('.site-header');
const menu = document.querySelector('#mobile-menu');
const menuToggle = document.querySelector('.menu-toggle');
const menuClose = document.querySelector('.menu-close');
const modal = document.querySelector('#services-modal');
const lightbox = document.querySelector('#lightbox');

const CONFIG_KEY = 'clip-barber-config';
const DEFAULT_CONFIG = {
  whatsapp: '59898743328',
  instagram: 'https://www.instagram.com/clip_barber_studio/',
  city: 'Paysandú, Uruguay',
  address: '18 de Julio 1234, Paysandú',
  heroEyebrow: 'Más que un corte,',
  heroCopy: 'En CLIP Barber Studio combinamos técnica, actitud y pasión para que salgas siempre como te gusta.',
  services: ['Corte + Barba', 'Fade', 'Perfilado', 'Afeitado clásico', 'Diseño', 'Lavado y tratamientos capilares'],
  products: [
    { type: 'Fijación', name: 'Cera matte', description: 'Fijación flexible y acabado natural.', price: '' },
    { type: 'Volumen', name: 'Polvo texturizante', description: 'Volumen instantáneo, textura y acabado seco.', price: '' },
    { type: 'Cuidado', name: 'Aceite para barba', description: 'Suaviza, nutre y deja una barba prolija.', price: '' }
  ]
};

const readLocalConfig = () => {
  try { return JSON.parse(localStorage.getItem(CONFIG_KEY) || 'null'); }
  catch { return null; }
};

const text = (value, fallback = '', maxLength = 180) => String(value ?? fallback).trim().slice(0, maxLength);
const safeUrl = (value, fallback) => {
  try {
    const url = new URL(String(value));
    return ['https:', 'http:'].includes(url.protocol) ? url.href : fallback;
  } catch { return fallback; }
};
const normalizeConfig = (value = {}) => {
  const source = value && typeof value === 'object' ? value : {};
  const products = Array.isArray(source.products) ? source.products.slice(0, 12).map((product) => ({
    type: text(product?.type, 'Producto', 40),
    name: text(product?.name, 'Producto', 70),
    description: text(product?.description, '', 220),
    price: text(product?.price, '', 30)
  })).filter((product) => product.name && product.description) : DEFAULT_CONFIG.products;
  return {
    whatsapp: text(source.whatsapp, DEFAULT_CONFIG.whatsapp, 20).replace(/\D/g, ''),
    instagram: safeUrl(source.instagram, DEFAULT_CONFIG.instagram),
    city: text(source.city, DEFAULT_CONFIG.city, 80),
    address: text(source.address, DEFAULT_CONFIG.address, 140),
    heroEyebrow: text(source.heroEyebrow, DEFAULT_CONFIG.heroEyebrow, 80),
    heroCopy: text(source.heroCopy, DEFAULT_CONFIG.heroCopy, 300),
    services: Array.isArray(source.services) ? source.services.slice(0, 12).map((service) => text(service, '', 80)).filter(Boolean) : DEFAULT_CONFIG.services,
    products: products.length ? products : DEFAULT_CONFIG.products
  };
};

let siteConfig = normalizeConfig(readLocalConfig() || DEFAULT_CONFIG);
const safeWhatsapp = () => /^\d{8,15}$/.test(siteConfig.whatsapp) ? siteConfig.whatsapp : DEFAULT_CONFIG.whatsapp;

const renderProducts = () => {
  const grid = document.querySelector('.product-grid');
  const fragment = document.createDocumentFragment();
  siteConfig.products.forEach((product) => {
    const card = document.createElement('article');
    card.className = 'product-card reveal visible';
    const type = document.createElement('span');
    type.className = 'product-type';
    type.textContent = product.type;
    const name = document.createElement('h3');
    name.textContent = product.name;
    const description = document.createElement('p');
    description.textContent = product.description;
    card.append(type, name, description);
    if (product.price) {
      const price = document.createElement('strong');
      price.className = 'product-price';
      price.textContent = product.price;
      card.append(price);
    }
    const button = document.createElement('button');
    button.className = 'button button-outline add-product';
    button.type = 'button';
    button.dataset.product = product.name;
    button.textContent = 'Agregar';
    card.append(button);
    fragment.append(card);
  });
  grid.replaceChildren(fragment);
};

const applySiteConfig = () => {
  document.querySelectorAll('.instagram-link, a[href="#instagram"]').forEach((link) => {
    link.href = siteConfig.instagram;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
  });
  document.querySelector('.hero .eyebrow').textContent = siteConfig.heroEyebrow;
  document.querySelector('.hero-copy').textContent = siteConfig.heroCopy;
  document.querySelector('.footer-city').textContent = siteConfig.city;
  document.querySelector('.menu-note').textContent = siteConfig.city;
  document.querySelector('.detail span').textContent = siteConfig.address;
  const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${siteConfig.address}, ${siteConfig.city}`)}`;
  document.querySelectorAll('a[href*="google.com/maps/search"]').forEach((link) => { link.href = mapUrl; });
  const servicesList = document.querySelector('#services-modal ul');
  servicesList.replaceChildren(...siteConfig.services.map((service) => {
    const item = document.createElement('li');
    item.textContent = service;
    return item;
  }));
  renderProducts();
};

applySiteConfig();

const supabaseReady = window.CLIP_SUPABASE_URL && window.CLIP_SUPABASE_PUBLISHABLE_KEY && window.supabase;
if (supabaseReady) {
  const supabase = window.supabase.createClient(window.CLIP_SUPABASE_URL, window.CLIP_SUPABASE_PUBLISHABLE_KEY);
  supabase.from('site_config').select('data').eq('id', 'clip').single().then(({ data, error }) => {
    if (error || !data?.data) return;
    siteConfig = normalizeConfig(data.data);
    applySiteConfig();
    updateCart();
  });
}

const setMenu = (open) => {
  menu.classList.toggle('open', open);
  menu.setAttribute('aria-hidden', String(!open));
  menuToggle.setAttribute('aria-expanded', String(open));
  document.body.classList.toggle('modal-open', open);
};

menuToggle.addEventListener('click', () => setMenu(true));
menuClose.addEventListener('click', () => setMenu(false));
menu.querySelectorAll('a').forEach((link) => link.addEventListener('click', () => setMenu(false)));

window.addEventListener('scroll', () => header.classList.toggle('scrolled', window.scrollY > 24), { passive: true });

document.querySelector('[data-modal]').addEventListener('click', () => {
  modal.classList.add('open');
  modal.setAttribute('aria-hidden', 'false');
  modal.querySelector('.modal-close').focus();
});

const closeModal = (element) => {
  element.classList.remove('open');
  element.setAttribute('aria-hidden', 'true');
};

modal.querySelector('.modal-close').addEventListener('click', () => closeModal(modal));
document.querySelectorAll('[data-lightbox]').forEach((item) => item.addEventListener('click', () => {
  const image = lightbox.querySelector('img');
  image.src = item.dataset.lightbox;
  image.alt = item.querySelector('img').alt;
  lightbox.classList.add('open');
  lightbox.setAttribute('aria-hidden', 'false');
  lightbox.querySelector('.modal-close').focus();
}));
lightbox.querySelector('.modal-close').addEventListener('click', () => closeModal(lightbox));

document.addEventListener('keydown', (event) => {
  if (event.key !== 'Escape') return;
  setMenu(false);
  closeModal(modal);
  closeModal(lightbox);
});

const observer = new IntersectionObserver((entries) => entries.forEach((entry) => {
  if (entry.isIntersecting) observer.unobserve(entry.target);
  entry.target.classList.toggle('visible', entry.isIntersecting);
}), { threshold: 0.12 });
document.querySelectorAll('.reveal').forEach((element, index) => {
  element.style.transitionDelay = `${Math.min(index % 4, 3) * 80}ms`;
  observer.observe(element);
});

const cartList = document.querySelector('.cart-list');
const cartEmpty = document.querySelector('.cart-empty');
const clearCart = document.querySelector('.clear-cart');
const whatsappOrder = document.querySelector('.whatsapp-order');
const cart = new Map();

const updateCart = () => {
  const products = [...cart.entries()];
  const fragment = document.createDocumentFragment();
  products.forEach(([name, quantity]) => {
    const item = document.createElement('li');
    const label = document.createElement('span');
    label.append(document.createTextNode(`${name} `));
    const count = document.createElement('strong');
    count.textContent = `×${quantity}`;
    label.append(count);
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'remove-product';
    remove.dataset.product = name;
    remove.setAttribute('aria-label', `Quitar ${name}`);
    remove.textContent = 'Quitar';
    item.append(label, remove);
    fragment.append(item);
  });
  cartList.replaceChildren(fragment);
  cartEmpty.hidden = products.length > 0;
  clearCart.disabled = products.length === 0;

  const items = products.map(([name, quantity]) => `• ${name}  × ${quantity}`).join('\n');
  const message = products.length
    ? `Hola, CLIP Barber Studio 👋\n\n*Pedido de productos*\n━━━━━━━━━━━━━━\n${items}\n━━━━━━━━━━━━━━\n\n¿Me confirman disponibilidad y precio? Gracias.`
    : 'Hola, CLIP Barber Studio 👋\n\nQuiero consultar por sus productos.';
  whatsappOrder.href = `https://wa.me/${safeWhatsapp()}?text=${encodeURIComponent(message)}`;
};

document.querySelector('.product-grid').addEventListener('click', (event) => {
  const button = event.target.closest('.add-product');
  if (!button) return;
  const product = button.dataset.product;
  cart.set(product, (cart.get(product) || 0) + 1);
  updateCart();
});

cartList.addEventListener('click', (event) => {
  const button = event.target.closest('.remove-product');
  if (!button) return;
  const product = button.dataset.product;
  const quantity = cart.get(product);
  if (quantity > 1) cart.set(product, quantity - 1);
  else cart.delete(product);
  updateCart();
});

clearCart.addEventListener('click', () => {
  cart.clear();
  updateCart();
});

updateCart();
