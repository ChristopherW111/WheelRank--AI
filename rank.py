from flask import Flask, render_template, request, jsonify
from openai import OpenAI
from dotenv import load_dotenv
import os
import json
import re

load_dotenv()

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

app = Flask(__name__)


@app.route("/")
def home():
    return render_template("index.html")


# -------------------------
# AI BIKE RECOMMENDER
# -------------------------

@app.route("/recommend", methods=["POST"])
def recommend():
    data = request.get_json()

    if not data:
        return jsonify({"error": "No data received"}), 400

    budget = data.get("budget", "")
    experience = data.get("experience", "")
    bike_type = data.get("bikeType", "")
    goal = data.get("goal", "")

    prompt = f"""
You are WheelRank AI.

Recommend ONE bike.

Budget:
{budget}

Experience:
{experience}

Bike Type:
{bike_type}

Goal:
{goal}

Return ONLY valid JSON.

{{
    "bike":"Bike Name",
    "score":95,
    "reasons":[
        "Reason 1",
        "Reason 2",
        "Reason 3"
    ]
}}
"""

    text = ""

    try:
        response = client.responses.create(
            model="gpt-4.1-mini",
            input=prompt,
            text={"format": {"type": "json_object"}},
        )

        text = response.output_text.strip()
        result = json.loads(text)
        return jsonify(result)

    except json.JSONDecodeError:
        return jsonify({"error": "AI returned invalid JSON.", "raw": text}), 500

    except Exception as e:
        return jsonify({"error": str(e)}), 500


# -------------------------
# AI BIKE SEARCH
# -------------------------

@app.route("/bike-search", methods=["POST"])
def bike_search():
    data = request.get_json()

    if not data:
        return jsonify({"error": "No data received"}), 400

    category = data.get("category", "E Bike")
    query = data.get("query", "").strip()

    if query:
        focus_block = f"""
The rider typed this into the search box: "{query}"

Search the web for "{query} {category}" and only return real matching bikes.
"""
    else:
        focus_block = f"""
Search the web for popular real {category} models.
"""

    prompt = f"""
You are WheelRank AI's live bike search assistant.

{focus_block}

Return ONLY valid JSON:

{{
    "bikes": [
        "Brand Model"
    ]
}}
"""

    text = ""

    try:
        response = client.responses.create(
            model="gpt-4.1",
            input=prompt,
            tools=[{"type": "web_search"}],
        )

        text = response.output_text.strip()

        if text.startswith("```"):
            text = text.strip("`")
            if text.lower().startswith("json"):
                text = text[4:].strip()

        match = re.search(r"\{.*\}", text, re.DOTALL)
        if not match:
            raise ValueError("AI did not return JSON.")

        result = json.loads(match.group(0))
        return jsonify(result)

    except Exception as e:
        return jsonify({"error": str(e)}), 500


# -------------------------
# AI BIKE BUILDER
# -------------------------

@app.route("/build", methods=["POST"])
def build():
    data = request.get_json()

    if not data:
        return jsonify({"error": "No data received"}), 400

    bike = data.get("bike", "")
    height = data.get("height", "")
    build_style = data.get("build", "")
    dream = data.get("dream", "")

    prompt = f"""
You are WheelRank AI.

Design the user's dream bike.

Bike:
{bike}

Height:
{height}

Build:
{build_style}

Dream:
{dream}

Return ONLY valid JSON.

{{
    "title":"Dream Bike",
    "description":"Detailed description."
}}
"""

    text = ""

    try:
        response = client.responses.create(
            model="gpt-4.1-mini",
            input=prompt,
            text={"format": {"type": "json_object"}},
        )

        text = response.output_text.strip()
        result = json.loads(text)
        return jsonify(result)

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/generate-image", methods=["POST"])
def generate_image():
    data = request.get_json()

    bike = data.get("bike", "")
    build = data.get("build", "")
    dream = data.get("dream", "")

    prompt = f"""
Create a realistic, high-quality custom motorcycle concept.

Bike:
{bike}

Build Style:
{build}

Description:
{dream}

Requirements:
- Photorealistic
- Professional lighting
- Show full bike
- Detailed wheels
- Premium aftermarket parts
- Clean background
"""

    try:
        response = client.images.generate(
            model="gpt-image-1",
            prompt=prompt,
            size="1024x1024",
        )

        return jsonify({"image": response.data[0].b64_json})

    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    app.run(debug=True)
