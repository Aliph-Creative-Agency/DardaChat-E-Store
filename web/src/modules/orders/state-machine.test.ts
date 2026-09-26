import { describe, expect, it } from "vitest";
import {
  allowedTransitions,
  assertTransition,
  canTransition,
  completionAllowed,
  FULFILMENT_STATES,
  FULFILMENT_TERMINAL,
  FULFILMENT_TRANSITIONS,
  PAYMENT_STATES,
  PAYMENT_TERMINAL,
  PAYMENT_TRANSITIONS,
  TransitionError,
  type FulfilmentState,
  type PaymentState,
} from "./state-machine";

describe("Appendix A transcription", () => {
  it("has the row counts of SRS v0.1 (A.2 = 30, A.4 = 14)", () => {
    expect(FULFILMENT_TRANSITIONS).toHaveLength(30);
    expect(PAYMENT_TRANSITIONS).toHaveLength(14);
    expect(FULFILMENT_STATES).toHaveLength(15);
    expect(PAYMENT_STATES).toHaveLength(9);
  });

  it("PENDING → CANCELLED appears twice with two distinct triggers", () => {
    const rows = FULFILMENT_TRANSITIONS.filter((t) => t.from === "PENDING" && t.to === "CANCELLED");
    expect(rows.map((r) => r.trigger).sort()).toEqual(["cancelled_before_payment", "reservation_expired"]);
  });

  it("PART_REFUNDED → PART_REFUNDED self-loop exists", () => {
    expect(canTransition("payment", "PART_REFUNDED", "PART_REFUNDED")).toBe(true);
  });

  it("REFUNDED is not a fulfilment state (A.1 note)", () => {
    expect((FULFILMENT_STATES as readonly string[]).includes("REFUNDED")).toBe(false);
  });

  it("every row uses declared states and has a trigger key", () => {
    for (const t of FULFILMENT_TRANSITIONS) {
      expect(FULFILMENT_STATES).toContain(t.from);
      expect(FULFILMENT_STATES).toContain(t.to);
      expect(t.trigger).toMatch(/^[a-z_]+$/);
    }
    for (const t of PAYMENT_TRANSITIONS) {
      expect(PAYMENT_STATES).toContain(t.from);
      expect(PAYMENT_STATES).toContain(t.to);
      expect(t.trigger).toMatch(/^[a-z_]+$/);
    }
  });

  it("(from, to, trigger) is unique in each table", () => {
    for (const rows of [FULFILMENT_TRANSITIONS, PAYMENT_TRANSITIONS] as const) {
      const keys = rows.map((t) => `${t.from}|${t.to}|${t.trigger}`);
      expect(new Set(keys).size).toBe(keys.length);
    }
  });
});

describe("fulfilment machine: exhaustive N×N", () => {
  const listed = new Set(FULFILMENT_TRANSITIONS.map((t) => `${t.from}>${t.to}`));
  for (const from of FULFILMENT_STATES) {
    for (const to of FULFILMENT_STATES) {
      const expected = listed.has(`${from}>${to}`);
      it(`${from} → ${to} ${expected ? "allowed" : "refused"}`, () => {
        expect(canTransition("fulfilment", from, to)).toBe(expected);
        if (!expected) {
          expect(() => assertTransition("fulfilment", from, to, { paymentState: "PAID" })).toThrow(TransitionError);
        }
      });
    }
  }

  it("every listed row is allowed with its own trigger", () => {
    for (const t of FULFILMENT_TRANSITIONS) {
      expect(canTransition("fulfilment", t.from, t.to, t.trigger)).toBe(true);
      expect(() => assertTransition("fulfilment", t.from, t.to, { trigger: t.trigger, paymentState: "PAID" })).not.toThrow();
    }
  });
});

describe("payment machine: exhaustive N×N", () => {
  const listed = new Set(PAYMENT_TRANSITIONS.map((t) => `${t.from}>${t.to}`));
  for (const from of PAYMENT_STATES) {
    for (const to of PAYMENT_STATES) {
      const expected = listed.has(`${from}>${to}`);
      it(`${from} → ${to} ${expected ? "allowed" : "refused"}`, () => {
        expect(canTransition("payment", from, to)).toBe(expected);
        if (!expected) expect(() => assertTransition("payment", from, to)).toThrow(TransitionError);
      });
    }
  }

  it("every listed row is allowed with its own trigger", () => {
    for (const t of PAYMENT_TRANSITIONS) {
      expect(() => assertTransition("payment", t.from, t.to, { trigger: t.trigger })).not.toThrow();
    }
  });
});

describe("terminals", () => {
  it("fulfilment terminals have no outgoing transitions", () => {
    expect([...FULFILMENT_TERMINAL].sort()).toEqual(["CANCELLED", "COMPLETED", "LOST_IN_TRANSIT"]);
    for (const s of FULFILMENT_TERMINAL) expect(allowedTransitions("fulfilment", s)).toEqual([]);
  });

  it("payment terminals have no outgoing transitions", () => {
    expect([...PAYMENT_TERMINAL].sort()).toEqual(["COD_CANCELLED", "REFUNDED", "WRITTEN_OFF"]);
    for (const s of PAYMENT_TERMINAL) expect(allowedTransitions("payment", s)).toEqual([]);
  });

  it("every non-terminal state has at least one way out", () => {
    for (const s of FULFILMENT_STATES) {
      if (!FULFILMENT_TERMINAL.has(s)) expect(allowedTransitions("fulfilment", s).length).toBeGreaterThan(0);
    }
    for (const s of PAYMENT_STATES) {
      if (!PAYMENT_TERMINAL.has(s)) expect(allowedTransitions("payment", s).length).toBeGreaterThan(0);
    }
  });
});

describe("DELIVERED → COMPLETED guard", () => {
  const allowed: PaymentState[] = ["PAID", "COD_SETTLED", "PART_REFUNDED", "REFUNDED", "COD_CANCELLED", "WRITTEN_OFF"];

  it.each(PAYMENT_STATES.map((s) => [s, allowed.includes(s)] as const))("payment %s → completion %s", (state, ok) => {
    expect(completionAllowed(state)).toBe(ok);
    const call = () => assertTransition("fulfilment", "DELIVERED", "COMPLETED", { paymentState: state });
    if (ok) expect(call).not.toThrow();
    else expect(call).toThrow(/does not allow completion/);
  });

  it("refuses completion when the payment state is not supplied", () => {
    expect(() => assertTransition("fulfilment", "DELIVERED", "COMPLETED")).toThrow(TransitionError);
  });
});

describe("trigger mismatch", () => {
  it("refuses a listed pair with the wrong trigger", () => {
    expect(canTransition("fulfilment", "PENDING", "PAID", "cod_accepted")).toBe(false);
    expect(() => assertTransition("fulfilment", "PENDING", "PAID", { trigger: "cod_accepted" })).toThrow(TransitionError);
    expect(canTransition("payment", "UNPAID", "PAID", "captured")).toBe(true);
    expect(canTransition("payment", "UNPAID", "PAID", "authorised")).toBe(false);
  });

  it("allowedTransitions lists both PENDING → CANCELLED rows", () => {
    const outs = allowedTransitions("fulfilment", "PENDING" as FulfilmentState);
    expect(outs.filter((t) => t.to === "CANCELLED")).toHaveLength(2);
    expect(outs).toHaveLength(5);
  });
});
