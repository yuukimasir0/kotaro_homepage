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

// 商品一覧エンドポイント（フィルター対応）
app.get('/products', (req, res) => {
    const { genre, minPrice, maxPrice, searchName, limit, offset } = req.query;
    let query = 'SELECT id, name, image FROM products WHERE 1=1';
    let params = [];

    if (genre && genre !== 'all') {
        query += ' AND genre = ?';
        params.push(genre);
    }
    if (minPrice) {
        query += ' AND price >= ?';
        params.push(minPrice);
    }
    if (maxPrice) {
        query += ' AND price <= ?';
        params.push(maxPrice);
    }
    if (searchName) {
        query += ' AND name LIKE ?';
        params.push(`%${searchName}%`);
    }

    query += ' ORDER BY created_at DESC';
    if (limit) {
        query += ' LIMIT ?';
        params.push(parseInt(limit));
    }
    if (offset) {
        query += ' OFFSET ?';
        params.push(parseInt(offset));
    }

    db.query(query, params, (err, results) => {
        if (err) return res.status(500).send({ message: 'データベースエラー' });
        res.json(results);
    });
});

// 静的ファイルの提供
app.use(express.static(path.join(__dirname, '../frontend')));

// サーバーの起動
app.listen(3000, () => {
    console.log('Server running on port 3000');
});
