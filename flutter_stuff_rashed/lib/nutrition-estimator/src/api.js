// src/api.jsx
const BASE_URL = "https://csu-nutrition-arda.free.beeceptor.com";

export async function analyzeImage(file) {
  const formData = new FormData();
  formData.append("image", file); // field name matches your Flutter ApiService

  const response = await fetch(`${BASE_URL}/analyzeImage`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`Server error: ${response.status}`);
  }

  return response.json(); // returns JSON from backend
}
