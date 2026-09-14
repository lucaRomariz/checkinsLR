"use client";
import { useState } from "react";
import dynamic from "next/dynamic";
const VerseCard = dynamic(() => import("./VerseCard"));
const CoupleStreak = dynamic(() => import("./CoupleStreak"));
export default function Inspiration() {
  const [open, setOpen] = useState(false);
  return (
    <section className="border-b border-border/60 py-3">
      <button
        aria-expanded={open}
        className="px-5 text-sm text-muted"
        onClick={() => setOpen((v) => !v)}
      >
        {open ? "−" : "+"} Nosso momento: versículo e sequência juntos
      </button>
      {open && (
        <>
          <CoupleStreak />
          <VerseCard />
        </>
      )}
    </section>
  );
}
