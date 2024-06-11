document.addEventListener('DOMContentLoaded', () => {
    const headerHTML = `
        <header>
            <div class="header-container">
                <div class="logo"><a href="index.html" style="color: #fff; text-decoration: none;">MyShop</a></div>
                <div class="search-bar">
                    <input type="text" id="header-search-input" placeholder="商品を検索...">
                    <button id="header-search-button">検索</button>
                </div>
                <div class="cart">
                    <a href="#"><i class="fas fa-shopping-cart"></i></a>
                    <span class="cart-count">0</span>
                </div>
                <div class="auth-buttons">
                    <button id="login-btn">ログイン</button>
                    <button id="signup-btn">サインアップ</button>
                </div>
                <div class="account" style="display: none;">
                    <a href="#">アカウント</a></div>
                </div>
            </div>
        </header>
    `;

    const footerHTML = `
        <footer>
            <div class="footer-container">
                <div class="footer-links">
                    <a href="#">お問い合わせ</a>
                    <a href="#">FAQ</a>
                    <a href="#">返品ポリシー</a>
                </div>
                <div class="social-media">
                    <a href="#">Facebook</a>
                    <a href="#">Twitter</a>
                    <a href="#">Instagram</a>
                </div>
            </div>
        </footer>
    `;

    document.body.insertAdjacentHTML('afterbegin', headerHTML);
    document.body.insertAdjacentHTML('beforeend', footerHTML);

    const signupButton = document.getElementById('signup-btn');
    if (signupButton) {
        signupButton.addEventListener('click', () => {
            window.location.href = 'register.html';
        });
    }

    function checkLogin() {
        return true; // ここをfalseにするとログインしていない状態になります
    }

    if (checkLogin()) {
        document.querySelector('.auth-buttons').style.display = 'none';
        document.querySelector('.account').style.display = 'block';
    } else {
        document.querySelector('.auth-buttons').style.display = 'flex';
        document.querySelector('.account').style.display = 'none';
    }

    // 検索機能の実装
    const headerSearchButton = document.getElementById('header-search-button');
    const headerSearchInput = document.getElementById('header-search-input');

    function performSearch() {
        const searchQuery = headerSearchInput.value.trim();
        if (searchQuery) {
            window.location.href = `product-list.html?search=${encodeURIComponent(searchQuery)}`;
        } else {
            window.location.href = `product-list.html`;
        }
    }

    headerSearchButton.addEventListener('click', performSearch);

    headerSearchInput.addEventListener('keypress', (event) => {
        if (event.key === 'Enter') {
            performSearch();
        }
    });
});
