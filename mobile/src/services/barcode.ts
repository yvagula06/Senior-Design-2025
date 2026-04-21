/**
 * Barcode Lookup Service
 *
 * Looks up packaged food nutrition by UPC / EAN barcode
 * using the Open Food Facts public API (no key required).
 *
 * API docs: https://world.openfoodfacts.org/data
 */

export interface BarcodeProduct {
  barcode: string;
  productName: string;
  brand: string;
  servingSize: string;
  /** All values are per-serving (already scaled from per-100g) */
  nutrition: {
    calories: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
    fiber_g: number;
    sugar_g: number;
    sodium_mg: number;
  };
  imageUrl?: string;
}

interface OFFNutriments {
  'energy-kcal_100g'?: number;
  'energy-kcal_serving'?: number;
  proteins_100g?: number;
  proteins_serving?: number;
  carbohydrates_100g?: number;
  carbohydrates_serving?: number;
  fat_100g?: number;
  fat_serving?: number;
  fiber_100g?: number;
  fiber_serving?: number;
  sugars_100g?: number;
  sugars_serving?: number;
  sodium_100g?: number;
  sodium_serving?: number;
}

interface OFFProduct {
  product_name?: string;
  brands?: string;
  serving_size?: string;
  serving_quantity?: number;
  nutriments?: OFFNutriments;
  image_front_url?: string;
  image_url?: string;
}

interface OFFResponse {
  status: number; // 1 = found, 0 = not found
  product?: OFFProduct;
}

/**
 * Fetch product nutrition by barcode (UPC-A, EAN-13, EAN-8, UPC-E).
 * Scales per-100g values to per-serving when serving size is available.
 *
 * @throws string with user-friendly message
 */
export async function lookupBarcode(barcode: string): Promise<BarcodeProduct> {
  const url = `https://world.openfoodfacts.org/api/v0/product/${encodeURIComponent(barcode)}.json`;

  let data: OFFResponse;
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'NutriLabelAI/1.0 (contact@nutrilabelai.com)' },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    data = await res.json();
  } catch {
    throw 'Network error. Please check your connection and try again.';
  }

  if (data.status !== 1 || !data.product) {
    throw 'Product not found. Try searching by name instead.';
  }

  const p = data.product;
  const n = p.nutriments ?? {};
  const servingQty = p.serving_quantity ?? 100; // grams per serving, default 100
  const scale = servingQty / 100;

  const pick = (per100: number | undefined, perServing: number | undefined): number => {
    if (perServing !== undefined) return Math.round(perServing * 10) / 10;
    if (per100 !== undefined) return Math.round(per100 * scale * 10) / 10;
    return 0;
  };

  return {
    barcode,
    productName: p.product_name?.trim() || 'Unknown Product',
    brand: p.brands?.split(',')[0].trim() || '',
    servingSize: p.serving_size || `${servingQty}g`,
    nutrition: {
      calories: pick(n['energy-kcal_100g'], n['energy-kcal_serving']),
      protein_g: pick(n.proteins_100g, n.proteins_serving),
      carbs_g: pick(n.carbohydrates_100g, n.carbohydrates_serving),
      fat_g: pick(n.fat_100g, n.fat_serving),
      fiber_g: pick(n.fiber_100g, n.fiber_serving),
      sugar_g: pick(n.sugars_100g, n.sugars_serving),
      sodium_mg: pick(
        n.sodium_100g !== undefined ? n.sodium_100g * 1000 : undefined,
        n.sodium_serving !== undefined ? n.sodium_serving * 1000 : undefined,
      ),
    },
    imageUrl: p.image_front_url || p.image_url,
  };
}
