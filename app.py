"""
NutriAI Flask Application

This app serves a frontend UI and provides an API endpoint to analyze
user dietary input using OpenAI. It personalizes responses based on
user biometrics, goals, and medical conditions.
"""

from flask import Flask, request, jsonify, send_from_directory
from openai import OpenAI

app = Flask(__name__, static_folder='static')

# Initialize OpenAI client - API key passed per request or via env
def get_client(api_key):
    """
    Initialize and return an OpenAI client using the provided API key.
    """
    return OpenAI(api_key=api_key)

@app.route('/')
def index():
    """
    Entry point (index.html).
    """
    return send_from_directory('static', 'index.html')

@app.route('/api/analyze', methods=['POST'])
def analyze():
    """
    Analyze user dietary input using OpenAI and return personalized feedback.
    """
    data = request.json
    api_key = data.get('api_key', '').strip()
    if not api_key:
        return jsonify({'error': 'OpenAI API key is required'}), 400

    profile = data.get('profile', {})
    message = data.get('message', '')
    history = data.get('history', [])

    if not message:
        return jsonify({'error': 'Message is required'}), 400

    # Build system prompt from user profile
    system_prompt = build_system_prompt(profile)

    # Build messages array
    messages = [{"role": "system", "content": system_prompt}]
    for h in history:
        messages.append({"role": h['role'], "content": h['content']})
    messages.append({"role": "user", "content": message})

    try:
        client = get_client(api_key)
        response = client.chat.completions.create(
            model="gpt-4.1-mini",
            messages=messages,
            max_tokens=1000,
            temperature=0.7
        )
        reply = response.choices[0].message.content
        return jsonify({'reply': reply})
    except Exception as e:
        err = str(e)
        if 'api_key' in err.lower() or 'authentication' in err.lower() or 'invalid' in err.lower():
            return jsonify({'error': 'Invalid API key. Please check your OpenAI API key.'}), 401
        return jsonify({'error': f'OpenAI error: {err}'}), 500

def build_system_prompt(profile):
    """
    Construct a system prompt based on user profile data.
    """
    biometrics  = profile.get('biometrics', {})
    conditions  = profile.get('conditions', [])
    goals       = profile.get('goals', [])
 
    age      = biometrics.get('age',      'unknown')
    gender   = biometrics.get('gender',   'unknown')
    weight   = biometrics.get('weight',   'unknown')
    height   = biometrics.get('height',   'unknown')
    activity = biometrics.get('activity', 'moderately active')
 
    conditions_str = ', '.join(conditions) if conditions else 'none'
    goals_str      = ', '.join(goals)      if goals      else 'general health'
 
    # Calculate BMI
    bmi_info = ""
    try:
        w_kg  = float(weight)
        h_m   = float(height) / 100
        bmi   = w_kg / (h_m ** 2)
        bmi_info = f"{bmi:.1f}"
    except Exception:
        bmi_info = "unknown"
 
    return f"""
You are NutriAI, an expert AI nutritionist.
 
USER PROFILE:
- Age:        {age}
- Gender:     {gender}
- Weight:     {weight} kg
- Height:     {height} cm
- Activity:   {activity}
- BMI:        {bmi_info}
- Conditions: {conditions_str}
- Goals:      {goals_str}

If the user's message is NOT about food, nutrition, diet, meals, or health:
Respond ONLY with:
"That topic is outside my scope. I'm here to help with nutrition, food choices, meal analysis, and diet planning.
Tell me: What did you eat today?"
Do NOT continue to Step 2 or Step 3.

If the user mentioned food but WITHOUT enough quantity/detail to calculate calories
(e.g. "I ate fruits and vegetables", "I had rice and milk"):
Respond ONLY with a clarification request. Example:
"To calculate accurate calories, please specify:
- Exact food names (e.g. apple, spinach, brown rice)
- Quantities (grams, cups, pieces, ml)
 
Example: 1 medium apple (182g), 1 cup cooked brown rice (200g), 250ml whole milk"
Do NOT guess or assume quantities. Do NOT continue to Step 3.
 

Only reach here if the user provided specific food with quantities.
Start response with: Nutritional Analysis of the Meal
 
Use this structure:
1. Health Assessment
2. Nutritional Breakdown
   - Calories, Carbohydrates, Proteins, Fats
   - Vitamins, Minerals, Fiber, Water
3. Benefits
4. Concerns
5. Missing Nutrients
6. Recommendations
7. Personalized Advice
8. Calories Remaining for the Day
   - Decide if this was breakfast / lunch / dinner / snack based on context
   - Show how many calories remain from the user's daily target
 
RULES:
- Be evidence-based and concise
- Never make a medical diagnosis
- Mention sodium/sugar risks when relevant
- Consider medical conditions seriously
  (diabetes → glycemic index, hypertension → sodium)
- Tailor macros to activity level, weight, and goals
- Use bullet points for lists
- End with a short motivational tip
- All numbers must be realistic and specific (no ranges like 200-300, pick one)
"""

if __name__ == '__main__':
    app.run(debug=True, port=5000)
