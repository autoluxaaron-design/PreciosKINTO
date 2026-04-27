
// Configuración de Tasa (Toyota Lux)
const TASA_API = 'https://lux.e.toyota.com.ar/api/backend/quotation';
// Configuración de Revista (Nuestros Autos / CCA)
const REVISTA_API = 'https://nuestrosautos.cca.org.ar/api/classifieds';

// Proxy para evitar problemas de CORS
const CORS_PROXY = 'https://api.allorigins.win/get?url=';

async function fetchWithProxy(url: string) {
  try {
    const res = await fetch(`${CORS_PROXY}${encodeURIComponent(url)}`);
    if (!res.ok) throw new Error('Proxy fetch failed');
    const data = await res.json();
    return JSON.parse(data.contents);
  } catch (e) {
    console.error('Error fetching data via proxy:', e);
    return null;
  }
}

export const TasaService = {
  async searchPrice(marca: string, modelo: string, anio: number, version: string) {
    try {
      // Step 1: Brands
      const brandsData = await fetchWithProxy(`${TASA_API}/brands`);
      const brands = brandsData.brands || brandsData || [];
      const brand = brands.find((b: any) => b.name.toUpperCase().includes(marca.toUpperCase()));
      if (!brand) return null;

      // Step 2: Models
      const modelsData = await fetchWithProxy(`${TASA_API}/models/filter_by_brandid/${brand.id}`);
      const models = modelsData.models || modelsData || [];
      const model = models.find((m: any) => m.name.toUpperCase().includes(modelo.toUpperCase()) || modelo.toUpperCase().includes(m.name.toUpperCase()));
      if (!model) return null;

      // Step 3: Versions
      const versionsData = await fetchWithProxy(`${TASA_API}/versions?groupId=${model.id}&brandId=${brand.id}`);
      const versions = versionsData.versions || versionsData || [];
      
      // Token-based fuzzy match for version
      const manualTokens = version.toLowerCase().split(/\s+/).filter(t => t.length > 1);
      let bestV = versions[0];
      let maxScore = -1;
      
      versions.forEach((v: any) => {
        const vLower = v.name.toLowerCase();
        let score = 0;
        manualTokens.forEach(t => { if (vLower.includes(t)) score++; });
        if (score > maxScore) { maxScore = score; bestV = v; }
      });

      if (!bestV) return null;

      // Step 4: Price
      const pricesData = await fetchWithProxy(`${TASA_API}/prices/filter_by_modelid/${bestV.id}`);
      const prices = pricesData.prices || pricesData || [];
      const price = prices.find((p: any) => parseInt(p.year) === anio);
      
      return price ? { min: price.min, max: price.max, matchedVersion: bestV.name } : null;
    } catch (e) {
      return null;
    }
  }
};

export const RevistaService = {
  async searchPrice(marca: string, modelo: string, anio: number, version: string) {
    try {
      // Step 1: Models for the brand
      const models = await fetchWithProxy(`${REVISTA_API}/listamodelos/${encodeURIComponent(marca)}`);
      const model = models.find((m: any) => m.name.toUpperCase().includes(modelo.toUpperCase()) || modelo.toUpperCase().includes(m.name.toUpperCase()));
      if (!model) return null;

      // Step 2: Versions and Prices
      const versions = await fetchWithProxy(`${REVISTA_API}/listaversionanio/${model.id}/${anio}`);
      if (!versions || versions.length === 0) return null;

      // Token-based fuzzy match
      const manualTokens = version.toLowerCase().split(/\s+/).filter(t => t.length > 1);
      let bestV = versions[0];
      let maxScore = -1;

      versions.forEach((v: any) => {
        const vLower = v.version.toLowerCase();
        let score = 0;
        manualTokens.forEach(t => { if (vLower.includes(t)) score++; });
        if (score > maxScore) { maxScore = score; bestV = v; }
      });

      return bestV ? { precio: parseFloat(bestV.precio.replace(/[$.]/g, '')), matchedVersion: bestV.version } : null;
    } catch (e) {
      return null;
    }
  }
};
