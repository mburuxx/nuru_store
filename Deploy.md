# NURU STORES — Production Deployment Guide

## Architecture
```
Netlify (React)  →  Your VPS/Server (Nginx → Gunicorn → Django → PostgreSQL)
```

---

## Part 1 — Backend on your VPS (Ubuntu)

### 1. Server setup
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y docker.io docker-compose-plugin git
sudo usermod -aG docker $USER
# Log out and back in so docker group takes effect
```

### 2. Clone your repo onto the server
```bash
git clone https://github.com/your-username/nuru_store.git
cd nuru_store
```

### 3. Create your production env file
```bash
cp .env.production .env.production.local
nano .env.production.local
```
Fill in:
- `SECRET_KEY` — generate with: `python3 -c "import secrets; print(secrets.token_urlsafe(50))"`
- `DB_PASSWORD` — a strong random password
- `CORS_ALLOWED_ORIGINS` — your Netlify URL (get this after deploying frontend)
- `ALLOWED_HOSTS` — your server's domain or IP

Rename it for docker-compose:
```bash
mv .env.production.local .env.production
```

### 4. Update settings.py
Add these lines to `config/settings.py` (replace the existing CORS and ALLOWED_HOSTS lines):

```python
CORS_ALLOWED_ORIGINS = [o.strip() for o in os.getenv("CORS_ALLOWED_ORIGINS", "").split(",") if o.strip()]
ALLOWED_HOSTS = [h.strip() for h in os.getenv("ALLOWED_HOSTS", "localhost").split(",") if h.strip()]
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
SESSION_COOKIE_SECURE = not DEBUG
CSRF_COOKIE_SECURE = not DEBUG
```

### 5. Update nginx.conf
Replace `your-domain.com` and `your-app.netlify.app` with your real values:
```bash
nano nginx/nginx.conf
```

### 6. Start without SSL first (to get cert)
Temporarily comment out the HTTPS server block in nginx.conf and only keep port 80.
```bash
docker compose --env-file .env.production up -d --build
```

### 7. Run migrations and create superuser
```bash
docker compose exec backend python manage.py migrate
docker compose exec backend python manage.py createsuperuser
```

### 8. Get SSL certificate with Certbot
```bash
sudo apt install -y certbot
sudo certbot certonly --standalone -d your-domain.com -d www.your-domain.com
# Certs land in /etc/letsencrypt/live/your-domain.com/
```

Copy certs to where nginx can see them:
```bash
mkdir -p nginx/certs
sudo cp /etc/letsencrypt/live/your-domain.com/fullchain.pem nginx/certs/
sudo cp /etc/letsencrypt/live/your-domain.com/privkey.pem nginx/certs/
sudo chown $USER:$USER nginx/certs/*.pem
```

### 9. Re-enable HTTPS in nginx.conf, then restart
```bash
docker compose --env-file .env.production up -d --force-recreate nginx
```

### 10. Auto-renew SSL (add to crontab)
```bash
crontab -e
# Add this line:
0 3 * * * certbot renew --quiet && cp /etc/letsencrypt/live/your-domain.com/*.pem /path/to/nuru_store/nginx/certs/ && docker compose -f /path/to/nuru_store/docker-compose.yml exec nginx nginx -s reload
```

---

## Part 2 — Frontend on Netlify

### 1. Place netlify.toml in the repo root
The `netlify.toml` file in this folder goes at the **root of your repo** (same level as `manage.py`), not inside `frontend/`.

### 2. Set the API URL in your frontend code
Your axios/fetch base URL should read from an env variable.
In your frontend API config (e.g. `frontend/src/api/index.js` or `axiosInstance.js`):

```js
const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";
```

### 3. Deploy on Netlify
1. Go to https://app.netlify.com → **Add new site → Import from Git**
2. Connect your GitHub repo
3. Netlify auto-detects `netlify.toml` — build settings are pre-filled
4. Go to **Site settings → Environment variables → Add variable**:
   - Key: `VITE_API_BASE_URL`
   - Value: `https://your-domain.com`
5. Click **Deploy site**

### 4. Copy your Netlify URL
After deploy you get a URL like `https://nuru-stores-abc123.netlify.app`.
Go back to your server and update `.env.production`:
```
CORS_ALLOWED_ORIGINS=https://nuru-stores-abc123.netlify.app
```
Then restart the backend:
```bash
docker compose --env-file .env.production up -d --force-recreate backend
```

You can also add a custom domain in Netlify → Domain management.

---

## Useful commands

```bash
# View logs
docker compose logs -f backend
docker compose logs -f nginx

# Restart a service
docker compose restart backend

# Run a management command
docker compose exec backend python manage.py shell

# Stop everything
docker compose down

# Stop and wipe database (careful!)
docker compose down -v
```

---

## Checklist before going live
- [ ] `DEBUG=False` in .env.production
- [ ] Strong `SECRET_KEY` (not the dev one)
- [ ] Strong `DB_PASSWORD`
- [ ] `.env.production` is in `.gitignore` — never commit it
- [ ] `CORS_ALLOWED_ORIGINS` points to your real Netlify URL
- [ ] SSL certificate installed and nginx redirects HTTP→HTTPS
- [ ] `python manage.py migrate` has been run
- [ ] Superuser created
- [ ] `VITE_API_BASE_URL` set in Netlify env vars