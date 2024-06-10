const express = require('express');
const mysql = require('mysql');
const path = require('path');
const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const WebSocket = require('ws');
require('dotenv').config();

const app = express();
app.use(express.json());

// データベース接続
const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
});

db.connect(err => {
    if (err) throw err;
    console.log('Database connected!');
});

// WebSocketサーバーの設定
const wss = new WebSocket.Server({ noServer: true });

app.post('/products', (req, res) => {
    const { name, description, price, model_path, image } = req.body;
    db.query('INSERT INTO products (name, description, price, model_path, image) VALUES (?, ?, ?, ?, ?)', [name, description, price, model_path, image], (err, result) => {
        if (err) throw err;
        res.json({ id: result.insertId });

        // WebSocketを通じてクライアントに通知
        const newProduct = { id: result.insertId, name, image };
        wss.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify(newProduct));
            }
        });
    });
});

// サーバーのHTTPサーバーの作成
const server = app.listen(3000, () => {
    console.log('Server running on port 3000');
});

// WebSocket接続の管理
server.on('upgrade', (request, socket, head) => {
    wss.handleUpgrade(request, socket, head, ws => {
        wss.emit('connection', ws, request);
    });
});

// 商品一覧エンドポイント（フィルター対応）
app.get('/products', (req, res) => {
    const { genre, minPrice, maxPrice, searchName } = req.query;
    let query = 'SELECT id, name, image FROM products WHERE 1=1';
    let params = [];

    if (genre) {
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

    db.query(query, params, (err, results) => {
        if (err) return res.status(500).send({ message: 'データベースエラー' });
        res.json(results);
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

// 新着商品エンドポイント
app.get('/products/new', (req, res) => {
    db.query('SELECT id, name, image FROM products ORDER BY id DESC LIMIT 10', (err, results) => {
        if (err) return res.status(500).send({ message: 'データベースエラー' });
        res.json(results);
    });
});

// ユーザー登録エンドポイント
app.post('/register', async (req, res) => {
    const { id, email, password, postal_code, prefecture, city, address, phone } = req.body;
    
    if (!id || !email || !password || !postal_code || !prefecture || !city || !address || !phone) {
        return res.status(400).send('All fields are required');
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);

        // ユーザーデータをデータベースに保存
        db.query('INSERT INTO users (id, email, password, postal_code, prefecture, city, address, phone) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [id, email, hashedPassword, postal_code, prefecture, city, address, phone], (err, result) => {
                if (err) return res.status(500).send('データベースエラー');
                res.send({ message: 'ユーザー登録が完了しました。' });
            });
    } catch (error) {
        res.status(500).send('サーバーエラー');
    }
});

// 静的ファイルの提供
app.use(express.static(path.join(__dirname, '../frontend')));