import type { BuyGrade } from "@/lib/scout/types";

export const GRADE_LABEL: Record<BuyGrade, string> = {
  S: "S",
  A: "A",
  B: "B",
  PASS: "見送り",
};

const GRADE_CLASS: Record<BuyGrade, string> = {
  S: "bg-emerald-100 text-emerald-800 border-emerald-300",
  A: "bg-teal-100 text-teal-800 border-teal-300",
  B: "bg-amber-100 text-amber-800 border-amber-300",
  PASS: "bg-slate-100 text-slate-500 border-slate-300",
};

export default function GradeBadge({ grade }: { grade: BuyGrade }) {
  return (
    <span
      className={`inline-flex items-center justify-center min-w-[2.6rem] px-2 py-0.5 text-xs font-bold rounded-md border ${GRADE_CLASS[grade]}`}
    >
      {GRADE_LABEL[grade]}
    </span>
  );
}
