// ==UserScript==
// @name         تلوين من وإلى اصفر واخضر (المتابعة)
// @version      3.1
// @match        http://rasel/CTS/*
// @grant        none
// ==/UserScript==

(function() {
  'use strict';

  const currentUrl = window.location.href;
  if (currentUrl.includes('output=PDF')) {
    window.location.href = currentUrl.replace('output=PDF', 'output=HTML');
    return;
  }

  function highlightCellAndNeighbor() {
    const searchText = 'قطاع شمال مدينة الرياض - محمد عبدالله بن محمد الربيعه';
    const pages = document.querySelectorAll('.jrPage');

    pages.forEach(page => {
      const allDivs = page.querySelectorAll('div[dir="rtl"][style*="position:absolute"]');

      allDivs.forEach(div => {
        if (div.textContent.trim().includes(searchText)) {
          const targetTop = parseFloat(div.style.top);
          const targetLeft = parseFloat(div.style.left);

          // تلوين العنصر المطلوب نفسه (أصفر فقط بدون إطار)
          div.style.backgroundColor = '#ffeb3b';

          // البحث عن الخلية المجاورة (يسار العنصر) داخل نفس الصفحة فقط
          let closestLeftCell = null;
          let closestDistance = Infinity;

          allDivs.forEach(el => {
            const elTop = parseFloat(el.style.top);
            const elLeft = parseFloat(el.style.left);
            const sameRow = Math.abs(elTop - targetTop) < 2;

            if (sameRow && elLeft < targetLeft && targetLeft - elLeft < closestDistance) {
              closestDistance = targetLeft - elLeft;
              closestLeftCell = el;
            }
          });

          // تلوين الخلية المجاورة (أخضر بدون إطار)
          if (closestLeftCell) {
            closestLeftCell.style.backgroundColor = '#90ee90';
          }

          // تمرير الصفحة إلى العنصر المحدد
          div.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      });
    });
  }

  setTimeout(highlightCellAndNeighbor, 1200);
})();
