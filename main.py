from fastapi import FastAPI, HTTPException, Request, Response, Header, Depends, File, UploadFile, Form
from fastapi.responses import JSONResponse, HTMLResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os

# Create uploads directory if it doesn't exist
os.makedirs("static/uploads", exist_ok=True)

class AgentCreate(BaseModel):
    name: str
    email: str
    phone_number: str
    password: str

class AgentUpdate(BaseModel):
    name: str
    phone_number: str

import pymysql
import pymysql.cursors
import hashlib
from typing import Optional
import datetime
import random
import uuid

# Session storage (In-memory for simplicity. In production, use Redis or DB)
# Since we are moving away from PHP sessions, we use simple token-based or cookie-based sessions.
sessions = {}

def get_admin_user(authorization: Optional[str] = Header(None)):
    if not authorization:
        raise HTTPException(status_code=401, detail="Unauthorized")
    token = authorization.replace("Bearer ", "")
    session = sessions.get(token)
    if not session or not session.get('authenticated'):
        raise HTTPException(status_code=401, detail="Invalid session")
    if session['role'] != 'Admin':
        raise HTTPException(status_code=403, detail="Forbidden: Admin access required")
    return session


# Configuration
DB_HOST = "127.0.0.1"
DB_USER = "root"
DB_PASS = "@#6ixteenZ@2005"
DB_NAME = "homefinder_db"

app = FastAPI()

# Password verification using built-in hashlib (SHA-256)
# NOTE: Passwords in the database should be stored as sha256 hashes.
# For the seed.sql dummy data, the plain password is 'password'.
def verify_password(plain_password: str, stored_hash: str) -> bool:
    # Support both SHA-256 (our format) and bcrypt (from PHP seed, best-effort)
    sha_hash = hashlib.sha256(plain_password.encode()).hexdigest()
    return sha_hash == stored_hash

def hash_password(plain_password: str) -> str:
    return hashlib.sha256(plain_password.encode()).hexdigest()


# Connect to Database
def get_db_connection():
    try:
        return pymysql.connect(
            host=DB_HOST,
            user=DB_USER,
            password=DB_PASS,
            database=DB_NAME,
            cursorclass=pymysql.cursors.DictCursor
        )
    except Exception as e:
        print(f"Error connecting to MySQL: {e}")
        return None

def log_audit_action(user_id, action, table_name, record_id, old_value, new_value, ip_address):
    conn = get_db_connection()
    if conn:
        cursor = conn.cursor()
        try:
            cursor.execute("""
                INSERT INTO audit_logs (log_id, user_id, action, table_name, record_id, old_value, new_value, ip_address)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            """, (str(uuid.uuid4()), user_id, action, table_name, record_id, old_value, new_value, ip_address))
            conn.commit()
        except Exception as e:
            print(f"Audit log failed: {e}")
        finally:
            cursor.close()
            conn.close()

# Models
class LoginRequest(BaseModel):
    email: Optional[str] = None
    password: Optional[str] = None
    otp: Optional[str] = None
    session_token: Optional[str] = None

# API Endpoints
@app.get("/api/get_properties")
def get_properties():
    conn = get_db_connection()
    if not conn:
        return {"status": "error", "message": "Database connection failed"}
    
    cursor = conn.cursor()
    cursor.execute("""
        SELECT p.property_id, p.property_name, p.price, p.description, 
               u.bedrooms, u.bathrooms, u.square_footage, m.url AS image_url
        FROM property p
        LEFT JOIN unit u ON p.property_id = u.property_id
        LEFT JOIN property_media m ON p.property_id = m.property_id AND m.is_featured = 1
        WHERE p.property_status = 'Published'
    """)
    properties = cursor.fetchall()
    cursor.close()
    conn.close()
    
    return {"status": "success", "data": properties}

@app.get("/api/get_property")
def get_property(id: str, request: Request):
    conn = get_db_connection()
    if not conn:
        return {"status": "error", "message": "Database connection failed"}
    
    cursor = conn.cursor()
    cursor.execute("""
        SELECT p.*, COALESCE(o.name, 'Unknown Owner') AS owner_name, 
               u.bedrooms, u.bathrooms, u.square_footage, u.monthly_rent, u.availability_status
        FROM property p
        LEFT JOIN owner o ON p.owner_id = o.owner_id
        LEFT JOIN unit u ON p.property_id = u.property_id
        WHERE p.property_id = %s
    """, (id,))
    prop = cursor.fetchone()
    
    if not prop:
        cursor.close()
        conn.close()
        return {"status": "error", "message": "Property not found."}
        
    cursor.execute("SELECT url FROM property_media WHERE property_id = %s", (id,))
    prop['media'] = cursor.fetchall()
    
    cursor.close()
    conn.close()
    
    log_audit_action(None, 'VIEW_PROPERTY', 'property', id, None, None, request.client.host)
    
    return {"status": "success", "data": prop}

@app.post("/api/login")
def login(req: LoginRequest, request: Request):
    # OTP Verification Step
    if req.session_token and req.session_token in sessions and req.otp:
        session = sessions[req.session_token]
        if req.otp == session['expected_otp']:
            log_audit_action(session['user_id'], 'LOGIN_SUCCESS', 'users', session['user_id'], None, 'OTP Verified', request.client.host)
            # Login success - convert to authenticated session
            del session['expected_otp']
            session['authenticated'] = True
            return {"status": "success", "redirect": "dashboard.html", "token": req.session_token}
        else:
            return {"status": "error", "message": "Invalid OTP. Please try again.", "otp_required": True}

    if not req.email or not req.password:
        return {"status": "error", "message": "Email and password are required."}

    conn = get_db_connection()
    if not conn:
        return {"status": "error", "message": "Database connection failed"}

    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users WHERE email = %s", (req.email,))
    user = cursor.fetchone()

    if not user:
        cursor.close()
        conn.close()
        return {"status": "error", "message": "Invalid email or password."}

    # Check lock
    if user['locked_until'] and user['locked_until'] > datetime.datetime.now():
        cursor.close()
        conn.close()
        return {"status": "error", "message": "Account locked due to too many failed attempts. Try again later."}

    # Verify Password (Assumes bcrypt hashes generated by PHP match Python passlib. If testing with dummy data, ensure compatible hash)
    # The dummy hash from seed.sql '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi' is compatible with passlib if we replace '$2y$' with '$2b$'
    hash_to_check = user['password_hash'].replace("$2y$", "$2b$") 
    
    try:
        is_valid = verify_password(req.password, user['password_hash'])
    except Exception as e:
        is_valid = False

    if is_valid:
        # Check Password Aging
        days_old = (datetime.datetime.now() - user['password_last_changed']).days
        if days_old > 90:
            cursor.close()
            conn.close()
            return {"status": "success", "redirect": "change_password.html"}

        cursor.execute("UPDATE users SET failed_login_attempts = 0, locked_until = NULL WHERE user_id = %s", (user['user_id'],))
        conn.commit()

        if user['otp_enabled']:
            otp = str(random.randint(100000, 999999))
            token = str(uuid.uuid4())
            sessions[token] = {
                'user_id': user['user_id'],
                'role': user['role'],
                'expected_otp': otp
            }
            cursor.close()
            conn.close()
            return {"status": "info", "otp_required": True, "message": f"OTP sent to your email. (For demo: {otp})", "session_token": token}
        else:
            token = str(uuid.uuid4())
            sessions[token] = {
                'user_id': user['user_id'],
                'role': user['role'],
                'authenticated': True
            }
            log_audit_action(user['user_id'], 'LOGIN_SUCCESS', 'users', user['user_id'], None, None, request.client.host)
            cursor.close()
            conn.close()
            return {"status": "success", "redirect": "dashboard.html", "token": token}
    else:
        attempts = user['failed_login_attempts'] + 1
        locked_until = (datetime.datetime.now() + datetime.timedelta(minutes=15)) if attempts >= 5 else None
        
        cursor.execute("UPDATE users SET failed_login_attempts = %s, locked_until = %s WHERE user_id = %s", (attempts, locked_until, user['user_id']))
        conn.commit()
        
        log_audit_action(user['user_id'], 'LOGIN_FAILED', 'users', user['user_id'], None, f"Attempt {attempts}", request.client.host)
        
        cursor.close()
        conn.close()
        return {"status": "error", "message": "Invalid email or password."}

@app.get("/api/dashboard")
def get_dashboard(request: Request, admin: dict = Depends(get_admin_user)):
    conn = get_db_connection()
    if not conn:
        return {"status": "error", "message": "Database connection failed"}

    cursor = conn.cursor()
    try:
        cursor.execute("SELECT COUNT(*) as cnt FROM property")
        total_listings = cursor.fetchone()['cnt']

        cursor.execute("SELECT COUNT(*) as cnt FROM property WHERE property_status = 'Published'")
        active_listings = cursor.fetchone()['cnt']

        cursor.execute("SELECT SUM(views) as total FROM property")
        res = cursor.fetchone()
        total_views = int(res['total'] or 0)

        # Inquiries count - try, default 0 if table missing
        try:
            cursor.execute("SELECT COUNT(*) as cnt FROM inquiry WHERE status = 'NEW'")
            new_inquiries = cursor.fetchone()['cnt']
            cursor.execute("SELECT COUNT(*) as cnt FROM inquiry")
            total_inquiries = cursor.fetchone()['cnt']
            
            cursor.execute("""
                SELECT i.inquiry_id, i.name, i.status, i.created_at, p.property_name
                FROM inquiry i
                LEFT JOIN property p ON i.property_id = p.property_id
                ORDER BY i.created_at DESC LIMIT 8
            """)
            recent_inquiries = cursor.fetchall()
            for inq in recent_inquiries:
                if inq.get('created_at'):
                    inq['created_at'] = str(inq['created_at'])
        except:
            new_inquiries = 0
            total_inquiries = 0
            recent_inquiries = []

        # Top listings
        cursor.execute("SELECT property_id, property_name, views, created_at FROM property WHERE property_status = 'Published' ORDER BY views DESC LIMIT 5")
        top_listings = cursor.fetchall()
        for t in top_listings:
            if t.get('created_at'):
                t['created_at'] = str(t['created_at'])

        # Recent Audit logs
        cursor.execute("""
            SELECT a.log_id, a.action, a.table_name, a.created_at, u.email as user_email
            FROM audit_logs a
            LEFT JOIN users u ON a.user_id = u.user_id
            ORDER BY a.created_at DESC LIMIT 5
        """)
        recent_audit_logs = cursor.fetchall()

        # Convert datetime to string for JSON serialization
        for log in recent_audit_logs:
            if log.get('created_at'):
                log['created_at'] = str(log['created_at'])

        return {
            "status": "success",
            "data": {
                "total_listings": total_listings,
                "active_listings": active_listings,
                "total_views": total_views,
                "new_inquiries": new_inquiries,
                "total_inquiries": total_inquiries,
                "recent_inquiries": recent_inquiries,
                "top_listings": top_listings,
                "recent_audit_logs": recent_audit_logs
            }
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}
    finally:
        cursor.close()
        conn.close()

@app.post("/api/contact")
async def contact(request: Request):
    data = await request.json()
    name = data.get('name', '')
    email = data.get('email', '')
    subject = data.get('subject', '')
    message = data.get('message', '')

    if not name or not email or not message:
        return {"status": "error", "message": "Name, email, and message are required."}

    # Log the contact message in the audit log
    log_audit_action(None, 'CONTACT_FORM', 'inquiry', None, None, f"From: {name} <{email}> | Subject: {subject}", request.client.host)

    return {"status": "success", "message": "Message received. We will get back to you soon."}

@app.post("/api/submit_inquiry")
async def submit_inquiry(request: Request):
    data = await request.json()
    name = data.get('name', '')
    email = data.get('email', '')
    message = data.get('message', '')
    property_id = data.get('property_id', '')

    if not name or not email or not message or not property_id:
        return {"status": "error", "message": "All fields are required."}

    conn = get_db_connection()
    if not conn:
        return {"status": "error", "message": "Database connection failed"}

    cursor = conn.cursor()
    try:
        cursor.execute("""
            INSERT INTO inquiry (inquiry_id, property_id, name, email, message, created_at)
            VALUES (%s, %s, %s, %s, %s, NOW())
        """, (str(uuid.uuid4()), property_id, name, email, message))
        conn.commit()
        log_audit_action(None, 'SUBMIT_INQUIRY', 'inquiry', property_id, None, f"From: {email}", request.client.host)
        return {"status": "success", "message": "Inquiry submitted successfully."}
    except Exception as e:
        return {"status": "error", "message": str(e)}
    finally:
        cursor.close()
        conn.close()

@app.post("/api/logout")
def logout():
    return {"status": "success", "message": "Logged out"}

@app.get("/api/admin/agents")
def get_agents(admin: dict = Depends(get_admin_user)):
    conn = get_db_connection()
    if not conn:
        return {"status": "error", "message": "Database connection failed"}
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT agent_id, user_id, name, phone_number, email FROM agent ORDER BY name ASC")
        agents = cursor.fetchall()
        return {"status": "success", "data": agents}
    except Exception as e:
        return {"status": "error", "message": str(e)}
    finally:
        cursor.close()
        conn.close()

@app.post("/api/admin/agents")
def create_agent(req: AgentCreate, admin: dict = Depends(get_admin_user)):
    conn = get_db_connection()
    if not conn:
        return {"status": "error", "message": "Database connection failed"}
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT * FROM users WHERE email = %s", (req.email,))
        if cursor.fetchone():
            return {"status": "error", "message": "Email already registered"}
            
        user_id = "AGT_U_" + str(uuid.uuid4())[:8]
        agent_id = "AGT_" + str(uuid.uuid4())[:8]
        password_hash = hash_password(req.password)
        
        cursor.execute("INSERT INTO users (user_id, email, password_hash, role) VALUES (%s, %s, %s, 'Agent')", (user_id, req.email, password_hash))
        cursor.execute("INSERT INTO agent (agent_id, user_id, name, email, phone_number) VALUES (%s, %s, %s, %s, %s)", (agent_id, user_id, req.name, req.email, req.phone_number))
        conn.commit()
        
        log_audit_action(admin['user_id'], 'CREATE_AGENT', 'agent', agent_id, None, f"Name: {req.name}", None)
        return {"status": "success", "message": "Agent created successfully"}
    except Exception as e:
        conn.rollback()
        return {"status": "error", "message": str(e)}
    finally:
        cursor.close()
        conn.close()

@app.put("/api/admin/agents/{agent_id}")
def update_agent(agent_id: str, req: AgentUpdate, admin: dict = Depends(get_admin_user)):
    conn = get_db_connection()
    if not conn:
        return {"status": "error", "message": "Database connection failed"}
    cursor = conn.cursor()
    try:
        cursor.execute("UPDATE agent SET name = %s, phone_number = %s WHERE agent_id = %s", (req.name, req.phone_number, agent_id))
        conn.commit()
        log_audit_action(admin['user_id'], 'UPDATE_AGENT', 'agent', agent_id, None, f"Updated name/phone", None)
        return {"status": "success", "message": "Agent updated"}
    except Exception as e:
        conn.rollback()
        return {"status": "error", "message": str(e)}
    finally:
        cursor.close()
        conn.close()

@app.delete("/api/admin/agents/{agent_id}")
def delete_agent(agent_id: str, admin: dict = Depends(get_admin_user)):
    conn = get_db_connection()
    if not conn:
        return {"status": "error", "message": "Database connection failed"}
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT user_id FROM agent WHERE agent_id = %s", (agent_id,))
        agent = cursor.fetchone()
        if not agent:
            return {"status": "error", "message": "Agent not found"}
            
        cursor.execute("DELETE FROM users WHERE user_id = %s", (agent['user_id'],))
        conn.commit()
        
        log_audit_action(admin['user_id'], 'DELETE_AGENT', 'agent', agent_id, None, None, None)
        return {"status": "success", "message": "Agent deleted"}
    except Exception as e:
        conn.rollback()
        return {"status": "error", "message": str(e)}
    finally:
        cursor.close()
        conn.close()

@app.get("/api/admin/listings")
def get_admin_listings(admin: dict = Depends(get_admin_user)):
    conn = get_db_connection()
    if not conn: return {"status": "error", "message": "DB failed"}
    cursor = conn.cursor()
    cursor.execute("""
        SELECT p.property_id, p.property_name, p.price, p.property_status, p.created_at, p.views
        FROM property p ORDER BY p.created_at DESC
    """)
    listings = cursor.fetchall()
    for l in listings:
        if l.get('created_at'):
            l['created_at'] = str(l['created_at'])
    cursor.close()
    conn.close()
    return {"status": "success", "data": listings}

@app.post("/api/admin/listings")
async def create_admin_listing(
    property_name: str = Form(...),
    description: str = Form(...),
    price: float = Form(...),
    property_status: str = Form(...),
    property_type: str = Form("Apartment"),
    street: str = Form(""),
    city: str = Form(""),
    country: str = Form(""),
    district: str = Form(""),
    bedrooms: int = Form(0),
    bathrooms: int = Form(0),
    square_footage: float = Form(0),
    monthly_rent: float = Form(0),
    amenities: str = Form(""),
    image: UploadFile = File(None),
    admin: dict = Depends(get_admin_user)
):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        # Get a default owner
        cursor.execute("SELECT owner_id FROM owner LIMIT 1")
        owner_res = cursor.fetchone()
        if not owner_res:
            return {"status": "error", "message": "No owners exist in the system to assign this property to."}
        owner_id = owner_res['owner_id']

        property_id = "PROP_" + str(uuid.uuid4())[:8]
        cursor.execute("""
            INSERT INTO property (property_id, property_name, description, price, property_status, street, district, city, country, owner_id)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (property_id, property_name, description, price, property_status, street, district, city, country, owner_id))
        
        # Insert into subtype table
        if property_type == "Apartment":
            cursor.execute("INSERT INTO apartment (property_id, amenities) VALUES (%s, %s)", (property_id, amenities))
        elif property_type == "Condominium":
            cursor.execute("INSERT INTO condominium (property_id, amenities) VALUES (%s, %s)", (property_id, amenities))
        elif property_type == "Rental House":
            cursor.execute("INSERT INTO rental_house (property_id) VALUES (%s)", (property_id,))

        # Insert a unit record with room/size details
        if bedrooms or bathrooms or square_footage or monthly_rent:
            cursor.execute("""
                INSERT INTO unit (property_id, unit_number, bedrooms, bathrooms, square_footage, monthly_rent, availability_status)
                VALUES (%s, 'MAIN', %s, %s, %s, %s, 'Available')
            """, (property_id, bedrooms, bathrooms, square_footage, monthly_rent or price))
        
        # Save image if provided
        if image and image.filename:
            ext = image.filename.split('.')[-1]
            filename = f"{property_id}_{uuid.uuid4().hex}.{ext}"
            filepath = f"static/uploads/{filename}"
            with open(filepath, "wb") as f:
                content = await image.read()
                f.write(content)
            cursor.execute("INSERT INTO property_media (media_id, property_id, url, type, is_featured) VALUES (%s, %s, %s, 'IMAGE', 1)",
                           (str(uuid.uuid4()), property_id, f"/uploads/{filename}"))
                           
        conn.commit()
        log_audit_action(admin['user_id'], 'CREATE_PROPERTY', 'property', property_id, None, f"Name: {property_name}", None)
        return {"status": "success", "message": "Property added successfully"}
    except Exception as e:
        conn.rollback()
        return {"status": "error", "message": str(e)}
    finally:
        cursor.close()
        conn.close()

@app.get("/api/admin/listings/{property_id}")
def get_admin_listing(property_id: str, admin: dict = Depends(get_admin_user)):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            SELECT p.*, u.bedrooms, u.bathrooms, u.square_footage, u.monthly_rent,
                   COALESCE(a.amenities, c.amenities, '') as amenities
            FROM property p
            LEFT JOIN unit u ON p.property_id = u.property_id
            LEFT JOIN apartment a ON p.property_id = a.property_id
            LEFT JOIN condominium c ON p.property_id = c.property_id
            WHERE p.property_id = %s
        """, (property_id,))
        prop = cursor.fetchone()
        if not prop:
            return {"status": "error", "message": "Not found"}
        if prop.get('created_at'):
            prop['created_at'] = str(prop['created_at'])
        return {"status": "success", "data": prop}
    finally:
        cursor.close()
        conn.close()

@app.put("/api/admin/listings/{property_id}")
async def update_admin_listing(
    property_id: str,
    property_name: str = Form(...),
    description: str = Form(...),
    price: float = Form(...),
    property_status: str = Form(...),
    street: str = Form(""),
    city: str = Form(""),
    country: str = Form(""),
    district: str = Form(""),
    bedrooms: int = Form(0),
    bathrooms: int = Form(0),
    square_footage: float = Form(0),
    monthly_rent: float = Form(0),
    amenities: str = Form(""),
    image: UploadFile = File(None),
    admin: dict = Depends(get_admin_user)
):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            UPDATE property SET property_name=%s, description=%s, price=%s, property_status=%s,
            street=%s, district=%s, city=%s, country=%s
            WHERE property_id=%s
        """, (property_name, description, price, property_status, street, district, city, country, property_id))

        # Update or insert unit
        cursor.execute("SELECT property_id FROM unit WHERE property_id=%s LIMIT 1", (property_id,))
        if cursor.fetchone():
            cursor.execute("""
                UPDATE unit SET bedrooms=%s, bathrooms=%s, square_footage=%s, monthly_rent=%s
                WHERE property_id=%s
            """, (bedrooms, bathrooms, square_footage, monthly_rent or price, property_id))
        else:
            cursor.execute("""
                INSERT INTO unit (property_id, unit_number, bedrooms, bathrooms, square_footage, monthly_rent, availability_status)
                VALUES (%s, 'MAIN', %s, %s, %s, %s, 'Available')
            """, (property_id, bedrooms, bathrooms, square_footage, monthly_rent or price))

        # Update amenities
        cursor.execute("UPDATE apartment SET amenities=%s WHERE property_id=%s", (amenities, property_id))
        cursor.execute("UPDATE condominium SET amenities=%s WHERE property_id=%s", (amenities, property_id))

        # New image
        if image and image.filename:
            ext = image.filename.split('.')[-1]
            filename = f"{property_id}_{uuid.uuid4().hex}.{ext}"
            filepath = f"static/uploads/{filename}"
            with open(filepath, "wb") as f:
                content = await image.read()
                f.write(content)
            cursor.execute("DELETE FROM property_media WHERE property_id=%s", (property_id,))
            cursor.execute("INSERT INTO property_media (media_id, property_id, url, type, is_featured) VALUES (%s, %s, %s, 'IMAGE', 1)",
                           (str(uuid.uuid4()), property_id, f"/uploads/{filename}"))

        conn.commit()
        log_audit_action(admin['user_id'], 'UPDATE_PROPERTY', 'property', property_id, None, f"Updated: {property_name}", None)
        return {"status": "success", "message": "Property updated successfully"}
    except Exception as e:
        conn.rollback()
        return {"status": "error", "message": str(e)}
    finally:
        cursor.close()
        conn.close()

@app.delete("/api/admin/listings/{property_id}")
def delete_admin_listing(property_id: str, admin: dict = Depends(get_admin_user)):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("DELETE FROM property WHERE property_id = %s", (property_id,))
        conn.commit()
        log_audit_action(admin['user_id'], 'DELETE_PROPERTY', 'property', property_id, None, None, None)
        return {"status": "success", "message": "Property deleted successfully"}
    except Exception as e:
        conn.rollback()
        return {"status": "error", "message": str(e)}
    finally:
        cursor.close()
        conn.close()

@app.get("/api/admin/inquiries")
def get_admin_inquiries(admin: dict = Depends(get_admin_user)):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            SELECT i.inquiry_id, i.name, i.email, i.phone, i.message, i.status, i.created_at,
                   p.property_name, p.property_id
            FROM inquiry i
            LEFT JOIN property p ON i.property_id = p.property_id
            ORDER BY i.created_at DESC
        """)
        inquiries = cursor.fetchall()
        for inq in inquiries:
            if inq.get('created_at'):
                inq['created_at'] = str(inq['created_at'])
        return {"status": "success", "data": inquiries}
    finally:
        cursor.close()
        conn.close()

@app.put("/api/admin/inquiries/{inquiry_id}/status")
async def update_inquiry_status(inquiry_id: str, request: Request, admin: dict = Depends(get_admin_user)):
    data = await request.json()
    new_status = data.get('status', 'READ')
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("UPDATE inquiry SET status=%s WHERE inquiry_id=%s", (new_status, inquiry_id))
        conn.commit()
        return {"status": "success", "message": "Status updated"}
    finally:
        cursor.close()
        conn.close()

# Mount static files at root
app.mount("/", StaticFiles(directory="static", html=True), name="static")
