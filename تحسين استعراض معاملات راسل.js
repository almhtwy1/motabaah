// ==UserScript==
// @name         تحسين استعراض معاملات راسل
// @namespace    http://rasel/CTS/
// @version      3.0
// @description  تحسينات تبويبات راسل
// @match        http://rasel/CTS/*
// @grant        none
// ==/UserScript==

(() => {
  // ======= تحسينات التبويبات =======
  const reverseDate = (text) => {
    text = text.replace(/(\d{1,2})\/(\d{1,2})\/(\d{4})/g, '$3/$2/$1');
    text = text.replace(/(\d{1,2})-(\d{1,2})-(\d{4})/g, '$3-$2-$1');
    return text;
  };

  if (location.href.includes('DynamicAttributes')) {
    const ids = ['FOLDER_HIJRIDUEDATE', 'FOLDER_DUEDATE', 'EXTERNAL_REF_DATE', 'EXTERNAL_REF_DATE_HIJRI'];
    const fix = () => {
      const any = ids.map(id => document.getElementById(id)).find(el => el?.value);
      if (!any || any.dataset.fixed) return;
      any.dataset.fixed = '1';
      observer.disconnect();
      ids.forEach(id => {
        const el = document.getElementById(id);
        if (!el || !el.value) return;
        const reversed = el.value.replace(/(\d{1,2})\/(\d{1,2})\/(\d{4})/g, '$3/$2/$1');
        if (reversed === el.value) return;

        // لا نعدل el.value إطلاقاً (الحقل readonly ومرتبط بـ relatedfield وبـ onChangeDate)
        // بدلاً من ذلك نعرض طبقة نصية فوق الحقل بصيغة معكوسة للعرض فقط
        const parent = el.parentElement;
        if (parent) parent.style.position = 'relative';

        const overlay = document.createElement('span');
        overlay.textContent = reversed;
        overlay.className = 'p-date-overlay';
        overlay.style.cssText = 'position:absolute; inset:0; display:flex; align-items:center; padding-inline-start:8px; background:inherit; pointer-events:none; z-index:1;';
        el.style.color = 'transparent';
        el.insertAdjacentElement('afterend', overlay);
      });
    };
    const observer = new MutationObserver(fix);
    observer.observe(document.documentElement, { childList: true, subtree: true });
    fix();
    return;
  }

  if (location.href.includes('VisualTrackList')) {
    const fix = () => {
      const hasDates = document.querySelector('#table td.trimText[title*="/"], #table td.trimText[title*="-"]');
      if (!hasDates) return;
      const table = document.getElementById('table');
      if (table.dataset.fixed) return;
      table.dataset.fixed = '1';
      observer.disconnect();
      table.querySelectorAll('td.trimText').forEach(td => {
        const original = td.getAttribute('title') || '';
        const reversed = reverseDate(original);
        if (reversed !== original) {
          td.setAttribute('title', reversed);
          td.textContent = reversed;
        }
      });
    };
    const observer = new MutationObserver(fix);
    observer.observe(document.documentElement, { childList: true, subtree: true });
    fix();
    return;
  }

  if (!location.href.includes('Attachements') && !location.href.includes('Tasks') && !location.href.includes('VisualTrackList') && !location.href.includes('DynamicAttributes')) return;

  const style = document.createElement('style');
  style.textContent = location.href.includes('Tasks')
    ? 'body { visibility: hidden; }'
    : '#jstreeInbox { visibility: hidden; }';
  document.head.appendChild(style);

  if (location.href.includes('Tasks')) {
    const wait = setInterval(() => {
      if (document.querySelector('td[style*="word-break"]')) {
        clearInterval(wait);
        setTimeout(() => {
          document.querySelectorAll('td[style*="word-break"]').forEach(td => {
            const textNode = td.childNodes[0];
            if (textNode?.nodeType === 3 && textNode.textContent.trim() !== '-----') {
              textNode.textContent = reverseDate(textNode.textContent);
            }
          });
          document.querySelectorAll('tbody tr td:first-child').forEach(td => {
            const text = td.textContent.trim();
            const colors = { 'استلام': '#c8e6c9', 'إغلاق': '#ffcdd2', 'إعادة تشغيل': '#bbdefb', 'صندوق العرض': '#ffe082' };
            const entry = Object.entries(colors).find(([k]) => text.includes(k));
            if (entry) {
              const span = document.createElement('span');
              span.textContent = text;
              span.style.cssText = `background:${entry[1]}; padding:2px 6px; border-radius:4px;`;
              td.textContent = '';
              td.appendChild(span);
            }
          });
          style.textContent = 'body { visibility: visible; }';
        }, 300);
      }
    }, 200);
    setTimeout(() => clearInterval(wait), 30000);
    return;
  }

  const toTime12 = (time) => {
    let [h, m, s] = time.split(':').map(Number);
    const ampm = h >= 12 ? 'م' : 'ص';
    h = h % 12 || 12;
    return `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')} ${ampm}`;
  };

  const run = () => {
    const tree = document.getElementById('jstreeInbox');
    if (!tree) return;
    tree.querySelectorAll('ul.jstree-children').forEach(ul => {
      const pid = ul.parentElement?.id;
      if (pid === 'jstreeInbox' || pid === 'folder_1S') return;
      [...ul.children]
        .sort((a, b) => parseInt(b.id.replace(/\D/g,'') || 0) - parseInt(a.id.replace(/\D/g,'') || 0))
        .forEach(li => ul.appendChild(li));
    });
    tree.querySelectorAll('a.jstree-anchor').forEach(a => {
      a.style.cssText += 'white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:90%;';
      a.childNodes.forEach(node => {
        if (node.nodeType === 3 && node.textContent.trim()) {
          let text = node.textContent
            .replaceAll('_', ' ')
            .replace(/[a-f0-9]{40,}(\.temp2)?\.pdf/i, 'وزارة البلديات والإسكان')
            .replace(/\S+\.(pdf|doc|docx|xlsx|xls|png|jpg|jpeg)\s*/gi, '')
            .trim();

          const match = text.match(/(\d+)[\/\-](\d+)[\/\-](\d+)\s+(\d+)[:\-](\d+)[:\-](\d+)/);
          const matchDateOnly = !match && text.match(/(\d+)[\/\-](\d+)[\/\-](\d+)/);

          if (match) {
            const datetime = `${match[3]}/${match[2]}/${match[1]} ${toTime12(`${match[4]}:${match[5]}:${match[6]}`)}`;
            const title = text.replace(match[0], '').replace(/\s+/g, ' ').trim();
            const titleNode = document.createTextNode(title + ' ');
            const dateSpan = document.createElement('span');
            dateSpan.textContent = datetime;
            dateSpan.style.cssText = 'color:#aaa; font-size:0.85em;';
            node.replaceWith(titleNode);
            titleNode.after(dateSpan);
          } else if (matchDateOnly) {
            const date = `${matchDateOnly[3]}/${matchDateOnly[2]}/${matchDateOnly[1]}`;
            const title = text.replace(matchDateOnly[0], '').replace(/\s+/g, ' ').trim();
            const titleNode = document.createTextNode(title + ' ');
            const dateSpan = document.createElement('span');
            dateSpan.textContent = date;
            dateSpan.style.cssText = 'color:#aaa; font-size:0.85em;';
            node.replaceWith(titleNode);
            titleNode.after(dateSpan);
          } else {
            node.textContent = text;
          }
        }
      });
    });
    const a1 = document.getElementById('folder_1S_anchor');
    const a2 = document.getElementById('folder_2S_anchor');
    if (a1) a1.style.background = '#c8e6c9';
    if (a2) a2.style.background = '#bbdefb';
    tree.querySelectorAll('li[id^="folder_"]').forEach(li => {
      if (li.id === 'folder_1S' || li.id === 'folder_2S') return;
      const anchor = li.querySelector(':scope > a.jstree-anchor');
      if (anchor) anchor.style.background = '#ffe082';
    });
    style.textContent = '#jstreeInbox { visibility: visible; }';
  };

  const wait = setInterval(() => {
    const tree = document.getElementById('jstreeInbox');
    if (!tree) return;
    // إذا فيه ملفات فعلية أو الشجرة انتهت من التحميل (busy=false) بدون ملفات، ننفذ run()
    const hasFiles = tree.querySelector('li[id^="file_"]');
    const finishedLoading = tree.getAttribute('aria-busy') === 'false' && tree.querySelector('li[id^="folder_"]');
    if (hasFiles || finishedLoading) {
      clearInterval(wait);
      setTimeout(run, 300);
    }
  }, 200);
  setTimeout(() => {
    clearInterval(wait);
    // حماية أخيرة: نضمن رجوع الإظهار حتى لو ما تحقق أي شرط أعلاه
    style.textContent = '#jstreeInbox { visibility: visible; }';
  }, 30000);
})();
