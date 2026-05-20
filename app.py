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
    biometrics = profile.get('biometrics', {})
    conditions = profile.get('conditions', [])
    goals = profile.get('goals', [])

    age = biometrics.get('age', 'unknown')
    gender = biometrics.get('gender', 'unknown')
    weight = biometrics.get('weight', 'unknown')
    height = biometrics.get('height', 'unknown')
    activity = biometrics.get('activity', 'moderately active')

    conditions_str = ', '.join(conditions) if conditions else 'none'
    goals_str = ', '.join(goals) if goals else 'general health'

    # Calculate rough BMI
    bmi_info = ""
    try:
        w_kg = float(weight)
        h_cm = float(height)
        h_m = h_cm / 100
        bmi = w_kg / (h_m ** 2)
        bmi_info = f"BMI: {bmi:.1f}"
    except:
        pass

    return f"""

You are NutriAI, an expert AI nutritionist. 

USER PROFILE:

Age: {age}
Gender: {gender}
Weight: {weight}kg
Height: {height}cm
Activity: {activity}
BMI: {bmi_info}
Conditions: {conditions_str}
Goals: {goals_str}

TASK:

Analyze meals personalized to this user.

RESPONSE FORMAT:

1. Health Assessment

2. Nutritional Breakdown

3. Benefits

4. Concerns

5. Missing Nutrients

6. Recommendations

7. Personalized Advice

RULES:

- Be evidence-based

- Be concise but informative

- Avoid medical diagnosis

- Mention sodium/sugar risks when relevant

- Consider medical conditions carefully

- Encourage healthier alternatives

- Nutritional Breakdown should tell Carbohydrates, Proteins, Fats, Vitamins, Minerals, Fiber, Water



Consider their medical conditions seriously (e.g., diabetes → watch glycemic index, hypertension → watch sodium).
Tailor caloric and macro recommendations to their activity level, weight, and goals.
Keep responses conversational, clear, and structured with bullet points when listing multiple items.
Always end with a brief motivational note or practical tip.

Based on meal, tell how many calories remaining for the day. You have to tell based on meal decide yourself if it is breakfast or lunch or dinner or snacks.

Start Response with: Nutritional Analysis of the Meal

Make sure:
First you have to check if users asked Off Topic. Then response it's OffTopic.
Then Check if not off topic, make sure user mentioned some quantity about deit they want to check, if you feel you can't calculate calories based on provided prompt ask user rather then assuming.
Telling Off topic. Only answer when user tell about his/her nutrition.
OffTopic Sample Response: That topic is outside my scope. I'm here to help with nutrition, food choices, meal analysis, and diet planning.
Tell me: What did you eat today?
"""

if __name__ == '__main__':
    app.run(debug=True, port=5000)
