# Debugging Data Loading Issues

## Quick Diagnosis

Run these commands to diagnose the issue:

### 1. Check if API is running
```bash
curl http://localhost:8000/health
```
Expected: `{"status":"ok"}`

### 2. Check if categories exist in database
```bash
docker-compose exec api python check_data.py
```

### 3. Test API endpoints directly
```bash
docker-compose exec api python test_api.py
```

### 4. Check from browser console
Open browser DevTools (F12) and run:
```javascript
fetch('/api/categories')
  .then(r => r.json())
  .then(d => console.log('Categories:', d))
  .catch(e => console.error('Error:', e))
```

## Common Issues and Solutions

### Issue 1: Empty Database
**Symptom:** API returns empty arrays `{"items": []}`

**Solution:** Reseed the database
```bash
docker-compose exec api python seed.py
```

### Issue 2: API Not Accessible
**Symptom:** Network errors, 502 Bad Gateway, or connection refused

**Check:**
```bash
# Is API container running?
docker-compose ps

# Check API logs
docker-compose logs api

# Check if API is listening
docker-compose exec api netstat -tlnp | grep 8000
```

**Solution:** Restart API
```bash
docker-compose restart api
```

### Issue 3: CORS Errors
**Symptom:** Browser console shows CORS errors

**Check:** API logs for CORS-related errors
```bash
docker-compose logs api | grep -i cors
```

**Solution:** CORS is already configured to allow all origins. If still seeing errors, check if requests are reaching the API.

### Issue 4: Authentication Issues
**Symptom:** 401 Unauthorized errors

**Check:** 
- Is the user logged in?
- Is the token valid?
- Check browser localStorage for `auth_token`

**Solution:**
```javascript
// In browser console
console.log('Token:', localStorage.getItem('auth_token'))
console.log('User:', localStorage.getItem('auth_model'))
```

### Issue 5: Nginx Proxy Issues
**Symptom:** 404 errors for `/api/*` endpoints

**Check nginx logs:**
```bash
docker-compose logs web | grep -i error
```

**Verify nginx is proxying correctly:**
```bash
# From your host machine
curl http://localhost/api/categories

# Should return same as:
curl http://localhost:8000/api/categories
```

### Issue 6: Wrong API Base URL
**Symptom:** Frontend making requests to wrong URL

**Check:** Browser DevTools Network tab
- Are requests going to `/api/*`?
- What's the full URL?
- What's the response status?

## Step-by-Step Debugging

### Step 1: Verify Backend is Working

```bash
# Test health endpoint
curl http://localhost:8000/health

# Test categories endpoint directly
curl http://localhost:8000/api/categories

# Should return JSON with categories
```

### Step 2: Verify Database Has Data

```bash
# Check database contents
docker-compose exec api python check_data.py

# If no categories, reseed
docker-compose exec api python seed.py
```

### Step 3: Verify Nginx Proxy

```bash
# Test through nginx (port 80)
curl http://localhost/api/categories

# Should return same data as direct API call
```

### Step 4: Check Frontend API Client

Open browser console (F12) and test:

```javascript
// Test direct fetch
fetch('/api/categories')
  .then(r => {
    console.log('Status:', r.status)
    return r.json()
  })
  .then(d => console.log('Data:', d))
  .catch(e => console.error('Error:', e))

// Test with API client
import client from './src/lib/apiClient.js'
client.collection('categories').getList()
  .then(d => console.log('Categories:', d))
  .catch(e => console.error('Error:', e))
```

### Step 5: Check Browser Network Tab

1. Open DevTools (F12)
2. Go to Network tab
3. Reload the page
4. Look for requests to `/api/categories`
5. Check:
   - Request URL
   - Status code
   - Response data
   - Any errors

## Manual Data Verification

### Connect to database directly:
```bash
docker-compose exec db psql -U postgres -d iiconacademy
```

Then run SQL queries:
```sql
-- Check categories
SELECT id, category_name, category_type, is_active FROM categories;

-- Check users
SELECT id, email, role, is_active FROM users;

-- Check schools
SELECT id, school_name, school_id, is_active FROM schools;

-- Exit
\q
```

## Reset Everything

If all else fails, reset everything:

```bash
# Stop and remove everything
docker-compose down -v

# Rebuild
docker-compose build

# Start fresh
docker-compose up

# Wait for startup, then check
curl http://localhost:8000/health
curl http://localhost:8000/api/categories
```

## Expected Seed Data

After running seed.py, you should have:

**Users:**
- admin@iiconacademy.com (platform_admin)
- school1@iiconacademy.com (school_admin)
- school2@iiconacademy.com (school_admin)
- teacher@school1.com (teacher)

**Schools:**
- School One (SCH001)
- School Two (SCH002)

**Categories:**
- Mathematics (academic)
- Science (academic)
- Languages (academic)
- Arts (extracurricular)
- Sports (extracurricular)

**System Settings:**
- App name: i-icon academy

## Still Not Working?

1. Check all container logs:
```bash
docker-compose logs
```

2. Check specific service logs:
```bash
docker-compose logs api
docker-compose logs web
docker-compose logs db
```

3. Verify all containers are healthy:
```bash
docker-compose ps
```

4. Check if ports are accessible:
```bash
# API
curl http://localhost:8000/health

# Web
curl http://localhost/
```

5. Check browser console for JavaScript errors

6. Check browser Network tab for failed requests
