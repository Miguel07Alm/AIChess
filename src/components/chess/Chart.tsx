import { Move } from 'chess.js';
import { Line } from 'react-chartjs-2';
import { PIECE_VALUES } from './GameInfo';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ChartOptions,
  TooltipItem,
  Filler
} from 'chart.js';

// Registrar los componentes necesarios de Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface ChartProps {
  moves: Move[];
}

export const Chart = ({ moves }: ChartProps) => {
  const materialDifference = moves.reduce((acc, move) => {
    const lastValue = acc[acc.length - 1] || 0;
    if (move.captured) {
      const captureValue = PIECE_VALUES[move.captured as keyof typeof PIECE_VALUES];
      return [...acc, lastValue + (move.color === 'w' ? captureValue : -captureValue)];
    }
    return [...acc, lastValue];
  }, [] as number[]);

  const data = {
    labels: materialDifference.map((_, i) => i + 1),
    datasets: [
      {
        data: materialDifference,
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        borderWidth: 2,
        tension: 0.4,
        fill: true,
        pointRadius: 0,
        pointHoverRadius: 4,
        pointHoverBackgroundColor: 'rgb(59, 130, 246)',
        pointHoverBorderColor: 'white',
        pointHoverBorderWidth: 2,
      },
    ],
  };

  const options: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: true,
    interaction: {
      intersect: false,
      mode: 'index',
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        enabled: true,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: 'rgb(255, 255, 255)',
        bodyColor: 'rgb(255, 255, 255)',
        padding: 12,
        displayColors: false,
        callbacks: {
          title: (context) => `Move ${context[0].label}`,
          label: (context: TooltipItem<'line'>) => {
            const value = context.raw as number;
            return `Material difference: ${value > 0 ? '+' : ''}${value}`;
          },
        },
      },
    },
    scales: {
      x: {
        display: false,
        grid: {
          display: false,
        }
      },
      y: {
        display: false,
        grid: {
          display: false,
        },
        beginAtZero: true,
        suggestedMin: Math.min(...materialDifference, -1) - 1,
        suggestedMax: Math.max(...materialDifference, 1) + 1,
      },
    },
    elements: {
      line: {
        borderJoinStyle: 'round',
        capBezierPoints: true,
      }
    },
    layout: {
      padding: 2
    },
    animation: {
      duration: 750,
      easing: 'easeOutQuart',
    },
  };

  return (
    <div className="w-full h-full absolute inset-0">
      <Line 
        data={data} 
        options={options}
        className="[&_canvas]:!h-full [&_canvas]:!w-full"
      />
    </div>
  );
};
