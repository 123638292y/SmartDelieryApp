import sys
import json
from ortools.constraint_solver import routing_enums_pb2
from ortools.constraint_solver import pywrapcp


def solve_tsp(matrix, speed_factors=None):
    """
    Résout un problème de type "plus court chemin" (open path TSP) :
    - Le véhicule part TOUJOURS du node 0 (dépôt / livraison prioritaire).
    - Il n'y a AUCUN coût de retour au dépôt (contrairement à un TSP classique
      qui calcule une tournée fermée). C'est essentiel ici car un livreur ne
      revient pas à son point de départ au milieu de sa tournée.
    
    Args:
        matrix: Matrice des durées entre les points
        speed_factors: Liste de facteurs de vitesse pour chaque destination
                      (indice 0 = dépôt, indice i = facteur pour la livraison i)
    """
    if not matrix or len(matrix) == 0:
        return None

    num_locations = len(matrix)

    if num_locations == 1:
        return [0]

    # --- APPLIQUER LES FACTEURS DE VITESSE À LA MATRICE ---
    adjusted_matrix = [row[:] for row in matrix]  # Copie de la matrice
    
    if speed_factors and len(speed_factors) == num_locations:
        # Ajuster chaque ligne de la matrice en fonction du facteur de vitesse
        for i in range(num_locations):
            for j in range(num_locations):
                if i > 0:  # On ne modifie pas le départ (index 0)
                    # Le facteur de vitesse s'applique sur la destination (colonne j)
                    # ou sur le point de départ (ligne i)
                    if j > 0 and i != j:
                        # Appliquer le facteur de vitesse de la destination
                        speed_factor = speed_factors[j]
                        # Si vitesse > 35km/h, facteur > 1, donc temps réduit
                        # Si vitesse < 35km/h, facteur < 1, donc temps augmenté
                        adjusted_matrix[i][j] = matrix[i][j] / speed_factor
                    elif i > 0 and j == 0:
                        # Retour au dépôt - on l'ignore dans un open path TSP
                        adjusted_matrix[i][j] = 0
        print(f"Matrice ajustée avec facteurs de vitesse: {speed_factors}", file=sys.stderr)
    else:
        print("Aucun facteur de vitesse fourni, utilisation de la matrice originale", file=sys.stderr)

    size = num_locations + 1
    dummy_index = num_locations

    big_matrix = [[0] * size for _ in range(size)]
    for i in range(num_locations):
        for j in range(num_locations):
            big_matrix[i][j] = adjusted_matrix[i][j]
    for i in range(num_locations):
        big_matrix[i][dummy_index] = 0
        big_matrix[dummy_index][i] = 0

    num_vehicles = 1
    start_index = 0
    end_index = dummy_index

    manager = pywrapcp.RoutingIndexManager(size, num_vehicles, [start_index], [end_index])
    routing = pywrapcp.RoutingModel(manager)

    def distance_callback(from_index, to_index):
        from_node = manager.IndexToNode(from_index)
        to_node = manager.IndexToNode(to_index)
        # Assurer que la valeur est un entier (arrondi)
        return int(round(big_matrix[from_node][to_node]))

    transit_callback_index = routing.RegisterTransitCallback(distance_callback)
    routing.SetArcCostEvaluatorOfAllVehicles(transit_callback_index)

    search_parameters = pywrapcp.DefaultRoutingSearchParameters()
    search_parameters.first_solution_strategy = (
        routing_enums_pb2.FirstSolutionStrategy.PATH_CHEAPEST_ARC)
    search_parameters.local_search_metaheuristic = (
        routing_enums_pb2.LocalSearchMetaheuristic.GUIDED_LOCAL_SEARCH)
    search_parameters.time_limit.seconds = 2

    solution = routing.SolveWithParameters(search_parameters)

    if solution:
        route = []
        index = routing.Start(0)
        while not routing.IsEnd(index):
            node = manager.IndexToNode(index)
            if node != dummy_index:
                route.append(node)
            index = solution.Value(routing.NextVar(index))
        return route
    else:
        return None


if __name__ == "__main__":
    try:
        input_data = sys.stdin.read()
        if not input_data:
            sys.exit(0)

        data = json.loads(input_data)
        matrix = data.get('matrix')
        speed_factors = data.get('speed_factors')  # Recevoir les facteurs de vitesse

        if matrix:
            if len(matrix) < 2:
                print(json.dumps([0]))  # Un seul point
            else:
                optimized_route = solve_tsp(matrix, speed_factors)
                if optimized_route is None:
                    optimized_route = list(range(len(matrix)))
                print(json.dumps(optimized_route))
        else:
            print(json.dumps({"error": "No matrix provided"}))

    except Exception as e:
        print(json.dumps({"error": str(e)}))