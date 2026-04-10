import { describe, expect, it } from "vitest";
import {
  relaxOpenChainInteriorsTowardChordWhereBent2D,
  smoothOpenChainInteriorsLaplacian2D,
} from "./smoothChain2D";

describe("smoothOpenChainInteriorsLaplacian2D", () => {
  it("pulls a kink toward neighbors (open chain)", () => {
    const chain = [0, 1, 2, 3];
    const pts: Record<number, [number, number]> = {
      0: [0, 0],
      1: [1, 5],
      2: [2, 0],
      3: [3, 0],
    };
    const frozen = new Set<number>();
    const get = (li: number) => pts[li]!;
    const out = smoothOpenChainInteriorsLaplacian2D(chain, get, frozen, { iterations: 8, lambda: 0.5 });
    const p1 = out.get(1)!;
    expect(p1[1]).toBeLessThan(4);
    expect(p1[1]).toBeGreaterThan(0);
  });

  it("does not move frozen locals", () => {
    const chain = [0, 1, 2];
    const pts: Record<number, [number, number]> = {
      0: [0, 0],
      1: [5, 5],
      2: [10, 0],
    };
    const frozen = new Set([1]);
    const get = (li: number) => pts[li]!;
    const out = smoothOpenChainInteriorsLaplacian2D(chain, get, frozen, { iterations: 5, lambda: 0.5 });
    expect(out.has(1)).toBe(false);
  });
});

describe("relaxOpenChainInteriorsTowardChordWhereBent2D", () => {
  it("flattens a sharp V toward the chord", () => {
    const chain = [0, 1, 2, 3];
    const pts: Record<number, [number, number]> = {
      0: [0, 0],
      1: [1, 4],
      2: [2, 0],
      3: [3, 0],
    };
    const frozen = new Set<number>();
    const get = (li: number) => pts[li]!;
    const out = relaxOpenChainInteriorsTowardChordWhereBent2D(chain, get, frozen, {
      iterations: 6,
      blend: 0.5,
      cosStraightMin: 0.995,
    });
    const p1 = out.get(1)!;
    expect(p1[1]).toBeLessThan(3);
  });
});
