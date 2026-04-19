from pathlib import Path

import joblib
import pandas as pd
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor
from sklearn.preprocessing import LabelEncoder


BASE_DIR = Path(__file__).resolve().parent
DATASET_PATH = BASE_DIR.parent / "data" / "dataset.csv"


def train_models():
    dataset = pd.read_csv(DATASET_PATH)

    effort_encoder = LabelEncoder()
    impact_encoder = LabelEncoder()
    label_encoder = LabelEncoder()

    dataset["effort_encoded"] = effort_encoder.fit_transform(dataset["effort"])
    dataset["impact_encoded"] = impact_encoder.fit_transform(dataset["impact"])
    dataset["priority_label_encoded"] = label_encoder.fit_transform(
        dataset["priority_label"]
    )

    feature_columns = ["deadline_days", "effort_encoded", "impact_encoded", "workload"]
    features = dataset[feature_columns]

    score_model = RandomForestRegressor(n_estimators=100, random_state=42)
    score_model.fit(features, dataset["priority_score"])

    label_model = RandomForestClassifier(n_estimators=100, random_state=42)
    label_model.fit(features, dataset["priority_label_encoded"])

    encoder_bundle = {
        "effort": effort_encoder,
        "impact": impact_encoder,
        "label": label_encoder,
    }

    joblib.dump(score_model, BASE_DIR / "model_score.pkl")
    joblib.dump(label_model, BASE_DIR / "model_label.pkl")
    joblib.dump(encoder_bundle, BASE_DIR / "encoder.pkl")

    print("Models trained and saved successfully.")


if __name__ == "__main__":
    train_models()
