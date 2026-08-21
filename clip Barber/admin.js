const CONFIG_KEY = 'clip-barber-config';
const DEFAULT_CONFIG = {
  whatsapp: '59898743328', instagram: 'https://www.instagram.com/clip_barber_studio/', city: 'Paysandú, Uruguay', address: 'Andresito 1464, Paysandú', heroEyebrow: 'Más que un corte,', heroCopy: 'En CLIP Barber Studio combinamos técnica, actitud y pasión para que salgas siempre como te gusta.',
  services: ['Corte + Barba', 'Fade', 'Perfilado', 'Afeitado clásico', 'Diseño', 'Lavado y tratamientos capilares'],
  products: [{ type: 'Fijación', name: 'Cera matte', description: 'Fijación flexible y acabado natural.', price: '' }, { type: 'Volumen', name: 'Polvo texturizante', description: 'Volumen instantáneo, textura y acabado seco.', price: '' }, { type: 'Cuidado', name: 'Aceite para barba', description: 'Suaviza, nutre y deja una barba prolija.', price: '' }],
  gallery: ['https://images.unsplash.com/photo-1621605815971-fbc98d665033?auto=format&fit=crop&w=1200&q=85', 'https://images.unsplash.com/photo-1599351431202-1e0f0137899a?auto=format&fit=crop&w=1200&q=85', 'https://images.unsplash.com/photo-1622286342621-4bd786c2447c?auto=format&fit=crop&w=1200&q=85']
};
const form = document.querySelector('#admin-form');
const editor = document.querySelector('#products-editor');
const template = document.querySelector('#product-template');
const status = document.querySelector('#save-status');
const readLocalConfig = () => {
  try { return JSON.parse(localStorage.getItem(CONFIG_KEY) || 'null'); }
  catch { return null; }
};
const config = { ...DEFAULT_CONFIG, ...(readLocalConfig() || {}) };
const authStatus = document.querySelector('#auth-status');
const loginButton = document.querySelector('#login-button');
const logoutButton = document.querySelector('#logout-button');
const saturdayEnabled = document.querySelector('#saturday-enabled');
const saturdayStart = document.querySelector('#saturday-start');
const saturdayEnd = document.querySelector('#saturday-end');
const saturdaySlotMinutes = document.querySelector('#saturday-slot-minutes');
const sundayEnabled = document.querySelector('#sunday-enabled');
const sundayStart = document.querySelector('#sunday-start');
const sundayEnd = document.querySelector('#sunday-end');
const sundaySlotMinutes = document.querySelector('#sunday-slot-minutes');
const scheduleStatus = document.querySelector('#schedule-status');
const appointmentsEmpty = document.querySelector('#appointments-empty');
const appointmentsTableWrap = document.querySelector('.appointments-table-wrap');
const appointmentsBody = document.querySelector('#appointments-table tbody');
const galleryUpload = document.querySelector('#gallery-upload');
const galleryEditor = document.querySelector('#gallery-editor');
const galleryStatus = document.querySelector('#gallery-status');
const supabaseClient = window.CLIP_SUPABASE_URL && window.CLIP_SUPABASE_PUBLISHABLE_KEY && window.supabase
  ? window.supabase.createClient(window.CLIP_SUPABASE_URL, window.CLIP_SUPABASE_PUBLISHABLE_KEY)
  : null;

const cleanText = (value, maxLength) => String(value || '').trim().slice(0, maxLength);
const cleanUrl = (value) => {
  try {
    const url = new URL(value);
    return ['https:', 'http:'].includes(url.protocol) ? url.href : '';
  } catch { return ''; }
};
const cleanImageUrl = (value) => {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' ? url.href : '';
  } catch { return ''; }
};
let galleryUrls = [];

const setAuthState = (session) => {
  loginButton.hidden = Boolean(session);
  logoutButton.hidden = !session;
  document.querySelector('#login-fields').hidden = Boolean(session);
  form.hidden = !session;
  authStatus.textContent = session ? `Conectado como ${session.user.email}. Los cambios se guardan online.` : (supabaseClient ? 'Ingresá para guardar los cambios online.' : 'Modo demo activo. Configurá Supabase para guardar online.');
  if (session) {
    loadWeekendSchedule();
    loadAppointments();
  }
};

if (supabaseClient) {
  supabaseClient.auth.getSession().then(({ data }) => setAuthState(data.session));
  loginButton.addEventListener('click', async () => {
    const { error } = await supabaseClient.auth.signInWithPassword({ email: document.querySelector('#admin-email').value, password: document.querySelector('#admin-password').value });
    if (error) { authStatus.textContent = error.message; return; }
    const { data } = await supabaseClient.auth.getSession();
    setAuthState(data.session);
  });
  logoutButton.addEventListener('click', async () => { await supabaseClient.auth.signOut(); setAuthState(null); });
} else {
  form.hidden = true;
  authStatus.textContent = 'El panel todavía no está conectado. Configurá Supabase para habilitar el acceso seguro.';
}

const addProductEditor = (product = { type: '', name: '', description: '', price: '' }) => {
  const fragment = template.content.cloneNode(true);
  const card = fragment.querySelector('.product-editor');
  Object.entries(product).forEach(([key, value]) => { card.querySelector(`[data-field="${key}"]`).value = value; });
  editor.append(card);
};

const populateForm = (values) => {
  ['whatsapp', 'instagram', 'city', 'address', 'heroEyebrow', 'heroCopy'].forEach((field) => { form.elements[field].value = values[field] || ''; });
  editor.replaceChildren();
  (values.products || []).forEach(addProductEditor);
  galleryUrls = (Array.isArray(values.gallery) ? values.gallery : DEFAULT_CONFIG.gallery).map(cleanImageUrl).filter(Boolean).slice(0, 12);
  renderGalleryEditor();
};

function renderGalleryEditor() {
  galleryEditor.replaceChildren();
  galleryUrls.forEach((url, index) => {
    const card = document.createElement('div');
    card.className = 'gallery-editor-item';
    const image = document.createElement('img');
    image.src = url;
    image.alt = `Foto de trabajo ${index + 1}`;
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.dataset.galleryIndex = String(index);
    remove.textContent = 'Quitar';
    card.append(image, remove);
    galleryEditor.append(card);
  });
}

populateForm(config);
if (supabaseClient) {
  supabaseClient.from('site_config').select('data').eq('id', 'clip').single().then(({ data }) => {
    if (!data?.data) return;
    Object.assign(config, data.data);
    if (['18 de Julio 1234, Paysandú', 'Artesito 1464, Paysandú'].includes(config.address)) config.address = DEFAULT_CONFIG.address;
    populateForm(config);
  });
}

document.querySelector('#add-product').addEventListener('click', () => addProductEditor());
editor.addEventListener('click', (event) => event.target.closest('.remove-product')?.closest('.product-editor').remove());
galleryEditor.addEventListener('click', (event) => {
  const button = event.target.closest('[data-gallery-index]');
  if (!button) return;
  galleryUrls.splice(Number(button.dataset.galleryIndex), 1);
  renderGalleryEditor();
});
galleryUpload.addEventListener('change', async () => {
  const files = [...galleryUpload.files];
  const { data: { session } } = supabaseClient ? await supabaseClient.auth.getSession() : { data: { session: null } };
  if (!session) { galleryStatus.textContent = 'Iniciá sesión para subir fotos.'; return; }
  const available = 12 - galleryUrls.length;
  const validFiles = files.slice(0, available).filter((file) => ['image/jpeg', 'image/png', 'image/webp'].includes(file.type) && file.size <= 8 * 1024 * 1024);
  if (!validFiles.length) { galleryStatus.textContent = 'Elegí fotos JPG, PNG o WEBP de hasta 8 MB.'; return; }
  galleryStatus.textContent = 'Subiendo fotos…';
  for (const file of validFiles) {
    const extension = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
    const path = `gallery/${Date.now()}-${crypto.randomUUID()}.${extension}`;
    const { error } = await supabaseClient.storage.from('gallery').upload(path, file, { contentType: file.type, upsert: false });
    if (error) { galleryStatus.textContent = 'No se pudo subir una de las fotos. Verificá Storage en Supabase.'; continue; }
    const { data } = supabaseClient.storage.from('gallery').getPublicUrl(path);
    galleryUrls.push(data.publicUrl);
  }
  galleryUpload.value = '';
  renderGalleryEditor();
  galleryStatus.textContent = 'Fotos cargadas. Tocá “Guardar cambios” para publicarlas.';
});

const setScheduleStatus = (message, type = '') => {
  scheduleStatus.textContent = message;
  scheduleStatus.className = `storage-note ${type}`.trim();
};
const formatDate = (value) => new Intl.DateTimeFormat('es-UY', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(`${value}T12:00:00`));
const renderAppointments = (appointments) => {
  appointmentsBody.replaceChildren();
  const labels = ['Fecha', 'Hora', 'Nombre', 'WhatsApp', 'Servicio'];
  appointments.forEach((appointment) => {
    const row = document.createElement('tr');
    const values = [formatDate(appointment.booking_date), String(appointment.booking_time).slice(0, 5), appointment.client_name, appointment.client_phone, appointment.service];
    values.forEach((value, index) => {
      const cell = document.createElement('td');
      cell.dataset.label = labels[index];
      if (index === 3) {
        const link = document.createElement('a');
        link.href = `https://wa.me/${String(value).replace(/\D/g, '')}`;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.textContent = value;
        cell.append(link);
      } else cell.textContent = value;
      row.append(cell);
    });
    const actionCell = document.createElement('td');
    actionCell.dataset.label = 'Acción';
    const cancelButton = document.createElement('button');
    cancelButton.type = 'button';
    cancelButton.className = 'danger appointment-cancel';
    cancelButton.dataset.appointmentId = String(appointment.id);
    cancelButton.dataset.appointmentLabel = `${formatDate(appointment.booking_date)} a las ${String(appointment.booking_time).slice(0, 5)} — ${appointment.client_name}`;
    cancelButton.textContent = 'Cancelar';
    actionCell.append(cancelButton);
    row.append(actionCell);
    appointmentsBody.append(row);
  });
  appointmentsEmpty.hidden = appointments.length > 0;
  appointmentsTableWrap.hidden = appointments.length === 0;
};
const loadWeekendSchedule = async () => {
  if (!supabaseClient) return;
  const { data, error } = await supabaseClient.from('sunday_schedule').select('*').in('id', ['saturday', 'sunday']);
  if (error) { setScheduleStatus('Falta activar el módulo de turnos en Supabase.'); return; }
  const schedules = Object.fromEntries((data || []).map((schedule) => [schedule.id, schedule]));
  if (!schedules.saturday || !schedules.sunday) { setScheduleStatus('Actualizá el módulo de turnos en Supabase para habilitar sábados y domingos.'); return; }
  saturdayEnabled.checked = schedules.saturday.enabled;
  saturdayStart.value = String(schedules.saturday.start_time).slice(0, 5);
  saturdayEnd.value = String(schedules.saturday.end_time).slice(0, 5);
  saturdaySlotMinutes.value = String(schedules.saturday.slot_minutes);
  sundayEnabled.checked = schedules.sunday.enabled;
  sundayStart.value = String(schedules.sunday.start_time).slice(0, 5);
  sundayEnd.value = String(schedules.sunday.end_time).slice(0, 5);
  sundaySlotMinutes.value = String(schedules.sunday.slot_minutes);
  setScheduleStatus('Configurá y guardá los horarios de sábados y domingos.');
};
const loadAppointments = async () => {
  if (!supabaseClient) return;
  const today = new Date().toISOString().slice(0, 10);
  const { data, error } = await supabaseClient.from('appointments').select('id, booking_date, booking_time, client_name, client_phone, service').gte('booking_date', today).order('booking_date').order('booking_time');
  if (error) { appointmentsEmpty.textContent = 'Falta activar el módulo de turnos en Supabase.'; appointmentsEmpty.hidden = false; appointmentsTableWrap.hidden = true; return; }
  renderAppointments(data || []);
};
document.querySelector('#refresh-appointments').addEventListener('click', loadAppointments);
appointmentsBody.addEventListener('click', async (event) => {
  const button = event.target.closest('.appointment-cancel');
  if (!button || !supabaseClient) return;
  if (!confirm(`¿Cancelar el turno de ${button.dataset.appointmentLabel}? El horario volverá a quedar disponible.`)) return;
  button.disabled = true;
  setScheduleStatus('Cancelando turno…');
  const { error } = await supabaseClient.from('appointments').delete().eq('id', Number(button.dataset.appointmentId));
  if (error) { setScheduleStatus('No se pudo cancelar el turno. Probá nuevamente.', 'error'); button.disabled = false; return; }
  setScheduleStatus('Turno cancelado. El horario volvió a quedar disponible.', 'success');
  await loadAppointments();
});

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!supabaseClient) { status.textContent = 'No hay conexión segura configurada.'; return; }
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (!session) { status.textContent = 'Iniciá sesión para guardar cambios.'; return; }
  const next = {
    whatsapp: cleanText(form.elements.whatsapp.value, 20).replace(/\D/g, ''),
    instagram: cleanUrl(form.elements.instagram.value),
    city: cleanText(form.elements.city.value, 80),
    address: cleanText(form.elements.address.value, 140),
    heroEyebrow: cleanText(form.elements.heroEyebrow.value, 80),
    heroCopy: cleanText(form.elements.heroCopy.value, 300)
  };
  if (!/^\d{8,15}$/.test(next.whatsapp) || !next.instagram || !next.city || !next.address) {
    status.textContent = 'Revisá WhatsApp, Instagram, ciudad y dirección antes de guardar.';
    return;
  }
  next.products = [...editor.querySelectorAll('.product-editor')].slice(0, 12).map((card) => ({
    name: cleanText(card.querySelector('[data-field="name"]').value, 70),
    price: cleanText(card.querySelector('[data-field="price"]').value, 30),
    type: cleanText(card.querySelector('[data-field="type"]').value, 40),
    description: cleanText(card.querySelector('[data-field="description"]').value, 220)
  })).filter((product) => product.name && product.description);
  next.gallery = galleryUrls.map(cleanImageUrl).filter(Boolean).slice(0, 12);
  const schedules = [
    { id: 'saturday', enabled: saturdayEnabled.checked, start_time: saturdayStart.value, end_time: saturdayEnd.value, slot_minutes: Number(saturdaySlotMinutes.value) },
    { id: 'sunday', enabled: sundayEnabled.checked, start_time: sundayStart.value, end_time: sundayEnd.value, slot_minutes: Number(sundaySlotMinutes.value) }
  ];
  if (schedules.some((schedule) => schedule.start_time >= schedule.end_time)) {
    status.textContent = 'La hora de inicio de los turnos debe ser anterior a la hora de finalización.';
    return;
  }
  const { error: scheduleError } = await supabaseClient.from('sunday_schedule').upsert(schedules);
  if (scheduleError) { status.textContent = 'No se pudieron guardar los horarios. Activá primero el módulo de turnos en Supabase.'; return; }
  const { error } = await supabaseClient.from('site_config').upsert({ id: 'clip', data: next, updated_at: new Date().toISOString() });
  if (error) { status.textContent = `No se pudo guardar online: ${error.message}`; return; }
  localStorage.setItem(CONFIG_KEY, JSON.stringify(next));
  status.textContent = '✓ Cambios guardados online para todos los dispositivos.';
  await loadAppointments();
  setTimeout(() => { status.textContent = ''; }, 5000);
});

document.querySelector('#reset-site').addEventListener('click', () => {
  if (!confirm('¿Restablecer todos los cambios del panel?')) return;
  localStorage.removeItem(CONFIG_KEY);
  location.reload();
});
