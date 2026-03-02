"""
FastAPI server for US9754410B2 FIG.7 garment deformation.
Provides /register and /deform endpoints for mesh deformation.
"""
import uuid
import base64
import numpy as np
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict, Any

from mesh_cache import MeshCache
from deform_fig7 import deform_garment_fig7

app = FastAPI(title="FIG.7 Garment Deformation API")

# CORS middleware for frontend access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify your frontend origin
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global cache
mesh_cache = MeshCache()


# Request/Response models
class RegisterRequest(BaseModel):
    """Request model for /register endpoint."""
    body: Dict[str, Any]  # btPos, morphPos, morphTargetsRelative, bodyIndex
    garment: Dict[str, Any]  # gtPos, garmentIndex
    options: Optional[Dict[str, Any]] = None  # wBody, wGarment, distPow, minGap, enlarge


class RegisterResponse(BaseModel):
    """Response model for /register endpoint."""
    mesh_id: str
    debug: Dict[str, Any]


class DeformRequest(BaseModel):
    """Request model for /deform endpoint."""
    mesh_id: str
    morph_weight: float  # 0..1
    iterations: Optional[int] = 30


class DeformResponse(BaseModel):
    """Response model for /deform endpoint."""
    g_new_pos: List[float]  # Flattened [Ng*3] Float32Array
    debug: Dict[str, Any]


def _parse_float32_array(data: Any, expected_name: str) -> np.ndarray:
    """Parse Float32Array from JSON (list of floats) or base64."""
    if isinstance(data, list):
        arr = np.array(data, dtype=np.float32)
    elif isinstance(data, str):
        # Base64 encoded
        decoded = base64.b64decode(data)
        arr = np.frombuffer(decoded, dtype=np.float32)
    else:
        raise ValueError(f"{expected_name} must be a list of floats or base64 string")
    
    if len(arr) % 3 != 0:
        raise ValueError(f"{expected_name} length must be multiple of 3 (got {len(arr)})")
    
    return arr.reshape(-1, 3)


def _parse_int32_array(data: Any, expected_name: str) -> np.ndarray:
    """Parse Int32Array from JSON (list of ints) or base64."""
    if isinstance(data, list):
        arr = np.array(data, dtype=np.int32)
    elif isinstance(data, str):
        # Base64 encoded
        decoded = base64.b64decode(data)
        arr = np.frombuffer(decoded, dtype=np.int32)
    else:
        raise ValueError(f"{expected_name} must be a list of ints or base64 string")
    
    if len(arr) % 3 != 0:
        raise ValueError(f"{expected_name} length must be multiple of 3 (got {len(arr)})")
    
    return arr.reshape(-1, 3)


@app.post("/register", response_model=RegisterResponse)
async def register_mesh(request: RegisterRequest):
    """
    Register a mesh pair and precompute all necessary data.
    
    Input (JSON):
    - body:
      - btPos: float32[Nb*3] (template body positions)
      - morphPos: float32[Nb*3] (morph target positions or delta)
      - morphTargetsRelative: bool (true=delta, false=absolute)
      - bodyIndex: int32[Ib*3] (triangles)
    - garment:
      - gtPos: float32[Ng*3] (template garment positions)
      - garmentIndex: int32[Ig*3] (triangles)
    - options:
      - wBody: float (default 0.8)
      - wGarment: float (default 0.2)
      - distPow: float (default 2.0)
      - minGap: float (auto-detected if None)
      - enlarge: float (default 0.0)
    
    Returns:
    - mesh_id: string
    - debug: diagnostic information
    """
    try:
        # Parse body data
        bt_pos = _parse_float32_array(request.body["btPos"], "btPos")
        morph_pos = _parse_float32_array(request.body["morphPos"], "morphPos")
        morph_targets_relative = request.body.get("morphTargetsRelative", True)
        body_index = _parse_int32_array(request.body["bodyIndex"], "bodyIndex")
        
        # Parse garment data
        gt_pos = _parse_float32_array(request.garment["gtPos"], "gtPos")
        garment_index = _parse_int32_array(request.garment["garmentIndex"], "garmentIndex")
        
        # Parse options
        options = request.options or {}
        w_body = options.get("wBody", 0.8)
        w_garment = options.get("wGarment", 0.2)
        dist_pow = options.get("distPow", 2.0)
        min_gap = options.get("minGap", None)
        enlarge = options.get("enlarge", 0.0)
        
        # Validate
        if len(bt_pos) != len(morph_pos):
            raise ValueError(f"btPos and morphPos must have same length: {len(bt_pos)} != {len(morph_pos)}")
        
        # Generate mesh_id
        mesh_id = str(uuid.uuid4())
        
        # Register and precompute
        cached = mesh_cache.register(
            mesh_id=mesh_id,
            bt_pos=bt_pos,
            morph_pos=morph_pos,
            morph_targets_relative=morph_targets_relative,
            body_index=body_index,
            gt_pos=gt_pos,
            garment_index=garment_index,
            w_body=w_body,
            w_garment=w_garment,
            dist_pow=dist_pow,
            min_gap=min_gap,
            enlarge=enlarge,
        )
        
        debug_info = {
            "Nb": len(bt_pos),
            "Ng": len(gt_pos),
            "avgBtMagnitude": float(cached.avg_bt_magnitude),
            "isCmScale": cached.is_cm_scale,
            "minGap": float(cached.min_gap),
            "wBody": float(cached.w_body),
            "wGarment": float(cached.w_garment),
            "distPow": float(cached.dist_pow),
            "liAvg": float(np.mean(np.linalg.norm(cached.li, axis=1))),
            "liMax": float(np.max(np.linalg.norm(cached.li, axis=1))),
        }
        
        return RegisterResponse(mesh_id=mesh_id, debug=debug_info)
    
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Registration failed: {str(e)}")


@app.post("/deform", response_model=DeformResponse)
async def deform_mesh(request: DeformRequest):
    """
    Deform garment mesh using precomputed cache.
    
    Input (JSON):
    - mesh_id: string
    - morph_weight: float (0..1)
    - iterations: int (default 30, range 30-60)
    
    Returns:
    - g_new_pos: float32[Ng*3] (deformed garment positions)
    - debug: diagnostic information
    """
    try:
        # Retrieve cached mesh
        cached = mesh_cache.get(request.mesh_id)
        if cached is None:
            raise HTTPException(status_code=404, detail=f"Mesh ID not found: {request.mesh_id}")
        
        # Validate morph_weight
        morph_weight = float(request.morph_weight)
        if not (0.0 <= morph_weight <= 1.0):
            raise ValueError(f"morph_weight must be in [0, 1], got {morph_weight}")
        
        # Get iterations
        iterations = request.iterations or 30
        if iterations < 1 or iterations > 100:
            raise ValueError(f"iterations must be in [1, 100], got {iterations}")
        
        # Run deformation
        g_new_pos, debug_info = deform_garment_fig7(
            cached=cached,
            morph_pos=cached.morph_pos,
            morph_weight=morph_weight,
            morph_targets_relative=cached.morph_targets_relative,
            iterations=iterations,
        )
        
        # Flatten to [Ng*3] for JSON response
        g_new_pos_flat = g_new_pos.flatten().tolist()
        
        return DeformResponse(
            g_new_pos=g_new_pos_flat,
            debug=debug_info,
        )
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Deformation failed: {str(e)}")


# Health check
@app.get("/health")
async def health():
    """Health check endpoint."""
    return {"status": "ok", "cached_meshes": len(mesh_cache._cache)}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
