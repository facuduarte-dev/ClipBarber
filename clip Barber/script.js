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
  address: 'Andresito 1464, Paysandú',
  heroEyebrow: 'Más que un corte,',
  heroCopy: 'En CLIP Barber Studio combinamos técnica, actitud y pasión para que salgas siempre como te gusta.',
  services: ['Corte + Barba', 'Fade', 'Perfilado', 'Afeitado clásico', 'Diseño', 'Lavado y tratamientos capilares'],
  products: [
    { type: 'Fijación', name: 'Cera matte', description: 'Fijación flexible y acabado natural.', price: '' },
    { type: 'Volumen', name: 'Polvo texturizante', description: 'Volumen instantáneo, textura y acabado seco.', price: '' },
    { type: 'Cuidado', name: 'Aceite para barba', description: 'Suaviza, nutre y deja una barba prolija.', price: '' }
  ],
  gallery: [
    'https://images.unsplash.com/photo-1621605815971-fbc98d665033?auto=format&fit=crop&w=1200&q=85',
    'https://images.unsplash.com/photo-1599351431202-1e0f0137899a?auto=format&fit=crop&w=1200&q=85',
    'https://images.unsplash.com/photo-1622286342621-4bd786c2447c?auto=format&fit=crop&w=1200&q=85'
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
const safeImageUrl = (value) => {
  try {
    const url = new URL(String(value));
    return url.protocol === 'https:' ? url.href : '';
  } catch { return ''; }
};
const normalizeConfig = (value = {}) => {
  const source = value && typeof value === 'object' ? value : {};
  const products = Array.isArray(source.products) ? source.products.slice(0, 12).map((product) => ({
    type: text(product?.type, 'Producto', 40),
    name: text(product?.name, 'Producto', 70),
    description: text(product?.description, '', 220),
    price: text(product?.price, '', 30)
  })).filter((product) => product.name && product.description) : DEFAULT_CONFIG.products;
  const address = text(source.address, DEFAULT_CONFIG.address, 140);
  return {
    whatsapp: text(source.whatsapp, DEFAULT_CONFIG.whatsapp, 20).replace(/\D/g, ''),
    instagram: safeUrl(source.instagram, DEFAULT_CONFIG.instagram),
    city: text(source.city, DEFAULT_CONFIG.city, 80),
    address: ['18 de Julio 1234, Paysandú', 'Artesito 1464, Paysandú'].includes(address) ? DEFAULT_CONFIG.address : address,
    heroEyebrow: text(source.heroEyebrow, DEFAULT_CONFIG.heroEyebrow, 80),
    heroCopy: text(source.heroCopy, DEFAULT_CONFIG.heroCopy, 300),
    services: Array.isArray(source.services) ? source.services.slice(0, 12).map((service) => text(service, '', 80)).filter(Boolean) : DEFAULT_CONFIG.services,
    products: products.length ? products : DEFAULT_CONFIG.products,
    gallery: Array.isArray(source.gallery) ? source.gallery.slice(0, 12).map(safeImageUrl).filter(Boolean) : DEFAULT_CONFIG.gallery
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

const renderGallery = () => {
  const grid = document.querySelector('.gallery-grid');
  const fragment = document.createDocumentFragment();
  siteConfig.gallery.forEach((url, index) => {
    const item = document.createElement('button');
    item.className = 'gallery-item reveal visible';
    item.type = 'button';
    item.dataset.lightbox = url;
    const image = document.createElement('img');
    image.src = url;
    image.alt = `Trabajo de CLIP Barber Studio ${index + 1}`;
    image.loading = 'lazy';
    item.append(image);
    fragment.append(item);
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
  const mapUrl = 'https://maps.app.goo.gl/f1CQpPvSQQpVAWu78';
  document.querySelectorAll('.location-info .button, .map-open').forEach((link) => { link.href = mapUrl; });
  const mapEmbed = document.querySelector('#map-embed');
  if (mapEmbed) mapEmbed.src = 'https://www.google.com/maps?q=-32.3030081%2C-58.0730326&z=20&output=embed';
  renderProducts();
  renderGallery();
};

applySiteConfig();

const supabaseReady = window.CLIP_SUPABASE_URL && window.CLIP_SUPABASE_PUBLISHABLE_KEY && window.supabase;
let siteSupabase = null;
if (supabaseReady) {
  siteSupabase = window.supabase.createClient(window.CLIP_SUPABASE_URL, window.CLIP_SUPABASE_PUBLISHABLE_KEY);
  siteSupabase.from('site_config').select('data').eq('id', 'clip').single().then(({ data, error }) => {
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

const modalTrigger = document.querySelector('[data-modal]');
if (modalTrigger && modal) modalTrigger.addEventListener('click', () => {
  modal.classList.add('open');
  modal.setAttribute('aria-hidden', 'false');
  modal.querySelector('.modal-close').focus();
});

const closeModal = (element) => {
  element.classList.remove('open');
  element.setAttribute('aria-hidden', 'true');
};

if (modal) modal.querySelector('.modal-close').addEventListener('click', () => closeModal(modal));
document.querySelector('.gallery-grid').addEventListener('click', (event) => {
  const item = event.target.closest('[data-lightbox]');
  if (!item) return;
  const image = lightbox.querySelector('img');
  image.src = item.dataset.lightbox;
  image.alt = item.querySelector('img').alt;
  lightbox.classList.add('open');
  lightbox.setAttribute('aria-hidden', 'false');
  lightbox.querySelector('.modal-close').focus();
});
lightbox.querySelector('.modal-close').addEventListener('click', () => closeModal(lightbox));

document.addEventListener('keydown', (event) => {
  if (event.key !== 'Escape') return;
  setMenu(false);
  if (modal) closeModal(modal);
  closeModal(lightbox);
  if (typeof closeCartModal === 'function') closeCartModal();
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
const floatingCart = document.querySelector('#floating-cart');
const floatingCartCount = document.querySelector('.floating-cart-count');
const shoppingCart = document.querySelector('#shopping-cart');
const cartModal = document.querySelector('#cart-modal');
const cartModalSlot = document.querySelector('#cart-modal-slot');
const cartModalClose = document.querySelector('#cart-modal-close');
const cartHome = shoppingCart.parentElement;
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
  const totalItems = products.reduce((total, [, quantity]) => total + quantity, 0);
  floatingCartCount.textContent = String(totalItems);
  floatingCartCount.hidden = totalItems === 0;
  floatingCart.setAttribute('aria-label', totalItems ? `Abrir carrito, ${totalItems} producto${totalItems === 1 ? '' : 's'}` : 'Abrir carrito');

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

floatingCart.addEventListener('click', () => {
  cartModalSlot.append(shoppingCart);
  shoppingCart.classList.add('visible');
  cartModal.classList.add('open');
  cartModal.setAttribute('aria-hidden', 'false');
  document.body.classList.add('modal-open');
  cartModalClose.focus();
});

const closeCartModal = () => {
  if (!cartModal.classList.contains('open')) return;
  cartHome.append(shoppingCart);
  cartModal.classList.remove('open');
  cartModal.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('modal-open');
  floatingCart.focus();
};

cartModalClose.addEventListener('click', closeCartModal);

updateCart();

const bookingForm = document.querySelector('#booking-form');
if (bookingForm) {
  const bookingDate = document.querySelector('#booking-date');
  const bookingTime = document.querySelector('#booking-time');
  const bookingName = document.querySelector('#booking-name');
  const bookingPhone = document.querySelector('#booking-phone');
  const bookingService = document.querySelector('#booking-service');
  const bookingWebsite = document.querySelector('#booking-website');
  const bookingStatus = document.querySelector('#booking-status');
  const bookingSubmit = document.querySelector('#booking-submit');
  const bookingCaptcha = document.querySelector('#booking-captcha');
  let captchaToken = '';
  let captchaWidget;
  const dateValue = (date) => {
    const offset = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() - offset).toISOString().slice(0, 10);
  };
  const isWeekend = (value) => [0, 6].includes(new Date(`${value}T12:00:00`).getDay());
  const nextWeekend = () => {
    const date = new Date();
    date.setHours(12, 0, 0, 0);
    const daysUntilSaturday = (6 - date.getDay() + 7) % 7 || 7;
    date.setDate(date.getDate() + daysUntilSaturday);
    return dateValue(date);
  };
  const populateBookingDates = () => {
    const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const monthNames = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
    const firstSaturday = new Date(`${nextWeekend()}T12:00:00`);
    const options = Array.from({ length: 10 }, (_, index) => {
      const date = new Date(firstSaturday);
      date.setDate(firstSaturday.getDate() + (Math.floor(index / 2) * 7) + (index % 2));
      const label = `${dayNames[date.getDay()]} ${date.getDate()} de ${monthNames[date.getMonth()]}`;
      return new Option(label, dateValue(date));
    });
    bookingDate.replaceChildren(...options);
  };
  const setBookingStatus = (message, type = '') => {
    bookingStatus.textContent = message;
    bookingStatus.className = `booking-status ${type}`.trim();
  };
  const updateBookingButton = () => {
    bookingSubmit.disabled = bookingTime.disabled || !bookingTime.value || !captchaToken;
  };
  const setupCaptcha = () => {
    const siteKey = window.CLIP_TURNSTILE_SITE_KEY;
    if (!siteKey) {
      setBookingStatus('Las reservas todavía no están habilitadas.', 'error');
      return;
    }
    if (!window.turnstile) {
      window.setTimeout(setupCaptcha, 150);
      return;
    }
    if (captchaWidget !== undefined) return;
    captchaWidget = window.turnstile.render(bookingCaptcha, {
      sitekey: siteKey,
      callback: (token) => { captchaToken = token; updateBookingButton(); },
      'expired-callback': () => { captchaToken = ''; updateBookingButton(); },
      'error-callback': () => { captchaToken = ''; updateBookingButton(); setBookingStatus('No se pudo verificar la reserva. Recargá la página.', 'error'); }
    });
  };
  const loadAvailableSlots = async () => {
    const date = bookingDate.value;
    bookingTime.replaceChildren(new Option('Cargando horarios…', ''));
    bookingTime.disabled = true;
    bookingSubmit.disabled = true;
    if (!isWeekend(date)) {
      setBookingStatus('Elegí un sábado o domingo para reservar tu turno.', 'error');
      bookingTime.replaceChildren(new Option('Elegí un sábado o domingo', ''));
      return;
    }
    if (!siteSupabase) {
      setBookingStatus('Los turnos todavía no están habilitados.', 'error');
      bookingTime.replaceChildren(new Option('Turnos no disponibles', ''));
      return;
    }
    const { data, error } = await siteSupabase.rpc('available_weekend_slots', { p_booking_date: date });
    if (error) {
      setBookingStatus('No pudimos cargar los horarios. Probá de nuevo en unos minutos.', 'error');
      bookingTime.replaceChildren(new Option('Horarios no disponibles', ''));
      return;
    }
    if (!data?.length) {
      setBookingStatus('No hay horarios disponibles para ese día.', 'error');
      bookingTime.replaceChildren(new Option('Sin horarios disponibles', ''));
      return;
    }
    bookingTime.replaceChildren(new Option('Elegí un horario', ''), ...data.map(({ booking_time }) => {
      const time = String(booking_time).slice(0, 5);
      return new Option(time, time);
    }));
    bookingTime.disabled = false;
    updateBookingButton();
    setBookingStatus(`${data.length} horarios disponibles para este día.`, 'success');
  };

  populateBookingDates();
  bookingDate.addEventListener('change', loadAvailableSlots);
  bookingTime.addEventListener('change', updateBookingButton);
  bookingForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const name = bookingName.value.trim();
    const phone = bookingPhone.value.replace(/\D/g, '');
    if (!name || !/^\d{8,15}$/.test(phone) || !bookingTime.value) {
      setBookingStatus('Completá tu nombre, WhatsApp y horario para reservar.', 'error');
      return;
    }
    if (!captchaToken) { setBookingStatus('Completá la verificación de seguridad para reservar.', 'error'); return; }
    bookingSubmit.disabled = true;
    setBookingStatus('Guardando tu turno…');
    const { data, error } = await siteSupabase.functions.invoke('create-appointment', {
      body: { bookingDate: bookingDate.value, bookingTime: bookingTime.value, clientName: name, clientPhone: phone, service: bookingService.value, website: bookingWebsite.value, turnstileToken: captchaToken }
    });
    if (error || !data?.ok) {
      let message = data?.error || '';
      if (!message && error?.context instanceof Response) {
        const payload = await error.context.clone().json().catch(() => null);
        message = payload?.error || '';
      }
      const friendlyError = message.includes('Horario') ? 'Ese horario acaba de ocuparse. Elegí otro.' : message || 'No pudimos reservar el turno. Probá nuevamente.';
      captchaToken = '';
      if (captchaWidget !== undefined && window.turnstile) window.turnstile.reset(captchaWidget);
      await loadAvailableSlots();
      setBookingStatus(friendlyError, 'error');
      return;
    }
    bookingName.value = '';
    bookingPhone.value = '';
    captchaToken = '';
    if (captchaWidget !== undefined && window.turnstile) window.turnstile.reset(captchaWidget);
    setBookingStatus('¡Turno reservado! Te esperamos en CLIP Barber Studio.', 'success');
    await loadAvailableSlots();
  });
  setupCaptcha();
  loadAvailableSlots();
}
