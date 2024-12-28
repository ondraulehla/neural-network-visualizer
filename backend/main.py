import os
import datetime
from fastapi import FastAPI, HTTPException, Response
from pydantic import BaseModel, Field
from typing import List, Dict, Optional
import uvicorn
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from google.cloud import storage
import json
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI()

# CORS middleware setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Define your models
class NeuronLayer(BaseModel):
    num_neurons: int = Field(..., gt=0)
    activation_function: Optional[str] = Field(None, pattern="^(relu|sigmoid|tanh|linear)$")

class TrainingParameters(BaseModel):
    learning_rate: float = Field(0.01, ge=0.0001, le=1.0)
    epochs: int = Field(100, ge=1, le=1000)
    batch_size: int = Field(32, ge=1, le=1000)
    l2_factor: float = Field(0.00005, ge=0, le=1.0)  # Add this line

class NetworkConfiguration(BaseModel):
    layers: List[NeuronLayer]
    weights: Dict[str, List[float]] = {}
    biases: List[List[float]] = []
    sample_size: Optional[int] = 100
    dataset_type: str = Field("random", pattern="^(random|circle|xor|spiral|gaussian)$")
    computed_coordinates: Optional[List[List[float]]] = []
    input_points: Optional[List[List[float]]] = []
    target_coordinates: Optional[List[List[float]]] = []
    training_params: TrainingParameters = Field(default_factory=lambda: TrainingParameters())

PROJECT_ID = "neural-network-config"
BUCKET_NAME = f"{PROJECT_ID}-neural-network-config"
CONFIG_FILE_NAME = "current_config.json"

def get_bucket():
    """Get the storage bucket."""
    try:
        storage_client = storage.Client()
        bucket = storage_client.bucket(BUCKET_NAME)
        if not bucket.exists():
            logger.error(f"Bucket {BUCKET_NAME} does not exist")
            raise HTTPException(status_code=500, detail=f"Storage bucket {BUCKET_NAME} not found")
        return bucket
    except Exception as e:
        logger.error(f"Error accessing bucket: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error accessing storage: {str(e)}")

def save_configuration(config: NetworkConfiguration):
    """Save configuration to Cloud Storage."""
    try:
        bucket = get_bucket()
        blob = bucket.blob(CONFIG_FILE_NAME)
        
        config_json = json.dumps(config.dict())
        logger.info(f"Attempting to save configuration: {config_json}")
        blob.upload_from_string(config_json, content_type='application/json')
        logger.info("Successfully saved configuration to storage")
    except Exception as e:
        logger.error(f"Error saving configuration: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to save configuration: {str(e)}")

def get_default_config():
    return NetworkConfiguration(
        layers=[
            NeuronLayer(num_neurons=2, activation_function="relu"),
            NeuronLayer(num_neurons=3, activation_function=None)
        ],
        weights={
            "layer0_1": [0.1, 0.2, 0.3, 0.4, 0.5, 0.6]
        },
        training_params=TrainingParameters()  # Add default training params
    )

def load_configuration():
    """Load configuration from Cloud Storage."""
    try:
        bucket = get_bucket()
        blob = bucket.blob(CONFIG_FILE_NAME)
        
        if blob.exists():
            config_data = json.loads(blob.download_as_string())
            logger.info("Successfully loaded configuration from storage")
            return NetworkConfiguration(**config_data)
        else:
            logger.info("No configuration found in storage, using default")
            return get_default_config()
    except Exception as e:
        logger.error(f"Error loading configuration: {str(e)}")
        return get_default_config()

@app.get("/")
@app.get("/config")
async def get_configuration(format: str = "json"):
    """Returns the current neural network configuration in specified format."""
    try:
        current_config = load_configuration()
        
        if format.lower() == "csv":
            # Build CSV string
            lines = []
            
            # Network structure header and data
            lines.append("STRUCTURE")
            lines.append("layer,neurons,activation")
            for i, layer in enumerate(current_config.layers):
                lines.append(f"{i},{layer.num_neurons},{layer.activation_function or 'none'}")
            
            # Empty line separator
            lines.append("")
            
            # Weights section
            lines.append("WEIGHTS")
            lines.append("from_layer,to_layer,weights")
            for i in range(len(current_config.layers) - 1):
                layer_key = f"layer{i}_{i+1}"
                if layer_key in current_config.weights:
                    weights_str = "|".join(map(str, current_config.weights[layer_key]))
                    lines.append(f"{i},{i+1},{weights_str}")
            
            # Empty line separator
            lines.append("")
            
            # Sample size
            lines.append("SAMPLE_SIZE")
            lines.append(str(current_config.sample_size or 100))
            
            # Empty line separator
            lines.append("")
            
            # Coordinates section
            lines.append("COORDINATES")
            if current_config.computed_coordinates:
                for coord in current_config.computed_coordinates:
                    lines.append(",".join(map(str, coord)))
            
            return Response(
                content="\n".join(lines),
                media_type="text/csv"
            )
            
        elif format.lower() == "tsv":
            # Build TSV string
            lines = []
            
            # Metadata
            lines.append("# Neural Network Configuration")
            lines.append(f"# Generated: {datetime.datetime.now().isoformat()}")
            lines.append("# Format: TSV")
            lines.append("")
            
            # Network structure
            lines.append("STRUCTURE")
            lines.append("Layer\tNeurons\tActivation\tType")
            for i, layer in enumerate(current_config.layers):
                layer_type = "input" if i == 0 else "output" if i == len(current_config.layers) - 1 else "hidden"
                lines.append(f"{i}\t{layer.num_neurons}\t{layer.activation_function or 'none'}\t{layer_type}")
            
            lines.append("")
            
            # Weights
            lines.append("WEIGHTS")
            lines.append("FromLayer\tToLayer\tFromNeurons\tToNeurons\tValues")
            for i in range(len(current_config.layers) - 1):
                layer_key = f"layer{i}_{i+1}"
                if layer_key in current_config.weights:
                    weights_str = "|".join(map(str, current_config.weights[layer_key]))
                    lines.append(f"{i}\t{i+1}\t{current_config.layers[i].num_neurons}\t{current_config.layers[i+1].num_neurons}\t{weights_str}")
            
            lines.append("")
            
            # Sample size
            lines.append("SAMPLE_SIZE")
            lines.append(str(current_config.sample_size or 100))
            
            lines.append("")
            
            # Coordinates
            lines.append("COORDINATES")
            if current_config.computed_coordinates:
                for coord in current_config.computed_coordinates:
                    lines.append("\t".join(map(str, coord)))
            
            return Response(
                content="\n".join(lines),
                media_type="text/tab-separated-values"
            )

        elif format.lower() == "simple":
            # Simple pipe-delimited format
            parts = []
            
            # First: activation function
            parts.append(current_config.layers[0].activation_function or "none")
            
            # Second: number of layers
            parts.append(str(len(current_config.layers)))
            
            # Third: neurons per layer
            parts.append("|".join(str(layer.num_neurons) for layer in current_config.layers))
            
            # Fourth: weights between layers
            weights_parts = []
            for i in reversed(range(len(current_config.layers) - 1)):  # Start from second to last layer
                layer_key = f"layer{i}_{i+1}"
                if layer_key in current_config.weights:
                    current_weights = current_config.weights[layer_key]
                    from_neurons = current_config.layers[i].num_neurons
                    to_neurons = current_config.layers[i+1].num_neurons
                    
                    # Reorder weights in reverse order
                    reordered_weights = []
                    for from_neuron in reversed(range(from_neurons)):  # Reverse source neurons
                        for to_neuron in reversed(range(to_neurons)):  # Reverse target neurons
                            weight_index = to_neuron + (from_neuron * to_neurons)
                            if weight_index < len(current_weights):
                                reordered_weights.append(current_weights[weight_index])
                    
                    weights_parts.append("|".join(map(str, reversed(reordered_weights))))  # Reverse the final array
            parts.append("|".join(weights_parts) + "|")  # Add trailing separator

            # Fifth: sample size
            parts.append(str(current_config.sample_size or 100))
            
            # Sixth: computed coordinates
            if current_config.computed_coordinates:
                coordinates_str = "|".join(
                    ",".join(map(str, coord)) for coord in current_config.computed_coordinates
                )
                parts.append(coordinates_str + "|")  # Add trailing separator
            else:
                parts.append("")  # Empty string if no coordinates

            # Seventh: target coordinates
            if current_config.target_coordinates:
                target_str = "|".join(
                    ",".join(map(str, coord)) for coord in current_config.target_coordinates
                )
                parts.append(target_str + "|")  # Add trailing separator
            else:
                parts.append("")  # Empty string if no target coordinates

            return Response(
                content="/".join(parts),
                media_type="text/plain"
            )

        # Default JSON format
        return JSONResponse(
            content={
                "status": "success",
                "network": {
                    "structure": {
                        "total_layers": len(current_config.layers),
                        "layers": [
                            {
                                "index": idx,
                                "neurons": layer.num_neurons,
                                "is_input": idx == 0,
                                "is_output": idx == len(current_config.layers) - 1,
                                "activation": layer.activation_function
                            }
                            for idx, layer in enumerate(current_config.layers)
                        ],
                        "sample_size": current_config.sample_size or 100,
                        "dataset_type": current_config.dataset_type,
                        "biases": current_config.biases,
                        "computed_coordinates": current_config.computed_coordinates or [],
                        "input_points": current_config.input_points or [],  # Added this line
                        "target_coordinates": current_config.target_coordinates or [],  # Added this line
                        "training_params": current_config.training_params.dict()
                    },
                    "connections": [
                        {
                            "from_layer": i,
                            "to_layer": i + 1,
                            "weights": current_config.weights.get(f"layer{i}_{i+1}", [])
                        }
                        for i in range(len(current_config.layers) - 1)
                    ]
                }
            }
        )

    except Exception as e:
        logger.error(f"Error in get_configuration: {str(e)}")
        return Response(
            content=f"ERROR: {str(e)}",
            media_type="text/plain",
            status_code=500
        )

@app.post("/config")
async def update_configuration(config: NetworkConfiguration):
    try:
        # Ensure only first layer has activation function
        for i in range(1, len(config.layers)):
            config.layers[i].activation_function = None
        
        # Validate weights dimensions
        for i in range(len(config.layers) - 1):
            layer_key = f"layer{i}_{i+1}"
            if layer_key in config.weights:
                expected_weights = config.layers[i].num_neurons * config.layers[i+1].num_neurons
                if len(config.weights[layer_key]) != expected_weights:
                    raise HTTPException(
                        status_code=400,
                        detail=f"Invalid number of weights for {layer_key}. Expected {expected_weights}, got {len(config.weights[layer_key])}"
                    )
        
        # Validate dataset_type
        if config.dataset_type not in ["random", "circle", "xor", "spiral", "gaussian"]:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid dataset type: {config.dataset_type}"
            )
        
        # Save configuration to storage
        logger.info("Attempting to save new configuration")
        save_configuration(config)
        logger.info("Successfully saved new configuration")
        
        return {"status": "success", "message": "Configuration updated successfully"}
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"Error in update_configuration: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8080))
    uvicorn.run(app, host="0.0.0.0", port=port)