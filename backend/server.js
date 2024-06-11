const express = require('express');
const mysql = require('mysql');
const path = require('path');
require('dotenv').config();

const app = express();
app.use(express.json());

// データベース接続
const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: 'shop'
});

db.connect(err => {
    if (err) throw err;
    console.log('Database connected!');
});

// 新着商品エンドポイント
app.get('/products/new', (req, res) => {
    console.log("New products endpoint called");  // デバッグメッセージ
    db.query('SELECT id, name, image FROM products ORDER BY created_at DESC LIMIT 10', (err, results) => {
        if (err) return res.status(500).send({ message: 'データベースエラー' });
        
        console.log(results); // デバッグ用にクエリ結果をコンソールに出力

        if (results.length > 0) {
            res.json(results);
        } else {
            res.status(404).send({ message: '商品が見つかりませんでした。' });
        }
    });
});

// 商品詳細エンドポイント
app.get('/products/:id', (req, res) => {
    const productId = req.params.id;
    db.query('SELECT * FROM products WHERE id = ?', [productId], (err, results) => {
        if (err) return res.status(500).send({ message: 'データベースエラー' });
        if (results.length > 0) {
            res.json(results[0]);
        } else {
            res.status(404).send({ message: '商品が見つかりませんでした。' });
        }
    });
});

// 商品一覧エンドポイント
app.get('/products', (req, res) => {
    const { genre, subgenre, subsubgenre, minPrice, maxPrice, searchName, limit, offset, sort } = req.query;

    let query = `
        SELECT SQL_CALC_FOUND_ROWS p.*
        FROM products p
        JOIN categories c ON p.genre_id = c.id
        WHERE 1=1
    `;
    const queryParams = [];

    if (genre && genre !== 'all') {
        query += ' AND c.genre = ?';
        queryParams.push(genre);
    }
    if (subgenre) {
        query += ' AND c.subgenre = ?';
        queryParams.push(subgenre);
    }
    if (subsubgenre) {
        query += ' AND c.subsubgenre = ?';
        queryParams.push(subsubgenre);
    }
    if (minPrice) {
        query += ' AND p.price >= ?';
        queryParams.push(minPrice);
    }
    if (maxPrice) {
        query += ' AND p.price <= ?';
        queryParams.push(maxPrice);
    }
    if (searchName) {
        query += ' AND p.name LIKE ?';
        queryParams.push(`%${searchName}%`);
    }

    if (sort === 'price-asc') {
        query += ' ORDER BY p.price ASC';
    } else if (sort === 'price-desc') {
        query += ' ORDER BY p.price DESC';
    } else {
        query += ' ORDER BY p.created_at DESC';
    }

    query += ' LIMIT ? OFFSET ?';
    queryParams.push(parseInt(limit, 10));
    queryParams.push(parseInt(offset, 10));

    db.query(query, queryParams, (err, results) => {
        if (err) throw err;

        db.query('SELECT FOUND_ROWS() as total', (err, totalResults) => {
            if (err) throw err;

            const total = totalResults[0].total;
            res.json({ products: results, total });
        });
    });
});


// カテゴリを取得するエンドポイント
app.get('/categories', (req, res) => {
    db.query('SELECT * FROM categories', (err, results) => {
        if (err) {
            console.error('Error fetching categories:', err);
            res.status(500).send('Server Error');
            return;
        }
        res.json(results);
    });
});



// 静的ファイルの提供
app.use(express.static(path.join(__dirname, '../frontend')));

// サーバーの起動
app.listen(3000, () => {
    console.log('Server running on port 3000');
});
