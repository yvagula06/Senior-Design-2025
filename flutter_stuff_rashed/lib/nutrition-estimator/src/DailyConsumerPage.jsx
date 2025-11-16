// src/DailyConsumerPage.jsx

export default function DailyConsumerPage({ foodEntries, onDeleteEntry }) {
  if (!foodEntries || foodEntries.length === 0) {
    return <div className="empty-state">No entries saved yet.</div>;
  }

  const totalCalories = foodEntries.reduce((sum, e) => sum + e.calories, 0);
  const totalProtein = foodEntries.reduce((sum, e) => sum + e.protein, 0);
  const totalCarbs = foodEntries.reduce((sum, e) => sum + e.carbs, 0);
  const totalFats = foodEntries.reduce((sum, e) => sum + e.fats, 0);

  return (
    <div className="page-container">
      <div className="card summary-card">
        <h2>Daily Totals</h2>
        <p>Total Calories: {totalCalories.toFixed(0)} kcal</p>
        <p>Total Protein: {totalProtein.toFixed(1)} g</p>
        <p>Total Carbs: {totalCarbs.toFixed(1)} g</p>
        <p>Total Fats: {totalFats.toFixed(1)} g</p>
      </div>

      <div className="list-container">
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
              Calories: {entry.calories} kcal
              <br />
              Protein: {entry.protein} g
              <br />
              Carbs: {entry.carbs} g
              <br />
              Fats: {entry.fats} g
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
