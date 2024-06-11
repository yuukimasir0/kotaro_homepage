document.addEventListener('DOMContentLoaded', () => {
    const headerHTML = `
        <header>
            <div class="header-container">
                <div class="logo"><a href="index.html" style="color: #fff; text-decoration: none;">MyShop</a></div>
                <div class="search-bar">
                    <input type="text" placeholder="商品を検索...">
                    <button>検索</button>
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
                    <a href="#">アカウント</a>
                </div>
            </div>
        </header>
    `;

    const footerHTML = `
        <footer>
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
            <div class="newsletter">
                <input type="email" placeholder="メールアドレスを入力">
                <button>登録</button>
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
        return false; // ここをfalseにするとログインしていない状態になります
    }

    if (checkLogin()) {
        document.querySelector('.auth-buttons').style.display = 'none';
        document.querySelector('.account').style.display = 'block';
    } else {
        document.querySelector('.auth-buttons').style.display = 'flex';
        document.querySelector('.account').style.display = 'none';
    }

    const emailForm = document.getElementById('emailForm');
    const registerForm = document.getElementById('registerForm');
    const emailVerifiedInput = document.getElementById('emailVerified');

    if (emailForm) {
        emailForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            
            const formData = new FormData(emailForm);
            const email = formData.get('email');
            
            const response = await fetch('/verify-email', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email })
            });
            
            const result = await response.json();
            const responseMessage = document.getElementById('responseMessage');
            
            if (response.ok) {
                responseMessage.textContent = '認証メールが送信されました。メール内のリンクをクリックして認証を完了してください。';
                emailVerifiedInput.value = email;
            } else {
                responseMessage.textContent = `エラー: ${result.message || 'メールアドレスの認証に失敗しました。'}`;
            }
        });
    }

    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    const email = urlParams.get('email');

    if (token && email) {
        fetch(`/verify-token?token=${token}&email=${email}`)
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    emailVerifiedInput.value = email;
                    document.querySelector('.email-verification').style.display = 'none';
                    document.querySelector('.register').style.display = 'block';
                } else {
                    document.getElementById('responseMessage').textContent = '認証に失敗しました。';
                }
            });
    }

    if (registerForm) {
        registerForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            
            const formData = new FormData(registerForm);
            const data = Object.fromEntries(formData.entries());
            
            try {
                const response = await fetch('/register', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(data)
                });
                
                const result = await response.json();
                const responseMessage = document.getElementById('registerResponseMessage');
                
                if (response.ok) {
                    responseMessage.textContent = 'ユーザー登録が完了しました。';
                } else {
                    responseMessage.textContent = `エラー: ${result.message || 'ユーザー登録に失敗しました。'}`;
                }
            } catch (error) {
                console.error('Error:', error);
                const responseMessage = document.getElementById('registerResponseMessage');
                responseMessage.textContent = 'サーバーエラーが発生しました。';
            }
        });
    }

    const productList = document.getElementById('product-list');

    function addProductCard(product) {
        const productCard = document.createElement('div');
        productCard.className = 'product-card';
        productCard.innerHTML = `
            <img src="${product.image}" alt="${product.name}">
            <h2>${product.name}</h2>
        `;
        productCard.addEventListener('click', () => {
            window.location.href = `product-detail.html?id=${product.id}`;
        });
        productList.appendChild(productCard);
    }

    function fetchProducts() {
        const genre = document.getElementById('genre').value;
        const minPrice = document.getElementById('min-price').value;
        const maxPrice = document.getElementById('max-price').value;
        const searchName = document.getElementById('search-name').value;

        const queryParams = new URLSearchParams({
            genre,
            minPrice,
            maxPrice,
            searchName
        });

        fetch(`/products?${queryParams.toString()}`)
            .then(response => response.json())
            .then(products => {
                productList.innerHTML = '';
                products.forEach(addProductCard);
            })
            .catch(error => console.error('Error fetching products:', error));
    }

    fetchProducts();

    document.getElementById('filter-button').addEventListener('click', fetchProducts);

    const socket = new WebSocket('ws://localhost:3000');

    socket.addEventListener('message', event => {
        const newProduct = JSON.parse(event.data);
        addProductCard(newProduct);
    });

    socket.addEventListener('open', () => {
        console.log('WebSocket connection established');
    });

    socket.addEventListener('close', () => {
        console.log('WebSocket connection closed');
    });

    const productDetail = document.getElementById('product-detail');

    if (productDetail) {
        const urlParams = new URLSearchParams(window.location.search);
        const productId = urlParams.get('id');

        if (productId) {
            fetch(`/products/${productId}`)
                .then(response => response.json())
                .then(product => {
                    productDetail.innerHTML = `
                        <img src="${product.image}" alt="${product.name}">
                        <h1>${product.name}</h1>
                        <p>${product.description}</p>
                        <p class="price">¥${product.price.toLocaleString()}</p>
                    `;
                })
                .catch(error => console.error('Error fetching product details:', error));
        } else {
            productDetail.innerHTML = '<p>商品が見つかりませんでした。</p>';
        }
    }

    // 新着商品の取得と表示
    function fetchNewArrivals() {
        fetch('/products/new')
            .then(response => response.json())
            .then(products => {
                const newArrivals = document.getElementById('new-arrivals');
                newArrivals.innerHTML = '';
                products.forEach(product => {
                    const productCard = document.createElement('div');
                    productCard.className = 'product-card';
                    productCard.innerHTML = `
                        <img src="${product.image}" alt="${product.name}">
                        <h3>${product.name}</h3>
                    `;
                    productCard.addEventListener('click', () => {
                        window.location.href = `product-detail.html?id=${product.id}`;
                    });
                    newArrivals.appendChild(productCard);
                });
            })
            .catch(error => console.error('Error fetching new arrivals:', error));
    }

    fetchNewArrivals();
});
