import sys
import json
import pandas as pd
import numpy as np
import joblib
import torch
import torch.nn as nn
import os
import warnings

warnings.filterwarnings("ignore")
MODELS_DIR = os.path.join(os.path.dirname(__file__), "models")

class SpeedPredictor(nn.Module):
    def __init__(self, input_size):
        super().__init__()
        self.network = nn.Sequential(
            nn.Linear(input_size, 256),
            nn.BatchNorm1d(256),
            nn.LeakyReLU(0.1),
            nn.Dropout(0.3),
            nn.Linear(256, 128),
            nn.BatchNorm1d(128),
            nn.LeakyReLU(0.1),
            nn.Dropout(0.2),
            nn.Linear(128, 64),
            nn.BatchNorm1d(64),
            nn.LeakyReLU(0.1),
            nn.Linear(64, 32),
            nn.LeakyReLU(0.1),
            nn.Linear(32, 1)
        )
    def forward(self, x):
        return self.network(x)

def apply_cyclic_features(df):
    df = df.copy()
    h = df['hour'].astype(float)
    m = df['month'].astype(float)
    d = df['day_of_week_num'].astype(float)
    df['hour_sin'] = np.sin(2 * np.pi * h / 24)
    df['hour_cos'] = np.cos(2 * np.pi * h / 24)
    df['month_sin'] = np.sin(2 * np.pi * m / 12)
    df['month_cos'] = np.cos(2 * np.pi * m / 12)
    df['day_sin'] = np.sin(2 * np.pi * d / 7)
    df['day_cos'] = np.cos(2 * np.pi * d / 7)
    return df

def predict_speed():
    try:
        input_data = sys.stdin.read()
        if not input_data:
            return
        payload = json.loads(input_data)
        deliveries = payload.get("deliveries", [])
        if not deliveries:
            print(json.dumps([]))
            return
        df = pd.DataFrame(deliveries)
        df = apply_cyclic_features(df)
        numeric_features = [
            "latitude", "longitude", "department", "distance_to_paris_center",
            "length_km", "hour", "day_of_week_num", "month", "is_weekend",
            "is_holiday", "rush_hour", "traffic_volume", "speed",
            "occupancy_rate", "travel_time", "traffic_state", "distance_km",
            "hour_sin", "hour_cos", "month_sin", "month_cos", "day_sin", "day_cos"
        ]
        categorical_features = ["road_type", "city", "road_category", "weather"]
        all_features = numeric_features + categorical_features
        df_model = df[all_features]
        speed_pre = joblib.load(os.path.join(MODELS_DIR, "preprocessor.pkl"))
        X_processed = speed_pre.transform(df_model)
        if hasattr(X_processed, "toarray"):
            X_processed = X_processed.toarray()
        input_size = X_processed.shape[1]
        model = SpeedPredictor(input_size)
        model.load_state_dict(torch.load(os.path.join(MODELS_DIR, "best_model.pth"), map_location="cpu"))
        model.eval()
        tensor = torch.tensor(X_processed.astype(np.float32))
        with torch.no_grad():
            df["predicted_speed"] = model(tensor).numpy().flatten()
        print(df.to_json(orient="records"))
    except Exception as e:
        print(json.dumps({"error": str(e)}))

if __name__ == "__main__":
    predict_speed()