// ==UserScript==
// @name         فتح تقارير متعددة - نظام المراسلات CTS (المتابعة)
// @namespace    http://tampermonkey.net/
// @version      4.1
// @description  فتح تقرير تتبع الإحالات لكل المعاملات المحددة - سريع جداً
// @author       Mohammed
// @match        http://rasel/CTS/CTSC*
// @match        http://rasel/CTS/CTSC/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function() {
    'use strict';

    // التحقق من المستخدم المحدد
    const ALLOWED_USERS = ['203498', '1'];
    const checkUser = () => ALLOWED_USERS.includes(document.querySelector('#UserCodeHidden')?.value);

    // إيقاف السكريبت إذا لم يكن المستخدم مسموح
    if (!checkUser()) return;

    // التحقق من رؤية الإطار
    function isFrameVisible(iframe) {
        if (!iframe) return false;
        try {
            const style = window.getComputedStyle(iframe);
            const rect = iframe.getBoundingClientRect();
            return style.display !== 'none' && style.visibility !== 'hidden' &&
                   style.opacity !== '0' && rect.width > 0 && rect.height > 0;
        } catch (e) { return false; }
    }

    // البحث عن الإطار المرئي النشط
    function findActiveFrame() {
        const mainTable = document.querySelector('#MailDataTable');
        if (mainTable && window.getComputedStyle(mainTable).display !== 'none') {
            return { doc: document, frame: window };
        }

        for (let iframe of document.querySelectorAll('iframe')) {
            if (!isFrameVisible(iframe)) continue;
            try {
                const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
                const table = iframeDoc.querySelector('#MailDataTable');
                if (table && iframe.contentWindow.getComputedStyle(table).display !== 'none') {
                    return { doc: iframeDoc, frame: iframe.contentWindow };
                }
            } catch (e) {}
        }
        return null;
    }

    // الحصول على الصفوف المحددة
    function getSelectedRows() {
        const activeFrame = findActiveFrame();
        if (!activeFrame) return [];
        return Array.from(activeFrame.doc.querySelectorAll('#MailDataTable tbody tr input[type="checkbox"]:checked'))
            .map(cb => cb.closest('tr'))
            .filter(row => row && !row.querySelector('th'));
    }

    // فتح التقرير مباشرة (بدون انتظار)
    function openReportDirect(targetDoc, targetFrame, row) {
        try {
            // تحديد الصف مباشرة
            const table = targetDoc.querySelector('#MailDataTable');
            if (table) {
                table.querySelectorAll('tbody tr').forEach(r => {
                    r.classList.remove('selected');
                    const cb = r.querySelector('input[type="checkbox"]');
                    if (cb) cb.checked = false;
                });
            }

            row.classList.add('selected');
            const checkbox = row.querySelector('input[type="checkbox"]');
            if (checkbox) checkbox.checked = true;

            // فتح التقرير فوراً
            if (typeof targetFrame.VisualTrackingReport === 'function') {
                targetFrame.VisualTrackingReport();
            } else {
                const reportButton = targetDoc.getElementById('6717');
                if (reportButton) reportButton.click();
            }

            return true;
        } catch (e) {
            return false;
        }
    }

    // فتح تقارير متعددة - معالجة متوازية
    function openMultipleReports() {
        const activeFrame = findActiveFrame();
        const selectedRows = activeFrame ? getSelectedRows() : [];
        if (!selectedRows.length) return;

        let index = 0;
        const batchSize = 3; // عدد التقارير التي تفتح في نفس الوقت

        function processBatch() {
            if (index >= selectedRows.length) return;

            // معالجة عدة صفوف في نفس الوقت
            const endIndex = Math.min(index + batchSize, selectedRows.length);
            for (let i = index; i < endIndex; i++) {
                setTimeout(() => {
                    openReportDirect(activeFrame.doc, activeFrame.frame, selectedRows[i]);
                }, (i - index) * 50); // فجوة صغيرة 50ms بين كل تقرير
            }

            index = endIndex;
            setTimeout(processBatch, 200); // انتظار قصير قبل المجموعة التالية
        }

        processBatch();
    }

    // إضافة الزر للإطار
    function addMenuButtonToFrame(targetDoc) {
        const childMenu = targetDoc.getElementById('childUl_6712');
        if (!childMenu) return false;

        let button = targetDoc.getElementById('multi-report-menu-btn');
        if (!button) {
            button = targetDoc.createElement('li');
            button.id = 'multi-report-menu-btn';
            button.innerHTML = '<a id="Anchor_multi-report" style="cursor:pointer"><span>⚡ تقارير متعددة</span></a>';
            childMenu.insertBefore(button, childMenu.firstChild);
        }

        button.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            childMenu.style.display = 'none';
            requestAnimationFrame(openMultipleReports);
        };
        return true;
    }

    // إضافة الزر لجميع الإطارات
    function addButtonToAllFrames() {
        addMenuButtonToFrame(document);
        document.querySelectorAll('iframe').forEach(iframe => {
            try {
                addMenuButtonToFrame(iframe.contentDocument || iframe.contentWindow.document);
            } catch (e) {}
        });
    }

    // التهيئة
    setTimeout(() => {
        addButtonToAllFrames();

        const observer = new MutationObserver(() => setTimeout(addButtonToAllFrames, 200));
        const tabContainer = document.querySelector('.tab-container, .chrometabs');
        if (tabContainer) observer.observe(tabContainer, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
        observer.observe(document.body, { childList: true, subtree: true });

        setInterval(addButtonToAllFrames, 2000);
    }, 500);
})();
