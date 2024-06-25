// 変数定義
let currentSlideIndex = 0;
let slideInterval;
const itemsPerPage = 20;
let currentPage = 1;
let totalPages = 1;
let sortOrder = 'newest'; // 'newest', 'price-asc', 'price-desc'
let heroBanner;
let dotsContainer;
const signupForm = document.getElementById('signup-form');
const postalCodeInput = document.getElementById('postal-code');
const prefectureInput = document.getElementById('prefecture');
const cityInput = document.getElementById('city');
const addressInput = document.getElementById('address');
const messageDiv = document.getElementById('message');

//関数定義
function fetchCategories() {
    fetch('/categories')
        .then(response => response.json())
        .then(data => {
            const categoryList = document.getElementById('category-list');
            categoryList.innerHTML = '';
            const categories = data.reduce((acc, category) => {
                const { genre, subgenre, subsubgenre } = category;
                if (!acc[genre]) acc[genre] = { subgenres: {} };
                if (subgenre) {
                    if (!acc[genre].subgenres[subgenre]) acc[genre].subgenres[subgenre] = [];
                    if (subsubgenre) acc[genre].subgenres[subgenre].push(subsubgenre);
                }
                return acc;
            }, {});

            for (const [genre, { subgenres }] of Object.entries(categories)) {
                const genreItem = document.createElement('li');
                genreItem.innerHTML = `<a href="product-list.html?genre=${genre}">${genre}<span style="margin-left:auto;">＞</span></a>`;
                const subgenreList = document.createElement('ul');
                subgenreList.className = 'subcategory-list';

                for (const [subgenre, subsubgenres] of Object.entries(subgenres)) {
                    const subgenreItem = document.createElement('li');
                    subgenreItem.innerHTML = `<a href="product-list.html?genre=${genre}&subgenre=${subgenre}">${subgenre}<span style="margin-left:auto;">＞</span></a>`;
                    const subsubgenreList = document.createElement('ul');
                    subsubgenreList.className = 'subcategory-list';

                    subsubgenres.forEach(subsubgenre => {
                        const subsubgenreItem = document.createElement('li');
                        subsubgenreItem.innerHTML = `<a href="product-list.html?genre=${genre}&subgenre=${subgenre}&subsubgenre=${subsubgenre}">${subsubgenre}<span style="margin-left:auto;">＞</span></a>`;
                        subsubgenreList.appendChild(subsubgenreItem);
                    });

                    subgenreItem.appendChild(subsubgenreList);
                    subgenreList.appendChild(subgenreItem);
                }

                genreItem.appendChild(subgenreList);
                categoryList.appendChild(genreItem);
            }
        })
        .catch(error => console.error('Error fetching categories:', error));
}

function addProductCard(product) {
    const productCard = document.createElement('div');
    productCard.className = 'product-card';
    productCard.innerHTML = `
        <img src="${product.image}" alt="${product.name}">
        <h3>${product.name}</h3>
        <p class="price">¥${product.price}</p>
    `;
    productCard.addEventListener('click', () => {
        window.location.href = `product-detail.html?id=${product.id}`;
    });
    document.getElementById('product-list').appendChild(productCard);
}

function fetchProducts() {
    const urlParams = new URLSearchParams(window.location.search);
    const genre = urlParams.get('genre') || 'all';
    const subgenre = urlParams.get('subgenre') || '';
    const subsubgenre = urlParams.get('subsubgenre') || '';
    const minPrice = document.getElementById('min-price') ? document.getElementById('min-price').value : 0;
    const maxPrice = document.getElementById('max-price') ? document.getElementById('max-price').value : 100000000;
    const searchName = urlParams.get('search') || '';

    const queryParams = new URLSearchParams({
        genre,
        subgenre,
        subsubgenre,
        minPrice,
        maxPrice,
        searchName,
        limit: itemsPerPage,
        offset: (currentPage - 1) * itemsPerPage,
        sort: sortOrder
    });

    fetch(`/products?${queryParams.toString()}`)
        .then(response => response.json())
        .then(data => {
            const { products, total } = data;
            totalPages = Math.ceil(total / itemsPerPage);
            document.getElementById('product-list').innerHTML = '';
            products.forEach(addProductCard);

            const totalProductsElement = document.getElementById('total-products');
            totalProductsElement.textContent = `累計商品数: ${total}`;
            updatePagination();
        })
        .catch(error => console.error('Error fetching products:', error));
}

function updatePagination() {
    const paginationContainer = document.querySelector('.pagination');
    paginationContainer.innerHTML = '';

    if (currentPage > 1) {
        const prevButton = document.createElement('button');
        prevButton.textContent = '<';
        prevButton.addEventListener('click', () => {
            currentPage--;
            fetchProducts();
            window.scrollTo(0, 0);
        });
        paginationContainer.appendChild(prevButton);
    }

    let startPage = Math.max(currentPage - 4, 1);
    let endPage = Math.min(currentPage + 4, totalPages);
    if (endPage - startPage < 8) {
        if (startPage === 1) {
            endPage = Math.min(startPage + 8, totalPages);
        } else if (endPage === totalPages) {
            startPage = Math.max(endPage - 8, 1);
        }
    }

    for (let i = startPage; i <= endPage; i++) {
        const pageButton = document.createElement('button');
        pageButton.textContent = i;
        if (i === currentPage) {
            pageButton.disabled = true;
        }
        pageButton.addEventListener('click', () => {
            currentPage = i;
            fetchProducts();
            window.scrollTo(0, 0);
        });
        paginationContainer.appendChild(pageButton);
    }

    if (currentPage < totalPages) {
        const nextButton = document.createElement('button');
        nextButton.textContent = '>';
        nextButton.addEventListener('click', () => {
            currentPage++;
            fetchProducts();
            window.scrollTo(0, 0);
        });
        paginationContainer.appendChild(nextButton);
    }
}

function showSlide(index) {
    const slides = document.querySelectorAll('.hero-banner .slide');
    if (index >= slides.length) index = 0;
    if (index < 0) index = slides.length - 1;
    slides.forEach((slide, i) => {
        slide.style.display = i === index ? 'block' : 'none';
        dotsContainer.children[i].className = dotsContainer.children[i].className.replace(' active', '');
        if (i === index) {
            dotsContainer.children[i].className += ' active';
        }
    });
    currentSlideIndex = index;
}

function nextSlide() {
    showSlide(currentSlideIndex + 1);
}

function resetSlideInterval() {
    clearInterval(slideInterval);
    slideInterval = setInterval(nextSlide, 3000);
}

window.currentSlide = function(index) {
    showSlide(index);
    resetSlideInterval();
}

function fetchBannerData() {
    fetch('/banners')
        .then(response => response.json())
        .then(banners => {
            heroBanner.innerHTML = banners.map((banner, index) => `
                <div class="slide" style="background-image: url('${banner.image}');" onclick="window.location.href='${banner.link}'">
                    <h1>${banner.title}</h1>
                    <p>${banner.description}</p>
                </div>
            `).join('');
            dotsContainer.innerHTML = banners.map((_, index) => `
                <span class="dot" onclick="currentSlide(${index})"></span>
            `).join('');
            showSlide(currentSlideIndex);
            resetSlideInterval()
        })
        .catch(error => console.error('Error fetching banner data:', error));
}

function fetchNewArrivals() {
    fetch('/products/new')
        .then(response => {
            if (!response.ok) {
                throw new Error('商品が見つかりませんでした。');
            }
            return response.json();
        })
        .then(products => {
            const newArrivals = document.getElementById('new-arrivals');
            newArrivals.innerHTML = '';
            products.forEach(product => {
                const productCard = document.createElement('div');
                productCard.className = 'product-card';
                productCard.innerHTML = `
                    <img src="${product.image}" alt="${product.name}">
                    <h3>${product.name}</h3>
                    <p class="price">${product.price}円</p>
                `;
                productCard.addEventListener('click', () => {
                    window.location.href = `product-detail.html?id=${product.id}`;
                });
                newArrivals.appendChild(productCard);
            });
        })
        .catch(error => console.error('Error fetching new arrivals:', error));
}

function registerEmail(event) {
    event.preventDefault();

    const emailForm = document.getElementById('email-form');
    const messageDiv = document.getElementById('message');

    const data = {
        email: emailForm.email.value
    };

    fetch('/register_email', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    })
    .then(response => response.json())
    .then(data => {
        messageDiv.innerText = data.message;
        if (data.success) {
            messageDiv.classList.add('success');
            messageDiv.classList.remove('error');
            localStorage.setItem('email', emailForm.email.value);
            window.location.href = 'verify.html';
        } else {
            messageDiv.classList.add('error');
            messageDiv.classList.remove('success');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        messageDiv.innerText = '登録中にエラーが発生しました。js';
        messageDiv.classList.add('error');
        messageDiv.classList.remove('success');
    });
}

function verifyEmail(event) {
    event.preventDefault();

    const verificationForm = document.getElementById('verification-form');
    const messageDiv = document.getElementById('message');

    const email = localStorage.getItem('email');
    const data = {
        email: email,
        code: verificationForm.code.value
    };

    fetch('/verify_email', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    })
    .then(response => response.json())
    .then(data => {
        messageDiv.innerText = data.message;
        if (data.success) {
            messageDiv.classList.add('success');
            messageDiv.classList.remove('error');
            window.location.href = 'signup.html';
        } else {
            messageDiv.classList.add('error');
            messageDiv.classList.remove('success');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        messageDiv.innerText = '確認中にエラーが発生しました。';
        messageDiv.classList.add('error');
        messageDiv.classList.remove('success');
    });
}

function fetchAddress() {
    const postalCode = postalCodeInput.value.trim();
    if (postalCode.length === 7) {
        fetch(`http://zipcloud.ibsnet.co.jp/api/search?zipcode=${postalCode}`)
            .then(response => response.json())
            .then(data => {
                if (data.results) {
                    const result = data.results[0];
                    prefectureInput.value = result.address1;
                    cityInput.value = result.address2;
                    addressInput.value = result.address3;
                    messageDiv.innerText = '';
                    messageDiv.classList.remove('error');
                } else {
                    messageDiv.innerText = '住所情報が見つかりませんでした。';
                    messageDiv.classList.add('error');
                    messageDiv.classList.remove('success');
                }
            })
            .catch(error => {
                console.error('Error:', error);
                messageDiv.innerText = '住所情報の取得中にエラーが発生しました。';
                messageDiv.classList.add('error');
                messageDiv.classList.remove('success');
            });
    }
}

function signup(event) {
    event.preventDefault();

    const messageDiv = document.getElementById('message');
    const email = localStorage.getItem('email');
    if (!email) {
        messageDiv.innerText = 'メールアドレスが見つかりません。';
        messageDiv.classList.add('error');
        messageDiv.classList.remove('success');
        return;
    }

    const data = {
        first_name: signupForm['first-name'].value,
        last_name: signupForm['last-name'].value,
        username: signupForm.username.value,
        email: email,
        password: signupForm.password.value,
        password_confirm: signupForm['password-confirm'].value,
        postal_code: signupForm['postal-code'].value,
        prefecture: signupForm.prefecture.value,
        city: signupForm.city.value,
        address: signupForm.address.value,
        building: signupForm.building.value,
        phone: signupForm.phone.value
    };

    fetch('/signup', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    })
    .then(response => response.json())
    .then(data => {
        messageDiv.innerText = data.message;
        if (data.success) {
            messageDiv.classList.add('success');
            messageDiv.classList.remove('error');
            localStorage.removeItem('email');
        } else {
            messageDiv.classList.add('error');
            messageDiv.classList.remove('success');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        messageDiv.classList.add('error');
        messageDiv.classList.remove('success');
    });
}


// 実行制御
document.addEventListener('DOMContentLoaded', () => {
    heroBanner = document.querySelector('.slides-container');
    dotsContainer = document.querySelector('.dots');

    if (document.getElementById('category-list')) {
        fetchCategories();
    }

    if (document.getElementById('product-list')) {
        fetchProducts();
    }

    if (heroBanner && dotsContainer) {
        fetchBannerData();
        resetSlideInterval();
    }

    if (document.getElementById('new-arrivals')) {
        fetchNewArrivals();
    }

    const filterButton = document.getElementById('filter-button');
    if (filterButton) {
        filterButton.addEventListener('click', () => {
            currentPage = 1;
            fetchProducts();
        });
    }

    const sortOrderSelect = document.getElementById('sort-order');
    if (sortOrderSelect) {
        sortOrderSelect.addEventListener('change', () => {
            sortOrder = sortOrderSelect.value;
            fetchProducts();
        });
    }

    const emailForm = document.getElementById('email-form');
    if (emailForm) {
        emailForm.addEventListener('submit', registerEmail);
    }

    const verificationForm = document.getElementById('verification-form');
    if (verificationForm) {
        const email = localStorage.getItem('email');
        if (email) {
            document.getElementById('verification-email').value = email;
        } else {
            window.location.href = 'email.html';
        }
        verificationForm.addEventListener('submit', verifyEmail);
    }

    if (signupForm) {
        const email = localStorage.getItem('email');
        if (!email) {
            // window.location.href = 'email.html';
        }
        signupForm.addEventListener('submit', signup);
        postalCodeInput.addEventListener('input', fetchAddress);
    }
});
