// ==UserScript==
// @name         نسخ أرقام المعاملات (المتابعة)
// @namespace    http://tampermonkey.net/
// @version      4.2
// @description  Alt+C ينسخ: رقم المعاملة + التاريخ الميلادي + الموضوع
// @match        http://rasel/CTS/*
// @run-at       document-end
// @grant        none
// ==/UserScript==

(() => {
  'use strict';

  const AR = '٠١٢٣٤٥٦٧٨٩۰۱۲۳۴۵۶۷۸۹';
  const toAscii = s => String(s||'').replace(/[٠-٩۰-۹]/g, c => String(AR.indexOf(c)%10));
  const cellText = td => (td?.getAttribute('title') || td?.textContent || '').replace(/\s+/g,' ').trim();

  const HIJ = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura',{year:'numeric',month:'numeric',day:'numeric',timeZone:'UTC'});
  const OUT = new Intl.DateTimeFormat('en-US',{year:'numeric',month:'2-digit',day:'2-digit',timeZone:'UTC'});

  function parseHijriDMY(s){
    const nums = (toAscii(s).match(/\d{1,4}/g)||[]).map(n=>+n);
    if (nums.length<3) return null;
    let [d,m,y]=nums;
    if (y<1000){ y=Math.max(...nums); const rest=nums.filter(v=>v!==y); [d,m]=rest; }
    return (d&&m&&y)?{d,m,y}:null;
  }

  function hijriToGregorian(hijriStr){
    const p = parseHijriDMY(hijriStr); if(!p) return '';
    const read = days => {
      const parts = HIJ.formatToParts(new Date(days*864e5));
      let y,m,d; for(const t of parts){ if(t.type==='year')y=+t.value; if(t.type==='month')m=+t.value; if(t.type==='day')d=+t.value; }
      return {y,m,d, date:new Date(days*864e5)};
    };
    let lo = Date.UTC(1900,0,1)/864e5, hi = Date.UTC(2100,11,31)/864e5;
    while(lo<=hi){
      const mid=(lo+hi>>1), h=read(mid);
      if(h.y<p.y || (h.y===p.y && (h.m<p.m || (h.m===p.m && h.d<p.d)))) lo=mid+1;
      else if(h.y>p.y || (h.y===p.y && (h.m>p.m || (h.m===p.m && h.d>p.d)))) hi=mid-1;
      else return OUT.format(h.date);
    }
    return '';
  }

  async function copyText(txt){
    try { return await navigator.clipboard.writeText(txt); }
    catch {
      const ta=document.createElement('textarea');
      ta.value=txt; ta.style.cssText='position:fixed;left:-9999px;top:0;opacity:0';
      document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove();
    }
  }

  function setup(doc){
    if(!doc.querySelector('#MailDataTable') || doc._installedCopy) return;
    doc._installedCopy = true;

    doc.addEventListener('keydown', async e=>{
      if(!(e.altKey && e.key.toLowerCase()==='c')) return;
      e.preventDefault();

      const checked = [...doc.querySelectorAll('#MailDataTable tbody tr input[type="checkbox"]:checked:not(#SelectAllCheckBox)')]
        .map(cb=>cb.closest('tr'));
      if(!checked.length) return alert('لم يتم تحديد معاملات!');

      const rows = [];
      for(const tr of checked){
        const td = tr.querySelectorAll('td');
        const num = cellText(td[2]);
        const subject = cellText(td[3]);
        const hijri = cellText(td[6]);
        const greg = hijriToGregorian(hijri);
        if(num && subject && greg) rows.push(`${num}\t${greg}\t${subject}`);
      }
      if(!rows.length) return alert('لا توجد بيانات صالحة للنسخ!');

      await copyText(rows.join('\n'));
      alert(`✓ تم نسخ ${rows.length} معاملة`);
    });
  }

  function scan(doc=document){
    setup(doc);
    doc.querySelectorAll('iframe').forEach(f=>{
      try{ f.contentDocument && setup(f.contentDocument); }catch{}
    });
  }

  scan();
  new MutationObserver(ms=>ms.forEach(m=>m.addedNodes.forEach(n=>{
    if(n.tagName==='IFRAME') setTimeout(()=>{ try{ n.contentDocument && setup(n.contentDocument); }catch{} },300);
  }))).observe(document.body,{childList:true,subtree:true});
})();
