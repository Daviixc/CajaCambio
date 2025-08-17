(() => {
  // Tasa mensual por plazo
  const RATES = { 6: 0.05, 12: 0.10, 18: 0.15 };

  // Límites máximos aproximados por moneda
  const LIMITES = {
      MXN: { min: 1000,   max: 1000000 },
      USD: { min: 60,     max: 60000   },
      EUR: { min: 55,     max: 55000   },
  };

  const montoInput   = document.getElementById('monto');
  const plazoSelect  = document.getElementById('plazo');
  const monedaSelect = document.getElementById('moneda');
  const toggleModo   = document.getElementById('toggleModo');

  const btnCalcular  = document.getElementById('btnCalcular');
  const btnLimpiar   = document.getElementById('btnLimpiar');
  const btnExportar  = document.getElementById('btnExportar');
  const exportarDiv  = document.getElementById('exportar');

  const errMonto     = document.getElementById('montoError');

  const resumen      = document.getElementById('resumen');
  const outMonto     = document.getElementById('outMonto');
  const outInteres   = document.getElementById('outInteres');
  const outTotal     = document.getElementById('outTotal');
  const outMensual   = document.getElementById('outMensual');

  const tabla        = document.getElementById('tabla');
  const tbody        = tabla.querySelector('tbody');
  const caption      = tabla.querySelector('caption');

  let locale   = 'es-MX';
  let currency = 'MXN';
  let maxValor = LIMITES[currency].max;
  let minValor = LIMITES[currency].min;

  let fmt = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

  let rowsData = []; 

  const r2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

  const parseMontoFlexible = (str) => {
    if (typeof str !== 'string') return NaN;

    let s = str
      .replace(/\u00A0/g, ' ')                   
      .replace(/\s+/g, '')                       
      .replace(/[\p{Sc}]/gu, '')                 
      .replace(/mxn|usd|eur/gi, '');             

    const hasComma = s.includes(',');
    const hasDot   = s.includes('.');

    if (hasComma && hasDot) {
      const lastComma = s.lastIndexOf(',');
      const lastDot   = s.lastIndexOf('.');
      const dec = lastComma > lastDot ? ',' : '.';
      const thou = dec === ',' ? '.' : ',';
      s = s.replace(new RegExp('\\' + thou, 'g'), '');
      s = s.replace(dec, '.');
    } else if (hasComma && !hasDot) {
      s = s.replace(/\./g, '').replace(',', '.');
    } else {
      s = s.replace(/,/g, '');
    }

    const num = Number(s);
    return Number.isFinite(num) ? num : NaN;
  };

  const validarMonto = (valorStr) => {
  const value = parseMontoFlexible(valorStr);
  if (!Number.isFinite(value)) return { ok: false, msg: 'Ingresa un monto válido.' };
  if (!(value > 0)) return { ok: false, msg: 'El monto debe ser mayor a 0.' };
  if (value < minValor) return { ok: false, msg: `El monto mínimo es ${fmt.format(minValor)}.` };
  if (value > maxValor) return { ok: false, msg: `El monto máximo es ${fmt.format(maxValor)}.` };
  return { ok: true, value };
};

  const setError = (msg) => {
    errMonto.textContent = msg || '';
    montoInput.setAttribute('aria-invalid', msg ? 'true' : 'false');
    btnCalcular.title = msg || '';
  };

  const cuotaFija = (P, i, n) => {
    if (i === 0) return P / n;
    const q = 1 + i;
    return P * (i * Math.pow(q, n)) / (Math.pow(q, n) - 1);
  };

  const leerMeses = () => parseInt(plazoSelect.value, 10);

  const setCaptionMoneda = () => {
    caption.textContent = `Tabla de amortización (${currency})`;
  };

  const addRow = (periodo, saldoIni, cuota, interes, amort, saldoFin) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${periodo}</td>
      <td>${fmt.format(saldoIni)}</td>
      <td>${fmt.format(cuota)}</td>
      <td>${fmt.format(interes)}</td>
      <td>${fmt.format(amort)}</td>
      <td>${fmt.format(saldoFin)}</td>
    `;
    tbody.appendChild(tr);

    rowsData.push({ mes: periodo, saldoIni, cuota, interes, amort, saldoFin });
  };

  const calcular = () => {
    setError('');
    resumen.hidden = true;
    tabla.hidden = true;
    exportarDiv.hidden = true;
    tbody.innerHTML = '';
    rowsData = [];

    const v = validarMonto(montoInput.value);
    if (!v.ok) { setError(v.msg); return; }

    const principal = r2(v.value);
    const meses = leerMeses();
    const tasa  = RATES[meses];

    const cuotaTeorica = cuotaFija(principal, tasa, meses);
    const cuota        = r2(cuotaTeorica);

    setCaptionMoneda();

    let saldo       = principal;
    let interesAcum = 0;
    let pagoUltimo  = cuota;

    addRow(0, saldo, 0, 0, 0, saldo);

    for (let p = 1; p <= meses; p++) {
      const interes   = r2(saldo * tasa);
      let amort       = r2(cuota - interes);
      let pago        = cuota;
      let saldoFinal  = r2(saldo - amort);

      if (p === meses) {
        amort      = r2(saldo);
        pago       = r2(interes + amort);
        saldoFinal = 0;
        pagoUltimo = pago;
      }

      interesAcum = r2(interesAcum + interes);
      addRow(p, saldo, pago, interes, amort, saldoFinal);
      saldo = saldoFinal;
    }

    const totalAPagar = r2(principal + interesAcum);

    outMonto.textContent   = fmt.format(principal);
    outInteres.textContent = fmt.format(interesAcum);
    outTotal.textContent   = fmt.format(totalAPagar);
    outMensual.textContent = (pagoUltimo === cuota)
      ? fmt.format(cuota)
      : `${fmt.format(cuota)} (último ${fmt.format(pagoUltimo)})`;

    resumen.hidden  = false;
    tabla.hidden    = false;
    exportarDiv.hidden = false;
  };

  const limpiar = () => {
    montoInput.value = '';
    plazoSelect.selectedIndex = 0;
    errMonto.textContent = '';
    setError('');

    resumen.hidden = true;
    tabla.hidden = true;
    exportarDiv.hidden = true;

    tbody.innerHTML = '';
    rowsData = [];

    outMonto.textContent   = '—';
    outInteres.textContent = '—';
    outTotal.textContent   = '—';
    outMensual.textContent = '—';

    setCaptionMoneda();

    montoInput.placeholder = ejemploPlaceholder();
    montoInput.focus();
  };

  const exportarCSV = () => {
    if (!rowsData.length) return;

    let csv = 'Mes,Saldo inicial,Cuota,Interes,Amortizacion,Saldo final\n';
    rowsData.forEach(r => {
      const line = [
        r.mes,
        r.saldoIni.toFixed(2),
        r.cuota.toFixed(2),
        r.interes.toFixed(2),
        r.amort.toFixed(2),
        r.saldoFin.toFixed(2)
      ].join(',');
      csv += line + '\n';
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `tabla_amortizacion_${currency}.csv`;
    link.click();
  };

  const cambiarTema = () => {
    const esOscuro = document.body.classList.toggle('dark-mode');
    toggleModo.textContent = esOscuro ? '☀️' : '🌙';
    localStorage.setItem('modoOscuro', esOscuro ? '1' : '0');
  };

  const ejemploPlaceholder = () => {
    const ejemplo = 12000;
    return fmt.format(ejemplo); 
  };

  const cambiarMoneda = () => {
  const [loc, curr] = monedaSelect.value.split('|');
  locale   = loc;
  currency = curr;
  maxValor = LIMITES[currency]?.max || 1000000;
  minValor = LIMITES[currency]?.min || 1;

  fmt = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

  limpiar(); 
};

  btnCalcular.addEventListener('click', calcular);
  btnLimpiar.addEventListener('click', limpiar);
  btnExportar.addEventListener('click', exportarCSV);
  toggleModo.addEventListener('click', cambiarTema);
  monedaSelect.addEventListener('change', cambiarMoneda);

  montoInput.addEventListener('blur', () => {
    const v = validarMonto(montoInput.value);
    setError(v.ok ? '' : v.msg);
    if (v.ok) montoInput.value = fmt.format(r2(v.value));
  });

  montoInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') calcular();
  });

  setCaptionMoneda();
  montoInput.placeholder = ejemploPlaceholder();

  if (localStorage.getItem('modoOscuro') === '1') {
    document.body.classList.add('dark-mode');
    toggleModo.textContent = '☀️';
  }
})();
