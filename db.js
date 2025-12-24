const KEY = "EXPENSE_PRO_V1";

function defaultState(){
  return {
    version: 1,
    transactions: [
      // type:
      //  - "once"         (จ่ายครั้งเดียวในเดือนนั้น)
      //  - "recurring"    (จ่ายประจำทุกเดือน)
      //  - "installment"  (ผ่อนเริ่มเดือน + จำนวนงวด)
      //
      // record schema:
      // { id, type, name, category, note, createdAt,
      //   month, amount }                         // once
      // { id, type, name, category, note, createdAt,
      //   amount }                                // recurring
      // { id, type, name, category, note, createdAt,
      //   startMonth, months, inputMode, total, monthly } // installment
    ],
    incomeByMonth: {
      // "2025-12": 25000
    }
  };
}

export function loadState(){
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaultState();
    const obj = JSON.parse(raw);
    if (!obj || typeof obj !== "object") return defaultState();
    if (!Array.isArray(obj.transactions)) obj.transactions = [];
    if (!obj.incomeByMonth || typeof obj.incomeByMonth !== "object") obj.incomeByMonth = {};
    return obj;
  } catch {
    return defaultState();
  }
}

export function saveState(state){
  localStorage.setItem(KEY, JSON.stringify(state));
}

export function exportBackup(){
  return JSON.stringify(loadState(), null, 2);
}

export function importBackup(text){
  const obj = JSON.parse(text);
  if (!obj || typeof obj !== "object") throw new Error("JSON ไม่ถูกต้อง");
  if (!Array.isArray(obj.transactions)) throw new Error("ต้องมี transactions เป็น array");
  if (!obj.incomeByMonth || typeof obj.incomeByMonth !== "object") obj.incomeByMonth = {};
  saveState(obj);
}

// helpers
export function uid(){
  return (crypto?.randomUUID?.() || ("id_"+Math.random().toString(16).slice(2)+Date.now()));
}

export function currentMonth(){
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
}

export function diffMonths(fromYYYYMM, toYYYYMM){
  const [fy,fm] = fromYYYYMM.split("-").map(Number);
  const [ty,tm] = toYYYYMM.split("-").map(Number);
  return (ty*12 + (tm-1)) - (fy*12 + (fm-1));
}

export function addMonths(yyyyMM, add){
  const [y,m] = yyyyMM.split("-").map(Number);
  const t = y*12 + (m-1) + add;
  const ny = Math.floor(t/12);
  const nm = (t%12)+1;
  return `${ny}-${String(nm).padStart(2,"0")}`;
}

export function round2(n){
  return Math.round((Number(n)+Number.EPSILON)*100)/100;
}

/**
 * Calculate payable amount for a given month from a transaction record.
 * returns number (0 if not active that month)
 */
export function payForMonth(tx, month){
  if (!tx) return 0;
  if (tx.type === "once"){
    return tx.month === month ? Number(tx.amount||0) : 0;
  }
  if (tx.type === "recurring"){
    return Number(tx.amount||0);
  }
  if (tx.type === "installment"){
    const start = tx.startMonth;
    const months = Number(tx.months||1);
    const idx = diffMonths(start, month);
    if (idx < 0 || idx > months-1) return 0;
    const mPay = Number(tx.monthly || 0) || round2(Number(tx.total||0)/months);
    return mPay;
  }
  return 0;
}
