# Homefind FastAPI

Homefind is a property listing and property-management system built with FastAPI, MySQL, and a static HTML/CSS/JavaScript frontend served by the API.

## Features

- Public property browsing and property detail pages.
- Property search/listing data loaded from the API.
- Contact and property inquiry forms.
- User login with role-based access.
- Admin dashboard statistics and audit-log activity.
- Admin agent management.
- Admin property/listing management, including image uploads.
- Admin inquiry review and status updates.
- In-memory bearer-token sessions for local development.

## Technology

- Python 3.10 or newer recommended.
- FastAPI 0.104.1.
- Uvicorn 0.24.0.
- Pydantic 2.5.0.
- PyMySQL 1.1.0.
- MySQL 8.0 or newer recommended.
- Static HTML, CSS, and browser JavaScript.

## Project structure

```text
.
|-- main.py                  FastAPI application and routes
|-- requirements.txt         Python dependencies
|-- run_seed.py              Creates local test users and profiles
|-- seed.sql                 Example property and user data inserts
|-- test_users.sql           Additional test-user inserts
|-- static/
|   |-- index.html            Public home page
|   |-- properties.html       Public property list
|   |-- property.html         Public property detail page
|   |-- login.html            Login page
|   |-- dashboard.html        Admin dashboard
|   |-- admin_agents.html     Admin agent management
|   |-- admin_listings.html   Admin listing management
|   |-- admin_inquiries.html  Admin inquiry management
|   |-- uploads/              Property images
|   `-- style.css             Shared styles
```

`main.py` mounts `static/` at the root URL. The browser pages call JSON endpoints below `/api/...`. Each API operation opens a MySQL connection using the database constants near the top of `main.py`.

Successful login creates a bearer token in an in-memory Python dictionary. Admin requests must send:

```http
Authorization: Bearer <token>
```

Sessions disappear when the server restarts. This is suitable for local development only.

## API overview

### Public endpoints

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/get_properties` | Return published properties. |
| GET | `/api/get_property?id=<property_id>` | Return one property and its media. |
| POST | `/api/login` | Authenticate a user and return a session token. |
| POST | `/api/contact` | Submit a contact message. |
| POST | `/api/submit_inquiry` | Submit an inquiry for a property. |
| POST | `/api/logout` | End the current local session. |

### Admin endpoints

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/dashboard` | Dashboard counts and recent activity. |
| GET/POST | `/api/admin/agents` | List or create agents. |
| PUT/DELETE | `/api/admin/agents/{agent_id}` | Update or delete an agent. |
| GET/POST | `/api/admin/listings` | List or create properties. |
| GET/PUT/DELETE | `/api/admin/listings/{property_id}` | Read, update, or delete a property. |
| GET | `/api/admin/inquiries` | List submitted inquiries. |
| PUT | `/api/admin/inquiries/{inquiry_id}/status` | Change inquiry status. |

Interactive API documentation is available at `http://127.0.0.1:8000/docs` after startup.

## RBAC and authorization enforcement

The current implementation uses a small role-based access-control layer in `main.py`:

1. `/api/login` authenticates the email and password against `users`.
2. A successful login creates a random token and stores the user's database role in the in-memory `sessions` dictionary.
3. The browser stores the returned token in `localStorage` and sends it as a bearer token.
4. Protected handlers declare `Depends(get_admin_user)`.
5. `get_admin_user` validates the token, requires an authenticated session, and requires the exact `Admin` role.
6. Missing/invalid authentication returns HTTP `401`; a valid non-admin session returns HTTP `403`.

### Session store

The current development session store is in-memory. It now has an expiration timestamp, but a production multi-worker deployment should replace it with Redis or a database-backed session store:

```python
# Session storage (In-memory for simplicity. In production, use Redis or DB)
# Since we are moving away from PHP sessions, we use simple token-based or cookie-based sessions.
sessions = {}
```

### Login creates the role-bearing session

After a password is verified, the login handler creates one of two session forms.

For an account with OTP enabled, the session is initially unauthenticated and carries the expected OTP:

```python
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
```

For an account without OTP enabled, the session is immediately authenticated:

```python
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
```

### OTP completion

When OTP is enabled, this block changes the temporary session into an authenticated session. The role stored during the password step is retained:

```python
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
```

### Shared backend RBAC gate

Every admin authorization decision is made by this dependency:

```python
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
```

The checks have these meanings:

| Check | Result |
| --- | --- |
| No `Authorization` header | `401 Unauthorized` |
| Token is absent from `sessions` | `401 Invalid session` |
| Session has no truthy `authenticated` value | `401 Invalid session` |
| Session role is anything other than exactly `Admin` | `403 Forbidden` |
| Valid authenticated Admin session | The session dictionary is injected into the route as `admin` |

The backend uses strict bearer-header parsing, session expiry, and token removal on logout. The current in-memory store is still process-local, so use a shared session store when running multiple workers or replicas.

### Protected route dependencies

These are every backend handler currently protected by the shared RBAC dependency:

```python
@app.get("/api/dashboard")
def get_dashboard(request: Request, admin: dict = Depends(get_admin_user)):
```

```python
@app.get("/api/admin/agents")
def get_agents(admin: dict = Depends(get_admin_user)):

@app.post("/api/admin/agents")
def create_agent(req: AgentCreate, admin: dict = Depends(get_admin_user)):

@app.put("/api/admin/agents/{agent_id}")
def update_agent(agent_id: str, req: AgentUpdate, admin: dict = Depends(get_admin_user)):

@app.delete("/api/admin/agents/{agent_id}")
def delete_agent(agent_id: str, admin: dict = Depends(get_admin_user)):
```

```python
@app.get("/api/admin/listings")
def get_admin_listings(admin: dict = Depends(get_admin_user)):

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

@app.get("/api/admin/listings/{property_id}")
def get_admin_listing(property_id: str, admin: dict = Depends(get_admin_user)):

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

@app.delete("/api/admin/listings/{property_id}")
def delete_admin_listing(property_id: str, admin: dict = Depends(get_admin_user)):
```

```python
@app.get("/api/admin/inquiries")
def get_admin_inquiries(admin: dict = Depends(get_admin_user)):

@app.put("/api/admin/inquiries/{inquiry_id}/status")
async def update_inquiry_status(inquiry_id: str, request: Request, admin: dict = Depends(get_admin_user)):
```

FastAPI resolves `Depends(get_admin_user)` before entering each handler. If the dependency raises an `HTTPException`, the handler body is not executed.

### Frontend token forwarding

The login page stores a successful token in browser storage:

```javascript
if (result.token) {
    localStorage.setItem('auth_token', result.token);
}
window.location.href = result.redirect;
```

The dashboard checks for a token and sends it to its protected endpoint:

```javascript
const token = localStorage.getItem('auth_token');
if (!token) {
    window.location.href = 'login.html';
    return;
}

fetch('/api/dashboard', {
    headers: {
        'Authorization': 'Bearer ' + token
    }
})
```

The agent page uses a shared request-options helper for all agent-management requests:

```javascript
const token = localStorage.getItem('auth_token');
if (!token) window.location.href = 'login.html';

const apiOptions = (method = 'GET', body = null) => {
    const opts = { headers: { 'Authorization': 'Bearer ' + token } };
    if (method !== 'GET') {
        opts.method = method;
        opts.headers['Content-Type'] = 'application/json';
        if (body) opts.body = JSON.stringify(body);
    }
    return opts;
};
```

The listing page uses the same pattern for its requests:

```javascript
const token = localStorage.getItem('auth_token');
if (!token) window.location.href = 'login.html';

const apiHeaders = { 'Authorization': 'Bearer ' + token };
```

The dashboard also clears the client token and redirects when the server rejects it:

```javascript
if (res.status === 401 || res.status === 403) {
    localStorage.removeItem('auth_token');
    window.location.href = 'login.html';
}
```

These browser checks improve navigation, but they are not the security boundary. A user can bypass them with a direct HTTP request; the backend `Depends(get_admin_user)` checks are what enforce RBAC.

### Current RBAC scope

The database has `Admin`, `Owner`, `Agent`, and `Tenant` roles, and the login session preserves whichever role is stored in `users.role`. Admin routes require `Admin`. The verification upload route permits `Owner` and `Agent`; owners must provide a land-title PDF while agents may omit it. Tenant-specific business routes have not been added yet.

## Identity verification documents

Owners and agents authenticate through `/api/login`, then are directed to `verification.html`. The page posts multipart form data to `/api/verification/documents` with:

- `face_photo`: required JPEG, PNG, or WebP face photo.
- `national_id_front`: required national-ID front image or PDF.
- `national_id_back`: required national-ID back image or PDF.
- `land_title`: PDF; required for `Owner`, optional for `Agent`.

The endpoint requires an authenticated `Owner` or `Agent` session. Files are limited to 10 MB each, assigned random filenames, and stored under `PRIVATE_UPLOAD_DIR` outside the publicly mounted `static/` directory. Admins can review metadata through `/api/admin/verification/{user_id}`. The current endpoint stores document metadata and paths; verification decisions should be implemented as a separate reviewed workflow before production launch.

Apply the document table after the base schema exists:

```bash
mysql -u root -p homefinder_db < schema_security.sql
```

Do not serve `private_uploads/` through a static-file mount or expose its paths directly to browsers. In production, encrypt documents at rest, restrict administrator access, define retention/deletion rules, and obtain the consent required by local privacy law before collecting identity and land-title documents.

## Prerequisites

Install:

1. Git.
2. Python 3.10 or newer.
3. MySQL Server 8.0 or newer, including the `mysql` client.
4. Permission to create a local MySQL database and user.

MySQL Workbench can be used instead of the command-line client, but run the SQL in the order documented below.

## Windows setup

Open PowerShell:

```powershell
git clone https://github.com/6ixteen-16/Homefind.git
Set-Location Homefind

py --version
py -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
```

If PowerShell blocks activation:

```powershell
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
.\.venv\Scripts\Activate.ps1
```

Alternatively, from Command Prompt use `.venv\Scripts\activate.bat`.

## macOS setup

Open Terminal:

```bash
git clone https://github.com/6ixteen-16/Homefind.git
cd Homefind

python3 --version
python3 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
pip install -r requirements.txt
```

## Database setup from scratch

`seed.sql` contains data inserts only. It does not create the database or tables, so create the schema before importing it.

### 1. Create the database

```bash
mysql -u root -p
```

Then run:

```sql
CREATE DATABASE IF NOT EXISTS homefinder_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
USE homefinder_db;
```

### 2. Create a dedicated application account

Do not run the API as MySQL `root`. While still connected as a local MySQL administrator, create a dedicated account and replace the placeholder with a long random password:

```sql
CREATE USER IF NOT EXISTS 'homefind_app'@'127.0.0.1'
    IDENTIFIED BY 'replace-with-a-long-random-password';
ALTER USER 'homefind_app'@'127.0.0.1'
    IDENTIFIED BY 'replace-with-a-long-random-password';
GRANT ALL PRIVILEGES ON homefinder_db.* TO 'homefind_app'@'127.0.0.1';
FLUSH PRIVILEGES;
```

Put the same values in a local `.env` copied from `.env.example`. The API and `run_seed.py` load that file automatically. Keep `.env` private and never commit it.

### 3. Create the tables

Run this DDL in `homefinder_db`:

```sql
USE homefinder_db;

CREATE TABLE IF NOT EXISTS users (
    user_id VARCHAR(50) PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(30) NOT NULL,
    otp_enabled TINYINT(1) NOT NULL DEFAULT 0,
    password_last_changed DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    failed_login_attempts INT NOT NULL DEFAULT 0,
    locked_until DATETIME NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS owner (
    owner_id VARCHAR(50) PRIMARY KEY,
    user_id VARCHAR(50) NULL,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(user_id)
        ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS agent (
    agent_id VARCHAR(50) PRIMARY KEY,
    user_id VARCHAR(50) NULL,
    name VARCHAR(255) NOT NULL,
    phone_number VARCHAR(50) NULL,
    email VARCHAR(255) NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(user_id)
        ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS tenant (
    tenant_id VARCHAR(50) PRIMARY KEY,
    user_id VARCHAR(50) NULL,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    date_of_birth DATE NULL,
    address VARCHAR(500) NULL,
    FOREIGN KEY (user_id) REFERENCES users(user_id)
        ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS owner_phone_number (
    owner_id VARCHAR(50) NOT NULL,
    phone_number VARCHAR(50) NOT NULL,
    PRIMARY KEY (owner_id, phone_number),
    FOREIGN KEY (owner_id) REFERENCES owner(owner_id)
        ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS tenant_phone_number (
    tenant_id VARCHAR(50) NOT NULL,
    phone_number VARCHAR(50) NOT NULL,
    PRIMARY KEY (tenant_id, phone_number),
    FOREIGN KEY (tenant_id) REFERENCES tenant(tenant_id)
        ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS property (
    property_id VARCHAR(50) PRIMARY KEY,
    property_name VARCHAR(255) NOT NULL,
    description TEXT NULL,
    street VARCHAR(255) NULL,
    district VARCHAR(255) NULL,
    city VARCHAR(255) NULL,
    country VARCHAR(255) NULL,
    property_status VARCHAR(50) NOT NULL DEFAULT 'Draft',
    price DECIMAL(15,2) NOT NULL DEFAULT 0,
    is_featured TINYINT(1) NOT NULL DEFAULT 0,
    owner_id VARCHAR(50) NULL,
    views INT NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (owner_id) REFERENCES owner(owner_id)
        ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS listing (
    listing_id VARCHAR(50) PRIMARY KEY,
    date_listed DATETIME NULL,
    description TEXT NULL,
    listing_status VARCHAR(50) NOT NULL DEFAULT 'Active',
    agent_id VARCHAR(50) NULL,
    FOREIGN KEY (agent_id) REFERENCES agent(agent_id)
        ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS advertised_as (
    listing_id VARCHAR(50) NOT NULL,
    property_id VARCHAR(50) NOT NULL,
    PRIMARY KEY (listing_id, property_id),
    FOREIGN KEY (listing_id) REFERENCES listing(listing_id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (property_id) REFERENCES property(property_id)
        ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS property_media (
    media_id VARCHAR(50) PRIMARY KEY,
    property_id VARCHAR(50) NOT NULL,
    url VARCHAR(500) NOT NULL,
    type VARCHAR(30) NOT NULL DEFAULT 'IMAGE',
    is_featured TINYINT(1) NOT NULL DEFAULT 0,
    FOREIGN KEY (property_id) REFERENCES property(property_id)
        ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS unit (
    property_id VARCHAR(50) NOT NULL,
    unit_number VARCHAR(50) NOT NULL,
    floor VARCHAR(50) NULL,
    bedrooms INT NULL,
    bathrooms INT NULL,
    square_footage DECIMAL(12,2) NULL,
    monthly_rent DECIMAL(15,2) NULL,
    availability_status VARCHAR(50) NULL,
    PRIMARY KEY (property_id, unit_number),
    FOREIGN KEY (property_id) REFERENCES property(property_id)
        ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS apartment (
    property_id VARCHAR(50) PRIMARY KEY,
    number_of_units INT NULL,
    amenities TEXT NULL,
    management_fee DECIMAL(15,2) NULL,
    FOREIGN KEY (property_id) REFERENCES property(property_id)
        ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS condominium (
    property_id VARCHAR(50) PRIMARY KEY,
    amenities TEXT NULL,
    management_fee DECIMAL(15,2) NULL,
    FOREIGN KEY (property_id) REFERENCES property(property_id)
        ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS rental_house (
    property_id VARCHAR(50) PRIMARY KEY,
    house_size DECIMAL(12,2) NULL,
    yard_size DECIMAL(12,2) NULL,
    FOREIGN KEY (property_id) REFERENCES property(property_id)
        ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS inquiry (
    inquiry_id VARCHAR(50) PRIMARY KEY,
    property_id VARCHAR(50) NULL,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50) NULL,
    message TEXT NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'NEW',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (property_id) REFERENCES property(property_id)
        ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS audit_logs (
    log_id VARCHAR(50) PRIMARY KEY,
    user_id VARCHAR(50) NULL,
    action VARCHAR(100) NOT NULL,
    table_name VARCHAR(100) NULL,
    record_id VARCHAR(100) NULL,
    old_value TEXT NULL,
    new_value TEXT NULL,
    ip_address VARCHAR(100) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id)
        ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB;
```

### 4. Import sample data

From the repository root:

macOS, Linux, or Windows Command Prompt:

```bash
mysql -u root -p homefinder_db < seed.sql
```

Windows PowerShell:

```powershell
Get-Content .\seed.sql | mysql -u root -p homefinder_db
```

The seed includes sample owners, properties, units, media, and related records. Its `INSERT IGNORE` statements make rerunning it safe for existing keys.

### 5. Create demo accounts

`run_seed.py` inserts test users and their profiles. Before running it, update the database constants in both `main.py` and `run_seed.py` if your MySQL credentials differ from the local defaults.

```bash
python run_seed.py
```

All demo users use the password `password123`:

| Email | Role |
| --- | --- |
| `test_admin@homefind.com` | Admin |
| `test_owner@homefind.com` | Owner |
| `test_agent@homefind.com` | Agent |
| `test_tenant@homefind.com` | Tenant |

Use the admin account to test the dashboard and admin pages.

## Database configuration

The current application reads these constants directly from `main.py`:

```python
DB_HOST = "127.0.0.1"
DB_USER = "root"
DB_PASS = "<your-local-mysql-password>"
DB_NAME = "homefinder_db"
```

`main.py` and `run_seed.py` automatically load a local `.env` file when present. Copy `.env.example` to `.env` and set real values in your process manager or deployment secret store. On Windows PowerShell you may also use `$env:DB_PASS = '...'`; on macOS use `export DB_PASS='...'`; Docker can use `--env-file .env`. Never commit `.env`.

## Run the application

Activate `.venv` first.

Windows PowerShell:

```powershell
.\.venv\Scripts\Activate.ps1
python -m uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

macOS:

```bash
source .venv/bin/activate
python -m uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

Open:

- Home: `http://127.0.0.1:8000/`
- Properties: `http://127.0.0.1:8000/properties.html`
- Login: `http://127.0.0.1:8000/login.html`
- Admin dashboard: `http://127.0.0.1:8000/dashboard.html`
- API docs: `http://127.0.0.1:8000/docs`

Stop the server with `Ctrl+C`.

## Development checks

```bash
# Activate .venv first
pip install -r requirements.txt
python -m py_compile main.py run_seed.py
python -m uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

Admin image uploads are written to `static/uploads/`, and their relative URLs are stored in `property_media`.

## Production deployment

The repository includes a `Dockerfile`. Build and run it with environment variables supplied outside the image:

```bash
docker build -t homefind-api .
docker run --rm -p 8000:8000 --env-file .env \
    -v homefind_private_uploads:/app/private_uploads \
    homefind-api
```

The image starts one Uvicorn worker because sessions are currently process-local. Put it behind HTTPS termination and a reverse proxy, and do not scale to multiple workers or replicas until sessions move to Redis or another shared store. Set `APP_ENV=production` to disable the interactive `/docs` endpoint. Set `CORS_ORIGINS` to a comma-separated allowlist of trusted origins; leave it empty when the frontend is served by this same application.

For a non-container deployment, install the requirements in a virtual environment and run:

```bash
python -m uvicorn main:app --host 127.0.0.1 --port 8000
```

Use a service manager to restart the process, a reverse proxy for TLS and request limits, a firewall that exposes only the proxy, and encrypted backups for MySQL and private verification files.

## Troubleshooting

### `ModuleNotFoundError`

Activate the virtual environment and reinstall dependencies:

```bash
python -m pip install -r requirements.txt
```

On Windows, use `py -m pip` if `python` points to another installation.

### Database connection failure

Check that MySQL is running, `homefinder_db` exists, all tables were created, and the credentials in `main.py` match the local MySQL account. Test directly with:

```bash
mysql -h 127.0.0.1 -u root -p homefinder_db
```

### Missing tables

The repository seed is data-only. Run the DDL above before importing `seed.sql`, then run `python run_seed.py`.

### Port 8000 is busy

Use another port:

```bash
python -m uvicorn main:app --reload --host 127.0.0.1 --port 8001
```

Then open `http://127.0.0.1:8001/`.

### Login is locked

The API locks an account after repeated failed attempts. For local development, wait for the lock period or reset the account values:

```sql
USE homefinder_db;
UPDATE users
SET failed_login_attempts = 0, locked_until = NULL
WHERE email = 'test_admin@homefind.com';
```

### Static pages load but API calls fail

Open the pages through Uvicorn at `http://127.0.0.1:8000/`. Do not open the HTML files directly with `file:///...`, because browser requests to `/api/...` require the FastAPI server.

## Security and production notes

Production hardening included in this branch:

- Database credentials and session settings are read from environment variables.
- Sessions expire according to `SESSION_TTL_SECONDS`, and logout removes the token.
- Admin, Owner, and Agent permissions are enforced by backend dependencies.
- Verification uploads enforce role, file type, and 10 MB size limits.
- Verification files are stored outside the public static directory.

Remaining production requirements:

- Rotate credentials that were ever committed or shared.
- Replace SHA-256 password handling with Argon2 or bcrypt consistently.
- Replace in-memory sessions with Redis or a database-backed store before using multiple workers.
- Add HTTPS, secure cookie/token handling, rate limits, malware scanning, and audit review for identity files.
- Add formal database migrations instead of relying on manually copied SQL.
- Add tenant-specific routes and policies when tenant workflows are implemented.