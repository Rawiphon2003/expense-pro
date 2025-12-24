export function icon(name){
  const common = `class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"`;
  const icons = {
    dashboard: `<svg ${common}><path d="M3 3h8v10H3z"/><path d="M13 3h8v6h-8z"/><path d="M13 11h8v10h-8z"/><path d="M3 15h8v6H3z"/></svg>`,
    list: `<svg ${common}><path d="M8 6h13"/><path d="M8 12h13"/><path d="M8 18h13"/><path d="M3 6h.01"/><path d="M3 12h.01"/><path d="M3 18h.01"/></svg>`,
    debt: `<svg ${common}><path d="M12 1v22"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7H14a3.5 3.5 0 0 1 0 7H6"/></svg>`,
    plus: `<svg ${common}><path d="M12 5v14"/><path d="M5 12h14"/></svg>`,
    save: `<svg ${common}><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><path d="M17 21v-8H7v8"/><path d="M7 3v5h8"/></svg>`,
    upload: `<svg ${common}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M17 8l-5-5-5 5"/><path d="M12 3v12"/></svg>`,
    download: `<svg ${common}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M7 10l5 5 5-5"/><path d="M12 15V3"/></svg>`,
    trash: `<svg ${common}><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>`,
    edit: `<svg ${common}><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/></svg>`,
    info: `<svg ${common}><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>`,
    cash: `<svg ${common}><path d="M2 7h20v10H2z"/><path d="M6 7v10"/><path d="M18 7v10"/><path d="M12 10a2 2 0 1 0 0 4a2 2 0 1 0 0-4z"/></svg>`,
  };
  return icons[name] || "";
}

export function setActiveNav(path){
  document.querySelectorAll(".nav a").forEach(a=>{
    const href = a.getAttribute("href") || "";
    a.classList.toggle("active", href.includes(path));
  });
}

export function money(n){
  const fmt = new Intl.NumberFormat("th-TH",{minimumFractionDigits:2, maximumFractionDigits:2});
  return fmt.format(Number(n||0));
}

export function downloadText(filename, text){
  const blob = new Blob([text], {type:"application/json;charset=utf-8"});
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(a.href);
}
