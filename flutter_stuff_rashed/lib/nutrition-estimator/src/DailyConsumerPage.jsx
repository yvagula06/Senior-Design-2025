// src/DailyConsumerPage.jsx (Updated with Chart Integration)
import React from 'react';
import MacroChart from './MacroChart'; // <-- The Chart component is ready to use!

export default function DailyConsumerPage({ foodEntries, onDeleteEntry }) {
  if (!foodEntries || foodEntries.length === 0) {
    return <div className="empty-state">No entries saved yet.</div>;
  }

  // --- Calculate Totals ---
  // Use a single reduce call to create a totals object for cleaner code
  const totals = foodEntries.reduce((acc, entry) => ({
      calories: acc.calories + (entry.calories || 0),
      protein: acc.protein + (entry.protein || 0),
      carbs: acc.carbs + (entry.carbs || 0),
      fats: acc.fats + (entry.fats || 0),
  }), { calories: 0, protein: 0, carbs: 0, fats: 0 });

  return (
    <div className="page-container">
      
      {/* 1. CHART CARD: Add the MacroChart component here */}
      <div className="card summary-card chart-container">
        <h2>Macro Breakdown</h2>
        {/* Pass the calculated totals to the MacroChart component */}
        <MacroChart totals={totals} /> 
      </div>
      
      {/* 2. NUMERIC SUMMARY CARD */}
      <div className="card summary-card">
        <h2>Daily Totals</h2>
        <p>Total Calories: <strong>{totals.calories.toFixed(0)} kcal</strong></p>
        <p>Total Protein: {totals.protein.toFixed(1)} g</p>
        <p>Total Carbs: {totals.carbs.toFixed(1)} g</p>
        <p>Total Fats: {totals.fats.toFixed(1)} g</p>
      </div>

      <div className="list-container">
        <h3>Today's Log</h3> {/* Added a heading for the list */}
        {foodEntries.map((entry, index) => (
          <div className="card entry-card" key={index}>
            <div className="entry-header">
              <h3>{entry.foodName}</h3>
              <button
                className="delete-btn"
                onClick={() => onDeleteEntry(index)}
              >
                ✕
              </button>
            </div>
            <p>
              Calories: {entry.calories.toFixed(0)} kcal | 
              Protein: {entry.protein.toFixed(1)} g | 
              Carbs: {entry.carbs.toFixed(1)} g | 
              Fats: {entry.fats.toFixed(1)} g
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}