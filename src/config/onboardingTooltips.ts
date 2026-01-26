import { OnboardingTooltip } from '../types/onboarding';

export const onboardingTooltips: OnboardingTooltip[] = [
  // Home Screen
  {
    id: 'home-welcome',
    screenName: 'Home',
    title: 'Welcome to The Complete Camping App! 🏕️',
    message: 'This is your home base. From here you can quickly access your upcoming trips, gear, and more.',
    order: 1,
  },
  // MyTripsScreen (Plan tab)
  {
    id: 'trips-overview',
    screenName: 'MyTrips',
    title: 'ⓘ Plan',
    message: 'Start by adding a trip name and dates, then build everything else around it—packing lists, meal plans, itinerary links, and notes. You can also invite friends and share trip details; some sharing tools may require a Pro subscription.',
    order: 1,
  },
  // PackingTabScreenNew (Packing tab within trip)
  {
    id: 'packing-intro',
    screenName: 'Packing',
    title: 'ⓘ Packing List',
    message: 'This is where packing stops being chaos. Start with a template filled with suggestions to help you along, tweak it for your trip, then check items off as you go (and reuse lists later). Some templates, smart tools, or advanced features may be locked for Pro.',
    order: 1,
  },
  // MealPlanningScreen (Recipes/Meals)
  {
    id: 'recipes-intro',
    screenName: 'MealPlanning',
    title: 'ⓘ Meal Planning',
    message: 'Plan meals for the whole trip in one place, with preplanned meal suggestions and recipes to make it easy. Then tap once to turn everything into a single shopping list. Add notes, keep it realistic, and avoid the "we forgot utensils" moment. Meal planning features require a Pro subscription.',
    order: 1,
  },
  // ParksBrowseScreen (Parks tab)
  {
    id: 'explore-intro',
    screenName: 'Parks',
    title: 'ⓘ Parks',
    message: 'Use this screen to search thousands of campgrounds at National Parks, National Forests, and State Parks. Or add your own favorite destinations. It\'s a great starting point when you\'re not sure where to go yet.\n\nSome park details or tools are available to Pro subscribers only.',
    order: 1,
  },
  // WeatherScreen
  {
    id: 'weather-intro',
    screenName: 'Weather',
    title: 'ⓘ Weather',
    message: 'Check forecasts and add them to your trip so you can pack smarter and plan around the weird stuff (wind, storms, sudden cold). Use it before you finalize meals, gear, and campsite setup. Some weather features may be Pro-only.',
    order: 1,
  },
  // QuestionsListScreen (Ask a Camper tab in Connect)
  {
    id: 'help-intro',
    screenName: 'Ask',
    title: 'ⓘ Ask a Camper',
    message: 'Stuck on a camping question? Ask it here and get help from real campers. Keep it specific and include your trip type, weather, and gear if it matters. Some posting or community features may be Pro-only.',
    order: 1,
  },
  // TipsListScreen (Tips tab in Connect)
  {
    id: 'about-intro',
    screenName: 'Tips',
    title: 'ⓘ Tips',
    message: 'Quick, practical camping help lives here. Use Tips when you want a fast answer without digging through the internet. Some deeper guides may be available to Pro subscribers only.',
    order: 1,
  },
  // GearReviewsListScreen (Gear tab in Connect)
  {
    id: 'gear-reviews-intro',
    screenName: 'Gear',
    title: 'ⓘ Gear Reviews',
    message: 'This is your gear rabbit hole. Browse reviews, learn what works, and save ideas for later. Some review content or premium sections may require Pro.',
    order: 1,
  },
  // PhotosListScreen (Photos tab in Connect)
  {
    id: 'photos-intro',
    screenName: 'Photos',
    title: 'ⓘ Photos',
    message: 'Use Photos to save, share, and revisit your camping moments (and the setups you want to copy next time). Add context so you remember what worked and what didn\'t. Share campsites with reviews for your fellow campers. Some photo features may be locked for Pro.',
    order: 1,
  },
  // FeedbackListScreen (Feedback tab in Connect)
  {
    id: 'feedback-intro',
    screenName: 'Feedback',
    title: 'ⓘ Feedback',
    message: 'Tell us what\'s working, what\'s confusing, and what you want next. Feedback helps shape updates in order to help us make this the best app for this community. Some feedback perks or channels may be Pro-only.',
    order: 1,
  },
  // FirstAidScreen
  {
    id: 'first-aid-intro',
    screenName: 'FirstAid',
    title: 'ⓘ First Aid',
    message: 'This is your quick reference for common outdoor first aid situations and what to do next. It\'s meant for fast, calm guidance when you need it. If you have an emergency, call local emergency services right away.',
    order: 1,
  },
  // MyCampsiteScreen
  {
    id: 'my-campsite-intro',
    screenName: 'MyCampsite',
    title: 'ⓘ My Campsite',
    message: 'My Campsite is your profile—it\'s the place that shows how you like to camp. Set up your camping style details, keep your Gear Closet organized, and grow your Campground, your circle of friends you camp with. Some profile and community features may require Pro.',
    order: 1,
  },
  // MyCampgroundScreen
  {
    id: 'my-campground-intro',
    screenName: 'MyCampground',
    title: 'ⓘ My Campground',
    message: 'My Campground is your circle of camping friends. Add members here, then include them on a trip so everyone stays on the same page with destinations, meal plans, weather forecasts, and itinerary links. Some sharing and group features may require Pro.',
    order: 1,
  },
  // MyGearClosetScreen
  {
    id: 'gear-closet-intro',
    screenName: 'GearCloset',
    title: 'ⓘ My Gear Closet',
    message: 'This is your inventory of what you actually own. Add gear once, then use it to build smarter packing lists so you stop packing from memory. Some gear tracking and advanced organization tools may be locked for Pro.',
    order: 1,
  },
  // LearnScreen
  {
    id: 'learn-intro',
    screenName: 'Learn',
    title: 'ⓘ Learn',
    message: 'Learn is where you build your camping skills over time. Follow learning tracks by topic, pick up tips as you go, and earn badges to mark milestones and progress. Some tracks, badges, or advanced lessons may require Pro.',
    order: 1,
  },
];

export const getTooltipsForScreen = (screenName: string): OnboardingTooltip[] => {
  return onboardingTooltips
    .filter((t) => t.screenName === screenName)
    .sort((a, b) => a.order - b.order);
};
