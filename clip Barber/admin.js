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
const config = { ...DEFAULT_CONFIG, ...JSON.parse(localStorage.getItem(CONFIG_KEY) || 'null') };
const authStatus = document.querySelector('#auth-status');
const loginButton = document.querySelector('#login-button');
const logoutButton = document.querySelector('#logout-button');
const supabaseClient = window.CLIP_SUPABASE_URL && window.CLIP_SUPABASE_PUBLISHABLE_KEY && window.supabase
  ? window.supabase.createClient(window.CLIP_SUPABASE_URL, window.CLIP_SUPABASE_PUBLISHABLE_KEY)
  : null;

const setAuthState = (session) => {
  loginButton.hidden = Boolean(session);
  logoutButton.hidden = !session;
  document.querySelector('#login-fields').hidden = Boolean(session);
  authStatus.textContent = session ? `Conectado como ${session.user.email}. Los cambios se guardan online.` : (supabaseClient ? 'Ingresá para guardar los cambios online.' : 'Modo demo activo. Configurá Supabase para guardar online.');
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
} else setAuthState(null);

const addProductEditor = (product = { type: '', name: '', description: '', price: '' }) => {
  const fragment = template.content.cloneNode(true);
  const card = fragment.querySelector('.product-editor');
  Object.entries(product).forEach(([key, value]) => { card.querySelector(`[data-field="${key}"]`).value = value; });
  editor.append(card);
};

const populateForm = (values) => {
  ['whatsapp', 'instagram', 'city', 'address', 'heroEyebrow', 'heroCopy'].forEach((field) => { form.elements[field].value = values[field] || ''; });
  form.elements.services.value = (values.services || []).join('\n');
  editor.innerHTML = '';
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

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const next = Object.fromEntries(['whatsapp', 'instagram', 'city', 'address', 'heroEyebrow', 'heroCopy'].map((key) => [key, form.elements[key].value.trim()]));
  next.whatsapp = next.whatsapp.replace(/\D/g, '');
  next.services = form.elements.services.value.split('\n').map((item) => item.trim()).filter(Boolean);
  next.products = [...editor.querySelectorAll('.product-editor')].map((card) => Object.fromEntries(['name', 'price', 'type', 'description'].map((key) => [key, card.querySelector(`[data-field="${key}"]`).value.trim()]))).filter((product) => product.name && product.description);
  localStorage.setItem(CONFIG_KEY, JSON.stringify(next));
  if (supabaseClient) {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (session) {
      const { error } = await supabaseClient.from('site_config').upsert({ id: 'clip', data: next, updated_at: new Date().toISOString() });
      if (error) { status.textContent = `No se pudo guardar online: ${error.message}`; return; }
      status.textContent = '✓ Cambios guardados online para todos los dispositivos.';
    } else status.textContent = '✓ Cambios guardados solo en este navegador. Ingresá para publicarlos online.';
  } else status.textContent = '✓ Cambios guardados en modo demo en este navegador.';
  setTimeout(() => { status.textContent = ''; }, 5000);
});

document.querySelector('#reset-site').addEventListener('click', () => {
  if (!confirm('¿Restablecer todos los cambios del panel?')) return;
  localStorage.removeItem(CONFIG_KEY);
  location.reload();
});
