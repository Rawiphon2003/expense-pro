import { icon, money, downloadText } from "./ui.js";
import {
  loadState,
  saveState,
  exportBackup,
  importBackup,
  currentMonth,
  payForMonth
} from "./db.js";

const el = (id) => document.getElementById(id);

setupNav();
setupLabels();

const monthPicker = el("monthPicker");
const incomeInput = el("incomeInput");
const saveIncomeBtn = el("saveIncome");

const incomeView = el("incomeView");
const expenseView = el("expenseView");
const balanceView = el("balanceView");

const pieLegend = el("pieLegend");
const pieCanvas = el("pie");

const exportBtn = el("exportBtn");
const openBackup = el("openBackup");

const topList = el("topList");
const barHint = el("barHint");

// modal
const modal = el("backupModal");
const jsonBox = el("jsonBox");
const doImport = el("doImport");
const copyJson = el("copyJson");
const importBtn = el("importBtn");

monthPicker.value = currentMonth();
render();

/* ===== Events ===== */
monthPicker.addEventListener("change", render);

saveIncomeBtn.addEventListener("click", () => {
  const m = monthPicker.value || currentMonth();
  const v = Number(incomeInput.value);
  if (!Number.isFinite(v) || v < 0) return alert("กรุณาใส่รายรับเป็นตัวเลข (>=0)");
  const st = loadState();
  st.incomeByMonth[m] = v;
  saveState(st);
  render();
});

exportBtn.addEventListener("click", () => {
  const text = exportBackup();
  downloadText("expense-pro-backup.json", text);
});

openBackup.addEventListener("click", () => {
  openModal();
  jsonBox.value = exportBackup();
  jsonBox.scrollTop = 0;
});

modal.addEventListener("click", (e) => {
  if (e.target?.dataset?.close) closeModal();
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeModal();
});

doImport.addEventListener("click", () => {
  try {
    importBackup(jsonBox.value);
    alert("Import สำเร็จ");
    render();
    closeModal();
  } catch (e) {
    alert("Import ไม่สำเร็จ: " + (e?.message || "JSON ไม่ถูกต้อง"));
  }
});

copyJson.addEventListener("click", async () => {
  const text = exportBackup();
  jsonBox.value = text;
  try {
    await navigator.clipboard.writeText(text);
    alert("คัดลอกแล้ว");
  } catch {
    alert("คัดลอกไม่สำเร็จ แต่ใส่ไว้ในกล่องให้แล้ว");
  }
});

importBtn.addEventListener("click", () => jsonBox.focus());

/* ===== Render ===== */
function render() {
  const m = monthPicker.value || currentMonth();
  const st = loadState();
  const txs = st.transactions || [];

  const income = Number(st.incomeByMonth[m] || 0);
  incomeInput.value = income ? String(income) : "";

  const expense = txs.reduce((s, t) => s + payForMonth(t, m), 0);
  const balance = income - expense;

  incomeView.textContent = money(income);
  expenseView.textContent = money(expense);
  balanceView.textContent = money(balance);
  balanceView.className = "v " + (balance >= 0 ? "ok" : "bad");

  // breakdown
  const once = txs.filter(t => t.type === "once").reduce((s,t)=>s+payForMonth(t,m),0);
  const recurring = txs.filter(t => t.type === "recurring").reduce((s,t)=>s+payForMonth(t,m),0);
  const installment = txs.filter(t => t.type === "installment").reduce((s,t)=>s+payForMonth(t,m),0);

  pieLegend.textContent =
    `ครั้งเดียว ${money(once)} • ประจำ ${money(recurring)} • ผ่อน ${money(installment)} • รวม ${money(expense)}`;

  drawDonut(pieCanvas, [
    { label: "ครั้งเดียว", value: once },
    { label: "ประจำ", value: recurring },
    { label: "ผ่อน", value: installment }
  ]);

  // top categories -> list
  const map = new Map();
  for (const t of txs) {
    const v = payForMonth(t, m);
    if (!v) continue;
    const k = (t.category || "ไม่ระบุหมวด").trim() || "ไม่ระบุหมวด";
    map.set(k, (map.get(k) || 0) + v);
  }
  const top = [...map.entries()].sort((a,b)=>b[1]-a[1]).slice(0,8);
  barHint.textContent = top.length ? `Top ${top.length} หมวด` : "ยังไม่มีข้อมูล";
  renderTopList(top);
}

/* ===== Donut chart (balanced + card legend) ===== */
function drawDonut(canvas, slices) {
  const ctx = canvas.getContext("2d");
  const w = canvas.width, h = canvas.height;
  ctx.clearRect(0,0,w,h);

  const total = slices.reduce((s,x)=>s+x.value,0);
  if (!total) {
    ctx.fillStyle="#64748b";
    ctx.font="16px system-ui";
    ctx.fillText("ยังไม่มีข้อมูลในเดือนนี้", 20, 28);
    return;
  }

  // Layout: donut center-left but bigger + legend card on right
  const cx = w * 0.34;
  const cy = h * 0.55;
  const outerR = Math.min(w,h) * 0.34;  // ✅ ใหญ่ขึ้น
  const innerR = outerR * 0.62;         // ✅ donut
  let start = -Math.PI/2;

  const colors = ["#2563eb", "#10b981", "#f59e0b"];
  const legend = slices.map((s,i)=>({
    label: s.label,
    value: s.value,
    pct: (s.value/total)*100,
    color: colors[i%colors.length]
  }));

  // Draw donut slices
  legend.forEach((it,i)=>{
    const ang = (it.value/total) * Math.PI*2;

    ctx.beginPath();
    ctx.arc(cx,cy,outerR,start,start+ang);
    ctx.arc(cx,cy,innerR,start+ang,start,true);
    ctx.closePath();
    ctx.fillStyle = it.color;
    ctx.fill();

    // soft divider
    ctx.strokeStyle = "rgba(255,255,255,.95)";
    ctx.lineWidth = 2;
    ctx.stroke();

    start += ang;
  });

  // Center text
  ctx.fillStyle = "rgba(15,23,42,.85)";
  ctx.textAlign = "center";
  ctx.font = "700 13px system-ui";
  ctx.fillText("รายจ่ายรวม", cx, cy-10);
  ctx.fillStyle = "#0f172a";
  ctx.font = "900 22px system-ui";
  ctx.fillText(money(total), cx, cy+18);

  // Legend card on the right
  const cardX = w * 0.58;
  const cardY = h * 0.22;
  const cardW = w * 0.36;
  const rowH = 30;
  const cardH = rowH * legend.length + 22;

  // card background
  ctx.fillStyle = "rgba(255,255,255,.92)";
  ctx.strokeStyle = "rgba(15,23,42,.10)";
  ctx.lineWidth = 1;
  roundRect(ctx, cardX, cardY, cardW, cardH, 14);
  ctx.fill();
  ctx.stroke();

  // rows
  ctx.textAlign = "left";
  legend.forEach((it, idx)=>{
    const y = cardY + 16 + idx*rowH;

    // dot
    ctx.fillStyle = it.color;
    roundRect(ctx, cardX + 12, y-9, 12, 12, 4);
    ctx.fill();

    // label
    ctx.fillStyle = "rgba(15,23,42,.85)";
    ctx.font = "800 13px system-ui";
    ctx.fillText(it.label, cardX + 30, y+2);

    // value
    ctx.fillStyle = "rgba(15,23,42,.55)";
    ctx.font = "700 12px system-ui";
    ctx.fillText(`${money(it.value)} (${it.pct.toFixed(0)}%)`, cardX + 120, y+2);
  });
}

/* ===== Top list ===== */
function renderTopList(entries){
  if (!entries.length){
    topList.innerHTML = `<div class="topEmpty">ยังไม่มีข้อมูลในเดือนนี้</div>`;
    return;
  }
  const maxV = Math.max(...entries.map(e=>e[1])) || 1;

  topList.innerHTML = entries.map(([name,val],i)=>{
    const pct = (val/maxV)*100;
    const cls = i===0 ? "rank1" : i===1 ? "rank2" : i===2 ? "rank3" : "rankN";

    return `
      <div class="topRow">
        <div class="topLeft">
          <div class="topName">${escapeHtml(name)}</div>
          <div class="topMeta">${money(val)} บาท</div>
        </div>

        <div class="topBarWrap" aria-label="progress">
          <div class="topBar ${cls}" style="width:${pct}%"></div>
        </div>

        <div class="topRight">${money(val)}</div>
      </div>
    `;
  }).join("");
}

/* ===== Modal ===== */
function openModal(){
  modal.classList.remove("hidden");
  modal.setAttribute("aria-hidden","false");
}
function closeModal(){
  modal.classList.add("hidden");
  modal.setAttribute("aria-hidden","true");
}

/* ===== Helpers ===== */
function roundRect(ctx, x, y, w, h, r){
  const rr = Math.min(r, w/2, h/2);
  ctx.beginPath();
  ctx.moveTo(x+rr, y);
  ctx.arcTo(x+w, y, x+w, y+h, rr);
  ctx.arcTo(x+w, y+h, x, y+h, rr);
  ctx.arcTo(x, y+h, x, y, rr);
  ctx.arcTo(x, y, x+w, y, rr);
  ctx.closePath();
}
function escapeHtml(s){
  return String(s ?? "").replace(/[&<>"']/g, m => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  }[m]));
}

function setupNav() {
  const nav = document.querySelector(".nav");
  nav.querySelector('[data-nav="dashboard"]').innerHTML = `${icon("dashboard")} Dashboard`;
  nav.querySelector('[data-nav="transactions"]').innerHTML = `${icon("list")} รายการ`;
  nav.querySelector('[data-nav="debts"]').innerHTML = `${icon("debt")} หนี้/ผ่อน`;
  nav.querySelectorAll("a").forEach(a => {
    a.classList.toggle("active", a.href.includes("dashboard.html"));
  });
}

function setupLabels() {
  el("kIncome").innerHTML = `${icon("cash")} รายรับ`;
  el("kExpense").innerHTML = `${icon("info")} รายจ่ายรวม`;
  el("kBalance").innerHTML = `${icon("info")} คงเหลือ`;

  el("saveIncome").innerHTML = `${icon("save")} บันทึก`;
  el("exportBtn").innerHTML = `${icon("download")} Export`;
  el("openBackup").innerHTML = `${icon("upload")} Backup/Restore`;
}
