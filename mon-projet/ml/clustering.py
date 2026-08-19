import sys
import json
import pandas as pd
import numpy as np
import joblib
import os
import warnings

warnings.filterwarnings("ignore")
MODELS_DIR = os.path.join(os.path.dirname(__file__), "models")

def do_clustering():
    try:
        # 1. قراءة البيانات
        input_data = sys.stdin.read()
        if not input_data: return
        payload = json.loads(input_data)
        deliveries = payload.get("deliveries", [])
        nb_clusters = int(payload.get("nb_clusters", 3))

        if not deliveries:
            print(json.dumps([]))
            return

        df = pd.DataFrame(deliveries)
        
        # تحويل الإحداثيات لأرقام
        df["latitude"] = pd.to_numeric(df["latitude"], errors="coerce")
        df["longitude"] = pd.to_numeric(df["longitude"], errors="coerce")
        df = df.dropna(subset=["latitude", "longitude"])

        # 2. تحميل الموديلات وتطبيق الـ Clustering
        try:
            scaler = joblib.load(os.path.join(MODELS_DIR, "scaler"))
            kmeans = joblib.load(os.path.join(MODELS_DIR, "kmeans_model"))
            
            X_coords = df[["latitude", "longitude"]]
            X_scaled = scaler.transform(X_coords)
            df["cluster_livreur"] = kmeans.predict(X_scaled)
        except:
            # Fallback في حال الموديل موش موجود
            from sklearn.cluster import KMeans
            n = min(nb_clusters, len(df))
            df["cluster_livreur"] = KMeans(n_clusters=n, n_init="auto", random_state=42).fit_predict(df[["latitude", "longitude"]])

        # 3. صنع الـ Label (مثال: D1_L0 تعني Depot 1, Livreur 0)
        df["cluster_label"] = (
            "D" + df["id_dept"].astype(str) + 
            "_L" + df["cluster_livreur"].astype(str)
        )

        print(df.to_json(orient="records"))

    except Exception as e:
        print(json.dumps({"error": str(e)}))

if __name__ == "__main__":
    do_clustering()