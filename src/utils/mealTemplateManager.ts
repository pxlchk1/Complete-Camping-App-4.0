/**
 * Meal Template Manager
 * Handles saving, loading, and managing reusable meal plan templates
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import { MealTemplate, EnhancedMeal, QuickStartTemplate } from "../types/meals";

const MEAL_TEMPLATES_KEY = "@meal_templates";
const MEAL_HISTORY_KEY = "@meal_history";
const FREQUENTLY_USED_KEY = "@frequently_used_meals";

// Type for meal history entry
interface MealHistoryEntry {
  tripId: string;
  tripName: string;
  date: string;
  meals: EnhancedMeal[];
}

export class MealTemplateManager {
  /**
   * Save a meal plan as a template
   */
  static async saveTemplate(
    name: string,
    description: string,
    meals: EnhancedMeal[],
    tags: string[] = []
  ): Promise<MealTemplate> {
    const template: MealTemplate = {
      id: `template-${Date.now()}`,
      name,
      description,
      days: meals.length,
      meals,
      timesUsed: 0,
      createdAt: new Date().toISOString(),
      tags,
    };

    const templates = await this.getTemplates();
    templates.push(template);
    await AsyncStorage.setItem(MEAL_TEMPLATES_KEY, JSON.stringify(templates));

    return template;
  }

  /**
   * Get all saved templates
   */
  static async getTemplates(): Promise<MealTemplate[]> {
    try {
      const data = await AsyncStorage.getItem(MEAL_TEMPLATES_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error("Error loading meal templates:", error);
      return [];
    }
  }

  /**
   * Get a specific template
   */
  static async getTemplate(id: string): Promise<MealTemplate | null> {
    const templates = await this.getTemplates();
    return templates.find(t => t.id === id) || null;
  }

  /**
   * Update template usage count
   */
  static async incrementTemplateUsage(id: string): Promise<void> {
    const templates = await this.getTemplates();
    const template = templates.find(t => t.id === id);
    
    if (template) {
      template.timesUsed++;
      template.lastUsed = new Date().toISOString();
      await AsyncStorage.setItem(MEAL_TEMPLATES_KEY, JSON.stringify(templates));
    }
  }

  /**
   * Delete a template
   */
  static async deleteTemplate(id: string): Promise<void> {
    const templates = await this.getTemplates();
    const filtered = templates.filter(t => t.id !== id);
    await AsyncStorage.setItem(MEAL_TEMPLATES_KEY, JSON.stringify(filtered));
  }

  /**
   * Update a template
   */
  static async updateTemplate(id: string, updates: Partial<MealTemplate>): Promise<void> {
    const templates = await this.getTemplates();
    const index = templates.findIndex(t => t.id === id);
    
    if (index !== -1) {
      templates[index] = { ...templates[index], ...updates };
      await AsyncStorage.setItem(MEAL_TEMPLATES_KEY, JSON.stringify(templates));
    }
  }

  /**
   * Track meal usage for "frequently used" feature
   */
  static async trackMealUsage(mealName: string, mealType: string): Promise<void> {
    try {
      const data = await AsyncStorage.getItem(FREQUENTLY_USED_KEY);
      const usage: Record<string, { count: number; lastUsed: string; mealType: string }> = 
        data ? JSON.parse(data) : {};

      const key = `${mealType}-${mealName.toLowerCase()}`;
      if (usage[key]) {
        usage[key].count++;
        usage[key].lastUsed = new Date().toISOString();
      } else {
        usage[key] = {
          count: 1,
          lastUsed: new Date().toISOString(),
          mealType,
        };
      }

      await AsyncStorage.setItem(FREQUENTLY_USED_KEY, JSON.stringify(usage));
    } catch (error) {
      console.error("Error tracking meal usage:", error);
    }
  }

  /**
   * Get frequently used meals
   */
  static async getFrequentlyUsed(
    mealType?: string, 
    limit: number = 5
  ): Promise<{ name: string; count: number; mealType: string }[]> {
    try {
      const data = await AsyncStorage.getItem(FREQUENTLY_USED_KEY);
      if (!data) return [];

      const usage: Record<string, { count: number; lastUsed: string; mealType: string }> = JSON.parse(data);
      
      let meals = Object.entries(usage).map(([key, value]) => ({
        name: key.split('-').slice(1).join('-'),
        count: value.count,
        mealType: value.mealType,
        lastUsed: value.lastUsed,
      }));

      // Filter by meal type if specified
      if (mealType) {
        meals = meals.filter(m => m.mealType === mealType);
      }

      // Sort by count and recency
      meals.sort((a, b) => {
        if (b.count !== a.count) return b.count - a.count;
        return new Date(b.lastUsed).getTime() - new Date(a.lastUsed).getTime();
      });

      return meals.slice(0, limit);
    } catch (error) {
      console.error("Error getting frequently used meals:", error);
      return [];
    }
  }

  /**
   * Save meal history (all meals ever planned)
   */
  static async saveMealHistory(
    tripId: string, 
    tripName: string, 
    meals: EnhancedMeal[]
  ): Promise<void> {
    try {
      const data = await AsyncStorage.getItem(MEAL_HISTORY_KEY);
      const history: MealHistoryEntry[] = data ? JSON.parse(data) : [];

      history.push({
        tripId,
        tripName,
        date: new Date().toISOString(),
        meals,
      });

      // Keep only last 50 trips to avoid storage bloat
      if (history.length > 50) {
        history.splice(0, history.length - 50);
      }

      await AsyncStorage.setItem(MEAL_HISTORY_KEY, JSON.stringify(history));
    } catch (error) {
      console.error("Error saving meal history:", error);
    }
  }

  /**
   * Get meal history
   */
  static async getMealHistory(limit: number = 10): Promise<MealHistoryEntry[]> {
    try {
      const data = await AsyncStorage.getItem(MEAL_HISTORY_KEY);
      if (!data) return [];

      const history = JSON.parse(data);
      return history.slice(-limit).reverse(); // Most recent first
    } catch (error) {
      console.error("Error loading meal history:", error);
      return [];
    }
  }

  /**
   * Get quick-start templates for common trip types
   */
  static getQuickStartTemplates(): QuickStartTemplate[] {
    return [
      {
        id: "weekend",
        name: "Weekend Getaway",
        description: "Simple 2-day meal plan with minimal prep",
        days: 2,
        icon: "🏕️",
      },
      {
        id: "long-weekend",
        name: "Long Weekend",
        description: "3-day plan with a mix of easy and fun meals",
        days: 3,
        icon: "🌲",
      },
      {
        id: "week",
        name: "Week-Long Adventure",
        description: "Full week of varied, campfire-friendly meals",
        days: 7,
        icon: "⛰️",
      },
      {
        id: "no-cook",
        name: "No-Cook Easy Trip",
        description: "Perfect for when you want minimal cooking",
        days: 3,
        icon: "🥪",
      },
    ];
  }

  /**
   * Generate quick-start template meals
   */
  static getQuickStartMeals(templateId: string): EnhancedMeal[] {
    switch (templateId) {
      case "weekend":
        return [
          {
            day: 1,
            breakfast: { text: "Oatmeal with Dried Fruit", suggestionId: "b1" },
            lunch: { text: "Sandwiches & Chips", suggestionId: "l1" },
            dinner: { text: "Grilled Burgers & Hot Dogs", suggestionId: "d1" },
            snacks: { text: "Trail Mix", suggestionId: "s1" },
          },
          {
            day: 2,
            breakfast: { text: "Scrambled Eggs & Bacon", suggestionId: "b2" },
            lunch: { text: "Leftover Burgers", suggestionId: "l1" },
            dinner: { text: "Campfire Chili", suggestionId: "d2" },
            snacks: { text: "S'mores", suggestionId: "s2" },
          },
        ];

      case "long-weekend":
        return [
          {
            day: 1,
            breakfast: { text: "Granola & Yogurt", suggestionId: "b5" },
            lunch: { text: "Sandwiches", suggestionId: "l1" },
            dinner: { text: "Grilled Burgers", suggestionId: "d1" },
            snacks: { text: "Trail Mix", suggestionId: "s1" },
          },
          {
            day: 2,
            breakfast: { text: "Pancakes", suggestionId: "b3" },
            lunch: { text: "Campfire Quesadillas", suggestionId: "l2" },
            dinner: { text: "Foil Packet Dinners", suggestionId: "d3" },
            snacks: { text: "S'mores", suggestionId: "s2" },
          },
          {
            day: 3,
            breakfast: { text: "Breakfast Burritos", suggestionId: "b4" },
            lunch: { text: "Hot Dogs", suggestionId: "l3" },
            dinner: { text: "Campfire Tacos", suggestionId: "d6" },
            snacks: { text: "Chips & Salsa", suggestionId: "s6" },
          },
        ];

      case "no-cook":
        return [
          {
            day: 1,
            breakfast: { text: "Granola & Yogurt", suggestionId: "b5" },
            lunch: { text: "Sandwiches", suggestionId: "l1" },
            dinner: { text: "Deli Wraps & Salad", suggestionId: "l5" },
            snacks: { text: "Fresh Fruit", suggestionId: "s3" },
          },
          {
            day: 2,
            breakfast: { text: "Granola Bars & Fruit", suggestionId: "s5" },
            lunch: { text: "Pasta Salad", suggestionId: "l4" },
            dinner: { text: "Sandwiches & Chips", suggestionId: "l1" },
            snacks: { text: "Crackers & Cheese", suggestionId: "s4" },
          },
          {
            day: 3,
            breakfast: { text: "Yogurt & Granola", suggestionId: "b5" },
            lunch: { text: "Wraps", suggestionId: "l5" },
            dinner: { text: "Charcuterie Board", suggestionId: "s4" },
            snacks: { text: "Trail Mix", suggestionId: "s1" },
          },
        ];

      case "week":
        return [
          {
            day: 1,
            breakfast: { text: "Oatmeal with Dried Fruit", suggestionId: "b1" },
            lunch: { text: "Sandwiches & Chips", suggestionId: "l1" },
            dinner: { text: "Grilled Burgers", suggestionId: "d1" },
            snacks: { text: "Trail Mix", suggestionId: "s1" },
          },
          {
            day: 2,
            breakfast: { text: "Scrambled Eggs & Bacon", suggestionId: "b2" },
            lunch: { text: "Campfire Quesadillas", suggestionId: "l2" },
            dinner: { text: "Campfire Chili", suggestionId: "d2" },
            snacks: { text: "S'mores", suggestionId: "s2" },
          },
          {
            day: 3,
            breakfast: { text: "Pancakes", suggestionId: "b3" },
            lunch: { text: "Hot Dogs", suggestionId: "l3" },
            dinner: { text: "Foil Packet Dinners", suggestionId: "d3" },
            snacks: { text: "Fresh Fruit", suggestionId: "s3" },
          },
          {
            day: 4,
            breakfast: { text: "Breakfast Burritos", suggestionId: "b4" },
            lunch: { text: "Pasta Salad", suggestionId: "l4" },
            dinner: { text: "Spaghetti with Meat Sauce", suggestionId: "d4" },
            snacks: { text: "Crackers & Cheese", suggestionId: "s4" },
          },
          {
            day: 5,
            breakfast: { text: "Granola & Yogurt", suggestionId: "b5" },
            lunch: { text: "Wraps with Hummus", suggestionId: "l5" },
            dinner: { text: "Grilled Chicken & Vegetables", suggestionId: "d5" },
            snacks: { text: "Chips & Salsa", suggestionId: "s6" },
          },
          {
            day: 6,
            breakfast: { text: "Oatmeal", suggestionId: "b1" },
            lunch: { text: "Sandwiches", suggestionId: "l1" },
            dinner: { text: "Campfire Tacos", suggestionId: "d6" },
            snacks: { text: "Banana Boats", suggestionId: "s9" },
          },
          {
            day: 7,
            breakfast: { text: "Eggs & Bacon", suggestionId: "b2" },
            lunch: { text: "Quesadillas", suggestionId: "l2" },
            dinner: { text: "One-Pot Mac & Cheese", suggestionId: "d8" },
            snacks: { text: "S'mores", suggestionId: "s2" },
          },
        ];

      default:
        return [];
    }
  }

  /**
   * Clear all stored data (for testing/reset)
   */
  static async clearAllData(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([
        MEAL_TEMPLATES_KEY,
        MEAL_HISTORY_KEY,
        FREQUENTLY_USED_KEY,
      ]);
    } catch (error) {
      console.error("Error clearing meal data:", error);
    }
  }
}
