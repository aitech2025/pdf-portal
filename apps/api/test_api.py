"""
Test API endpoints to verify they're working correctly
Run this inside the container: python test_api.py
"""
import asyncio
import httpx

BASE_URL = "http://localhost:8000"

async def test_endpoints():
    print("=" * 60)
    print("API ENDPOINT TESTS")
    print("=" * 60)
    
    async with httpx.AsyncClient() as client:
        # Test health endpoint
        print("\n1. Testing /health endpoint...")
        try:
            response = await client.get(f"{BASE_URL}/health")
            print(f"   Status: {response.status_code}")
            print(f"   Response: {response.json()}")
        except Exception as e:
            print(f"   ✗ Error: {e}")
        
        # Test categories endpoint (no auth required)
        print("\n2. Testing /api/categories endpoint...")
        try:
            response = await client.get(f"{BASE_URL}/api/categories")
            print(f"   Status: {response.status_code}")
            data = response.json()
            print(f"   Categories found: {len(data.get('items', []))}")
            if data.get('items'):
                for cat in data['items'][:3]:
                    print(f"     - {cat.get('categoryName')} (type: {cat.get('categoryType')})")
            else:
                print("   ⚠ No categories in database")
        except Exception as e:
            print(f"   ✗ Error: {e}")
        
        # Test subcategories endpoint
        print("\n3. Testing /api/subCategories endpoint...")
        try:
            response = await client.get(f"{BASE_URL}/api/subCategories")
            print(f"   Status: {response.status_code}")
            data = response.json()
            print(f"   SubCategories found: {len(data.get('items', []))}")
            if data.get('items'):
                for sub in data['items'][:3]:
                    print(f"     - {sub.get('subCategoryName')}")
        except Exception as e:
            print(f"   ✗ Error: {e}")
        
        # Test login endpoint
        print("\n4. Testing /api/auth/login endpoint...")
        try:
            response = await client.post(
                f"{BASE_URL}/api/auth/login",
                json={"email": "admin@iiconacademy.com", "password": "Admin@1234"}
            )
            print(f"   Status: {response.status_code}")
            if response.status_code == 200:
                data = response.json()
                token = data.get('accessToken')
                print(f"   ✓ Login successful, token received")
                
                # Test authenticated endpoint
                print("\n5. Testing authenticated endpoint /api/users/me...")
                headers = {"Authorization": f"Bearer {token}"}
                response = await client.get(f"{BASE_URL}/api/users/me", headers=headers)
                print(f"   Status: {response.status_code}")
                if response.status_code == 200:
                    user = response.json()
                    print(f"   ✓ User: {user.get('email')} ({user.get('role')})")
                else:
                    print(f"   ✗ Error: {response.text}")
                
                # Test creating a category
                print("\n6. Testing POST /api/categories (create category)...")
                response = await client.post(
                    f"{BASE_URL}/api/categories",
                    headers=headers,
                    json={
                        "categoryName": "Test Category",
                        "categoryType": "academic",
                        "description": "Test category created by test script",
                        "isActive": True,
                        "displayOrder": 999
                    }
                )
                print(f"   Status: {response.status_code}")
                if response.status_code == 200:
                    cat = response.json()
                    print(f"   ✓ Category created: {cat.get('categoryName')} (id: {cat.get('id')})")
                else:
                    print(f"   Response: {response.text}")
            else:
                print(f"   ✗ Login failed: {response.text}")
        except Exception as e:
            print(f"   ✗ Error: {e}")
        
        # Test schools endpoint
        print("\n7. Testing /api/schools endpoint...")
        try:
            response = await client.get(f"{BASE_URL}/api/schools")
            print(f"   Status: {response.status_code}")
            if response.status_code == 200:
                data = response.json()
                print(f"   Schools found: {len(data.get('items', []))}")
                if data.get('items'):
                    for school in data['items']:
                        print(f"     - {school.get('schoolName')} ({school.get('schoolId')})")
            else:
                print(f"   Response: {response.text}")
        except Exception as e:
            print(f"   ✗ Error: {e}")
        
        # Test PDFs endpoint
        print("\n8. Testing /api/pdfs endpoint...")
        try:
            response = await client.get(f"{BASE_URL}/api/pdfs")
            print(f"   Status: {response.status_code}")
            if response.status_code == 200:
                data = response.json()
                print(f"   PDFs found: {len(data.get('items', []))}")
                if data.get('items'):
                    for pdf in data['items'][:3]:
                        print(f"     - {pdf.get('title')}")
            else:
                print(f"   Response: {response.text}")
        except Exception as e:
            print(f"   ✗ Error: {e}")
    
    print("\n" + "=" * 60)
    print("TESTS COMPLETE")
    print("=" * 60)

if __name__ == "__main__":
    asyncio.run(test_endpoints())
