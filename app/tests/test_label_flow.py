import pytest
from fastapi.testclient import TestClient
from app.main import app

@pytest.mark.integration
@pytest.mark.skip(reason="Integration test - skipped by default")
def test_label_flow():
    client = TestClient(app)

    response = client.post(
        "/label",
        json={
            "dish_name": "example dish",
            "calories": 600,
            "top_k": 5,
            "use_mixture": True
        }
    )

    assert response.status_code == 200, f"Unexpected status code: {response.status_code}"
    data = response.json()

    assert "candidates" in data, "Response missing candidates"
    assert all("weight" in cand for cand in data["candidates"]), "Candidates missing weights"
    assert abs(data["nutrients"]["calories"] - 600) < 1e-6, "Calories mismatch in response"