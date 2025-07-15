#!/usr/bin/env python3
"""
Backend API Test Suite for Center French Gear Suggestions
Tests all API endpoints with proper authentication and error handling
"""

import requests
import sys
import json
from datetime import datetime
import uuid

class CenterFrenchAPITester:
    def __init__(self, base_url="https://5a499081-e5f1-4f18-8cdc-1fd3d6b4ce20.preview.emergentagent.com"):
        self.base_url = base_url
        self.token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_gear_id = None
        self.test_suggestion_id = None

    def log_test(self, name, success, details=""):
        """Log test results"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name} - PASSED {details}")
        else:
            print(f"❌ {name} - FAILED {details}")

    def make_request(self, method, endpoint, data=None, auth_required=False):
        """Make HTTP request with proper headers"""
        url = f"{self.base_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        
        if auth_required and self.token:
            headers['Authorization'] = f'Bearer {self.token}'
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=10)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers, timeout=10)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=10)
            
            return response
        except requests.exceptions.RequestException as e:
            print(f"Request error: {str(e)}")
            return None

    def test_auth_login(self):
        """Test admin login functionality"""
        print("\n🔐 Testing Authentication...")
        
        # Test valid login
        login_data = {"username": "admin", "password": "admin123"}
        response = self.make_request('POST', 'api/auth/login', login_data)
        
        if response and response.status_code == 200:
            data = response.json()
            if 'access_token' in data and 'role' in data:
                self.token = data['access_token']
                self.log_test("Admin Login", True, f"Role: {data['role']}")
                return True
            else:
                self.log_test("Admin Login", False, "Missing token or role in response")
        else:
            self.log_test("Admin Login", False, f"Status: {response.status_code if response else 'No response'}")
        
        # Test invalid login
        invalid_login = {"username": "invalid", "password": "wrong"}
        response = self.make_request('POST', 'api/auth/login', invalid_login)
        
        if response and response.status_code == 401:
            self.log_test("Invalid Login Rejection", True, "Correctly rejected invalid credentials")
        else:
            self.log_test("Invalid Login Rejection", False, f"Expected 401, got {response.status_code if response else 'No response'}")
        
        return self.token is not None

    def test_gears_endpoints(self):
        """Test gear-related endpoints"""
        print("\n⚙️ Testing Gear Endpoints...")
        
        # Test get all gears
        response = self.make_request('GET', 'api/gears')
        if response and response.status_code == 200:
            gears = response.json()
            self.log_test("Get All Gears", True, f"Found {len(gears)} gears")
            if gears:
                self.test_gear_id = gears[0]['id']
        else:
            self.log_test("Get All Gears", False, f"Status: {response.status_code if response else 'No response'}")
        
        # Test get gears by category
        categories = ['joueurs', 'moderateur', 'evenements', 'interdits']
        for category in categories:
            response = self.make_request('GET', f'api/gears?category={category}')
            if response and response.status_code == 200:
                gears = response.json()
                self.log_test(f"Get {category.title()} Gears", True, f"Found {len(gears)} gears")
            else:
                self.log_test(f"Get {category.title()} Gears", False, f"Status: {response.status_code if response else 'No response'}")
        
        # Test get single gear
        if self.test_gear_id:
            response = self.make_request('GET', f'api/gears/{self.test_gear_id}')
            if response and response.status_code == 200:
                gear = response.json()
                self.log_test("Get Single Gear", True, f"Gear: {gear.get('name', 'Unknown')}")
            else:
                self.log_test("Get Single Gear", False, f"Status: {response.status_code if response else 'No response'}")
        
        # Test create gear (requires auth)
        if self.token:
            new_gear = {
                "name": "Test Gear",
                "nickname": "Test",
                "gear_id": f"TEST{uuid.uuid4().hex[:8]}",
                "image_url": "https://example.com/test.png",
                "description": "Test gear for API testing",
                "category": "joueurs"
            }
            response = self.make_request('POST', 'api/gears', new_gear, auth_required=True)
            if response and response.status_code == 200:
                self.log_test("Create Gear", True, "Gear created successfully")
            else:
                self.log_test("Create Gear", False, f"Status: {response.status_code if response else 'No response'}")

    def test_suggestions_endpoints(self):
        """Test suggestion-related endpoints"""
        print("\n💡 Testing Suggestion Endpoints...")
        
        # Test create suggestion (no auth required)
        suggestion_data = {
            "name": "Test Suggestion",
            "nickname": "Test Suggest",
            "gear_id": f"SUGGEST{uuid.uuid4().hex[:8]}",
            "image_url": "https://example.com/suggestion.png",
            "description": "Test suggestion for API testing",
            "category": "joueurs"
        }
        
        response = self.make_request('POST', 'api/suggestions', suggestion_data)
        if response and response.status_code == 200:
            self.log_test("Create Suggestion", True, "Suggestion created successfully")
        else:
            self.log_test("Create Suggestion", False, f"Status: {response.status_code if response else 'No response'}")
        
        # Test get suggestions (requires auth)
        if self.token:
            response = self.make_request('GET', 'api/suggestions', auth_required=True)
            if response and response.status_code == 200:
                suggestions = response.json()
                self.log_test("Get Suggestions", True, f"Found {len(suggestions)} suggestions")
                
                # Find a pending suggestion for approval/rejection tests
                pending_suggestions = [s for s in suggestions if s.get('status') == 'pending']
                if pending_suggestions:
                    self.test_suggestion_id = pending_suggestions[0]['id']
                    
                    # Test approve suggestion
                    response = self.make_request('POST', f'api/suggestions/{self.test_suggestion_id}/approve', auth_required=True)
                    if response and response.status_code == 200:
                        self.log_test("Approve Suggestion", True, "Suggestion approved and gear created")
                    else:
                        self.log_test("Approve Suggestion", False, f"Status: {response.status_code if response else 'No response'}")
                
            else:
                self.log_test("Get Suggestions", False, f"Status: {response.status_code if response else 'No response'}")

    def test_error_handling(self):
        """Test error handling for various scenarios"""
        print("\n🚨 Testing Error Handling...")
        
        # Test accessing protected endpoint without auth
        response = self.make_request('GET', 'api/suggestions')
        if response and response.status_code == 401:
            self.log_test("Unauthorized Access Protection", True, "Correctly rejected unauthenticated request")
        else:
            self.log_test("Unauthorized Access Protection", False, f"Expected 401, got {response.status_code if response else 'No response'}")
        
        # Test non-existent gear
        response = self.make_request('GET', 'api/gears/nonexistent-id')
        if response and response.status_code == 404:
            self.log_test("Non-existent Gear Handling", True, "Correctly returned 404 for non-existent gear")
        else:
            self.log_test("Non-existent Gear Handling", False, f"Expected 404, got {response.status_code if response else 'No response'}")

    def run_all_tests(self):
        """Run complete test suite"""
        print("🚀 Starting Center French API Test Suite")
        print(f"Testing against: {self.base_url}")
        print("=" * 60)
        
        # Test authentication first
        if not self.test_auth_login():
            print("❌ Authentication failed - stopping tests")
            return False
        
        # Test all endpoints
        self.test_gears_endpoints()
        self.test_suggestions_endpoints()
        self.test_error_handling()
        
        # Print final results
        print("\n" + "=" * 60)
        print(f"📊 Test Results: {self.tests_passed}/{self.tests_run} tests passed")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All tests passed!")
            return True
        else:
            print(f"⚠️  {self.tests_run - self.tests_passed} tests failed")
            return False

def main():
    """Main test execution"""
    tester = CenterFrenchAPITester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())