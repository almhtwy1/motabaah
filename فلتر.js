// ==UserScript==
// @name         فلترة عقد قطاع شمال الرياض
// @namespace    http://tampermonkey.net/
// @version      2.2
// @description  إخفاء كل العقد ما عدا آخر عقدة لقطاع شمال الرياض والعقد التابعة لها مع الانتقال التلقائي
// @match        http://rasel/CTS/ShowPage?Template=apps/ctsc/templates/Templates/TransferVisualTracking.html*
// @grant        GM_addStyle
// @run-at       document-end
// ==/UserScript==

(function () {
    'use strict';

    // التحقق من المستخدم المحدد
    const ALLOWED_USERS = ['203498', '1'];
    const checkUser = () => ALLOWED_USERS.includes(document.querySelector('#UserCodeHidden')?.value);

    // إيقاف السكريبت إذا لم يكن المستخدم مسموح
    if (!checkUser()) return;

    GM_addStyle(`
        #filterBtn {
            position: fixed;
            top: 10px;
            left: 10px;
            z-index: 99999;
            padding: 10px 20px;
            background: #007bff;
            color: white;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            font-family: Arial;
            font-size: 14px;
        }
        #filterBtn:hover { background: #0056b3; }
        #filterBtn.active { background: #28a745; }
        .node-hidden { display: none !important; }
    `);

    var btn = document.createElement('button');
    btn.id = 'filterBtn';
    btn.textContent = 'فلترة قطاع الشمال';
    document.body.appendChild(btn);

    var filtered = false;

    btn.onclick = function () {
        if (filtered) {
            document.querySelectorAll('.node-hidden').forEach(function(n) {
                n.classList.remove('node-hidden');
            });
            btn.textContent = 'فلترة قطاع الشمال';
            btn.classList.remove('active');
        } else {
            applyFilter();
            btn.textContent = 'إظهار الكل';
            btn.classList.add('active');
        }
        filtered = !filtered;
    };

    function applyFilter() {
        var url = location.href.replace('ShowPage?Template=apps/ctsc/templates/Templates/TransferVisualTracking.html&', 'CTSC?C=GetTrackingHistory&token=&');

        fetch(url)
        .then(function(r) { return r.json(); })
        .then(function(data) {

            var relations = [];

            function getRelations(node, parentId, parentName) {
                var id = node.id;
                var parts = node.name ? node.name.split('~') : [];
                var name = parts[2] || id;

                if (parentId) {
                    relations.push({ fromId: parentId, fromName: parentName, toId: id, toName: name });
                }

                if (node.children) {
                    node.children.forEach(function(child) {
                        getRelations(child, id, name);
                    });
                }
            }

            getRelations(data, null, null);

            var northNodes = relations.filter(function(r) {
                return r.toName === 'قطاع شمال مدينة الرياض';
            });

            if (northNodes.length === 0) {
                alert('لم يتم العثور على قطاع شمال مدينة الرياض');
                return;
            }

            var lastNorth = northNodes.reduce(function(a, b) {
                return Number(a.toId) > Number(b.toId) ? a : b;
            });

            function getSubTree(startId) {
                var ids = [startId];
                var queue = [startId];
                var visited = {};

                while (queue.length > 0) {
                    var current = queue.shift();
                    if (visited[current]) continue;
                    visited[current] = true;

                    relations.forEach(function(r) {
                        if (r.fromId === current) {
                            ids.push(r.toId);
                            queue.push(r.toId);
                        }
                    });
                }
                return ids;
            }

            var targetIds = getSubTree(lastNorth.toId);
            targetIds.push(data.id);

            var allNodes = document.querySelectorAll('#infovis-label div.node');

            allNodes.forEach(function(node) {
                if (targetIds.indexOf(node.id) === -1) {
                    node.classList.add('node-hidden');
                }
            });

            scrollToNode(lastNorth.toId);
        })
        .catch(function(err) {
            console.error(err);
            alert('حدث خطأ في جلب البيانات');
        });
    }

    function scrollToNode(nodeId) {
        var targetNode = document.getElementById(nodeId);

        if (targetNode) {
            setTimeout(function() {
                targetNode.scrollIntoView({
                    behavior: 'smooth',
                    block: 'center',
                    inline: 'center'
                });

                targetNode.style.transition = 'all 0.3s ease';
                targetNode.style.boxShadow = '0 0 20px 5px #28a745';
                targetNode.style.transform = 'scale(1.1)';

                setTimeout(function() {
                    targetNode.style.boxShadow = '';
                    targetNode.style.transform = '';
                }, 1500);

            }, 100);
        }
    }

})();
