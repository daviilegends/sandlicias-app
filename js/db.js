/* ============================================================
   Sand'licias — capa de datos (localStorage)
   ============================================================ */
(function (global) {
  const KEY_ORDERS = 'sandlicias.pedidos.v1';
  const KEY_SETTINGS = 'sandlicias.ajustes.v1';

  const DEFAULT_SETTINGS = {
    nombreNegocio: "Sand'licias Repostería",
    propietaria: '',
    telefonoNegocio: '',
    direccionNegocio: '',
    redesNegocio: '',
    theme: 'rosa'
  };

  function uid() {
    return 'p_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
  }

  function readJSON(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return fallback;
      const parsed = JSON.parse(raw);
      return parsed == null ? fallback : parsed;
    } catch (e) {
      console.warn('No se pudo leer', key, e);
      return fallback;
    }
  }

  function writeJSON(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      console.warn('No se pudo guardar', key, e);
      return false;
    }
  }

  const DB = {
    uid,

    getOrders() {
      return readJSON(KEY_ORDERS, []);
    },

    getOrder(id) {
      return this.getOrders().find((o) => o.id === id) || null;
    },

    saveOrder(order) {
      const orders = this.getOrders();
      if (order.id) {
        const idx = orders.findIndex((o) => o.id === order.id);
        if (idx >= 0) {
          orders[idx] = { ...orders[idx], ...order, actualizadoEn: Date.now() };
          writeJSON(KEY_ORDERS, orders);
          return orders[idx];
        }
      }
      const fresh = {
        ...order,
        id: uid(),
        estado: order.estado || 'activo',
        creadoEn: Date.now(),
        actualizadoEn: Date.now()
      };
      orders.push(fresh);
      writeJSON(KEY_ORDERS, orders);
      return fresh;
    },

    deleteOrder(id) {
      const orders = this.getOrders().filter((o) => o.id !== id);
      writeJSON(KEY_ORDERS, orders);
    },

    getSettings() {
      return { ...DEFAULT_SETTINGS, ...readJSON(KEY_SETTINGS, {}) };
    },

    saveSettings(partial) {
      const merged = { ...this.getSettings(), ...partial };
      writeJSON(KEY_SETTINGS, merged);
      return merged;
    },

    exportData() {
      return JSON.stringify({
        app: 'sandlicias',
        version: 1,
        exportadoEn: new Date().toISOString(),
        pedidos: this.getOrders(),
        ajustes: this.getSettings()
      }, null, 2);
    },

    importData(jsonString) {
      const data = JSON.parse(jsonString);
      if (!data || !Array.isArray(data.pedidos)) {
        throw new Error('El archivo no tiene el formato esperado.');
      }
      writeJSON(KEY_ORDERS, data.pedidos);
      if (data.ajustes) writeJSON(KEY_SETTINGS, { ...DEFAULT_SETTINGS, ...data.ajustes });
      return data.pedidos.length;
    }
  };

  global.DB = DB;
})(window);
