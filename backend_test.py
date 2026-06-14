"""
CDM Dance CRM Backend API Tests
Tests all backend endpoints for authentication, OAuth, and data operations.
"""
import requests
import sys
from typing import Dict, Any

# Backend URL from frontend/.env
BASE_URL = "https://booking-flow-86.preview.emergentagent.com/api"
CORRECT_PASSWORD = "cdm2025"
WRONG_PASSWORD = "wrongpassword123"

# Test results tracking
passed = 0
failed = 0
test_results = []


def log_test(name: str, success: bool, details: str = ""):
    """Log test result"""
    global passed, failed
    if success:
        passed += 1
        status = "✅ PASS"
    else:
        failed += 1
        status = "❌ FAIL"
    
    result = f"{status}: {name}"
    if details:
        result += f" - {details}"
    print(result)
    test_results.append({"name": name, "success": success, "details": details})


def test_auth_login_success():
    """Test POST /api/auth/login with correct password"""
    try:
        response = requests.post(f"{BASE_URL}/auth/login", json={"password": CORRECT_PASSWORD}, timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            if "token" in data and "expires_at" in data:
                log_test("Auth: Login with correct password", True, f"Got token: {data['token'][:20]}...")
                return data["token"]
            else:
                log_test("Auth: Login with correct password", False, f"Missing token or expires_at in response: {data}")
                return None
        else:
            log_test("Auth: Login with correct password", False, f"Expected 200, got {response.status_code}: {response.text}")
            return None
    except Exception as e:
        log_test("Auth: Login with correct password", False, f"Exception: {str(e)}")
        return None


def test_auth_login_wrong_password():
    """Test POST /api/auth/login with wrong password"""
    try:
        response = requests.post(f"{BASE_URL}/auth/login", json={"password": WRONG_PASSWORD}, timeout=10)
        
        if response.status_code == 401:
            log_test("Auth: Login with wrong password returns 401", True)
        else:
            log_test("Auth: Login with wrong password returns 401", False, f"Expected 401, got {response.status_code}")
    except Exception as e:
        log_test("Auth: Login with wrong password returns 401", False, f"Exception: {str(e)}")


def test_auth_me_with_token(token: str):
    """Test GET /api/auth/me with valid Bearer token"""
    try:
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.get(f"{BASE_URL}/auth/me", headers=headers, timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            if "authed" in data and data["authed"]:
                log_test("Auth: /me with valid token returns 200", True, f"Response: {data}")
            else:
                log_test("Auth: /me with valid token returns 200", False, f"Unexpected response: {data}")
        else:
            log_test("Auth: /me with valid token returns 200", False, f"Expected 200, got {response.status_code}: {response.text}")
    except Exception as e:
        log_test("Auth: /me with valid token returns 200", False, f"Exception: {str(e)}")


def test_auth_me_without_token():
    """Test GET /api/auth/me without token"""
    try:
        response = requests.get(f"{BASE_URL}/auth/me", timeout=10)
        
        if response.status_code == 401:
            log_test("Auth: /me without token returns 401", True)
        else:
            log_test("Auth: /me without token returns 401", False, f"Expected 401, got {response.status_code}")
    except Exception as e:
        log_test("Auth: /me without token returns 401", False, f"Exception: {str(e)}")


def test_auth_me_with_bad_token():
    """Test GET /api/auth/me with invalid token"""
    try:
        headers = {"Authorization": "Bearer invalid_token_12345"}
        response = requests.get(f"{BASE_URL}/auth/me", headers=headers, timeout=10)
        
        if response.status_code == 401:
            log_test("Auth: /me with bad token returns 401", True)
        else:
            log_test("Auth: /me with bad token returns 401", False, f"Expected 401, got {response.status_code}")
    except Exception as e:
        log_test("Auth: /me with bad token returns 401", False, f"Exception: {str(e)}")


def test_oauth_status(token: str):
    """Test GET /api/oauth/google/status (requires auth)"""
    try:
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.get(f"{BASE_URL}/oauth/google/status", headers=headers, timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            if "configured" in data and "connected" in data:
                if data["configured"] == True and data["connected"] == False:
                    log_test("OAuth: /status returns configured=true, connected=false", True, f"Response: {data}")
                else:
                    log_test("OAuth: /status returns configured=true, connected=false", False, 
                            f"Expected configured=true, connected=false, got: {data}")
            else:
                log_test("OAuth: /status returns configured=true, connected=false", False, 
                        f"Missing required fields in response: {data}")
        else:
            log_test("OAuth: /status returns configured=true, connected=false", False, 
                    f"Expected 200, got {response.status_code}: {response.text}")
    except Exception as e:
        log_test("OAuth: /status returns configured=true, connected=false", False, f"Exception: {str(e)}")


def test_oauth_status_without_auth():
    """Test GET /api/oauth/google/status without auth returns 401"""
    try:
        response = requests.get(f"{BASE_URL}/oauth/google/status", timeout=10)
        
        if response.status_code == 401:
            log_test("OAuth: /status without auth returns 401", True)
        else:
            log_test("OAuth: /status without auth returns 401", False, f"Expected 401, got {response.status_code}")
    except Exception as e:
        log_test("OAuth: /status without auth returns 401", False, f"Exception: {str(e)}")


def test_oauth_login():
    """Test GET /api/oauth/google/login returns 302/307 redirect (PUBLIC endpoint)"""
    try:
        # Don't follow redirects
        response = requests.get(f"{BASE_URL}/oauth/google/login", allow_redirects=False, timeout=10)
        
        # Accept both 302 and 307 as valid redirect codes
        if response.status_code in [302, 307]:
            location = response.headers.get("Location", "")
            if "accounts.google.com" in location:
                log_test("OAuth: /login returns redirect to accounts.google.com", True, f"Status {response.status_code}, Redirect to: {location[:80]}...")
            else:
                log_test("OAuth: /login returns redirect to accounts.google.com", False, 
                        f"Got {response.status_code} but not to Google: {location}")
        else:
            log_test("OAuth: /login returns redirect to accounts.google.com", False, 
                    f"Expected 302/307, got {response.status_code}: {response.text[:200]}")
    except Exception as e:
        log_test("OAuth: /login returns redirect to accounts.google.com", False, f"Exception: {str(e)}")


def test_oauth_disconnect(token: str):
    """Test POST /api/oauth/google/disconnect (requires auth)"""
    try:
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.post(f"{BASE_URL}/oauth/google/disconnect", headers=headers, timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            if data.get("ok") == True:
                log_test("OAuth: /disconnect returns ok:true", True)
            else:
                log_test("OAuth: /disconnect returns ok:true", False, f"Unexpected response: {data}")
        else:
            log_test("OAuth: /disconnect returns ok:true", False, 
                    f"Expected 200, got {response.status_code}: {response.text}")
    except Exception as e:
        log_test("OAuth: /disconnect returns ok:true", False, f"Exception: {str(e)}")


def test_oauth_disconnect_idempotent(token: str):
    """Test POST /api/oauth/google/disconnect is idempotent"""
    try:
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.post(f"{BASE_URL}/oauth/google/disconnect", headers=headers, timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            if data.get("ok") == True:
                log_test("OAuth: /disconnect is idempotent (2nd call)", True)
            else:
                log_test("OAuth: /disconnect is idempotent (2nd call)", False, f"Unexpected response: {data}")
        else:
            log_test("OAuth: /disconnect is idempotent (2nd call)", False, 
                    f"Expected 200, got {response.status_code}: {response.text}")
    except Exception as e:
        log_test("OAuth: /disconnect is idempotent (2nd call)", False, f"Exception: {str(e)}")


def test_data_endpoint_without_auth(endpoint: str, method: str = "GET", body: Dict[str, Any] = None):
    """Test data endpoint without auth returns 401"""
    try:
        if method == "GET":
            response = requests.get(f"{BASE_URL}{endpoint}", timeout=10)
        else:
            response = requests.post(f"{BASE_URL}{endpoint}", json=body, timeout=10)
        
        if response.status_code == 401:
            log_test(f"Data: {method} {endpoint} without auth returns 401", True)
        else:
            log_test(f"Data: {method} {endpoint} without auth returns 401", False, 
                    f"Expected 401, got {response.status_code}")
    except Exception as e:
        log_test(f"Data: {method} {endpoint} without auth returns 401", False, f"Exception: {str(e)}")


def test_data_endpoint_with_auth_no_google(endpoint: str, method: str, token: str, body: Dict[str, Any] = None):
    """Test data endpoint with auth but no Google connection returns 409"""
    try:
        headers = {"Authorization": f"Bearer {token}"}
        if method == "GET":
            response = requests.get(f"{BASE_URL}{endpoint}", headers=headers, timeout=10)
        else:
            response = requests.post(f"{BASE_URL}{endpoint}", json=body, headers=headers, timeout=10)
        
        if response.status_code == 409:
            log_test(f"Data: {method} {endpoint} with auth but no Google returns 409", True)
        else:
            log_test(f"Data: {method} {endpoint} with auth but no Google returns 409", False, 
                    f"Expected 409, got {response.status_code}: {response.text[:200]}")
    except Exception as e:
        log_test(f"Data: {method} {endpoint} with auth but no Google returns 409", False, f"Exception: {str(e)}")


def run_all_tests():
    """Run all backend tests"""
    print("=" * 80)
    print("CDM DANCE CRM - BACKEND API TESTS")
    print("=" * 80)
    print(f"Testing backend at: {BASE_URL}")
    print()
    
    # 1. AUTH TESTS
    print("\n--- AUTH TESTS ---")
    token = test_auth_login_success()
    test_auth_login_wrong_password()
    
    if token:
        test_auth_me_with_token(token)
    else:
        log_test("Auth: /me with valid token returns 200", False, "Skipped - no token from login")
    
    test_auth_me_without_token()
    test_auth_me_with_bad_token()
    
    # 2. OAUTH TESTS
    print("\n--- OAUTH TESTS ---")
    if token:
        test_oauth_status(token)
    else:
        log_test("OAuth: /status returns configured=true, connected=false", False, "Skipped - no token")
    
    test_oauth_status_without_auth()
    test_oauth_login()
    
    if token:
        test_oauth_disconnect(token)
        test_oauth_disconnect_idempotent(token)
    else:
        log_test("OAuth: /disconnect returns ok:true", False, "Skipped - no token")
        log_test("OAuth: /disconnect is idempotent (2nd call)", False, "Skipped - no token")
    
    # 3. DATA/CRUD TESTS - Without Auth (should return 401)
    print("\n--- DATA ENDPOINTS WITHOUT AUTH (expect 401) ---")
    test_data_endpoint_without_auth("/data/all", "GET")
    test_data_endpoint_without_auth("/students", "POST", {"name": "Test Student"})
    test_data_endpoint_without_auth("/lessons", "POST", {"date": "2026-07-01"})
    test_data_endpoint_without_auth("/hostings", "POST", {"date": "2026-07-01"})
    test_data_endpoint_without_auth("/calendar/events", "GET")
    test_data_endpoint_without_auth("/calendar/sync", "POST")
    
    # 4. DATA/CRUD TESTS - With Auth but No Google (should return 409)
    print("\n--- DATA ENDPOINTS WITH AUTH BUT NO GOOGLE (expect 409) ---")
    if token:
        test_data_endpoint_with_auth_no_google("/data/all", "GET", token)
        test_data_endpoint_with_auth_no_google("/students", "POST", token, {"name": "Test Student"})
        test_data_endpoint_with_auth_no_google("/lessons", "POST", token, {"date": "2026-07-01"})
        test_data_endpoint_with_auth_no_google("/hostings", "POST", token, {"date": "2026-07-01"})
        test_data_endpoint_with_auth_no_google("/calendar/events", "GET", token)
        test_data_endpoint_with_auth_no_google("/calendar/sync", "POST", token)
    else:
        log_test("Data: GET /data/all with auth but no Google returns 409", False, "Skipped - no token")
        log_test("Data: POST /students with auth but no Google returns 409", False, "Skipped - no token")
        log_test("Data: POST /lessons with auth but no Google returns 409", False, "Skipped - no token")
        log_test("Data: POST /hostings with auth but no Google returns 409", False, "Skipped - no token")
        log_test("Data: GET /calendar/events with auth but no Google returns 409", False, "Skipped - no token")
        log_test("Data: POST /calendar/sync with auth but no Google returns 409", False, "Skipped - no token")
    
    # SUMMARY
    print("\n" + "=" * 80)
    print("TEST SUMMARY")
    print("=" * 80)
    print(f"✅ Passed: {passed}")
    print(f"❌ Failed: {failed}")
    print(f"Total: {passed + failed}")
    print("=" * 80)
    
    if failed > 0:
        print("\nFAILED TESTS:")
        for result in test_results:
            if not result["success"]:
                print(f"  ❌ {result['name']}")
                if result["details"]:
                    print(f"     {result['details']}")
    
    return failed == 0


if __name__ == "__main__":
    success = run_all_tests()
    sys.exit(0 if success else 1)
