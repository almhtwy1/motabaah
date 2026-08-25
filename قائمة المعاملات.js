// ==UserScript==
// @name         قائمة المعاملات1
// @namespace    http://rasel/
// @version      3.8
// @description  إدارة قائمة المعاملات مع النسخ واللصق فقط في حقل البحث
// @match        http://rasel/CTS/CTSC*
// @grant        GM_setClipboard
// ==/UserScript==
(function () {
    const style = document.createElement('style');
    style.textContent = '.marasalati-fixed-width { width: 280px !important; }';
    document.head.appendChild(style);

    const ROW_COLORS = ['#e8f4fd', '#fef9e7', '#fdf2f8', '#fef5e7', '#f0f4ff', '#fde8f0'];

    const STORAGE_KEY_NOTES = 'notes_list';
    const STORAGE_KEY_COPIED = 'notes_copied';

    function saveState() {
        localStorage.setItem(STORAGE_KEY_NOTES, JSON.stringify(currentNumbers));
        localStorage.setItem(STORAGE_KEY_COPIED, JSON.stringify([...copiedSet]));
    }

    function loadState() {
        try {
            const notes = JSON.parse(localStorage.getItem(STORAGE_KEY_NOTES) || '[]');
            const copied = JSON.parse(localStorage.getItem(STORAGE_KEY_COPIED) || '[]');
            return { notes, copied };
        } catch { return { notes: [], copied: [] }; }
    }

    const saved = loadState();
    const copiedSet = new Set(saved.copied);

    // ── اللوحة المنبثقة ────────────────────────────
    const panel = document.createElement('div');
    panel.className = 'no-expand marasalati-fixed-width';
    Object.assign(panel.style, {
        position: 'fixed', bottom: '20px', left: '20px',
        maxHeight: '70vh',
        background: '#fff', zIndex: 100,
        display: 'flex', flexDirection: 'column',
        fontFamily: 'Arial', direction: 'rtl',
        boxShadow: '0 -4px 16px rgba(0,0,0,.2)',
        borderRadius: '10px',
        transition: 'opacity .25s ease, transform .25s ease',
        opacity: '0', transform: 'translateY(20px)',
        pointerEvents: 'none'
    });

    // رأس اللوحة
    const header = document.createElement('div');
    Object.assign(header.style, {
        padding: '12px 16px', background: '#FDD835',
        color: '#333',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        flexShrink: '0',
        borderRadius: '10px 10px 0 0'
    });
    const title = document.createElement('span');
    title.style.fontWeight = 'bold';
    title.textContent = 'قائمة المعاملات';

    header.append(title);

    const list = document.createElement('ul');
    Object.assign(list.style, {
        margin: '0', padding: '8px 12px',
        overflowY: 'auto', flex: '1',
        listStyle: 'none'
    });

    panel.append(header, list);
    document.body.appendChild(panel);

    // ── مربع الإدخال المنبثق ──────────────────────────────────
    const inputOverlay = document.createElement('div');
    inputOverlay.className = 'no-expand marasalati-fixed-width';
    Object.assign(inputOverlay.style, {
        position: 'fixed', bottom: '20px', left: '20px',
        background: '#fff', zIndex: 101,
        display: 'none', flexDirection: 'column', gap: '10px',
        fontFamily: 'Arial', direction: 'rtl',
        boxShadow: '0 -4px 16px rgba(0,0,0,.2)',
        borderRadius: '10px',
        padding: '14px'
    });

    const inputHeader = document.createElement('div');
    inputHeader.textContent = 'أدخل المعاملات (معاملة في كل سطر)';
    Object.assign(inputHeader.style, {
        margin: '-14px -14px 0 -14px',
        padding: '12px 16px',
        background: '#FDD835',
        color: '#333',
        fontSize: '13px', fontWeight: 'bold',
        borderRadius: '10px 10px 0 0'
    });

    const textarea = document.createElement('textarea');
    Object.assign(textarea.style, {
        width: '100%', height: '140px', resize: 'vertical',
        fontSize: '14px', fontFamily: 'Arial', direction: 'rtl',
        border: '1px solid #e0d060', borderRadius: '6px',
        padding: '8px', boxSizing: 'border-box',
        marginTop: '10px'
    });
    textarea.placeholder = 'مثال:\n12345\n67890\n11223';

    const confirmBtn = document.createElement('button');
    confirmBtn.textContent = '✔ تم';
    Object.assign(confirmBtn.style, {
        padding: '9px', background: '#FDD835', color: '#333',
        border: 'none', borderRadius: '6px', cursor: 'pointer',
        fontSize: '14px', fontFamily: 'Arial', fontWeight: 'bold'
    });

    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'إلغاء';
    Object.assign(cancelBtn.style, {
        padding: '9px', background: '#e9ecef', color: '#333',
        border: 'none', borderRadius: '6px', cursor: 'pointer',
        fontSize: '14px', fontFamily: 'Arial'
    });

    const inputBtns = document.createElement('div');
    Object.assign(inputBtns.style, { display: 'flex', gap: '8px' });
    inputBtns.append(confirmBtn, cancelBtn);

    inputOverlay.append(inputHeader, textarea, inputBtns);
    document.body.appendChild(inputOverlay);

    let inputVisible = false;

    function showInputOverlay() {
        textarea.value = currentNumbers.join('\n');
        inputOverlay.style.display = 'flex';
        inputVisible = true;
        if (panelVisible) togglePanel();
    }

    function hideInputOverlay() {
        inputOverlay.style.display = 'none';
        inputVisible = false;
    }

    function toggleInputOverlay() {
        if (inputVisible) {
            hideInputOverlay();
        } else {
            showInputOverlay();
        }
    }

    // ── منطق العرض ───────────────────────────────────────────
    let currentNumbers = [];
    let panelVisible = false;

    function togglePanel() {
        panelVisible = !panelVisible;
        if (panelVisible) {
            panel.style.opacity = '1';
            panel.style.transform = 'translateY(0)';
            panel.style.pointerEvents = 'auto';
            if (inputVisible) hideInputOverlay();
        } else {
            panel.style.opacity = '0';
            panel.style.transform = 'translateY(20px)';
            panel.style.pointerEvents = 'none';
        }
    }

    function getRemainingCount() {
        return currentNumbers.filter(n => !copiedSet.has(String(n))).length;
    }

    function updateTitle() {
        title.textContent = `قائمة المعاملات (${getRemainingCount()})`;
        const treeLabel = document.getElementById('notes_label');
        if (treeLabel) treeLabel.textContent = `قائمة المعاملات (${getRemainingCount()})`;
    }

    function renderList(numbers) {
        currentNumbers = numbers;
        updateTitle();
        list.innerHTML = '';

        numbers.forEach((n, i) => {
            const li = document.createElement('li');
            const colorBg = ROW_COLORS[i % ROW_COLORS.length];
            const isCopied = copiedSet.has(String(n));

            Object.assign(li.style, {
                padding: '7px 10px',
                marginBottom: '4px',
                borderRadius: '6px',
                background: isCopied ? '#d4edda' : colorBg,
                display: 'flex', alignItems: 'center', gap: '8px',
                cursor: 'pointer', fontSize: '14px',
                border: isCopied ? '2px solid #28a745' : '1px solid transparent',
                transition: 'background .2s',
                textDecoration: 'none'
            });

            const numSpan = document.createElement('span');
            numSpan.textContent = n;
            numSpan.style.flex = '1';
            numSpan.style.textDecoration = isCopied ? 'line-through' : 'none';

            const badge = document.createElement('span');
            badge.textContent = isCopied ? '✓ تم' : '';
            Object.assign(badge.style, {
                fontSize: '11px', color: '#28a745',
                fontWeight: 'bold', flexShrink: '0'
            });

            li.append(numSpan, badge);

            li.onclick = () => {
                const key = String(n);
                if (copiedSet.has(key)) {
                    // ضغطة ثانية → إلغاء التحديد فقط
                    copiedSet.delete(key);
                    li.style.background = colorBg;
                    li.style.border = '1px solid transparent';
                    numSpan.style.textDecoration = 'none';
                    badge.textContent = '';
                    updateTitle();
                    saveState();
                } else {
                    // ضغطة أولى → بحث وفتح المعاملة تلقائياً
                    GM_setClipboard(key);
                    copiedSet.add(key);
                    li.style.background = '#d4edda';
                    li.style.border = '2px solid #28a745';
                    numSpan.style.textDecoration = 'line-through';
                    badge.textContent = '✓ تم';
                    li.style.outline = '2px solid #28a745';
                    setTimeout(() => { li.style.outline = 'none'; }, 600);
                    updateTitle();
                    saveState();
                }
            };

            list.appendChild(li);
        });
    }

    // ── أحداث نافذة الإدخال ──────────────────────────────────
    confirmBtn.onclick = () => {
        const lines = textarea.value
            .split('\n')
            .map(l => l.trim())
            .filter(l => l !== '');

        if (lines.length === 0) {
            hideInputOverlay();
            copiedSet.clear();
            renderList([]);
            saveState();
            if (panelVisible) togglePanel();
            return;
        }

        hideInputOverlay();
        copiedSet.clear();
        renderList(lines);
        saveState();

        if (!panelVisible) togglePanel();
    };

    cancelBtn.onclick = () => {
        hideInputOverlay();
    };

    // ── إضافة العنصر في شجرة الـ jstree ───────────────────
    function injectNotesTreeItem() {
        const marasalatiItem = document.getElementById('95818');
        if (!marasalatiItem) return;

        const rootUl = marasalatiItem.parentElement;
        if (!rootUl) return;

        marasalatiItem.classList.remove('jstree-last');

        const newLi = document.createElement('li');
        newLi.setAttribute('role', 'treeitem');
        newLi.setAttribute('aria-selected', 'false');
        newLi.setAttribute('aria-level', '1');
        newLi.setAttribute('aria-labelledby', 'notes_anchor');
        newLi.id = 'notes_item';
        newLi.className = 'jstree-node jstree-leaf jstree-last';

        newLi.innerHTML = `
            <div unselectable="on" role="presentation" class="jstree-wholerow">&nbsp;</div>
            <i class="jstree-icon jstree-ocl" role="presentation"></i>
            <a class="jstree-anchor" href="#" tabindex="-1" id="notes_anchor" style="display:flex; align-items:center; gap:4px; justify-content:space-between;">
                <span style="display:flex; align-items:center; gap:4px;">
                    <i class="jstree-icon jstree-themeicon" role="presentation"></i>
                    <span id="notes_label">قائمة المعاملات</span>
                </span>
                <span id="notes_arrow" title="إضافة / تعديل المعاملات"
                      style="font-size:16px; font-weight:bold; color:#009879; padding: 0 4px; line-height:1;">+</span>
            </a>`;

        const anchor = newLi.querySelector('#notes_anchor');
        const addBtn = newLi.querySelector('#notes_arrow');

        // زر + → فتح/إغلاق نافذة الإدخال
        addBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            toggleInputOverlay();
        });

        // الضغط على النص → عرض/إخفاء القائمة
        anchor.addEventListener('click', (e) => {
            e.preventDefault();
            togglePanel();
        });

        rootUl.appendChild(newLi);

        if (saved.notes.length > 0) {
            renderList(saved.notes);
        }
    }

    if (document.readyState === 'complete') {
        injectNotesTreeItem();
    } else {
        window.addEventListener('load', injectNotesTreeItem);
    }

})();
