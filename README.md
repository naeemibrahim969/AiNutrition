# NutriAI — Intelligent Nutrition Analysis App

A personalized nutrition analysis chat app powered by GPT-4o and your health profile.

## Setup

### 1. Install dependencies
```bash
pip install -r requirements.txt
```

### 2. Run the app
```bash
python app.py
```

### 3. Open in browser
Visit: http://localhost:5000

## How it works

1. **Fill in your profile** — biometrics, medical conditions, health goals
2. **Enter your OpenAI API key** (sk-...) — used only in your session, never stored
3. **Start chatting** — describe your meals, ask about nutrition, get personalized analysis

## Features

- 🥦 Personalized analysis based on your BMI, activity level, age, and gender
- 💊 Condition-aware advice (e.g. low glycemic tips for diabetes, low sodium for hypertension)
- 🎯 Goal-oriented recommendations (weight loss, muscle gain, heart health, etc.)
- 💬 Full conversation history maintained per session
- 🔒 API key never stored — entered fresh each session

## File Structure
```
nutrition-app/
├── app.py              # Flask backend + OpenAI integration
├── requirements.txt
├── README.md
└── static/
    ├── app.js    
    ├── index.html 
    └── styles.css 
    
``` 