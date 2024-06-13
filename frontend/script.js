document.addEventListener('DOMContentLoaded', () => {
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

    const productList = document.getElementById('product-list');
    const itemsPerPage = 20;
    let currentPage = 1;
    let totalPages = 1;
    let sortOrder = 'newest'; // 'newest', 'price-asc', 'price-desc'

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
                const productList = document.getElementById('product-list');
                productList.innerHTML = '';
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

    fetchCategories();
    fetchProducts();

    document.getElementById('sort-order').addEventListener('change', fetchProducts);
    document.getElementById('filter-button').addEventListener('click', fetchProducts);
});

