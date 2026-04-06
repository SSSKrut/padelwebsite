import { describe, it, expect } from "vitest";
import { calculateEloRating, resultFromScores } from "../functions/lib/matchTable";

describe("matchTable utils", () => {
  it("derives result from scores", () => {
    expect(resultFromScores(6, 4)).toBe(1);
    expect(resultFromScores(4, 6)).toBe(0);
    expect(resultFromScores(6, 6)).toBe(0.5);
  });

  it("calculates Elo rating deltas with equal ratings", () => {
    const { ratingChange1, ratingChange2 } = calculateEloRating(1000, 1000, 1);
    expect(ratingChange1).toBe(0.5);
    expect(ratingChange2).toBe(-0.5);
  });
});
