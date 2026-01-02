// ==UserScript==
// @name         تلوين من وإلى اصفر واخضر (المتابعة) ايقونة*****
// @version      3.9
// @match        http://rasel/CTS/*
// @grant        none
// ==/UserScript==
(function() {
  'use strict';

  const currentUrl = window.location.href;

  // فقط في صفحات VisualTrackingReport
  if (!currentUrl.includes('code=VisualTrackingReport')) {
    return;
  }

  // إنشاء الزر
  const btn = document.createElement('button');
  btn.textContent = '🔍 تمييز المتابعة';
  btn.style.cssText = 'position:fixed;top:10px;right:10px;z-index:9999;padding:8px 16px;background:#4CAF50;color:#fff;border:none;border-radius:5px;cursor:pointer;font-size:14px;';
  document.body.appendChild(btn);

  // تحديث شكل الزر إذا كنا في وضع HTML
  if (currentUrl.includes('autoHighlight=true')) {
    btn.textContent = '↩️ العودة لـ PDF';
    btn.style.background = '#f44336';
  }

  function addGlowEffect(element, color) {
    element.style.transition = 'box-shadow 0.3s ease';
    element.style.boxShadow = '0 0 20px 5px ' + color;
    setTimeout(function() {
      element.style.boxShadow = '';
    }, 1500);
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
          div.style.backgroundColor = '#ffeb3b';

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

          if (closestLeftCell) {
            closestLeftCell.style.backgroundColor = '#90ee90';
          }

          div.scrollIntoView({ behavior: 'smooth', block: 'center' });
          setTimeout(function() {
            addGlowEffect(div, '#ffeb3b');
            if (closestLeftCell) {
              addGlowEffect(closestLeftCell, '#90ee90');
            }
          }, 500);
        }
      });
    });
  }

  // إذا جاء من تحويل، نفذ التمييز تلقائياً
  if (currentUrl.includes('autoHighlight=true')) {
    setTimeout(highlightCellAndNeighbor, 1200);
  }

  btn.addEventListener('click', function() {
    if (currentUrl.includes('output=PDF')) {
      window.location.href = currentUrl.replace('output=PDF', 'output=HTML') + '&autoHighlight=true';
    } else {
      window.location.href = currentUrl.replace('output=HTML', 'output=PDF').replace('&autoHighlight=true', '');
    }
  });
})();
