import { useEffect, useState } from "react";
import { fetchCreditCards } from "./api";
import { billTag } from "./domain";

// The "Paying a credit card bill" switch for the expense form: one tag per
// card ("HDFC Regalia bill"). Empty until the cards load, or with no cards.
export function useCardBillTags() {
  const [cards, setCards] = useState([]);

  useEffect(() => {
    let live = true;
    fetchCreditCards()
      .then((rows) => live && setCards(rows))
      .catch(() => live && setCards([]));
    return () => {
      live = false;
    };
  }, []);

  if (!cards.length) return [];
  return [
    {
      id: "card-bill",
      kind: "expense",
      label: "Paying a credit card bill",
      info: "cardBills",
      pickLabel: "Which card?",
      tags: cards.map((c) => ({ tag: billTag(c.name), label: c.name })),
    },
  ];
}
