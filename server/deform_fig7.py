"""
US9754410B2 FIG.7 — Steps 702 → 720
Garment mesh deformation to fit a target body.

This is the reference implementation in Python for verifying the algorithm
before porting to TypeScript.
"""
import numpy as np
import trimesh
from typing import Tuple, Dict, Any
from mesh_cache import CachedMesh


def build_bu_pos(
    bt_pos: np.ndarray,
    morph_pos: np.ndarray,
    morph_weight: float,
    morph_targets_relative: bool,
) -> Tuple[np.ndarray, Dict[str, float]]:
    """
    Step 702: Build target body (Bu) vertex positions from morph target.
    
    Args:
        bt_pos: [Nb, 3] template body positions
        morph_pos: [Nb, 3] morph target positions (delta or absolute)
        morph_weight: 0..1 morph weight
        morph_targets_relative: True if morph_pos is delta, False if absolute
    
    Returns:
        (bu_pos, debug_info) where bu_pos is [Nb, 3] and debug_info contains diagnostics
    """
    Nb = len(bt_pos)
    
    if morph_targets_relative:
        # Bu = Bt + delta * weight
        bu_pos = bt_pos + morph_pos * morph_weight
    else:
        # Bu = lerp(Bt, morphAbs, weight)
        bu_pos = (1.0 - morph_weight) * bt_pos + morph_weight * morph_pos
    
    # Diagnostic: compute avg difference between Bu and Bt
    diff = bu_pos - bt_pos
    diff_mags = np.linalg.norm(diff, axis=1)
    avg_bu_bt_diff = np.mean(diff_mags)
    
    # Robustness check: try both methods and use the one with larger difference
    if morph_targets_relative:
        bu_pos_alt = (1.0 - morph_weight) * bt_pos + morph_weight * (bt_pos + morph_pos)
        diff_alt = bu_pos_alt - bt_pos
        avg_diff_alt = np.mean(np.linalg.norm(diff_alt, axis=1))
        if avg_diff_alt > avg_bu_bt_diff * 1.1:
            print(f"[buildBuPos] Using alternative method (alt_diff={avg_diff_alt:.6f} > {avg_bu_bt_diff:.6f})")
            bu_pos = bu_pos_alt
            avg_bu_bt_diff = avg_diff_alt
    else:
        bu_pos_alt = bt_pos + (morph_pos - bt_pos) * morph_weight
        diff_alt = bu_pos_alt - bt_pos
        avg_diff_alt = np.mean(np.linalg.norm(diff_alt, axis=1))
        if avg_diff_alt > avg_bu_bt_diff * 1.1:
            print(f"[buildBuPos] Using alternative method (alt_diff={avg_diff_alt:.6f} > {avg_bu_bt_diff:.6f})")
            bu_pos = bu_pos_alt
            avg_bu_bt_diff = avg_diff_alt
    
    debug_info = {
        "avgBuBtDiff": float(avg_bu_bt_diff),
        "morphWeight": float(morph_weight),
        "morphTargetsRelative": morph_targets_relative,
    }
    
    if avg_bu_bt_diff < 1e-6 and morph_weight > 1e-6:
        print(f"[buildBuPos] ERROR: BuPos == BtPos (weight={morph_weight})")
        print("  → Morph target may be all zeros or incorrectly formatted")
    elif morph_weight < 1e-6:
        print(f"[buildBuPos] weight=0 → BuPos==BtPos (template body)")
    else:
        print(f"[buildBuPos] Morph applied: avgDiff={avg_bu_bt_diff:.6f}, mode={'delta' if morph_targets_relative else 'absolute'}")
    
    return bu_pos.astype(np.float32), debug_info


def deform_garment_fig7(
    cached: CachedMesh,
    morph_pos: np.ndarray,
    morph_weight: float,
    morph_targets_relative: bool,
    iterations: int = 30,
) -> Tuple[np.ndarray, Dict[str, Any]]:
    """
    Main deformation algorithm (Steps 702 → 720).
    
    Args:
        cached: Precomputed mesh cache
        morph_pos: [Nb, 3] morph target positions
        morph_weight: 0..1 morph weight
        morph_targets_relative: True if morph_pos is delta, False if absolute
        iterations: Number of Jacobi iterations (30-60)
    
    Returns:
        (g_new_pos, debug_info) where g_new_pos is [Ng, 3] and debug_info contains diagnostics
    """
    print(f"[deformGarmentFig7] Start: morphWeight={morph_weight}, iterations={iterations}")
    
    # Step 702: Build BuPos
    bu_pos, bu_debug = build_bu_pos(
        cached.bt_pos, morph_pos, morph_weight, morph_targets_relative
    )
    
    # Step 704: Input meshes (already loaded in cache)
    gt_pos = cached.gt_pos  # Template garment positions
    
    # Step 712: One-to-one mapping verification
    if len(bu_pos) != len(cached.bt_pos):
        raise ValueError(f"BuPos and BtPos must have same vertex count: {len(bu_pos)} != {len(cached.bt_pos)}")
    
    # Build trimesh for Bu (for collision detection)
    bu_body_mesh = trimesh.Trimesh(vertices=bu_pos, faces=cached.body_index)
    
    # Step 714: Jacobi iterations (Eq.[1])
    # Gnext[i] = Li[i] + Σ Wb·Bu[j] + Σ Wg·Gprev[k]
    Ng = len(gt_pos)
    g_prev = gt_pos.copy()
    g_next = np.zeros((Ng, 3), dtype=np.float32)

    # Pre-compute body center for collision fallback
    body_center = np.mean(bu_pos, axis=0)

    def outward_push_dir(
        diff: np.ndarray,  # vertex - closest_surface_point  (shape [3])
        dist: float,
        face_index: int,
    ) -> np.ndarray:
        """
        Return the outward push direction for a vertex that is too close to
        (or inside) the body surface.

        Problem: closestPointToPoint returns a positive distance regardless of
        whether the query point is inside or outside the mesh.  When the vertex
        is *inside* the body ``diff`` points inward, so pushing along it drives
        the vertex deeper into the body.

        Fix: compute the face normal at the closest face.
          dot(diff, face_normal) < 0  →  vertex is inside  →  use face_normal
          dot(diff, face_normal) ≥ 0  →  vertex is outside →  use diff/dist
        """
        if dist < 1e-10:
            return np.array([0.0, 1.0, 0.0], dtype=np.float32)

        push = diff / dist  # default: away from surface toward vertex

        if face_index >= 0 and face_index < len(cached.body_index):
            tri = cached.body_index[face_index]  # [a, b, c]
            a, b, c = bu_pos[tri[0]], bu_pos[tri[1]], bu_pos[tri[2]]
            e1 = b - a
            e2 = c - a
            n = np.cross(e1, e2)
            n_len = np.linalg.norm(n)
            if n_len > 1e-10:
                n /= n_len
                if np.dot(diff, n) < 0:
                    # Vertex is inside the body — use outward face normal
                    push = n

        return push.astype(np.float32)
    
    debug_info = {
        **bu_debug,
        "iterations": [],
        "totalCollisions": 0,
        "noBodyCandsRatio": 0.0,
        "avgBodyDist": 0.0,
        "liAvg": float(np.mean(np.linalg.norm(cached.li, axis=1))),
        "liMax": float(np.max(np.linalg.norm(cached.li, axis=1))),
    }
    
    # Count vertices with no body candidates
    no_body_cands_count = sum(1 for cands in cached.b_cands_list if len(cands) == 0)
    debug_info["noBodyCandsRatio"] = no_body_cands_count / Ng if Ng > 0 else 0.0
    
    # Compute average body distance (from precomputation)
    if Ng > 0:
        # Estimate from first few vertices
        sample_n = min(50, Ng)
        dist_sum = 0.0
        try:
            from trimesh import proximity
            for i in range(sample_n):
                g_pos = gt_pos[i]
                closest_points, _dists, _tri_ids = proximity.closest_point(cached.body_mesh, [g_pos])
                dist_sum += np.linalg.norm(g_pos - closest_points[0])
        except Exception:
            # Fallback: use scipy.spatial.cKDTree
            from scipy.spatial import cKDTree
            tree = cKDTree(cached.bt_pos)
            for i in range(sample_n):
                g_pos = gt_pos[i]
                dist, _ = tree.query(g_pos)
                dist_sum += dist
        debug_info["avgBodyDist"] = dist_sum / sample_n
    
    total_collisions = 0
    
    for iter_idx in range(iterations):
        max_delta_sq = 0.0
        
        # Jacobi update
        for i in range(Ng):
            # Start with Li
            nx, ny, nz = cached.li[i]
            
            # Add body candidate contributions
            for j, w in cached.b_cands_list[i]:
                nx += bu_pos[j, 0] * w
                ny += bu_pos[j, 1] * w
                nz += bu_pos[j, 2] * w
            
            # Add garment candidate contributions
            for k, w in cached.g_cands_list[i]:
                nx += g_prev[k, 0] * w
                ny += g_prev[k, 1] * w
                nz += g_prev[k, 2] * w
            
            g_next[i, 0] = nx
            g_next[i, 1] = ny
            g_next[i, 2] = nz
            
            # Track max delta
            dx = nx - g_prev[i, 0]
            dy = ny - g_prev[i, 1]
            dz = nz - g_prev[i, 2]
            delta_sq = dx * dx + dy * dy + dz * dz
            if delta_sq > max_delta_sq:
                max_delta_sq = delta_sq
        
        # Step 718: Collision response
        iter_collisions = 0
        for i in range(Ng):
            g_pos = g_next[i]
            face_idx = -1
            try:
                from trimesh import proximity
                closest_points, _dists, tri_ids = proximity.closest_point(bu_body_mesh, [g_pos])
                closest_point = closest_points[0]
                face_idx = int(tri_ids[0]) if tri_ids is not None and len(tri_ids) > 0 else -1
            except Exception:
                # Fallback: use scipy.spatial.cKDTree (no face index available)
                from scipy.spatial import cKDTree
                tree = cKDTree(bu_pos)
                _dist, nearest_idx = tree.query(g_pos)
                closest_point = bu_pos[nearest_idx]
            dist_vec = g_pos - closest_point
            dist_sq = np.dot(dist_vec, dist_vec)
            
            if dist_sq < cached.min_gap * cached.min_gap:
                iter_collisions += 1
                dist = np.sqrt(dist_sq)
                if dist > 1e-10:
                    push_dir = outward_push_dir(dist_vec, dist, face_idx)
                    g_next[i] = closest_point + push_dir * cached.min_gap
                else:
                    push_dir = g_pos - body_center
                    push_dir_norm = np.linalg.norm(push_dir)
                    if push_dir_norm > 1e-10:
                        push_dir /= push_dir_norm
                        g_next[i] = closest_point + push_dir * cached.min_gap
                    else:
                        # Last resort: push in +Y direction
                        g_next[i] = closest_point + np.array([0, cached.min_gap, 0])
        
        total_collisions += iter_collisions
        max_delta = np.sqrt(max_delta_sq)
        
        debug_info["iterations"].append({
            "iter": iter_idx + 1,
            "maxDelta": float(max_delta),
            "collisions": iter_collisions,
        })
        
        print(f"[deformGarmentFig7] iter {iter_idx + 1}/{iterations} maxDelta={max_delta:.5f} collisions={iter_collisions}")
        
        # Swap buffers
        g_prev, g_next = g_next, g_prev
    
    debug_info["totalCollisions"] = total_collisions
    debug_info["maxDelta"] = debug_info["iterations"][-1]["maxDelta"] if debug_info["iterations"] else 0.0
    
    # Step 716: Length adjustment along Y (Eq.[11], top-fixed)
    y_ori_max = np.max(gt_pos[:, 1])
    y_ori_min = np.min(gt_pos[:, 1])
    y_map_max = np.max(g_prev[:, 1])
    y_map_min = np.min(g_prev[:, 1])
    
    ori_len = y_ori_max - y_ori_min
    map_len = y_map_max - y_map_min
    
    print(f"[deformGarmentFig7] Step716 yOri=[{y_ori_min:.3f},{y_ori_max:.3f}] yMapped=[{y_map_min:.3f},{y_map_max:.3f}]")
    
    if map_len > 1e-6 and abs(ori_len / map_len - 1.0) > 0.005:
        scale_y = ori_len / map_len
        # Top-fixed: y' = yMapMax - (yMapMax - y) * (oriLen / mapLen)
        y_map_max_new = y_map_max
        for i in range(Ng):
            g_prev[i, 1] = y_map_max_new - (y_map_max_new - g_prev[i, 1]) * scale_y
        print(f"[deformGarmentFig7] Step716 y rescaled by {scale_y:.4f}")
        
        # Re-run collision after length adjustment (clothing may shrink and penetrate)
        iter_collisions = 0
        for i in range(Ng):
            g_pos = g_prev[i]
            face_idx = -1
            try:
                from trimesh import proximity
                closest_points, _dists, tri_ids = proximity.closest_point(bu_body_mesh, [g_pos])
                closest_point = closest_points[0]
                face_idx = int(tri_ids[0]) if tri_ids is not None and len(tri_ids) > 0 else -1
            except Exception:
                # Fallback: use scipy.spatial.cKDTree (no face index available)
                from scipy.spatial import cKDTree
                tree = cKDTree(bu_pos)
                _dist, nearest_idx = tree.query(g_pos)
                closest_point = bu_pos[nearest_idx]
            dist_vec = g_pos - closest_point
            dist_sq = np.dot(dist_vec, dist_vec)
            
            if dist_sq < cached.min_gap * cached.min_gap:
                iter_collisions += 1
                dist = np.sqrt(dist_sq)
                if dist > 1e-10:
                    push_dir = outward_push_dir(dist_vec, dist, face_idx)
                    g_prev[i] = closest_point + push_dir * cached.min_gap
                else:
                    push_dir = g_pos - body_center
                    push_dir_norm = np.linalg.norm(push_dir)
                    if push_dir_norm > 1e-10:
                        push_dir /= push_dir_norm
                        g_prev[i] = closest_point + push_dir * cached.min_gap
                    else:
                        g_prev[i] = closest_point + np.array([0, cached.min_gap, 0])
        
        if iter_collisions > 0:
            print(f"[deformGarmentFig7] Post-length-adjustment collisions: {iter_collisions}")
            total_collisions += iter_collisions
            debug_info["totalCollisions"] = total_collisions
    
    # Final diagnostic: average garment-body distance
    sample_n = min(50, Ng)
    final_dist_sum = 0.0
    try:
        from trimesh import proximity
        for i in range(sample_n):
            g_pos = g_prev[i]
            closest_points, _dists, _tri_ids = proximity.closest_point(bu_body_mesh, [g_pos])
            final_dist_sum += np.linalg.norm(g_pos - closest_points[0])
    except Exception:
        # Fallback: use scipy.spatial.cKDTree
        from scipy.spatial import cKDTree
        tree = cKDTree(bu_pos)
        for i in range(sample_n):
            g_pos = g_prev[i]
            dist, _ = tree.query(g_pos)
            final_dist_sum += dist
    avg_final_dist = final_dist_sum / sample_n if sample_n > 0 else 0.0
    debug_info["avgFinalBodyDist"] = float(avg_final_dist)
    
    print(f"[deformGarmentFig7] Final avg garment-body dist={avg_final_dist:.4f} (sample={sample_n})")
    if avg_final_dist > cached.min_gap * 10:
        print(f"[deformGarmentFig7] WARNING: Final dist {avg_final_dist:.4f} >> minGap={cached.min_gap}")
        print("  → Garment may be floating too far from body surface")
    
    print(f"[deformGarmentFig7] Done. totalCollisions={total_collisions}")
    
    return g_prev.astype(np.float32), debug_info
