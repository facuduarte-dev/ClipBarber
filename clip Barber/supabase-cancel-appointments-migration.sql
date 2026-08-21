-- Permite que el administrador o un barbero autorizado cancele una reserva.
-- La política no concede acceso a usuarios anónimos ni a usuarios autenticados comunes.

drop policy if exists "Personal autorizado cancela reservas" on public.appointments;

create policy "Personal autorizado cancela reservas"
on public.appointments for delete to authenticated
using (public.can_view_appointments());
