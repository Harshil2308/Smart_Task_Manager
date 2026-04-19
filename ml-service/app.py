from pathlib import Path

import joblib
from flask import Flask, jsonify, request


BASE_DIR = Path(__file__).resolve().parent
app = Flask(__name__)


def safe_transform(encoder, value, fallback):
    classes = list(encoder.classes_)
    candidate = value if value in classes else fallback
    return encoder.transform([candidate])[0]


def load_artifacts():
    score_path = BASE_DIR / "model_score.pkl"
    label_path = BASE_DIR / "model_label.pkl"
    encoder_path = BASE_DIR / "encoder.pkl"

    if not score_path.exists() or not label_path.exists() or not encoder_path.exists():
        return None, None, None

    score_model = joblib.load(score_path)
    label_model = joblib.load(label_path)
    encoders = joblib.load(encoder_path)
    return score_model, label_model, encoders


@app.get("/health")
def health():
    models_ready = all(
        (BASE_DIR / name).exists()
        for name in ("model_score.pkl", "model_label.pkl", "encoder.pkl")
    )
    return jsonify({"service": "ml-service", "status": "ok", "models_ready": models_ready})


@app.get("/")
def index():
    return jsonify(
        {
            "message": "ML service is running",
            "routes": {
                "health": "/health",
                "predict": "/predict"
            }
        }
    )


@app.post("/predict")
def predict():
    score_model, label_model, encoders = load_artifacts()

    payload = request.get_json(silent=True) or {}

    deadline_days = int(payload.get("deadline_days", 7))
    effort = payload.get("effort", "Medium")
    impact = payload.get("impact", "Medium")
    workload = int(payload.get("workload", 5))

    if not score_model or not label_model or not encoders:
        fallback_score = max(10, 100 - (deadline_days * 4) + (workload * 3))
        fallback_label = "High" if fallback_score >= 75 else "Medium" if fallback_score >= 45 else "Low"
        return jsonify(
            {
                "priority_score": round(fallback_score, 2),
                "priority_label": fallback_label,
                "source": "fallback"
            }
        )

    effort_value = safe_transform(encoders["effort"], effort, "Medium")
    impact_value = safe_transform(encoders["impact"], impact, "Medium")
    features = [[deadline_days, effort_value, impact_value, workload]]

    predicted_score = float(score_model.predict(features)[0])
    predicted_label_encoded = int(label_model.predict(features)[0])
    predicted_label = encoders["label"].inverse_transform([predicted_label_encoded])[0]

    return jsonify(
        {
            "priority_score": round(predicted_score, 2),
            "priority_label": predicted_label,
            "source": "model"
        }
    )


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
