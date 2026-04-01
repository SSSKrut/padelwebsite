import { describe, it, expect } from "vitest";
import { abbreviateLastName, publicName } from "../functions/lib/sanitize";

describe("abbreviateLastName", () => {
  it("takes leading consonant cluster for Latin names", () => {
    expect(abbreviateLastName("Schmidt")).toBe("Schm.");
    expect(abbreviateLastName("Brown")).toBe("Br.");
    expect(abbreviateLastName("Clark")).toBe("Cl.");
    expect(abbreviateLastName("Smith")).toBe("Sm.");
    expect(abbreviateLastName("Thompson")).toBe("Th.");
  });

  it("takes only first letter when name starts with a vowel", () => {
    expect(abbreviateLastName("Anderson")).toBe("A.");
    expect(abbreviateLastName("Evans")).toBe("E.");
    expect(abbreviateLastName("O'Brien")).toBe("O.");
  });

  it("handles Cyrillic names", () => {
    expect(abbreviateLastName("Иванов")).toBe("И.");
    expect(abbreviateLastName("Шмидт")).toBe("Шм.");
    expect(abbreviateLastName("Браун")).toBe("Бр.");
    expect(abbreviateLastName("Кравченко")).toBe("Кр.");
  });

  it("handles single character names", () => {
    expect(abbreviateLastName("A")).toBe("A.");
    expect(abbreviateLastName("K")).toBe("K.");
  });

  it("returns empty string for empty input", () => {
    expect(abbreviateLastName("")).toBe("");
  });
});

describe("publicName", () => {
  it("combines first name with abbreviated last name", () => {
    expect(publicName("John", "Schmidt")).toBe("John Schm.");
    expect(publicName("Anna", "Ivanova")).toBe("Anna I.");
    expect(publicName("Lao", "Ai")).toBe("Lao A.");
  });

  it("handles empty last name", () => {
    expect(publicName("John", "")).toBe("John");
  });
});
