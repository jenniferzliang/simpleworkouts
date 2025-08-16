import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/index.ts';
import { AnalyticsData, WeeklyTonnage } from '../types/index.ts';

const Analytics: React.FC = () => {
  const [timeRange, setTimeRange] = useState('12w');

  // Fetch analytics data
  const { 
    data: analyticsData, 
    isLoading, 
    error 
  } = useQuery({
    queryKey: ['analytics', 'weekly-tonnage', timeRange],
    queryFn: () => api.getWeeklyTonnage({ range: timeRange }),
  });

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="text-center">Loading analytics...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="text-center text-red-600">
          Failed to load analytics: {error.message}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900">
              Analytics
            </h1>
            
            {/* Time Range Selector */}
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="4w">4 weeks</option>
              <option value="8w">8 weeks</option>
              <option value="12w">12 weeks</option>
              <option value="24w">24 weeks</option>
            </select>
          </div>

          {analyticsData && (
            <>
              {/* Summary Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <StatCard
                  title="Total Sessions"
                  value={analyticsData.summary.totalSessions}
                  subtitle={`${analyticsData.range.weeks} weeks`}
                />
                <StatCard
                  title="Total Tonnage"
                  value={`${analyticsData.summary.totalTonnage.toFixed(1)} lbs`}
                  subtitle="All time"
                />
                <StatCard
                  title="Avg Weekly Tonnage"
                  value={`${analyticsData.summary.avgWeeklyTonnage.toFixed(1)} lbs`}
                  subtitle="Per week"
                />
              </div>

              {/* Weekly Tonnage Chart */}
              <div className="mb-8">
                <h2 className="text-lg font-medium text-gray-900 mb-4">
                  Weekly Tonnage Trend
                </h2>
                <WeeklyTonnageChart data={analyticsData.data} />
              </div>

              {/* Weekly Data Table */}
              <div>
                <h2 className="text-lg font-medium text-gray-900 mb-4">
                  Weekly Breakdown
                </h2>
                <WeeklyDataTable data={analyticsData.data} />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

const StatCard: React.FC<{
  title: string;
  value: string | number;
  subtitle: string;
}> = ({ title, value, subtitle }) => {
  return (
    <div className="bg-gray-50 rounded-lg p-4">
      <h3 className="text-sm font-medium text-gray-600 mb-1">{title}</h3>
      <div className="text-2xl font-bold text-gray-900 mb-1">{value}</div>
      <p className="text-sm text-gray-500">{subtitle}</p>
    </div>
  );
};

const WeeklyTonnageChart: React.FC<{ data: WeeklyTonnage[] }> = ({ data }) => {
  if (data.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No data available for chart
      </div>
    );
  }

  // Find max tonnage for scaling
  const maxTonnage = Math.max(...data.map(d => d.tonnage));
  const chartHeight = 200;

  return (
    <div className="bg-gray-50 rounded-lg p-4">
      <div className="relative" style={{ height: chartHeight + 40 }}>
        {/* Y-axis labels */}
        <div className="absolute left-0 top-0 h-full flex flex-col justify-between text-xs text-gray-500">
          <span>{maxTonnage.toFixed(0)}</span>
          <span>{(maxTonnage / 2).toFixed(0)}</span>
          <span>0</span>
        </div>

        {/* Chart area */}
        <div className="ml-12 h-full">
          <div className="flex items-end justify-between h-full border-b border-l border-gray-300">
            {data.map((week, index) => {
              const barHeight = maxTonnage > 0 ? (week.tonnage / maxTonnage) * chartHeight : 0;
              
              return (
                <div key={index} className="flex flex-col items-center flex-1 mx-1">
                  {/* Bar */}
                  <div className="w-full flex justify-center">
                    <div
                      className="bg-blue-500 rounded-t w-8 transition-all hover:bg-blue-600"
                      style={{ height: barHeight }}
                      title={`Week ${index + 1}: ${week.tonnage.toFixed(1)} lbs`}
                    />
                  </div>
                  
                  {/* X-axis label */}
                  <div className="text-xs text-gray-500 mt-2 text-center">
                    {new Date(week.weekStart).toLocaleDateString('en-US', { 
                      month: 'short', 
                      day: 'numeric' 
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

const WeeklyDataTable: React.FC<{ data: WeeklyTonnage[] }> = ({ data }) => {
  if (data.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No weekly data available
      </div>
    );
  }

  const formatDateRange = (weekStart: string, weekEnd: string) => {
    const start = new Date(weekStart);
    const end = new Date(weekEnd);
    
    return `${start.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    })} - ${end.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    })}`;
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Week
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Sessions
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Tonnage
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Sets
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Reps
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              BW Reps
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {data.slice().reverse().map((week, index) => (
            <tr key={index} className="hover:bg-gray-50">
              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                {formatDateRange(week.weekStart, week.weekEnd)}
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                {week.sessions}
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 font-medium">
                {week.tonnage.toFixed(1)} lbs
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                {week.sets}
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                {week.reps}
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                {week.bwReps}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default Analytics;