document.addEventListener('DOMContentLoaded', () => {
    // DOM 요소 바인딩
    const orderForm = document.getElementById('orderForm');
    const orderList = document.getElementById('orderList');
    const menuList = document.getElementById('menuList');
    const menuSearch = document.getElementById('menuSearch');
    const itemsInput = document.getElementById('items');
    const btnClearItems = document.getElementById('btnClearItems');

    // 피드백 관련 요소
    const feedbackForm = document.getElementById('feedbackForm');
    const feedbackInput = document.getElementById('feedbackInput');
    const feedbackList = document.getElementById('feedbackList');

    // 레이아웃 스위칭용 요소
    const mainHeader = document.getElementById('mainHeader');
    const mainContainer = document.getElementById('mainContainer');
    const chatContainer = document.getElementById('chatContainer');
    const chatRoomTitle = document.getElementById('chatRoomTitle');
    const chatInfoBar = document.getElementById('chatInfoBar');
    const chatWindow = document.getElementById('chatWindow');
    const chatInput = document.getElementById('chatInput');
    const btnSendChat = document.getElementById('btnSendChat');
    const btnBackToMain = document.getElementById('btnBackToMain');
    const btnCompleteOrder = document.getElementById('btnCompleteOrder');

    let currentChatOrderId = null; 
    let selectedItemsMap = {}; 

    const snackMenu = {
        "단팥빵": 33000, "크림빵": 33000, "408주종발효": 35000, "정통보름달": 35000, "치즈케익": 43000, "초당옥수수": 35000,
        "BR": 32000, "Dunkin": 29000, "fuzetea +": 14000, "Ice+복숭아": 12000, "Ice+포도": 12000, "JOY망고": 10000, 
        "MILO": 12000, "Tea break": 15000, "TEPPY오렌지주스": 13000, "다사니물": 6000, "데미소다": 25000, "딸기맛우유": 20000, 
        "레몬그린티": 10000, "리바이브솔트레몬": 13000, "리바이브오리지널맛": 12000, "립톤홍차레몬맛": 15000, 
        "보성홍차아이스트레몬": 37000, "보성홍차아이스트복숭": 37000, "복숭아봉봉": 32000, "뽀로로": 25000, "뿌요소다": 26000, 
        "아쿠아리우스": 12000, "아쿠아피나 물": 5000, "암바사": 28000, "요거상큼복숭아": 28000, "요거풋풋사과": 28000, 
        "웰치스딸기": 30000, "웰치스포도": 30000, "제티": 23000, "초코에몽": 25000, "코코팜복숭아": 28000, "코코팜요구르트": 28000, 
        "탐스제로사과키위": 28000, "탐스제로오렌지": 28000, "토레타캔": 25000, "트로피카나사과": 25000, "트로피카나스파클링복숭아": 25000, 
        "트위스터오렌지주스": 13000, "티플러스우롱차": 12000, "티플러스우롱차레몬": 12000, "파워에이드": 25000, "파인애플 C": 25000, 
        "포도봉봉": 23000, "푸제티복숭아맛": 14000, "피크닉": 22000,
        "돼지바": 18000, "별난바": 18000, "스크류바": 20000, "옥동자": 23000, "소프트빵빠레": 23000, "빠삐코": 24000, 
        "쭈쭈바": 25000, "ZERO": 25000, "붕어싸만코": 33000, "부라보콘": 36000, "월드콘": 36000, "찰떡아이스": 35000, 
        "Snow Ice": 36000, "망고요거트": 36000, "우유콘": 36000, "빵빠레": 38000, "더블콘": 40000, "말차초코바": 25000
    };

    // 메뉴판 그리기
    function renderMenu(filter = '') {
        menuList.innerHTML = '';
        for (const [name, price] of Object.entries(snackMenu)) {
            if (!name.toLowerCase().includes(filter.toLowerCase())) continue;
            const li = document.createElement('li');
            li.className = 'menu-item';
            li.innerHTML = `<span>🍿 ${name}</span><span class="price">${price.toLocaleString()} VND</span>`;
            
            li.addEventListener('click', () => {
                selectedItemsMap[name] = (selectedItemsMap[name] || 0) + 1;
                updateItemsInput();
            });
            menuList.appendChild(li);
        }
    }

    function updateItemsInput() {
        const arr = [];
        for (const [name, count] of Object.entries(selectedItemsMap)) {
            arr.push(`${name} ${count}개`);
        }
        itemsInput.value = arr.join(', ');
    }

    btnClearItems.addEventListener('click', () => {
        selectedItemsMap = {};
        itemsInput.value = '';
    });

    menuSearch.addEventListener('input', (e) => renderMenu(e.target.value));
    renderMenu();

    // 총액 계산
    function calculateTotal() {
        let itemTotal = 0;
        const deliveryFee = 5000;
        for (const [name, count] of Object.entries(selectedItemsMap)) {
            if (snackMenu[name]) itemTotal += snackMenu[name] * count;
        }
        return { items: itemTotal, total: itemTotal > 0 ? (itemTotal + deliveryFee) : deliveryFee };
    }

    // 데이터 로드
    let orders = JSON.parse(localStorage.getItem('shuttle_orders_v4')) || [];
    let feedbacks = JSON.parse(localStorage.getItem('shuttle_feedbacks')) || [];
    renderOrders();
    renderFeedbacks();

    // 주문 등록
    orderForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const room = document.getElementById('room').value;
        const memo = document.getElementById('memo').value;
        
        if (Object.keys(selectedItemsMap).length === 0) {
            alert("메뉴판에서 상품을 먼저 선택해 주세요!");
            return;
        }

        const priceInfo = calculateTotal();
        const newOrder = {
            id: Date.now(),
            room: room,
            items: itemsInput.value,
            memo: memo || "없음",
            itemPrice: priceInfo.items,
            totalPrice: priceInfo.total,
            status: '대기중',
            chats: []
        };

        orders.push(newOrder);
        saveAndRender();
        orderForm.reset();
        selectedItemsMap = {};
    });

    // 주문 목록 출력
    function renderOrders() {
        orderList.innerHTML = '';
        if (orders.length === 0) {
            orderList.innerHTML = '<p style="text-align:center; color:#888; padding:20px;">현재 대기 중인 심부름이 없습니다.</p>';
            return;
        }

        orders.forEach(order => {
            const li = document.createElement('li');
            li.className = `order-item ${order.status === '배달중' ? 'processing' : ''}`;
            
            const statusBadge = order.status === '대기중' 
                ? `<span class="status-badge waiting">대기중</span>` 
                : `<span class="status-badge active">배달중</span>`;

            let actionButton = order.status === '대기중'
                ? `<button class="btn-accept" onclick="acceptOrder(${order.id})">내가 사다줌!</button>`
                : `<button class="btn-chat-open" onclick="openChat(${order.id})">💬 1:1 대화방</button>`;

            li.innerHTML = `
                <div class="order-info">
                    <p class="location">📍 배달지: ${order.room} ${statusBadge}</p>
                    <p>🛍️ 물품: <strong>${order.items}</strong></p>
                    <p>📝 요청사항: <span style="color:#666; font-style:italic;">"${order.memo}"</span></p>
                    <p>💰 정산액: <strong>${order.totalPrice.toLocaleString()} VND</strong></p>
                </div>
                <div>${actionButton}</div>
            `;
            orderList.appendChild(li);
        });
    }

    // [추가 기능] 피드백 등록 및 출력 로직
    feedbackForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const text = feedbackInput.value.trim();
        if(!text) return;

        feedbacks.unshift({ id: Date.now(), text: text }); // 최신 피드백이 위로 오도록
        localStorage.setItem('shuttle_feedbacks', JSON.stringify(feedbacks));
        renderFeedbacks();
        feedbackInput.value = '';
    });

    function renderFeedbacks() {
        feedbackList.innerHTML = '';
        if(feedbacks.length === 0) {
            feedbackList.innerHTML = '<p style="color:#aaa; font-size:0.85rem;">첫 번째 의견을 남겨주세요!</p>';
            return;
        }
        feedbacks.forEach(fb => {
            const div = document.createElement('div');
            div.className = 'feedback-card';
            div.innerText = `💬 ${fb.text}`;
            feedbackList.appendChild(div);
        });
    }

    function saveAndRender() {
        localStorage.setItem('shuttle_orders_v4', JSON.stringify(orders));
        renderOrders();
        if (currentChatOrderId) updateChatWindow();
    }

    window.acceptOrder = function(id) {
        const order = orders.find(o => o.id === id);
        if (!order) return;

        if (confirm(`심부름을 수락하고 전용 대화방으로 이동할까요?`)) {
            order.status = '배달중';
            order.chats.push({ sender: 'system', text: '⚡ 1:1 비밀 대화방이 개설되었습니다.' });
            saveAndRender();
            openChat(id);
        }
    };

    // 대화창 레이아웃 전환
    window.openChat = function(id) {
        const order = orders.find(o => o.id === id);
        if (!order) return;

        currentChatOrderId = id;
        
        mainHeader.style.display = 'none';
        mainContainer.style.display = 'none';
        chatContainer.style.display = 'flex';

        chatRoomTitle.innerText = `📱 ${order.room} 셔틀방`;
        chatInfoBar.innerHTML = `
            <strong>물품:</strong> ${order.items}<br>
            <strong>요청사항:</strong> "${order.memo}"<br>
            <strong>받을 총 금액:</strong> <span style="color:#d63031; font-weight:bold;">${order.totalPrice.toLocaleString()} VND</span>
        `;
        updateChatWindow();
    };

    btnBackToMain.addEventListener('click', () => {
        currentChatOrderId = null;
        chatContainer.style.display = 'none';
        mainHeader.style.display = 'block';
        mainContainer.style.display = 'flex';
    });

    // [개선] 배달 완료 처리 ➔ 문자 창 및 해당 주문 카드 즉시 파기
    btnCompleteOrder.addEventListener('click', () => {
        if (confirm("배달이 완료되었습니까? 확인을 누르면 문자 창과 요청이 목록에서 완전히 삭제됩니다.")) {
            // 해당 주문 삭제
            orders = orders.filter(o => o.id !== currentChatOrderId);
            currentChatOrderId = null;
            localStorage.setItem('shuttle_orders_v4', JSON.stringify(orders));
            renderOrders();
            
            // 레이아웃 메인 화면으로 리셋
            chatContainer.style.display = 'none';
            mainHeader.style.display = 'block';
            mainContainer.style.display = 'flex';
            alert("성공적으로 배달이 완료되어 방이 폭파되었습니다! 🚀");
        }
    });

    function updateChatWindow() {
        const order = orders.find(o => o.id === currentChatOrderId);
        if (!order) return;

        chatWindow.innerHTML = '';
        order.chats.forEach(msg => {
            const div = document.createElement('div');
            if (msg.sender === 'system') {
                div.style.cssText = "text-align:center; font-size:0.85rem; color:#57606f; width:100%; margin:5px 0;";
                div.innerText = msg.text;
            } else {
                div.className = `chat-bubble ${msg.sender === '요청자' ? 'requester' : 'acceptor'}`;
                div.innerHTML = `<strong>${msg.sender}</strong><br>${msg.text}`;
            }
            chatWindow.appendChild(div);
        });
        chatWindow.scrollTop = chatWindow.scrollHeight;
    }

    btnSendChat.addEventListener('click', sendChatMessage);
    chatInput.addEventListener('keypress', (e) => { if(e.key === 'Enter') sendChatMessage(); });

    function sendChatMessage() {
        const text = chatInput.value.trim();
        if (!text || !currentChatOrderId) return;

        const order = orders.find(o => o.id === currentChatOrderId);
        if (!order) return;

        const sender = confirm("확인: [요청자]로 전송 / 취소: [배달자]로 전송") ? "요청자" : "배달자";

        order.chats.push({ sender: sender, text: text });
        chatInput.value = '';
        saveAndRender();
    }
});