// ==UserScript==
// @name         تثبيت المعاملات - نسخة محسنة ومختصرة
// @namespace    http://tampermonkey.net
// @version      3.7
// @match        *://rasel/CTS/*
// @grant        GM_setValue
// @grant        GM_getValue
// @run-at       document-idle
// ==/UserScript==
(function() {
    'use strict';
    const KEY = 'pinnedTransactions';
    const ID_MAP_KEY = 'transactionIdMap';
    const getPinned = () => { try { return JSON.parse(GM_getValue(KEY, '[]')); } catch(e) { return []; } };
    const getIdMap = () => { try { return JSON.parse(GM_getValue(ID_MAP_KEY, '{}')); } catch(e) { return {}; } };
    const getRef = (r) => r?.dataset?.pinId || '';
    const getTransKey = (r) => (r?.cells?.[2]?.title || '') + '|' + (r?.cells?.[3]?.textContent?.trim() || '');
    let originalOrder = [];
    let busy = false;

    // CSS مختصر
    document.head.insertAdjacentHTML('beforeend', `<style>
        td.MinimumImageColumnWidthIcon { position: relative !important; padding-inline-end: 26px !important; }
        .p-star { cursor: pointer; font-size: 18px; color: #ccc; position: absolute; top: 50%; inset-inline-end: 6px; transform: translateY(-50%); z-index: 2; user-select: none; transition: .2s; }
        .p-star:hover { color: #f39c12; transform: translateY(-50%) scale(1.2); }
        .p-star.on { color: #f1c40f !important; }
        .p-row > td { background: #fffde7 !important; }
    </style>`);

    function refresh() {
        const tbody = document.querySelector('#MailDataTable tbody');
        if (!tbody || !originalOrder.length) return;
        const pinnedIds = getPinned();
        const rows = [...tbody.rows];
        rows.sort((a, b) => {
            const idA = getRef(a), idB = getRef(b);
            const idxA = pinnedIds.indexOf(idA), idxB = pinnedIds.indexOf(idB);
            if (idxA !== -1 && idxB !== -1) return idxA - idxB;
            if (idxA !== -1) return -1;
            if (idxB !== -1) return 1;
            return originalOrder.indexOf(idA) - originalOrder.indexOf(idB);
        });
        rows.forEach(r => {
            tbody.appendChild(r);
            const isPinned = pinnedIds.includes(getRef(r));
            r.classList.toggle('p-row', isPinned);
            const s = r.querySelector('.p-star');
            if (s) { s.classList.toggle('on', isPinned); s.title = isPinned ? 'إلغاء' : 'تثبيت'; }
        });
    }

    function init() {
        if (busy) return;
        busy = true;

        const rows = document.querySelectorAll('#MailDataTable tbody tr');
        if (!rows.length) { busy = false; return; }
        if (!originalOrder.length) originalOrder = Array.from(rows).map(getRef);

        rows.forEach(row => {
            const transKey = getTransKey(row);
            const idMap = getIdMap();

            if (!row.dataset.pinId) {
                row.dataset.pinId = idMap[transKey] || (Date.now() + '_' + Math.random());
                idMap[transKey] = row.dataset.pinId;
                GM_setValue(ID_MAP_KEY, JSON.stringify(idMap));
            }

            if (row.querySelector('.p-star')) return;
            const star = document.createElement('span');
            star.className = 'p-star';
            star.textContent = '★';
            star.onclick = (e) => {
                e.stopPropagation();
                let list = getPinned();
                const id = getRef(row);
                list = list.includes(id) ? list.filter(x => x !== id) : [id, ...list];
                GM_setValue(KEY, JSON.stringify(list));
                refresh();
            };
            row.cells[1]?.appendChild(star);
        });
        refresh();
        busy = false;
    }

    // مراقبة ذكية مع حماية
    let timeout;
    const observer = new MutationObserver(() => {
        clearTimeout(timeout);
        timeout = setTimeout(() => {
            const tbody = document.querySelector('#MailDataTable tbody');
            const processing = document.querySelector('#MailDataTable_processing');
            const isLoading = processing && processing.style.display !== 'none';

            if (!isLoading && tbody && !tbody.querySelector('.p-star')) {
                init();
            }
        }, 100);
    });

    observer.observe(document.body, { childList: true, subtree: true });
    setTimeout(init, 500);
})();
