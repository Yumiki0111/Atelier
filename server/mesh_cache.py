"""
Mesh cache and precomputation for FIG.7 deformation.
Caches adjacency, KD-tree, candidates, weights, and Li for fast deformation.
"""
import numpy as np
import trimesh
from typing import Dict, List, Tuple, Optional
from dataclasses import dataclass


@dataclass
class CachedMesh:
    """Cached mesh data for fast deformation."""
    # Mesh data
    bt_pos: np.ndarray  # [Nb, 3] template body positions
    morph_pos: np.ndarray  # [Nb, 3] morph target positions (delta or absolute)
    morph_targets_relative: bool  # True if morph_pos is delta, False if absolute
    body_index: np.ndarray  # [Ib, 3] body triangles
    gt_pos: np.ndarray  # [Ng, 3] template garment positions
    garment_index: np.ndarray  # [Ig, 3] garment triangles
    
    # Precomputed structures
    garment_adjacency: List[List[int]]  # 1-ring neighbors for each garment vertex
    body_mesh: trimesh.Trimesh  # trimesh object for closest point queries
    
    # Precomputed candidates and weights (per garment vertex)
    b_cands_list: List[List[Tuple[int, float]]]  # [(body_idx, weight), ...]
    g_cands_list: List[List[Tuple[int, float]]]  # [(garment_idx, weight), ...]
    
    # Precomputed Li (Eq.[2])
    li: np.ndarray  # [Ng, 3]
    
    # Options
    w_body: float
    w_garment: float
    dist_pow: float
    min_gap: float
    
    # Unit detection (cm vs m)
    is_cm_scale: bool
    avg_bt_magnitude: float
    
    # Optional fields (must be last in dataclass)
    body_kdtree: Optional[object] = None  # scipy.spatial.cKDTree (optional, for faster queries)


class MeshCache:
    """Cache manager for registered meshes."""
    
    def __init__(self):
        self._cache: Dict[str, CachedMesh] = {}
    
    def register(
        self,
        mesh_id: str,
        bt_pos: np.ndarray,
        morph_pos: np.ndarray,
        morph_targets_relative: bool,
        body_index: np.ndarray,
        gt_pos: np.ndarray,
        garment_index: np.ndarray,
        w_body: float = 0.8,
        w_garment: float = 0.2,
        dist_pow: float = 2.0,
        min_gap: Optional[float] = None,
        enlarge: float = 0.0,
    ) -> CachedMesh:
        """
        Register a mesh pair and precompute all necessary data.
        
        Args:
            mesh_id: Unique identifier for this mesh pair
            bt_pos: [Nb, 3] template body positions
            morph_pos: [Nb, 3] morph target positions (delta or absolute)
            morph_targets_relative: True if morph_pos is delta, False if absolute
            body_index: [Ib, 3] body triangle indices
            gt_pos: [Ng, 3] template garment positions
            garment_index: [Ig, 3] garment triangle indices
            w_body: Weight fraction for body candidates (Eq.[6])
            w_garment: Weight fraction for garment candidates (Eq.[7])
            dist_pow: Exponent p in inverse-distance weight (Eq.[3][4])
            min_gap: Minimum clearance (auto-detected if None)
            enlarge: Enlargement factor (FIG.14 simplified, 0.0-0.003)
        
        Returns:
            CachedMesh object with all precomputed data
        """
        Nb = len(bt_pos)
        Ng = len(gt_pos)
        
        # Verify one-to-one mapping (Step 712)
        if Nb != len(morph_pos):
            raise ValueError(f"Body template and morph must have same vertex count: {Nb} != {len(morph_pos)}")
        
        # Unit detection: auto-detect cm vs m
        avg_bt_mag = np.mean(np.linalg.norm(bt_pos, axis=1))
        is_cm_scale = avg_bt_mag > 10.0
        
        if min_gap is None:
            min_gap = 0.3 if is_cm_scale else 0.003
        else:
            # Override auto-detection if explicitly provided
            is_cm_scale = min_gap > 0.01  # Heuristic: >1cm suggests cm scale
        
        print(f"[MeshCache] Registering mesh_id={mesh_id}")
        print(f"  Nb={Nb}, Ng={Ng}, avg|Bt|={avg_bt_mag:.3f}, scale={'cm' if is_cm_scale else 'm'}, minGap={min_gap:.4f}")
        
        # Build garment adjacency (1-ring neighbors)
        garment_adjacency = self._build_adjacency(Ng, garment_index)
        
        # Build trimesh for body (for closest point queries)
        body_mesh = trimesh.Trimesh(vertices=bt_pos, faces=body_index)
        
        # Precompute candidates and weights (Step 706, 708)
        b_cands_list, g_cands_list = self._precompute_candidates(
            gt_pos, bt_pos, body_mesh, body_index, garment_adjacency, dist_pow
        )
        
        # Normalize weights (Step 708: Eq.[5][6][7])
        self._normalize_weights_all(b_cands_list, g_cands_list, w_body, w_garment)
        
        # Precompute Li (Step 710: Eq.[2])
        li = self._precompute_li(gt_pos, bt_pos, b_cands_list, g_cands_list)
        
        # Store in cache
        cached = CachedMesh(
            bt_pos=bt_pos,
            morph_pos=morph_pos,
            morph_targets_relative=morph_targets_relative,
            body_index=body_index,
            gt_pos=gt_pos,
            garment_index=garment_index,
            garment_adjacency=garment_adjacency,
            body_mesh=body_mesh,
            b_cands_list=b_cands_list,
            g_cands_list=g_cands_list,
            li=li,
            w_body=w_body,
            w_garment=w_garment,
            dist_pow=dist_pow,
            min_gap=min_gap,
            is_cm_scale=is_cm_scale,
            avg_bt_magnitude=avg_bt_mag,
        )
        
        self._cache[mesh_id] = cached
        return cached
    
    def get(self, mesh_id: str) -> Optional[CachedMesh]:
        """Retrieve cached mesh data."""
        return self._cache.get(mesh_id)
    
    def _build_adjacency(self, vertex_count: int, index: np.ndarray) -> List[List[int]]:
        """Build 1-ring vertex adjacency from triangle indices."""
        adj_sets: List[set] = [set() for _ in range(vertex_count)]
        
        for tri in index:
            a, b, c = tri
            adj_sets[a].add(b)
            adj_sets[a].add(c)
            adj_sets[b].add(a)
            adj_sets[b].add(c)
            adj_sets[c].add(a)
            adj_sets[c].add(b)
        
        adjacency = [list(s) for s in adj_sets]
        avg_neighbors = sum(len(adj) for adj in adjacency) / vertex_count
        print(f"[MeshCache] Adjacency: avg neighbors={avg_neighbors:.2f}")
        return adjacency
    
    def _precompute_candidates(
        self,
        gt_pos: np.ndarray,
        bt_pos: np.ndarray,
        body_mesh: trimesh.Trimesh,
        body_index: np.ndarray,
        garment_adjacency: List[List[int]],
        dist_pow: float,
    ) -> Tuple[List[List[Tuple[int, float]]], List[List[Tuple[int, float]]]]:
        """
        Precompute body and garment candidates for each garment vertex (Step 706).
        
        Returns:
            (b_cands_list, g_cands_list) where each is a list of [(index, raw_weight), ...]
        """
        Ng = len(gt_pos)
        b_cands_list: List[List[Tuple[int, float]]] = []
        g_cands_list: List[List[Tuple[int, float]]] = []
        
        no_body_cands_count = 0
        avg_body_dist = 0.0
        
        for i in range(Ng):
            g_pos = gt_pos[i]
            
            # Step 706-a: Body candidates (3 vertices of nearest face)
            b_cands: List[Tuple[int, float]] = []
            try:
                # Try using proximity.closest_point (doesn't require rtree)
                from trimesh import proximity
                closest_points, closest_face_indices = proximity.closest_point(body_mesh, [g_pos])
                closest_point = closest_points[0]
                closest_face_idx = int(closest_face_indices[0])
            except Exception:
                # Fallback: find nearest vertex and use its adjacent faces
                from scipy.spatial import cKDTree
                tree = cKDTree(bt_pos)
                dist, nearest_vertex_idx = tree.query(g_pos)
                closest_point = bt_pos[nearest_vertex_idx]
                # Find a face containing this vertex
                closest_face_idx = -1
                for fi, face in enumerate(body_index):
                    if nearest_vertex_idx in face:
                        closest_face_idx = fi
                        break
            
            dist_to_surface = np.linalg.norm(g_pos - closest_point)
            avg_body_dist += dist_to_surface
            
            if closest_face_idx >= 0 and closest_face_idx < len(body_index):
                # Get 3 vertices of the closest face
                face = body_index[closest_face_idx]
                for v_idx in face:
                    if v_idx < len(bt_pos):
                        dist = np.linalg.norm(g_pos - bt_pos[v_idx])
                        raw_w = self._raw_weight(dist, dist_pow)
                        b_cands.append((int(v_idx), raw_w))
            else:
                no_body_cands_count += 1
                if i == 0 or i == Ng // 2:
                    print(f"[MeshCache] Vertex {i}: no body candidates. face_idx={closest_face_idx}, dist={dist_to_surface:.4f}")
            
            # Step 706-b: Garment candidates (1-ring neighbors)
            g_cands: List[Tuple[int, float]] = []
            for k in garment_adjacency[i]:
                dist = np.linalg.norm(g_pos - gt_pos[k])
                raw_w = self._raw_weight(dist, dist_pow)
                g_cands.append((int(k), raw_w))
            
            b_cands_list.append(b_cands)
            g_cands_list.append(g_cands)
        
        avg_body_dist /= Ng
        no_body_ratio = no_body_cands_count / Ng
        print(f"[MeshCache] Candidates: {no_body_cands_count}/{Ng} vertices have no body candidates ({no_body_ratio*100:.1f}%)")
        print(f"[MeshCache] Average body distance: {avg_body_dist:.4f}")
        
        if no_body_ratio > 0.1:
            print(f"[MeshCache] WARNING: {no_body_ratio*100:.1f}% vertices have no body candidates!")
            print("  → Body and garment may be misaligned. Check coordinate systems.")
        
        return b_cands_list, g_cands_list
    
    def _raw_weight(self, distance: float, p: float, eps: float = 1e-8) -> float:
        """Compute raw inverse-distance weight (Eq.[3][4])."""
        return 1.0 / (eps + distance) ** p
    
    def _normalize_weights_all(
        self,
        b_cands_list: List[List[Tuple[int, float]]],
        g_cands_list: List[List[Tuple[int, float]]],
        w_body: float,
        w_garment: float,
    ):
        """Normalize weights for all vertices (Step 708: Eq.[5][6][7])."""
        eps = 1e-10
        
        for i in range(len(b_cands_list)):
            b_cands = b_cands_list[i]
            g_cands = g_cands_list[i]
            
            b_sum = sum(w for _, w in b_cands)
            g_sum = sum(w for _, w in g_cands)
            
            has_body = len(b_cands) > 0 and b_sum > eps
            has_garment = len(g_cands) > 0 and g_sum > eps
            
            if not has_body and not has_garment:
                continue
            
            if not has_body:
                # Only garment — normalize to 1
                total = g_sum
                if total > eps:
                    g_cands_list[i] = [(idx, w / total) for idx, w in g_cands]
                continue
            
            if not has_garment:
                # Only body — normalize to 1
                total = b_sum
                if total > eps:
                    b_cands_list[i] = [(idx, w / total) for idx, w in b_cands]
                continue
            
            # Both present: scale each group separately, then renormalize total to 1
            total = w_body + w_garment
            if total > eps:
                b_cands_list[i] = [(idx, (w / b_sum) * w_body / total) for idx, w in b_cands]
                g_cands_list[i] = [(idx, (w / g_sum) * w_garment / total) for idx, w in g_cands]
    
    def _precompute_li(
        self,
        gt_pos: np.ndarray,
        bt_pos: np.ndarray,
        b_cands_list: List[List[Tuple[int, float]]],
        g_cands_list: List[List[Tuple[int, float]]],
    ) -> np.ndarray:
        """
        Precompute Li for all garment vertices (Step 710: Eq.[2]).
        Li = Gt[i] - (Σ Wb·Bt[j] + Σ Wg·Gt[k])
        """
        Ng = len(gt_pos)
        li = np.zeros((Ng, 3), dtype=np.float32)
        
        for i in range(Ng):
            sum_vec = np.zeros(3, dtype=np.float32)
            
            # Sum body candidate contributions
            for j, w in b_cands_list[i]:
                sum_vec += bt_pos[j] * w
            
            # Sum garment candidate contributions
            for k, w in g_cands_list[i]:
                sum_vec += gt_pos[k] * w
            
            li[i] = gt_pos[i] - sum_vec
        
        # Diagnostic
        li_mags = np.linalg.norm(li, axis=1)
        li_avg = np.mean(li_mags)
        li_max = np.max(li_mags)
        print(f"[MeshCache] Li: avg={li_avg:.3f}, max={li_max:.3f}")
        
        if li_avg < 1e-6:
            print("[MeshCache] WARNING: Li ≈ 0 → weight calculation may be incorrect")
        
        return li
