// Local sample content follows the final Figma result cards and suggestion states.
export const services = [
  { id: 'dsl', title: 'Recharge DSL', icon: 'f6cba.svg', keywords: 'dsl router internet recharge' },
  { id: 'balance', title: 'Balance recharge', icon: 'cf64c.svg', keywords: 'balance my number recharge' },
  { id: 'internet', title: 'Recharge mobile internet', icon: 'fadf4.svg', keywords: 'internet mobile recharge' },
  { id: 'cash', title: 'Vodafone cash recharge', icon: '092f3.svg', keywords: 'cash wallet money recharge' },
  { id: 'home', title: 'Recharge home wireless', icon: '70d9a.svg', keywords: 'home wireless router recharge' },
  { id: 'others', title: 'Recharge for others', icon: 'cfab1.svg', keywords: 'others number recharge' },
  { id: 'dsl-flex', title: 'Recharge DSL', icon: 'e38d8.svg', keywords: 'dsl flex recharge', description: 'in Flex' },
];
export const mobileServices = [
  { id: 'mobile-internet', title: 'Mobile internet', icon: 'fadf4.svg', keywords: 'mobile internet data' },
  { id: 'roaming', title: 'Global Mobile roaming', icon: '57e4d.svg', keywords: 'mobile global roaming travel' },
];
export const products = [
  { id: 'oppo-vodafone', title: 'OPPO Find X9 Pro 256 GB AI Phone', image: '7a8be.png', price: '165,00 EGP', tag: 'Sponsored', tagType: 'sponsored', stores: 1, storeLabel: 'Vodafone Shop', merchants: ['vodafone'] },
  { id: 'oppo-stores', title: 'OPPO Find X9 Pro 256 GB AI Phone', image: '7a8be.png', price: '165,00 EGP', stores: 3, merchants: ['btech', 'amazon', 'vodafone'] },
  { id: 'iphone', title: 'iPhone Air 256 GB', image: '003fe.png', price: '80,00 EGP', tag: 'Best Seller', tagType: 'seller', stores: 3, merchants: ['btech', 'amazon', 'vodafone'], crop: true },
  { id: 'buds', title: 'Oppo Enco Buds Air4', image: 'e2ec2.png', price: '9,00 EGP', oldPrice: '10,000 EGP', tag: 'New Arrival', tagType: 'new', stores: 2, merchants: ['btech', 'amazon'] },
];
export const promotions = [
  { id: 'play', title: 'Play & Win Promo', description: 'Play to win mobile phone and more', image: 'e9b4d.png', pattern: '4dc2d.png', logo: '0d717.png', ellipse: 'd403e.svg', circle: 'a025b.svg' },
  { id: 'iphone-promo', title: 'iPhone 17', description: 'Now you can buy iPhone 17 from Tradeline', image: 'c5ef2.png', pattern: '4dc2d.png', logo: 'f42ff.png', ellipse: 'de2d3.svg', circle: 'c6e9c.svg' },
];
export const merchants = [
  { id: 'vodafone', name: 'Vodafone Shop', logo: '1a157.png' },
  { id: 'btech', name: 'B.Tech', logo: '5ac19.png' },
  { id: 'amazon', name: 'Amazon', logo: 'd8d40.png' },
];
const rechargeSuggestions = ['Recharge DSL', 'Recharge my number', 'Recharge for others', 'Recharge home wireless', 'Recharge cash wallet'];
const mobileSuggestions = ['Mobile internet', 'Mobile phone', 'Global Mobile roaming'];
export function normalize(query) { return String(query ?? '').toLowerCase().trim().replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' '); }
export function suggestionsFor(query) {
  const q = normalize(query);
  if (!q) return [];
  const pool = /^(r|re|rec|rech|recha|rechar|recharg|recharge)/.test(q) ? rechargeSuggestions : /^(m|mo|mob|mobi|mobil|mobile)/.test(q) ? mobileSuggestions : [...rechargeSuggestions, ...mobileSuggestions];
  return pool.filter(item => normalize(item).includes(q)).slice(0, 5);
}
export function resultsFor(query) {
  const q = normalize(query);
  const empty = { services: [], products: [], promotions: [], merchants: [] };
  if (!q) return empty;
  if (q === 'mobile') return { services: mobileServices, products, promotions, merchants };
  if (q === 'recharge') return { ...empty, services };
  if (['phones', 'phone', 'mobile phone', 'smart phone', 'smartphone'].includes(q)) return { ...empty, products, promotions, merchants };
  if (q === 'recharge my number' || q === 'recharge balance') return { ...empty, services: services.filter(item => item.id === 'balance') };
  if (q === 'recharge cash wallet' || q === 'cash') return { ...empty, services: services.filter(item => item.id === 'cash') };
  const exactServices = [...mobileServices, ...services].filter(item => normalize(item.title) === q);
  const matchingServices = exactServices.length ? exactServices : [...mobileServices, ...services].filter(item => normalize(item.title).includes(q));
  const matchingProducts = products.filter(item => normalize(item.title).includes(q));
  const matchingPromotions = promotions.filter(item => normalize(item.title).includes(q));
  const merchantIds = new Set(matchingProducts.flatMap(item => item.merchants));
  return { services: matchingServices, products: matchingProducts, promotions: matchingPromotions, merchants: merchants.filter(item => merchantIds.has(item.id)) };
}
export function countsFor(results) {
  return { All: results.services.length + results.products.length + results.promotions.length, Services: results.services.length, Entertainment: results.promotions.length, Shop: results.products.length, Gaming: 0, Merchants: results.merchants.length };
}
