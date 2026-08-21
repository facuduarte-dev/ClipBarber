const staffStatus = document.querySelector('#staff-status');
const staffLogin = document.querySelector('#staff-login');
const staffLoginButton = document.querySelector('#staff-login-button');
const staffLogoutButton = document.querySelector('#staff-logout-button');
const staffAppointments = document.querySelector('#staff-appointments');
const staffEmpty = document.querySelector('#staff-empty');
const staffTableWrap = document.querySelector('#staff-table-wrap');
const staffBody = document.querySelector('#staff-appointments-body');
const staffClient = window.CLIP_SUPABASE_URL && window.CLIP_SUPABASE_PUBLISHABLE_KEY && window.supabase
  ? window.supabase.createClient(window.CLIP_SUPABASE_URL, window.CLIP_SUPABASE_PUBLISHABLE_KEY)
  : null;

const setStaffState = (session) => {
  staffLogin.hidden = Boolean(session);
  staffLoginButton.hidden = Boolean(session);
  staffLogoutButton.hidden = !session;
  staffAppointments.hidden = !session;
  staffStatus.textContent = session ? `Conectado como ${session.user.email}.` : (staffClient ? 'Ingresá para ver los turnos.' : 'El panel no está conectado a Supabase.');
  if (session) loadStaffAppointments();
};
const dateLabel = (value) => new Intl.DateTimeFormat('es-UY', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(`${value}T12:00:00`));
const renderStaffAppointments = (items) => {
  staffBody.replaceChildren();
  items.forEach((item) => {
    const row = document.createElement('tr');
    [dateLabel(item.booking_date), String(item.booking_time).slice(0, 5), item.client_name, item.client_phone, item.service].forEach((value, index) => {
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
    staffBody.append(row);
  });
  staffEmpty.hidden = items.length > 0;
  staffTableWrap.hidden = items.length === 0;
};
async function loadStaffAppointments() {
  if (!staffClient) return;
  staffStatus.textContent = 'Cargando turnos…';
  const today = new Date().toISOString().slice(0, 10);
  const { data, error } = await staffClient.from('appointments').select('booking_date, booking_time, client_name, client_phone, service').gte('booking_date', today).order('booking_date').order('booking_time');
  if (error) {
    staffStatus.textContent = 'No tenés permiso para ver turnos. Pedile al administrador que habilite tu usuario.';
    renderStaffAppointments([]);
    return;
  }
  renderStaffAppointments(data || []);
  staffStatus.textContent = `${data?.length || 0} turnos próximos.`;
}

if (staffClient) {
  staffClient.auth.getSession().then(({ data }) => setStaffState(data.session));
  staffLoginButton.addEventListener('click', async () => {
    const { error } = await staffClient.auth.signInWithPassword({ email: document.querySelector('#staff-email').value, password: document.querySelector('#staff-password').value });
    if (error) { staffStatus.textContent = 'Email o contraseña incorrectos.'; return; }
    const { data } = await staffClient.auth.getSession();
    setStaffState(data.session);
  });
  staffLogoutButton.addEventListener('click', async () => { await staffClient.auth.signOut(); setStaffState(null); });
} else setStaffState(null);

document.querySelector('#staff-refresh').addEventListener('click', loadStaffAppointments);
