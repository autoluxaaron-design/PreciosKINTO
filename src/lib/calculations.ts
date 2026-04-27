
// 1. Basic Interface for Vehicle Data
export interface VehicleData {
  id: string;
  patente: string;
  marca: string;
  modelo: string;
  anio: number;
  version: string;
  km: number;
  precioBase: number;
  tasaPriceMin?: number;
  tasaPriceMax?: number;
  tasaPrice?: number; // Average for calculations
  revistaPrice?: number;
}

// 2. Interface for Analysis Results
export interface AnalysisResult extends VehicleData {
  desvioTasa: number | null;
  desvioRevista: number | null;
  referenciaMercado: number | null;
  indicePosicionamiento: number | null;
  posicionPrecio: 'BARATO' | 'EN MERCADO' | 'CARO' | 'S/D';
  rankingOportunidad: number | null;
  senalCompra: 'PRIORIZAR' | 'REVISAR' | 'NEGOCIAR' | 'NO PRIORITARIO' | 'S/D';
}

// 3. Calculation Engine - Exact replica of the Google Sheets formulas
export function calculateFullAnalysis(vehicles: VehicleData[]): AnalysisResult[] {
  if (vehicles.length === 0) return [];

  // Step 1: Basic calculations and Market Reference
  let analyzed = vehicles.map(v => {
    const H = v.tasaPrice || 0; // Tasa
    const J = v.revistaPrice || 0; // Revista
    const F = v.precioBase;

    // FÓRMULA 1: Desvío PB vs Tasa % = (F-H)/H
    const desvioTasa = H > 0 ? (F - H) / H : null;

    // FÓRMULA 2: Desvío PB vs Revista % = (F-J)/J
    const desvioRevista = J > 0 ? (F - J) / J : null;

    // FÓRMULA 3: Referencia Mercado Externa (AD)
    // =SI((H3:H="")*(J3:J="");"";REDONDEAR(SI((H3:H<>"")*(J3:J<>"");H3:H*0,7+J3:J*0,3;SI(H3:H<>"";H3:H;J3:J));0))
    let AD: number | null = null;
    if (H > 0 && J > 0) {
      AD = Math.round(H * 0.7 + J * 0.3);
    } else if (H > 0) {
      AD = H;
    } else if (J > 0) {
      AD = J;
    }

    // FÓRMULA 4: Índice Posicionamiento PB % (AE) = (F-AD)/AD
    const AE = (AD && AD > 0) ? (F - AD) / AD : null;

    // FÓRMULA 5: Posición Precio Base (AF)
    // =SI(AE3:AE="";"";SI(AE3:AE<=-0,05;"BARATO";SI(AE3:AE<0,05;"EN MERCADO";"CARO")))
    let AF: AnalysisResult['posicionPrecio'] = 'S/D';
    if (AE !== null) {
      if (AE <= -0.05) AF = 'BARATO';
      else if (AE < 0.05) AF = 'EN MERCADO';
      else AF = 'CARO';
    }

    return {
      ...v,
      desvioTasa,
      desvioRevista,
      referenciaMercado: AD,
      indicePosicionamiento: AE,
      posicionPrecio: AF,
      rankingOportunidad: null, // Placeholder
      senalCompra: 'S/D', // Placeholder
    };
  });

  // Step 2: Ranking Oportunidad (AG) - Based on AE (Indice Posicionamiento)
  // Sort all items that have a positioning index
  const validForRanking = analyzed
    .filter(a => a.indicePosicionamiento !== null)
    .sort((a, b) => (a.indicePosicionamiento || 0) - (b.indicePosicionamiento || 0));

  const finalResults: AnalysisResult[] = analyzed.map(item => {
    let AG: number | null = null;
    if (item.indicePosicionamiento !== null) {
      AG = validForRanking.findIndex(v => v.id === item.id) + 1;
    }

    let AH: AnalysisResult['senalCompra'] = 'S/D';
    if (item.posicionPrecio === 'BARATO') {
      AH = (AG !== null && AG <= 3) ? 'PRIORIZAR' : 'REVISAR';
    } else if (item.posicionPrecio === 'EN MERCADO') {
      AH = 'NEGOCIAR';
    } else if (item.posicionPrecio === 'CARO') {
      AH = 'NO PRIORITARIO';
    }

    return {
      ...item,
      rankingOportunidad: AG,
      senalCompra: AH
    } as AnalysisResult;
  });

  return finalResults;
}
