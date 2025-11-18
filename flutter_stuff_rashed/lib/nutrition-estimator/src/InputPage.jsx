// src/InputPage.jsx
import { useState } from "react";

export default function InputPage({ onSaveEntry, onAnalyzeImage, isAnalyzing }) {
  const [foodName, setFoodName] = useState("");
  const [calories, setCalories] = useState("");
  const [protein, setProtein] = useState("");
  const [carbs, setCarbs] = useState("");
  const [fats, setFats] = useState("");

  function handleSaveClick() {
    const cals = parseFloat(calories) || 0;
    const prot = parseFloat(protein) || 0;
    const crb = parseFloat(carbs) || 0;
    const fat = parseFloat(fats) || 0;

    if (!foodName.trim() || cals <= 0) {
      alert("Please enter a valid food name and calorie count.");
      return;
    }

    const newEntry = {
      foodName: foodName.trim(),
      calories: cals,
      protein: prot,
      carbs: crb,
      fats: fat,
    };

    onSaveEntry(newEntry);

    setFoodName("");
    setCalories("");
    setProtein("");
    setCarbs("");
    setFats("");
  }

  function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (file) {
      onAnalyzeImage(file);
      e.target.value = "";
    }
  }

  return (
    <div className="page-container">
      <div className="field-group">
        <label>Food Name</label>
        <input
          type="text"
          value={foodName}
          onChange={(e) => setFoodName(e.target.value)}
          placeholder="e.g. Grilled chicken with rice"
        />
      </div>

      <div className="field-group">
        <label>Total Calories (kcal)</label>
        <input
          type="number"
          value={calories}
          onChange={(e) => setCalories(e.target.value)}
          placeholder="e.g. 550"
        />
      </div>

      <div className="field-group">
        <label>Protein (g)</label>
        <input
          type="number"
          value={protein}
          onChange={(e) => setProtein(e.target.value)}
          placeholder="e.g. 35"
        />
      </div>

      <div className="field-group">
        <label>Carbohydrates (g)</label>
        <input
          type="number"
          value={carbs}
          onChange={(e) => setCarbs(e.target.value)}
          placeholder="e.g. 50"
        />
      </div>

      <div className="field-group">
        <label>Fats (g)</label>
        <input
          type="number"
          value={fats}
          onChange={(e) => setFats(e.target.value)}
          placeholder="e.g. 15"
        />
      </div>

      <div className="button-row">
        <button onClick={handleSaveClick} className="primary-btn">
          Save Food Entry
        </button>

        <label className="icon-button"
          style={{ 
            opacity: isAnalyzing ? 0.7 : 1, 
            cursor: isAnalyzing ? 'not-allowed' : 'pointer' 
          }}
          >
          {isAnalyzing ? "⏳Analyzing..." : "📷 Take Photo"}
          <input
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileChange}
            style={{ display: "none" }}
            disabled={isAnalyzing}
          />
        </label>
      </div>
    </div>
  );
}
