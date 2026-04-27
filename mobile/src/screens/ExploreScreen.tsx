import React, { useEffect, useState, useRef, useMemo } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Animated,
  Modal,
  Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { ExploreStackNavigationProp } from '../navigation/types';
import { DishCard, CategoryHeader, type DishCardData } from '../components/Explore';
import { Spacing, Typography, BorderRadius, Shadows } from '../theme';
import { useAppTheme } from '../context/ThemeContext';
import { fetchFeaturedDishes } from '../services/api';
import { cacheFeaturedDishes, loadCachedDishes } from '../services/storage';

// ─── Static curated content ──────────────────────────────────────────────────

type NutritionFact = { label: string; value: string; icon: string; color: string };

const NUTRITION_FACTS: NutritionFact[] = [
  { label: 'Protein per chicken breast', value: '~31 g', icon: 'food-drumstick', color: '#FF6B6B' },
  { label: 'Calories in an avocado', value: '~240 kcal', icon: 'fruit-pineapple', color: '#4ECDC4' },
  { label: 'Carbs in 1 cup white rice', value: '~45 g', icon: 'bread-slice', color: '#FFE66D' },
  { label: 'Fat in 2 tbsp peanut butter', value: '~16 g', icon: 'peanut', color: '#F7AE6B' },
  { label: 'Fiber in 1 cup lentils', value: '~15.6 g', icon: 'leaf', color: '#95E1A4' },
  { label: 'Sodium in fast food burger', value: '~1000 mg', icon: 'hamburger', color: '#C9B1FF' },
  { label: 'Protein in 1 cup Greek yogurt', value: '~17 g', icon: 'food-variant', color: '#FF8FAB' },
  { label: 'Calories in 1 tsp olive oil', value: '~40 kcal', icon: 'bottle-tonic', color: '#FFB347' },
];

type TrendingSearch = { query: string; calories: string; icon: string };
const TRENDING_SEARCHES: TrendingSearch[] = [
  { query: 'Chipotle chicken burrito', calories: '~970 kcal', icon: 'wrap' },
  { query: 'Acai bowl', calories: '~400 kcal', icon: 'bowl-mix' },
  { query: 'Salmon sushi roll (8 pc)', calories: '~330 kcal', icon: 'fish' },
  { query: 'Avocado toast with egg', calories: '~350 kcal', icon: 'bread-slice-outline' },
  { query: 'Protein shake with milk', calories: '~300 kcal', icon: 'cup' },
  { query: 'Cheese pizza (2 slices)', calories: '~570 kcal', icon: 'pizza' },
  { query: 'Pad Thai (restaurant)', calories: '~720 kcal', icon: 'noodles' },
  { query: 'Overnight oats', calories: '~380 kcal', icon: 'bowl-outline' },
];

// ─── Recipes ─────────────────────────────────────────────────────────────────

type Recipe = {
  prepTime: string;
  cookTime: string;
  servings: number;
  ingredients: string[];
  steps: string[];
};

const RECIPES: Record<string, Recipe> = {
  r1: {
    prepTime: '10 min', cookTime: '25 min', servings: 1,
    ingredients: ['1 cup cooked white rice','½ cup canned black beans, drained','5 oz grilled chicken breast, sliced','¼ cup shredded cheese','¼ cup romaine lettuce, chopped','3 tbsp fresh tomato salsa','1 tbsp sour cream (optional)'],
    steps: ['Season chicken with salt, pepper, cumin, and chili powder. Grill 6–7 min per side until cooked through.','Slice chicken and set aside.','Layer rice and beans in a bowl.','Add chicken, then top with cheese, lettuce, and salsa.','Serve immediately with sour cream if desired.'],
  },
  r2: {
    prepTime: '10 min', cookTime: '30 min', servings: 2,
    ingredients: ['8 oz paneer, cubed','1 cup crushed tomatoes','½ cup heavy cream','1 small onion, diced','3 garlic cloves, minced','1 tsp garam masala','1 tsp cumin','½ tsp turmeric','1 tbsp butter','Naan for serving'],
    steps: ['Pan-fry paneer cubes in butter until golden on each side. Set aside.','Sauté onion in the same pan until soft. Add garlic and cook 1 min.','Add cumin, turmeric, and garam masala; toast 30 seconds.','Stir in crushed tomatoes and simmer 10 min.','Add cream and paneer; simmer 5 more min. Season with salt.','Serve with warm naan.'],
  },
  r3: {
    prepTime: '15 min', cookTime: '12 min', servings: 2,
    ingredients: ['1 ball pizza dough (store-bought or homemade)','⅓ cup crushed San Marzano tomatoes','4 oz fresh mozzarella, sliced','8 fresh basil leaves','1 tbsp olive oil','Salt & pepper'],
    steps: ['Preheat oven to 500 °F (260 °C) with a pizza stone or baking sheet inside.','Stretch dough to a 12-inch round on a lightly floured surface.','Spread tomato sauce evenly, leaving a 1-inch border.','Lay mozzarella slices on top. Season with salt.','Slide onto the hot stone and bake 10–12 min until crust is golden.','Top with fresh basil and a drizzle of olive oil before serving.'],
  },
  r4: {
    prepTime: '20 min', cookTime: '15 min', servings: 2,
    ingredients: ['200 g dried rice noodles','12 medium shrimp, peeled','2 eggs','2 tbsp fish sauce','1 tbsp oyster sauce','1 tsp sugar','2 garlic cloves, minced','1 cup bean sprouts','3 tbsp crushed peanuts','Lime wedges & green onions to serve'],
    steps: ['Soak rice noodles in warm water 20 min; drain.','Mix fish sauce, oyster sauce, and sugar in a small bowl; set aside.','Heat oil in a wok over high heat. Add garlic and shrimp; cook until pink.','Push to the side, scramble eggs in the centre until just set.','Add noodles and sauce; toss everything together 2 min.','Add bean sprouts, toss once more, and plate.','Top with peanuts, green onions, and lime wedges.'],
  },
  r5: {
    prepTime: '10 min', cookTime: '20 min', servings: 1,
    ingredients: ['6 oz 80/20 ground beef patty','1 brioche bun','1 slice American cheese','Lettuce, tomato, onion','Ketchup, mustard, mayo','1 medium russet potato, cut into fries','Oil for frying, salt'],
    steps: ['Cut potato into even fries and soak in cold water 10 min; pat dry.','Fry at 350 °F for 5 min, remove, raise oil to 375 °F, fry again 3 min until golden. Season immediately.','Season patty with salt and pepper. Cook on a hot cast iron 3–4 min per side for medium.','Add cheese in the last minute and cover to melt.','Toast bun. Assemble burger with your preferred toppings.'],
  },
  r6: {
    prepTime: '10 min', cookTime: '20 min', servings: 1,
    ingredients: ['6 oz salmon fillet','3 tbsp soy sauce','2 tbsp mirin','1 tbsp honey','1 cup cooked short-grain rice','½ cup shelled edamame','Sesame seeds & sliced green onion'],
    steps: ['Whisk soy sauce, mirin, and honey in a small saucepan; simmer 3 min until slightly thickened.','Pat salmon dry. Brush with teriyaki glaze.','Grill or pan-sear salmon 3–4 min per side, basting once more halfway through.','Serve over rice with edamame. Garnish with sesame seeds and green onion.'],
  },
  r7: {
    prepTime: '20 min', cookTime: '15 min', servings: 2,
    ingredients: ['1 can (15 oz) chickpeas, drained','1 small onion, roughly chopped','2 garlic cloves','¼ cup fresh parsley','1 tsp cumin','½ tsp coriander','3 tbsp flour','2 pita breads','¼ cup hummus','1 cup tabbouleh (store-bought or homemade)'],
    steps: ['Pulse chickpeas, onion, garlic, parsley, and spices in a food processor until coarse.','Stir in flour. Form into small patties.','Shallow-fry in ½ inch of oil at 375 °F for 3 min per side until dark gold.','Warm pitas. Spread hummus, add falafel, and top with tabbouleh.'],
  },
  r8: {
    prepTime: '10 min', cookTime: '20 min', servings: 2,
    ingredients: ['4 cups chicken broth','8 medium shrimp, peeled','1 cup mushrooms, sliced','2 stalks lemongrass, bruised','4 kaffir lime leaves','3 slices galangal (or ginger)','2 tbsp fish sauce','2 tbsp lime juice','2 bird\u2019s eye chillies, sliced','Fresh cilantro'],
    steps: ['Bring broth to a boil. Add lemongrass, lime leaves, and galangal; simmer 10 min.','Add mushrooms and shrimp; cook 3 min.','Remove aromatics. Stir in fish sauce, lime juice, and chilli.','Taste and adjust seasoning. Ladle into bowls and top with cilantro.'],
  },
  r9: {
    prepTime: '10 min', cookTime: '20 min', servings: 1,
    ingredients: ['8 oz sirloin steak','1 bunch asparagus, trimmed','2 medium Yukon Gold potatoes','2 tbsp butter','¼ cup warm milk','Salt, pepper, garlic powder','Olive oil'],
    steps: ['Boil potatoes until fork-tender; drain. Mash with butter, warm milk, salt, and pepper.','Pat steak dry; season generously with salt and pepper.','Sear in a hot cast-iron pan with oil: 3–4 min per side for medium-rare. Rest 5 min.','Toss asparagus in olive oil and garlic powder; grill or roast at 425 °F for 10 min.','Slice steak against the grain and plate with potatoes and asparagus.'],
  },
  r10: {
    prepTime: '20 min', cookTime: '0 min', servings: 2,
    ingredients: ['1 cup sushi rice, cooked & seasoned','4 oz imitation crab (or real crab)','½ avocado, sliced','½ cucumber, julienned','4 nori sheets','Sesame seeds','Soy sauce & pickled ginger for serving'],
    steps: ['Place nori shiny-side down on a bamboo mat.','Spread a thin, even layer of sushi rice, leaving 1 inch at the far edge.','Lay crab, avocado, and cucumber along the near edge.','Roll tightly, pressing the mat as you go. Seal the edge with a little water.','Slice with a sharp, wet knife into 8 pieces. Sprinkle with sesame seeds.'],
  },
  h1: {
    prepTime: '5 min', cookTime: '15 min', servings: 1,
    ingredients: ['6 oz chicken breast','1 tbsp olive oil','2 garlic cloves, minced','Juice of ½ lemon','½ tsp dried oregano','Salt & pepper'],
    steps: ['Pound chicken to even thickness (about ¾ inch).','Marinate in olive oil, garlic, lemon juice, and oregano for at least 5 min.','Heat a grill pan over medium-high heat.','Cook chicken 6–7 min per side until internal temperature reaches 165 °F.','Rest 3 min before serving.'],
  },
  h2: {
    prepTime: '5 min', cookTime: '0 min (overnight)', servings: 1,
    ingredients: ['½ cup rolled oats','½ cup unsweetened almond milk','¼ cup plain Greek yogurt','1 tbsp chia seeds','½ banana, sliced','1 tsp honey','Pinch of cinnamon'],
    steps: ['Combine oats, almond milk, yogurt, chia seeds, and cinnamon in a jar.','Stir well, seal, and refrigerate overnight (minimum 4 hours).','In the morning, stir and add a splash of milk if too thick.','Top with banana slices and honey before eating.'],
  },
  h3: {
    prepTime: '5 min', cookTime: '10 min', servings: 1,
    ingredients: ['3 large eggs','1 tbsp butter','2 slices whole wheat bread','Salt & pepper','Optional: cheese, chives'],
    steps: ['Toast bread to your liking.','Whisk eggs with a pinch of salt and pepper.','Melt butter in a non-stick pan over low heat.','Pour in eggs and gently fold with a spatula every 20 seconds until just set and creamy.','Plate immediately alongside toast.'],
  },
  h4: {
    prepTime: '10 min', cookTime: '40 min', servings: 4,
    ingredients: ['400 g ground beef','400 g spaghetti','1 can (28 oz) crushed tomatoes','1 onion, diced','3 garlic cloves, minced','1 tsp Italian seasoning','½ tsp red pepper flakes','Parmesan to serve'],
    steps: ['Sauté onion in olive oil until translucent; add garlic 1 min more.','Add ground beef; cook until browned, breaking it up.','Stir in tomatoes, Italian seasoning, and chilli flakes. Simmer 25 min.','Cook pasta al dente per package directions.','Drain pasta and toss with sauce. Serve with parmesan.'],
  },
  h5: {
    prepTime: '5 min', cookTime: '0 min', servings: 1,
    ingredients: ['¾ cup plain Greek yogurt','¼ cup mixed berries (fresh or thawed frozen)','2 tbsp granola','1 tsp honey'],
    steps: ['Spoon yogurt into a bowl or glass.','Layer berries over yogurt.','Sprinkle granola on top.','Drizzle with honey and serve immediately.'],
  },
  h6: {
    prepTime: '5 min', cookTime: '5 min', servings: 1,
    ingredients: ['2 slices sourdough bread','½ ripe avocado','1 large egg','½ tsp everything bagel seasoning','Red chilli flakes (optional)','Salt & pepper'],
    steps: ['Toast sourdough until golden and crisp.','Bring 2 inches of water to a gentle simmer; add a splash of vinegar.','Crack egg into a small cup. Swirl water and slide egg in; poach 3 min.','Mash avocado with salt and pepper on toast.','Top with poached egg, everything seasoning, and chilli flakes.'],
  },
  h7: {
    prepTime: '10 min', cookTime: '0 min', servings: 1,
    ingredients: ['1 can (5 oz) chunk light tuna, drained','1½ tbsp light mayo','2 celery stalks, finely diced','1 tsp lemon juice','Salt & pepper','2 slices whole wheat bread','Lettuce & tomato'],
    steps: ['Combine tuna, mayo, celery, and lemon juice in a bowl.','Season with salt and pepper to taste.','Spread onto one slice of bread. Add lettuce and tomato.','Top with the second slice and serve.'],
  },
  h8: {
    prepTime: '10 min', cookTime: '30 min', servings: 4,
    ingredients: ['1½ cups red lentils, rinsed','1 large carrot, diced','1 onion, diced','3 garlic cloves, minced','1 tsp cumin','½ tsp turmeric','Juice of 1 lemon','4 cups vegetable broth','Olive oil, salt & pepper'],
    steps: ['Sauté onion and carrot in olive oil until soft, ~8 min.','Add garlic, cumin, and turmeric; cook 1 min.','Add lentils and broth; bring to a boil then simmer 20 min until lentils are soft.','Use an immersion blender to partially blend for a creamy texture.','Stir in lemon juice, adjust seasoning, and serve.'],
  },
  h9: {
    prepTime: '5 min', cookTime: '20 min', servings: 1,
    ingredients: ['6 oz salmon fillet, skin-on','1 tbsp butter, melted','Juice of ½ lemon','2 garlic cloves, minced','1 cup broccoli florets','Olive oil, salt & pepper'],
    steps: ['Preheat oven to 400 °F (200 °C).','Place salmon on a lined baking sheet. Mix butter, lemon, and garlic; brush over salmon.','Toss broccoli with olive oil, salt, and pepper; place beside salmon.','Bake 15–18 min until salmon flakes easily and broccoli is tender.'],
  },
  h10: {
    prepTime: '15 min', cookTime: '15 min', servings: 2,
    ingredients: ['12 oz chicken breast, sliced thin','1 red bell pepper, strips','1 cup snap peas','2 tbsp soy sauce','1 tbsp oyster sauce','1 tsp sesame oil','1 tsp cornstarch','1 tsp fresh ginger, minced','2 garlic cloves, minced','Cooked white rice to serve'],
    steps: ['Mix soy sauce, oyster sauce, sesame oil, and cornstarch in a bowl; toss with chicken.','Heat wok over high heat until smoking.','Stir-fry chicken 3–4 min until cooked; remove and set aside.','Add garlic and ginger; stir 30 sec. Add peppers and snap peas; cook 2 min.','Return chicken to wok, add sauce, and toss everything together 1 min.','Serve over steamed rice.'],
  },
};

type HealthTip = { tip: string; icon: string };
const HEALTH_TIPS: HealthTip[] = [
  { tip: 'Eating protein with every meal helps keep you full longer.', icon: 'arm-flex' },
  { tip: 'Swapping white rice for cauliflower rice saves ~170 kcal per cup.', icon: 'swap-horizontal' },
  { tip: 'Restaurant portions are often 2% to 3% larger than standard serving sizes.', icon: 'scale' },
  { tip: 'Drinking water before meals can reduce calorie intake by ~13%.', icon: 'water' },
  { tip: 'Adding a salad before your main course typically cuts total intake by ~10%.', icon: 'leaf' },
  { tip: 'Cooking at home saves an average of 200 kcal vs. eating out.', icon: 'home-heart' },
];


const _mdb = (file: string) => `https://www.themealdb.com/images/media/meals/${file}`;

const MOCK_DISHES: DishCardData[] = [
  // Restaurant
  { id: 'r1',  name: 'Chipotle Chicken Bowl',        description: 'Rice, black beans, grilled chicken, cheese, lettuce, salsa',            calories: 650, prepStyle: 'restaurant', estimatedProtein: 45, estimatedCarbs: 68, estimatedFat: 22, imageUrl: _mdb('wuyd2h1765655837.jpg')    },
  { id: 'r2',  name: 'Paneer Tikka Masala',          description: 'Creamy tomato curry with cottage cheese, served with naan',             calories: 580, prepStyle: 'restaurant', estimatedProtein: 24, estimatedCarbs: 52, estimatedFat: 28, imageUrl: _mdb('sstssx1487349585.jpg')    },
  { id: 'r3',  name: 'Margherita Pizza (2 slices)',  description: 'Classic Neapolitan pizza with fresh mozzarella and basil',              calories: 520, prepStyle: 'restaurant', estimatedProtein: 22, estimatedCarbs: 62, estimatedFat: 18, imageUrl: _mdb('x0lk931587671540.jpg')    },
  { id: 'r4',  name: 'Pad Thai (Shrimp)',            description: 'Rice noodles, shrimp, egg, peanuts, bean sprouts, lime',                calories: 720, prepStyle: 'restaurant', estimatedProtein: 28, estimatedCarbs: 88, estimatedFat: 26, imageUrl: _mdb('rg9ze01763479093.jpg')    },
  { id: 'r5',  name: 'Classic Cheeseburger & Fries', description: 'Beef patty, American cheese, lettuce, tomato, brioche bun',            calories: 920, prepStyle: 'restaurant', estimatedProtein: 38, estimatedCarbs: 85, estimatedFat: 48, imageUrl: _mdb('lgmnff1763789847.jpg')    },
  { id: 'r6',  name: 'Salmon Teriyaki Bowl',         description: 'Grilled salmon over steamed rice with teriyaki glaze, edamame',        calories: 620, prepStyle: 'restaurant', estimatedProtein: 42, estimatedCarbs: 58, estimatedFat: 16, imageUrl: _mdb('xxyupu1468262513.jpg')    },
  { id: 'r7',  name: 'Falafel Wrap',                 description: 'Crispy chickpea falafel, hummus, tabbouleh, pickled turnips in a pita', calories: 480, prepStyle: 'restaurant', estimatedProtein: 18, estimatedCarbs: 55, estimatedFat: 22, imageUrl: _mdb('u5e9qq1763795441.jpg')    },
  { id: 'r8',  name: 'Tom Yum Soup',                 description: 'Thai hot-and-sour broth with shrimp, mushrooms, lemongrass',            calories: 190, prepStyle: 'restaurant', estimatedProtein: 18, estimatedCarbs: 12, estimatedFat: 6,  imageUrl: _mdb('l50vz41763422681.jpg')    },
  { id: 'r9',  name: 'Steak & Vegetables',           description: '8 oz sirloin steak with grilled asparagus and mashed potato',          calories: 780, prepStyle: 'restaurant', estimatedProtein: 58, estimatedCarbs: 32, estimatedFat: 42, imageUrl: _mdb('vussxq1511882648.jpg')    },
  { id: 'r10', name: 'Sushi Roll (8 pc California)', description: 'Crab, avocado, cucumber, sesame seeds',                                calories: 310, prepStyle: 'restaurant', estimatedProtein: 14, estimatedCarbs: 38, estimatedFat: 10, imageUrl: _mdb('g046bb1663960946.jpg')    },
  // Home cooked
  { id: 'h1',  name: 'Grilled Chicken Breast',       description: 'Simply grilled with garlic, lemon, and herbs',                         calories: 280, prepStyle: 'home', estimatedProtein: 48, estimatedCarbs: 0,  estimatedFat: 8,  imageUrl: _mdb('nlxald1764112200.jpg')    },
  { id: 'h2',  name: 'Overnight Oats',               description: 'Rolled oats, Greek yogurt, chia seeds, banana, almond milk',           calories: 380, prepStyle: 'home', estimatedProtein: 18, estimatedCarbs: 58, estimatedFat: 8,  imageUrl: _mdb('sng9bm1765320170.jpg')    },
  { id: 'h3',  name: 'Scrambled Eggs & Toast',       description: '3 eggs with butter, 2 slices whole wheat toast',                       calories: 420, prepStyle: 'home', estimatedProtein: 24, estimatedCarbs: 32, estimatedFat: 20, imageUrl: _mdb('1550440197.jpg')          },
  { id: 'h4',  name: 'Spaghetti Bolognese',          description: 'Pasta with ground beef, tomato sauce, garlic, parmesan',               calories: 620, prepStyle: 'home', estimatedProtein: 34, estimatedCarbs: 72, estimatedFat: 18, imageUrl: _mdb('sutysw1468247559.jpg')    },
  { id: 'h5',  name: 'Greek Yogurt Parfait',         description: 'Plain Greek yogurt, mixed berries, granola, honey',                   calories: 280, prepStyle: 'home', estimatedProtein: 18, estimatedCarbs: 42, estimatedFat: 5,  imageUrl: _mdb('y2irzl1585563479.jpg')    },
  { id: 'h6',  name: 'Avocado Toast with Egg',       description: 'Sourdough, smashed avocado, poached egg, everything bagel seasoning',  calories: 350, prepStyle: 'home', estimatedProtein: 14, estimatedCarbs: 28, estimatedFat: 22, imageUrl: _mdb('1549542994.jpg')          },
  { id: 'h7',  name: 'Tuna Salad Sandwich',          description: 'Canned tuna, light mayo, celery, on whole wheat bread',                calories: 340, prepStyle: 'home', estimatedProtein: 30, estimatedCarbs: 32, estimatedFat: 10, imageUrl: _mdb('yypwwq1511304979.jpg')    },
  { id: 'h8',  name: 'Lentil Soup',                  description: 'Red lentils, carrots, cumin, turmeric, lemon',                         calories: 260, prepStyle: 'home', estimatedProtein: 16, estimatedCarbs: 42, estimatedFat: 4,  imageUrl: _mdb('vpxyqt1511464175.jpg')    },
  { id: 'h9',  name: 'Baked Salmon Fillet',          description: '6 oz salmon with lemon-butter, roasted broccoli',                     calories: 410, prepStyle: 'home', estimatedProtein: 46, estimatedCarbs: 8,  estimatedFat: 22, imageUrl: _mdb('1548772327.jpg')          },
  { id: 'h10', name: 'Chicken Stir-Fry',             description: 'Chicken breast, bell peppers, snap peas, soy-ginger sauce over rice', calories: 480, prepStyle: 'home', estimatedProtein: 38, estimatedCarbs: 48, estimatedFat: 12, imageUrl: _mdb('rwvw8q1765660071.jpg')    },
];

export const ExploreScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const navigation = useNavigation<ExploreStackNavigationProp>();
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [restaurantDishes, setRestaurantDishes] = useState<DishCardData[]>(() => MOCK_DISHES.filter(d => d.prepStyle === 'restaurant'));
  const [homeCookedMeals, setHomeCookedMeals] = useState<DishCardData[]>(() => MOCK_DISHES.filter(d => d.prepStyle === 'home'));
  const [highProteinDishes, setHighProteinDishes] = useState<DishCardData[]>(() => MOCK_DISHES.filter(d => (d.estimatedProtein || 0) >= 25).sort((a, b) => (b.estimatedProtein || 0) - (a.estimatedProtein || 0)));
  const [lowCalDishes, setLowCalDishes] = useState<DishCardData[]>(() => MOCK_DISHES.filter(d => (d.calories || 999) <= 350).sort((a, b) => (a.calories || 0) - (b.calories || 0)));
  const [allDishes, setAllDishes] = useState<DishCardData[]>(MOCK_DISHES);
  const [tipIndex, setTipIndex] = useState(0);
  const [factIndex, setFactIndex] = useState(0);
  const [selectedDish, setSelectedDish] = useState<DishCardData | null>(null);

  const searchBarHeight = useRef(new Animated.Value(0)).current;
  const searchBarOpacity = useRef(new Animated.Value(0)).current;

  const categories = ['All', 'High Protein', 'Low Calorie', 'Vegetarian', 'Keto', 'Low Carb'];

  // On mount, silently try to hydrate from cache without blocking the render
  useEffect(() => {
    loadCachedDishes()
      .then(cached => { if (cached.length > 0) applyDishData(cached.map(mapDishItem)); })
      .catch(() => {});
  }, []);

  const loadFeaturedDishes = async (isRefresh = false) => {
    if (!isRefresh) return;
    try {
      setIsRefreshing(true);
      const cached = await loadCachedDishes();
      if (cached.length > 0) applyDishData(cached.map((d: any) => mapDishItem(d)));
    } catch {
      // keep existing mock data
    } finally {
      setIsRefreshing(false);
    }
  };

  const applyDishData = (all: DishCardData[]) => {
    setAllDishes(all);
    setRestaurantDishes(all.filter(d => d.prepStyle === 'restaurant'));
    setHomeCookedMeals(all.filter(d => d.prepStyle === 'home'));
    setHighProteinDishes(all.filter(d => (d.estimatedProtein || 0) >= 25).sort((a, b) => (b.estimatedProtein || 0) - (a.estimatedProtein || 0)));
    setLowCalDishes(all.filter(d => (d.calories || 999) <= 350).sort((a, b) => (a.calories || 0) - (b.calories || 0)));
  };

  const mapDishItem = (dish: any): DishCardData => ({
    id: dish.id, name: dish.name, description: dish.description,
    calories: dish.calories, prepStyle: dish.prep_style, imageUrl: dish.image_url,
    estimatedProtein: dish.estimated_macros?.protein,
    estimatedCarbs: dish.estimated_macros?.carbs,
    estimatedFat: dish.estimated_macros?.fat,
  });

  const toggleSearch = () => {
    const next = !showSearch;
    setShowSearch(next);
    Animated.parallel([
      Animated.timing(searchBarHeight, { toValue: next ? 56 : 0, duration: 220, useNativeDriver: false }),
      Animated.timing(searchBarOpacity, { toValue: next ? 1 : 0, duration: 220, useNativeDriver: false }),
    ]).start(() => { if (!next) setSearchQuery(''); });
  };

  const filterDishes = (dishes: DishCardData[]) => {
    let out = dishes;
    if (selectedCategory !== 'All') {
      out = out.filter(d => {
        const p = d.estimatedProtein || 0;
        const c = d.estimatedCarbs || 0;
        const cal = d.calories || 999;
        const n = d.name.toLowerCase();
        switch (selectedCategory) {
          case 'High Protein': return p >= 25;
          case 'Low Calorie': return cal <= 350;
          case 'Vegetarian': return !['chicken','beef','pork','shrimp','salmon','tuna','lamb'].some(w => n.includes(w));
          case 'Keto': return c < 20;
          case 'Low Carb': return c < 30;
          default: return true;
        }
      });
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      out = out.filter(d => d.name.toLowerCase().includes(q) || d.description?.toLowerCase().includes(q));
    }
    return out;
  };

  const categorizesDishes = (dishes: any[]) => ({
    restaurant: dishes.filter(d => d.category === 'restaurant' || d.prep_style === 'restaurant'),
    home: dishes.filter(d => d.category === 'home' || d.prep_style === 'home'),
  });

  const handleDishPress = (dish: DishCardData) => {
    setSelectedDish(dish);
  };

  const handleCreateLabel = (dish: DishCardData) => {
    setSelectedDish(null);
    navigation.navigate('LabelStack' as any, {
      screen: 'LabelHome',
      params: { prefillDish: { dishName: dish.name, targetCalories: dish.calories, prepStyle: dish.prepStyle } },
    });
  };

  const handleTrendingPress = (query: string) => {
    navigation.navigate('LabelStack' as any, {
      screen: 'LabelHome',
      params: { prefillDish: { dishName: query } },
    });
  };

  const loadMockData = () => applyDishData(MOCK_DISHES);

  const filteredAll = filterDishes(allDishes);
  const filteredRestaurant = filterDishes(restaurantDishes);
  const filteredHome = filterDishes(homeCookedMeals);
  const isFiltering = !!searchQuery.trim() || selectedCategory !== 'All';
  const hasNoResults = isFiltering && filteredAll.length === 0;

  const renderHorizontal = (dishes: DishCardData[]) => (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.horizontalList}
    >
      {dishes.map(item => (
        <DishCard key={item.id} dish={item} onPress={() => handleDishPress(item)} />
      ))}
    </ScrollView>
  );

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color={colors.accent} />
        <Text style={styles.loadingText}>Loading dishes...</Text>
      </View>
    );
  }

  const currentTip = HEALTH_TIPS[tipIndex % HEALTH_TIPS.length];
  const currentFact = NUTRITION_FACTS[factIndex % NUTRITION_FACTS.length];

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        removeClippedSubviews={false}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={() => loadFeaturedDishes(true)} tintColor={colors.accent} colors={[colors.accent]} />}
      >
        {/* ── Header ── */}
        <View style={[styles.header, { paddingTop: insets.top + Spacing.lg }]}>
          <View style={styles.headerContent}>
            <View style={styles.headerTextContainer}>
              <Text style={styles.headerTitle}>Explore</Text>
              <Text style={styles.headerSubtitle}>Discover dishes & nutrition insights</Text>
            </View>
            <TouchableOpacity style={styles.searchButton} onPress={toggleSearch} activeOpacity={0.7}>
              <MaterialCommunityIcons name={showSearch ? 'close' : 'magnify'} size={22} color={colors.accent} />
            </TouchableOpacity>
          </View>
          <Animated.View style={[styles.searchContainer, { height: searchBarHeight, opacity: searchBarOpacity }]}>
            <MaterialCommunityIcons name="magnify" size={18} color={colors.textSecondary} style={{ marginRight: Spacing.sm }} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search dishes..."
              placeholderTextColor={colors.textTertiary}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus={showSearch}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <MaterialCommunityIcons name="close-circle" size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            )}
          </Animated.View>
        </View>

        {/* ── Category Chips ── */}
        <View style={styles.categorySection}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryScrollContent}>
            {categories.map(cat => (
              <TouchableOpacity
                key={cat}
                style={[styles.categoryChip, selectedCategory === cat && styles.categoryChipActive]}
                onPress={() => setSelectedCategory(cat)}
                activeOpacity={0.7}
              >
                <Text style={[styles.categoryChipText, selectedCategory === cat && styles.categoryChipTextActive]}>{cat}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* ── Filter result count ── */}
        {isFiltering && (
          <View style={styles.filterResultRow}>
            <Text style={styles.filterResultText}>
              {hasNoResults ? 'No dishes found' : `${filteredAll.length} dish${filteredAll.length !== 1 ? 'es' : ''}`}
            </Text>
            <TouchableOpacity onPress={() => { setSearchQuery(''); setSelectedCategory('All'); }}>
              <Text style={styles.clearFilterText}>Clear</Text>
            </TouchableOpacity>
          </View>
        )}

        {hasNoResults && (
          <View style={styles.noResultsContainer}>
            <MaterialCommunityIcons name="food-off" size={56} color={colors.textTertiary} />
            <Text style={styles.noResultsTitle}>No dishes found</Text>
            <Text style={styles.noResultsText}>Try a different search or browse all dishes</Text>
          </View>
        )}

        {/* ── Quick Actions (only when not filtering) ── */}
        {!isFiltering && (
          <View style={styles.quickActionsRow}>
            <TouchableOpacity style={styles.quickAction} onPress={() => navigation.navigate('CameraCapture')} activeOpacity={0.8}>
              <View style={[styles.quickActionIcon, { backgroundColor: colors.accent + '20' }]}>
                <MaterialCommunityIcons name="camera" size={24} color={colors.accent} />
              </View>
              <Text style={styles.quickActionLabel}>Photo Estimate</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickAction} onPress={() => navigation.navigate('LabelStack' as any, { screen: 'LabelHome' })} activeOpacity={0.8}>
              <View style={[styles.quickActionIcon, { backgroundColor: colors.primary + '20' }]}>
                <MaterialCommunityIcons name="tag-text" size={24} color={colors.primary} />
              </View>
              <Text style={styles.quickActionLabel}>Label a Dish</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickAction} onPress={() => navigation.navigate('LabelStack' as any, { screen: 'BarcodeScanner' })} activeOpacity={0.8}>
              <View style={[styles.quickActionIcon, { backgroundColor: colors.success + '20' }]}>
                <MaterialCommunityIcons name="barcode-scan" size={24} color={colors.success} />
              </View>
              <Text style={styles.quickActionLabel}>Scan Barcode</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Did You Know (rotatable fact) ── */}
        {!isFiltering && (
          <TouchableOpacity style={styles.factCard} onPress={() => setFactIndex(i => i + 1)} activeOpacity={0.85}>
            <View style={[styles.factIconBox, { backgroundColor: currentFact.color + '22' }]}>
              <MaterialCommunityIcons name={currentFact.icon as any} size={28} color={currentFact.color} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.factTitle}>Did you know?</Text>
              <Text style={styles.factLabel}>{currentFact.label}</Text>
              <Text style={[styles.factValue, { color: currentFact.color }]}>{currentFact.value}</Text>
            </View>
            <MaterialCommunityIcons name="refresh" size={18} color={colors.textTertiary} />
          </TouchableOpacity>
        )}

        {/* ── Trending Searches ── */}
        {!isFiltering && (
          <>
            <View style={styles.sectionHeader}>
              <MaterialCommunityIcons name="trending-up" size={18} color={colors.accent} />
              <Text style={styles.sectionTitle}>Trending Searches</Text>
              <Text style={styles.sectionSub}>Tap to auto-fill the label screen</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.trendingList}>
              {TRENDING_SEARCHES.map(ts => (
                <TouchableOpacity key={ts.query} style={styles.trendingChip} onPress={() => handleTrendingPress(ts.query)} activeOpacity={0.8}>
                  <MaterialCommunityIcons name={ts.icon as any} size={16} color={colors.accent} />
                  <View>
                    <Text style={styles.trendingName} numberOfLines={1}>{ts.query}</Text>
                    <Text style={styles.trendingCal}>{ts.calories}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </>
        )}

        {/* ── High Protein Section ── */}
        {(!isFiltering || selectedCategory === 'High Protein') && highProteinDishes.length > 0 && (
          <>
            <CategoryHeader title="High Protein Picks" subtitle="25 g+ protein per serving" icon="arm-flex" />
            {renderHorizontal(isFiltering ? filteredAll.filter(d => (d.estimatedProtein||0) >= 25) : highProteinDishes)}
          </>
        )}

        {/* ── Low Calorie Section ── */}
        {(!isFiltering || selectedCategory === 'Low Calorie') && lowCalDishes.length > 0 && (
          <>
            <CategoryHeader title="Light & Low Calorie" subtitle="Under 350 kcal per serving" icon="leaf" />
            {renderHorizontal(isFiltering ? filteredAll.filter(d => (d.calories||999) <= 350) : lowCalDishes)}
          </>
        )}

        {/* ── Restaurant Section ── */}
        {filteredRestaurant.length > 0 && (
          <>
            <CategoryHeader title="Restaurant Dishes" subtitle="Popular picks from restaurants" icon="silverware-fork-knife" />
            {renderHorizontal(filteredRestaurant)}
          </>
        )}

        {/* ── Home Cooked Section ── */}
        {filteredHome.length > 0 && (
          <>
            <CategoryHeader title="Home Cooked Meals" subtitle="Simple, wholesome recipes" icon="home-heart" />
            {renderHorizontal(filteredHome)}
          </>
        )}

        {/* Health Tip */}
        {!isFiltering && (
          <TouchableOpacity style={styles.tipCard} onPress={() => setTipIndex(i => i + 1)} activeOpacity={0.85}>
            <View style={styles.tipIconBox}>
              <MaterialCommunityIcons name={currentTip.icon as any} size={24} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.tipTitle}>Health Tip @ tap for next</Text>
              <Text style={styles.tipText}>{currentTip.tip}</Text>
            </View>
          </TouchableOpacity>
        )}

        {/* ── Calorie Reference ── */}
        {!isFiltering && (
          <>
            <View style={styles.sectionHeader}>
              <MaterialCommunityIcons name="information-outline" size={18} color={colors.accent} />
              <Text style={styles.sectionTitle}>Calorie Reference</Text>
            </View>
            <View style={styles.refGrid}>
              {[
                { food: 'Apple (medium)', cal: 95, icon: 'food-apple' },
                { food: 'Banana', cal: 105, icon: 'fruit-pineapple' },
                { food: 'Egg (large)', cal: 72, icon: 'egg' },
                { food: 'Slice of bread', cal: 79, icon: 'bread-slice' },
                { food: 'Cup of whole milk', cal: 149, icon: 'cup' },
                { food: 'Tbsp peanut butter', cal: 94, icon: 'peanut' },
                { food: 'Handful almonds (28 g)', cal: 164, icon: 'nut' },
                { food: 'Cup of cooked oats', cal: 158, icon: 'bowl-outline' },
              ].map(r => (
                <View key={r.food} style={styles.refItem}>
                  <MaterialCommunityIcons name={r.icon as any} size={22} color={colors.accent} />
                  <Text style={styles.refCal}>{r.cal}</Text>
                  <Text style={styles.refFood}>{r.food}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        <View style={{ height: Spacing.xxxl }} />
      </ScrollView>

      {/* ── Recipe Modal ── */}
      <Modal
        visible={selectedDish !== null}
        animationType="slide"
        transparent
        onRequestClose={() => setSelectedDish(null)}
      >
        <View style={styles.modalBackdrop}>
          {/* Dismiss area — behind the sheet */}
          <TouchableOpacity style={StyleSheet.absoluteFillObject} onPress={() => setSelectedDish(null)} activeOpacity={1} />
          <View style={styles.modalSheet}>
            {selectedDish && (() => {
              const recipe = RECIPES[selectedDish.id];
              return (
                <>
                  {/* Handle bar */}
                  <View style={styles.modalHandle} />

                  {/* Scrollable recipe content */}
                  <ScrollView
                    style={styles.modalScroll}
                    contentContainerStyle={styles.modalScrollContent}
                    showsVerticalScrollIndicator={false}
                    bounces={false}
                  >
                    {/* Hero image */}
                    {selectedDish.imageUrl && (
                      <Image
                        source={{ uri: selectedDish.imageUrl }}
                        style={styles.modalHeroImage}
                        resizeMode="cover"
                      />
                    )}

                    {/* Title + macros */}
                    <View style={styles.modalHeader}>
                      <Text style={styles.modalTitle}>{selectedDish.name}</Text>
                      <Text style={styles.modalDesc}>{selectedDish.description}</Text>
                      <View style={styles.macroBadgeRow}>
                        <View style={[styles.macroBadge, { backgroundColor: colors.accent + '22' }]}>
                          <Text style={[styles.macroBadgeVal, { color: colors.accent }]}>{selectedDish.calories ?? '—'}</Text>
                          <Text style={styles.macroBadgeLabel}>kcal</Text>
                        </View>
                        <View style={[styles.macroBadge, { backgroundColor: '#FF6B6B22' }]}>
                          <Text style={[styles.macroBadgeVal, { color: '#FF6B6B' }]}>{selectedDish.estimatedProtein ?? '—'}g</Text>
                          <Text style={styles.macroBadgeLabel}>protein</Text>
                        </View>
                        <View style={[styles.macroBadge, { backgroundColor: '#FFE66D33' }]}>
                          <Text style={[styles.macroBadgeVal, { color: '#C9A800' }]}>{selectedDish.estimatedCarbs ?? '—'}g</Text>
                          <Text style={styles.macroBadgeLabel}>carbs</Text>
                        </View>
                        <View style={[styles.macroBadge, { backgroundColor: '#F7AE6B22' }]}>
                          <Text style={[styles.macroBadgeVal, { color: '#D4763B' }]}>{selectedDish.estimatedFat ?? '—'}g</Text>
                          <Text style={styles.macroBadgeLabel}>fat</Text>
                        </View>
                      </View>
                    </View>

                    {recipe ? (
                      <>
                        {/* Meta row */}
                        <View style={styles.recipeMeta}>
                          <View style={styles.recipeMetaItem}>
                            <MaterialCommunityIcons name="clock-outline" size={16} color={colors.textSecondary} />
                            <Text style={styles.recipeMetaText}>Prep {recipe.prepTime}</Text>
                          </View>
                          <View style={styles.recipeMetaItem}>
                            <MaterialCommunityIcons name="fire" size={16} color={colors.textSecondary} />
                            <Text style={styles.recipeMetaText}>Cook {recipe.cookTime}</Text>
                          </View>
                          <View style={styles.recipeMetaItem}>
                            <MaterialCommunityIcons name="account-group-outline" size={16} color={colors.textSecondary} />
                            <Text style={styles.recipeMetaText}>{recipe.servings} serving{recipe.servings !== 1 ? 's' : ''}</Text>
                          </View>
                        </View>

                        {/* Ingredients */}
                        <Text style={styles.recipeSection}>Ingredients</Text>
                        {recipe.ingredients.map((ing, i) => (
                          <View key={i} style={styles.ingredientRow}>
                            <View style={styles.ingredientDot} />
                            <Text style={styles.ingredientText}>{ing}</Text>
                          </View>
                        ))}

                        {/* Steps */}
                        <Text style={styles.recipeSection}>Instructions</Text>
                        {recipe.steps.map((step, i) => (
                          <View key={i} style={styles.stepRow}>
                            <View style={styles.stepNumber}>
                              <Text style={styles.stepNumberText}>{i + 1}</Text>
                            </View>
                            <Text style={styles.stepText}>{step}</Text>
                          </View>
                        ))}
                      </>
                    ) : (
                      <View style={styles.noRecipeBox}>
                        <MaterialCommunityIcons name="chef-hat" size={40} color={colors.textTertiary} />
                        <Text style={styles.noRecipeText}>Recipe details coming soon</Text>
                      </View>
                    )}
                  </ScrollView>

                  {/* Pinned CTA — always visible */}
                  <View style={styles.modalFooter}>
                    <TouchableOpacity
                      style={styles.createLabelBtn}
                      onPress={() => handleCreateLabel(selectedDish)}
                      activeOpacity={0.85}
                    >
                      <MaterialCommunityIcons name="tag-plus" size={20} color="#FFF" />
                      <Text style={styles.createLabelText}>Create Nutrition Label</Text>
                    </TouchableOpacity>
                  </View>
                </>
              );
            })()}
          </View>
        </View>
      </Modal>
    </View>
  );
};
type C2 = ReturnType<typeof useAppTheme>['colors'];
function createStyles(colors: C2) {
  return StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: Spacing.xxxl },
  centerContent: { justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: Spacing.md, fontSize: Typography.fontSize.base, color: colors.textSecondary },
  // Header
  header: {
    paddingHorizontal: Spacing.lg, paddingTop: Spacing.xl, paddingBottom: Spacing.lg,
    backgroundColor: colors.cardBackground, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  headerContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: Spacing.xs },
  headerTextContainer: { flex: 1, marginRight: Spacing.md },
  headerTitle: { fontFamily: 'CrimsonPro_700Bold', fontSize: Typography.fontSize.xxxl, fontWeight: '700', color: colors.text, marginBottom: Spacing.xs },
  headerSubtitle: { fontSize: Typography.fontSize.sm, color: colors.textSecondary },
  searchButton: { width: 40, height: 40, borderRadius: BorderRadius.full, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: colors.accent },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.background, borderRadius: BorderRadius.md, paddingHorizontal: Spacing.md, marginTop: Spacing.md, overflow: 'hidden', borderWidth: 1, borderColor: colors.border },
  searchInput: { flex: 1, fontSize: Typography.fontSize.base, color: colors.text, paddingVertical: Spacing.sm },
  // Category chips
  categorySection: { marginTop: Spacing.md, marginBottom: Spacing.md },
  categoryScrollContent: { paddingHorizontal: Spacing.lg, gap: Spacing.sm },
  categoryChip: { paddingHorizontal: Spacing.md, paddingVertical: 7, borderRadius: BorderRadius.full, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  categoryChipActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  categoryChipText: { fontSize: Typography.fontSize.sm, fontWeight: '600', color: colors.textSecondary },
  categoryChipTextActive: { color: '#FFF' },
  // Filter results
  filterResultRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm },
  filterResultText: { fontSize: Typography.fontSize.sm, color: colors.textSecondary, fontWeight: '600' },
  clearFilterText: { fontSize: Typography.fontSize.sm, color: colors.accent, fontWeight: '700' },
  noResultsContainer: { alignItems: 'center', paddingVertical: Spacing.xxxl, paddingHorizontal: Spacing.xl },
  noResultsTitle: { fontSize: Typography.fontSize.lg, fontWeight: '700', color: colors.text, marginTop: Spacing.md, marginBottom: Spacing.xs },
  noResultsText: { fontSize: Typography.fontSize.sm, color: colors.textSecondary, textAlign: 'center' },
  // Quick actions
  quickActionsRow: { flexDirection: 'row', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, gap: Spacing.sm },
  quickAction: { flex: 1, alignItems: 'center', backgroundColor: colors.cardBackground, borderRadius: BorderRadius.lg, paddingVertical: Spacing.md, gap: Spacing.sm, borderWidth: 1, borderColor: colors.border, ...Shadows.sm },
  quickActionIcon: { width: 44, height: 44, borderRadius: BorderRadius.md, justifyContent: 'center', alignItems: 'center' },
  quickActionLabel: { fontSize: Typography.fontSize.xs, fontWeight: '600', color: colors.textSecondary, textAlign: 'center' },
  // Did you know card
  factCard: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, backgroundColor: colors.cardBackground, borderRadius: BorderRadius.lg, marginHorizontal: Spacing.lg, marginBottom: Spacing.md, padding: Spacing.md, borderWidth: 1, borderColor: colors.border, ...Shadows.sm },
  factIconBox: { width: 52, height: 52, borderRadius: BorderRadius.md, justifyContent: 'center', alignItems: 'center' },
  factTitle: { fontSize: Typography.fontSize.xs, fontWeight: '700', color: colors.textTertiary, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 2 },
  factLabel: { fontSize: Typography.fontSize.sm, color: colors.textSecondary, marginBottom: 2 },
  factValue: { fontSize: Typography.fontSize.md, fontWeight: '800' },
  // Section header
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg, paddingBottom: Spacing.sm },
  sectionTitle: { fontSize: Typography.fontSize.md, fontWeight: '700', color: colors.text, flex: 1 },
  sectionSub: { fontSize: Typography.fontSize.xs, color: colors.textTertiary },
  // Trending searches
  trendingList: { paddingHorizontal: Spacing.lg, gap: Spacing.sm, paddingBottom: Spacing.sm },
  trendingChip: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, backgroundColor: colors.cardBackground, borderRadius: BorderRadius.lg, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderWidth: 1, borderColor: colors.border, minWidth: 160, ...Shadows.sm },
  trendingName: { fontSize: Typography.fontSize.sm, fontWeight: '600', color: colors.text, maxWidth: 150 },
  trendingCal: { fontSize: Typography.fontSize.xs, color: colors.textTertiary, marginTop: 1 },
  // Horizontal dish list
  horizontalList: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.sm },
  // Health tip
  tipCard: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md, backgroundColor: colors.cardBackground, borderRadius: BorderRadius.lg, marginHorizontal: Spacing.lg, marginTop: Spacing.lg, marginBottom: Spacing.sm, padding: Spacing.md, borderWidth: 1, borderColor: colors.primary + '40', ...Shadows.sm },
  tipIconBox: { width: 44, height: 44, borderRadius: BorderRadius.md, backgroundColor: colors.primary + '18', justifyContent: 'center', alignItems: 'center' },
  tipTitle: { fontSize: Typography.fontSize.xs, fontWeight: '700', color: colors.primary, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 4 },
  tipText: { fontSize: Typography.fontSize.sm, color: colors.textSecondary, lineHeight: 20 },
  // Calorie reference grid
  refGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: Spacing.lg, gap: Spacing.sm, marginBottom: Spacing.md },
  refItem: { width: '47%', backgroundColor: colors.cardBackground, borderRadius: BorderRadius.lg, padding: Spacing.md, alignItems: 'center', gap: 4, borderWidth: 1, borderColor: colors.border, ...Shadows.sm },
  refCal: { fontSize: Typography.fontSize.xl, fontWeight: '800', color: colors.text },
  refFood: { fontSize: Typography.fontSize.xs, color: colors.textSecondary, textAlign: 'center' },
  // Legacy (still used by CategoryHeader internally)
  cameraCard: { display: 'none' } as any,
  statsCard: { display: 'none' } as any,
  // Recipe Modal
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: colors.cardBackground,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '92%',
    overflow: 'hidden',
    // flex column so scroll shrinks and footer pins
    flexShrink: 1,
  },
  modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: 'center', marginTop: Spacing.md, marginBottom: Spacing.xs },
  modalScroll: { flexShrink: 1 },
  modalScrollContent: { paddingBottom: Spacing.md },
  modalHeroImage: {
    width: '100%',
    height: 200,
    marginBottom: Spacing.md,
  },
  modalHeader: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  modalTitle: { fontSize: Typography.fontSize.xl, fontWeight: '800', color: colors.text, marginBottom: Spacing.xs },
  modalDesc: { fontSize: Typography.fontSize.sm, color: colors.textSecondary, marginBottom: Spacing.md },
  macroBadgeRow: { flexDirection: 'row', gap: Spacing.sm, flexWrap: 'wrap' },
  macroBadge: { borderRadius: BorderRadius.md, paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs, alignItems: 'center', minWidth: 60 },
  macroBadgeVal: { fontSize: Typography.fontSize.md, fontWeight: '800' },
  macroBadgeLabel: { fontSize: Typography.fontSize.xs, color: colors.textTertiary, fontWeight: '600' },
  recipeMeta: { flexDirection: 'row', gap: Spacing.lg, paddingVertical: Spacing.md, paddingHorizontal: Spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.border },
  recipeMetaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  recipeMetaText: { fontSize: Typography.fontSize.sm, color: colors.textSecondary },
  recipeSection: { fontSize: Typography.fontSize.md, fontWeight: '700', color: colors.text, marginTop: Spacing.lg, marginBottom: Spacing.sm, paddingHorizontal: Spacing.lg },
  ingredientRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm, paddingVertical: 4, paddingHorizontal: Spacing.lg },
  ingredientDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.accent, marginTop: 7 },
  ingredientText: { flex: 1, fontSize: Typography.fontSize.sm, color: colors.textSecondary, lineHeight: 20 },
  stepRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md, paddingVertical: 6, paddingHorizontal: Spacing.lg },
  stepNumber: { width: 26, height: 26, borderRadius: 13, backgroundColor: colors.accent, justifyContent: 'center', alignItems: 'center', marginTop: 1 },
  stepNumberText: { fontSize: Typography.fontSize.xs, fontWeight: '800', color: '#FFF' },
  stepText: { flex: 1, fontSize: Typography.fontSize.sm, color: colors.textSecondary, lineHeight: 20 },
  noRecipeBox: { alignItems: 'center', paddingVertical: Spacing.xxl, gap: Spacing.sm, paddingHorizontal: Spacing.lg },
  noRecipeText: { fontSize: Typography.fontSize.sm, color: colors.textTertiary },
  modalFooter: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.cardBackground,
  },
  createLabelBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, backgroundColor: colors.accent, borderRadius: BorderRadius.lg, paddingVertical: Spacing.md },
  createLabelText: { fontSize: Typography.fontSize.base, fontWeight: '700', color: '#FFF' },
  });
}
