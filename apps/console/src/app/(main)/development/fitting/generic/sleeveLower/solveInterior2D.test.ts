import { describe, expect, it } from "vitest";
import { buildSolveRequestFromPaths, solveLowerSleeveInteriorFromRest } from "./index";

describe("solveLowerSleeveInteriorFromRest", () => {
  it("preserves straight interior under uniform chord stretch", () => {
    const ptsRest: [number, number][] = [
      [0, 0],
      [5, 0],
      [10, 0],
    ];
    const ptsAfterUpper: [number, number][] = [
      [0, 0],
      [10, 0],
      [20, 0],
    ];
    const req = buildSolveRequestFromPaths({
      chainLocal: [0, 1, 2],
      ptsRest,
      ptsAfterUpper,
      bodyLocal: 0,
      junctionLocal: 2,
      frozen: new Set([1]),
    });
    const { updates } = solveLowerSleeveInteriorFromRest(req);
    expect(updates.size).toBe(0);
  });

  it("maps interior with per-vertex (s,o) when chord doubles and body stays", () => {
    const ptsRest: [number, number][] = [
      [0, 0],
      [5, 3],
      [10, 0],
    ];
    const ptsAfterUpper: [number, number][] = [
      [0, 0],
      [10, 0],
      [20, 0],
    ];
    const req = buildSolveRequestFromPaths({
      chainLocal: [0, 1, 2],
      ptsRest,
      ptsAfterUpper,
      bodyLocal: 0,
      junctionLocal: 2,
      frozen: new Set(),
    });
    const { updates } = solveLowerSleeveInteriorFromRest(req);
    expect(updates.get(1)).toBeDefined();
    const p = updates.get(1)!;
    expect(p[0]).toBeCloseTo(10, 5);
    expect(p[1]).toBeCloseTo(6, 5);
  });
});
