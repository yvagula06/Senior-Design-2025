// src/MacroChart.jsx
import React from 'react';
import { Pie } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';

// Register the necessary components from Chart.js
ChartJS.register(ArcElement, Tooltip, Legend);

export default function MacroChart({ totals }) {
  // We only chart the three macros: Protein, Carbs, Fats
  const macroData = [
    totals.protein.toFixed(1),
    totals.carbs.toFixed(1),
    totals.fats.toFixed(1),
  ];

  const data = {
    labels: ['Protein (g)', 'Carbs (g)', 'Fats (g)'],
    datasets: [
      {
        data: macroData,
        backgroundColor: [
          'rgba(75, 192, 192, 0.8)', // Green-blue for Protein
          'rgba(255, 159, 64, 0.8)', // Orange for Carbs
          'rgba(255, 99, 132, 0.8)', // Red-pink for Fats
        ],
        borderColor: ['#fff', '#fff', '#fff'],
        borderWidth: 2,
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          // Use the text color defined in your CSS variables
          color: 'var(--text)', 
        }
      },
      title: {
        display: false,
      },
      tooltip: {
          callbacks: {
              // Custom tooltip to show g, not just the number
              label: function(context) {
                  let label = context.label || '';
                  if (label) {
                      label += ': ';
                  }
                  if (context.raw !== null) {
                      label += context.raw + 'g';
                  }
                  return label;
              }
          }
      }
    },
  };

  return (
    <div style={{ padding: '5px', height: '250px', margin: '0 100px' }}> 
      <Pie data={data} options={options} />
    </div>
  );
}