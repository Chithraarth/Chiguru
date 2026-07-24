const KEY = "manager_pairing";

export interface Pairing {
  code: string;
  farmName: string;
  managerName: string;
}

export function getPairing(): Pairing | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as Pairing;
    if (!p.code || !p.managerName) return null;
    return p;
  } catch {
    return null;
  }
}

export function savePairing(p: Pairing) {
  localStorage.setItem(KEY, JSON.stringify(p));
}

export function clearPairing() {
  localStorage.removeItem(KEY);
}
