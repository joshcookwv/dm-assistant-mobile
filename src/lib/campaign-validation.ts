export type PcValidation =
  | { ok: true; maxHp: number; ac: number }
  | { ok: false; field: "name" | "maxHp" | "ac" };

export function validateCampaignPc(form: {
  name: string;
  maxHp: string;
  ac: string;
}): PcValidation {
  if (!form.name.trim()) return { ok: false, field: "name" };
  if (!form.maxHp.trim()) return { ok: false, field: "maxHp" };
  if (!form.ac.trim()) return { ok: false, field: "ac" };

  const maxHp = Number(form.maxHp);
  if (!Number.isInteger(maxHp) || maxHp < 1) return { ok: false, field: "maxHp" };

  const ac = Number(form.ac);
  if (!Number.isInteger(ac) || ac < 0) return { ok: false, field: "ac" };

  return { ok: true, maxHp, ac };
}
