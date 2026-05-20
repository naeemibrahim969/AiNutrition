let userProfile = {};
let chatHistory = [];
let apiKey = '';
let conditions = [];

// ---- TAG MANAGEMENT ----

function handleTagKey(e, type) {
    if (e.key === 'Enter') { e.preventDefault(); addTag(type); }
}

function addTag(type) {
    const input = document.getElementById('condition-input');
    const val = input.value.trim();
    if (!val || conditions.includes(val)) { input.value = ''; return; }
    conditions.push(val);
    renderTags();
    input.value = '';
}

function renderTags() {
    const area = document.getElementById('conditions-tags');
    area.innerHTML = conditions
        .map((c, i) => '<span class="tag">' + c + '<span class="remove" onclick="removeTag(' + i + ')">×</span></span>')
        .join('');
}

function removeTag(i) {
    conditions.splice(i, 1);
    renderTags();
}

// ---- GOAL TOGGLE ----

function toggleGoal(btn) {
    btn.classList.toggle('active');
}

// ---- FIELD VALIDATION ----

const FIELD_RULES = {
    age: { min: 10, max: 110, label: 'Age', unit: 'years', integer: true },
    weight: { min: 30, max: 300, label: 'Weight', unit: 'kg', integer: false },
    height: { min: 100, max: 250, label: 'Height', unit: 'cm', integer: false },
};

function validateField(id) {
    const input = document.getElementById(id);
    const rule = FIELD_RULES[id];
    const errEl = document.getElementById(id + '-err');
    const val = input.value.trim();

    input.classList.remove('field-error', 'field-ok');
    if (errEl) errEl.textContent = '';

    if (val === '') {
        input.classList.add('field-error');
        if (errEl) errEl.textContent = rule.label + ' is required.';
        return false;
    }

    const num = parseFloat(val);
    if (isNaN(num)) {
        input.classList.add('field-error');
        if (errEl) errEl.textContent = 'Must be a number.';
        return false;
    }

    if (rule.integer && !Number.isInteger(num)) {
        input.classList.add('field-error');
        if (errEl) errEl.textContent = rule.label + ' must be a whole number.';
        return false;
    }

    if (num < rule.min || num > rule.max) {
        input.classList.add('field-error');
        if (errEl) errEl.textContent = rule.label + ' must be between ' + rule.min + ' and ' + rule.max + ' ' + rule.unit + '.';
        return false;
    }

    input.classList.add('field-ok');
    if (errEl) errEl.textContent = '';
    return true;
}

function attachLiveValidation() {
    ['age', 'weight', 'height'].forEach(id => {
        const input = document.getElementById(id);
        if (!input) return;
        input.addEventListener('blur', () => validateField(id));
        input.addEventListener('input', () => {
            if (input.value.trim() !== '') validateField(id);
        });
    });

    const apiInput = document.getElementById('api-key');
    if (apiInput) {
        apiInput.addEventListener('blur', () => {
            const val = apiInput.value.trim();
            const errEl = document.getElementById('apikey-err');
            if (val && !val.startsWith('sk-')) {
                apiInput.classList.add('field-error');
                if (errEl) errEl.textContent = 'API key must start with sk-';
            } else {
                apiInput.classList.remove('field-error');
                if (errEl) errEl.textContent = '';
            }
        });
    }
}

document.addEventListener('DOMContentLoaded', attachLiveValidation);

// ---- ONBOARDING → CHAT TRANSITION ----

function startChat() {
    const age = document.getElementById('age').value.trim();
    const weight = document.getElementById('weight').value.trim();
    const height = document.getElementById('height').value.trim();
    const gender = document.getElementById('gender').value;
    const activity = document.getElementById('activity').value;
    apiKey = document.getElementById('api-key').value.trim();

    // Run field-level validation first
    const ageOk = validateField('age');
    const weightOk = validateField('weight');
    const heightOk = validateField('height');

    const err = document.getElementById('onboard-error');

    if (!ageOk || !weightOk || !heightOk) {
        err.textContent = 'Please fix the errors above before continuing.';
        return;
    }

    if (!apiKey || !apiKey.startsWith('sk-')) {
        err.textContent = 'Please enter a valid OpenAI API key (starts with sk-).';
        document.getElementById('api-key').classList.add('field-error');
        return;
    }

    document.getElementById('api-key').classList.remove('field-error');
    err.textContent = '';

    const goals = Array.from(document.querySelectorAll('.goal-btn.active')).map(b => b.textContent.trim());

    userProfile = { biometrics: { age, weight, height, gender, activity }, conditions: [...conditions], goals };

    document.getElementById('onboarding').style.display = 'none';
    document.getElementById('chat-view').classList.add('active');
    document.getElementById('profile-summary').textContent = age + 'y · ' + weight + 'kg · ' + height + 'cm';

    buildPanel();
    showWelcome();
}

// ---- PROFILE PANEL ----

function buildPanel() {
    const b = userProfile.biometrics;
    let html =
        '<div class="panel-row"><span class="pk">Age</span><span class="pv">' + b.age + '</span></div>' +
        '<div class="panel-row"><span class="pk">Weight</span><span class="pv">' + b.weight + ' kg</span></div>' +
        '<div class="panel-row"><span class="pk">Height</span><span class="pv">' + b.height + ' cm</span></div>' +
        '<div class="panel-row"><span class="pk">Gender</span><span class="pv">' + (b.gender || '—') + '</span></div>' +
        '<div class="panel-row"><span class="pk">Activity</span><span class="pv">' + (b.activity ? b.activity.split('(')[0].trim() : '—') + '</span></div>';
    if (userProfile.conditions.length) {
        html += '<div style="margin-top:10px;font-size:0.75rem;color:var(--text-muted);margin-bottom:6px">CONDITIONS</div>';
        html += '<div class="panel-tags">' + userProfile.conditions.map(c => '<span class="panel-tag">' + c + '</span>').join('') + '</div>';
    }
    if (userProfile.goals.length) {
        html += '<div style="margin-top:10px;font-size:0.75rem;color:var(--text-muted);margin-bottom:6px">GOALS</div>';
        html += '<div class="panel-tags">' + userProfile.goals.map(g => '<span class="panel-tag">' + g + '</span>').join('') + '</div>';
    }
    document.getElementById('panel-content').innerHTML = html;
}

function togglePanel() {
    document.getElementById('profile-panel').classList.toggle('open');
}

document.addEventListener('click', e => {
    const panel = document.getElementById('profile-panel');
    const pill = document.querySelector('.profile-pill');
    if (panel.classList.contains('open') && !panel.contains(e.target) && !pill.contains(e.target)) {
        panel.classList.remove('open');
    }
});

// ---- CALORIE CALCULATOR ----

function calculateCalories() {
    const { age, weight, height, gender, activity } = userProfile.biometrics;
    const goals = userProfile.goals;
    const conds = userProfile.conditions;

    const a = parseFloat(age), w = parseFloat(weight), h = parseFloat(height);

    // Mifflin-St Jeor BMR
    let bmr = gender === 'Female'
        ? (10 * w + 6.25 * h - 5 * a - 161)
        : (10 * w + 6.25 * h - 5 * a + 5);

    // Activity multiplier
    const actMap = { 'Sedentary': 1.2, 'Lightly active': 1.375, 'Moderately active': 1.55, 'Very active': 1.725, 'Extremely active': 1.9 };
    let multiplier = 1.375;
    for (const key of Object.keys(actMap)) {
        if (activity && activity.startsWith(key)) { multiplier = actMap[key]; break; }
    }

    let tdee = Math.round(bmr * multiplier);

    // Goal adjustments
    let goalAdj = 0;
    let goalNote = 'Maintenance calories';
    const goalStr = goals.join(' ').toLowerCase();
    const condStr = conds.join(' ').toLowerCase();

    if (goalStr.includes('weight loss')) { goalAdj = -500; goalNote = '-500 kcal deficit for weight loss'; }
    else if (goalStr.includes('muscle gain')) { goalAdj = +300; goalNote = '+300 kcal surplus for muscle gain'; }
    else if (goalStr.includes('athletic')) { goalAdj = +200; goalNote = '+200 kcal surplus for performance'; }

    // Medical condition adjustments
    let condNote = '';
    if (condStr.includes('diabetes') || condStr.includes('blood sugar')) { condNote = 'Low-GI foods recommended · Limit refined carbs'; }
    else if (condStr.includes('hypertension') || condStr.includes('heart')) { condNote = 'Limit sodium · Prioritize unsaturated fats'; }
    else if (condStr.includes('thyroid') || condStr.includes('hypothyroid')) { goalAdj -= 100; condNote = 'Adjusted for thyroid condition · Monitor iodine intake'; }
    else if (condStr.includes('pcos')) { goalAdj -= 200; condNote = 'Adjusted for PCOS · Focus on low-GI, high-protein meals'; }
    else if (condStr.includes('celiac') || condStr.includes('gluten')) { condNote = 'Gluten-free diet required · Watch cross-contamination'; }

    const target = tdee + goalAdj;
    const protein = Math.round((target * 0.30) / 4);
    const carbs = Math.round((target * 0.40) / 4);
    const fat = Math.round((target * 0.30) / 9);

    return { bmr: Math.round(bmr), tdee, target, goalNote, condNote, protein, carbs, fat };
}

// ---- WELCOME MESSAGE ----

function showWelcome() {
    const msgs = document.getElementById('messages');
    const goalsStr = userProfile.goals.length ? userProfile.goals.join(', ') : 'General Wellness';
    const cal = calculateCalories();

    const condBlock = cal.condNote
        ? '<div class="cal-cond-note">⚕️ ' + cal.condNote + '</div>'
        : '';

    msgs.innerHTML =
        '<div class="welcome-card">' +
        '<h3>👋 Welcome to your Nutrition Analysis</h3>' +
        '<p>Profile loaded · Goals: <strong style="color:var(--accent)">' + goalsStr + '</strong></p>' +

        '<div class="calorie-box">' +
        '<div class="calorie-main">' +
        '<div class="cal-label">Daily Calorie Target</div>' +
        '<div class="cal-value">' + cal.target.toLocaleString() + '<span class="cal-unit"> kcal/day</span></div>' +
        '<div class="cal-note">' + cal.goalNote + '</div>' +
        '</div>' +
        '<div class="calorie-meta">' +
        '<div class="cal-meta-item"><span class="cal-meta-label">BMR</span><span class="cal-meta-val">' + cal.bmr.toLocaleString() + ' kcal</span></div>' +
        '<div class="cal-meta-item"><span class="cal-meta-label">TDEE</span><span class="cal-meta-val">' + cal.tdee.toLocaleString() + ' kcal</span></div>' +
        '</div>' +
        '<div class="macro-row">' +
        '<div class="macro-item protein"><span class="macro-val">' + cal.protein + 'g</span><span class="macro-lbl">Protein</span></div>' +
        '<div class="macro-item carbs"><span class="macro-val">' + cal.carbs + 'g</span><span class="macro-lbl">Carbs</span></div>' +
        '<div class="macro-item fat"><span class="macro-val">' + cal.fat + 'g</span><span class="macro-lbl">Fat</span></div>' +
        '</div>' +
        condBlock +
        '</div>' +

        '<p style="margin-top:12px;font-size:0.83rem;color:var(--text-muted)">Tell me about any meal or diet plan and I\'ll analyze it against your targets.</p>' +
        '<div class="suggestion-chips">' +
        '<span class="chip" onclick="useChip(this)">🍳 I had 3 eggs and toast for breakfast</span>' +
        '<span class="chip" onclick="useChip(this)">🥗 Analyze my lunch salad</span>' +
        '<span class="chip" onclick="useChip(this)">🍕 I ate medium pizza last night</span>' +
        '</div>' +
        '</div>';
}

function useChip(el) {
    document.getElementById('chat-input').value = el.textContent.trim();
    document.getElementById('chat-input').focus();
}

// ---- CHAT INPUT HELPERS ----

function handleChatKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
}

function autoResize(el) {
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 120) + 'px';
}

// ---- TOPIC GUARD ----

const NUTRITION_KEYWORDS = [
    'food', 'meal', 'eat', 'ate', 'drink', 'drank', 'snack', 'breakfast', 'lunch', 'dinner',
    'recipe', 'ingredient', 'cook', 'diet', 'nutrition', 'calorie', 'caloric',
    'protein', 'carb', 'fat', 'fiber', 'sugar', 'sodium', 'vitamin', 'mineral',
    'macro', 'micro', 'supplement', 'portion', 'serving', 'bmi',
    'glucose', 'insulin', 'cholesterol', 'blood sugar', 'health', 'healthy',
    'vegetable', 'fruit', 'meat', 'fish', 'chicken', 'beef', 'pork', 'egg',
    'dairy', 'milk', 'cheese', 'yogurt', 'bread', 'rice', 'pasta', 'grain',
    'salad', 'soup', 'smoothie', 'juice', 'hydrat',
    'pizza', 'burger', 'sandwich', 'sushi', 'coffee', 'tea',
    'lose weight', 'gain muscle', 'energy', 'fatigue', 'digest', 'gut',
    'allerg', 'intoleran', 'vegan', 'vegetarian', 'keto', 'paleo', 'gluten',
    'intermittent', 'fasting', 'detox', 'cleanse', 'meal plan', 'grocery',
    'diabetes', 'hypertension', 'thyroid', 'pcos', 'celiac', 'obesity',
    'analyze', 'analysis', 'review', 'track', 'log', 'recommend', 'suggest',
    'how much', 'how many', 'is it good', 'is it bad', 'should i eat', 'can i eat',
    'what should', 'what can i', 'will it'
];

// Phrase triggers — substring match (checked first, always wins)
const OFFTOPIC_PHRASE_TRIGGERS = [
    'build an app', 'make an app', 'create an app', 'develop an app',
    'build a app', 'make a app', 'create a app',
    'build me an app', 'make me an app', 'create me an app',
    'mobile app', 'web app', 'desktop app', 'diet app', 'fitness app', 'health app',
    'react native', 'app development', 'machine learning', 'artificial intelligence',
    'source code', 'open source', 'write code', 'write a code',
    'app developer', 'flutter app', 'make a diet app',
    'real estate', 'stock market', 'business idea',
    'dark web', 'how to hack', 'how to crack'
];

// Word triggers — whole-word match (avoids false hits like 'app' inside 'appetite')
const OFFTOPIC_WORD_TRIGGERS = [
    'flutter', 'kotlin', 'swift', 'android', 'ios', 'javascript', 'typescript',
    'python', 'java', 'html', 'css', 'php', 'ruby', 'golang', 'rust', 'dart',
    'blockchain', 'crypto', 'bitcoin', 'ethereum', 'nft',
    'forex', 'investing', 'finance', 'stocks',
    'movie', 'music', 'sport', 'politics', 'weather', 'travel', 'hotel', 'flight',
    'casino', 'betting', 'gambling', 'hacking',
    'cocaine', 'weed', 'porn', 'nude', 'sex',
    'gun', 'weapon', 'bomb', 'explosive'
];

function wordMatch(word, text) {
    return new RegExp('(?<![a-z])' + word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?![a-z])').test(text);
}

function isNutritionRelated(text) {
    const t = text.toLowerCase();

    // 1. Phrase triggers always win — checked before anything else
    if (OFFTOPIC_PHRASE_TRIGGERS.some(k => t.includes(k))) return false;

    // 2. Whole-word off-topic triggers
    if (OFFTOPIC_WORD_TRIGGERS.some(k => wordMatch(k, t))) return false;

    // 3. Very short follow-ups are fine (≤3 words: 'why?', 'yes', 'tell me more')
    if (t.trim().split(/\s+/).length <= 3) return true;

    // 4. Allow if any nutrition keyword present
    if (NUTRITION_KEYWORDS.some(k => t.includes(k))) return true;

    // 5. Block anything else with no nutrition context
    return false;
}

function getOffTopicReply(text) {
    const preview = text.split(' ').slice(0, 5).join(' ');
    return '<span style="font-size:1.1rem">🥦</span> I\'m a nutrition assistant and can\'t help with ' +
        '<strong>"' + preview + '..."</strong>.<br><br>' +
        'Ask me about <strong>meals, calories, macros, or your health goals</strong> instead!';
}

// ---- VAGUE FOOD DETECTION ----

// Generic food category words that need specification
const VAGUE_FOOD_WORDS = [
    'fruits', 'fruit', 'vegetables', 'veggies', 'veggie', 'vegetable',
    'nuts', 'seeds', 'grains', 'legumes', 'beans', 'lentils',
    'meat', 'seafood', 'fish', 'dairy', 'snacks', 'sweets',
    'dessert', 'juice', 'soup', 'salad', 'curry', 'bread',
    'cereals', 'leftovers', 'food', 'meal', 'something', 'stuff',
    'things', 'items', 'products', 'drinks', 'beverages'
];

// Words that indicate a quantity is present — if found, no need to ask
const QUANTITY_WORDS = [
    'gram', 'grams', 'g ', 'kg', 'ml', 'liter', 'litre', 'cup', 'cups',
    'piece', 'pieces', 'slice', 'slices', 'bowl', 'bowls', 'plate',
    'handful', 'spoon', 'tablespoon', 'teaspoon', 'medium', 'large', 'small',
    'half', 'quarter', 'serving', 'portion', 'bottle', 'glass',
    '100g', '200g', '250g', '500g', '1 cup', '2 cup',
    /\d+\s*g\b/, /\d+\s*ml\b/, /\d+\s*kg\b/,
    /\d+\s*(piece|slice|bowl|cup|plate|serving)/
];

// Specific food names — if present alongside vague word, it is specific enough
const SPECIFIC_FOODS = [
    'apple', 'banana', 'orange', 'mango', 'grape', 'strawberr', 'blueberr',
    'watermelon', 'pineapple', 'papaya', 'guava', 'kiwi', 'lemon', 'lime',
    'spinach', 'broccoli', 'carrot', 'tomato', 'cucumber', 'onion', 'garlic',
    'potato', 'sweet potato', 'corn', 'peas', 'lettuce', 'cabbage', 'cauliflower',
    'chicken', 'beef', 'pork', 'lamb', 'turkey', 'salmon', 'tuna', 'shrimp',
    'egg', 'milk', 'cheese', 'yogurt', 'butter', 'cream',
    'rice', 'pasta', 'bread', 'oats', 'quinoa', 'wheat',
    'almond', 'walnut', 'cashew', 'peanut', 'pistachio',
    'lentil', 'chickpea', 'kidney bean', 'black bean',
    'pizza', 'burger', 'sandwich', 'sushi', 'noodle', 'roti', 'chapati',
    'dal', 'biryani', 'curry', 'stew', 'soup', 'salad'
];

function hasQuantity(text) {
    const t = text.toLowerCase();
    return QUANTITY_WORDS.some(q => {
        if (q instanceof RegExp) return q.test(t);
        return t.includes(q);
    });
}

// Map each vague category to its specific members
const VAGUE_CATEGORY_MAP = {
    'fruits': ['apple', 'banana', 'orange', 'mango', 'grape', 'strawberr', 'blueberr', 'watermelon', 'pineapple', 'papaya', 'guava', 'kiwi', 'lemon', 'lime', 'peach', 'plum', 'cherry', 'fig', 'date', 'coconut'],
    'fruit': ['apple', 'banana', 'orange', 'mango', 'grape', 'strawberr', 'blueberr', 'watermelon', 'pineapple', 'papaya', 'guava', 'kiwi', 'lemon', 'lime', 'peach', 'plum', 'cherry'],
    'vegetables': ['spinach', 'broccoli', 'carrot', 'tomato', 'cucumber', 'onion', 'garlic', 'potato', 'sweet potato', 'corn', 'peas', 'lettuce', 'cabbage', 'cauliflower', 'zucchini', 'eggplant', 'celery', 'beet', 'radish', 'asparagus'],
    'vegetable': ['spinach', 'broccoli', 'carrot', 'tomato', 'cucumber', 'onion', 'garlic', 'potato', 'sweet potato', 'corn', 'peas', 'lettuce', 'cabbage', 'cauliflower'],
    'veggies': ['spinach', 'broccoli', 'carrot', 'tomato', 'cucumber', 'onion', 'garlic', 'potato', 'peas', 'lettuce', 'cabbage', 'cauliflower'],
    'veggie': ['spinach', 'broccoli', 'carrot', 'tomato', 'cucumber', 'onion', 'garlic', 'potato', 'peas'],
    'nuts': ['almond', 'walnut', 'cashew', 'peanut', 'pistachio', 'pecan', 'hazelnut', 'macadamia'],
    'seeds': ['chia', 'flax', 'sunflower seed', 'pumpkin seed', 'sesame'],
    'meat': ['chicken', 'beef', 'pork', 'lamb', 'turkey', 'duck', 'mutton', 'veal'],
    'seafood': ['salmon', 'tuna', 'shrimp', 'prawn', 'crab', 'lobster', 'cod', 'tilapia', 'sardine', 'mackerel'],
    'fish': ['salmon', 'tuna', 'cod', 'tilapia', 'sardine', 'mackerel', 'trout', 'catfish', 'herring'],
    'dairy': ['milk', 'cheese', 'yogurt', 'butter', 'cream', 'paneer', 'ghee', 'curd'],
    'grains': ['rice', 'pasta', 'bread', 'oats', 'quinoa', 'wheat', 'barley', 'millet', 'corn', 'rye'],
    'legumes': ['lentil', 'chickpea', 'kidney bean', 'black bean', 'soybean', 'pea', 'dal'],
    'beans': ['lentil', 'chickpea', 'kidney bean', 'black bean', 'soybean', 'rajma', 'dal'],
    'snacks': ['chips', 'crackers', 'popcorn', 'cookie', 'biscuit', 'granola', 'pretzel'],
    'sweets': ['chocolate', 'candy', 'cake', 'ice cream', 'brownie', 'donut', 'pastry'],
    'dessert': ['chocolate', 'cake', 'ice cream', 'brownie', 'donut', 'pastry', 'pudding', 'pie'],
    'juice': ['orange juice', 'apple juice', 'grape juice', 'mango juice', 'carrot juice'],
    'drinks': ['milk', 'juice', 'water', 'soda', 'tea', 'coffee', 'smoothie', 'shake'],
    'beverages': ['milk', 'juice', 'water', 'soda', 'tea', 'coffee', 'smoothie', 'shake'],
    'bread': ['white bread', 'whole wheat', 'sourdough', 'roti', 'chapati', 'pita', 'baguette'],
    'cereals': ['cornflakes', 'oatmeal', 'muesli', 'granola', 'wheat flakes'],
    'curry': ['chicken curry', 'vegetable curry', 'dal', 'butter chicken', 'paneer curry'],
    'soup': ['tomato soup', 'chicken soup', 'vegetable soup', 'lentil soup', 'minestrone'],
    'salad': ['caesar salad', 'greek salad', 'garden salad', 'coleslaw', 'pasta salad'],
    'food': ['apple', 'banana', 'chicken', 'rice', 'bread', 'egg', 'milk', 'pasta', 'potato'],
    'meal': ['apple', 'banana', 'chicken', 'rice', 'bread', 'egg', 'milk', 'pasta', 'potato'],
    'seafood': ['salmon', 'tuna', 'shrimp', 'prawn', 'crab'],
};

function getVagueFoods(text) {
    const t = text.toLowerCase();
    const found = [];

    VAGUE_FOOD_WORDS.forEach(word => {
        if (t.includes(word)) {
            const categorySpecifics = VAGUE_CATEGORY_MAP[word] || SPECIFIC_FOODS;
            const hasSpecific = categorySpecifics.some(sf => t.includes(sf));
            if (!hasSpecific) found.push(word);
        }
    });

    // De-duplicate: if both singular & plural matched (fruit/fruits), keep only plural
    const deduped = found.filter(w => {
        return !found.includes(w + 's') && !found.includes(w + 'ies');
    });

    return [...new Set(deduped)];
}

function isMealCalculationRequest(text) {
    const t = text.toLowerCase().trim();

    // Explicit meal/calculation triggers
    const mealTriggers = [
        'i ate', 'i eat', 'i had', 'i have', 'i consumed', 'i drank', 'i drink',
        'ate', 'eaten', 'had', 'consumed', 'calculate', 'analyze', 'analyse',
        'how many calories', 'how much calorie', 'calorie in', 'calories in',
        'nutritional value', 'nutrition of', 'meal was', 'breakfast was',
        'lunch was', 'dinner was', 'snack was', 'for breakfast', 'for lunch',
        'for dinner', 'for snack'
    ];
    if (mealTriggers.some(trigger => t.includes(trigger))) return true;

    // Also treat it as a meal request if the message is ONLY a food list
    // (comma-separated items, no question words, no verb needed)
    // e.g. "Fruits, vegetables, rice, milk"
    const hasCommaList = t.includes(',');
    const hasQuestionWord = /^(what|how|why|when|where|who|which|can|does|do|is|are|will)/.test(t);
    const hasVagueFoods = VAGUE_FOOD_WORDS.some(w => t.includes(w));
    const hasAnyFood = SPECIFIC_FOODS.some(w => t.includes(w)) || hasVagueFoods;

    if (hasCommaList && hasAnyFood && !hasQuestionWord) return true;

    // Single food word alone — e.g. just "fruits" or "rice and milk"
    const words = t.split(/[\s,]+/).filter(Boolean);
    const allFoodWords = words.every(w =>
        SPECIFIC_FOODS.some(f => f.startsWith(w) || w.startsWith(f)) ||
        VAGUE_FOOD_WORDS.includes(w) ||
        ['and', 'or', 'with', 'some', 'a', 'the', 'of'].includes(w)
    );
    if (allFoodWords && words.length >= 1 && hasAnyFood) return true;

    return false;
}

function buildClarificationReply(vagueFoods, originalText) {
    const listed = vagueFoods
        .map(f => '<strong>' + f.charAt(0).toUpperCase() + f.slice(1) + '</strong>')
        .join(' and ');

    // Per-category example and suggested replacement
    const exampleMap = {
        'fruits': { eg: '1 medium apple (182g), 2 bananas (240g), 1 cup grapes (150g)', replace: /fruits?/gi, with: '1 medium apple, 2 bananas' },
        'fruit': { eg: '1 medium apple (182g), 2 bananas (240g), 1 cup grapes (150g)', replace: /fruits?/gi, with: '1 medium apple, 2 bananas' },
        'vegetables': { eg: '1 cup spinach (30g), 2 medium carrots (120g), 1 bowl broccoli', replace: /vegetables?|veggies?/gi, with: '1 cup spinach, 2 medium carrots' },
        'vegetable': { eg: '1 cup spinach (30g), 2 medium carrots (120g)', replace: /vegetables?|veggies?/gi, with: '1 cup spinach, 2 medium carrots' },
        'veggies': { eg: '1 cup spinach (30g), 2 medium carrots (120g)', replace: /veggies?/gi, with: '1 cup spinach, 2 medium carrots' },
        'nuts': { eg: '20g almonds (~23 nuts), 10 cashews (14g), 1 handful walnuts', replace: /nuts/gi, with: '20g almonds, 10 cashews' },
        'meat': { eg: '150g grilled chicken breast, 100g beef steak', replace: /meat/gi, with: '150g chicken breast' },
        'fish': { eg: '150g salmon fillet, 1 medium tuna steak (130g)', replace: /fish/gi, with: '150g salmon fillet' },
        'seafood': { eg: '150g shrimp, 200g salmon fillet', replace: /seafood/gi, with: '150g shrimp' },
        'dairy': { eg: '1 cup milk (250ml), 30g cheddar cheese, 1 yogurt (150g)', replace: /dairy/gi, with: '250ml milk, 30g cheese' },
        'grains': { eg: '1 cup cooked rice (200g), 2 slices bread (60g)', replace: /grains?/gi, with: '1 cup cooked rice' },
        'beans': { eg: '1 cup cooked lentils (200g), half cup chickpeas (82g)', replace: /beans?|legumes?/gi, with: '1 cup cooked lentils' },
        'soup': { eg: '1 bowl tomato soup (300ml), 1 bowl lentil soup (350ml)', replace: /soup/gi, with: '1 bowl tomato soup (300ml)' },
        'salad': { eg: '2 cups mixed greens, 1 tomato, 50g feta, 1 tbsp olive oil', replace: /salad/gi, with: '2 cups mixed greens salad' },
        'snacks': { eg: '30g potato chips, 2 digestive biscuits (30g)', replace: /snacks?/gi, with: '30g chips' },
        'juice': { eg: '200ml orange juice, 1 glass apple juice (240ml)', replace: /juice/gi, with: '200ml orange juice' },
        'drinks': { eg: '1 glass milk (250ml), 200ml orange juice', replace: /drinks?|beverages?/gi, with: '250ml milk' },
        'beverages': { eg: '1 glass milk (250ml), 200ml orange juice', replace: /beverages?|drinks?/gi, with: '250ml milk' },
        'bread': { eg: '2 slices whole wheat bread (60g), 1 roti (35g)', replace: /bread/gi, with: '2 slices whole wheat bread' },
        'cereals': { eg: '1 cup cornflakes (30g) with 200ml milk', replace: /cereals?/gi, with: '1 cup cornflakes (30g)' },
        'dessert': { eg: '1 slice chocolate cake (80g), 1 scoop ice cream (60g)', replace: /desserts?|sweets?/gi, with: '1 slice cake (80g)' },
        'sweets': { eg: '2 pieces dark chocolate (20g), 3 hard candies (15g)', replace: /sweets?/gi, with: '20g dark chocolate' },
        'curry': { eg: '1 bowl chicken curry (300g) with 1 cup rice (200g)', replace: /curry/gi, with: '1 bowl chicken curry (300g)' },
    };

    // Build per-food example rows
    let exampleRows = '';
    vagueFoods.forEach(f => {
        const info = exampleMap[f];
        if (info) {
            exampleRows +=
                '<div style="margin:5px 0; padding:6px 10px; background:rgba(95,219,138,0.08); border-left:3px solid var(--accent2); border-radius:4px;">' +
                '<strong style="color:var(--accent)">' + f.charAt(0).toUpperCase() + f.slice(1) + '</strong> &rarr; ' +
                '<span style="color:var(--text-muted);font-size:0.88em">' + info.eg + '</span>' +
                '</div>';
        }
    });

    // Build suggested rewrite of the original message
    let suggested = originalText;
    vagueFoods.forEach(f => {
        const info = exampleMap[f];
        if (info) suggested = suggested.replace(info.replace, info.with);
    });

    // Inline click-to-use suggestion
    const tryLine = '<br><div style="margin-top:10px;font-size:0.85em;color:var(--text-muted)">Try something like:</div>' +
        '<span class="chip" style="margin-top:4px;display:inline-block;cursor:pointer" onclick="useChip(this)">' +
        '&#x270F; ' + suggested +
        '</span>';

    return '<strong>Please be more specific</strong> about ' + listed + ' to get accurate calorie counts.<br><br>' +
        '<div style="font-size:0.88em;color:var(--text-muted);margin-bottom:8px">Include the <strong style="color:var(--text)">food name</strong> and <strong style="color:var(--text)">quantity</strong> (grams / cups / pieces / ml)</div>' +
        exampleRows +
        tryLine;
}

// ---- SEND MESSAGE ----

async function sendMessage() {
    const input = document.getElementById('chat-input');
    const text = input.value.trim();
    if (!text) return;

    // Topic guard — block before any API call
    if (!isNutritionRelated(text)) {
        appendMsg('user', text);
        appendRawMsg('assistant', getOffTopicReply(text));
        input.value = '';
        input.style.height = 'auto';
        return;
    }

    // Vague food guard — ask for specifics before API call
    if (isMealCalculationRequest(text) && !hasQuantity(text)) {
        const vagueFoods = getVagueFoods(text);
        if (vagueFoods.length > 0) {
            appendMsg('user', text);
            appendRawMsg('assistant', buildClarificationReply(vagueFoods, text));
            input.value = '';
            input.style.height = 'auto';
            return;
        }
    }

    appendMsg('user', text);
    chatHistory.push({ role: 'user', content: text });
    input.value = '';
    input.style.height = 'auto';

    const sendBtn = document.getElementById('send-btn');
    sendBtn.disabled = true;
    const typingId = 'typing-' + Date.now();
    appendTyping(typingId);

    try {
        const res = await fetch('/api/analyze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ api_key: apiKey, profile: userProfile, message: text, history: chatHistory.slice(-10) }),
        });
        const data = await res.json();
        removeTyping(typingId);
        if (data.error) {
            appendMsg('assistant', '⚠️ ' + data.error);
        } else {
            appendMsg('assistant', data.reply);
            chatHistory.push({ role: 'assistant', content: data.reply });
        }
    } catch (e) {
        removeTyping(typingId);
        appendMsg('assistant', '⚠️ Connection error. Make sure the Flask server is running on port 5000.');
    }

    sendBtn.disabled = false;
    input.focus();
}

// ---- MESSAGE RENDERING ----

function appendMsg(role, text) {
    const msgs = document.getElementById('messages');
    const div = document.createElement('div');
    div.className = 'msg ' + role;
    const avatar = role === 'assistant' ? '🤖' : '👤';
    const body = role === 'assistant' ? formatMarkdown(text) : escapeHtml(text);

    if (role === 'assistant') {
        const msgId = 'msg-' + Date.now();
        div.innerHTML =
            '<div class="msg-avatar">' + avatar + '</div>' +
            '<div class="msg-col">' +
            '<div class="msg-bubble" id="' + msgId + '">' + body + '</div>' +
            '<button class="pdf-btn" onclick="downloadPDF(\'' + msgId + '\')" title="Download as PDF">' +
            '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">' +
            '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>' +
            '<polyline points="7 10 12 15 17 10"/>' +
            '<line x1="12" y1="15" x2="12" y2="3"/>' +
            '</svg>' +
            ' Download Summary PDF' +
            '</button>' +
            '</div>';
    } else {
        div.innerHTML = '<div class="msg-avatar">' + avatar + '</div><div class="msg-bubble">' + body + '</div>';
    }

    msgs.appendChild(div);
    msgs.scrollTop = msgs.scrollHeight;
}

function appendRawMsg(role, html) {
    const msgs = document.getElementById('messages');
    const div = document.createElement('div');
    div.className = 'msg ' + role;
    const avatar = role === 'assistant' ? '🤖' : '👤';
    div.innerHTML = '<div class="msg-avatar">' + avatar + '</div><div class="msg-bubble">' + html + '</div>';
    msgs.appendChild(div);
    msgs.scrollTop = msgs.scrollHeight;
}

function appendTyping(id) {
    const msgs = document.getElementById('messages');
    const div = document.createElement('div');
    div.className = 'msg assistant';
    div.id = id;
    div.innerHTML = '<div class="msg-avatar">🤖</div><div class="msg-bubble"><div class="typing"><span></span><span></span><span></span></div></div>';
    msgs.appendChild(div);
    msgs.scrollTop = msgs.scrollHeight;
}

function removeTyping(id) {
    const el = document.getElementById(id);
    if (el) el.remove();
}

// ---- PDF DOWNLOAD ----

function downloadPDF(msgId) {
    const btn = document.querySelector('[onclick="downloadPDF(\'' + msgId + '\')"]');
    if (btn) { btn.textContent = 'Generating...'; btn.disabled = true; }

    // Load jsPDF dynamically if not already loaded
    if (!window.jspdf) {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
        script.onload = () => generatePDF(msgId, btn);
        document.head.appendChild(script);
    } else {
        generatePDF(msgId, btn);
    }
}

function generatePDF(msgId, btn) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });

    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const margin = 14;
    const cW = pageW - margin * 2;
    let y = margin;

    // ── Colour palette (white-background, high-contrast) ──
    const C = {
        headerBg: [22, 101, 52],    // deep green header bar
        headerText: [255, 255, 255],  // white text on header
        accent: [21, 128, 61],    // medium green for section titles
        accentLight: [220, 252, 231],  // very light green for table header row
        accentDark: [22, 101, 52],    // dark green text on light header row
        rowOdd: [255, 255, 255],  // white
        rowEven: [243, 250, 245],  // barely-green tint
        cellText: [17, 24, 39],   // near-black for readability
        valueText: [21, 128, 61],    // green for numeric values (calories col)
        labelText: [55, 65, 81],   // dark-grey for first-col labels
        border: [186, 230, 206],  // light green border
        metaBg: [240, 253, 244],  // very light green for profile card bg
        metaBorder: [134, 239, 172],  // medium-light green border
        muted: [107, 114, 128],  // grey for small labels
        warning: [161, 98, 7],  // amber for medical notes
        warningBg: [254, 243, 199],  // light amber bg
        white: [255, 255, 255],
        pageText: [17, 24, 39],
    };

    const now = new Date();

    // ── helpers ───────────────────────────────────────────
    const newPage = () => {
        doc.addPage();
        doc.setFillColor(...C.headerBg);
        doc.rect(0, 0, pageW, 10, 'F');
        doc.setTextColor(...C.headerText);
        doc.setFontSize(7); doc.setFont('helvetica', 'bold');
        doc.text('NutriAI · Nutrition Analysis Report', margin, 7);
        doc.setTextColor(...C.muted);
        doc.setFont('helvetica', 'normal');
        doc.text('Continued', pageW - margin, 7, { align: 'right' });
        doc.setFillColor(...C.white); doc.rect(0, 10, pageW, pageH - 10, 'F');
        y = 20;
    };
    const checkY = (need) => { if (y + need > pageH - 16) newPage(); };
    const hline = (yy, clr = C.border, w = 0.4) => {
        doc.setDrawColor(...clr); doc.setLineWidth(w);
        doc.line(margin, yy, pageW - margin, yy);
    };
    const sectionTitle = (text) => {
        checkY(12);
        doc.setFillColor(...C.accentLight);
        doc.roundedRect(margin, y - 1, cW, 8, 1, 1, 'F');
        doc.setTextColor(...C.accentDark);
        doc.setFontSize(8.5); doc.setFont('helvetica', 'bold');
        doc.text(text, margin + 3, y + 5);
        y += 11;
    };

    // ── WHITE PAGE BACKGROUND ─────────────────────────────
    doc.setFillColor(...C.white);
    doc.rect(0, 0, pageW, pageH, 'F');

    // ── HEADER BAR ────────────────────────────────────────
    doc.setFillColor(...C.headerBg);
    doc.rect(0, 0, pageW, 28, 'F');

    doc.setTextColor(...C.headerText);
    doc.setFontSize(20); doc.setFont('helvetica', 'bold');
    doc.text('NutriAI', margin, 18);

    doc.setFontSize(9); doc.setFont('helvetica', 'normal');
    doc.text('Nutrition Analysis Report', margin + 38, 18);

    doc.setFontSize(8);
    const dateStr = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
        + '  ' + now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    doc.text(dateStr, pageW - margin, 18, { align: 'right' });

    y = 36;

    // ── PROFILE CARD ──────────────────────────────────────
    if (userProfile && userProfile.biometrics) {
        const b = userProfile.biometrics;
        const cal = calculateCalories();

        // Card border
        doc.setFillColor(...C.metaBg);
        doc.roundedRect(margin, y, cW, 32, 3, 3, 'F');
        doc.setDrawColor(...C.metaBorder); doc.setLineWidth(0.5);
        doc.roundedRect(margin, y, cW, 32, 3, 3, 'S');

        // Profile columns
        const pcols = [
            { label: 'AGE', val: b.age + ' yrs' },
            { label: 'WEIGHT', val: b.weight + ' kg' },
            { label: 'HEIGHT', val: b.height + ' cm' },
            { label: 'GENDER', val: b.gender || '—' },
            { label: 'ACTIVITY', val: b.activity ? b.activity.split('(')[0].trim() : '—' },
        ];
        const pcW = cW / pcols.length;
        pcols.forEach((col, i) => {
            const cx = margin + pcW * i + pcW / 2;
            // Vertical divider
            if (i > 0) {
                doc.setDrawColor(...C.metaBorder); doc.setLineWidth(0.3);
                doc.line(margin + pcW * i, y + 5, margin + pcW * i, y + 28);
            }
            doc.setTextColor(...C.muted);
            doc.setFontSize(6.5); doc.setFont('helvetica', 'bold');
            doc.text(col.label, cx, y + 12, { align: 'center' });

            doc.setTextColor(...C.accentDark);
            doc.setFontSize(10); doc.setFont('helvetica', 'bold');
            doc.text(col.val, cx, y + 24, { align: 'center' });
        });

        y += 38;

        // Goals & medical note row
        if (userProfile.goals.length || cal.condNote) {
            if (userProfile.goals.length) {
                // Strip emojis — jsPDF built-in fonts cannot render them
                const cleanGoals = userProfile.goals
                    .map(g => g.replace(/[^\x20-\x7E]/g, '').trim())
                    .filter(g => g.length > 0)
                    .join('  |  ');

                doc.setFontSize(7.5); doc.setFont('helvetica', 'bold');
                doc.setTextColor(...C.accentDark);
                doc.text('Goals:', margin, y);
                doc.setFont('helvetica', 'normal');
                doc.setTextColor(...C.cellText);
                const gText = doc.splitTextToSize(cleanGoals, cW - 18);
                gText.forEach((gl, gi) => {
                    doc.text(gl, margin + 16, y + gi * 5);
                });
                y += gText.length * 5 + 4;
            }
            if (cal.condNote) {
                doc.setFillColor(...C.warningBg);
                doc.roundedRect(margin, y, cW, 9, 2, 2, 'F');
                doc.setDrawColor(...[253, 211, 77]); doc.setLineWidth(0.4);
                doc.roundedRect(margin, y, cW, 9, 2, 2, 'S');
                doc.setTextColor(...C.warning);
                doc.setFontSize(7.5); doc.setFont('helvetica', 'bold');
                doc.text('⚕ Medical Note:', margin + 3, y + 6);
                doc.setFont('helvetica', 'normal');
                doc.text(cal.condNote, margin + 30, y + 6);
                y += 13;
            }
        }

        y += 4;
        hline(y, C.metaBorder, 0.5); y += 8;

        // ── DAILY TARGETS TABLE ───────────────────────────
        sectionTitle('Daily Calorie & Macro Targets');

        const tRows = [
            ['Metric', 'Value', 'How it is calculated'],
            ['Basal Metabolic Rate', cal.bmr.toLocaleString() + ' kcal', 'Mifflin-St Jeor: 10W + 6.25H - 5A ± 5'],
            ['TDEE', cal.tdee.toLocaleString() + ' kcal', 'BMR × activity level multiplier'],
            ['Goal Adjustment', (cal.goalNote || '').replace(/[^\x20-\x7E]/g, '-'), 'Applied based on your selected goals'],
            ['Daily Calorie Target', cal.target.toLocaleString() + ' kcal', 'TDEE + goal adjustment'],
            ['Protein', cal.protein + 'g  (' + Math.round(cal.protein * 4) + ' kcal)', '30% of daily calories ÷ 4 kcal/g'],
            ['Carbohydrates', cal.carbs + 'g  (' + Math.round(cal.carbs * 4) + ' kcal)', '40% of daily calories ÷ 4 kcal/g'],
            ['Fat', cal.fat + 'g  (' + Math.round(cal.fat * 9) + ' kcal)', '30% of daily calories ÷ 9 kcal/g'],
        ];
        y = drawTable(doc, margin, y, cW, tRows, [60, 48, cW - 108], C);
        y += 8;
    }

    // ── PARSE RESPONSE ────────────────────────────────────
    const bubble = document.getElementById(msgId);
    const rawText = bubble ? bubble.innerText : '';
    const lines = rawText.split('\n').map(l => l.trim()).filter(l => l !== '');

    const nutritionRows = [];
    const textLines = [];

    lines.forEach(line => {
        const numHead = line.match(/^(\d+)\.\s+(.+)/);
        const isBullet = line.match(/^[-•]\s+(.+)/);
        const hasNumber = /\d+(?:[.,]\d+)?\s*(?:kcal|cal|calories?|g|mg|%)/i.test(line);

        if (hasNumber) {
            const parsed = parseNutritionLine(line);
            if (parsed) {
                const prefix = numHead ? numHead[1] + '. ' : (isBullet ? '• ' : '');
                nutritionRows.push([prefix + parsed.name, parsed.calories, parsed.protein, parsed.carbs, parsed.fat]);
            } else {
                textLines.push({ type: numHead ? 'heading' : (isBullet ? 'bullet' : 'text'), text: line });
            }
        } else {
            textLines.push({ type: numHead ? 'heading' : (isBullet ? 'bullet' : 'text'), text: line });
        }
    });

    // ── helper: strip non-printable / non-ASCII chars safe for Helvetica
    const safe = (str) => String(str == null ? '' : str).replace(/[^\x20-\x7E]/g, '').trim();

    // ── Sanitise all nutrition rows ────────────────────────
    const safeNutRows = nutritionRows
        .map(row => row.map(cell => safe(cell)))
        .filter(row => {
            // Drop row if all value cells (cols 1-4) are '-' or empty — no real data
            const vals = row.slice(1);
            return vals.some(v => v && v !== '-' && v !== '');
        });

    // ── NUTRITION BREAKDOWN TABLE — only if real data exists ──
    if (safeNutRows.length > 0) {
        checkY(20);
        sectionTitle('Nutritional Breakdown from AI Response');
        const nHeaders = [['Food / Item', 'Calories', 'Protein', 'Carbs', 'Fat']];
        y = drawTable(doc, margin, y, cW, nHeaders.concat(safeNutRows), [60, 32, 30, 30, cW - 152], C);
        y += 8;
    } else {
        // Fallback: look for "Label: 123 kcal" style pairs
        const fallback = [['Metric', 'Value']];
        let fm;
        const frx = /([A-Za-z][A-Za-z\s]{2,25}?):\s*(\d+(?:[.,]\d+)?\s*(?:kcal|cal|g|mg|%|calories?))/gi;
        while ((fm = frx.exec(rawText)) !== null) {
            const label = safe(fm[1]);
            const val = safe(fm[2]);
            if (label && val) fallback.push([label, val]);
        }

        if (fallback.length > 1) {
            checkY(20);
            sectionTitle('Nutritional Data');
            y = drawTable(doc, margin, y, cW, fallback, [cW * 0.55, cW * 0.45], C);
            y += 8;
        }
        // If still no data — skip section entirely, no placeholder text shown
    }

    // ── ANALYSIS SUMMARY — only if meaningful text lines exist ──
    const meaningfulLines = textLines.filter(item => {
        const t = safe(item.text);
        // Skip lines that are just dashes, numbers alone, or very short noise
        return t.length > 4 && !/^[-\s\d.]+$/.test(t);
    });

    if (meaningfulLines.length > 0) {
        checkY(16);
        sectionTitle('Analysis & Recommendations');
        meaningfulLines.forEach(item => {
            const isHead = item.type === 'heading';
            const isBull = item.type === 'bullet';
            const cleanTxt = safe(item.text);
            const prefix = isBull ? '  ' : '';
            const wrapped = doc.splitTextToSize(prefix + cleanTxt, cW - (isBull ? 5 : 0));
            checkY(wrapped.length * 5.5 + 3);

            if (isHead) {
                y += 2;
                doc.setFont('helvetica', 'bold'); doc.setTextColor(...C.accentDark); doc.setFontSize(8.5);
            } else {
                doc.setFont('helvetica', 'normal'); doc.setTextColor(...C.cellText); doc.setFontSize(8);
            }
            wrapped.forEach(wl => {
                doc.text(wl, margin + (isBull ? 4 : 0), y);
                y += 5.2;
            });
            if (isHead) y += 1;
        });
    }

    // ── FOOTER ────────────────────────────────────────────
    const total = doc.internal.getNumberOfPages();
    for (let i = 1; i <= total; i++) {
        doc.setPage(i);
        doc.setFillColor(...C.headerBg);
        doc.rect(0, pageH - 10, pageW, 10, 'F');
        doc.setTextColor(...C.headerText); doc.setFontSize(6.5); doc.setFont('helvetica', 'normal');
        doc.text('NutriAI · AI-powered Nutrition Analysis · Not a substitute for professional medical advice', margin, pageH - 4);
        doc.text('Page ' + i + ' of ' + total, pageW - margin, pageH - 4, { align: 'right' });
    }

    const filename = 'NutriAI-Report-' + now.toISOString().slice(0, 10) + '.pdf';
    doc.save(filename);

    if (btn) {
        btn.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> Download Summary PDF';
        btn.disabled = false;
    }
}


// ── TABLE DRAW HELPER ─────────────────────────────────────────
function drawTable(doc, x, y, totalW, rows, colWidths, C) {
    const lineH = 4.8;   // mm per text line
    const padV = 3.5;   // vertical padding inside cell (top + bottom combined)
    const padH = 2.5;   // horizontal padding inside cell

    rows.forEach((row, ri) => {
        const isHeader = ri === 0;

        // ── Set font per row so splitTextToSize measures correctly ──
        const setupFont = (ci) => {
            if (isHeader) {
                doc.setFontSize(7.5); doc.setFont('helvetica', 'bold');
            } else if (ci === 0) {
                doc.setFontSize(7.5); doc.setFont('helvetica', 'normal');
            } else if (ci === 1) {
                doc.setFontSize(8); doc.setFont('helvetica', 'bold');
            } else {
                doc.setFontSize(7.5); doc.setFont('helvetica', 'normal');
            }
        };

        // ── Calculate dynamic row height based on worst-case cell ──
        let maxLines = 1;
        row.forEach((cell, ci) => {
            setupFont(ci);
            const cw = colWidths[ci] || 30;
            const lines = doc.splitTextToSize(String(cell == null ? '' : cell), cw - padH * 2);
            if (lines.length > maxLines) maxLines = lines.length;
        });
        const rowH = maxLines * lineH + padV * 2;

        // ── Draw row background ──
        doc.setFillColor(...(isHeader ? C.accentLight : (ri % 2 === 0 ? C.rowOdd : C.rowEven)));
        doc.rect(x, y, totalW, rowH, 'F');

        // ── Draw row outer border ──
        doc.setDrawColor(...C.border); doc.setLineWidth(0.25);
        doc.rect(x, y, totalW, rowH, 'S');

        // ── Draw cells ──
        let cx = x;
        row.forEach((cell, ci) => {
            const cw = colWidths[ci] || 30;
            const cellStr = String(cell == null ? '' : cell);

            setupFont(ci);

            // Text colour
            if (isHeader) {
                doc.setTextColor(...C.accentDark);
            } else if (ci === 0) {
                doc.setTextColor(...C.labelText);
            } else if (ci === 1) {
                doc.setTextColor(...C.accentDark);
            } else {
                doc.setTextColor(...C.cellText);
            }

            const maxW = cw - padH * 2;
            const lines = doc.splitTextToSize(cellStr, maxW);

            // Total text block height
            const blockH = lines.length * lineH;
            // Vertically center the text block within the row
            const startY = y + (rowH - blockH) / 2 + lineH * 0.75;

            lines.forEach((ln, li) => {
                doc.text(ln, cx + padH, startY + li * lineH);
            });

            // Vertical cell divider
            doc.setDrawColor(...C.border); doc.setLineWidth(0.2);
            doc.line(cx + cw, y, cx + cw, y + rowH);

            cx += cw;
        });

        y += rowH;
    });

    return y;
}

// ── PARSE NUTRITION FROM A LINE ───────────────────────────────
function parseNutritionLine(line) {
    const calMatch = line.match(/(\d+(?:[.,]\d+)?)\s*(?:kcal|cal|calories?)/i);
    const protMatch = line.match(/(\d+(?:[.,]\d+)?)\s*g?\s*protein/i);
    const carbMatch = line.match(/(\d+(?:[.,]\d+)?)\s*g?\s*carb/i);
    const fatMatch = line.match(/(\d+(?:[.,]\d+)?)\s*g?\s*fat/i);

    if (!calMatch && !protMatch && !carbMatch && !fatMatch) return null;

    // Clean the name: remove all numeric+unit patterns to get food name
    let name = line
        .replace(/\d+(?:[.,]\d+)?\s*(?:kcal|cal|calories?|g|mg|%)/gi, '')
        .replace(/[-•:,()[\]]/g, ' ')
        .replace(/\s{2,}/g, ' ')
        .trim()
        .slice(0, 40);

    return {
        name: name || 'Item',
        calories: calMatch ? calMatch[1] + ' kcal' : '-',
        protein: protMatch ? protMatch[1] + 'g' : '-',
        carbs: carbMatch ? carbMatch[1] + 'g' : '-',
        fat: fatMatch ? fatMatch[1] + 'g' : '-',
        notes: '',
    };
}


// ---- UTILITIES ----

function escapeHtml(text) {
    return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function formatMarkdown(text) {
    let html = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    // Bold and italic
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\*(.+?)\*/g, '<em>$1</em>');

    // Headings
    html = html.replace(/^### (.+)$/gm, '<p><strong>$1</strong></p>').replace(/^## (.+)$/gm, '<p><strong>$1</strong></p>');

    // Numbered list: newline before, double-bold
    html = html.replace(/^(\d+)\.\s+(.+)$/gm, function (_, num, content) {
        return '<br><strong><b>' + num + '. ' + content + '</b></strong>';
    });

    // Bullet list
    html = html.replace(/((?:^- .+$\n?)+)/gm, function (block) {
        const items = block.trim().split('\n').map(function (line) {
            return '<li>' + line.replace(/^- /, '') + '</li>';
        }).join('');
        return '<ul>' + items + '</ul>';
    });

    // Paragraphs and line breaks
    html = html.replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br>');

    return '<p>' + html + '</p>';
}