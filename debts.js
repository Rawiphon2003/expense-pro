import { icon, money } from "./ui.js";
import { loadState, currentMonth, diffMonths, addMonths, round2 } from "./db.js";

setupNav();

const el = (id)=>document.getElementById(id);
const monthPicker = el("monthPicker");
const searchIn = el("search");
const sumMonthly = el("sumMonthly");
const activeCount = el("activeCount");
const maxEnd = el("maxEnd");
const tbody = el("tbody");
const countInfo = el("countInfo");

monthPicker.value = currentMonth();
render();

monthPicker.addEventListener("change", render);
searchIn.addEventListener("input", render);

function render(){
  const m = monthPicker.value || currentMonth();
  const q = (searchIn.value || "").trim().toLowerCase();

  const st = loadState();
  const debts = (st.transactions || [])
    .filter(t=>t.type==="installment")
    .filter(t=>(`${t.name} ${t.category||""}`).toLowerCase().includes(q))
    .map(t=>calc(t,m))
    .sort((a,b)=>a.remaining - b.remaining);

  const monthlySum = debts.reduce((s,x)=> s + (x.isActive ? x.monthly : 0), 0);
  const active = debts.filter(x=>x.isActive).length;
  const max = debts.length ? debts.reduce((mx,x)=> x.endMonth > mx ? x.endMonth : mx, debts[0].endMonth) : "-";

  sumMonthly.textContent = money(monthlySum);
  activeCount.textContent = String(active);
  maxEnd.textContent = max;

  tbody.innerHTML = debts.map(d => `
    <tr>
      <td>${esc(d.name)}${d.note ? `<div class="sub" style="margin-top:4px;">${esc(d.note)}</div>` : ""}</td>
      <td>${esc(d.category||"-")}</td>
      <td>${esc(d.startMonth)}</td>
      <td class="right">${d.months}</td>
      <td>${d.status}</td>
      <td class="right">${d.remaining}</td>
      <td>${esc(d.endMonth)}</td>
      <td class="right">${money(d.monthly)}</td>
      <td class="right">${money(d.remainingAmount)}</td>
    </tr>
  `).join("");

  countInfo.textContent = `เดือน ${m} • แสดง ${debts.length} รายการผ่อน`;
}

function calc(t, month){
  const start = t.startMonth;
  const months = Number(t.months||1);
  const monthly = Number(t.monthly || 0) || round2(Number(t.total||0)/months);
  const total = Number(t.total || round2(monthly*months));

  const idx = diffMonths(start, month);
  const endMonth = addMonths(start, months-1);

  let status = `<span class="badge">—</span>`;
  let remaining = 0;
  let isActive = false;

  if (idx < 0){
    status = `<span class="badge">ยังไม่เริ่ม</span>`;
    remaining = months;
    isActive = false;
  } else if (idx > months-1){
    status = `<span class="badge green">จบแล้ว</span>`;
    remaining = 0;
    isActive = false;
  } else {
    status = `<span class="badge red">งวด ${idx+1}/${months}</span>`;
    remaining = (months - (idx+1));
    isActive = true;
  }

  const remainingAmount = round2(remaining * monthly);

  return {
    name: t.name, category: t.category, note: t.note || "",
    startMonth: start, months, monthly,
    endMonth,
    status,
    remaining,
    remainingAmount,
    isActive,
    total
  };
}

function setupNav(){
  const nav = document.querySelector(".nav");
  nav.querySelector('[data-nav="dashboard"]').innerHTML = `${icon("dashboard")} Dashboard`;
  nav.querySelector('[data-nav="transactions"]').innerHTML = `${icon("list")} รายการ`;
  nav.querySelector('[data-nav="debts"]').innerHTML = `${icon("debt")} หนี้/ผ่อน`;
  nav.querySelectorAll("a").forEach(a=>{
    a.classList.toggle("active", (a.getAttribute("href")||"").includes("debts.html"));
  });
}

function esc(s){
  return String(s ?? "").replace(/[&<>"']/g, m => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  }[m]));
}
