"""
Comprehensive test of all API endpoints to verify data loading fixes
"""
import asyncio
import httpx
import json

BASE_URL = "http://localhost:8000"

class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    END = '\033[0m'

def print_success(msg):
    print(f"{Colors.GREEN}✓{Colors.END} {msg}")

def print_error(msg):
    print(f"{Colors.RED}✗{Colors.END} {msg}")

def print_warning(msg):
    print(f"{Colors.YELLOW}⚠{Colors.END} {msg}")

def print_info(msg):
    print(f"{Colors.BLUE}ℹ{Colors.END} {msg}")

async def test_all_endpoints():
    print("=" * 70)
    print("COMPREHENSIVE API ENDPOINT TESTS")
    print("=" * 70)
    
    token = None
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        # Test 1: Health Check
        print("\n" + "=" * 70)
        print("1. HEALTH CHECK")
        print("=" * 70)
        try:
            response = await client.get(f"{BASE_URL}/health")
            if response.status_code == 200:
                print_success(f"Health check passed: {response.json()}")
            else:
                print_error(f"Health check failed: {response.status_code}")
                return
        except Exception as e:
            print_error(f"Cannot connect to API: {e}")
            return
        
        # Test 2: Categories (No Auth Required)
        print("\n" + "=" * 70)
        print("2. CATEGORIES ENDPOINT (No Auth)")
        print("=" * 70)
        try:
            response = await client.get(f"{BASE_URL}/api/categories")
            if response.status_code == 200:
                data = response.json()
                items = data.get('items', [])
                print_success(f"Categories endpoint works")
                print_info(f"Found {len(items)} categories")
                for cat in items[:3]:
                    print(f"  - {cat.get('categoryName')} ({cat.get('categoryType')})")
                if len(items) == 0:
                    print_warning("No categories found - database may need seeding")
            else:
                print_error(f"Categories failed: {response.status_code}")
        except Exception as e:
            print_error(f"Categories error: {e}")
        
        # Test 3: SubCategories (No Auth Required)
        print("\n" + "=" * 70)
        print("3. SUBCATEGORIES ENDPOINT (No Auth)")
        print("=" * 70)
        try:
            response = await client.get(f"{BASE_URL}/api/subCategories")
            if response.status_code == 200:
                data = response.json()
                items = data.get('items', [])
                print_success(f"SubCategories endpoint works")
                print_info(f"Found {len(items)} subcategories")
            else:
                print_error(f"SubCategories failed: {response.status_code}")
        except Exception as e:
            print_error(f"SubCategories error: {e}")
        
        # Test 4: Login
        print("\n" + "=" * 70)
        print("4. LOGIN")
        print("=" * 70)
        try:
            response = await client.post(
                f"{BASE_URL}/api/auth/login",
                json={"email": "admin@iiconacademy.com", "password": "Admin@1234"}
            )
            if response.status_code == 200:
                data = response.json()
                token = data.get('token')
                user = data.get('record', {})
                print_success(f"Login successful")
                print_info(f"User: {user.get('email')} ({user.get('role')})")
                print_info(f"Token: {token[:20]}...")
            else:
                print_error(f"Login failed: {response.status_code} - {response.text}")
                return
        except Exception as e:
            print_error(f"Login error: {e}")
            return
        
        if not token:
            print_error("No token received, cannot test authenticated endpoints")
            return
        
        headers = {"Authorization": f"Bearer {token}"}
        
        # Test 5: Schools (Paginated)
        print("\n" + "=" * 70)
        print("5. SCHOOLS ENDPOINT (Paginated)")
        print("=" * 70)
        try:
            response = await client.get(
                f"{BASE_URL}/api/schools",
                headers=headers,
                params={"page": 1, "per_page": 10}
            )
            if response.status_code == 200:
                data = response.json()
                print_success("Schools endpoint works")
                print_info(f"Response keys: {list(data.keys())}")
                
                # Check for required pagination fields
                if 'totalPages' in data:
                    print_success("✓ Has 'totalPages' field")
                else:
                    print_error("✗ Missing 'totalPages' field")
                
                if 'totalItems' in data:
                    print_success(f"✓ Has 'totalItems': {data['totalItems']}")
                else:
                    print_error("✗ Missing 'totalItems' field")
                
                items = data.get('items', [])
                print_info(f"Found {len(items)} schools")
                for school in items:
                    print(f"  - {school.get('schoolName')} ({school.get('schoolId')})")
            else:
                print_error(f"Schools failed: {response.status_code}")
        except Exception as e:
            print_error(f"Schools error: {e}")
        
        # Test 6: Users (Paginated)
        print("\n" + "=" * 70)
        print("6. USERS ENDPOINT (Paginated)")
        print("=" * 70)
        try:
            response = await client.get(
                f"{BASE_URL}/api/users",
                headers=headers,
                params={"page": 1, "per_page": 10}
            )
            if response.status_code == 200:
                data = response.json()
                print_success("Users endpoint works")
                
                # Check pagination fields
                if 'totalPages' in data:
                    print_success("✓ Has 'totalPages' field")
                else:
                    print_error("✗ Missing 'totalPages' field")
                
                items = data.get('items', [])
                print_info(f"Found {len(items)} users")
                for user in items[:3]:
                    print(f"  - {user.get('email')} ({user.get('role')})")
            else:
                print_error(f"Users failed: {response.status_code}")
        except Exception as e:
            print_error(f"Users error: {e}")
        
        # Test 7: PDFs (Paginated)
        print("\n" + "=" * 70)
        print("7. PDFS ENDPOINT (Paginated)")
        print("=" * 70)
        try:
            response = await client.get(
                f"{BASE_URL}/api/pdfs",
                headers=headers,
                params={"page": 1, "per_page": 10}
            )
            if response.status_code == 200:
                data = response.json()
                print_success("PDFs endpoint works")
                
                # Check pagination fields
                if 'totalPages' in data:
                    print_success("✓ Has 'totalPages' field")
                else:
                    print_error("✗ Missing 'totalPages' field")
                
                items = data.get('items', [])
                print_info(f"Found {len(items)} PDFs")
                for pdf in items[:3]:
                    print(f"  - {pdf.get('fileName')}")
            else:
                print_error(f"PDFs failed: {response.status_code}")
        except Exception as e:
            print_error(f"PDFs error: {e}")
        
        # Test 8: Notifications (Paginated)
        print("\n" + "=" * 70)
        print("8. NOTIFICATIONS ENDPOINT (Paginated)")
        print("=" * 70)
        try:
            response = await client.get(
                f"{BASE_URL}/api/notifications",
                headers=headers,
                params={"page": 1, "per_page": 10}
            )
            if response.status_code == 200:
                data = response.json()
                print_success("Notifications endpoint works")
                
                # Check pagination fields
                if 'totalPages' in data:
                    print_success("✓ Has 'totalPages' field")
                else:
                    print_error("✗ Missing 'totalPages' field")
                
                items = data.get('items', [])
                print_info(f"Found {len(items)} notifications")
            else:
                print_error(f"Notifications failed: {response.status_code}")
        except Exception as e:
            print_error(f"Notifications error: {e}")
        
        # Test 9: Onboarding Requests (Paginated)
        print("\n" + "=" * 70)
        print("9. ONBOARDING REQUESTS ENDPOINT (Paginated)")
        print("=" * 70)
        try:
            response = await client.get(
                f"{BASE_URL}/api/onboardingRequests",
                headers=headers,
                params={"page": 1, "per_page": 10}
            )
            if response.status_code == 200:
                data = response.json()
                print_success("Onboarding requests endpoint works")
                
                # Check pagination fields
                if 'totalPages' in data:
                    print_success("✓ Has 'totalPages' field")
                else:
                    print_error("✗ Missing 'totalPages' field")
                
                items = data.get('items', [])
                print_info(f"Found {len(items)} onboarding requests")
            else:
                print_error(f"Onboarding requests failed: {response.status_code}")
        except Exception as e:
            print_error(f"Onboarding requests error: {e}")
        
        # Test 10: User Requests (Paginated)
        print("\n" + "=" * 70)
        print("10. USER REQUESTS ENDPOINT (Paginated)")
        print("=" * 70)
        try:
            response = await client.get(
                f"{BASE_URL}/api/userRequests",
                headers=headers,
                params={"page": 1, "per_page": 10}
            )
            if response.status_code == 200:
                data = response.json()
                print_success("User requests endpoint works")
                
                # Check pagination fields
                if 'totalPages' in data:
                    print_success("✓ Has 'totalPages' field")
                else:
                    print_error("✗ Missing 'totalPages' field")
                
                items = data.get('items', [])
                print_info(f"Found {len(items)} user requests")
            else:
                print_error(f"User requests failed: {response.status_code}")
        except Exception as e:
            print_error(f"User requests error: {e}")
        
        # Test 11: Audit Logs (Paginated)
        print("\n" + "=" * 70)
        print("11. AUDIT LOGS ENDPOINT (Paginated)")
        print("=" * 70)
        try:
            response = await client.get(
                f"{BASE_URL}/api/auditLogs",
                headers=headers,
                params={"page": 1, "per_page": 10}
            )
            if response.status_code == 200:
                data = response.json()
                print_success("Audit logs endpoint works")
                
                # Check pagination fields
                if 'totalPages' in data:
                    print_success("✓ Has 'totalPages' field")
                else:
                    print_error("✗ Missing 'totalPages' field")
                
                items = data.get('items', [])
                print_info(f"Found {len(items)} audit logs")
            else:
                print_error(f"Audit logs failed: {response.status_code}")
        except Exception as e:
            print_error(f"Audit logs error: {e}")
        
        # Test 12: Maintenance Mode
        print("\n" + "=" * 70)
        print("12. MAINTENANCE MODE ENDPOINT")
        print("=" * 70)
        try:
            response = await client.get(f"{BASE_URL}/api/maintenanceMode")
            if response.status_code == 200:
                data = response.json()
                print_success("Maintenance mode endpoint works")
                items = data.get('items', [])
                if items:
                    mm = items[0]
                    print_info(f"Maintenance enabled: {mm.get('isEnabled')}")
            else:
                print_error(f"Maintenance mode failed: {response.status_code}")
        except Exception as e:
            print_error(f"Maintenance mode error: {e}")
    
    print("\n" + "=" * 70)
    print("TEST SUMMARY")
    print("=" * 70)
    print_info("All critical endpoints have been tested")
    print_info("Check for any ✗ marks above to identify issues")
    print_info("All paginated endpoints should have 'totalPages' field")
    print("=" * 70)

if __name__ == "__main__":
    asyncio.run(test_all_endpoints())
