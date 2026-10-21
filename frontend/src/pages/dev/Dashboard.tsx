import { useState } from 'react';
import {
  CheckCircle,
  ArrowUp,
  Database,
  FileText,
  AlertTriangle,
  RefreshCw,
  Layers,
  Zap
} from 'lucide-react';

const DevDashboard = () => {
  const [timeRange, setTimeRange] = useState('Last 30 days');

  const recentActivity = [
    {
      id: 1,
      type: 'success',
      title: 'Template migration completed',
      description: 'Expedia campaign template • Module validation passed',
      icon: CheckCircle,
      color: 'green'
    },
    {
      id: 2,
      type: 'info',
      title: 'Module attributes validated',
      description: 'Header module • 12 attributes checked',
      icon: Layers,
      color: 'blue'
    },
    {
      id: 3,
      type: 'warning',
      title: 'Downstream validation failed',
      description: 'Footer module • 3 attribute conflicts',
      icon: AlertTriangle,
      color: 'yellow'
    },
    {
      id: 4,
      type: 'success',
      title: 'Template schema updated',
      description: 'Version 2.1 deployed • Backward compatible',
      icon: Database,
      color: 'purple'
    }
  ];

  const devStats = [
    {
      label: 'Templates Migrated',
      value: '47',
      change: '+12',
      trend: 'up',
      subtitle: '+8 this week • 94% success rate'
    },
    {
      label: 'Module Validations',
      value: '156',
      change: '+23',
      trend: 'up',
      subtitle: '98% pass rate • 2% conflicts'
    },
    {
      label: 'Attribute Checks',
      value: '2.3K',
      change: '+340',
      trend: 'up',
      subtitle: 'Downstream validation active'
    },
    {
      label: 'Active Migrations',
      value: '8',
      change: '',
      trend: 'neutral',
      subtitle: '3 pending • 5 in progress'
    }
  ];

  const migrationStatus = [
    { name: 'Expedia Campaign', status: 'completed', modules: 12, progress: 100, color: '#10b981' },
    { name: 'Holiday Templates', status: 'in-progress', modules: 8, progress: 75, color: '#3b82f6' },
    { name: 'Product Launch', status: 'pending', modules: 15, progress: 0, color: '#f59e0b' },
    { name: 'Newsletter Series', status: 'completed', modules: 6, progress: 100, color: '#10b981' }
  ];

  const moduleHealth = [
    { module: 'Header', health: 'healthy', validations: 45, errors: 0, color: '#10b981' },
    { module: 'Content', health: 'warning', validations: 38, errors: 2, color: '#f59e0b' },
    { module: 'Footer', health: 'healthy', validations: 42, errors: 0, color: '#10b981' },
    { module: 'CTA', health: 'critical', validations: 29, errors: 5, color: '#ef4444' }
  ];

  const validationMetrics = [
    { metric: 'Schema Compliance', value: 96, change: '+2%', trend: 'up' },
    { metric: 'Attribute Validation', value: 89, change: '+5%', trend: 'up' },
    { metric: 'Module Compatibility', value: 94, change: '-1%', trend: 'down' },
    { metric: 'Migration Success', value: 92, change: '+3%', trend: 'up' }
  ];

  const weeklyMigrations = [12, 15, 8, 22, 18, 25, 20];

  // read user info and role
  let storedUser: any = null;
  try {
    storedUser = JSON.parse(localStorage.getItem('user') || 'null');
  } catch (e) {
    storedUser = null;
  }

  const displayName = storedUser ? (storedUser.first_name ? `${storedUser.first_name} ${storedUser.last_name || ''}`.trim() : storedUser.email) : 'Developer';
  const displayRole = storedUser?.role || localStorage.getItem('user_role') || 'Senior Developer';

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-lg p-6 text-white relative overflow-hidden">
        <div className="relative z-10">
          <h1 className="text-2xl font-bold mb-2">Developer Portal</h1>
          <h2 className="text-3xl font-bold">{displayName}</h2>
          <p className="text-indigo-100 mb-4">{displayRole} • Template Migration & Validation</p>
          <button className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg text-white font-medium transition-colors">
            Start New Migration
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
        {devStats.map((stat, index) => (
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
        {/* Migration Status */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Migration Status</h3>
            <div className="flex items-center space-x-2">
              <RefreshCw className="w-4 h-4 text-blue-500" />
              <span className="text-sm text-gray-600">Auto-refreshing</span>
            </div>
          </div>

          <div className="space-y-4">
            {migrationStatus.map((migration, index) => (
              <div key={index} className="p-4 border border-gray-100 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-900">{migration.name}</span>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    migration.status === 'completed' ? 'bg-green-100 text-green-800' :
                    migration.status === 'in-progress' ? 'bg-blue-100 text-blue-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {migration.status}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm text-gray-600">
                  <span>{migration.modules} modules</span>
                  <span>{migration.progress}% complete</span>
                </div>
                <div className="mt-2 bg-gray-200 rounded-full h-2">
                  <div
                    className="h-2 rounded-full transition-all duration-300"
                    style={{
                      width: `${migration.progress}%`,
                      backgroundColor: migration.color
                    }}
                  ></div>
                </div>
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
        {/* Module Health */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Module Health</h3>
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="text-sm border border-gray-300 rounded-lg px-3 py-1"
            >
              <option>Last 24 hours</option>
              <option>Last 7 days</option>
              <option>Last 30 days</option>
            </select>
          </div>

          <div className="space-y-4">
            {moduleHealth.map((module, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: module.color }}
                  ></div>
                  <span className="text-sm font-medium text-gray-900">{module.module}</span>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium text-gray-900">
                    {module.validations} validations
                  </div>
                  <div className="text-xs text-gray-500">
                    {module.errors} errors
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Validation Metrics */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Validation Metrics</h3>
          <div className="space-y-4">
            {validationMetrics.map((metric, index) => (
              <div key={index} className="flex items-center justify-between">
                <span className="text-sm text-gray-700">{metric.metric}</span>
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium text-gray-900">{metric.value}%</span>
                  <span className={`text-xs ${
                    metric.trend === 'up' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {metric.change}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6">
            <h4 className="text-sm font-medium text-gray-900 mb-3">Migration Trend</h4>
            <div className="h-32 relative">
              <svg className="w-full h-full" viewBox="0 0 400 120">
                {/* Grid lines */}
                {[0, 1, 2].map(i => (
                  <line
                    key={i}
                    x1="0"
                    y1={30 * i}
                    x2="400"
                    y2={30 * i}
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
                  points={weeklyMigrations.map((value, index) =>
                    `${(index * 400) / (weeklyMigrations.length - 1)},${120 - ((value - 5) / 25) * 120}`
                  ).join(' ')}
                />

                {/* Data points */}
                {weeklyMigrations.map((value, index) => (
                  <circle
                    key={index}
                    cx={(index * 400) / (weeklyMigrations.length - 1)}
                    cy={120 - ((value - 5) / 25) * 120}
                    r="4"
                    fill="#8b5cf6"
                  />
                ))}
              </svg>

              {/* X-axis labels */}
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>Mon</span>
                <span>Tue</span>
                <span>Wed</span>
                <span>Thu</span>
                <span>Fri</span>
                <span>Sat</span>
                <span>Sun</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Development Tools */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">Development Tools</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center p-4 border border-gray-100 rounded-lg">
            <RefreshCw className="w-8 h-8 text-blue-500 mx-auto mb-2" />
            <h4 className="font-medium text-gray-900">Template Migration</h4>
            <p className="text-sm text-gray-500">Automated migration tools</p>
            <button className="mt-2 text-sm text-blue-600 hover:text-blue-800">Start Migration</button>
          </div>
          <div className="text-center p-4 border border-gray-100 rounded-lg">
            <Layers className="w-8 h-8 text-green-500 mx-auto mb-2" />
            <h4 className="font-medium text-gray-900">Module Validation</h4>
            <p className="text-sm text-gray-500">Schema and attribute checks</p>
            <button className="mt-2 text-sm text-blue-600 hover:text-blue-800">Validate Modules</button>
          </div>
          <div className="text-center p-4 border border-gray-100 rounded-lg">
            <Zap className="w-8 h-8 text-purple-500 mx-auto mb-2" />
            <h4 className="font-medium text-gray-900">Attribute Testing</h4>
            <p className="text-sm text-gray-500">Downstream compatibility</p>
            <button className="mt-2 text-sm text-blue-600 hover:text-blue-800">Test Attributes</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DevDashboard;