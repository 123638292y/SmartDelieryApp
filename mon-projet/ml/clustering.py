import sys
import json
import pandas as pd
from sklearn.cluster import KMeans
import warnings

warnings.filterwarnings("ignore")

def do_auto_clustering():
    try:
        input_data = sys.stdin.read()
        if not input_data: return
        
        payload = json.loads(input_data)
        deliveries = payload.get("deliveries", [])
        depot_config = payload.get("depot_config", [])

        if not deliveries:
            print(json.dumps([]))
            return

        df = pd.DataFrame(deliveries)
        # Création d'une colonne vide pour les résultats
        df["assigned_driver_index"] = -1
        df["cluster_label"] = ""

        # Dictionnaire pour accès rapide au nombre de livreurs par dépôt
        # ex: {1: 3, 2: 5} -> Dépôt 1 a 3 livreurs
        drivers_map = {item['id_dept']: item['nb_drivers'] for item in depot_config}

        final_results = []

        # On traite chaque dépôt séparément
        for depot_id, group in df.groupby("id_dept"):
            nb_k = drivers_map.get(depot_id, 1) # Par défaut 1 si non trouvé
            
            # Sécurité : K ne peut pas être > au nombre de points
            n_samples = len(group)
            actual_k = min(nb_k, n_samples)

            if actual_k > 0:
                X = group[["latitude", "longitude"]]
                kmeans = KMeans(n_clusters=actual_k, n_init="auto", random_state=42)
                group["assigned_driver_index"] = kmeans.fit_predict(X)
                group["cluster_label"] = "DEPOT_" + str(depot_id) + "_LIVREUR_" + group["assigned_driver_index"].astype(str)
            
            final_results.append(group)

        # Fusionner les résultats
        df_final = pd.concat(final_results)
        print(df_final.to_json(orient="records"))

    except Exception as e:
        print(json.dumps({"error": str(e)}))

if __name__ == "__main__":
    do_auto_clustering()