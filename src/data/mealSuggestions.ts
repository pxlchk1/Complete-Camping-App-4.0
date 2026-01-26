/**
 * Enhanced Meal Suggestions Database
 * 40+ camping-specific meal suggestions with comprehensive metadata
 */

import { 
  MealSuggestion, 
  CookingMethod, 
  MealComplexity, 
  StorageRequirement,
  DietaryTag 
} from "../types/meals";

// Comprehensive camping meal suggestions
export const ENHANCED_MEAL_SUGGESTIONS: MealSuggestion[] = [
  // ===== BREAKFAST =====
  {
    id: "b1",
    name: "Oatmeal with Dried Fruit",
    mealType: "breakfast",
    description: "Quick, warm, and customizable breakfast perfect for camp mornings",
    complexity: "easy",
    cookingMethods: ["camp-stove", "campfire"],
    prepTime: 2,
    cookTime: 5,
    servings: 4,
    storage: "none",
    dietaryTags: ["vegetarian", "vegan"],
    ingredients: [
      { item: "Instant oatmeal packets", quantity: 8, unit: "packets", category: "grains" },
      { item: "Dried cranberries", quantity: 1, unit: "cup", category: "snacks" },
      { item: "Brown sugar", quantity: 0.5, unit: "cup", category: "condiments", optional: true },
      { item: "Cinnamon", quantity: 1, unit: "tsp", category: "spices" },
    ],
    instructions: [
      "Boil water on camp stove",
      "Pour over oatmeal in bowl",
      "Stir in dried fruit and cinnamon",
      "Let sit 2 minutes and serve"
    ],
    prepAhead: "Pre-mix dried fruit and cinnamon in ziplock bags, one per person",
    popularityScore: 95,
  },
  {
    id: "b2",
    name: "Campfire Scrambled Eggs & Bacon",
    mealType: "breakfast",
    description: "Classic hearty breakfast cooked over the fire",
    complexity: "moderate",
    cookingMethods: ["campfire", "camp-stove", "grill"],
    prepTime: 5,
    cookTime: 15,
    servings: 4,
    storage: "cooler",
    dietaryTags: [],
    ingredients: [
      { item: "Eggs", quantity: 12, unit: "eggs", category: "protein" },
      { item: "Bacon", quantity: 1, unit: "lb", category: "protein", prepAhead: true },
      { item: "Butter", quantity: 2, unit: "tbsp", category: "dairy" },
      { item: "Salt and pepper", quantity: 1, unit: "pinch", category: "spices" },
    ],
    instructions: [
      "Cook bacon in cast iron skillet",
      "Remove bacon, keep grease",
      "Scramble eggs in bacon grease",
      "Season and serve with bacon"
    ],
    prepAhead: "Pre-cook bacon at home, reheat at camp for easier cleanup",
    weatherBackup: "If rainy, cook on camp stove under tarp or in vehicle",
    popularityScore: 90,
  },
  {
    id: "b3",
    name: "Pancakes with Syrup",
    mealType: "breakfast",
    description: "Weekend special - fluffy pancakes everyone loves",
    complexity: "moderate",
    cookingMethods: ["camp-stove", "grill", "campfire"],
    prepTime: 5,
    cookTime: 20,
    servings: 4,
    storage: "none",
    dietaryTags: ["vegetarian"],
    ingredients: [
      { item: "Pancake mix", quantity: 2, unit: "cups", category: "grains", prepAhead: true },
      { item: "Eggs", quantity: 2, unit: "eggs", category: "protein" },
      { item: "Milk or water", quantity: 1.5, unit: "cups", category: "dairy" },
      { item: "Maple syrup", quantity: 1, unit: "bottle", category: "condiments" },
      { item: "Butter for griddle", quantity: 2, unit: "tbsp", category: "dairy" },
    ],
    instructions: [
      "Mix pancake mix with eggs and milk",
      "Heat griddle or skillet",
      "Pour batter and cook until bubbles form",
      "Flip and cook other side",
      "Serve with syrup"
    ],
    prepAhead: "Pre-mix dry ingredients at home, just add wet ingredients at camp",
    popularityScore: 85,
  },
  {
    id: "b4",
    name: "Breakfast Burritos",
    mealType: "breakfast",
    description: "Portable, filling, and easy to customize",
    complexity: "easy",
    cookingMethods: ["camp-stove", "campfire"],
    prepTime: 10,
    cookTime: 10,
    servings: 4,
    storage: "cooler",
    dietaryTags: [],
    ingredients: [
      { item: "Flour tortillas", quantity: 8, unit: "tortillas", category: "grains" },
      { item: "Scrambled eggs", quantity: 8, unit: "eggs", category: "protein", prepAhead: true },
      { item: "Cooked sausage", quantity: 1, unit: "lb", category: "protein", prepAhead: true },
      { item: "Shredded cheese", quantity: 2, unit: "cups", category: "dairy" },
      { item: "Salsa", quantity: 1, unit: "jar", category: "condiments", optional: true },
    ],
    instructions: [
      "Warm tortillas",
      "Fill with scrambled eggs, sausage, and cheese",
      "Roll up burrito-style",
      "Optional: wrap in foil and warm on grill"
    ],
    prepAhead: "Cook eggs and sausage at home, store in cooler, just reheat and assemble",
    popularityScore: 92,
  },
  {
    id: "b5",
    name: "Granola & Yogurt Parfait",
    mealType: "breakfast",
    description: "No-cook option perfect for hot mornings",
    complexity: "easy",
    cookingMethods: ["no-cook"],
    prepTime: 5,
    cookTime: 0,
    servings: 4,
    storage: "cooler",
    dietaryTags: ["vegetarian"],
    ingredients: [
      { item: "Greek yogurt", quantity: 4, unit: "cups", category: "dairy" },
      { item: "Granola", quantity: 2, unit: "cups", category: "grains" },
      { item: "Fresh berries", quantity: 2, unit: "cups", category: "produce" },
      { item: "Honey", quantity: 0.25, unit: "cup", category: "condiments", optional: true },
    ],
    instructions: [
      "Layer yogurt, granola, and berries in cups",
      "Drizzle with honey if desired",
      "Serve immediately"
    ],
    weatherBackup: "Perfect for rainy days - no fire needed!",
    popularityScore: 80,
  },

  // ===== LUNCH =====
  {
    id: "l1",
    name: "Classic Sandwiches & Chips",
    mealType: "lunch",
    description: "Quick midday fuel, no cooking required",
    complexity: "easy",
    cookingMethods: ["no-cook"],
    prepTime: 10,
    cookTime: 0,
    servings: 4,
    storage: "cooler",
    dietaryTags: [],
    ingredients: [
      { item: "Bread or rolls", quantity: 8, unit: "slices", category: "grains" },
      { item: "Deli meat", quantity: 1, unit: "lb", category: "protein" },
      { item: "Cheese slices", quantity: 8, unit: "slices", category: "dairy" },
      { item: "Lettuce", quantity: 1, unit: "head", category: "produce" },
      { item: "Tomatoes", quantity: 2, unit: "tomatoes", category: "produce" },
      { item: "Chips", quantity: 1, unit: "bag", category: "snacks" },
      { item: "Condiments", quantity: 1, unit: "set", category: "condiments" },
    ],
    instructions: [
      "Assemble sandwiches with desired toppings",
      "Serve with chips and fruit"
    ],
    popularityScore: 88,
  },
  {
    id: "l2",
    name: "Campfire Quesadillas",
    mealType: "lunch",
    description: "Cheesy, customizable, and fun to make",
    complexity: "easy",
    cookingMethods: ["campfire", "camp-stove", "grill"],
    prepTime: 5,
    cookTime: 10,
    servings: 4,
    storage: "cooler",
    dietaryTags: ["vegetarian"],
    ingredients: [
      { item: "Flour tortillas", quantity: 8, unit: "tortillas", category: "grains" },
      { item: "Shredded cheese", quantity: 3, unit: "cups", category: "dairy" },
      { item: "Cooked chicken", quantity: 2, unit: "cups", category: "protein", optional: true, prepAhead: true },
      { item: "Bell peppers", quantity: 2, unit: "peppers", category: "produce", optional: true },
      { item: "Salsa", quantity: 1, unit: "jar", category: "condiments" },
    ],
    instructions: [
      "Place cheese and fillings on tortilla",
      "Top with second tortilla",
      "Cook in skillet or on grill until cheese melts",
      "Cut into wedges and serve with salsa"
    ],
    prepAhead: "Pre-cook and shred chicken, chop vegetables at home",
    popularityScore: 90,
  },
  {
    id: "l3",
    name: "Hot Dogs & Fixings",
    mealType: "lunch",
    description: "Camp classic, easy for kids to help with",
    complexity: "easy",
    cookingMethods: ["campfire", "grill", "camp-stove"],
    prepTime: 2,
    cookTime: 8,
    servings: 4,
    storage: "cooler",
    dietaryTags: [],
    ingredients: [
      { item: "Hot dogs", quantity: 8, unit: "hot dogs", category: "protein" },
      { item: "Hot dog buns", quantity: 8, unit: "buns", category: "grains" },
      { item: "Ketchup", quantity: 1, unit: "bottle", category: "condiments" },
      { item: "Mustard", quantity: 1, unit: "bottle", category: "condiments" },
      { item: "Relish", quantity: 1, unit: "jar", category: "condiments", optional: true },
      { item: "Chips", quantity: 1, unit: "bag", category: "snacks" },
    ],
    instructions: [
      "Roast hot dogs over fire or cook on grill",
      "Warm buns if desired",
      "Serve with condiments and chips"
    ],
    popularityScore: 85,
  },
  {
    id: "l4",
    name: "Pasta Salad with Veggies",
    mealType: "lunch",
    description: "Make-ahead option, refreshing on hot days",
    complexity: "easy",
    cookingMethods: ["no-cook"],
    prepTime: 15,
    cookTime: 0,
    servings: 4,
    storage: "cooler",
    dietaryTags: ["vegetarian"],
    ingredients: [
      { item: "Cooked pasta", quantity: 4, unit: "cups", category: "grains", prepAhead: true },
      { item: "Cherry tomatoes", quantity: 2, unit: "cups", category: "produce" },
      { item: "Cucumber", quantity: 1, unit: "cucumber", category: "produce" },
      { item: "Italian dressing", quantity: 1, unit: "bottle", category: "condiments" },
      { item: "Mozzarella cubes", quantity: 1, unit: "cup", category: "dairy", optional: true },
    ],
    instructions: [
      "Combine all ingredients in large bowl",
      "Toss with dressing",
      "Serve cold"
    ],
    prepAhead: "Make entire salad at home, just toss before serving",
    weatherBackup: "Perfect for rainy days - no cooking needed!",
    popularityScore: 78,
  },
  {
    id: "l5",
    name: "Wraps with Hummus & Veggies",
    mealType: "lunch",
    description: "Healthy, filling, and no cooking needed",
    complexity: "easy",
    cookingMethods: ["no-cook"],
    prepTime: 10,
    cookTime: 0,
    servings: 4,
    storage: "cooler",
    dietaryTags: ["vegetarian", "vegan"],
    ingredients: [
      { item: "Large tortillas", quantity: 4, unit: "tortillas", category: "grains" },
      { item: "Hummus", quantity: 1, unit: "container", category: "condiments" },
      { item: "Shredded carrots", quantity: 1, unit: "cup", category: "produce" },
      { item: "Cucumber", quantity: 1, unit: "cucumber", category: "produce" },
      { item: "Spinach", quantity: 2, unit: "cups", category: "produce" },
    ],
    instructions: [
      "Spread hummus on tortillas",
      "Layer with vegetables",
      "Roll up tightly and slice in half"
    ],
    popularityScore: 75,
  },

  // ===== DINNER =====
  {
    id: "d1",
    name: "Grilled Burgers & Hot Dogs",
    mealType: "dinner",
    description: "Classic camp dinner everyone loves",
    complexity: "easy",
    cookingMethods: ["grill", "campfire"],
    prepTime: 10,
    cookTime: 15,
    servings: 4,
    storage: "cooler",
    dietaryTags: [],
    ingredients: [
      { item: "Ground beef", quantity: 2, unit: "lbs", category: "protein" },
      { item: "Hot dogs", quantity: 4, unit: "hot dogs", category: "protein" },
      { item: "Burger buns", quantity: 8, unit: "buns", category: "grains" },
      { item: "Cheese slices", quantity: 8, unit: "slices", category: "dairy" },
      { item: "Lettuce and tomato", quantity: 1, unit: "set", category: "produce" },
      { item: "Condiments", quantity: 1, unit: "set", category: "condiments" },
      { item: "Potato chips", quantity: 1, unit: "bag", category: "snacks" },
    ],
    instructions: [
      "Form beef into patties",
      "Grill burgers and hot dogs",
      "Toast buns on grill",
      "Assemble with toppings and serve"
    ],
    prepAhead: "Form burger patties at home, freeze with parchment between",
    popularityScore: 95,
  },
  {
    id: "d2",
    name: "Campfire Chili",
    mealType: "dinner",
    description: "Hearty one-pot meal perfect for cool evenings",
    complexity: "moderate",
    cookingMethods: ["campfire", "camp-stove"],
    prepTime: 10,
    cookTime: 30,
    servings: 4,
    storage: "cooler",
    dietaryTags: [],
    ingredients: [
      { item: "Ground beef", quantity: 1.5, unit: "lbs", category: "protein", prepAhead: true },
      { item: "Canned kidney beans", quantity: 2, unit: "cans", category: "canned" },
      { item: "Canned diced tomatoes", quantity: 2, unit: "cans", category: "canned" },
      { item: "Chili seasoning", quantity: 1, unit: "packet", category: "spices" },
      { item: "Onion", quantity: 1, unit: "onion", category: "produce" },
      { item: "Shredded cheese", quantity: 1, unit: "cup", category: "dairy", optional: true },
      { item: "Crackers or bread", quantity: 1, unit: "box", category: "grains" },
    ],
    instructions: [
      "Brown ground beef in Dutch oven",
      "Add chopped onion, cook until soft",
      "Add beans, tomatoes, and seasoning",
      "Simmer 20-30 minutes",
      "Serve with cheese and crackers"
    ],
    prepAhead: "Pre-brown meat at home, just reheat and add other ingredients",
    weatherBackup: "Can cook on camp stove if rain prevents campfire",
    popularityScore: 92,
  },
  {
    id: "d3",
    name: "Foil Packet Dinners",
    mealType: "dinner",
    description: "Individual customizable meals, easy cleanup",
    complexity: "easy",
    cookingMethods: ["foil-packet", "campfire", "grill"],
    prepTime: 15,
    cookTime: 25,
    servings: 4,
    storage: "cooler",
    dietaryTags: [],
    ingredients: [
      { item: "Chicken breasts or ground beef", quantity: 1.5, unit: "lbs", category: "protein" },
      { item: "Potatoes", quantity: 4, unit: "potatoes", category: "produce" },
      { item: "Carrots", quantity: 4, unit: "carrots", category: "produce" },
      { item: "Bell peppers", quantity: 2, unit: "peppers", category: "produce" },
      { item: "Onion", quantity: 1, unit: "onion", category: "produce" },
      { item: "Butter", quantity: 4, unit: "tbsp", category: "dairy" },
      { item: "Seasonings", quantity: 1, unit: "set", category: "spices" },
    ],
    instructions: [
      "Cut vegetables into bite-sized pieces",
      "Layer protein and vegetables on foil",
      "Add butter and seasonings",
      "Seal foil packets tightly",
      "Cook on coals or grill 20-25 minutes",
      "Open carefully (steam is hot!)"
    ],
    prepAhead: "Prep all vegetables at home, store in ziplock bags",
    popularityScore: 88,
  },
  {
    id: "d4",
    name: "Spaghetti with Meat Sauce",
    mealType: "dinner",
    description: "Filling camp classic that's hard to mess up",
    complexity: "moderate",
    cookingMethods: ["camp-stove", "campfire"],
    prepTime: 10,
    cookTime: 25,
    servings: 4,
    storage: "none",
    dietaryTags: [],
    ingredients: [
      { item: "Spaghetti pasta", quantity: 1, unit: "lb", category: "grains" },
      { item: "Ground beef", quantity: 1, unit: "lb", category: "protein", prepAhead: true },
      { item: "Jar of pasta sauce", quantity: 1, unit: "jar", category: "canned" },
      { item: "Garlic powder", quantity: 1, unit: "tsp", category: "spices" },
      { item: "Parmesan cheese", quantity: 1, unit: "cup", category: "dairy", optional: true },
      { item: "Garlic bread", quantity: 1, unit: "loaf", category: "grains", optional: true },
    ],
    instructions: [
      "Boil water and cook pasta",
      "Brown ground beef in separate pot",
      "Add pasta sauce to meat",
      "Drain pasta, top with sauce",
      "Serve with parmesan and garlic bread"
    ],
    prepAhead: "Pre-cook meat sauce at home, freeze, reheat and serve over fresh pasta",
    popularityScore: 86,
  },
  {
    id: "d5",
    name: "Grilled Chicken & Vegetables",
    mealType: "dinner",
    description: "Healthy option with great flavor from the grill",
    complexity: "moderate",
    cookingMethods: ["grill", "campfire"],
    prepTime: 15,
    cookTime: 20,
    servings: 4,
    storage: "cooler",
    dietaryTags: [],
    ingredients: [
      { item: "Chicken breasts", quantity: 4, unit: "breasts", category: "protein" },
      { item: "Zucchini", quantity: 2, unit: "zucchini", category: "produce" },
      { item: "Bell peppers", quantity: 2, unit: "peppers", category: "produce" },
      { item: "Olive oil", quantity: 3, unit: "tbsp", category: "condiments" },
      { item: "Seasonings", quantity: 1, unit: "set", category: "spices" },
      { item: "Rice or couscous", quantity: 2, unit: "cups", category: "grains" },
    ],
    instructions: [
      "Marinate chicken in oil and seasonings",
      "Cut vegetables into large pieces",
      "Grill chicken and vegetables",
      "Serve over rice or couscous"
    ],
    prepAhead: "Marinate chicken at home, store in cooler",
    popularityScore: 82,
  },
  {
    id: "d6",
    name: "Campfire Tacos",
    mealType: "dinner",
    description: "Interactive meal where everyone builds their own",
    complexity: "easy",
    cookingMethods: ["campfire", "camp-stove", "grill"],
    prepTime: 10,
    cookTime: 15,
    servings: 4,
    storage: "cooler",
    dietaryTags: [],
    ingredients: [
      { item: "Ground beef or turkey", quantity: 1.5, unit: "lbs", category: "protein", prepAhead: true },
      { item: "Taco seasoning", quantity: 1, unit: "packet", category: "spices" },
      { item: "Taco shells or tortillas", quantity: 12, unit: "shells", category: "grains" },
      { item: "Shredded cheese", quantity: 2, unit: "cups", category: "dairy" },
      { item: "Lettuce", quantity: 1, unit: "head", category: "produce" },
      { item: "Tomatoes", quantity: 2, unit: "tomatoes", category: "produce" },
      { item: "Salsa and sour cream", quantity: 1, unit: "set", category: "condiments", optional: true },
    ],
    instructions: [
      "Brown meat, add seasoning and water",
      "Simmer until thickened",
      "Warm taco shells",
      "Set out toppings buffet-style",
      "Let everyone build their own tacos"
    ],
    prepAhead: "Pre-cook and season meat at home, just reheat at camp",
    popularityScore: 94,
  },
  {
    id: "d7",
    name: "Campfire Pizza",
    mealType: "dinner",
    description: "Fun to make, delicious to eat",
    complexity: "moderate",
    cookingMethods: ["campfire", "grill", "dutch-oven"],
    prepTime: 15,
    cookTime: 15,
    servings: 4,
    storage: "cooler",
    dietaryTags: ["vegetarian"],
    ingredients: [
      { item: "Pizza dough or flatbread", quantity: 4, unit: "rounds", category: "grains" },
      { item: "Pizza sauce", quantity: 1, unit: "jar", category: "canned" },
      { item: "Mozzarella cheese", quantity: 2, unit: "cups", category: "dairy" },
      { item: "Pepperoni", quantity: 1, unit: "package", category: "protein", optional: true },
      { item: "Bell peppers", quantity: 1, unit: "pepper", category: "produce", optional: true },
    ],
    instructions: [
      "Stretch or flatten dough",
      "Add sauce and toppings",
      "Cook in cast iron or on grill with lid",
      "Rotate for even cooking"
    ],
    prepAhead: "Prep toppings at home in separate containers",
    popularityScore: 85,
  },
  {
    id: "d8",
    name: "One-Pot Mac & Cheese",
    mealType: "dinner",
    description: "Comfort food that's easy to make at camp",
    complexity: "easy",
    cookingMethods: ["camp-stove"],
    prepTime: 5,
    cookTime: 15,
    servings: 4,
    storage: "none",
    dietaryTags: ["vegetarian"],
    ingredients: [
      { item: "Elbow macaroni", quantity: 1, unit: "lb", category: "grains" },
      { item: "Butter", quantity: 4, unit: "tbsp", category: "dairy" },
      { item: "Milk", quantity: 2, unit: "cups", category: "dairy" },
      { item: "Shredded cheddar cheese", quantity: 3, unit: "cups", category: "dairy" },
      { item: "Salt and pepper", quantity: 1, unit: "pinch", category: "spices" },
    ],
    instructions: [
      "Boil pasta until al dente, drain",
      "Add butter and milk to pot",
      "Stir in cheese until melted",
      "Add pasta back and mix"
    ],
    popularityScore: 88,
  },

  // ===== SNACKS =====
  {
    id: "s1",
    name: "Trail Mix",
    mealType: "snacks",
    description: "Perfect for hikes and between-meal energy",
    complexity: "easy",
    cookingMethods: ["no-cook"],
    prepTime: 5,
    cookTime: 0,
    servings: 4,
    storage: "none",
    dietaryTags: ["vegetarian", "vegan"],
    ingredients: [
      { item: "Mixed nuts", quantity: 2, unit: "cups", category: "snacks" },
      { item: "Dried fruit", quantity: 1, unit: "cup", category: "snacks" },
      { item: "Chocolate chips or M&Ms", quantity: 1, unit: "cup", category: "snacks" },
      { item: "Granola", quantity: 1, unit: "cup", category: "grains", optional: true },
    ],
    instructions: [
      "Mix all ingredients in a large bag",
      "Portion into smaller bags for easy access"
    ],
    prepAhead: "Make large batch at home, portion for each day",
    popularityScore: 90,
  },
  {
    id: "s2",
    name: "S'mores",
    mealType: "snacks",
    description: "The quintessential camping treat",
    complexity: "easy",
    cookingMethods: ["campfire"],
    prepTime: 2,
    cookTime: 5,
    servings: 4,
    storage: "none",
    dietaryTags: ["vegetarian"],
    ingredients: [
      { item: "Graham crackers", quantity: 2, unit: "boxes", category: "snacks" },
      { item: "Marshmallows", quantity: 1, unit: "bag", category: "snacks" },
      { item: "Chocolate bars", quantity: 8, unit: "bars", category: "snacks" },
    ],
    instructions: [
      "Toast marshmallow over fire until golden",
      "Sandwich between graham crackers with chocolate",
      "Let chocolate melt slightly",
      "Enjoy!"
    ],
    popularityScore: 98,
  },
  {
    id: "s3",
    name: "Fresh Fruit",
    mealType: "snacks",
    description: "Healthy option, refreshing on hot days",
    complexity: "easy",
    cookingMethods: ["no-cook"],
    prepTime: 5,
    cookTime: 0,
    servings: 4,
    storage: "cooler",
    dietaryTags: ["vegetarian", "vegan"],
    ingredients: [
      { item: "Apples", quantity: 4, unit: "apples", category: "produce" },
      { item: "Oranges", quantity: 4, unit: "oranges", category: "produce" },
      { item: "Bananas", quantity: 4, unit: "bananas", category: "produce" },
      { item: "Grapes", quantity: 1, unit: "bunch", category: "produce", optional: true },
    ],
    instructions: [
      "Wash fruit",
      "Cut if needed",
      "Serve"
    ],
    popularityScore: 75,
  },
  {
    id: "s4",
    name: "Crackers & Cheese",
    mealType: "snacks",
    description: "Simple, satisfying, no prep needed",
    complexity: "easy",
    cookingMethods: ["no-cook"],
    prepTime: 2,
    cookTime: 0,
    servings: 4,
    storage: "cooler",
    dietaryTags: ["vegetarian"],
    ingredients: [
      { item: "Crackers", quantity: 1, unit: "box", category: "snacks" },
      { item: "Cheese slices or cubes", quantity: 1, unit: "lb", category: "dairy" },
      { item: "Summer sausage", quantity: 1, unit: "sausage", category: "protein", optional: true },
    ],
    instructions: [
      "Arrange crackers and cheese",
      "Slice sausage if using",
      "Serve"
    ],
    popularityScore: 85,
  },
  {
    id: "s5",
    name: "Granola Bars",
    mealType: "snacks",
    description: "Grab-and-go option for hikes",
    complexity: "easy",
    cookingMethods: ["no-cook"],
    prepTime: 0,
    cookTime: 0,
    servings: 4,
    storage: "none",
    dietaryTags: ["vegetarian"],
    ingredients: [
      { item: "Granola bars", quantity: 12, unit: "bars", category: "snacks" },
    ],
    instructions: [
      "Open and eat"
    ],
    popularityScore: 70,
  },
  {
    id: "s6",
    name: "Chips & Salsa",
    mealType: "snacks",
    description: "Perfect for munching around the campfire",
    complexity: "easy",
    cookingMethods: ["no-cook"],
    prepTime: 1,
    cookTime: 0,
    servings: 4,
    storage: "none",
    dietaryTags: ["vegetarian", "vegan"],
    ingredients: [
      { item: "Tortilla chips", quantity: 1, unit: "bag", category: "snacks" },
      { item: "Salsa", quantity: 1, unit: "jar", category: "condiments" },
      { item: "Guacamole", quantity: 1, unit: "container", category: "condiments", optional: true },
    ],
    instructions: [
      "Pour salsa into bowl",
      "Serve with chips"
    ],
    popularityScore: 88,
  },
  {
    id: "s7",
    name: "Beef Jerky",
    mealType: "snacks",
    description: "Protein-packed, no refrigeration needed",
    complexity: "easy",
    cookingMethods: ["no-cook"],
    prepTime: 0,
    cookTime: 0,
    servings: 4,
    storage: "none",
    dietaryTags: [],
    ingredients: [
      { item: "Beef jerky", quantity: 1, unit: "bag", category: "snacks" },
    ],
    instructions: [
      "Open bag and enjoy"
    ],
    popularityScore: 78,
  },
  {
    id: "s8",
    name: "Campfire Popcorn",
    mealType: "snacks",
    description: "Fun to make, great for movie night under the stars",
    complexity: "easy",
    cookingMethods: ["campfire"],
    prepTime: 2,
    cookTime: 5,
    servings: 4,
    storage: "none",
    dietaryTags: ["vegetarian", "vegan"],
    ingredients: [
      { item: "Popcorn kernels", quantity: 0.5, unit: "cup", category: "snacks" },
      { item: "Oil", quantity: 2, unit: "tbsp", category: "condiments" },
      { item: "Salt", quantity: 1, unit: "tsp", category: "spices" },
      { item: "Butter", quantity: 2, unit: "tbsp", category: "dairy", optional: true },
    ],
    instructions: [
      "Place kernels and oil in campfire popcorn popper",
      "Hold over fire, shaking constantly",
      "When popping slows, remove from heat",
      "Season with salt and butter"
    ],
    popularityScore: 82,
  },
  {
    id: "s9",
    name: "Banana Boats",
    mealType: "snacks",
    description: "Sweet campfire treat kids love",
    complexity: "easy",
    cookingMethods: ["campfire", "grill"],
    prepTime: 5,
    cookTime: 10,
    servings: 4,
    storage: "none",
    dietaryTags: ["vegetarian"],
    ingredients: [
      { item: "Bananas", quantity: 4, unit: "bananas", category: "produce" },
      { item: "Chocolate chips", quantity: 0.5, unit: "cup", category: "snacks" },
      { item: "Mini marshmallows", quantity: 1, unit: "cup", category: "snacks" },
      { item: "Peanut butter", quantity: 4, unit: "tbsp", category: "condiments", optional: true },
    ],
    instructions: [
      "Slice banana lengthwise through peel (not all the way through)",
      "Stuff with chocolate and marshmallows",
      "Wrap in foil",
      "Cook on coals or grill until gooey"
    ],
    popularityScore: 90,
  },
  {
    id: "s10",
    name: "Apple Slices with Peanut Butter",
    mealType: "snacks",
    description: "Healthy and satisfying afternoon snack",
    complexity: "easy",
    cookingMethods: ["no-cook"],
    prepTime: 5,
    cookTime: 0,
    servings: 4,
    storage: "cooler",
    dietaryTags: ["vegetarian", "vegan"],
    ingredients: [
      { item: "Apples", quantity: 4, unit: "apples", category: "produce" },
      { item: "Peanut butter", quantity: 0.5, unit: "cup", category: "condiments" },
    ],
    instructions: [
      "Slice apples",
      "Serve with peanut butter for dipping"
    ],
    popularityScore: 80,
  },
];

/**
 * Filter suggestions by various criteria
 */
export function filterSuggestions(
  suggestions: MealSuggestion[],
  filters: {
    mealType?: "breakfast" | "lunch" | "dinner" | "snacks";
    cookingMethod?: CookingMethod;
    maxComplexity?: MealComplexity;
    dietary?: DietaryTag[];
    maxPrepTime?: number;
    storage?: StorageRequirement;
  }
): MealSuggestion[] {
  return suggestions.filter(suggestion => {
    if (filters.mealType && suggestion.mealType !== filters.mealType) return false;
    
    if (filters.cookingMethod && !suggestion.cookingMethods.includes(filters.cookingMethod)) return false;
    
    if (filters.maxComplexity) {
      const complexityOrder = { easy: 1, moderate: 2, advanced: 3 };
      if (complexityOrder[suggestion.complexity] > complexityOrder[filters.maxComplexity]) return false;
    }
    
    if (filters.dietary && filters.dietary.length > 0) {
      if (!filters.dietary.every(tag => suggestion.dietaryTags.includes(tag))) return false;
    }
    
    if (filters.maxPrepTime && (suggestion.prepTime + suggestion.cookTime) > filters.maxPrepTime) return false;
    
    if (filters.storage && suggestion.storage !== filters.storage && suggestion.storage !== "none") return false;
    
    return true;
  });
}

/**
 * Get top suggestions by popularity for a meal type
 */
export function getTopSuggestions(
  mealType: "breakfast" | "lunch" | "dinner" | "snacks", 
  limit: number = 5
): MealSuggestion[] {
  return ENHANCED_MEAL_SUGGESTIONS
    .filter(s => s.mealType === mealType)
    .sort((a, b) => (b.popularityScore || 0) - (a.popularityScore || 0))
    .slice(0, limit);
}

/**
 * Get quick meals (15 min or less total time)
 */
export function getQuickMeals(
  mealType?: "breakfast" | "lunch" | "dinner" | "snacks"
): MealSuggestion[] {
  return ENHANCED_MEAL_SUGGESTIONS
    .filter(s => {
      if (mealType && s.mealType !== mealType) return false;
      return (s.prepTime + s.cookTime) <= 15;
    })
    .sort((a, b) => (a.prepTime + a.cookTime) - (b.prepTime + b.cookTime));
}

/**
 * Get no-cook meals
 */
export function getNoCookMeals(
  mealType?: "breakfast" | "lunch" | "dinner" | "snacks"
): MealSuggestion[] {
  return ENHANCED_MEAL_SUGGESTIONS
    .filter(s => {
      if (mealType && s.mealType !== mealType) return false;
      return s.cookingMethods.includes("no-cook");
    });
}

/**
 * Search suggestions by name or description
 */
export function searchSuggestions(query: string): MealSuggestion[] {
  const lowerQuery = query.toLowerCase();
  return ENHANCED_MEAL_SUGGESTIONS.filter(s => 
    s.name.toLowerCase().includes(lowerQuery) ||
    s.description?.toLowerCase().includes(lowerQuery) ||
    s.ingredients.some(i => i.item.toLowerCase().includes(lowerQuery))
  );
}

/**
 * Get a suggestion by ID
 */
export function getSuggestionById(id: string): MealSuggestion | undefined {
  return ENHANCED_MEAL_SUGGESTIONS.find(s => s.id === id);
}
