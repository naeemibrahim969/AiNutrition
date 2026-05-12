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

// ---- ONBOARDING → CHAT TRANSITION ----

function startChat() {
    const age = document.getElementById('age').value;
    const weight = document.getElementById('weight').value;
    const height = document.getElementById('height').value;
    const gender = document.getElementById('gender').value;
    const activity = document.getElementById('activity').value;
    apiKey = document.getElementById('api-key').value.trim();

    const err = document.getElementById('onboard-error');
    if (!age || !weight || !height) { err.textContent = 'Please fill in your age, weight, and height.'; return; }
    if (!apiKey || !apiKey.startsWith('sk-')) { err.textContent = 'Please enter a valid OpenAI API key (starts with sk-).'; return; }
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

    if (goalStr.includes('weight loss')) { goalAdj = -500; goalNote = '−500 kcal deficit for weight loss'; }
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
        '<span class="chip" onclick="useChip(this)">🍳 I had eggs and toast for breakfast</span>' +
        '<span class="chip" onclick="useChip(this)">🥗 Analyze my lunch salad</span>' +
        '<span class="chip" onclick="useChip(this)">🍕 I ate pizza last night</span>' +
        '<span class="chip" onclick="useChip(this)">📋 Review my daily meal plan</span>' +
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
    // food items & meals
    'food', 'meal', 'eat', 'ate', 'drink', 'drank', 'snack', 'breakfast', 'lunch', 'dinner',
    'recipe', 'ingredient', 'cook', 'diet', 'nutrition', 'calorie', 'caloric',
    'protein', 'carb', 'fat', 'fiber', 'sugar', 'sodium', 'vitamin', 'mineral',
    'macro', 'micro', 'supplement', 'portion', 'serving', 'bmi',
    'glucose', 'insulin', 'cholesterol', 'blood sugar', 'health', 'healthy',
    'vegetable', 'fruit', 'meat', 'fish', 'chicken', 'beef', 'pork', 'egg',
    'dairy', 'milk', 'cheese', 'yogurt', 'bread', 'rice', 'pasta', 'grain',
    'salad', 'soup', 'smoothie', 'juice', 'hydrat',
    'pizza', 'burger', 'sandwich', 'sushi', 'coffee', 'tea',
    // goals & conditions
    'lose weight', 'gain muscle', 'energy', 'fatigue', 'digest', 'gut',
    'allerg', 'intoleran', 'vegan', 'vegetarian', 'keto', 'paleo', 'gluten',
    'intermittent', 'fasting', 'detox', 'cleanse', 'meal plan', 'grocery',
    'diabetes', 'hypertension', 'thyroid', 'pcos', 'celiac', 'obesity',
    // analysis intent
    'analyze', 'analysis', 'review', 'track', 'log', 'recommend', 'suggest',
    'how much', 'how many', 'is it good', 'is it bad', 'should i eat', 'can i eat',
    'what should', 'what can i', 'will it'
];
const OFFTOPIC_TRIGGERS = [

    'flutter', 'react native', 'react', 'swift', 'kotlin', 'android', 'ios', 'app development', 'coding', 'programming', 'software', 'framework', 'database', 'api', 'backend', 'frontend', 'javascript', 'python', 'java', 'c++', 'html', 'css', 'bug', 'debug',
    'machine learning', 'artificial intelligence', 'blockchain', 'crypto', 'bitcoin', 'stock', 'stocks', 'invest', 'investment', 'finance', 'money', 'trading', 'forex', 'profit', 'business idea', 'car', 'bike', 'iphone', 'samsung', 'laptop', 'electronics', 'politic', 'politics', 'news',
    'election', 'government', 'president', 'war', 'game', 'sport', 'sports', 'movie', 'movies', 'film', 'music', 'song', 'songs', 'rapper', 'actor', 'celebrity', 'tv show', 'series', 'netflix',
    'casino', 'betting', 'gambling', 'hack', 'hacking', 'crack', 'illegal', 'dark web', 'gun', 'weapon', 'bomb', 'explosive', 'drugs', 'cocaine', 'weed', 'weather', 'travel', 'hotel', 'flight',
    'vacation', 'visa', 'tourism', 'sex', 'porn', 'adult', 'nude',
    'make an app', 'mobile app', 'flutter app', 'app developer', 'make a diet app', 'diet app'
];

function isNutritionRelated(text) {
    const t = text.toLowerCase();
    // Off-topic check ALWAYS runs first, even for short messages
    if (OFFTOPIC_TRIGGERS.some(k => t.includes(k))) return false;

    // Very short follow-ups are fine (e.g. 'why?', 'tell me more', 'yes')
    if (t.trim().split(/\s+/).length <= 3) return true;

    // Allow if any nutrition keyword present
    if (NUTRITION_KEYWORDS.some(k => t.includes(k))) return true;

    // Block anything else that is long and has no nutrition context
    return false;
}

function getOffTopicReply(text) {
    const preview = text.split(' ').slice(0, 5).join(' ');
    const t = text.toLowerCase();
    if (OFFTOPIC_TRIGGERS.some(k => t.includes(k))) {
        return '<span style="font-size:1.1rem">🥦</span> I\'m a nutrition assistant and can\'t help with <strong>"' + preview + '..."</strong>.<br><br>Ask me about <strong>meals, calories, macros, or your health goals</strong> instead!';
    }
    return '<span style="font-size:1.1rem">🥦</span> That topic is outside my scope. I\'m here to help with <strong>nutrition, food choices, meal analysis, and diet planning</strong>.<br><br>What did you eat today?';
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
    div.innerHTML = '<div class="msg-avatar">' + avatar + '</div><div class="msg-bubble">' + body + '</div>';
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