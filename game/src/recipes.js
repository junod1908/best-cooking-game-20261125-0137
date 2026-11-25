// Ingredients and recipes. Each ingredient knows how it is prepared: chopped on a
// board, cooked on a stove, or served as-is. Each recipe is a set of prepared
// ingredients with a price; an order is served when a plate holds exactly that set.
export const INGREDIENTS = {
  tomato: { name: 'Tomato', prep: 'chop', color: '#e5484d', dark: '#a92c31', emoji: '🍅' },
  lettuce: { name: 'Lettuce', prep: 'chop', color: '#46a758', dark: '#2c6e3a', emoji: '🥬' },
  patty: { name: 'Patty', prep: 'cook', color: '#8b5a2b', dark: '#5e3a17', emoji: '🥩' },
  pasta: { name: 'Pasta', prep: 'cook', color: '#f5c542', dark: '#c99a1e', emoji: '🍝' },
  cheese: { name: 'Cheese', prep: 'none', color: '#ffb224', dark: '#d18a06', emoji: '🧀' },
  bun: { name: 'Bun', prep: 'none', color: '#e8b06a', dark: '#b97f3a', emoji: '🍞' },
};

export const COOK_SECONDS = { patty: 9, pasta: 11 };

export const RECIPES = [
  { id: 'salad', name: 'Garden Salad', needs: ['tomato', 'lettuce'], price: 18 },
  { id: 'sandwich', name: 'Cheese Sandwich', needs: ['bun', 'lettuce', 'cheese'], price: 22 },
  { id: 'pasta', name: 'Tomato Pasta', needs: ['pasta', 'tomato'], price: 24 },
  { id: 'steak', name: 'Steak Plate', needs: ['patty', 'lettuce'], price: 26 },
  { id: 'burger', name: 'Sizzle Burger', needs: ['bun', 'patty', 'cheese'], price: 28 },
  { id: 'supreme', name: 'Supreme Stack', needs: ['bun', 'patty', 'cheese', 'lettuce', 'tomato'], price: 40 },
];

export function recipeById(id) {
  return RECIPES.find((recipe) => recipe.id === id) ?? null;
}

/** The recipe a plate's ingredients match exactly, or null. */
export function recipeForPlate(items) {
  const sorted = [...items].sort();
  return RECIPES.find((recipe) => {
    const needs = [...recipe.needs].sort();
    return needs.length === sorted.length && needs.every((need, index) => need === sorted[index]);
  }) ?? null;
}

/** How an ingredient must be prepared before it can go on a plate. */
export function prepFor(ingredient) {
  return INGREDIENTS[ingredient]?.prep ?? 'none';
}

export function ingredientColor(ingredient) {
  return INGREDIENTS[ingredient]?.color ?? '#888888';
}

export function ingredientDark(ingredient) {
  return INGREDIENTS[ingredient]?.dark ?? '#555555';
}
