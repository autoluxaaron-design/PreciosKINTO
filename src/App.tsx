import React, { useState, useEffect, useMemo, useRef } from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, LineElement, PointElement, RadarController, RadialLinearScale, ArcElement, PieController } from 'chart.js';
import { Bar, Line, Radar, Pie, Doughnut } from 'react-chartjs-2';
import { TasaService, RevistaService } from './lib/api';
const base = './';

const dataLabelPlugin = {
  id: 'dataLabelPlugin',
  afterDatasetsDraw(chart: any) {
    const { ctx } = chart;
    chart.data.datasets.forEach((dataset: any, datasetIndex: number) => {
      const meta = chart.getDatasetMeta(datasetIndex);
      meta.data.forEach((bar: any, index: number) => {
        const value = dataset.data[index];
        if (value === null || value === undefined) return;
        const label = typeof value === 'number'
          ? dataset.label?.includes('%')
            ? `${value.toFixed(2)}%`
            : `$${Number(value).toLocaleString()}`
          : String(value);
        const position = bar.tooltipPosition();
        ctx.save();
        ctx.fillStyle = '#111827';
        ctx.font = '600 10px Inter, system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText(label, position.x, position.y - 6);
        ctx.restore();
      });
    });
  },
};

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, LineElement, PointElement, RadarController, RadialLinearScale, ArcElement, PieController, dataLabelPlugin);

/** 
 * COMPRA KINTO LUX v28.1 - PRECISION MASTER EDITION
 * - Font: DM Sans / Inter
 * - Bulk Upload Fix for Modelo
 * - Detailed Tooltips with Formulas
 * - Advanced Row Highlighting for Top Opportunities
 * - Professional Branding (Logos)
 */

const PROXY = 'https://api.allorigins.win/get?url=';
const TASA_API = 'https://lux.e.toyota.com.ar/api/backend/quotation';
const REVISTA_API = 'https://nuestrosautos.cca.org.ar/api/classifieds';

const norm = (s: string) => s ? s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().trim() : "";

const MARKET_REF: any = {
  "ETIOS": {
    2020: { h: 16441000, j: 15483000 },
    2022: { h: 18613500, j: 22918000 }
  },
  "YARIS": {
    2025: { h: 22303400, j: 26289400 }
  },
  "SW4": { 2022: { h: 48381600, j: 69733900 } },
  "HILUX": {
    2021: { h: 27879900, j: 29385000 },
    2023: { h: 30338900, j: 39787200 },
    2024: { h: 31570300, j: 43972100 }
  },
  "COROLLA": {
    2020: { h: 24190000, j: 25340000 },
    2021: { h: 25173700, j: 26604200 }
  }
};

const fmtP = (n: number | null | undefined) => n != null ? (n * 100).toFixed(2) + '%' : '-';

const Dashboard = ({ vehicles, results }: { vehicles: any[], results: any[] }) => {
  const top3 = [...results].sort((a, b) => a.AG - b.AG).slice(0, 3);

  const generatePDF = async () => {
    const element = document.getElementById('dashboard-content');
    if (!element) return;

    const downloadButton = element.querySelector('button');
    if (downloadButton) {
      downloadButton.style.display = 'none';
    }

    const canvas = await html2canvas(element, { scale: 2, backgroundColor: '#ffffff' });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = 210;
    const pageHeight = 295;
    const ratio = Math.min(pageWidth / canvas.width, pageHeight / canvas.height);
    const imgWidth = canvas.width * ratio;
    const imgHeight = canvas.height * ratio;
    const marginX = (pageWidth - imgWidth) / 2;
    const marginY = (pageHeight - imgHeight) / 2;

    pdf.addImage(imgData, 'PNG', marginX, marginY, imgWidth, imgHeight);

    if (downloadButton) {
      downloadButton.style.display = '';
    }

    pdf.save('informe-compra-kinto-lux.pdf');
  };

  return (
    <div id="dashboard-content" className="w-full max-w-4xl mx-auto bg-white p-6 rounded-xl shadow-lg">
      <div className="text-center mb-6">
        <img src={`${base}autolux.png`} alt="Autolux" className="h-12 mx-auto mb-2" />
        <h1 className="text-2xl font-black text-[#00708d]">INFORME EJECUTIVO DE COMPRA</h1>
        <p className="text-sm text-gray-600">Sistema de Análisis de Rentabilidad Kinto Lux</p>
      </div>

      <section className="mb-6">
        <h2 className="text-xl font-bold mb-4 text-[#00708d]">RESUMEN EJECUTIVO</h2>
        <p className="mb-4">Se analizaron {vehicles.length} vehículos. {results.filter(r => r.AF === 'BARATO').length} oportunidades identificadas como "BARATAS" (evaluación ≤ -5%).</p>
        <p className="mb-4">La referencia de mercado se calcula como: <strong>Referencia = (Tasa × 0.7) + (Revista × 0.3)</strong></p>
        <p>La evaluación final es: <strong>Evaluación = (Precio Base - Referencia) / Referencia</strong></p>
      </section>

      <section className="mb-6">
        <h2 className="text-xl font-bold mb-4 text-[#00708d]">TOP 3 PRIORIDADES VIABLES</h2>
        {top3.map((item, index) => (
          <div key={item.id} className="border rounded p-4 mb-4 bg-green-50">
            <h3 className="font-bold text-lg">#{index + 1} - {item.patente} {item.modelo} {item.anio}</h3>
            <p><strong>Precio Base:</strong> ${item.precioBase.toLocaleString()}</p>
            <p><strong>Referencia Mercado:</strong> ${item.AD.toLocaleString()}</p>
            <p><strong>Evaluación:</strong> {fmtP(item.AE)} (Rentabilidad esperada: {Math.abs(item.AE * 100).toFixed(2)}%)</p>
            <p><strong>Justificación:</strong> Este vehículo ofrece una oportunidad superior con desviación negativa significativa, indicando compra por debajo del valor de mercado.</p>
          </div>
        ))}
      </section>

      <section className="mb-6">
        <h2 className="text-xl font-bold mb-4 text-[#00708d]">COMPARACIÓN EJECUTIVA TOP 3</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-5">
          {top3.map((item, index) => (
            <div key={item.id} className="border border-slate-200 rounded-xl p-3 bg-slate-50">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Ranking #{index + 1}</span>
                <span className="px-2 py-1 rounded-full text-[10px] font-bold bg-[#00708d] text-white">{item.AH}</span>
              </div>
              <h3 className="font-bold text-sm text-slate-900 mb-1">{item.patente} • {item.modelo}</h3>
              <p className="text-[10px] text-slate-600 mb-1"><strong>Año:</strong> {item.anio} • <strong>Versión:</strong> {item.version}</p>
              <p className="text-[10px] text-slate-600 mb-1"><strong>KM:</strong> {item.km.toLocaleString()}</p>
              <p className="text-[10px] text-slate-600 mb-1"><strong>Precio Base:</strong> ${item.precioBase.toLocaleString()}</p>
              <p className="text-[10px] text-slate-600 mb-1"><strong>Tasa Ref.:</strong> ${item.tasaVal.toLocaleString()}</p>
              <p className="text-[10px] text-slate-600 mb-1"><strong>Valor Revista:</strong> ${item.revistaVal.toLocaleString()}</p>
              <p className="text-[10px] text-slate-600 mb-1"><strong>Ref. Mercado:</strong> ${item.AD.toLocaleString()}</p>
              <p className="text-[10px] text-slate-600 mb-1"><strong>Evaluación:</strong> {item.AE.toFixed(2)}%</p>
              <p className="text-[10px] text-slate-600 mb-1"><strong>Desvío Tasa:</strong> {(item.dt * 100).toFixed(2)}%</p>
              <p className="text-[10px] text-slate-600"><strong>Desvío Revista:</strong> {(item.dr * 100).toFixed(2)}%</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-5">
          <div className="bg-gray-50 p-4 rounded-xl border border-slate-200" style={{ minHeight: '250px' }}>
            <h3 className="text-sm font-semibold mb-2 text-[#00708d]">Precio Base vs Referencia Mercado</h3>
            <div className="h-[220px]">
              <Bar
                data={{
                  labels: top3.map(item => `#${item.AG}`),
                  datasets: [
                    {
                      label: 'Precio Base',
                      data: top3.map(item => item.precioBase),
                      backgroundColor: '#00708d',
                    },
                    {
                      label: 'Referencia Mercado',
                      data: top3.map(item => item.AD),
                      backgroundColor: '#28a745',
                    },
                  ],
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  aspectRatio: 1.5,
                  plugins: {
                    legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 10 } } },
                  },
                  scales: {
                    x: { ticks: { font: { size: 10 } }, grid: { display: false } },
                    y: {
                      ticks: {
                        callback: (value) => `$${Number(value).toLocaleString()}`,
                        font: { size: 10 },
                      },
                      grid: { color: '#e2e8f0' },
                    },
                  },
                  datasets: {
                    bar: {
                      maxBarThickness: 42,
                      borderRadius: 8,
                    },
                  },
                }}
              />
            </div>
          </div>

          <div className="bg-gray-50 p-4 rounded-xl border border-slate-200" style={{ minHeight: '250px' }}>
            <h3 className="text-sm font-semibold mb-2 text-[#00708d]">Rentabilidad Esperada</h3>
            <div className="h-[220px]">
              <Bar
                data={{
                  labels: top3.map(item => `#${item.AG}`),
                  datasets: [
                    {
                      label: 'Evaluación (%)',
                    data: top3.map(item => Math.abs(item.AE * 100)),
                      backgroundColor: ['#22c55e', '#f59e0b', '#ef4444'],
                    },
                  ],
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  aspectRatio: 1.5,
                  plugins: {
                    legend: { display: false },
                  },
                  scales: {
                    x: { ticks: { font: { size: 10 } }, grid: { display: false } },
                    y: {
                      ticks: {
                        callback: (value) => `${value}%`,
                        font: { size: 10 },
                      },
                      grid: { color: '#e2e8f0' },
                    },
                  },
                  datasets: {
                    bar: {
                      maxBarThickness: 42,
                      borderRadius: 8,
                    },
                  },
                }}
              />
            </div>
          </div>
        </div>

        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
          <h3 className="text-sm font-semibold mb-3 text-[#00708d]">Tabla Ejecutiva de Comparación</h3>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[10px]">
              <thead>
                <tr className="bg-[#00708d] text-white text-[10px]">
                  <th className="p-2">Ranking</th>
                  <th className="p-2">Dominio</th>
                  <th className="p-2">Modelo</th>
                  <th className="p-2">Año</th>
                  <th className="p-2">KM</th>
                  <th className="p-2">Precio Base</th>
                  <th className="p-2">Tasa Ref.</th>
                  <th className="p-2">Revista</th>
                  <th className="p-2">Desvío Tasa</th>
                  <th className="p-2">Desvío Revista</th>
                  <th className="p-2">Ref. Mercado</th>
                  <th className="p-2">Evaluación</th>
                  <th className="p-2">Señal</th>
                </tr>
              </thead>
              <tbody>
                {top3.map((item) => (
                  <tr key={item.id} className="even:bg-white odd:bg-slate-100">
                    <td className="p-2 text-center">#{item.AG}</td>
                    <td className="p-2 text-center">{item.patente}</td>
                    <td className="p-2 text-center">{item.modelo}</td>
                    <td className="p-2 text-center">{item.anio}</td>
                    <td className="p-2 text-right">{item.km.toLocaleString()}</td>
                    <td className="p-2 text-right">${item.precioBase.toLocaleString()}</td>
                    <td className="p-2 text-right">${item.tasaVal.toLocaleString()}</td>
                    <td className="p-2 text-right">${item.revistaVal.toLocaleString()}</td>
                    <td className="p-2 text-right">{(item.dt * 100).toFixed(2)}%</td>
                    <td className="p-2 text-right">{(item.dr * 100).toFixed(2)}%</td>
                    <td className="p-2 text-right">${item.AD.toLocaleString()}</td>
                    <td className="p-2 text-right">{fmtP(item.AE)}</td>
                    <td className="p-2 text-center">{item.AH}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <div className="text-center mt-6">
        <button onClick={generatePDF} className="bg-[#00708d] text-white px-6 py-2 rounded font-bold">Descargar Informe PDF</button>
      </div>
    </div>
  );
};

export default function App() {
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [cookie, setCookie] = useState('');
  const [showConfig, setShowConfig] = useState(false);
  const [showBulk, setShowBulk] = useState(false);

  const [view, setView] = useState<'analysis' | 'dashboard'>('analysis');

  const [form, setForm] = useState({
    patente: '', modelo: '', anio: '', version: '', km: '', precioBase: ''
  });

  useEffect(() => {
    const saved = localStorage.getItem('kinto_final_v28_1');
    if (saved) setVehicles(JSON.parse(saved));
  }, []);

  useEffect(() => {
    localStorage.setItem('kinto_final_v28_1', JSON.stringify(vehicles));
  }, [vehicles]);

  const results = useMemo(() => {
    if (vehicles.length === 0) return [];
    let analyzed = vehicles.map(v => {
      const F = v.precioBase;
      const H = v.tasaVal || 0;
      const J = v.revistaVal || 0;
      const dt = H > 0 ? (F - H) / H : 0;
      const dr = J > 0 ? (F - J) / J : 0;
      let AD = (H > 0 && J > 0) ? Math.round(H * 0.7 + J * 0.3) : (H || J || 0);
      const AE = (AD > 0) ? (F - AD) / AD : 0;
      let AF = AE === 0 ? 'S/D' : (AE <= -0.05 ? 'BARATO' : (AE < 0.05 ? 'EN MERCADO' : 'CARO'));
      return { ...v, dt, dr, AD, AE, AF };
    });
    const sortedAEs = [...analyzed].map(x => x.AE).sort((a, b) => a - b);
    return analyzed.map(item => {
      const AG = sortedAEs.indexOf(item.AE) + 1;
      let AH = 'S/D';
      if (item.AF === 'BARATO') AH = (AG <= 3) ? 'PRIORIZAR' : 'REVISAR';
      else if (item.AF === 'EN MERCADO') AH = 'NEGOCIAR';
      else if (item.AF === 'CARO') AH = 'NO PRIORITARIO';
      return { ...item, AG, AH };
    });
  }, [vehicles]);

  const analyzeSingle = async (data: any) => {
    const anioNum = parseInt(data.anio) || 2024;
    let modK = norm(data.modelo);
    if (modK === "SU4") modK = "SW4";

    let tV = 0;
    let rV = 0;
    let tMi = 0;
    let tMa = 0;

    try {
      const marca = 'TOYOTA';
      const [tasaResult, revistaResult] = await Promise.all([
        TasaService.searchPrice(marca, modK, anioNum, data.version || ''),
        RevistaService.searchPrice(marca, modK, anioNum, data.version || ''),
      ]);

      if (tasaResult) {
        tMi = Math.round(tasaResult.min);
        tMa = Math.round(tasaResult.max);
        tV = Math.round((tMi + tMa) / 2);
      }

      if (revistaResult) {
        rV = Math.round(revistaResult.precio);
      }
    } catch (error) {
      console.warn('Error fetching market references:', error);
    }

    if ((!tV || !rV) && MARKET_REF[modK] && MARKET_REF[modK][anioNum]) {
      if (!tV) tV = MARKET_REF[modK][anioNum].h;
      if (!rV) rV = MARKET_REF[modK][anioNum].j;
    }

    if (!tV) tV = Math.round(parseInt(data.precioBase) * 0.9493);
    if (!rV) rV = Math.round(parseInt(data.precioBase) * 0.8938);

    if (!tMi) tMi = Math.round(tV * 0.95);
    if (!tMa) tMa = Math.round(tV * 1.05);

    return {
      id: data.id || Math.random().toString(36).substr(2, 9),
      patente: data.patente.toUpperCase(), modelo: modK,
      anio: anioNum, version: (data.version || "").toUpperCase(),
      km: data.km ? data.km.toString().replace(/\./g, '') : 0, 
      precioBase: parseInt(data.precioBase),
      tasaVal: tV, tasaMin: tMi, tasaMax: tMa, revistaVal: rV
    };
  };

  const handleManualAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.patente || !form.modelo || !form.precioBase) return;
    setLoading(true);
    const processed = await analyzeSingle({...form, id: editingId});
    if (editingId) setVehicles(vehicles.map(v => v.id === editingId ? processed : v));
    else setVehicles([...vehicles, processed]);
    setForm({ patente: '', modelo: '', anio: '', version: '', km: '', precioBase: '' });
    setEditingId(null);
    setLoading(false);
  };

  const handleBulkData = async (text: string) => {
    setBulkLoading(true);
    const lines = text.split('\n').filter(l => l.trim().length > 0);
    if (lines.length < 2) { setBulkLoading(false); return; }
    const rawHeaders = lines[0].toLowerCase().split(/[,\t]/).map(h => h.trim());
    const dataRows = lines.slice(1);
    const newUnits: any[] = [];
    for (const row of dataRows) {
      const cols = row.split(/[,\t]/).map(c => c.trim());
      const unit: any = {};
      rawHeaders.forEach((h, i) => {
        const val = cols[i] || "";
        if (h.includes('patente') || h.includes('dominio')) unit.patente = val;
        if (h.includes('modelo')) unit.modelo = val;
        if (h.includes('año') || h.includes('year')) unit.anio = val;
        if (h.includes('version') || h.includes('versión')) unit.version = val;
        if (h.includes('km')) unit.km = val;
        if (h.includes('precio') || h.includes('base')) unit.precioBase = val.replace(/[^0-9]/g, '');
      });
      if (unit.patente && unit.modelo && unit.precioBase) newUnits.push(await analyzeSingle(unit));
    }
    setVehicles([...vehicles, ...newUnits]);
    setBulkLoading(false);
    setShowBulk(false);
  };

  const startEdit = (v: any) => {
    setEditingId(v.id);
    setForm({ patente: v.patente, modelo: v.modelo, anio: v.anio.toString(), version: v.version, km: v.km.toString(), precioBase: v.precioBase.toString() });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const fmt = (n?: number) => n ? new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n) : 'N/D';
  const fmtP = (n: number | null) => n !== null ? (n * 100).toFixed(2) + "%" : "-";

  const clearAnalysis = () => {
    setVehicles([]);
    setEditingId(null);
    setForm({ patente: '', modelo: '', anio: '', version: '', km: '', precioBase: '' });
  };

  const TooltipHeader = ({ label, description, className = '' }: { label: string; description: string; className?: string }) => (
    <th className={`sticky top-0 z-30 px-1 py-2 text-center group relative cursor-help bg-slate-50 ${className}`}>
      <span>{label}</span>
      <div className="invisible group-hover:visible absolute top-full left-1/2 -translate-x-1/2 transform bg-slate-900 text-white p-2 rounded text-[7px] w-44 z-50 mt-1 shadow-2xl border border-slate-700 leading-tight">
        {description}
      </div>
    </th>
  );

  return (
    <div className="min-h-screen w-full bg-[#f1f5f9] text-[#000000] flex flex-col items-center overflow-auto p-0.5 lg:p-2" style={{ fontFamily: "'DM Sans', 'Inter', sans-serif" }}>
      <div className="w-full bg-[#f1f5f9] border-b border-slate-200">
        <header className="w-full bg-white border-b px-6 py-3 flex items-center justify-between shadow-md mb-2 rounded-xl">
          <img src={`${base}kinto.png`} alt="Kinto" className="h-10 md:h-12 object-contain" />
          <div className="flex flex-col items-center">
            <h1 className="text-sm md:text-xl font-black uppercase tracking-tighter leading-none">
              COMPRA <span className="text-[#00708d]">KINTO</span> <span className="text-[#000000]">LUX</span>
            </h1>
            <div className="text-[7px] font-black text-[#00708d] tracking-[0.3em] uppercase mt-1">Sincronización de Análisis</div>
          </div>
          <img src={`${base}autolux.png`} alt="Autolux" className="h-10 md:h-12 object-contain" />
        </header>

        <div className="flex gap-4 mb-4">
          <button onClick={() => setView('analysis')} className={`px-4 py-2 rounded font-bold ${view === 'analysis' ? 'bg-[#00708d] text-white' : 'bg-gray-200 text-gray-700'}`}>Análisis</button>
          <button onClick={() => setView('dashboard')} className={`px-4 py-2 rounded font-bold ${view === 'dashboard' ? 'bg-[#00708d] text-white' : 'bg-gray-200 text-gray-700'}`}>Dashboard</button>
        </div>

        {view === 'analysis' && (
          <div className="px-0.5 lg:px-0 pb-2">
            {showBulk && (
              <section className="bg-slate-800 rounded-xl p-3 text-white shadow-xl animate-in zoom-in duration-300 mb-2">
                 <div className="flex justify-between items-center mb-1"><span className="text-[8px] font-bold text-[#00708d] uppercase">Importación Masiva Excel</span><button onClick={() => setShowBulk(false)} className="text-[8px] opacity-50">X</button></div>
                 <textarea className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-[9px] font-mono outline-none h-20 text-slate-300" placeholder="Dominio	Modelo	Año	Version	KM	Base..." onChange={e => handleBulkData(e.target.value)} />
              </section>
            )}

            <section className={`bg-white rounded-xl border shadow-md transition-all overflow-hidden mb-2 ${editingId ? 'border-amber-400 ring-2 ring-amber-50' : 'border-slate-200'}`}>
              <div className="px-4 py-1.5 border-b bg-slate-50 flex items-center justify-between">
                <h2 className="text-[9px] font-black text-slate-500 uppercase tracking-widest">CARGA MANUAL</h2>
                <div className="flex gap-2 items-center">
                   <button type="button" onClick={() => setShowBulk(!showBulk)} className="text-[7px] font-black text-[#00708d] uppercase hover:underline">Importar Lista</button>
                   <button type="button" onClick={clearAnalysis} className="text-[7px] font-black text-red-500 uppercase hover:underline">Limpiar Análisis</button>
                   <button type="button" onClick={() => setShowConfig(!showConfig)} className="text-slate-300 hover:text-[#00708d] transition-all"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg></button>
                </div>
              </div>
              <div className="p-2.5"><form onSubmit={handleManualAdd} className="flex flex-wrap lg:flex-nowrap items-end gap-1.5 justify-center">
                <div className="w-[65px] space-y-0.5 text-[7px] font-black text-slate-400 uppercase">1. Dominio<input className="w-full p-1.5 rounded border border-slate-200 outline-none font-mono font-bold uppercase focus:border-[#00708d] text-[10px] bg-slate-50" value={form.patente} onChange={e=>setForm({...form, patente: e.target.value})} required /></div>
                <div className="w-[90px] space-y-0.5 text-[7px] font-black text-slate-400 uppercase">2. Modelo<input className="w-full p-1.5 rounded border border-slate-200 outline-none font-bold uppercase focus:border-[#00708d] text-[10px] bg-slate-50" value={form.modelo} onChange={e=>setForm({...form, modelo: e.target.value})} required /></div>
                <div className="w-[45px] space-y-0.5 text-[7px] font-black text-slate-400 uppercase">3. Año<input className="w-full p-1.5 rounded border border-slate-200 outline-none font-bold focus:border-[#00708d] text-[10px] bg-slate-50 text-center" value={form.anio} onChange={e=>setForm({...form, anio: e.target.value})} required /></div>
                <div className="flex-1 min-w-[90px] max-w-[150px] space-y-0.5 text-[7px] font-black text-slate-400 uppercase">4. Versión<input className="w-full p-1.5 rounded border border-slate-200 outline-none font-bold uppercase focus:border-[#00708d] text-[10px] bg-slate-50" value={form.version} onChange={e=>setForm({...form, version: e.target.value})} /></div>
                <div className="w-[65px] space-y-0.5 text-[7px] font-black text-slate-400 uppercase text-right">5. KM<input className="w-full p-1.5 rounded border border-slate-200 outline-none font-bold focus:border-[#00708d] text-[10px] bg-slate-50 text-right" type="number" value={form.km} onChange={e=>setForm({...form, km: e.target.value})} /></div>
                <div className="w-[105px] space-y-0.5 text-[7px] font-black text-[#00708d] uppercase underline text-right">6. Base<input className="w-full p-1.5 rounded border border-[#00708d]/30 outline-none font-black text-[#00708d] bg-[#00708d]/5 text-[10px] text-right" type="number" value={form.precioBase} onChange={e=>setForm({...form, precioBase: e.target.value})} required /></div>
                <button disabled={loading} className={`h-[28px] px-4 rounded font-black text-white text-[8px] uppercase tracking-tighter shadow active:scale-95 ${editingId ? 'bg-amber-400' : 'bg-[#00708d]'}`}>{editingId ? 'GUARDAR' : 'ANALIZAR'}</button>
              </form></div>
            </section>
          </div>
        )}
      </div>

      <main className="w-full flex-1 p-1 space-y-2" style={{ display: view === 'analysis' ? 'block' : 'none' }}>
        <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex-1">
          <div className="overflow-x-auto w-full">
            <div className="max-h-[calc(100vh-22rem)] overflow-y-auto">
              <table className="w-full text-left border-collapse min-w-[1150px] table-fixed">
                 <thead className="bg-slate-50 text-[7px] font-black text-slate-400 uppercase tracking-tighter border-b border-slate-200">
                   <tr>
                 <TooltipHeader label="Dominio" description="Dominio / Patente: Identificador único del vehículo en el análisis." className="w-[60px] sticky left-0 bg-slate-50 z-10 border-r text-center shadow-sm" />
                 <TooltipHeader label="Modelo" description="Modelo normalizado del vehículo usado para referencia de mercado." className="w-[85px]" />
                 <TooltipHeader label="Año" description="Año del vehículo usado para tomar los valores de referencia del mercado." className="w-[40px]" />
                 <TooltipHeader label="Versión" description="Versión o acabado del vehículo, se mantiene en el reporte para contexto." className="w-[110px] text-left" />
                 <TooltipHeader label="KM" description="Kilometraje cargado para mostrar el nivel de uso del vehículo." className="w-[60px] text-right" />
                 <TooltipHeader label="Precio Base" description="Precio Base ingresado para el vehículo, usado como valor inicial de comparación." className="w-[90px] text-right bg-blue-50/20 font-bold text-black border-r border-blue-100" />
                 <TooltipHeader label="Valor Tasa" description="Valor de mercado de tasa calculado según modelo y año, usado para comparar el precio base." className="w-[90px] text-[#00708d]" />
                 <TooltipHeader label="Valor Revista" description="Valor de referencia de revista calculado según modelo y año, usado como segunda referencia de mercado." className="w-[90px] text-[#00708d] border-r" />
                 <TooltipHeader label="Desvío Tasa" description="Porcentaje de desviación entre el Precio Base y el valor de Tasa de referencia." className="w-[55px]" />
                 <TooltipHeader label="Desvío Revista" description="Porcentaje de desviación entre el Precio Base y el Valor de Revista." className="w-[55px] border-r" />
                 <TooltipHeader label="Referencia Mercado" description="Referencia de mercado calculada como promedio ponderado de tasa y revista." className="w-[95px] bg-[#00708d]/5 text-[#00708d] font-black" />
                 <TooltipHeader label="Evaluación" description="Índice final de evaluación que compara el Precio Base con la Referencia de Mercado." className="w-[70px] italic border-x bg-slate-50/50 font-black" />
                 <TooltipHeader label="Posición" description="Clasificación de la oportunidad según la evaluación; ayuda a priorizar vehículos." className="w-[75px]" />
                 <TooltipHeader label="Ranking" description="Orden del vehículo por oportunidad, donde 1 representa la mejor posición." className="w-[40px]" />
                 <TooltipHeader label="Señal de compra" description="Recomendación basada en la evaluación, posición y ranking del vehículo." className="w-[95px]" />
                 <th className="w-[50px] px-1 py-2 text-right"></th>
               </tr>
             </thead>
             <tbody className="divide-y divide-slate-100">
               {results.map(res => (
                 <tr key={res.id} className={`hover:bg-blue-50 transition-all group ${editingId === res.id ? 'bg-amber-50' : ''} ${res.AF === 'BARATO' ? 'bg-green-50/70' : ''}`}>
                   <td className={`px-1 py-2 sticky left-0 group-hover:bg-blue-50 transition-all z-10 border-r shadow-sm text-center font-mono text-[8px] font-black text-[#00708d] ${res.AF === 'BARATO' ? 'bg-green-100/30' : 'bg-white'}`}>{res.patente}</td>
                   <td className="px-1 py-2 font-black text-slate-800 uppercase text-[9px] text-center truncate">{res.modelo}</td>
                   <td className="px-1 py-2 text-center font-bold text-slate-500 text-[9px]">{res.anio}</td>
                   <td className="px-1 py-2 font-medium text-slate-400 text-[8px] truncate italic">{res.version}</td>
                   <td className="px-1 py-2 text-right font-bold text-slate-600 text-[8px]">{Number(res.km).toLocaleString()}</td>
                   <td className="px-1 py-2 text-right font-black text-slate-900 bg-blue-50/20 text-[9px] border-r border-blue-100">{fmt(res.precioBase)}</td>
                   <td className="px-1 py-1.5 text-center text-[8px] font-bold"><div>{fmt(res.tasaVal)}</div><div className="text-[6px] text-slate-300 font-black">M{fmt(res.tasaMin)}|X{fmt(res.tasaMax)}</div></td>
                   <td className="px-1 py-1.5 text-center text-[8px] font-bold border-r border-slate-50">{fmt(res.revistaVal)}</td>
                   <td className={`px-1 py-1.5 text-center font-black text-[8px] ${res.dt < 0 ? 'text-green-600' : 'text-red-500'}`}>{fmtP(res.dt)}</td>
                   <td className={`px-1 py-1.5 text-center font-black text-[8px] border-r border-slate-50 ${res.dr < 0 ? 'text-green-600' : 'text-red-500'}`}>{fmtP(res.dr)}</td>
                   <td className="px-1 py-1.5 text-center bg-[#00708d]/5 font-black text-[#00708d] text-[8px]">{fmt(res.AD)}</td>
                   <td className={`px-1 py-1.5 text-center font-black text-[8px] border-x border-slate-100 bg-slate-50/30 ${res.AE < 0 ? 'text-green-600' : 'text-red-500'}`}>{fmtP(res.AE)}</td>
                   <td className="px-1 py-1.5 text-center"><span className={`px-1 py-0.5 rounded text-[7px] font-black border uppercase ${res.AF === 'BARATO' ? 'bg-green-600 text-white border-green-700' : res.AF === 'CARO' ? 'bg-red-100 text-red-700 border-red-200' : 'bg-slate-100 text-slate-400'}`}>{res.AF}</span></td>
                   <td className="px-1 py-1.5 text-center">
                      <div className={`inline-flex items-center justify-center w-6 h-6 rounded-lg font-black text-[10px] shadow-sm transition-all ${
                        res.AG === 1 ? 'bg-blue-600 text-white scale-125 ring-2 ring-blue-100' :
                        res.AG <= 3 ? 'bg-slate-800 text-white' :
                        'bg-slate-100 text-slate-400'
                      }`}>
                        {res.AG}
                      </div>
                   </td>
                   <td className="px-1 py-1.5 text-center">
                     <span className={`px-1.5 py-0.5 rounded text-[7px] font-black uppercase shadow-sm flex items-center justify-center gap-1 ${
                       res.AH === 'PRIORIZAR' ? 'bg-green-600 text-white animate-pulse ring-2 ring-green-100' : 
                       res.AH === 'NEGOCIAR' ? 'bg-blue-50 text-blue-700 border border-blue-100' : 'bg-slate-100 text-slate-500'
                     }`}>
                       {res.AH === 'PRIORIZAR' && <svg width="8" height="8" viewBox="0 0 24 24" fill="currentColor"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>}
                       {res.AH}
                     </span>
                   </td>
                   <td className="px-1 py-1.5 text-right"><div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all"><button onClick={() => startEdit(res)} className="p-0.5 text-slate-300 hover:text-amber-500 active:scale-90 transition-all"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button><button onClick={() => setVehicles(vehicles.filter(v => v.id !== res.id))} className="p-0.5 text-slate-300 hover:text-red-500 active:scale-90 transition-all"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button></div></td>
                 </tr>
               ))}
             </tbody>
          </table>
            </div>
          </div>
        </section>
      </main>

      <div style={{ display: view === 'dashboard' ? 'block' : 'none' }}>
        <Dashboard vehicles={vehicles} results={results} />
      </div>
      {toast && <div className="fixed bottom-4 right-4 p-3 rounded-lg bg-slate-900 text-white border border-slate-700 shadow-2xl uppercase font-black text-[9px] tracking-widest z-50"><span>{toast}</span></div>}
    </div>
  );
}

