import { describe, expect, it } from "vitest";
import { cn } from "./cn";

describe("cn", () => {
  it("joins conditional classes", () => {
    expect(cn("a", false && "b", undefined, ["c"], { d: true, e: false })).toBe("a c d");
  });

  it("lets later Tailwind classes win", () => {
    expect(cn("px-3 bg-brand", "px-5 bg-surface")).toBe("px-5 bg-surface");
  });

  it("knows the custom theme tokens", () => {
    // font size + colour are different groups: both survive
    expect(cn("text-display", "text-brand")).toBe("text-display text-brand");
    expect(cn("rounded-control", "rounded-card")).toBe("rounded-card");
    expect(cn("shadow-card", "shadow-lift")).toBe("shadow-lift");
    expect(cn("max-w-page", "max-w-prose")).toBe("max-w-prose");
    expect(cn("duration-fast", "duration-slow")).toBe("duration-slow");
  });
});
