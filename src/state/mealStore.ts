/**
 * Zustand store for meal planning and meal library
 * Persists meal library data locally
 */

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { MealLibraryItem, MealCategory, PrepType, Difficulty } from "../types/meal";

interface MealState {
  // Meal library with pre-populated camping meals
  mealLibrary: MealLibraryItem[];

  // Filters for browsing
  selectedCategory: MealCategory | "all";
  selectedPrepType: PrepType | "all";
  searchQuery: string;

  // Actions
  setSelectedCategory: (category: MealCategory | "all") => void;
  setSelectedPrepType: (prepType: PrepType | "all") => void;
  setSearchQuery: (query: string) => void;
  getFilteredMeals: () => MealLibraryItem[];
  addCustomMeal: (meal: Omit<MealLibraryItem, "id" | "createdAt">) => void;
  initializeMealLibrary: () => void;
}

// Pre-populated meal library based on camping meal suggestions
const INITIAL_MEAL_LIBRARY: Omit<MealLibraryItem, "id" | "createdAt">[] = [
  // BREAKFAST - No Cook
  { name: "Overnight Oats", category: "breakfast", prepType: "noCook", difficulty: "easy", ingredients: ["oats", "milk", "fruit", "honey"], suitableFor: ["backpacking", "car camping", "RV"], tags: ["no-cook", "prepare-ahead"] },
  { name: "Yogurt Parfait with Granola", category: "breakfast", prepType: "noCook", difficulty: "easy", ingredients: ["yogurt", "granola", "berries", "honey"], suitableFor: ["car camping", "RV", "glamping"], tags: ["no-cook", "quick"] },
  { name: "Bagels with Cream Cheese", category: "breakfast", prepType: "noCook", difficulty: "easy", ingredients: ["bagels", "cream cheese"], suitableFor: ["all"], tags: ["no-cook", "quick"] },
  { name: "Hard Boiled Eggs", category: "breakfast", prepType: "noCook", difficulty: "easy", ingredients: ["hard boiled eggs"], suitableFor: ["all"], tags: ["no-cook", "protein", "prepare-ahead"] },
  { name: "Fresh Fruit with Nuts", category: "breakfast", prepType: "noCook", difficulty: "easy", ingredients: ["apples", "bananas", "almonds", "walnuts"], suitableFor: ["backpacking", "car camping"], tags: ["no-cook", "healthy"] },
  { name: "Chia Pudding", category: "breakfast", prepType: "noCook", difficulty: "easy", ingredients: ["chia seeds", "milk", "honey", "berries"], suitableFor: ["car camping", "RV"], tags: ["no-cook", "prepare-ahead"] },
  { name: "Cold Cereal with Milk", category: "breakfast", prepType: "noCook", difficulty: "easy", ingredients: ["cereal", "shelf-stable milk"], suitableFor: ["car camping", "RV", "glamping"], tags: ["no-cook", "quick"] },
  { name: "Breakfast Bars", category: "breakfast", prepType: "noCook", difficulty: "easy", ingredients: ["granola bars", "protein bars"], suitableFor: ["backpacking", "bikepacking"], tags: ["no-cook", "quick", "portable"] },
  { name: "Apples with Peanut Butter", category: "breakfast", prepType: "noCook", difficulty: "easy", ingredients: ["apples", "peanut butter"], suitableFor: ["all"], tags: ["no-cook", "quick"] },

  // BREAKFAST - Hot
  { name: "Scrambled Eggs and Veggies", category: "breakfast", prepType: "campStove", difficulty: "easy", ingredients: ["eggs", "bell peppers", "onions", "cheese", "butter"], suitableFor: ["car camping", "RV"], tags: ["hot", "protein"] },
  { name: "Egg and Cheese Burritos", category: "breakfast", prepType: "campStove", difficulty: "easy", ingredients: ["eggs", "tortillas", "cheese", "salsa"], suitableFor: ["car camping", "overlanding"], tags: ["hot", "filling"] },
  { name: "Breakfast Quesadillas", category: "breakfast", prepType: "campStove", difficulty: "easy", ingredients: ["tortillas", "eggs", "cheese", "bacon"], suitableFor: ["car camping", "RV"], tags: ["hot", "filling"] },
  { name: "Breakfast Tacos", category: "breakfast", prepType: "campStove", difficulty: "easy", ingredients: ["tortillas", "eggs", "cheese", "sausage", "salsa"], suitableFor: ["car camping", "overlanding"], tags: ["hot", "filling"] },
  { name: "Pancakes", category: "breakfast", prepType: "campStove", difficulty: "easy", ingredients: ["pancake mix", "water", "syrup", "butter"], suitableFor: ["car camping", "RV"], tags: ["hot", "family-friendly"] },
  { name: "French Toast Sticks", category: "breakfast", prepType: "campStove", difficulty: "moderate", ingredients: ["bread", "eggs", "milk", "cinnamon", "syrup"], suitableFor: ["car camping", "RV"], tags: ["hot", "family-friendly"] },
  { name: "Hash Browns and Eggs", category: "breakfast", prepType: "campStove", difficulty: "easy", ingredients: ["hash browns", "eggs", "butter", "salt", "pepper"], suitableFor: ["car camping", "RV"], tags: ["hot", "hearty"] },
  { name: "Oatmeal with Toppings", category: "breakfast", prepType: "campStove", difficulty: "easy", ingredients: ["oats", "water", "brown sugar", "dried fruit", "nuts"], suitableFor: ["backpacking", "car camping"], tags: ["hot", "healthy"] },
  { name: "Bacon and Eggs", category: "breakfast", prepType: "campStove", difficulty: "easy", ingredients: ["bacon", "eggs", "butter"], suitableFor: ["car camping", "RV"], tags: ["hot", "protein", "classic"] },
  { name: "Breakfast Skillet with Beans and Cheese", category: "breakfast", prepType: "campStove", difficulty: "moderate", ingredients: ["potatoes", "eggs", "black beans", "cheese", "salsa"], suitableFor: ["car camping", "overlanding"], tags: ["hot", "hearty"] },
  { name: "Camp Cornbread Muffins", category: "breakfast", prepType: "campfire", difficulty: "moderate", ingredients: ["cornbread mix", "eggs", "milk", "butter"], suitableFor: ["car camping"], tags: ["hot", "baked"] },

  // LUNCH - Cold
  { name: "Turkey and Cheese Sandwich", category: "lunch", prepType: "noCook", difficulty: "easy", ingredients: ["bread", "turkey", "cheese", "lettuce", "mayo"], suitableFor: ["all"], tags: ["no-cook", "quick"] },
  { name: "Chicken Caesar Wrap", category: "lunch", prepType: "noCook", difficulty: "easy", ingredients: ["tortilla", "grilled chicken", "romaine", "caesar dressing", "parmesan"], suitableFor: ["car camping", "RV"], tags: ["no-cook", "protein"] },
  { name: "Tuna Salad with Crackers", category: "lunch", prepType: "noCook", difficulty: "easy", ingredients: ["canned tuna", "mayo", "crackers"], suitableFor: ["backpacking", "car camping"], tags: ["no-cook", "protein"] },
  { name: "Pasta Salad", category: "lunch", prepType: "cold", difficulty: "easy", ingredients: ["pasta", "italian dressing", "veggies", "cheese"], suitableFor: ["car camping", "RV"], tags: ["prepare-ahead", "vegetarian"] },
  { name: "Hummus and Veggies", category: "lunch", prepType: "noCook", difficulty: "easy", ingredients: ["hummus", "carrots", "celery", "bell peppers", "pita"], suitableFor: ["car camping", "backpacking"], tags: ["no-cook", "vegetarian", "healthy"] },
  { name: "Cold Peanut Noodles", category: "lunch", prepType: "cold", difficulty: "easy", ingredients: ["noodles", "peanut butter", "soy sauce", "sesame oil", "veggies"], suitableFor: ["car camping"], tags: ["prepare-ahead", "vegetarian"] },
  { name: "Charcuterie Lunch", category: "lunch", prepType: "noCook", difficulty: "easy", ingredients: ["salami", "cheese", "crackers", "grapes", "nuts"], suitableFor: ["car camping", "glamping"], tags: ["no-cook", "variety"] },
  { name: "Caprese Salad with Bread", category: "lunch", prepType: "noCook", difficulty: "easy", ingredients: ["mozzarella", "tomatoes", "basil", "olive oil", "balsamic", "bread"], suitableFor: ["car camping", "RV"], tags: ["no-cook", "fresh"] },
  { name: "Chickpea Salad", category: "lunch", prepType: "noCook", difficulty: "easy", ingredients: ["chickpeas", "cucumber", "tomatoes", "lemon", "olive oil"], suitableFor: ["car camping", "backpacking"], tags: ["no-cook", "vegetarian", "healthy"] },
  { name: "Couscous Salad", category: "lunch", prepType: "cold", difficulty: "easy", ingredients: ["couscous", "veggies", "feta", "lemon", "olive oil"], suitableFor: ["car camping"], tags: ["prepare-ahead", "vegetarian"] },
  { name: "PB&J Sandwich", category: "lunch", prepType: "noCook", difficulty: "easy", ingredients: ["bread", "peanut butter", "jelly"], suitableFor: ["all"], tags: ["no-cook", "quick", "kid-friendly"] },

  // LUNCH - Warm
  { name: "Quesadillas", category: "lunch", prepType: "campStove", difficulty: "easy", ingredients: ["tortillas", "cheese", "chicken", "salsa"], suitableFor: ["car camping", "overlanding"], tags: ["hot", "quick"] },
  { name: "Ramen with Veggies", category: "lunch", prepType: "campStove", difficulty: "easy", ingredients: ["ramen noodles", "eggs", "scallions", "veggies"], suitableFor: ["backpacking", "car camping"], tags: ["hot", "quick"] },
  { name: "Grilled Cheese", category: "lunch", prepType: "campStove", difficulty: "easy", ingredients: ["bread", "cheese", "butter"], suitableFor: ["all"], tags: ["hot", "quick", "kid-friendly"] },
  { name: "Tomato Soup with Grilled Cheese", category: "lunch", prepType: "campStove", difficulty: "easy", ingredients: ["canned tomato soup", "bread", "cheese", "butter"], suitableFor: ["car camping", "RV"], tags: ["hot", "comfort"] },
  { name: "Mac and Cheese", category: "lunch", prepType: "campStove", difficulty: "easy", ingredients: ["mac and cheese box", "milk", "butter"], suitableFor: ["car camping", "RV"], tags: ["hot", "kid-friendly"] },
  { name: "Hot Dogs", category: "lunch", prepType: "campfire", difficulty: "easy", ingredients: ["hot dogs", "buns", "ketchup", "mustard"], suitableFor: ["car camping"], tags: ["hot", "quick", "kid-friendly"] },
  { name: "Burrito Bowl", category: "lunch", prepType: "campStove", difficulty: "easy", ingredients: ["rice", "beans", "cheese", "salsa", "sour cream"], suitableFor: ["car camping", "RV"], tags: ["hot", "filling"] },

  // DINNER - One-Pot
  { name: "Chili", category: "dinner", prepType: "campStove", difficulty: "easy", ingredients: ["ground beef", "beans", "tomatoes", "chili powder", "onions"], suitableFor: ["car camping", "RV"], tags: ["one-pot", "hearty"] },
  { name: "Chili Mac", category: "dinner", prepType: "campStove", difficulty: "easy", ingredients: ["ground beef", "macaroni", "tomatoes", "chili powder", "cheese"], suitableFor: ["car camping"], tags: ["one-pot", "filling"] },
  { name: "One Pot Pasta", category: "dinner", prepType: "campStove", difficulty: "easy", ingredients: ["pasta", "tomato sauce", "garlic", "italian seasoning"], suitableFor: ["car camping", "backpacking"], tags: ["one-pot", "vegetarian"] },
  { name: "Skillet Sausage and Peppers", category: "dinner", prepType: "campStove", difficulty: "easy", ingredients: ["sausage", "bell peppers", "onions", "potatoes"], suitableFor: ["car camping", "overlanding"], tags: ["one-pot", "protein"] },
  { name: "Vegetable Stir Fry", category: "dinner", prepType: "campStove", difficulty: "moderate", ingredients: ["mixed veggies", "soy sauce", "garlic", "ginger", "rice"], suitableFor: ["car camping", "RV"], tags: ["one-pot", "vegetarian", "healthy"] },
  { name: "Curry with Rice", category: "dinner", prepType: "campStove", difficulty: "moderate", ingredients: ["curry paste", "coconut milk", "veggies", "rice"], suitableFor: ["car camping", "RV"], tags: ["one-pot", "flavorful"] },
  { name: "Alfredo Pasta with Veggies", category: "dinner", prepType: "campStove", difficulty: "easy", ingredients: ["pasta", "alfredo sauce", "broccoli", "parmesan"], suitableFor: ["car camping", "RV"], tags: ["one-pot", "creamy"] },
  { name: "Chicken and Rice", category: "dinner", prepType: "campStove", difficulty: "moderate", ingredients: ["chicken", "rice", "broth", "veggies", "seasonings"], suitableFor: ["car camping", "overlanding"], tags: ["one-pot", "protein"] },
  { name: "Camp Jambalaya", category: "dinner", prepType: "campStove", difficulty: "moderate", ingredients: ["sausage", "chicken", "rice", "peppers", "cajun seasoning"], suitableFor: ["car camping"], tags: ["one-pot", "spicy"] },
  { name: "Beef and Veggie Stew", category: "dinner", prepType: "campStove", difficulty: "moderate", ingredients: ["beef", "potatoes", "carrots", "onions", "broth"], suitableFor: ["car camping", "winter camping"], tags: ["one-pot", "hearty"] },

  // DINNER - Foil Packets
  { name: "Chicken Fajita Packets", category: "dinner", prepType: "campfire", difficulty: "easy", ingredients: ["chicken", "bell peppers", "onions", "fajita seasoning", "tortillas"], suitableFor: ["car camping", "overlanding"], tags: ["foil-packet", "protein"] },
  { name: "Sausage, Peppers, and Potatoes", category: "dinner", prepType: "campfire", difficulty: "easy", ingredients: ["sausage", "bell peppers", "potatoes", "onions", "olive oil"], suitableFor: ["car camping"], tags: ["foil-packet", "filling"] },
  { name: "Salmon with Lemon and Dill", category: "dinner", prepType: "campfire", difficulty: "moderate", ingredients: ["salmon", "lemon", "dill", "butter", "garlic"], suitableFor: ["car camping", "glamping"], tags: ["foil-packet", "healthy"] },
  { name: "Shrimp Boil Packets", category: "dinner", prepType: "campfire", difficulty: "moderate", ingredients: ["shrimp", "corn", "potatoes", "sausage", "old bay"], suitableFor: ["car camping"], tags: ["foil-packet", "seafood"] },
  { name: "BBQ Tofu Packets", category: "dinner", prepType: "campfire", difficulty: "easy", ingredients: ["tofu", "BBQ sauce", "veggies", "foil"], suitableFor: ["car camping"], tags: ["foil-packet", "vegetarian"] },
  { name: "Sweet Potato and Black Bean Packet", category: "dinner", prepType: "campfire", difficulty: "easy", ingredients: ["sweet potatoes", "black beans", "corn", "cumin", "lime"], suitableFor: ["car camping"], tags: ["foil-packet", "vegetarian"] },

  // DINNER - Fire/Stove
  { name: "Campfire Pizza", category: "dinner", prepType: "campfire", difficulty: "moderate", ingredients: ["pizza dough", "tomato sauce", "cheese", "toppings"], suitableFor: ["car camping"], tags: ["campfire", "fun"] },
  { name: "Flatbread Pizzas", category: "dinner", prepType: "campStove", difficulty: "easy", ingredients: ["flatbread", "tomato sauce", "cheese", "toppings"], suitableFor: ["car camping", "overlanding"], tags: ["quick", "customizable"] },
  { name: "Brats with Peppers", category: "dinner", prepType: "campfire", difficulty: "easy", ingredients: ["bratwurst", "peppers", "onions", "buns"], suitableFor: ["car camping"], tags: ["campfire", "protein"] },
  { name: "Beef or Veggie Kabobs", category: "dinner", prepType: "campfire", difficulty: "moderate", ingredients: ["beef or veggies", "bell peppers", "onions", "marinade", "skewers"], suitableFor: ["car camping"], tags: ["campfire", "protein"] },
  { name: "Cast Iron Burgers", category: "dinner", prepType: "campStove", difficulty: "easy", ingredients: ["ground beef", "buns", "cheese", "toppings"], suitableFor: ["car camping", "overlanding"], tags: ["classic", "protein"] },
  { name: "Pan Fried Gnocchi", category: "dinner", prepType: "campStove", difficulty: "easy", ingredients: ["gnocchi", "butter", "garlic", "parmesan"], suitableFor: ["car camping", "RV"], tags: ["quick", "vegetarian"] },
  { name: "Fried Rice", category: "dinner", prepType: "campStove", difficulty: "moderate", ingredients: ["rice", "eggs", "veggies", "soy sauce", "sesame oil"], suitableFor: ["car camping", "overlanding"], tags: ["versatile"] },
  { name: "Tacos", category: "dinner", prepType: "campStove", difficulty: "easy", ingredients: ["ground beef", "taco shells", "cheese", "lettuce", "salsa"], suitableFor: ["car camping", "RV"], tags: ["customizable", "kid-friendly"] },
  { name: "Loaded Baked Potatoes", category: "dinner", prepType: "campfire", difficulty: "easy", ingredients: ["potatoes", "butter", "sour cream", "cheese", "bacon bits"], suitableFor: ["car camping"], tags: ["campfire", "filling"] },

  // SNACKS - Savory
  { name: "Trail Mix", category: "snack", prepType: "noCook", difficulty: "easy", ingredients: ["nuts", "dried fruit", "chocolate chips"], suitableFor: ["all"], tags: ["no-cook", "energy", "portable"] },
  { name: "Beef Jerky", category: "snack", prepType: "noCook", difficulty: "easy", ingredients: ["beef jerky"], suitableFor: ["all"], tags: ["no-cook", "protein", "portable"] },
  { name: "Cheese Cubes", category: "snack", prepType: "noCook", difficulty: "easy", ingredients: ["cheese"], suitableFor: ["car camping", "backpacking"], tags: ["no-cook", "protein"] },
  { name: "Crackers and Salami", category: "snack", prepType: "noCook", difficulty: "easy", ingredients: ["crackers", "salami"], suitableFor: ["car camping", "backpacking"], tags: ["no-cook", "protein"] },
  { name: "Chips and Salsa", category: "snack", prepType: "noCook", difficulty: "easy", ingredients: ["tortilla chips", "salsa"], suitableFor: ["car camping"], tags: ["no-cook", "shareable"] },
  { name: "Peanut Butter Pretzels", category: "snack", prepType: "noCook", difficulty: "easy", ingredients: ["pretzels", "peanut butter"], suitableFor: ["all"], tags: ["no-cook", "salty"] },
  { name: "Roasted Chickpeas", category: "snack", prepType: "noCook", difficulty: "easy", ingredients: ["roasted chickpeas"], suitableFor: ["backpacking", "car camping"], tags: ["no-cook", "crunchy", "healthy"] },
  { name: "Popcorn Over the Fire", category: "snack", prepType: "campfire", difficulty: "easy", ingredients: ["popcorn kernels", "oil", "salt"], suitableFor: ["car camping"], tags: ["campfire", "fun"] },
  { name: "Pita Chips and Hummus", category: "snack", prepType: "noCook", difficulty: "easy", ingredients: ["pita chips", "hummus"], suitableFor: ["car camping"], tags: ["no-cook", "vegetarian"] },

  // SNACKS - Sweet
  { name: "Granola Bars", category: "snack", prepType: "noCook", difficulty: "easy", ingredients: ["granola bars"], suitableFor: ["all"], tags: ["no-cook", "quick", "energy"] },
  { name: "Energy Balls", category: "snack", prepType: "noCook", difficulty: "easy", ingredients: ["oats", "peanut butter", "honey", "chocolate chips"], suitableFor: ["all"], tags: ["no-cook", "energy", "prepare-ahead"] },
  { name: "Fruit Leather", category: "snack", prepType: "noCook", difficulty: "easy", ingredients: ["fruit leather"], suitableFor: ["all"], tags: ["no-cook", "sweet", "portable"] },
  { name: "Dried Mango", category: "snack", prepType: "noCook", difficulty: "easy", ingredients: ["dried mango"], suitableFor: ["all"], tags: ["no-cook", "sweet", "healthy"] },
  { name: "Chocolate Bars", category: "snack", prepType: "noCook", difficulty: "easy", ingredients: ["chocolate bars"], suitableFor: ["all"], tags: ["no-cook", "sweet"] },
  { name: "Cookies", category: "snack", prepType: "noCook", difficulty: "easy", ingredients: ["cookies"], suitableFor: ["all"], tags: ["no-cook", "sweet"] },
  { name: "Banana Chips", category: "snack", prepType: "noCook", difficulty: "easy", ingredients: ["banana chips"], suitableFor: ["all"], tags: ["no-cook", "crunchy"] },
  { name: "S'mores", category: "snack", prepType: "campfire", difficulty: "easy", ingredients: ["graham crackers", "chocolate", "marshmallows"], suitableFor: ["car camping"], tags: ["campfire", "classic", "sweet"] },
  { name: "Banana Boats", category: "snack", prepType: "campfire", difficulty: "easy", ingredients: ["bananas", "chocolate chips", "marshmallows"], suitableFor: ["car camping"], tags: ["campfire", "sweet", "fun"] },
  { name: "Roasted Apples with Cinnamon", category: "snack", prepType: "campfire", difficulty: "easy", ingredients: ["apples", "cinnamon", "brown sugar"], suitableFor: ["car camping"], tags: ["campfire", "sweet", "healthy"] },
  { name: "Hot Cocoa with Marshmallows", category: "snack", prepType: "campStove", difficulty: "easy", ingredients: ["hot cocoa mix", "water", "marshmallows"], suitableFor: ["car camping", "winter camping"], tags: ["hot", "sweet", "cozy"] },
];

export const useMealStore = create<MealState>()(
  persist(
    (set, get) => ({
      mealLibrary: [],
      selectedCategory: "all",
      selectedPrepType: "all",
      searchQuery: "",

      setSelectedCategory: (category) => set({ selectedCategory: category }),

      setSelectedPrepType: (prepType) => set({ selectedPrepType: prepType }),

      setSearchQuery: (query) => set({ searchQuery: query }),

      getFilteredMeals: () => {
        const { mealLibrary, selectedCategory, selectedPrepType, searchQuery } = get();

        return mealLibrary.filter((meal) => {
          // Category filter
          if (selectedCategory !== "all" && meal.category !== selectedCategory) {
            return false;
          }

          // Prep type filter
          if (selectedPrepType !== "all" && meal.prepType !== selectedPrepType) {
            return false;
          }

          // Search query filter
          if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            return (
              meal.name.toLowerCase().includes(query) ||
              meal.ingredients.some(ing => ing.toLowerCase().includes(query)) ||
              meal.tags?.some(tag => tag.toLowerCase().includes(query))
            );
          }

          return true;
        });
      },

      addCustomMeal: (meal) => {
        const newMeal: MealLibraryItem = {
          ...meal,
          id: `meal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          createdAt: new Date().toISOString(),
        };

        set((state) => ({
          mealLibrary: [...state.mealLibrary, newMeal],
        }));
      },

      initializeMealLibrary: () => {
        const { mealLibrary } = get();

        // Only initialize if library is empty
        if (mealLibrary.length === 0) {
          const populatedLibrary: MealLibraryItem[] = INITIAL_MEAL_LIBRARY.map((meal, index) => ({
            ...meal,
            id: `meal_default_${index}`,
            createdAt: new Date().toISOString(),
          }));

          set({ mealLibrary: populatedLibrary });
        }
      },
    }),
    {
      name: "meal-storage",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

// Selectors for optimized re-renders
export const useMealLibrary = () => useMealStore((s) => s.mealLibrary);
export const useSelectedCategory = () => useMealStore((s) => s.selectedCategory);
export const useSelectedPrepType = () => useMealStore((s) => s.selectedPrepType);
export const useSearchQuery = () => useMealStore((s) => s.searchQuery);
export const useSetSelectedCategory = () => useMealStore((s) => s.setSelectedCategory);
export const useSetSelectedPrepType = () => useMealStore((s) => s.setSelectedPrepType);
export const useSetSearchQuery = () => useMealStore((s) => s.setSearchQuery);
export const useGetFilteredMeals = () => useMealStore((s) => s.getFilteredMeals);
export const useAddCustomMeal = () => useMealStore((s) => s.addCustomMeal);
export const useInitializeMealLibrary = () => useMealStore((s) => s.initializeMealLibrary);
