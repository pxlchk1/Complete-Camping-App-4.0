/**
 * Intelligent Shopping List Parser
 * Smart ingredient recognition with automatic categorization
 */

import { 
  MealIngredient, 
  IngredientCategory, 
  ShoppingListItem,
  CATEGORY_ORDER 
} from "../types/meals";

/**
 * ShoppingListParser - Intelligently parses meal text into structured ingredients
 */
export class ShoppingListParser {
  // Common camping staples that users might already have
  private static COMMON_STAPLES = [
    "salt", "pepper", "oil", "butter", "water", "ice"
  ];

  // Ingredient keywords mapped to categories
  private static CATEGORY_KEYWORDS: Record<string, IngredientCategory> = {
    // Protein
    "beef": "protein",
    "chicken": "protein",
    "pork": "protein",
    "fish": "protein",
    "turkey": "protein",
    "sausage": "protein",
    "bacon": "protein",
    "ham": "protein",
    "eggs": "protein",
    "egg": "protein",
    "meat": "protein",
    "jerky": "protein",
    "hot dog": "protein",
    "burger": "protein",
    "salmon": "protein",
    "shrimp": "protein",
    
    // Produce
    "lettuce": "produce",
    "tomato": "produce",
    "onion": "produce",
    "bell pepper": "produce",
    "carrot": "produce",
    "potato": "produce",
    "apple": "produce",
    "orange": "produce",
    "banana": "produce",
    "berries": "produce",
    "fruit": "produce",
    "vegetable": "produce",
    "zucchini": "produce",
    "cucumber": "produce",
    "grape": "produce",
    "spinach": "produce",
    
    // Dairy
    "milk": "dairy",
    "cheese": "dairy",
    "yogurt": "dairy",
    "butter": "dairy",
    "cream": "dairy",
    "sour cream": "dairy",
    "mozzarella": "dairy",
    "cheddar": "dairy",
    "parmesan": "dairy",
    
    // Grains
    "bread": "grains",
    "bun": "grains",
    "roll": "grains",
    "pasta": "grains",
    "rice": "grains",
    "tortilla": "grains",
    "oatmeal": "grains",
    "cereal": "grains",
    "pancake": "grains",
    "granola": "grains",
    "cracker": "grains",
    "couscous": "grains",
    "flatbread": "grains",
    "pizza dough": "grains",
    "macaroni": "grains",
    
    // Canned
    "beans": "canned",
    "soup": "canned",
    "sauce": "canned",
    "canned": "canned",
    "tomatoes": "canned",
    "kidney": "canned",
    
    // Condiments
    "ketchup": "condiments",
    "mustard": "condiments",
    "mayo": "condiments",
    "salsa": "condiments",
    "dressing": "condiments",
    "syrup": "condiments",
    "honey": "condiments",
    "jam": "condiments",
    "oil": "condiments",
    "olive oil": "condiments",
    "hummus": "condiments",
    "peanut butter": "condiments",
    "guacamole": "condiments",
    "relish": "condiments",
    
    // Spices
    "salt": "spices",
    "pepper": "spices",
    "seasoning": "spices",
    "spice": "spices",
    "garlic": "spices",
    "cinnamon": "spices",
    "chili": "spices",
    "taco": "spices",
    "fajita": "spices",
    "cumin": "spices",
    
    // Snacks
    "chips": "snacks",
    "trail mix": "snacks",
    "nuts": "snacks",
    "granola bar": "snacks",
    "marshmallow": "snacks",
    "chocolate": "snacks",
    "candy": "snacks",
    "popcorn": "snacks",
    "cookie": "snacks",
    "graham": "snacks",
    "dried fruit": "snacks",
    
    // Beverages
    "coffee": "beverages",
    "tea": "beverages",
    "juice": "beverages",
    "soda": "beverages",
    "water": "beverages",
    "drink": "beverages",
  };

  /**
   * Parse meal text into structured ingredients
   */
  static parseMealText(mealText: string, mealSource: string): MealIngredient[] {
    if (!mealText || mealText.trim().length === 0) return [];
    
    const ingredients: MealIngredient[] = [];
    const text = mealText.toLowerCase();
    
    // Check for known patterns
    const patterns = [
      // "grilled chicken with vegetables"
      /(?:grilled|baked|fried|roasted)\s+([a-z]+)/gi,
      // "chicken and rice"
      /([a-z]+)\s+(?:and|with|&)\s+([a-z]+)/gi,
      // Single words that might be ingredients
      /\b([a-z]{4,})\b/gi,
    ];
    
    const foundIngredients = new Set<string>();
    
    patterns.forEach(pattern => {
      const matches = text.matchAll(pattern);
      for (const match of matches) {
        for (let i = 1; i < match.length; i++) {
          const word = match[i];
          if (word && this.isLikelyIngredient(word)) {
            foundIngredients.add(word);
          }
        }
      }
    });
    
    // Convert to structured ingredients
    foundIngredients.forEach(item => {
      const category = this.categorizeIngredient(item);
      if (category) {
        ingredients.push({
          item: this.capitalizeWords(item),
          quantity: 1,
          unit: "serving",
          category: category,
        });
      }
    });
    
    return ingredients;
  }

  /**
   * Determine if a word is likely an ingredient
   */
  private static isLikelyIngredient(word: string): boolean {
    // Filter out common non-ingredient words
    const stopWords = [
      "with", "and", "the", "for", "over", "under", "from", "into",
      "grilled", "baked", "fried", "roasted", "cooked", "fresh",
      "some", "any", "all", "each", "every", "this", "that",
    ];
    
    if (stopWords.includes(word)) return false;
    if (word.length < 4) return false;
    if (this.COMMON_STAPLES.includes(word)) return false;
    
    // Check if it matches any category keyword
    return Object.keys(this.CATEGORY_KEYWORDS).some(keyword => 
      word.includes(keyword) || keyword.includes(word)
    );
  }

  /**
   * Categorize an ingredient
   */
  private static categorizeIngredient(item: string): IngredientCategory | null {
    const lowerItem = item.toLowerCase();
    
    for (const [keyword, category] of Object.entries(this.CATEGORY_KEYWORDS)) {
      if (lowerItem.includes(keyword) || keyword.includes(lowerItem)) {
        return category;
      }
    }
    
    return "snacks"; // Default category
  }

  /**
   * Merge ingredients from multiple meals
   */
  static mergeIngredients(ingredientsList: MealIngredient[][]): ShoppingListItem[] {
    const mergedMap = new Map<string, ShoppingListItem>();
    let idCounter = 1;
    
    ingredientsList.forEach(ingredients => {
      ingredients.forEach(ingredient => {
        const key = `${ingredient.item.toLowerCase()}-${ingredient.category}`;
        
        if (mergedMap.has(key)) {
          const existing = mergedMap.get(key)!;
          existing.quantity += ingredient.quantity;
          existing.source += `, ${ingredient.item}`;
        } else {
          mergedMap.set(key, {
            id: `item-${idCounter++}`,
            item: ingredient.item,
            quantity: ingredient.quantity,
            unit: ingredient.unit,
            category: ingredient.category,
            checked: false,
            source: ingredient.item,
            optional: ingredient.optional,
          });
        }
      });
    });
    
    return Array.from(mergedMap.values());
  }

  /**
   * Group shopping list by category with proper order
   */
  static groupByCategory(items: ShoppingListItem[]): Map<IngredientCategory, ShoppingListItem[]> {
    const grouped = new Map<IngredientCategory, ShoppingListItem[]>();
    
    CATEGORY_ORDER.forEach(category => {
      const categoryItems = items.filter(item => item.category === category);
      if (categoryItems.length > 0) {
        grouped.set(category, categoryItems.sort((a, b) => a.item.localeCompare(b.item)));
      }
    });
    
    return grouped;
  }

  /**
   * Helper to capitalize words
   */
  private static capitalizeWords(str: string): string {
    return str.split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  /**
   * Generate shopping list from meal suggestions
   */
  static generateFromSuggestions(
    usedSuggestions: { suggestionId: string; suggestions: { id: string; ingredients: MealIngredient[] }[] }[]
  ): ShoppingListItem[] {
    const allIngredients: MealIngredient[] = [];
    
    usedSuggestions.forEach(({ suggestionId, suggestions }) => {
      const suggestion = suggestions.find(s => s.id === suggestionId);
      if (suggestion && suggestion.ingredients) {
        allIngredients.push(...suggestion.ingredients);
      }
    });
    
    const merged = this.mergeIngredients([allIngredients]);
    return merged;
  }

  /**
   * Generate shopping list from an array of MealIngredient arrays
   */
  static generateFromIngredients(ingredientArrays: MealIngredient[][]): ShoppingListItem[] {
    return this.mergeIngredients(ingredientArrays);
  }

  /**
   * Format shopping list for export
   */
  static formatForExport(items: ShoppingListItem[], groupByCategory: boolean = true): string {
    if (groupByCategory) {
      const grouped = this.groupByCategory(items);
      let output = "🛒 SHOPPING LIST\n";
      output += "=" + "=".repeat(40) + "\n\n";
      
      grouped.forEach((categoryItems, category) => {
        output += `\n📦 ${this.capitalizeWords(category)}\n`;
        output += "-".repeat(40) + "\n";
        categoryItems.forEach(item => {
          const checkbox = item.checked ? "✅" : "☐";
          const qty = item.quantity > 1 ? ` (${item.quantity} ${item.unit})` : "";
          output += `${checkbox} ${item.item}${qty}\n`;
        });
      });
      
      return output;
    } else {
      let output = "🛒 SHOPPING LIST\n";
      output += "=" + "=".repeat(40) + "\n\n";
      items.forEach(item => {
        const checkbox = item.checked ? "✅" : "☐";
        const qty = item.quantity > 1 ? ` (${item.quantity} ${item.unit})` : "";
        output += `${checkbox} ${item.item}${qty}\n`;
      });
      return output;
    }
  }

  /**
   * Smart suggestions for common camping staples
   */
  static getSuggestedStaples(days: number, people: number): ShoppingListItem[] {
    return [
      {
        id: "staple-1",
        item: "Salt & Pepper",
        quantity: 1,
        unit: "set",
        category: "spices",
        checked: false,
        source: "staple",
      },
      {
        id: "staple-2",
        item: "Cooking Oil",
        quantity: 1,
        unit: "bottle",
        category: "condiments",
        checked: false,
        source: "staple",
      },
      {
        id: "staple-3",
        item: "Paper Towels",
        quantity: Math.ceil(days / 3),
        unit: "rolls",
        category: "snacks", // Using snacks as miscellaneous
        checked: false,
        source: "staple",
      },
      {
        id: "staple-4",
        item: "Aluminum Foil",
        quantity: 1,
        unit: "roll",
        category: "snacks",
        checked: false,
        source: "staple",
      },
      {
        id: "staple-5",
        item: "Ice",
        quantity: Math.ceil((days * people) / 2),
        unit: "bags",
        category: "beverages",
        checked: false,
        source: "staple",
      },
      {
        id: "staple-6",
        item: "Drinking Water",
        quantity: days * people,
        unit: "gallons",
        category: "beverages",
        checked: false,
        source: "staple",
      },
    ];
  }
}

// Type for meal plan day
interface MealPlanDay {
  day: number;
  breakfast?: { text: string; recipe?: string };
  lunch?: { text: string; recipe?: string };
  dinner?: { text: string; recipe?: string };
  snacks?: { text: string; recipe?: string };
}

/**
 * Format a complete meal plan for export
 */
export function formatMealPlanForExport(
  tripName: string,
  days: MealPlanDay[],
  shoppingList: ShoppingListItem[],
  includeRecipes: boolean = false
): string {
  let output = `🏕️ ${tripName} - Meal Plan\n`;
  output += "=".repeat(50) + "\n\n";
  
  // Meal plan
  days.forEach(day => {
    const hasMeals = day.breakfast || day.lunch || day.dinner || day.snacks;
    if (hasMeals) {
      output += `📅 Day ${day.day}\n`;
      output += "-".repeat(50) + "\n";
      
      if (day.breakfast) {
        const breakfastText = typeof day.breakfast === 'string' ? day.breakfast : day.breakfast.text;
        output += `  🌅 Breakfast: ${breakfastText}\n`;
        if (includeRecipes && day.breakfast.recipe) {
          output += `     Recipe: ${day.breakfast.recipe}\n`;
        }
      }
      
      if (day.lunch) {
        const lunchText = typeof day.lunch === 'string' ? day.lunch : day.lunch.text;
        output += `  ☀️ Lunch: ${lunchText}\n`;
        if (includeRecipes && day.lunch.recipe) {
          output += `     Recipe: ${day.lunch.recipe}\n`;
        }
      }
      
      if (day.dinner) {
        const dinnerText = typeof day.dinner === 'string' ? day.dinner : day.dinner.text;
        output += `  🌙 Dinner: ${dinnerText}\n`;
        if (includeRecipes && day.dinner.recipe) {
          output += `     Recipe: ${day.dinner.recipe}\n`;
        }
      }
      
      if (day.snacks) {
        const snacksText = typeof day.snacks === 'string' ? day.snacks : day.snacks.text;
        output += `  🍿 Snacks: ${snacksText}\n`;
      }
      
      output += "\n";
    }
  });
  
  // Shopping list
  if (shoppingList.length > 0) {
    output += "\n" + ShoppingListParser.formatForExport(shoppingList, true);
  }
  
  output += "\n" + "-".repeat(50) + "\n";
  output += "Created with Tent & Lantern 🏕️\n";
  
  return output;
}
