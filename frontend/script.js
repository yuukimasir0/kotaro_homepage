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
                        subgenreItem.innerHTML = `<a href="product-list.html?genre=${genre}&subgenre=${subgenre}">${subgenre}</a>`;
                        const subsubgenreList = document.createElement('ul');
                        subsubgenreList.className = 'subcategory-list';

                        subsubgenres.forEach(subsubgenre => {
                            const subsubgenreItem = document.createElement('li');
                            subsubgenreItem.innerHTML = `<a href="product-list.html?genre=${genre}&subgenre=${subgenre}&subsubgenre=${subsubgenre}">${subsubgenre}</a>`;
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
        const maxPrice = document.getElementById('max-price') ? document.getElementById('max-price').value : 10000;
        const searchName = urlParams.get('search') || '';
        const sortOrder = document.getElementById('sort-order').value;

        const queryParams = new URLSearchParams({
            genre,
            subgenre,
            subsubgenre,
            minPrice,
            maxPrice,
            searchName,
            limit: 20, // 1ページあたりのアイテム数
            offset: 0,
            sort: sortOrder
        });

        fetch(`/products?${queryParams.toString()}`)
            .then(response => response.json())
            .then(data => {
                const { products, total } = data;
                const productList = document.getElementById('product-list');
                productList.innerHTML = '';
                products.forEach(addProductCard);

                const totalProductsElement = document.getElementById('total-products');
                totalProductsElement.textContent = `累計商品数: ${total}`;
            })
            .catch(error => console.error('Error fetching products:', error));
    }

    fetchCategories();
    fetchProducts();

    document.getElementById('sort-order').addEventListener('change', fetchProducts);
    document.getElementById('filter-button').addEventListener('click', fetchProducts);
});
