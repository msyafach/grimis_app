#!/usr/bin/env python3
"""
Grimis API Comprehensive Test Script

This script tests all major API endpoints to ensure they work correctly.
Run this after making changes to verify nothing is broken.

Usage:
    python test_api.py
    python test_api.py --verbose  # For detailed output
    python test_api.py --url http://localhost:8000  # Custom URL
"""

import requests
import json
import sys
import time
import argparse
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass
from datetime import datetime

# Configuration
DEFAULT_BASE_URL = "http://localhost:8000"
TEST_USERNAME = "super_admin"
TEST_PASSWORD = "Test123!"

# Colors for terminal output
class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    RESET = '\033[0m'


@dataclass
class TestResult:
    name: str
    passed: bool
    message: str
    duration_ms: float


class APITester:
    def __init__(self, base_url: str = DEFAULT_BASE_URL, verbose: bool = False):
        self.base_url = base_url.rstrip('/')
        self.verbose = verbose
        self.token: Optional[str] = None
        self.test_user_id: Optional[str] = None
        self.test_group_id: Optional[str] = None
        self.results: List[TestResult] = []
        self.session = requests.Session()
        self.username = TEST_USERNAME
        self.password = TEST_PASSWORD

    def log(self, message: str, color: str = Colors.RESET):
        """Print message if verbose mode is on"""
        if self.verbose:
            print(f"{color}{message}{Colors.RESET}")

    def print_header(self, text: str):
        """Print section header"""
        print(f"\n{Colors.BLUE}{'='*60}{Colors.RESET}")
        print(f"{Colors.BLUE}{text.center(60)}{Colors.RESET}")
        print(f"{Colors.BLUE}{'='*60}{Colors.RESET}")

    def print_result(self, result: TestResult):
        """Print test result"""
        status = f"{Colors.GREEN}[PASS]{Colors.RESET}" if result.passed else f"{Colors.RED}[FAIL]{Colors.RESET}"
        print(f"  {status} {result.name} ({result.duration_ms:.1f}ms)")
        if not result.passed and result.message:
            print(f"      -> {Colors.RED}{result.message}{Colors.RESET}")

    def run_test(self, name: str, test_func) -> TestResult:
        """Run a test and capture result"""
        start = time.time()
        try:
            test_func()
            duration = (time.time() - start) * 1000
            return TestResult(name, True, "", duration)
        except AssertionError as e:
            duration = (time.time() - start) * 1000
            return TestResult(name, False, str(e), duration)
        except Exception as e:
            duration = (time.time() - start) * 1000
            return TestResult(name, False, f"{type(e).__name__}: {str(e)}", duration)

    def assert_response(self, response: requests.Response, expected_status: int = 200):
        """Assert response status code"""
        if response.status_code != expected_status:
            raise AssertionError(
                f"Expected status {expected_status}, got {response.status_code}. "
                f"Response: {response.text[:200]}"
            )

    def get_headers(self) -> Dict[str, str]:
        """Get authorization headers"""
        if not self.token:
            raise AssertionError("Not authenticated. Call test_login first.")
        return {"Authorization": f"Bearer {self.token}"}

    # ==================== AUTH TESTS ====================
    def test_login(self):
        """Test: User Login"""
        self.print_header("TESTING: Authentication")

        result = self.run_test("Login with valid credentials", self._test_login_success)
        self.print_result(result)
        self.results.append(result)

        if not result.passed:
            print(f"{Colors.RED}Login failed. Cannot continue with authenticated tests.{Colors.RESET}")
            return False

        # Test invalid login
        result = self.run_test("Login with invalid credentials", self._test_login_invalid)
        self.print_result(result)
        self.results.append(result)

        return True

    def _test_login_success(self):
        """Test successful login"""
        url = f"{self.base_url}/api/v1/users/login"
        data = {
            "username": self.username,
            "password": self.password,
            "recaptcha_token": None
        }
        response = self.session.post(url, json=data, timeout=10)
        self.assert_response(response, 200)

        data = response.json()
        assert "access_token" in data, "No access_token in response"
        assert "token_type" in data, "No token_type in response"

        self.token = data["access_token"]
        self.log(f"Got token: {self.token[:20]}...", Colors.GREEN)

    def _test_login_invalid(self):
        """Test login with invalid credentials"""
        url = f"{self.base_url}/api/v1/users/login"
        data = {
            "username": "invalid_user",
            "password": "wrong_password",
            "recaptcha_token": None
        }
        response = self.session.post(url, json=data, timeout=10)
        self.assert_response(response, 401)

    # ==================== USER TESTS ====================
    def test_users(self):
        """Test: User Management APIs"""
        self.print_header("TESTING: User Management")

        tests = [
            ("Get current user profile", self._test_get_current_user),
            ("Get all users", self._test_get_all_users),
            ("Get user by ID", self._test_get_user_by_id),
            ("Get user permissions", self._test_get_user_permissions),
        ]

        for name, func in tests:
            result = self.run_test(name, func)
            self.print_result(result)
            self.results.append(result)

    def _test_get_current_user(self):
        """Test GET /users/me"""
        url = f"{self.base_url}/api/v1/users/me"
        response = self.session.get(url, headers=self.get_headers(), timeout=10)
        self.assert_response(response, 200)

        data = response.json()
        assert "id" in data, "No id in response"
        assert "username" in data, "No username in response"
        assert data["username"] == TEST_USERNAME

        self.test_user_id = data["id"]
        self.log(f"Current user ID: {self.test_user_id}", Colors.GREEN)

    def _test_get_all_users(self):
        """Test GET /users/users"""
        url = f"{self.base_url}/api/v1/users/users"
        response = self.session.get(url, headers=self.get_headers(), timeout=10)
        self.assert_response(response, 200)

        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        assert len(data) > 0, "No users found"

        self.log(f"Found {len(data)} users", Colors.GREEN)

    def _test_get_user_by_id(self):
        """Test GET /users/users/{user_id}"""
        if not self.test_user_id:
            raise AssertionError("No test user ID available")

        url = f"{self.base_url}/api/v1/users/users/{self.test_user_id}"
        response = self.session.get(url, headers=self.get_headers(), timeout=10)
        self.assert_response(response, 200)

        data = response.json()
        assert data["id"] == self.test_user_id, "User ID mismatch"

    def _test_get_user_permissions(self):
        """Test GET /users/{user_id}/permissions"""
        if not self.test_user_id:
            raise AssertionError("No test user ID available")

        url = f"{self.base_url}/api/v1/users/users/{self.test_user_id}/permissions"
        response = self.session.get(url, headers=self.get_headers(), timeout=10)
        self.assert_response(response, 200)

        data = response.json()
        assert isinstance(data, list), "Permissions should be a list"
        self.log(f"User has {len(data)} permissions", Colors.GREEN)

    # ==================== GROUP TESTS ====================
    def test_groups(self):
        """Test: Group Management APIs"""
        self.print_header("TESTING: Group Management")

        tests = [
            ("Get all groups", self._test_get_groups),
            ("Get group by ID", self._test_get_group_by_id),
            ("Get group permissions", self._test_get_group_permissions),
            ("Add and remove member from group", self._test_add_remove_member),
        ]

        for name, func in tests:
            result = self.run_test(name, func)
            self.print_result(result)
            self.results.append(result)

    def _test_get_groups(self):
        """Test GET /groups"""
        url = f"{self.base_url}/api/v1/groups"
        response = self.session.get(url, headers=self.get_headers(), timeout=10)
        self.assert_response(response, 200)

        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        assert len(data) > 0, "No groups found"

        # Store first group for later tests
        self.test_group_id = data[0]["id"]
        self.log(f"Found {len(data)} groups, using: {self.test_group_id}", Colors.GREEN)

    def _test_get_group_by_id(self):
        """Test GET /groups/{group_id}"""
        if not self.test_group_id:
            raise AssertionError("No test group ID available")

        url = f"{self.base_url}/api/v1/groups/{self.test_group_id}"
        response = self.session.get(url, headers=self.get_headers(), timeout=10)
        self.assert_response(response, 200)

        data = response.json()
        assert data["id"] == self.test_group_id, "Group ID mismatch"
        assert "member_count" in data, "No member_count in response"
        assert "permissions" in data, "No permissions in response"

        self.log(f"Group has {data.get('member_count', 0)} members", Colors.GREEN)

    def _test_get_group_permissions(self):
        """Test GET /groups/{group_id}/permissions"""
        if not self.test_group_id:
            raise AssertionError("No test group ID available")

        url = f"{self.base_url}/api/v1/groups/{self.test_group_id}/permissions"
        response = self.session.get(url, headers=self.get_headers(), timeout=10)
        self.assert_response(response, 200)

        data = response.json()
        assert isinstance(data, list), "Permissions should be a list"
        self.log(f"Group has {len(data)} permissions", Colors.GREEN)

    def _test_add_remove_member(self):
        """Test adding and removing a member from a group"""
        if not self.test_group_id:
            raise AssertionError("No test group ID available")
        if not self.test_user_id:
            raise AssertionError("No test user ID available")

        # First, get current group state
        url = f"{self.base_url}/api/v1/groups/{self.test_group_id}"
        response = self.session.get(url, headers=self.get_headers(), timeout=10)
        self.assert_response(response, 200)
        group = response.json()

        user_id = self.test_user_id
        initial_count = group.get("member_count", 0)

        self.log(f"Initial member count: {initial_count}", Colors.YELLOW)

        # Try to add member (might already be member)
        add_url = f"{self.base_url}/api/v1/groups/{self.test_group_id}/members/{user_id}"
        add_resp = self.session.post(add_url, headers=self.get_headers(), json={}, timeout=10)

        if add_resp.status_code == 200:
            self.log("Member added successfully", Colors.GREEN)
        elif add_resp.status_code == 409:
            self.log("Member already in group", Colors.YELLOW)
        else:
            raise AssertionError(f"Add member failed: {add_resp.status_code}")

        # Now remove
        self.log("Removing member...", Colors.YELLOW)
        remove_url = f"{self.base_url}/api/v1/groups/{self.test_group_id}/members/{user_id}"
        remove_resp = self.session.delete(remove_url, headers=self.get_headers(), timeout=10)
        self.assert_response(remove_resp, 200)

        self.log("Remove member completed", Colors.GREEN)

    # ==================== AUDIT TRAIL TESTS ====================
    def test_audit_trail(self):
        """Test: Audit Trail APIs"""
        self.print_header("TESTING: Audit Trail")

        tests = [
            ("Get audit logs", self._test_get_audit_logs),
            ("Get audit actions", self._test_get_audit_actions),
            ("Get audit resource types", self._test_get_audit_resource_types),
        ]

        for name, func in tests:
            result = self.run_test(name, func)
            self.print_result(result)
            self.results.append(result)

    def _test_get_audit_logs(self):
        """Test GET /audit-trail/logs"""
        url = f"{self.base_url}/api/v1/audit-trail/logs"
        response = self.session.get(url, headers=self.get_headers(), timeout=10)
        self.assert_response(response, 200)

        data = response.json()
        assert "logs" in data, "Response should have 'logs' field"
        assert isinstance(data["logs"], list), "logs should be a list"
        assert "total" in data, "Response should have 'total' field"
        self.log(f"Found {data['total']} audit logs", Colors.GREEN)

    def _test_get_audit_actions(self):
        """Test GET /audit-trail/actions"""
        url = f"{self.base_url}/api/v1/audit-trail/actions"
        response = self.session.get(url, headers=self.get_headers(), timeout=10)
        self.assert_response(response, 200)

        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        self.log(f"Found {len(data)} audit actions", Colors.GREEN)

    def _test_get_audit_resource_types(self):
        """Test GET /audit-trail/resource-types"""
        url = f"{self.base_url}/api/v1/audit-trail/resource-types"
        response = self.session.get(url, headers=self.get_headers(), timeout=10)
        self.assert_response(response, 200)

        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        self.log(f"Found {len(data)} resource types", Colors.GREEN)

    # ==================== HEALTH CHECK ====================
    def test_health(self):
        """Test: Health Check"""
        self.print_header("TESTING: Health Check")

        result = self.run_test("Health check endpoint", self._test_health_check)
        self.print_result(result)
        self.results.append(result)

    def _test_health_check(self):
        """Test GET /health"""
        url = f"{self.base_url}/api/v1/health"
        response = self.session.get(url, timeout=10)
        self.assert_response(response, 200)

        data = response.json()
        assert data.get("status") == "ok", "Health check failed"
        self.log("Health check passed", Colors.GREEN)

    # ==================== SUMMARY ====================
    def print_summary(self):
        """Print test summary"""
        self.print_header("TEST SUMMARY")

        total = len(self.results)
        passed = sum(1 for r in self.results if r.passed)
        failed = total - passed

        print(f"\n  Total Tests: {total}")
        print(f"  {Colors.GREEN}Passed: {passed}{Colors.RESET}")
        print(f"  {Colors.RED if failed > 0 else Colors.GREEN}Failed: {failed}{Colors.RESET}")

        if failed > 0:
            print(f"\n{Colors.RED}Failed Tests:{Colors.RESET}")
            for result in self.results:
                if not result.passed:
                    print(f"  - {result.name}: {result.message}")

        # Calculate total duration
        total_duration = sum(r.duration_ms for r in self.results)
        print(f"\n  Total Duration: {total_duration:.1f}ms")
        print(f"  Average: {total_duration/total:.1f}ms per test")

        print(f"\n{Colors.BLUE}{'='*60}{Colors.RESET}")

        return failed == 0

    def run_all_tests(self) -> bool:
        """Run all tests"""
        print(f"\n{Colors.BLUE}Starting API Tests...{Colors.RESET}")
        print(f"Base URL: {self.base_url}")
        print(f"Test User: {self.username}")
        print(f"Time: {datetime.now().isoformat()}")

        # Run tests in order
        self.test_health()

        if not self.test_login():
            self.print_summary()
            return False

        self.test_users()
        self.test_groups()
        self.test_audit_trail()

        return self.print_summary()


def main():
    parser = argparse.ArgumentParser(description="Grimis API Test Script")
    parser.add_argument("--url", default=DEFAULT_BASE_URL, help="Base URL for API")
    parser.add_argument("--verbose", "-v", action="store_true", help="Verbose output")
    parser.add_argument("--username", default=TEST_USERNAME, help="Test username")
    parser.add_argument("--password", default=TEST_PASSWORD, help="Test password")

    args = parser.parse_args()

    tester = APITester(base_url=args.url, verbose=args.verbose)
    # Pass credentials to tester
    tester.username = args.username
    tester.password = args.password
    success = tester.run_all_tests()

    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
