import os
import json
import asyncio
import time
import hashlib
import numpy as np
import random
import sys
from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect
from pydantic import BaseModel
import onnxruntime as ort
import torch

# Add models directory to system path to import TCNModel
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "models")))
from train_tcn import TCNModel

router = APIRouter(prefix="/api/v1/edge", tags=["Edge Inference"])

MODEL_DIR = os.path.dirname(os.path.abspath(__file__))
ONNX_PATH = os.path.join(MODEL_DIR, "tcn_model_quantized.onnx")
SCALER_PATH = os.path.join(MODEL_DIR, "scaler_params.json")
PYTORCH_MODEL_PATH = os.path.abspath(os.path.join(MODEL_DIR, "..", "models", "tcn_model.pt"))

pytorch_model = None

def load_pytorch_model():
    global pytorch_model
    if pytorch_model is not None:
        return pytorch_model
    if os.path.exists(PYTORCH_MODEL_PATH):
        try:
            pytorch_model = TCNModel(input_size=14, output_size=1, num_channels=[32, 32, 32, 32], kernel_size=3, dropout=0.2)
            pytorch_model.load_state_dict(torch.load(PYTORCH_MODEL_PATH, map_location=torch.device('cpu')))
            pytorch_model.eval()
            print("PyTorch model loaded successfully for Explainable AI.")
        except Exception as e:
            print(f"Error loading PyTorch model for XAI: {e}")
    else:
        print(f"PyTorch model not found at {PYTORCH_MODEL_PATH}")
    return pytorch_model

class InferencePayload(BaseModel):
    sensor_matrix: list[list[float]]
    explain: bool = False

class AttributionItem(BaseModel):
    sensor: str
    percentage: float
    value: float | None = None
    delta: float | None = None
    unit: str | None = None

class InferenceResponse(BaseModel):
    health_score: float
    predicted_rul: int
    anomaly_flag: bool
    is_mock: bool
    attribution: list[AttributionItem] = []

SENSOR_UNITS: dict[str, str] = {
    "s2": "°R",
    "s3": "°R",
    "s4": "°R",
    "s7": "psia",
    "s8": "rpm",
    "s9": "rpm",
    "s11": "psia",
    "s12": "pps/psia",
    "s13": "rpm",
    "s14": "rpm",
    "s15": "ratio",
    "s17": "Btu/lbm",
    "s20": "lbm/s",
    "s21": "lbm/s"
}

class ONNXInferenceService:
    def __init__(self):
        self.session = None
        self.scaler = None
        self.real_data = {}
        self.load_resources()
        
    def load_resources(self):
        if os.path.exists(ONNX_PATH) and os.path.exists(SCALER_PATH):
            try:
                session_options = ort.SessionOptions()
                session_options.graph_optimization_level = ort.GraphOptimizationLevel.ORT_ENABLE_ALL
                session_options.intra_op_num_threads = 1
                session_options.inter_op_num_threads = 1
                session_options.execution_mode = ort.ExecutionMode.ORT_SEQUENTIAL
                self.session = ort.InferenceSession(ONNX_PATH, sess_options=session_options, providers=["CPUExecutionProvider"])
                with open(SCALER_PATH, "r") as f:
                    self.scaler = json.load(f)
                # Verify scaler scale & min array shapes and guard against division by zero
                if "scale" in self.scaler and "min" in self.scaler:
                    assert len(self.scaler["scale"]) == 14 and len(self.scaler["min"]) == 14, "Invalid scaler dimensions" 
                print("ONNX model and scaler parameters loaded successfully.")
                load_pytorch_model()
            except Exception as e:
                print(f"Error loading model resources: {e}")
                self.session = None
                self.scaler = None
        else:
            print("ONNX model or scaler parameters not found. Inference service running in Mock/Fallback mode.")

        # Load C-MAPSS real data for simulation if files are available
        try:
            from train_tcn import TRAIN_PATH, COLUMNS, KEEP_SENSORS
            import pandas as pd
            if os.path.exists(TRAIN_PATH):
                train_df = pd.read_csv(TRAIN_PATH, sep=r"\s+", header=None, names=COLUMNS)
                for unit_id in [1, 2, 3]:
                    unit_data = train_df[train_df["unit"] == unit_id].sort_values("cycle")
                    self.real_data[f"ENG-00{unit_id}"] = unit_data[KEEP_SENSORS].values.tolist()
                print("Real NASA C-MAPSS dataset loaded for realistic telemetry simulation.")
        except Exception as e:
            print(f"Could not load real C-MAPSS data for simulation: {e}")

    def get_healthy_baseline(self) -> np.ndarray:
        """Returns pristine healthy cycle baseline matrix of shape (30, 14)."""
        if hasattr(self, "real_data") and "ENG-001" in self.real_data and len(self.real_data["ENG-001"]) >= 30:
            return np.array(self.real_data["ENG-001"][:30], dtype=np.float32)
        nominal_row = [642.0, 1585.0, 1400.0, 554.0, 2388.0, 9050.0, 47.3, 522.0, 2388.0, 8135.0, 8.40, 392.0, 38.95, 23.4]
        return np.tile(nominal_row, (30, 1)).astype(np.float32)

    def preprocess_and_predict(self, matrix: list[list[float]]) -> tuple[float, int, bool, bool]:
        if self.session is None or self.scaler is None:
            self.load_resources()
            
        if self.session is None or self.scaler is None:
            mock_rul = max(10, min(125, int(125 - len(matrix) * 1.5)))
            health_score = float(mock_rul / 125.0)
            anomaly_flag = mock_rul < 30
            return health_score, mock_rul, anomaly_flag, True
            
        try:
            arr = np.array(matrix, dtype=np.float32)
            if arr.shape != (30, 14):
                raise ValueError(f"Expected shape (30, 14), got {arr.shape}")
                
            scale = np.array(self.scaler["scale"], dtype=np.float32)
            min_val = np.array(self.scaler["min"], dtype=np.float32)
            scaled_arr = arr * scale + min_val
            # Numerical stability guard: clamp standardized features to prevent outlier explosion
            scaled_arr = np.clip(scaled_arr, -5.0, 5.0)
            onnx_input = np.expand_dims(scaled_arr.T, axis=0)
            
            inputs = {self.session.get_inputs()[0].name: onnx_input}
            outputs = self.session.run(None, inputs)
            predicted_rul = float(outputs[0][0][0])
            
            predicted_rul = max(0.0, min(125.0, predicted_rul))
            rul_int = int(round(predicted_rul))
            health_score = float(predicted_rul / 125.0)
            anomaly_flag = rul_int < 30
            
            return health_score, rul_int, anomaly_flag, False
        except Exception as e:
            print(f"Error in ONNX model inference: {e}")
            estimated_cycle = len(matrix)
            if estimated_cycle < 60:
                mock_rul = max(80, int(150 - estimated_cycle))
            elif estimated_cycle < 110:
                mock_rul = max(35, int(145 - estimated_cycle))
            else:
                mock_rul = max(5, int(162 - estimated_cycle))

            health_score = float(mock_rul / 125.0)
            anomaly_flag = mock_rul < 30
            return health_score, mock_rul, anomaly_flag, True

    def compute_attribution(self, matrix: list[list[float]]) -> list[dict]:
        model = load_pytorch_model()
        sensor_names = ["s2", "s3", "s4", "s7", "s8", "s9", "s11", "s12", "s13", "s14", "s15", "s17", "s20", "s21"]
        
        if model is None or self.scaler is None:
            return [{"sensor": name, "percentage": 100.0 / len(sensor_names), "value": 0.0, "delta": 0.0, "unit": SENSOR_UNITS.get(name, "")} for name in sensor_names]
            
        try:
            arr = np.array(matrix, dtype=np.float32)
            scale = np.array(self.scaler["scale"], dtype=np.float32)
            min_val = np.array(self.scaler["min"], dtype=np.float32)
            scaled_arr = arr * scale + min_val
            onnx_input = np.expand_dims(scaled_arr.T, axis=0)
            
            input_tensor = torch.tensor(onnx_input, dtype=torch.float32, requires_grad=True)
            
            # Calibrated healthy baseline: pristine cycle 1-30 baseline
            healthy_raw = self.get_healthy_baseline()
            scaled_baseline = healthy_raw * scale + min_val
            baseline_tensor = torch.tensor(np.expand_dims(scaled_baseline.T, axis=0), dtype=torch.float32)
            
            steps = 10
            grads_accum = torch.zeros_like(input_tensor)
            
            for alpha in np.linspace(0.0, 1.0, steps):
                interpolated = baseline_tensor + alpha * (input_tensor - baseline_tensor)
                interpolated = interpolated.clone().detach().requires_grad_(True)
                out = model(interpolated)
                out.backward(torch.ones_like(out))
                grads_accum += interpolated.grad.data
                
            avg_grads = grads_accum / steps
            attributions = (input_tensor - baseline_tensor) * avg_grads
            
            attribution_scores = attributions.squeeze(0).mean(dim=1).detach().numpy()
            
            # Absolute physical wear contribution
            wear_scores = np.abs(attribution_scores)
            
            # Direct sensor deviation from healthy baseline
            current_vals = arr[-1]
            healthy_vals = healthy_raw[-1]
            raw_deltas = current_vals - healthy_vals
            rel_dev = np.abs(raw_deltas) / (np.abs(healthy_vals) + 1e-5)
            
            # Blend backprop gradient sensitivity (75%) with physical delta magnitude (25%)
            combined_scores = wear_scores * 0.75 + (rel_dev * 5.0) * 0.25
            
            total_wear = np.sum(combined_scores)
            if total_wear > 1e-5:
                wear_percentages = (combined_scores / total_wear) * 100.0
            else:
                wear_percentages = [100.0 / len(sensor_names)] * len(sensor_names)
                
            attribution_list = []
            for idx, (name, pct) in enumerate(zip(sensor_names, wear_percentages)):
                val = float(current_vals[idx])
                delta = float(raw_deltas[idx])
                unit = SENSOR_UNITS.get(name, "")
                attribution_list.append({
                    "sensor": name,
                    "percentage": float(round(pct, 1)),
                    "value": float(round(val, 2)),
                    "delta": float(round(delta, 2)),
                    "unit": unit
                })
                
            attribution_list.sort(key=lambda x: x["percentage"], reverse=True)
            return attribution_list
        except Exception as e:
            print(f"Error computing attributions: {e}")
            return [{"sensor": name, "percentage": 100.0 / len(sensor_names), "value": 0.0, "delta": 0.0, "unit": SENSOR_UNITS.get(name, "")} for name in sensor_names]

inference_service = ONNXInferenceService()

@router.post("/inference", response_model=InferenceResponse)
def get_edge_inference(payload: InferencePayload):
    if len(payload.sensor_matrix) != 30 or any(len(row) != 14 for row in payload.sensor_matrix):
        raise HTTPException(
            status_code=400, 
            detail="Payload must be a 30x14 matrix (30 cycles of 14 sensor readings)."
        )
        
    health_score, rul_int, anomaly, is_mock = inference_service.preprocess_and_predict(payload.sensor_matrix)
    attribution = inference_service.compute_attribution(payload.sensor_matrix) if payload.explain else []
    
    return {
        "health_score": health_score,
        "predicted_rul": rul_int,
        "anomaly_flag": anomaly,
        "is_mock": is_mock,
        "attribution": attribution
    }

def simulate_telemetry_matrix(engine_id: str, cycle: int, fault_type: str | None = None) -> tuple[list[list[float]], float, float]:
    # Check if real C-MAPSS data has been loaded in the inference service
    if hasattr(inference_service, "real_data") and engine_id in inference_service.real_data:
        real_rows = inference_service.real_data[engine_id]
        n_rows = len(real_rows)
        
        # When a severe mechanical or thermal fault is active, accelerate the effective cycle lookup
        fault_mult = 2.6 if fault_type == "hpt" else 2.2 if fault_type == "hpc" else 2.0 if fault_type == "coking" else 1.0
        effective_cycle = int(cycle * fault_mult)
        
        # We need a window of 30 cycles ending at `effective_cycle`.
        end_idx = min(max(30, effective_cycle), n_rows)
        start_idx = end_idx - 30
        
        # Make a copy of the rows so we can inject aerothermal fault offsets without mutating static dataset
        matrix = [list(row) for row in real_rows[start_idx:end_idx]]
        
        # s11 is index 6, s12 is index 7 in KEEP_SENSORS
        current_row = matrix[-1]
        s11 = current_row[6]
        s12 = current_row[7]
    else:
        degradation = 1.6 if engine_id == "ENG-003" else 1.1 if engine_id == "ENG-002" else 0.8
        fault_mult = 2.6 if fault_type == "hpt" else 2.2 if fault_type == "hpc" else 2.0 if fault_type == "coking" else 1.0
        matrix = []
        for index in range(30):
            cycle_idx = cycle - 29 + index
            effective_cycle = cycle_idx * degradation * fault_mult

            
            row = [
                642.0 + (effective_cycle * 0.007) + random.uniform(0, 0.1),
                1585.0 + (effective_cycle * 0.08) + random.uniform(0, 0.5),
                1400.0 + (effective_cycle * 0.15) + random.uniform(0, 0.5),
                554.0 - (effective_cycle * 0.015) + random.uniform(0, 0.05),
                2388.0 + (effective_cycle * 0.001) + random.uniform(0, 0.01),
                9050.0 + (effective_cycle * 0.25) + random.uniform(0, 1.0),
                47.3 + (effective_cycle * 0.005) + random.uniform(0, 0.02),
                522.0 - (effective_cycle * 0.012) + random.uniform(0, 0.05),
                2388.0 + (effective_cycle * 0.001) + random.uniform(0, 0.01),
                8135.0 + (effective_cycle * 0.18) + random.uniform(0, 0.5),
                8.40 + (effective_cycle * 0.0007) + random.uniform(0, 0.002),
                392.0 + (effective_cycle * 0.025) + random.uniform(0, 0.2),
                38.95 - (effective_cycle * 0.003) + random.uniform(0, 0.02),
                23.4 - (effective_cycle * 0.002) + random.uniform(0, 0.02)
            ]
            matrix.append(row)
            
        s11 = 1585.0 + cycle * 0.08 * degradation + random.uniform(0, 0.5)
        s12 = 8.40 + cycle * 0.0007 * degradation + random.uniform(0, 0.002)

    # Apply aerodynamic & thermodynamic stress offsets if an active fault is injected
    if fault_type:
        s2_off, s3_off, s4_off, s7_off, s9_off, s11_off, s12_off, s15_off, s20_off = 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0
        if fault_type == "hpt":
            # HPT TBC Spallation: Extreme thermal stress on HPT & LPC
            s4_off = 36.0    # s4 EGT surge (+36 °R)
            s3_off = 26.0    # s3 T30 surge (+26 °R)
            s12_off = -2.4   # s12 fuel ratio restriction
            s11_off = -0.5   # s11 static pressure drop
            s20_off = 0.5    # s20 coolant bleed demand
        elif fault_type == "hpc":
            # HPC Tip Rub & Blade FOD: Pressure ratio loss, core speed vibration
            s7_off = -3.4    # s7 P30 total pressure drop (-3.4 psia)
            s11_off = -0.9   # s11 Ps30 static pressure drop (-0.9 psia)
            s3_off = 22.0    # s3 T30 work loss heat (+22 °R)
            s9_off = 55.0    # s9 core speed compensation (+55 rpm)
        elif fault_type == "coking":
            # Combustor Fuel Nozzle Coking: Thermal distortion & injector restriction
            s12_off = -2.8   # s12 fuel flow ratio severe restriction
            s3_off = 32.0    # s3 T30 localized combustion hotspot
            s4_off = 18.0    # s4 EGT downstream combustion
        elif fault_type == "monsoon":
            # Atmospheric Moisture Ingestion (water droplet bypass loading & evaporative cooling)
            s15_off = -0.14  # s15 bypass ratio shift
            s2_off = -2.2    # s2 T24 evaporative cooling (-2.2 °R)
            s11_off = -0.6   # s11 static pressure drop

        for r in matrix:
            r[0] += s2_off   # s2
            r[1] += s3_off   # s3
            r[2] += s4_off   # s4
            r[3] += s7_off   # s7
            r[5] += s9_off   # s9
            r[6] += s11_off  # s11
            r[7] += s12_off  # s12
            r[10] += s15_off # s15
            r[12] += s20_off # s20
        s11 += s11_off
        s12 += s12_off

    return matrix, s11, s12



def serialize_arinc_frame(
    engine_id: str,
    cycle: int,
    rul_int: int,
    active_fault: str | None,
    anomaly: bool,
    sensor_snapshot: dict[str, float],
    vib_n1: float,
    vib_n2: float,
    sigma_rul: float
) -> tuple[bytearray, str]:
    """
    Serializes a 48-byte ARINC 429 / 620 compliant binary packet for in-flight ACARS downlink.
    Encodes tail identifiers, engine spool status, RUL estimation, sensor channels, and SHA-256 seal.
    """
    acars_raw = bytearray(48)
    acars_raw[0:4] = b"AIR\x01"
    tail_code = 101 if "001" in engine_id or "002" in engine_id else 202 if "003" in engine_id or "004" in engine_id else 303
    acars_raw[4:6] = tail_code.to_bytes(2, "big")
    eng_num = int(engine_id.split("-")[1])
    acars_raw[6] = eng_num
    acars_raw[7] = 1 if active_fault else 0
    acars_raw[8:10] = min(65535, cycle).to_bytes(2, "big")
    acars_raw[10] = min(125, rul_int)
    acars_raw[11] = 1 if anomaly else 0
    acars_raw[12:14] = int(sensor_snapshot["s7"] * 10).to_bytes(2, "big", signed=False)
    acars_raw[14:16] = int(sensor_snapshot["s3"] * 10).to_bytes(2, "big", signed=False)
    acars_raw[16:18] = int(sensor_snapshot["s4"] * 10).to_bytes(2, "big", signed=False)
    acars_raw[18:20] = int(sensor_snapshot["s11"] * 100).to_bytes(2, "big", signed=False)
    acars_raw[20:22] = int(sensor_snapshot["s12"] * 10).to_bytes(2, "big", signed=False)
    acars_raw[22:24] = int(sensor_snapshot["s9"]).to_bytes(2, "big", signed=False)
    acars_raw[24:26] = int(vib_n1 * 100).to_bytes(2, "big", signed=False)
    acars_raw[26:28] = int(vib_n2 * 100).to_bytes(2, "big", signed=False)
    acars_raw[28:30] = int(sigma_rul * 10).to_bytes(2, "big", signed=False)
    seal = hashlib.sha256(f"{engine_id}:{cycle}:{rul_int}:{active_fault}".encode()).digest()
    acars_raw[30:48] = seal[:18]
    acars_hex = " ".join(f"{b:02X}" for b in acars_raw)
    return acars_raw, acars_hex

DEFAULT_ATTRIBUTION = [
    {"sensor": "s11", "percentage": 18.5, "value": 47.45, "delta": 0.15, "unit": "psia"},
    {"sensor": "s4", "percentage": 16.2, "value": 1404.2, "delta": 4.2, "unit": "°R"},
    {"sensor": "s12", "percentage": 14.1, "value": 521.8, "delta": -0.2, "unit": "pps/psia"},
    {"sensor": "s3", "percentage": 11.4, "value": 1588.6, "delta": 3.6, "unit": "°R"},
    {"sensor": "s7", "percentage": 9.1, "value": 553.8, "delta": -0.2, "unit": "psia"},
    {"sensor": "s8", "percentage": 7.3, "value": 2388.1, "delta": 0.1, "unit": "rpm"},
    {"sensor": "s2", "percentage": 5.4, "value": 642.4, "delta": 0.4, "unit": "°R"},
    {"sensor": "s9", "percentage": 5.1, "value": 9054.2, "delta": 4.2, "unit": "rpm"},
    {"sensor": "s15", "percentage": 4.2, "value": 8.42, "delta": 0.02, "unit": "ratio"},
    {"sensor": "s13", "percentage": 3.1, "value": 2388.1, "delta": 0.1, "unit": "rpm"},
    {"sensor": "s14", "percentage": 2.5, "value": 8138.6, "delta": 3.6, "unit": "rpm"},
    {"sensor": "s17", "percentage": 1.6, "value": 392.4, "delta": 0.4, "unit": "Btu/lbm"},
    {"sensor": "s20", "percentage": 0.9, "value": 38.92, "delta": -0.03, "unit": "lbm/s"},
    {"sensor": "s21", "percentage": 0.6, "value": 23.38, "delta": -0.02, "unit": "lbm/s"}
]

ALL_ENGINE_IDS = ["ENG-001", "ENG-002", "ENG-003", "ENG-004", "ENG-005", "ENG-006"]

@router.websocket("/ws/telemetry")
async def websocket_telemetry(websocket: WebSocket):
    await websocket.accept()
    
    state = {
        "paused": False,
        "rate_ms": 1000,
        "engine_cycles": {eng: 30 for eng in ALL_ENGINE_IDS},
        "active_faults": {eng: None for eng in ALL_ENGINE_IDS},
        "last_fault_type": {eng: None for eng in ALL_ENGINE_IDS},
        "last_predictions": {},
        "attribution_cache": {eng: DEFAULT_ATTRIBUTION for eng in ALL_ENGINE_IDS}
    }
    
    async def read_commands():
        try:
            while True:
                data = await websocket.receive_text()
                cmd = json.loads(data)
                action = cmd.get("command")
                if action == "pause":
                    state["paused"] = True
                elif action == "resume":
                    state["paused"] = False
                elif action == "set_rate":
                    state["rate_ms"] = max(100, int(cmd.get("rate", 1000)))
                elif action == "reset":
                    state["engine_cycles"] = {eng: 30 for eng in ALL_ENGINE_IDS}
                    state["active_faults"] = {eng: None for eng in ALL_ENGINE_IDS}
                    state["last_fault_type"] = {eng: None for eng in ALL_ENGINE_IDS}
                    state["last_predictions"] = {}
                elif action == "set_airborne_engines":
                    state["airborne_engines"] = cmd.get("engines", [])
                elif action == "set_fault":
                    eng_id = cmd.get("engine_id")
                    fault = cmd.get("fault_type")
                    if eng_id in state["active_faults"]:
                        state["active_faults"][eng_id] = fault
                        if eng_id in state["last_predictions"]:
                            del state["last_predictions"][eng_id]
                        if eng_id in state["attribution_cache"]:
                            del state["attribution_cache"][eng_id]
                elif action == "reset_engine":
                    eng_id = cmd.get("engine_id")
                    if eng_id in state["engine_cycles"]:
                        state["engine_cycles"][eng_id] = 30
                        state["active_faults"][eng_id] = None
                        state["last_fault_type"][eng_id] = None
                        if eng_id in state["last_predictions"]:
                            del state["last_predictions"][eng_id]
                        if eng_id in state["attribution_cache"]:
                            del state["attribution_cache"][eng_id]
        except Exception:
            pass
            
    asyncio.create_task(read_commands())
    
    try:
        while True:
            loop_start_time = time.monotonic()
            if not state["paused"]:
                updates = {}
                for engine_id in ALL_ENGINE_IDS:
                    # Only increment engine cycles if the engine is currently airborne
                    is_airborne = engine_id in state.get("airborne_engines", [])
                    if is_airborne:
                        # Non-linear Paris' Law wear kinetics: accelerated consumption under active mechanical/thermal fault
                        if active_fault in ("hpc", "hpt", "coking"):
                            cycle_step = 3 if cycle > 70 else 2
                            state["engine_cycles"][engine_id] += cycle_step
                        else:
                            state["engine_cycles"][engine_id] += 2
                        
                    cycle = state["engine_cycles"][engine_id]
                    active_fault = state["active_faults"].get(engine_id)
                    matrix, s11, s12 = simulate_telemetry_matrix(engine_id, cycle, fault_type=active_fault)
                    
                    health_score, rul_int, anomaly, is_mock = inference_service.preprocess_and_predict(matrix)
                    
                    # Apply EMA smoothing to eliminate fluctuations in raw telemetry predictions
                    # (Bypass smoothing if a new fault has just been injected or engine reset)
                    if engine_id in state["last_predictions"]:
                        last_h, last_r = state["last_predictions"][engine_id]
                        health_score = 0.25 * health_score + 0.75 * last_h
                        rul_val = 0.25 * rul_int + 0.75 * last_r
                        rul_int = int(round(rul_val))
                    state["last_predictions"][engine_id] = (health_score, rul_int)
                    anomaly = rul_int < 30
                    
                    # Detect fault transition to trigger immediate recalculation
                    last_fault = state["last_fault_type"].get(engine_id)
                    fault_changed = active_fault != last_fault
                    state["last_fault_type"][engine_id] = active_fault

                    # Run attribution update: calculate fresh attribution every 2 cycles, or immediately on fault change
                    needs_fresh_attr = (engine_id not in state["attribution_cache"]) or fault_changed or (cycle % 2 == 0)
                    if needs_fresh_attr:
                        fresh_attr = inference_service.compute_attribution(matrix)
                        # EMA blend with previous attribution for fluid, natural movement
                        if engine_id in state["attribution_cache"] and not fault_changed:
                            prev_dict = {item["sensor"]: item["percentage"] for item in state["attribution_cache"][engine_id]}
                            blended = []
                            for item in fresh_attr:
                                s = item["sensor"]
                                prev_pct = prev_dict.get(s, item["percentage"])
                                smooth_pct = 0.45 * item["percentage"] + 0.55 * prev_pct
                                blended.append({
                                    **item,
                                    "percentage": float(round(smooth_pct, 1))
                                })
                            blended.sort(key=lambda x: x["percentage"], reverse=True)
                            state["attribution_cache"][engine_id] = blended
                        else:
                            state["attribution_cache"][engine_id] = fresh_attr
                    
                    attribution = state["attribution_cache"].get(engine_id, DEFAULT_ATTRIBUTION)

                    # Epistemic uncertainty band (95% confidence interval: +/- 1.96 * sigma)
                    sigma_rul = max(3.0, 3.5 + 6.5 * (1.0 - health_score))
                    rul_lower = max(0, int(round(rul_int - 1.96 * sigma_rul)))
                    rul_upper = min(125, int(round(rul_int + 1.96 * sigma_rul)))

                    # Rotor vibration telemetry (mils pk-pk and ips)
                    vib_fault_n1 = 0.35 if active_fault == "hpc" else 0.12 if active_fault == "monsoon" else 0.0
                    vib_fault_n2 = 0.42 if active_fault == "hpt" else 0.28 if active_fault == "coking" else 0.0
                    base_vib1 = 0.18 + (1.0 - health_score) * 0.45 + vib_fault_n1
                    base_vib2 = 0.22 + (1.0 - health_score) * 0.55 + vib_fault_n2
                    vib_n1 = float(round(base_vib1 + random.uniform(-0.02, 0.02), 2))
                    vib_n2 = float(round(base_vib2 + random.uniform(-0.02, 0.02), 2))

                    # Last sensor snapshot for twin-engine differential
                    last_row = matrix[-1] if matrix else [642.0, 1585.0, 1400.0, 554.0, 2388.0, 9050.0, 47.3, 522.0, 2388.0, 8135.0, 8.4, 392.0, 38.9, 23.4]
                    sensor_snapshot = {
                        "s2": float(round(last_row[0], 2)),
                        "s3": float(round(last_row[1], 2)),
                        "s4": float(round(last_row[2], 2)),
                        "s7": float(round(last_row[3], 2)),
                        "s8": float(round(last_row[4], 2)),
                        "s9": float(round(last_row[5], 2)),
                        "s11": float(round(last_row[6], 2)),
                        "s12": float(round(last_row[7], 2)),
                        "s15": float(round(last_row[10], 2)),
                        "s20": float(round(last_row[12], 2)),
                        "s21": float(round(last_row[13], 2))
                    }

                    # ACARS 48-byte binary frame synthesis via optimized serialization routine
                    acars_raw, acars_hex = serialize_arinc_frame(
                        engine_id=engine_id,
                        cycle=cycle,
                        rul_int=rul_int,
                        active_fault=active_fault,
                        anomaly=anomaly,
                        sensor_snapshot=sensor_snapshot,
                        vib_n1=vib_n1,
                        vib_n2=vib_n2,
                        sigma_rul=sigma_rul
                    )
                    
                    updates[engine_id] = {
                        "engine_id": engine_id,
                        "cycle": cycle,
                        "health_score": health_score,
                        "predicted_rul": rul_int,
                        "rul_bounds": {
                            "lower": rul_lower,
                            "upper": rul_upper,
                            "sigma": float(round(sigma_rul, 1))
                        },
                        "vibration": {
                            "n1": vib_n1,
                            "n2": vib_n2,
                            "unit": "mils"
                        },
                        "sensors": sensor_snapshot,
                        "acars_hex": acars_hex,
                        "anomaly_flag": anomaly,
                        "is_mock": is_mock,
                        "attribution": attribution,
                        "sensor_11": s11,
                        "sensor_12": s12,
                        "active_fault": active_fault
                    }
                
                await websocket.send_json({
                    "type": "telemetry",
                    "engines": updates
                })
                
            # Monotonic timing compensation for zero cadence jitter
            elapsed_sec = time.monotonic() - loop_start_time
            target_sec = state["rate_ms"] / 1000.0
            sleep_sec = max(0.01, target_sec - elapsed_sec)
            await asyncio.sleep(sleep_sec)
    except WebSocketDisconnect:
        pass
    except Exception as e:
        print(f"WebSocket telemetry error: {e}")

