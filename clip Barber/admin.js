const CONFIG_KEY = 'clip-barber-config';
const DEFAULT_CONFIG = {
  whatsapp: '59898743328', instagram: 'https://www.instagram.com/clip_barber_studio/', city: 'Paysandú, Uruguay', address: '18 de Julio 1234, Paysandú', heroEyebrow: 'Más que un corte,', heroCopy: 'En CLIP Barber Studio combinamos técnica, actitud y pasión para que salgas siempre como te gusta.',
  services: ['Corte + Barba', 'Fade', 'Perfilado', 'Afeitado clásico', 'Diseño', 'Lavado y tratamientos capilares'],
  products: [{ type: 'Fijación', name: 'Cera matte', description: 'Fijación flexible y acabado natural.', price: '' }, { type: 'Volumen', name: 'Polvo texturizante', description: 'Volumen instantáneo, textura y acabado seco.', price: '' }, { type: 'Cuidado', name: 'Aceite para barba', description: 'Suaviza, nutre y deja una barba prolija.', price: '' }]
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
const sundayEnabled = document.querySelector('#sunday-enabled');
const sundayStart = document.querySelector('#sunday-start');
const sundayEnd = document.querySelector('#sunday-end');
const sundaySlotMinutes = document.querySelector('#sunday-slot-minutes');
const scheduleStatus = document.querySelector('#schedule-status');
const appointmentsEmpty = document.querySelector('#appointments-empty');
const appointmentsTableWrap = document.querySelector('.appointments-table-wrap');
const appointmentsBody = document.querySelector('#appointments-table tbody');
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

const setAuthState = (session) => {
  loginButton.hidden = Boolean(session);
  logoutButton.hidden = !session;
  document.querySelector('#login-fields').hidden = Boolean(session);
  form.hidden = !session;
  authStatus.textContent = session ? `Conectado como ${session.user.email}. Los cambios se guardan online.` : (supabaseClient ? 'Ingresá para guardar los cambios online.' : 'Modo demo activo. Configurá Supabase para guardar online.');
  if (session) {
    loadSundaySchedule();
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
  form.elements.services.value = (values.services || []).join('\n');
  editor.replaceChildren();
  (values.products || []).forEach(addProductEditor);
};

populateForm(config);
if (supabaseClient) {
  supabaseClient.from('site_config').select('data').eq('id', 'clip').single().then(({ data }) => {
    if (!data?.data) return;
    Object.assign(config, data.data);
    populateForm(config);
  });
}

document.querySelector('#add-product').addEventListener('click', () => addProductEditor());
editor.addEventListener('click', (event) => event.target.closest('.remove-product')?.closest('.product-editor').remove());

const setScheduleStatus = (message, type = '') => {
  scheduleStatus.textContent = message;
  scheduleStatus.className = `storage-note ${type}`.trim();
};
const formatDate = (value) => new Intl.DateTimeFormat('es-UY', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(`${value}T12:00:00`));
const renderAppointments = (appointments) => {
  appointmentsBody.replaceChildren();
  appointments.forEach((appointment) => {
    const row = document.createElement('tr');
    const values = [formatDate(appointment.booking_date), String(appointment.booking_time).slice(0, 5), appointment.client_name, appointment.client_phone, appointment.service];
    values.forEach((value, index) => {
      const cell = document.createElement('td');
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
    appointmentsBody.append(row);
  });
  appointmentsEmpty.hidden = appointments.length > 0;
  appointmentsTableWrap.hidden = appointments.length === 0;
};
const loadSundaySchedule = async () => {
  if (!supabaseClient) return;
  const { data, error } = await supabaseClient.from('sunday_schedule').select('*').eq('id', 'sunday').single();
  if (error) { setScheduleStatus('Falta activar el módulo de turnos en Supabase.'); return; }
  sundayEnabled.checked = data.enabled;
  sundayStart.value = String(data.start_time).slice(0, 5);
  sundayEnd.value = String(data.end_time).slice(0, 5);
  sundaySlotMinutes.value = String(data.slot_minutes);
  setScheduleStatus(data.enabled ? 'Los turnos de domingo están habilitados.' : 'Los turnos de domingo están pausados.');
};
const loadAppointments = async () => {
  if (!supabaseClient) return;
  const today = new Date().toISOString().slice(0, 10);
  const { data, error } = await supabaseClient.from('appointments').select('booking_date, booking_time, client_name, client_phone, service').gte('booking_date', today).order('booking_date').order('booking_time');
  if (error) { appointmentsEmpty.textContent = 'Falta activar el módulo de turnos en Supabase.'; appointmentsEmpty.hidden = false; appointmentsTableWrap.hidden = true; return; }
  renderAppointments(data || []);
};
document.querySelector('#refresh-appointments').addEventListener('click', loadAppointments);

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
  next.services = form.elements.services.value.split('\n').map((item) => cleanText(item, 80)).filter(Boolean).slice(0, 12);
  next.products = [...editor.querySelectorAll('.product-editor')].slice(0, 12).map((card) => ({
    name: cleanText(card.querySelector('[data-field="name"]').value, 70),
    price: cleanText(card.querySelector('[data-field="price"]').value, 30),
    type: cleanText(card.querySelector('[data-field="type"]').value, 40),
    description: cleanText(card.querySelector('[data-field="description"]').value, 220)
  })).filter((product) => product.name && product.description);
  if (sundayStart.value >= sundayEnd.value) {
    status.textContent = 'La hora de inicio de los turnos debe ser anterior a la hora de finalización.';
    return;
  }
  const { error: scheduleError } = await supabaseClient.from('sunday_schedule').upsert({
    id: 'sunday', enabled: sundayEnabled.checked, start_time: sundayStart.value, end_time: sundayEnd.value, slot_minutes: Number(sundaySlotMinutes.value)
  });
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
