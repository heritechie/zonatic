import hashlib

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text

from apps.api.database import SessionLocal
from apps.api.main import app

client = TestClient(app)

# Test API key from conftest.py
DEV_KEY = "zn_test_devkey1234"
DEV_KEY_HASH = hashlib.sha256(DEV_KEY.encode()).hexdigest()


@pytest.fixture(scope="module")
def setup_test_postal_code():
    """Set up test postal code and area for authentication tests."""
    with SessionLocal() as db:
        # Insert test postal code
        db.execute(
            text(
                """
                INSERT INTO postal_codes (code, metadata)
                VALUES ('12345', '{"source":"test","status":"OFFICIAL"}')
                ON CONFLICT (code) DO NOTHING
                """
            )
        )
        
        # Link to existing area from Phase 1 (we know code 31 exists as province)
        db.execute(
            text(
                """
                INSERT INTO postal_code_areas (postal_code_id, administrative_area_id)
                SELECT pc.id, aa.id
                FROM postal_codes pc
                CROSS JOIN administrative_areas aa
                WHERE pc.code = '12345' AND aa.code = '31'
                ON CONFLICT DO NOTHING
                """
            )
        )
        db.commit()
    yield
    # Cleanup
    with SessionLocal() as db:
        db.execute(text("DELETE FROM postal_code_areas WHERE postal_code_id IN (SELECT id FROM postal_codes WHERE code = '12345')"))
        db.execute(text("DELETE FROM postal_codes WHERE code = '12345'"))
        db.commit()


class TestPostalCodeLookupAuth:
    """Test authentication for GET /v1/postal-codes/{code}"""

    def test_valid_api_key(self, setup_test_postal_code):
        response = client.get(
            "/v1/postal-codes/12345",
            headers={"Authorization": f"Bearer {DEV_KEY}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["code"] == "12345"
        assert "areas" in data

    def test_missing_api_key(self, setup_test_postal_code):
        response = client.get("/v1/postal-codes/12345")
        assert response.status_code == 401
        error = response.json()
        assert error["error"]["code"] == "INVALID_API_KEY"

    def test_invalid_api_key(self, setup_test_postal_code):
        response = client.get(
            "/v1/postal-codes/12345",
            headers={"Authorization": "Bearer invalid_key_12345"}
        )
        assert response.status_code == 401
        error = response.json()
        assert error["error"]["code"] == "INVALID_API_KEY"

    def test_malformed_authorization_header(self, setup_test_postal_code):
        response = client.get(
            "/v1/postal-codes/12345",
            headers={"Authorization": "BadFormat token"}
        )
        assert response.status_code == 401

    def test_unknown_postal_code(self):
        response = client.get(
            "/v1/postal-codes/99999",
            headers={"Authorization": f"Bearer {DEV_KEY}"}
        )
        assert response.status_code == 404
        error = response.json()
        assert error["error"]["code"] == "POSTAL_CODE_NOT_FOUND"
        assert "message" in error["error"]


class TestPostalCodeSearchAuth:
    """Test authentication for GET /v1/postal-codes/search"""

    def test_valid_api_key(self, setup_test_postal_code):
        response = client.get(
            "/v1/postal-codes/search?q=123",
            headers={"Authorization": f"Bearer {DEV_KEY}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)

    def test_missing_api_key(self):
        response = client.get("/v1/postal-codes/search?q=123")
        assert response.status_code == 401
        error = response.json()
        assert error["error"]["code"] == "INVALID_API_KEY"

    def test_invalid_api_key(self):
        response = client.get(
            "/v1/postal-codes/search?q=123",
            headers={"Authorization": "Bearer invalid_key_12345"}
        )
        assert response.status_code == 401
        error = response.json()
        assert error["error"]["code"] == "INVALID_API_KEY"


class TestAreaPostalCodesAuth:
    """Test authentication for GET /v1/areas/{code}/postal-codes"""

    def test_valid_api_key(self, setup_test_postal_code):
        # Use province code 31 which exists from Phase 1
        response = client.get(
            "/v1/areas/31/postal-codes",
            headers={"Authorization": f"Bearer {DEV_KEY}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "code" in data
        assert "postal_codes" in data

    def test_missing_api_key(self):
        response = client.get("/v1/areas/31/postal-codes")
        assert response.status_code == 401
        error = response.json()
        assert error["error"]["code"] == "INVALID_API_KEY"

    def test_invalid_api_key(self):
        response = client.get(
            "/v1/areas/31/postal-codes",
            headers={"Authorization": "Bearer invalid_key_12345"}
        )
        assert response.status_code == 401
        error = response.json()
        assert error["error"]["code"] == "INVALID_API_KEY"

    def test_unknown_area(self):
        response = client.get(
            "/v1/areas/99999999/postal-codes",
            headers={"Authorization": f"Bearer {DEV_KEY}"}
        )
        assert response.status_code == 404
        error = response.json()
        assert error["error"]["code"] == "AREA_NOT_FOUND"
        assert "message" in error["error"]
