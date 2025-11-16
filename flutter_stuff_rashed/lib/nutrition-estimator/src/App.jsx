// src/App.jsx
import { useState, useEffect } from "react";
import InputPage from "./InputPage.jsx";
import DailyConsumerPage from "./DailyConsumerPage.jsx";
import { analyzeImage } from "./api.js";
import { nutritionFromJson } from "./nutritionModel.js";
import "./styles.css";

export default function App() {
  const [selectedTab, setSelectedTab] = useState("add"); // "add" or "daily"
  const [foodEntries, setFoodEntries] = useState([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // ---- Load saved entries on startup ----
  useEffect(() => {
    try {
      const saved = localStorage.getItem("foodEntries");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setFoodEntries(parsed);
        }
      }
    } catch (e) {
      console.error("Error loading saved entries:", e);
    }
  }, []);

  // ---- Save whenever entries change ----
  useEffect(() => {
    try {
      localStorage.setItem("foodEntries", JSON.stringify(foodEntries));
    } catch (e) {
      console.error("Error saving entries:", e);
    }
  }, [foodEntries]);

  function handleSaveEntry(entry) {
    setFoodEntries((prev) => [...prev, entry]);
    alert(`Saved entry for "${entry.foodName}"`);
    setSelectedTab("daily");
  }

  function handleDeleteEntry(index) {
    const name = foodEntries[index]?.foodName;
    setFoodEntries((prev) => prev.filter((_, i) => i !== index));
    if (name) {
      alert(`Deleted entry for "${name}"`);
    }
  }

  async function handleAnalyzeImage(file) {
    try {
      setIsAnalyzing(true);
      alert("Uploading and analyzing photo...");

      const result = await analyzeImage(file);
      const nutritionData = nutritionFromJson(result);

      const message =
        `The app identified:\n\n` +
        `Food: ${nutritionData.foodName}\n` +
        `Calories: ${nutritionData.calories.toFixed(0)} kcal\n` +
        `Protein: ${nutritionData.protein.toFixed(1)} g\n` +
        `Carbs: ${nutritionData.carbs.toFixed(1)} g\n` +
        `Fats: ${nutritionData.fats.toFixed(1)} g\n\n` +
        `Add this entry?`;

      const confirmed = window.confirm(message);

      if (confirmed) {
        const newEntry = {
          foodName: nutritionData.foodName,
          calories: nutritionData.calories,
          protein: nutritionData.protein,
          carbs: nutritionData.carbs,
          fats: nutritionData.fats,
        };
        setFoodEntries((prev) => [...prev, newEntry]);
        alert("Entry added from photo!");
        setSelectedTab("daily");
      }
    } catch (err) {
      console.error(err);
      alert("Failed to analyze photo. Please try again.");
    } finally {
      setIsAnalyzing(false);
    }
  }

  const isAddTab = selectedTab === "add";

  return (
    <div className="app-root">
      <header className="app-bar">
        <h1>Nutrition Estimator</h1>
      </header>

      <div className="app-body">
        {isAddTab ? (
          <InputPage
            onSaveEntry={handleSaveEntry}
            onAnalyzeImage={handleAnalyzeImage}
            isAnalyzing={isAnalyzing}
          />
        ) : (
          <DailyConsumerPage
            foodEntries={foodEntries}
            onDeleteEntry={handleDeleteEntry}
          />
        )}
      </div>

      <nav className="bottom-nav">
        <button
          className={isAddTab ? "nav-btn active" : "nav-btn"}
          onClick={() => setSelectedTab("add")}
        >
          ➕ Add Entry
        </button>
        <button
          className={!isAddTab ? "nav-btn active" : "nav-btn"}
          onClick={() => setSelectedTab("daily")}
        >
          📋 Daily Consumer
        </button>
      </nav>
    </div>
  );
}
