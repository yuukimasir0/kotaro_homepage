use actix_web::{web, App, HttpServer, Responder, HttpResponse};
use actix_files as fs;
use bcrypt::{hash, DEFAULT_COST};
use serde::{Deserialize, Serialize};
use mysql::*;
use mysql::prelude::*;
use dotenv::dotenv;
use std::env;
use std::sync::Arc;
use std::collections::HashMap;
use serde_json::json;
use rand::{thread_rng, Rng};
use rand::distributions::Alphanumeric;
use lettre::Message;
use lettre::transport::smtp::authentication::Credentials;
use lettre::SmtpTransport;
use lettre::Transport;
use std::time::{SystemTime, UNIX_EPOCH};
use jsonwebtoken::{encode, Header, EncodingKey};

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

#[derive(Serialize, Deserialize)]
struct Banner {
    id: u32,
    image: String,
    link: String,
    title: String,
    description: String,
}

#[derive(Serialize, Deserialize, Debug)]
struct Verification {
    email: String,
    code: String,
    expiration: u64,
}

#[derive(Deserialize)]
struct EmailData {
    email: String,
}

#[derive(Deserialize)]
struct VerificationData {
    email: String,
    code: String,
}

#[derive(Deserialize)]
struct SignupData {
    first_name: String,
    last_name: String,
    username: String,
    email: String,
    password: String,
    password_confirm: String,
    postal_code: String,
    prefecture: String,
    city: String,
    address: String,
    building: Option<String>,
    phone: String,
}

#[derive(Serialize)]
struct ResponseMessage {
    success: bool,
    message: String,
}

#[derive(Deserialize)]
struct LoginRequest {
    email: String,
    password: String,
}

#[derive(Serialize)]
struct Claims {
    sub: String,
    exp: usize,
}


impl FromRow for Verification {
    fn from_row(row: Row) -> Self {
        Verification {
            email: row.get("email").unwrap(),
            code: row.get("code").unwrap(),
            expiration: row.get("expiration").unwrap(),
        }
    }

    fn from_row_opt(row: Row) -> Result<Self, FromRowError> {
        Ok(Verification {
            email: row.get("email").ok_or(FromRowError(row.clone()))?,
            code: row.get("code").ok_or(FromRowError(row.clone()))?,
            expiration: row.get("expiration").ok_or(FromRowError(row.clone()))?,
        })
    }
}

fn send_verification_email(email: &str, code: &str) -> Result<(), Box<dyn std::error::Error>> {
    let email_body = format!("Your verification code is: {}", code);
    let email = Message::builder()
        .from("no-reply@example.com".parse()?)
        .to(email.parse()?)
        .subject("Email Verification")
        .body(email_body)?;

    let creds = Credentials::new(
        env::var("SMTP_USER").unwrap(),
        env::var("SMTP_PASS").unwrap(),
    );

    let mailer = SmtpTransport::relay("smtp.example.com")?
        .credentials(creds)
        .build();

    mailer.send(&email)?;

    Ok(())
}

async fn register_email(
    pool: web::Data<Arc<Pool>>,
    email_data: web::Json<EmailData>
) -> impl Responder {
    let mut conn = pool.get_conn().expect("Failed to get connection from pool");

    let existing_emails: Option<String> = conn.exec_first(
        "SELECT email FROM Users WHERE email = :email",
        params! {
            "email" => &email_data.email,
        },
    ).unwrap_or(None);

    if existing_emails.is_some() {
        return HttpResponse::BadRequest().json(ResponseMessage {
            success: false,
            message: "メールアドレスは既に存在します".to_string(),
        });
    }

    let code: String = thread_rng().sample_iter(&Alphanumeric).take(6).map(char::from).collect();
    let expiration = SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_secs() + 3600; // 1 hour

    conn.exec_drop(
        "INSERT INTO Verifications (email, code, expiration) VALUES (:email, :code, :expiration)",
        params! {
            "email" => &email_data.email,
            "code" => &code,
            "expiration" => &expiration,
        },
    ).expect("Failed to execute query");

    // match send_verification_email(&email_data.email, &code) {
    //     Ok(_) => HttpResponse::Ok().json(ResponseMessage {
    //         success: true,
    //         message: "確認コードが送信されました".to_string(),
    //     }),
    //     Err(_) => HttpResponse::InternalServerError().json(ResponseMessage {
    //         success: false,
    //         message: "確認コードの送信中にエラーが発生しました".to_string(),
    //     }),
    // }
    HttpResponse::Ok().json(ResponseMessage {
        success: true,
        message: "確認コードが送信されました".to_string(),
    })
}

async fn verify_email(
    pool: web::Data<Arc<Pool>>,
    verification_data: web::Json<VerificationData>
) -> impl Responder {
    let mut conn = pool.get_conn().expect("Failed to get connection from pool");

    let result: Option<Verification> = conn.exec_first(
        "SELECT email, code, expiration FROM Verifications WHERE email = :email AND code = :code",
        params! {
            "email" => &verification_data.email,
            "code" => &verification_data.code,
        },
    ).unwrap_or(None);

    if let Some(verification) = result {
        if verification.expiration < SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_secs() {
            return HttpResponse::BadRequest().json(ResponseMessage {
                success: false,
                message: "確認コードの有効期限が切れています".to_string(),
            });
        }

        conn.exec_drop(
            "DELETE FROM Verifications WHERE email = :email",
            params! {
                "email" => &verification.email,
            },
        ).expect("Failed to execute query");

        HttpResponse::Ok().json(ResponseMessage {
            success: true,
            message: "メールアドレスが確認されました".to_string(),
        })
    } else {
        HttpResponse::BadRequest().json(ResponseMessage {
            success: false,
            message: "確認コードが無効です".to_string(),
        })
    }
}

async fn signup(
    pool: web::Data<Arc<Pool>>,
    signup_data: web::Json<SignupData>
) -> impl Responder {
    if signup_data.password != signup_data.password_confirm {
        return HttpResponse::BadRequest().json(ResponseMessage {
            success: false,
            message: "パスワードが一致しません".to_string(),
        });
    }

    let mut conn = pool.get_conn().expect("Failed to get connection from pool");

    let existing_usernames: Option<String> = conn.exec_first(
        "SELECT username FROM Users WHERE username = :username",
        params! {
            "username" => &signup_data.username,
        },
    ).unwrap_or(None);

    if existing_usernames.is_some() {
        return HttpResponse::BadRequest().json(ResponseMessage {
            success: false,
            message: "ユーザー名は既に存在します".to_string(),
        });
    }

    let password_hash = match hash(&signup_data.password, DEFAULT_COST) {
        Ok(hashed) => hashed,
        Err(_) => return HttpResponse::InternalServerError().json(ResponseMessage {
            success: false,
            message: "パスワードのハッシュ化中にエラーが発生しました".to_string(),
        }),
    };

    let full_address = format!(
        "{}{}{}{}",
        signup_data.prefecture, signup_data.city, signup_data.address, signup_data.building.clone().unwrap_or_default()
    );

    let result: Result<(), _> = conn.exec_drop(
        r"INSERT INTO Users (first_name, last_name, username, email, password, postal_code, address, phone)
          VALUES (:first_name, :last_name, :username, :email, :password, :postal_code, :address, :phone)",
        params! {
            "first_name" => &signup_data.first_name,
            "last_name" => &signup_data.last_name,
            "username" => &signup_data.username,
            "email" => &signup_data.email,
            "password" => &password_hash,
            "postal_code" => &signup_data.postal_code,
            "address" => &full_address,
            "phone" => &signup_data.phone,
        },
    );

    match result {
        Ok(_) => HttpResponse::Ok().json(ResponseMessage {
            success: true,
            message: "ユーザー登録が完了しました".to_string(),
        }),
        Err(_) => HttpResponse::InternalServerError().json(ResponseMessage {
            success: false,
            message: "ユーザー登録中にエラーが発生しました".to_string(),
        }),
    }
}

async fn get_new_products(pool: web::Data<Arc<Pool>>) -> impl Responder {
    let mut conn = pool.get_conn().expect("Failed to get connection from pool");
    let products: Vec<Product> = conn
        .query_map(
            "SELECT id, name, description, price, image, genre_id FROM products ORDER BY created_at DESC LIMIT 8",
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

async fn get_banners(pool: web::Data<Arc<Pool>>) -> impl Responder {
    let mut conn = pool.get_conn().expect("Failed to get connection from pool");
    let banners: Vec<Banner> = conn
        .query_map("SELECT id, image, link, title, description FROM banners", |(id, image, link, title, description)| {
            Banner { id, image, link, title, description }
        })
        .expect("Failed to execute query");

    HttpResponse::Ok().json(banners)
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
            .route("/banners", web::get().to(get_banners))
            .route("/register_email", web::post().to(register_email))
            .route("/verify_email", web::post().to(verify_email))
            .route("/signup", web::post().to(signup))
            .service(fs::Files::new("/", "../frontend").index_file("index.html"))
    })
    .bind("127.0.0.1:3000")?
    .run()
    .await
}
