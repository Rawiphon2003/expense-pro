import { icon, money, downloadText } from "./ui.js";
import { loadState, saveState, exportBackup, importBackup, uid, currentMonth, addMonths, diffMonths, round2, payForMonth } from "./db.js";

setupNav();

const el = (id)=>document.getElementById(id);
const monthPicker = el("monthPicker");
const searchIn = el("search");

const incomeView = el("incomeView");
const expenseView = el("expenseView");
const balanceView = el("balanceView");
const incomeInput = el("incomeInput");
const saveIncome = el("saveIncome");

const tbody = el("tbody");
const countInfo = el("countInfo");

const exportBtn = el("exportBtn");
const importBtn = el("importBtn");
const doImport = el("doImport");
const jsonBox = el("jsonBox");
const resetAll = el("resetAll");

// form
const typeChips = el("typeChips");
const modeChips = el("modeChips");

const nameIn = el("name");
const catIn = el("category");
const noteIn = el("note");

const boxOnce = el("boxOnce");
const boxRecurring = el("boxRecurring");
const boxInstallment = el("boxInstallment");

const onceMonth = el("onceMonth");
const onceAmount = el("onceAmount");

const recAmount = el("recAmount");

const startMonth = el("startMonth");
const monthsIn = el("months");
const totalField = el("totalField");
const monthlyField = el("monthlyField");
const totalAmount = el("totalAmount");
const monthlyAmount = el("monthlyAmount");
const instSummary = el("instSummary");

const saveTx = el("saveTx");
const cancelEdit = el("cancelEdit");

let editingId = null;

// init
monthPicker.value = currentMonth();
onceMonth.value = monthPicker.value;
startMonth.value = monthPicker.value;

render();
buildChips();

// events
monthPicker.addEventListener("change", ()=>{
  onceMonth.value = monthPicker.value;
  startMonth.value = monthPicker.value;
  render();
});
searchIn.addEventListener("input", render);

saveIncome.addEventListener("click", ()=>{
  const m = monthPicker.value || currentMonth();
  const v = Number(incomeInput.value);
  if (!Number.isFinite(v) || v < 0) return alert("กรุณาใส่รายรับเป็นตัวเลข (>=0)");
  const st = loadState();
  st.incomeByMonth[m] = v;
  saveState(st);
  render();
});

exportBtn.addEventListener("click", ()=>{
  const text = exportBackup();
  downloadText("expense-pro-backup.json", text);
});

importBtn.addEventListener("click", ()=>{
  jsonBox.focus();
  alert("วาง JSON แล้วกด Import");
});

doImport.addEventListener("click", ()=>{
  try{ importBackup(jsonBox.value); alert("Import สำเร็จ"); render(); }
  catch(e){ alert("Import ไม่สำเร็จ: " + (e?.message || "รูปแบบไม่ถูกต้อง")); }
});

resetAll.addEventListener("click", ()=>{
  if (!confirm("ล้างข้อมูลทั้งหมดใช่ไหม?")) return;
  const st = loadState();
  st.transactions = [];
  st.incomeByMonth = {};
  saveState(st);
  resetForm();
  render();
});

saveTx.addEventListener("click", upsertTx);
cancelEdit.addEventListener("click", ()=>resetForm());

tbody.addEventListener("click", (e)=>{
  const btn = e.target.closest("button");
  if (!btn) return;
  const act = btn.dataset.act;
  const id = btn.dataset.id;
  if (act === "edit") startEdit(id);
  if (act === "del") delTx(id);
});

[startMonth, monthsIn, totalAmount, monthlyAmount].forEach(x=>x.addEventListener("input", updateInstallmentSummary));

function buildChips(){
  typeChips.innerHTML = `
    <div class="chip active" data-type="once">${icon("list")} ครั้งเดียว</div>
    <div class="chip" data-type="recurring">${icon("list")} ประจำ</div>
    <div class="chip" data-type="installment">${icon("debt")} ผ่อน</div>
  `;
  modeChips.innerHTML = `
    <div class="chip active" data-mode="total">กรอกยอดรวม</div>
    <div class="chip" data-mode="monthly">กรอกค่างวด/เดือน</div>
  `;

  typeChips.addEventListener("click", (e)=>{
    const c = e.target.closest(".chip"); if (!c) return;
    setType(c.dataset.type);
  });
  modeChips.addEventListener("click", (e)=>{
    const c = e.target.closest(".chip"); if (!c) return;
    setMode(c.dataset.mode);
  });

  // labels buttons
  el("kIncome").innerHTML = `${icon("cash")} รายรับ`;
  el("kExpense").innerHTML = `${icon("info")} รายจ่ายรวม`;
  el("kBalance").innerHTML = `${icon("info")} คงเหลือ`;

  saveIncome.innerHTML = `${icon("save")} บันทึก`;
  exportBtn.innerHTML = `${icon("download")} Export`;
  importBtn.innerHTML = `${icon("upload")} Restore`;
  resetAll.innerHTML = `${icon("trash")} ล้างทั้งหมด`;
  saveTx.innerHTML = `${icon("plus")} เพิ่มรายการ`;
}

function currentType(){
  return [...typeChips.querySelectorAll(".chip")].find(x=>x.classList.contains("active"))?.dataset.type || "once";
}
function currentMode(){
  return [...modeChips.querySelectorAll(".chip")].find(x=>x.classList.contains("active"))?.dataset.mode || "total";
}

function setType(t){
  typeChips.querySelectorAll(".chip").forEach(x=>x.classList.toggle("active", x.dataset.type===t));
  boxOnce.style.display = (t==="once") ? "" : "none";
  boxRecurring.style.display = (t==="recurring") ? "" : "none";
  boxInstallment.style.display = (t==="installment") ? "" : "none";
  updateInstallmentSummary();
}

function setMode(m){
  modeChips.querySelectorAll(".chip").forEach(x=>x.classList.toggle("active", x.dataset.mode===m));
  totalField.style.display = (m==="total") ? "" : "none";
  monthlyField.style.display = (m==="monthly") ? "" : "none";
  updateInstallmentSummary();
}

function updateInstallmentSummary(){
  if (currentType() !== "installment") return;

  const sm = startMonth.value;
  const months = Number(monthsIn.value);
  const mode = currentMode();
  const total = Number(totalAmount.value);
  const monthly = Number(monthlyAmount.value);

  if (!sm || !Number.isInteger(months) || months<1){
    instSummary.textContent = "กรุณาเลือกเริ่มเดือน และจำนวนงวด";
    return;
  }

  let pay = 0;
  let totalCalc = 0;

  if (mode === "total"){
    if (!Number.isFinite(total) || total<=0){
      instSummary.textContent = "กรุณาใส่ยอดรวม";
      return;
    }
    pay = round2(total/months);
    totalCalc = total;
  }else{
    if (!Number.isFinite(monthly) || monthly<=0){
      instSummary.textContent = "กรุณาใส่ค่างวดต่อเดือน";
      return;
    }
    pay = round2(monthly);
    totalCalc = round2(monthly*months);
  }

  const endM = addMonths(sm, months-1);
  instSummary.textContent = `เริ่ม ${sm} • ${months} งวด • เดือนละ ${money(pay)} • หมดเดือน ${endM} • ยอดรวม ${money(totalCalc)}`;
}

function upsertTx(){
  const type = currentType();
  const name = nameIn.value.trim();
  const category = catIn.value.trim();
  const note = noteIn.value.trim();

  if (!name) return alert("กรุณาใส่ชื่อรายการ");

  const st = loadState();
  const now = new Date().toISOString();

  let tx = { id: editingId || uid(), type, name, category, note, createdAt: now };

  if (type === "once"){
    const m = onceMonth.value;
    const amt = Number(onceAmount.value);
    if (!m) return alert("เลือกเดือนที่จ่าย");
    if (!Number.isFinite(amt) || amt<=0) return alert("กรอกจำนวนเงิน (>0)");
    tx.month = m;
    tx.amount = round2(amt);
  }

  if (type === "recurring"){
    const amt = Number(recAmount.value);
    if (!Number.isFinite(amt) || amt<=0) return alert("กรอกจำนวนเงิน (>0)");
    tx.amount = round2(amt);
  }

  if (type === "installment"){
    const sm = startMonth.value;
    const months = Number(monthsIn.value);
    if (!sm) return alert("เลือกเริ่มเดือน");
    if (!Number.isInteger(months) || months<1) return alert("จำนวนงวดต้อง >= 1");

    const mode = currentMode();
    tx.startMonth = sm;
    tx.months = months;
    tx.inputMode = mode;

    if (mode === "total"){
      const total = Number(totalAmount.value);
      if (!Number.isFinite(total) || total<=0) return alert("กรอกยอดรวม");
      tx.total = round2(total);
      tx.monthly = round2(total/months);
    }else{
      const monthly = Number(monthlyAmount.value);
      if (!Number.isFinite(monthly) || monthly<=0) return alert("กรอกค่างวดต่อเดือน");
      tx.monthly = round2(monthly);
      tx.total = round2(monthly*months);
    }
  }

  if (editingId){
    const idx = st.transactions.findIndex(x=>x.id===editingId);
    if (idx>=0) st.transactions[idx] = tx;
  }else{
    st.transactions.push(tx);
  }

  saveState(st);
  resetForm();
  render();
}

function startEdit(id){
  const st = loadState();
  const tx = st.transactions.find(x=>x.id===id);
  if (!tx) return;

  editingId = id;
  nameIn.value = tx.name || "";
  catIn.value = tx.category || "";
  noteIn.value = tx.note || "";

  setType(tx.type || "once");

  if (tx.type === "once"){
    onceMonth.value = tx.month || monthPicker.value;
    onceAmount.value = String(tx.amount || 0);
  }
  if (tx.type === "recurring"){
    recAmount.value = String(tx.amount || 0);
  }
  if (tx.type === "installment"){
    startMonth.value = tx.startMonth || monthPicker.value;
    monthsIn.value = String(tx.months || 1);
    setMode(tx.inputMode === "monthly" ? "monthly" : "total");
    totalAmount.value = String(tx.total || 0);
    monthlyAmount.value = String(tx.monthly || 0);
    updateInstallmentSummary();
  }

  saveTx.innerHTML = `${icon("save")} บันทึกแก้ไข`;
  cancelEdit.style.display = "";
  window.scrollTo({top:0, behavior:"smooth"});
}

function delTx(id){
  const st = loadState();
  const tx = st.transactions.find(x=>x.id===id);
  if (!tx) return;
  if (!confirm(`ลบ "${tx.name}" ใช่ไหม?`)) return;
  st.transactions = st.transactions.filter(x=>x.id!==id);
  saveState(st);
  render();
}

function resetForm(){
  editingId = null;
  nameIn.value = "";
  catIn.value = "";
  noteIn.value = "";
  onceMonth.value = monthPicker.value || currentMonth();
  onceAmount.value = "";
  recAmount.value = "";
  startMonth.value = monthPicker.value || currentMonth();
  monthsIn.value = "12";
  totalAmount.value = "";
  monthlyAmount.value = "";

  // reset chips
  setType("once");
  setMode("total");

  saveTx.innerHTML = `${icon("plus")} เพิ่มรายการ`;
  cancelEdit.style.display = "none";
  updateInstallmentSummary();
}

function render(){
  const m = monthPicker.value || currentMonth();
  const st = loadState();
  const q = (searchIn.value || "").trim().toLowerCase();

  const income = Number(st.incomeByMonth[m] || 0);
  incomeInput.value = income ? String(income) : "";

  const rows = st.transactions
    .map(tx => toRow(tx, m))
    .filter(r => r.payThisMonth > 0 || r.activeBadge) // show active statuses
    .filter(r => (`${r.name} ${r.category}`).toLowerCase().includes(q))
    .sort((a,b)=> b.payThisMonth - a.payThisMonth);

  const expense = st.transactions.reduce((s,t)=> s + payForMonth(t,m), 0);
  const balance = income - expense;

  incomeView.textContent = money(income);
  expenseView.textContent = money(expense);
  balanceView.textContent = money(balance);
  balanceView.className = "v " + (balance>=0 ? "ok" : "bad");

  tbody.innerHTML = rows.map(r => `
    <tr>
      <td>${esc(r.name)}${r.note ? `<div class="sub" style="margin-top:4px;">${esc(r.note)}</div>` : ""}</td>
      <td>${esc(r.category || "-")}</td>
      <td>${r.typeBadge}</td>
      <td>${r.activeBadge}</td>
      <td class="right">${money(r.payThisMonth)}</td>
      <td class="actions">
        <button class="smallBtn btnPrimary" data-act="edit" data-id="${r.id}">${icon("edit")} แก้ไข</button>
        <button class="smallBtn btnDanger" data-act="del" data-id="${r.id}">${icon("trash")} ลบ</button>
      </td>
    </tr>
  `).join("");

  countInfo.textContent = `เดือน ${m} • แสดง ${rows.length} รายการ`;
}

function toRow(tx, month){
  const pay = payForMonth(tx, month);

  let typeBadge = `<span class="badge">${tx.type}</span>`;
  if (tx.type === "once") typeBadge = `<span class="badge blue">ครั้งเดียว</span>`;
  if (tx.type === "recurring") typeBadge = `<span class="badge green">ประจำ</span>`;
  if (tx.type === "installment") typeBadge = `<span class="badge red">ผ่อน</span>`;

  let activeBadge = `<span class="badge">—</span>`;

  if (tx.type === "once"){
    activeBadge = `<span class="badge">เดือน ${tx.month || "-"}</span>`;
  }
  if (tx.type === "recurring"){
    activeBadge = `<span class="badge green">ทุกเดือน</span>`;
  }
  if (tx.type === "installment"){
    const idx = diffMonths(tx.startMonth, month);
    const months = Number(tx.months||1);
    if (idx < 0) activeBadge = `<span class="badge">ยังไม่เริ่ม</span>`;
    else if (idx > months-1) activeBadge = `<span class="badge">จบแล้ว</span>`;
    else activeBadge = `<span class="badge red">งวด ${idx+1}/${months}</span>`;
  }

  return {
    id: tx.id,
    name: tx.name,
    category: tx.category || "",
    note: tx.note || "",
    typeBadge,
    activeBadge,
    payThisMonth: pay
  };
}

function setupNav(){
  const nav = document.querySelector(".nav");
  nav.querySelector('[data-nav="dashboard"]').innerHTML = `${icon("dashboard")} Dashboard`;
  nav.querySelector('[data-nav="transactions"]').innerHTML = `${icon("list")} รายการ`;
  nav.querySelector('[data-nav="debts"]').innerHTML = `${icon("debt")} หนี้/ผ่อน`;
  nav.querySelectorAll("a").forEach(a=>{
    a.classList.toggle("active", (a.getAttribute("href")||"").includes("transactions.html"));
  });
}

function esc(s){
  return String(s ?? "").replace(/[&<>"']/g, m => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  }[m]));
}
