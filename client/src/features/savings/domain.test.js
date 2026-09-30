import { describe, expect, it } from "vitest";
import { buildHistory, computePots } from "./domain";

const saving = (id, tag, amount, deduct = true) => ({
  id,
  tag,
  amount,
  type_kind: "saving",
  deduct_from_balance: deduct,
  date: "2026-09-01",
  created_at: "2026-09-01T10:00:00.000Z",
});
const move = (key, flow, pot, amount, account = "savings") => ({
  key,
  flow,
  account,
  pot,
  amount,
  title: `Move ${key}`,
  date: "2026-09-10",
  created_at: "2026-09-10T10:00:00.000Z",
});

describe("computePots with movements", () => {
  it("money out is used from the pot, money in is saved but not from the balance", () => {
    const pots = computePots(
      [saving(1, "Trip", 8000), saving(2, "Emergency", 12000)],
      [{ tag: "Trip", amount: 1000 }],
      [move("a", "out", "Trip", 5000), move("b", "in", "Emergency", 3000), move("c", "in", null, 999, "balance")]
    );
    expect(pots.find((p) => p.tag === "Trip")).toMatchObject({ saved: 8000, used: 6000, remaining: 2000 });
    expect(pots.find((p) => p.tag === "Emergency")).toMatchObject({ saved: 15000, notFromBalance: 3000, remaining: 15000 });
    expect(pots).toHaveLength(2);
  });

  it("money in can start a new pot", () => {
    expect(computePots([], [], [move("a", "in", "Gift", 2000)])).toEqual([
      { tag: "Gift", saved: 2000, fromBalance: 0, notFromBalance: 2000, used: 0, remaining: 2000 },
    ]);
  });
});

describe("buildHistory with movements", () => {
  it("adds savings movements to the timeline and filters them by pot", () => {
    const history = buildHistory([saving(1, "Trip", 8000)], [], [move("a", "out", "Trip", 5000), move("b", "in", "Gift", 100)], "Trip");
    expect(history.map((e) => [e.entry, e.amount])).toEqual([
      ["movement", 5000],
      ["deposit", 8000],
    ]);
    expect(history[0]).toMatchObject({ title: "Move a", flow: "out", tag: "Trip" });
  });
});
