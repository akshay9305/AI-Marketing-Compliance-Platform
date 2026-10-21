import { useState } from 'react';
import { FileText, CheckCircle, Clock, ArrowUp } from 'lucide-react';

const Dashboard = () => {
  const [timeRange, setTimeRange] = useState('Last 30 days');

  const recentActivity = [
    {
      id: 1,
      type: 'success',
      title: 'Email template approved',
      description: 'Summer Campaign • 2 minutes ago',
      icon: CheckCircle,
      color: 'green'
    },
    {
      id: 2,
      type: 'info',
      title: 'New email template created',
      description: 'Product Launch Newsletter • 15 minutes ago',
      icon: FileText,
      color: 'blue'
    },
    {
      id: 3,
      type: 'warning',
      title: 'Review required',
      description: 'Holiday Campaign • 1 hour ago',
      icon: Clock,
      color: 'yellow'
    },
    {
      id: 4,
      type: 'success',
      title: 'Social media post validated',
      description: 'Instagram Campaign • 2 hours ago',
      icon: CheckCircle,
      color: 'purple'
    }
  ];

  const complianceStats = [
    { 
      label: 'Active Templates', 
      value: '23', 
      change: '+5%', 
      trend: 'up',
      subtitle: '+4 • 13% from last month'
    },
    { 
      label: 'Compliance Score', 
      value: '89%', 
      change: '+3%', 
      trend: 'up',
      subtitle: '+3% this week'
    },
    { 
      label: 'Pending Reviews', 
      value: '7', 
      change: '', 
      trend: 'neutral',
      subtitle: '⚠ 2 urgent'
    },
    { 
      label: 'Team Members', 
      value: '12', 
      change: '+1', 
      trend: 'up',
      subtitle: '👤 1 online now'
    }
  ];

  const monthlyData = [
    { month: 'Jan', total: 45, compliant: 38 },
    { month: 'Feb', total: 52, compliant: 45 },
    { month: 'Mar', total: 48, compliant: 42 },
    { month: 'Apr', total: 60, compliant: 58 },
    { month: 'May', total: 55, compliant: 51 },
    { month: 'Jun', total: 65, compliant: 62 }
  ];

  const complianceBreakdown = [
    { label: 'Compliant', value: 78, color: '#10b981' },
    { label: 'Minor Issues', value: 15, color: '#f59e0b' },
    { label: 'Critical Issues', value: 7, color: '#ef4444' }
  ];

  const weeklyTrend = [85, 87, 82, 91, 89, 92, 89];

  // read user info and role
  let storedUser: any = null;
  try {
    storedUser = JSON.parse(localStorage.getItem('user') || 'null');
  } catch (e) {
    storedUser = null;
  }

  const displayName = storedUser ? (storedUser.first_name ? `${storedUser.first_name} ${storedUser.last_name || ''}`.trim() : storedUser.email) : 'User';
  const displayRole = storedUser?.role || localStorage.getItem('user_role') || 'Marketing Manager';

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-6 text-white relative overflow-hidden">
        <div className="relative z-10">
          <h1 className="text-2xl font-bold mb-2">Welcome</h1>
          <h2 className="text-3xl font-bold">{displayName}</h2>
          <p className="text-blue-100 mb-4">{displayRole} • New York, USA</p>
          <button className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg text-white font-medium transition-colors">
            Create new Template
          </button>
        </div>
        <div className="absolute top-4 right-4">
          <div className="bg-white/20 p-3 rounded-lg">
            <FileText className="h-8 w-8" />
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {complianceStats.map((stat, index) => (
          <div key={index} className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-500">{stat.label}</span>
              {stat.trend === 'up' && (
                <div className="flex items-center text-green-600 text-sm">
                  <ArrowUp className="w-4 h-4" />
                </div>
              )}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-3xl font-bold text-gray-900">{stat.value}</span>
              {stat.change && (
                <span className={`text-sm font-medium ${
                  stat.trend === 'up' ? 'text-green-600' : 'text-red-600'
                }`}>
                  {stat.change}
                </span>
              )}
            </div>
            <p className="text-sm text-gray-500 mt-1">{stat.subtitle}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Compliance Overview */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Compliance Overview</h3>
            <select 
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="text-sm border border-gray-300 rounded-lg px-3 py-1"
            >
              <option>Last 30 days</option>
              <option>Last 90 days</option>
              <option>Last 6 months</option>
            </select>
          </div>
          
          {/* Donut Chart */}
          <div className="flex items-center justify-center mb-6">
            <div className="relative w-48 h-48">
              <svg className="w-48 h-48 transform -rotate-90" viewBox="0 0 100 100">
                {/* Background circle */}
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  stroke="#f3f4f6"
                  strokeWidth="8"
                  fill="none"
                />
                {/* Compliant arc */}
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  stroke="#10b981"
                  strokeWidth="8"
                  fill="none"
                  strokeDasharray={`${78 * 2.51} ${100 * 2.51}`}
                  strokeLinecap="round"
                />
                {/* Minor issues arc */}
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  stroke="#f59e0b"
                  strokeWidth="8"
                  fill="none"
                  strokeDasharray={`${15 * 2.51} ${100 * 2.51}`}
                  strokeDashoffset={`-${78 * 2.51}`}
                  strokeLinecap="round"
                />
                {/* Critical issues arc */}
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  stroke="#ef4444"
                  strokeWidth="8"
                  fill="none"
                  strokeDasharray={`${7 * 2.51} ${100 * 2.51}`}
                  strokeDashoffset={`-${(78 + 15) * 2.51}`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-3xl font-bold text-gray-900">89%</div>
                  <div className="text-sm text-gray-500">Overall Score</div>
                </div>
              </div>
            </div>
          </div>

          {/* Legend */}
          <div className="space-y-2">
            {complianceBreakdown.map((item, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: item.color }}
                  ></div>
                  <span className="text-sm text-gray-700">{item.label}</span>
                </div>
                <span className="text-sm font-medium text-gray-900">{item.value}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Recent Activity</h3>
          <div className="space-y-4">
            {recentActivity.map((activity) => {
              const IconComponent = activity.icon;
              return (
                <div key={activity.id} className="flex items-start space-x-3">
                  <div className={`p-2 rounded-lg ${
                    activity.color === 'green' ? 'bg-green-100' :
                    activity.color === 'blue' ? 'bg-blue-100' :
                    activity.color === 'yellow' ? 'bg-yellow-100' :
                    'bg-purple-100'
                  }`}>
                    <IconComponent className={`w-4 h-4 ${
                      activity.color === 'green' ? 'text-green-600' :
                      activity.color === 'blue' ? 'text-blue-600' :
                      activity.color === 'yellow' ? 'text-yellow-600' :
                      'text-purple-600'
                    }`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{activity.title}</p>
                    <p className="text-xs text-gray-500">{activity.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Performance */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Monthly Performance</h3>
          <div className="space-y-4">
            <div className="flex justify-end space-x-4 text-sm">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-blue-500 rounded"></div>
                <span className="text-gray-600">Total Templates</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-green-500 rounded"></div>
                <span className="text-gray-600">Compliant</span>
              </div>
            </div>
            <div className="h-64 flex items-end justify-between space-x-2">
              {monthlyData.map((data, index) => (
                <div key={index} className="flex flex-col items-center flex-1">
                  <div className="w-full flex flex-col items-center space-y-1 mb-2">
                    <div 
                      className="w-8 bg-blue-500 rounded-t"
                      style={{ height: `${(data.total / 70) * 200}px` }}
                    ></div>
                    <div 
                      className="w-8 bg-green-500 rounded-t"
                      style={{ height: `${(data.compliant / 70) * 200}px` }}
                    ></div>
                  </div>
                  <span className="text-xs text-gray-500">{data.month}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Compliance Score Trend */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Compliance Score Trend</h3>
          <div className="space-y-4">
            <div className="h-64 relative">
              <svg className="w-full h-full" viewBox="0 0 400 200">
                {/* Grid lines */}
                {[0, 1, 2, 3, 4].map(i => (
                  <line
                    key={i}
                    x1="0"
                    y1={40 * i}
                    x2="400"
                    y2={40 * i}
                    stroke="#f3f4f6"
                    strokeWidth="1"
                  />
                ))}
                
                {/* Trend line */}
                <polyline
                  fill="none"
                  stroke="#8b5cf6"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  points={weeklyTrend.map((value, index) => 
                    `${(index * 400) / (weeklyTrend.length - 1)},${200 - ((value - 80) / 20) * 200}`
                  ).join(' ')}
                />
                
                {/* Data points */}
                {weeklyTrend.map((value, index) => (
                  <circle
                    key={index}
                    cx={(index * 400) / (weeklyTrend.length - 1)}
                    cy={200 - ((value - 80) / 20) * 200}
                    r="4"
                    fill="#8b5cf6"
                  />
                ))}
              </svg>
              
              {/* Y-axis labels */}
              <div className="absolute left-0 top-0 h-full flex flex-col justify-between text-xs text-gray-500 -ml-8">
                <span>95</span>
                <span>90</span>
                <span>85</span>
                <span>80</span>
              </div>
              
              {/* X-axis labels */}
              <div className="flex justify-between text-xs text-gray-500 mt-2">
                <span>Mon</span>
                <span>Tue</span>
                <span>Wed</span>
                <span>Thu</span>
                <span>Fri</span>
                <span>Sat</span>
                <span>Sun</span>
              </div>
            </div>
            
            <div className="text-center">
              <div className="text-3xl font-bold text-gray-900">89%</div>
              <div className="text-sm text-gray-500">Average over this week</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;