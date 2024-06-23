use actix_web::{web, App, HttpServer, Responder, HttpResponse};
use actix_files as fs;
use mysql::*;
use mysql::prelude::*;
use serde::{Deserialize, Serialize};
use dotenv::dotenv;
use std::env;
use std::sync::Arc;
use std::collections::HashMap;
use serde_json::json;

#[derive(Serialize, Deserialize, Debug)]
struct Product {
    id: u32,
    name: String,
    description: Option<String>,
    price: f64,
    image: Option<String>,
    genre_id: Option<u32>,
}

#[derive(Serialize, Deserialize)]
struct Category {
    id: u32,
    genre: String,
    subgenre: Option<String>,
    subsubgenre: Option<String>,
}

async fn get_new_products(pool: web::Data<Arc<Pool>>) -> impl Responder {
    let mut conn = pool.get_conn().expect("Failed to get connection from pool");
    let products: Vec<Product> = conn
        .query_map(
            "SELECT id, name, description, price, image, genre_id FROM products ORDER BY created_at DESC LIMIT 10",
            |(id, name, description, price, image, genre_id)| Product { id, name, description, price, image, genre_id },
        )
        .expect("Failed to execute query");

    HttpResponse::Ok().json(products)
}

async fn get_product_by_id(pool: web::Data<Arc<Pool>>, product_id: web::Path<u32>) -> impl Responder {
    let mut conn = pool.get_conn().expect("Failed to get connection from pool");
    let results: Vec<Product> = conn
        .exec_map(
            "SELECT id, name, description, price, image, genre_id FROM products WHERE id = ?",
            (product_id.into_inner(),),
            |(id, name, description, price, image, genre_id)| Product { id, name, description, price, image, genre_id },
        )
        .expect("Failed to execute query");

    if let Some(product) = results.into_iter().next() {
        HttpResponse::Ok().json(product)
    } else {
        HttpResponse::NotFound().body("商品が見つかりませんでした。")
    }
}

async fn get_products(pool: web::Data<Arc<Pool>>, query: web::Query<HashMap<String, String>>) -> impl Responder {
    let mut conn = pool.get_conn().expect("Failed to get connection from pool");
    let mut sql_query = String::from(
        "SELECT SQL_CALC_FOUND_ROWS id, name, description, price, image, genre_id FROM products WHERE 1=1",
    );
    let mut params = vec![];
    let name: String;
    if let Some(genre) = query.get("genre").filter(|s| !s.is_empty()) {
        if genre != "all" {
            let mut category_query = " AND genre_id IN (SELECT id FROM categories WHERE genre = ?".to_string();
            params.push(genre.as_str());
            if let Some(subgenre) = query.get("subgenre").filter(|s| !s.is_empty()) {
                category_query.push_str(" AND subgenre = ?");
                params.push(subgenre.as_str());
                if let Some(subsubgenre) = query.get("subsubgenre").filter(|s| !s.is_empty()) {
                    category_query.push_str(" AND subsubgenre = ?");
                    params.push(subsubgenre.as_str());
                }
            }
            category_query.push(')');
            sql_query.push_str(&category_query);
        }
    }
    if let Some(min_price) = query.get("minPrice") {
        sql_query.push_str(" AND price >= ?");
        params.push(min_price.as_str());
    }
    if let Some(max_price) = query.get("maxPrice") {
        sql_query.push_str(" AND price <= ?");
        params.push(max_price.as_str());
    }
    if let Some(search_name) = query.get("searchName").filter(|s| !s.is_empty()) {
        sql_query.push_str(" AND name LIKE ?");
        name = format!("%{}%", search_name);
        params.push(name.as_str());
    }

    if let Some(sort) = query.get("sort") {
        if sort == "price-asc" {
            sql_query.push_str(" ORDER BY price ASC");
        } else if sort == "price-desc" {
            sql_query.push_str(" ORDER BY price DESC");
        } else {
            sql_query.push_str(" ORDER BY created_at DESC");
        }
    } else {
        sql_query.push_str(" ORDER BY created_at DESC");
    }

    if let Some(limit) = query.get("limit") {
        sql_query.push_str(" LIMIT ?");
        params.push(limit.as_str());
    }
    if let Some(offset) = query.get("offset") {
        sql_query.push_str(" OFFSET ?");
        params.push(offset.as_str());
    }
    // eprintln!("{sql_query}, {:?}", params);
    let products: Vec<Product> = conn.exec_map(&sql_query, params, |(id, name, description, price, image, genre_id)| Product { id, name, description, price, image, genre_id }).expect("Failed to execute query");

    let total: u32 = conn.query_first("SELECT FOUND_ROWS() as total").expect("Failed to execute FOUND_ROWS query").unwrap_or(0);
    HttpResponse::Ok().json(json!({ "products": products, "total": total }))
}

async fn get_categories(pool: web::Data<Arc<Pool>>) -> impl Responder {
    let mut conn = pool.get_conn().expect("Failed to get connection from pool");
    let categories: Vec<Category> = conn
        .query_map("SELECT id, genre, subgenre, subsubgenre FROM categories", |(id, genre, subgenre, subsubgenre)| {
            Category { id, genre, subgenre, subsubgenre }
        })
        .expect("Failed to execute query");

    HttpResponse::Ok().json(categories)
}

async fn get_similer(pool: web::Data<Arc<Pool>>, query: web::Query<HashMap<String, String>>) -> impl Responder {
    let mut conn = pool.get_conn().expect("Failed to get connection from pool");
    let mut sql_query = String::from("SELECT id, name, description, price, image, genre_id FROM products");
    let mut params = vec![];

    if let Some(genre_id) = query.get("genre_id") {
        sql_query.push_str(" WHERE genre_id = ?");
        params.push(genre_id.as_str());
    }

    let products: Vec<Product> = conn.exec_map(
        &sql_query,
        params,
        |(id, name, description, price, image, genre_id)| Product {
            id,
            name,
            description,
            price,
            image,
            genre_id,
        },
    ).expect("Failed to execute query");

    HttpResponse::Ok().json(products)
}

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    dotenv().ok();
    let db = OptsBuilder::new()
        .ip_or_hostname(Some(env::var("DB_HOST").expect("DB_HOST must be set")))
        .user(Some(env::var("DB_USER").expect("DB_USER must be set")))
        .pass(Some(env::var("DB_PASSWORD").expect("DB_PASSWORD must be set")))
        .db_name(Some(env::var("DB_NAME").expect("DB_NAME must be set")));
    let pool = Arc::new(Pool::new(db).expect("Failed to create pool"));

    HttpServer::new(move || {
        App::new()
            .app_data(web::Data::new(pool.clone()))
            .route("/products/new", web::get().to(get_new_products))
            .route("/products/{id}", web::get().to(get_product_by_id))
            .route("/products", web::get().to(get_products))
            .route("/similer", web::get().to(get_similer))
            .route("/categories", web::get().to(get_categories))
            .service(fs::Files::new("/", "../frontend").index_file("index.html"))
    })
    .bind("127.0.0.1:3000")?
    .run()
    .await
}
