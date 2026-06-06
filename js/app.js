/* ============================================================
   Sand'licias — lógica de la aplicación (router + vistas)
   ============================================================ */
(function () {
  'use strict';

  const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio',
    'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  const DIAS_SEMANA = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  const TIPO_EMOJI = { Pastel: '🎂', Cupcakes: '🧁', Postre: '🍰', Otro: '✨' };

  // ---------------------------------------------------------
  // Helpers: fecha / formato
  // ---------------------------------------------------------
  function todayStr() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
  function parseLocalDate(dateStr) {
    if (!dateStr) return null;
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Date(y, m - 1, d);
  }
  function startOfDay(date) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
  }
  function daysBetween(a, b) {
    const MS = 24 * 60 * 60 * 1000;
    return Math.round((startOfDay(b) - startOfDay(a)) / MS);
  }
  function getUrgency(dateStr) {
    const target = parseLocalDate(dateStr);
    if (!target) return { level: 'green', label: 'Sin fecha', days: Infinity };
    const days = daysBetween(new Date(), target);
    if (days < 0) return { level: 'red', label: `Vencido (hace ${Math.abs(days)} día${Math.abs(days) === 1 ? '' : 's'})`, days };
    if (days === 0) return { level: 'red', label: 'Hoy', days };
    if (days === 1) return { level: 'orange', label: 'Mañana', days };
    if (days <= 2) return { level: 'orange', label: `${days} días restantes`, days };
    if (days <= 7) return { level: 'yellow', label: `${days} días restantes`, days };
    return { level: 'green', label: `${days} días restantes`, days };
  }
  function fmtMoney(n) {
    return (Number(n) || 0).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });
  }
  function fmtDateLong(dateStr) {
    const d = parseLocalDate(dateStr);
    if (!d) return '';
    return `${DIAS_SEMANA[d.getDay()]} ${d.getDate()} de ${MESES[d.getMonth()]} de ${d.getFullYear()}`;
  }
  function fmtDateShort(dateStr) {
    const d = parseLocalDate(dateStr);
    if (!d) return '';
    return `${d.getDate()} ${capitalize(MESES[d.getMonth()].slice(0, 3))}`;
  }
  function fmtTime(timeStr) {
    if (!timeStr) return '';
    const [h, m] = timeStr.split(':').map(Number);
    const period = h >= 12 ? 'p.m.' : 'a.m.';
    const h12 = h % 12 || 12;
    return `${h12}:${String(m).padStart(2, '0')} ${period}`;
  }
  function capitalize(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }
  function byFechaHora(a, b) {
    return (a.fecha || '').localeCompare(b.fecha || '') || (a.hora || '').localeCompare(b.hora || '');
  }
  function escapeHtml(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
  function digitsOnly(s) { return String(s || '').replace(/\D/g, ''); }

  // ---------------------------------------------------------
  // Toasts
  // ---------------------------------------------------------
  function toast(msg) {
    const region = document.getElementById('toast-region');
    const el = document.createElement('div');
    el.className = 'toast';
    el.textContent = msg;
    region.appendChild(el);
    setTimeout(() => el.remove(), 3000);
  }

  // ---------------------------------------------------------
  // DOM refs
  // ---------------------------------------------------------
  const viewRoot = document.getElementById('view');
  const topbarTitle = document.getElementById('topbar-title');
  const topbarSubtitle = document.getElementById('topbar-subtitle');
  const fab = document.getElementById('fab-new');
  const navItems = document.querySelectorAll('.nav-item');
  const btnBack = document.getElementById('btn-back');
  const brandBlock = document.getElementById('brand-block');
  const ROUTES_WITH_NAV = ['inicio', 'pedidos', 'calendario', 'ajustes'];
  const ROUTES_WITH_FAB = ['inicio', 'pedidos', 'calendario'];

  // Dónde debe llevar el botón "Regresar" según la pantalla actual
  function backTargetFor(route, param) {
    if (route === 'pedido') return ['pedidos'];
    if (route === 'editar-pedido') return ['pedido', param];
    if (route === 'nuevo-pedido') return ['inicio'];
    return ['inicio'];
  }

  // ---------------------------------------------------------
  // Router
  // ---------------------------------------------------------
  function parseHash() {
    const raw = location.hash.replace(/^#\/?/, '');
    const [route, param] = raw.split('/');
    return { route: route || 'inicio', param: param ? decodeURIComponent(param) : null };
  }
  function navigate(route, param) {
    location.hash = param ? `/${route}/${encodeURIComponent(param)}` : `/${route}`;
  }
  window.navigate = navigate;

  function render() {
    const { route, param } = parseHash();
    const known = ['inicio', 'pedidos', 'calendario', 'ajustes', 'nuevo-pedido', 'editar-pedido', 'pedido'];
    if (!known.includes(route)) { navigate('inicio'); return; }

    const showChrome = ROUTES_WITH_NAV.includes(route);
    document.getElementById('bottom-nav').style.display = showChrome ? '' : 'none';
    fab.style.display = ROUTES_WITH_FAB.includes(route) ? '' : 'none';
    navItems.forEach((btn) => {
      if (btn.dataset.route === route) btn.setAttribute('aria-current', 'page');
      else btn.removeAttribute('aria-current');
    });

    // En pantallas sin barra inferior (detalle, nuevo/editar pedido) mostramos
    // un botón de regreso en la barra superior para no dejar a la usuaria atrapada.
    btnBack.hidden = showChrome;
    brandBlock.hidden = !showChrome;
    if (!showChrome) {
      const [backRoute, backParam] = backTargetFor(route, param);
      btnBack.onclick = () => navigate(backRoute, backParam);
    }

    viewRoot.innerHTML = '';
    topbarTitle.textContent = '';
    topbarSubtitle.textContent = '';

    switch (route) {
      case 'inicio': renderInicio(); break;
      case 'pedidos': renderPedidos(); break;
      case 'calendario': renderCalendario(); break;
      case 'ajustes': renderAjustes(); break;
      case 'nuevo-pedido': renderFormPedido(null); break;
      case 'editar-pedido': renderFormPedido(param); break;
      case 'pedido': renderDetallePedido(param); break;
    }
    viewRoot.scrollTop = 0;
    closeNotifSheet();
  }
  window.addEventListener('hashchange', render);

  // ---------------------------------------------------------
  // Reusable: order card + card list
  // ---------------------------------------------------------
  function buildOrderCard(order) {
    const tpl = document.getElementById('tpl-order-card');
    const node = tpl.content.firstElementChild.cloneNode(true);
    const u = getUrgency(order.fecha);

    node.querySelector('.urgency-pill').classList.add(`urgency-${u.level}`);
    node.querySelector('.urgency-pill .dot').classList.add(`dot-${u.level}`);
    node.querySelector('.urgency-text').textContent = u.label;

    node.querySelector('.badge-type').textContent = `${TIPO_EMOJI[order.tipo] || '✨'} ${order.tipo}`;
    node.querySelector('.order-card-name').textContent = order.nombre;

    const metaParts = [];
    if (order.sabor) metaParts.push(order.sabor);
    if (order.tamano) metaParts.push(order.tamano);
    node.querySelector('.order-card-meta').textContent = metaParts.length ? metaParts.join(' · ') : 'Sin detalles capturados';

    node.querySelector('.order-card-date').textContent =
      `📅 ${fmtDateShort(order.fecha)}${order.hora ? ' · ' + fmtTime(order.hora) : ''}`;

    const saldo = (Number(order.precio) || 0) - (Number(order.anticipo) || 0);
    const pagoBadge = node.querySelector('.badge-pago');
    if (saldo <= 0) { pagoBadge.textContent = 'Pagado ✓'; pagoBadge.classList.add('is-pagado'); }
    else { pagoBadge.textContent = `Saldo ${fmtMoney(saldo)}`; pagoBadge.classList.add('is-pendiente'); }

    if (order.estado === 'entregado') node.style.opacity = '0.55';

    node.addEventListener('click', () => navigate('pedido', order.id));
    return node;
  }

  function renderCardList(containerId, orders, emptyOpts) {
    const container = document.getElementById(containerId);
    container.innerHTML = '';
    if (!orders.length) {
      container.innerHTML = `<div class="empty-state">
        <span class="empty-emoji">${emptyOpts.emptyEmoji}</span>
        <strong>${emptyOpts.emptyTitle}</strong>
        <span>${emptyOpts.emptyText}</span>
      </div>`;
      return;
    }
    const frag = document.createDocumentFragment();
    orders.forEach((o) => frag.appendChild(buildOrderCard(o)));
    container.appendChild(frag);
  }

  // ---------------------------------------------------------
  // Vista: Inicio (Dashboard)
  // ---------------------------------------------------------
  function greeting() {
    const h = new Date().getHours();
    if (h < 12) return 'Buenos días';
    if (h < 19) return 'Buenas tardes';
    return 'Buenas noches';
  }

  function renderInicio() {
    const settings = DB.getSettings();
    topbarTitle.textContent = `${greeting()} ${settings.propietaria ? ', ' + settings.propietaria.split(' ')[0] : ''} 🌸`;
    topbarSubtitle.textContent = capitalize(fmtDateLong(todayStr()));

    viewRoot.appendChild(document.getElementById('tpl-inicio').content.cloneNode(true));

    const today = todayStr();
    const all = DB.getOrders();
    const activos = all.filter((o) => o.estado !== 'entregado');
    const hoy = activos.filter((o) => o.fecha === today).sort(byFechaHora);
    const futuros = activos.filter((o) => o.fecha > today).sort(byFechaHora);
    const estaSemana = activos.filter((o) => { const u = getUrgency(o.fecha); return u.days >= 0 && u.days <= 7; });

    const stats = [
      { icon: '🎂', num: hoy.length, label: 'Pedidos de hoy', tint: 'tint-pink' },
      { icon: '📦', num: futuros.length, label: 'Próximas entregas', tint: 'tint-peach' },
      { icon: '🗓️', num: estaSemana.length, label: 'Esta semana', tint: 'tint-lav' },
      { icon: '✨', num: activos.length, label: 'Pedidos activos', tint: 'tint-rose' }
    ];
    document.getElementById('stat-grid').innerHTML = stats.map((s) => `
      <div class="stat-card ${s.tint}">
        <span class="stat-icon">${s.icon}</span>
        <span class="stat-num">${s.num}</span>
        <span class="stat-label">${s.label}</span>
      </div>`).join('');

    renderCardList('hoy-list', hoy, {
      emptyEmoji: '🌤️', emptyTitle: 'Sin entregas para hoy',
      emptyText: 'Respira tranquila — hoy no tienes pedidos programados.'
    });
    renderCardList('proximas-list', futuros.slice(0, 6), {
      emptyEmoji: '📭', emptyTitle: 'Sin próximas entregas',
      emptyText: 'Los nuevos pedidos que registres aparecerán aquí.'
    });

    viewRoot.querySelector('[data-go="pedidos"]').addEventListener('click', () => navigate('pedidos'));
  }

  // ---------------------------------------------------------
  // Vista: Pedidos (lista, búsqueda y filtros)
  // ---------------------------------------------------------
  const pedidosState = { search: '', tipo: 'Todos', estado: 'Todos', sortAsc: true };

  function renderPedidos() {
    topbarTitle.textContent = 'Pedidos';
    topbarSubtitle.textContent = 'Busca, filtra y revisa todos tus pedidos';

    viewRoot.appendChild(document.getElementById('tpl-pedidos').content.cloneNode(true));

    const searchInput = document.getElementById('search-input');
    searchInput.value = pedidosState.search;
    searchInput.addEventListener('input', (e) => { pedidosState.search = e.target.value; applyPedidosFilters(); });

    document.getElementById('btn-sort').addEventListener('click', () => {
      pedidosState.sortAsc = !pedidosState.sortAsc;
      toast(pedidosState.sortAsc ? 'Mostrando: entregas más próximas primero' : 'Mostrando: entregas más lejanas primero');
      applyPedidosFilters();
    });

    const tipoChips = [['Todos', 'Todos'], ['Pastel', '🎂 Pastel'], ['Cupcakes', '🧁 Cupcakes'], ['Postre', '🍰 Postre'], ['Otro', '✨ Otro']];
    const typeChips = document.getElementById('type-chips');
    typeChips.innerHTML = tipoChips.map(([val, label]) =>
      `<button type="button" class="chip ${pedidosState.tipo === val ? 'is-active' : ''}" data-val="${val}">${label}</button>`).join('');
    typeChips.addEventListener('click', (e) => {
      const btn = e.target.closest('.chip'); if (!btn) return;
      pedidosState.tipo = btn.dataset.val;
      [...typeChips.children].forEach((c) => c.classList.toggle('is-active', c === btn));
      applyPedidosFilters();
    });

    const statusChips = [['Todos', 'Todos los estados'], ['activo', '🟢 Activos'], ['entregado', '✅ Entregados']];
    const statusEl = document.getElementById('status-chips');
    statusEl.innerHTML = statusChips.map(([val, label]) =>
      `<button type="button" class="chip ${pedidosState.estado === val ? 'is-active' : ''}" data-val="${val}">${label}</button>`).join('');
    statusEl.addEventListener('click', (e) => {
      const btn = e.target.closest('.chip'); if (!btn) return;
      pedidosState.estado = btn.dataset.val;
      [...statusEl.children].forEach((c) => c.classList.toggle('is-active', c === btn));
      applyPedidosFilters();
    });

    applyPedidosFilters();
  }

  function applyPedidosFilters() {
    const q = pedidosState.search.trim().toLowerCase();
    let filtered = DB.getOrders().filter((o) => {
      if (pedidosState.tipo !== 'Todos' && o.tipo !== pedidosState.tipo) return false;
      if (pedidosState.estado !== 'Todos' && o.estado !== pedidosState.estado) return false;
      if (q) {
        const haystack = `${o.nombre || ''} ${o.telefono || ''} ${o.sabor || ''} ${o.relleno || ''}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
    filtered.sort((a, b) => pedidosState.sortAsc ? byFechaHora(a, b) : byFechaHora(b, a));

    const count = filtered.length;
    document.getElementById('result-count').textContent =
      `${count} pedido${count === 1 ? '' : 's'} encontrado${count === 1 ? '' : 's'}`;

    renderCardList('orders-list', filtered, {
      emptyEmoji: '🔍', emptyTitle: 'No encontramos pedidos',
      emptyText: 'Prueba con otra búsqueda o cambia los filtros seleccionados.'
    });
  }

  // ---------------------------------------------------------
  // Vista: Calendario
  // ---------------------------------------------------------
  let calState = null;

  function renderCalendario() {
    if (!calState) {
      const now = new Date();
      calState = { year: now.getFullYear(), month: now.getMonth(), selected: todayStr() };
    }
    topbarTitle.textContent = 'Calendario';
    topbarSubtitle.textContent = 'Tus entregas y recolecciones de un vistazo';

    viewRoot.appendChild(document.getElementById('tpl-calendario').content.cloneNode(true));
    document.getElementById('cal-prev').addEventListener('click', () => shiftMonth(-1));
    document.getElementById('cal-next').addEventListener('click', () => shiftMonth(1));
    drawCalendar();
  }

  function shiftMonth(delta) {
    calState.month += delta;
    if (calState.month < 0) { calState.month = 11; calState.year--; }
    if (calState.month > 11) { calState.month = 0; calState.year++; }
    drawCalendar();
  }

  function drawCalendar() {
    const { year, month } = calState;
    document.getElementById('cal-month-label').textContent = `${capitalize(MESES[month])} ${year}`;

    const byDate = {};
    DB.getOrders().forEach((o) => {
      if (!o.fecha) return;
      (byDate[o.fecha] = byDate[o.fecha] || []).push(o);
    });

    const firstWeekday = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const todayKey = todayStr();

    const grid = document.getElementById('cal-grid');
    grid.innerHTML = '';
    const frag = document.createDocumentFragment();

    for (let i = 0; i < firstWeekday; i++) {
      const empty = document.createElement('div');
      empty.className = 'cal-cell is-empty';
      frag.appendChild(empty);
    }
    for (let day = 1; day <= daysInMonth; day++) {
      const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const cell = document.createElement('button');
      cell.type = 'button';
      cell.className = 'cal-cell';
      if (dateKey === todayKey) cell.classList.add('is-today');
      if (dateKey === calState.selected) cell.classList.add('is-selected');

      const dayOrders = byDate[dateKey] || [];
      let dotsHtml = '';
      if (dayOrders.length) {
        const levels = [...new Set(dayOrders.map((o) => getUrgency(o.fecha).level))].slice(0, 3);
        dotsHtml = `<span class="cal-dots">${levels.map((l) => `<i class="dot-${l}"></i>`).join('')}</span>`;
      }
      cell.innerHTML = `<span>${day}</span>${dotsHtml}`;
      cell.addEventListener('click', () => { calState.selected = dateKey; drawCalendar(); });
      frag.appendChild(cell);
    }
    grid.appendChild(frag);

    const sel = calState.selected;
    const selOrders = (byDate[sel] || []).sort((a, b) => (a.hora || '').localeCompare(b.hora || ''));
    document.getElementById('cal-day-title').textContent = sel ? capitalize(fmtDateLong(sel)) : 'Selecciona un día';
    renderCardList('cal-day-list', selOrders, {
      emptyEmoji: '🗓️', emptyTitle: 'Sin pedidos este día',
      emptyText: 'No tienes entregas ni recolecciones programadas para esta fecha.'
    });
  }

  // ---------------------------------------------------------
  // Vista: Nuevo / Editar pedido
  // ---------------------------------------------------------
  function wireSegControl(container, hiddenInput, initialValue, onChange) {
    const buttons = [...container.querySelectorAll('.seg-btn')];
    function select(value) {
      hiddenInput.value = value;
      buttons.forEach((b) => b.classList.toggle('is-selected', b.dataset.value === value));
      if (onChange) onChange(value);
    }
    buttons.forEach((btn) => btn.addEventListener('click', () => select(btn.dataset.value)));
    select(initialValue || hiddenInput.value || '');
  }

  function renderFormPedido(id) {
    const editing = !!id;
    const order = editing ? DB.getOrder(id) : null;
    if (editing && !order) { navigate('pedidos'); return; }

    topbarTitle.textContent = editing ? 'Editar pedido' : 'Nuevo pedido';
    topbarSubtitle.textContent = editing
      ? 'Actualiza los datos de este pedido'
      : 'Captura los datos para registrar el pedido';

    viewRoot.appendChild(document.getElementById('tpl-nuevo-pedido').content.cloneNode(true));
    const form = document.getElementById('order-form');
    const $ = (id) => document.getElementById(id);

    wireSegControl($('tipo-control'), $('f-tipo'), order && order.tipo);

    const direccionField = $('direccion-field');
    wireSegControl($('entrega-control'), $('f-entrega'), (order && order.entrega) || 'Recoger', (val) => {
      direccionField.hidden = val !== 'Domicilio';
    });

    if (editing) {
      $('f-id').value = order.id;
      $('f-nombre').value = order.nombre || '';
      $('f-telefono').value = order.telefono || '';
      $('f-sabor').value = order.sabor || '';
      $('f-relleno').value = order.relleno || '';
      $('f-tamano').value = order.tamano || '';
      $('f-notas').value = order.notas || '';
      $('f-fecha').value = order.fecha || '';
      $('f-hora').value = order.hora || '';
      $('f-direccion').value = order.direccion || '';
      $('f-precio').value = order.precio != null ? order.precio : '';
      $('f-anticipo').value = order.anticipo != null ? order.anticipo : '';
      $('btn-delete-order').hidden = false;
      $('btn-save-order').textContent = 'Guardar cambios';
    }

    function updateBalance() {
      const precio = parseFloat($('f-precio').value) || 0;
      const anticipo = parseFloat($('f-anticipo').value) || 0;
      const saldo = Math.max(precio - anticipo, 0);
      $('balance-preview').innerHTML = `Saldo pendiente por cobrar: <b>${fmtMoney(saldo)}</b>`;
    }
    updateBalance();
    $('f-precio').addEventListener('input', updateBalance);
    $('f-anticipo').addEventListener('input', updateBalance);

    $('btn-cancel-order').addEventListener('click', (e) => {
      e.preventDefault();
      navigate(editing ? 'pedido' : 'inicio', editing ? order.id : undefined);
    });

    $('btn-delete-order').addEventListener('click', () => {
      if (confirm('¿Eliminar este pedido? No podrás deshacer esta acción.')) {
        DB.deleteOrder(order.id);
        toast('Pedido eliminado 🗑️');
        navigate('pedidos');
      }
    });

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const nombre = $('f-nombre').value.trim();
      const tipo = $('f-tipo').value;
      const fecha = $('f-fecha').value;
      const precioRaw = $('f-precio').value;

      if (!nombre) { toast('Escribe el nombre del cliente'); $('f-nombre').focus(); return; }
      if (!tipo) { toast('Selecciona el tipo de pedido'); return; }
      if (!fecha) { toast('Selecciona la fecha de entrega'); $('f-fecha').focus(); return; }
      if (precioRaw === '') { toast('Indica el precio total del pedido'); $('f-precio').focus(); return; }

      const data = {
        nombre,
        telefono: $('f-telefono').value.trim(),
        tipo,
        sabor: $('f-sabor').value,
        relleno: $('f-relleno').value,
        tamano: $('f-tamano').value,
        notas: $('f-notas').value.trim(),
        fecha,
        hora: $('f-hora').value,
        entrega: $('f-entrega').value,
        direccion: $('f-direccion').value.trim(),
        precio: parseFloat(precioRaw) || 0,
        anticipo: parseFloat($('f-anticipo').value) || 0
      };
      if (editing) data.id = order.id;

      const saved = DB.saveOrder(data);
      toast(editing ? 'Pedido actualizado 💗' : '¡Pedido guardado! 🎉');
      navigate('pedido', saved.id);
    });
  }

  // ---------------------------------------------------------
  // Vista: Detalle de pedido
  // ---------------------------------------------------------
  function renderDetallePedido(id) {
    const order = DB.getOrder(id);
    if (!order) { navigate('pedidos'); return; }

    topbarTitle.textContent = 'Detalle del pedido';
    topbarSubtitle.textContent = order.nombre;

    viewRoot.appendChild(document.getElementById('tpl-detalle-pedido').content.cloneNode(true));
    const $ = (id) => document.getElementById(id);

    const u = getUrgency(order.fecha);
    const banner = $('detail-urgency');
    banner.classList.add(`urgency-${u.level}`);
    const icons = { green: '🌿', yellow: '🌼', orange: '⏰', red: '🔥' };
    banner.innerHTML = `<span>${icons[u.level]}</span><span>${order.estado === 'entregado' ? 'Pedido entregado' : u.label}</span>`;

    $('d-nombre').textContent = order.nombre || '—';
    $('d-telefono').textContent = order.telefono || 'No registrado';

    const callLink = $('d-call-link');
    const waLink = $('d-whatsapp-link');
    if (order.telefono) {
      const digits = digitsOnly(order.telefono);
      callLink.href = `tel:${digits}`;
      callLink.hidden = false;
      waLink.href = `https://wa.me/${digits.length === 10 ? '52' + digits : digits}`;
      waLink.target = '_blank';
      waLink.rel = 'noopener';
      waLink.hidden = false;
    }

    $('d-tipo').textContent = `${TIPO_EMOJI[order.tipo] || ''} ${order.tipo || '—'}`;
    $('d-sabor').textContent = order.sabor || '—';
    $('d-relleno').textContent = order.relleno || '—';
    $('d-tamano').textContent = order.tamano || '—';

    $('d-fecha').textContent = capitalize(fmtDateLong(order.fecha)) || '—';
    $('d-hora').textContent = order.hora ? fmtTime(order.hora) : 'No especificada';
    $('d-entrega').textContent = order.entrega === 'Domicilio' ? '🚗 A domicilio' : '🏠 Recoge en el local';
    const dirRow = $('d-direccion-row');
    if (order.entrega === 'Domicilio' && order.direccion) {
      dirRow.hidden = false;
      $('d-direccion').textContent = order.direccion;
    } else {
      dirRow.hidden = true;
    }

    const saldo = (Number(order.precio) || 0) - (Number(order.anticipo) || 0);
    $('d-precio').textContent = fmtMoney(order.precio);
    $('d-anticipo').textContent = fmtMoney(order.anticipo);
    $('d-saldo').textContent = fmtMoney(Math.max(saldo, 0));
    const pagoBadge = $('d-pago-badge');
    if (saldo <= 0) { pagoBadge.textContent = 'Pagado por completo ✓'; pagoBadge.classList.add('is-pagado', 'badge-pago'); }
    else { pagoBadge.textContent = 'Pago pendiente'; pagoBadge.classList.add('is-pendiente', 'badge-pago'); }

    const notasCard = $('d-notas-card');
    if (order.notas) { $('d-notas').textContent = order.notas; }
    else { notasCard.hidden = true; }

    $('btn-edit-order').addEventListener('click', () => navigate('editar-pedido', order.id));

    const btnPagado = $('btn-toggle-paid');
    if (saldo <= 0) btnPagado.hidden = true;
    else btnPagado.addEventListener('click', () => {
      DB.saveOrder({ id: order.id, anticipo: order.precio });
      toast('Pedido marcado como pagado 💖');
      renderDetallePedido(order.id);
      replaceView();
    });

    const btnEstado = $('btn-toggle-status');
    btnEstado.textContent = order.estado === 'entregado' ? '↩️ Reabrir pedido' : '✅ Marcar como entregado';
    btnEstado.addEventListener('click', () => {
      const nuevoEstado = order.estado === 'entregado' ? 'activo' : 'entregado';
      DB.saveOrder({ id: order.id, estado: nuevoEstado });
      toast(nuevoEstado === 'entregado' ? 'Pedido marcado como entregado 🎉' : 'Pedido reabierto');
      replaceView();
    });

    function replaceView() {
      viewRoot.innerHTML = '';
      renderDetallePedido(order.id);
    }
  }

  // ---------------------------------------------------------
  // Vista: Ajustes
  // ---------------------------------------------------------
  function renderAjustes() {
    topbarTitle.textContent = 'Ajustes';
    topbarSubtitle.textContent = 'Información del negocio, apariencia y respaldos';

    viewRoot.appendChild(document.getElementById('tpl-ajustes').content.cloneNode(true));
    const $ = (id) => document.getElementById(id);
    const settings = DB.getSettings();

    $('s-nombre').value = settings.nombreNegocio || '';
    $('s-propietaria').value = settings.propietaria || '';
    $('s-telefono').value = settings.telefonoNegocio || '';
    $('s-direccion').value = settings.direccionNegocio || '';
    $('s-redes').value = settings.redesNegocio || '';

    $('settings-form').addEventListener('submit', (e) => {
      e.preventDefault();
      DB.saveSettings({
        nombreNegocio: $('s-nombre').value.trim(),
        propietaria: $('s-propietaria').value.trim(),
        telefonoNegocio: $('s-telefono').value.trim(),
        direccionNegocio: $('s-direccion').value.trim(),
        redesNegocio: $('s-redes').value.trim()
      });
      toast('Información guardada 💗');
    });

    const themeRow = $('theme-row');
    [...themeRow.children].forEach((dot) => {
      dot.classList.toggle('is-active', dot.dataset.theme === settings.theme);
      dot.addEventListener('click', () => {
        applyTheme(dot.dataset.theme);
        DB.saveSettings({ theme: dot.dataset.theme });
        [...themeRow.children].forEach((d) => d.classList.toggle('is-active', d === dot));
        toast('Apariencia actualizada ✨');
      });
    });

    $('btn-export').addEventListener('click', () => {
      const data = DB.exportData();
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const stamp = new Date().toISOString().slice(0, 10);
      a.href = url;
      a.download = `sandlicias-respaldo-${stamp}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast('Respaldo exportado ⬇️');
    });

    $('btn-import').addEventListener('change', (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const count = DB.importData(String(reader.result));
          toast(`Respaldo restaurado: ${count} pedido${count === 1 ? '' : 's'} 🎉`);
          render();
        } catch (err) {
          toast('No se pudo leer el archivo de respaldo');
        }
      };
      reader.readAsText(file);
      e.target.value = '';
    });
  }

  function applyTheme(theme) {
    if (theme && theme !== 'rosa') document.documentElement.setAttribute('data-theme', theme);
    else document.documentElement.removeAttribute('data-theme');
  }

  // ---------------------------------------------------------
  // Notificaciones (avisos visuales)
  // ---------------------------------------------------------
  function getNotifications() {
    const today = todayStr();
    const items = [];
    DB.getOrders().filter((o) => o.estado !== 'entregado').forEach((o) => {
      const u = getUrgency(o.fecha);
      if (u.days < 0) items.push({ kind: 'urgent', icon: '⚠️', title: `Pedido vencido — ${o.nombre}`, sub: `Entrega era el ${fmtDateShort(o.fecha)} · ${u.label}`, order: o, order_priority: 0 });
      else if (u.days === 0) items.push({ kind: 'urgent', icon: '🔥', title: `¡Entrega hoy! — ${o.nombre}`, sub: `${o.tipo}${o.hora ? ' · ' + fmtTime(o.hora) : ''}`, order: o, order_priority: 1 });
      else if (u.days === 1) items.push({ kind: 'soon', icon: '⏰', title: `Entrega mañana — ${o.nombre}`, sub: `${o.tipo}${o.hora ? ' · ' + fmtTime(o.hora) : ''}`, order: o, order_priority: 2 });
    });
    items.sort((a, b) => a.order_priority - b.order_priority || byFechaHora(a.order, b.order));
    return items;
  }

  function refreshNotifBadge() {
    const dot = document.getElementById('notif-dot');
    dot.hidden = getNotifications().length === 0;
  }

  function openNotifSheet() {
    const backdrop = document.getElementById('notif-backdrop');
    const sheet = document.getElementById('notif-sheet');
    const list = document.getElementById('notif-list');
    const items = getNotifications();

    list.innerHTML = items.length ? items.map((it) => `
      <div class="notif-item ${it.kind === 'urgent' ? 'is-urgent' : 'is-soon'}" data-id="${escapeHtml(it.order.id)}">
        <span class="notif-icon">${it.icon}</span>
        <div class="notif-text"><strong>${escapeHtml(it.title)}</strong><span>${escapeHtml(it.sub)}</span></div>
      </div>`).join('')
      : `<p class="notif-empty">🌸 Todo en orden — no hay avisos pendientes por ahora.</p>`;

    list.querySelectorAll('.notif-item').forEach((el) => el.addEventListener('click', () => {
      navigate('pedido', el.dataset.id);
    }));

    backdrop.hidden = false;
    sheet.hidden = false;
  }
  function closeNotifSheet() {
    document.getElementById('notif-backdrop').hidden = true;
    document.getElementById('notif-sheet').hidden = true;
  }

  document.getElementById('btn-notifications').addEventListener('click', openNotifSheet);
  document.getElementById('btn-close-notif').addEventListener('click', closeNotifSheet);
  document.getElementById('notif-backdrop').addEventListener('click', closeNotifSheet);

  // ---------------------------------------------------------
  // Navegación global: bottom nav + FAB
  // ---------------------------------------------------------
  navItems.forEach((btn) => btn.addEventListener('click', () => navigate(btn.dataset.route)));
  fab.addEventListener('click', () => navigate('nuevo-pedido'));

  // ---------------------------------------------------------
  // Arranque
  // ---------------------------------------------------------
  function boot() {
    const settings = DB.getSettings();
    applyTheme(settings.theme);
    refreshNotifBadge();

    if (!location.hash) navigate('inicio');
    render();

    document.getElementById('app').hidden = false;
    setTimeout(() => { const splash = document.getElementById('splash'); if (splash) splash.remove(); }, 1500);

    // refresca el aviso cada vez que regresamos a la pestaña
    document.addEventListener('visibilitychange', () => { if (!document.hidden) refreshNotifBadge(); });
    setInterval(refreshNotifBadge, 5 * 60 * 1000);
  }

  document.addEventListener('DOMContentLoaded', boot);

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js').catch((err) => console.warn('SW registro falló', err));
    });
  }
})();
