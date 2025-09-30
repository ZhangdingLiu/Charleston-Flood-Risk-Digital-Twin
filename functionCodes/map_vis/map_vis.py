import plotly.graph_objects as go


def map_roads_plotly(geo_roads, mapbox_token=None, save_dir=None):
    assert mapbox_token is not None, 'Missing mapbox mb_token.'
    geo_roads = geo_roads.to_crs(epsg=4326)

    line_traces = []
    legend_added = set()
    rank = {
        "Flooded": 0,
        "high": 1,
        "medium": 2,
        "low": 3,
    }
    for _, row in geo_roads.iterrows():

        if row.geometry.geom_type == 'LineString':
            linestrings = [row.geometry]
        else:
            linestrings = list(row.geometry.geoms)

        for linestring in linestrings:
            line_coords = list(linestring.coords)
            lons, lats = zip(*line_coords)

            p_value = row['p']
            if p_value == 'Reported':
                color = "#e31a1c"
                display_p = "Reported"
                legend_name = "Flooded"
                legend_group = "Flooded"
            elif p_value >= 0.3:
                color = "#fd8d3c"
                display_p = f"{p_value:.3f}"
                legend_name = "High Risk (p ≥ 0.3)"
                legend_group = "high"
            elif p_value >= 0.10:
                color = "#fecc5c"
                display_p = f"{p_value:.3f}"
                legend_name = "Medium Risk (0.1 ≤ p < 0.3)"
                legend_group = "medium"
            else:
                color = "#ffffb2"
                display_p = f"{p_value:.3f}"
                legend_name = "Low Risk (p < 0.1)"
                legend_group = "low"

            show_legend = legend_group not in legend_added
            if show_legend:
                legend_added.add(legend_group)

            line_traces.append(
                go.Scattermapbox(
                    lon=lons,
                    lat=lats,
                    mode="lines",
                    line=dict(width=3, color=color),
                    name=legend_name,
                    legendgroup=legend_group,
                    legendrank=rank[legend_group],
                    showlegend=show_legend,
                    hovertemplate=f"<b>{row['STREET']}</b><br>Probability: {display_p}<extra></extra>",
                )
            )

    fig = go.Figure(line_traces)
    fig.update_layout(
        width=2000,
        height=800,
        mapbox=dict(
            accesstoken=mapbox_token, style="dark", center=dict(lat=32.79, lon=-79.94), zoom=13.5,
        ),
        margin={"r": 0, "t": 0, "l": 0, "b": 0},
        showlegend=True,
        dragmode='pan',
        legend=dict(
            yanchor="top",
            y=0.99,
            xanchor="left",
            x=0.01,
            bgcolor="rgba(255,255,255,0.8)",
            bordercolor="rgba(0,0,0,0.2)",
            borderwidth=1,
            font=dict(size=20)
        ),
    )

    # fig.show(renderer="browser",)
    if save_dir is not None:
        fig.write_image(save_dir, width=2000, height=1125, scale=1)
    return


if __name__ == '__main__':
    import geopandas as gpd
    import pandas as pd
    import json
    import re
    import argparse
    import os

    # Parse command line arguments
    parser = argparse.ArgumentParser(description='Generate flood prediction map from JSON file')
    parser.add_argument('--json', required=True, help='Path to input JSON file')
    parser.add_argument('--output', required=True, help='Path to output PNG file')
    args = parser.parse_args()

##################### Control panel #####################
    # dynamic data from command line arguments
    bn_json_dir = args.json
    if not os.path.exists(bn_json_dir):
        print(f"❌ Error: JSON file not found: {bn_json_dir}")
        exit(1)
        
    with open(bn_json_dir, 'r') as file:
        bn_input_output = json.load(file)  # BN inputs and outputs

    # image save from command line argument
    image_save = args.output

    # fixed data
    dir_geo_roads = './data/Road_Closures.geojson'  # geometry of all roads
    mapbox_token_path = './data/mapbox_token.txt'
    
    if not os.path.exists(mapbox_token_path):
        print(f"❌ Error: Mapbox token file not found: {mapbox_token_path}")
        exit(1)
        
    with open(mapbox_token_path, 'r') as file:
        mb_token = file.read().strip()  # visualization token

##########################################################

    # prepare geometries of roads
    geo_roads = gpd.read_file(dir_geo_roads)
    geo_roads = geo_roads[['STREET', 'geometry']]
    geo_roads['STREET'] = geo_roads['STREET'].str.replace(' ', '_')
    geo_roads = geo_roads.drop_duplicates(subset=['STREET'])

    # get BN inputs and outputs
    # Handle different JSON formats
    if "current_window" in bn_input_output and "predictions" in bn_input_output["current_window"]:
        # New format
        inputs_outputs = bn_input_output["current_window"]['predictions']
        road_outputs = [
            {'STREET': i['road'], 'p': i['probability']} for i in inputs_outputs
            if i['is_evidence'] == False
        ]
        road_inputs = [
            {'STREET': i['road'], 'p': 'Reported'} for i in inputs_outputs
            if i['is_evidence'] == True
        ]
    elif "best_experiment" in bn_input_output:
        # Legacy format
        detailed_predictions = bn_input_output["best_experiment"]["detailed_predictions"]
        evidence_roads = bn_input_output["best_experiment"]["evidence_roads"]
        
        road_outputs = [
            {'STREET': pred['road_name'], 'p': pred['predicted_probability']} 
            for pred in detailed_predictions
        ]
        road_inputs = [
            {'STREET': road, 'p': 'Reported'} for road in evidence_roads
        ]
    else:
        raise ValueError("Unknown JSON format - missing 'current_window' or 'best_experiment' keys")

    # wrap df and vis
    inputs_n_outputs = road_inputs + road_outputs
    df_i_n_o = pd.DataFrame(inputs_n_outputs)
    df_wrapped = geo_roads.merge(df_i_n_o, on='STREET', how='inner')

    # vis
    map_roads_plotly(df_wrapped, mapbox_token=mb_token, save_dir=image_save)
    print(f"✅ Successfully generated map: {image_save}")


