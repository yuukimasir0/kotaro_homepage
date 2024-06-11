document.addEventListener('DOMContentLoaded', () => {
    const emailForm = document.getElementById('emailForm');
    const registerForm = document.getElementById('registerForm');
    const emailVerifiedInput = document.getElementById('emailVerified');

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
    const itemsPerPage = 20; // 1ページあたりのアイテム数
    let currentPage = 1;

    function addProductCard(product) {
        const productCard = document.createElement('div');
        productCard.className = 'product-card';
        productCard.innerHTML = `
            <img src="${product.image}" alt="${product.name}">
            <h3>${product.name}</h3>
        `;
        productCard.addEventListener('click', () => {
            window.location.href = `product-detail.html?id=${product.id}`;
        });
        productList.appendChild(productCard);
    }

    function fetchProducts() {
        const genre = document.getElementById('genre') ? document.getElementById('genre').value : '';
        const minPrice = document.getElementById('min-price') ? document.getElementById('min-price').value : 0;
        const maxPrice = document.getElementById('max-price') ? document.getElementById('max-price').value : 1000000000;
        const searchName = new URLSearchParams(window.location.search).get('search') || '';

        const queryParams = new URLSearchParams({
            genre,
            minPrice,
            maxPrice,
            searchName,
            limit: itemsPerPage,
            offset: (currentPage - 1) * itemsPerPage
        });

        fetch(`/products?${queryParams.toString()}`)
            .then(response => response.json())
            .then(products => {
                if (productList) {
                    productList.innerHTML = '';
                    products.forEach(addProductCard);
                }
            })
            .catch(error => console.error('Error fetching products:', error));
    }

    const filterButton = document.getElementById('filter-button');
    if (filterButton) {
        filterButton.addEventListener('click', () => {
            currentPage = 1;
            fetchProducts();
        });
    }

    const prevPageButton = document.getElementById('prev-page');
    if (prevPageButton) {
        prevPageButton.addEventListener('click', () => {
            if (currentPage > 1) {
                currentPage--;
                fetchProducts();
            }
        });
    }

    const nextPageButton = document.getElementById('next-page');
    if (nextPageButton) {
        nextPageButton.addEventListener('click', () => {
            currentPage++;
            fetchProducts();
        });
    }

    const genreSelect = document.getElementById('genre');
    if (genreSelect) {
        genreSelect.addEventListener('change', () => {
            fetchProducts();
        });
    }

    const genreParam = urlParams.get('genre');
    if (genreSelect && genreParam) {
        genreSelect.value = genreParam;
    }

    // 初回表示時に検索クエリが存在する場合はそのクエリを使って商品を検索
    const initialSearchQuery = urlParams.get('search');
    const headerSearchInput = document.getElementById('header-search-input');
    if (headerSearchInput && initialSearchQuery) {
        headerSearchInput.value = initialSearchQuery;
    }

    fetchProducts();
});
