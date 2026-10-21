import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  FileText, 
  Upload,
  MessageSquare,
  Shield, 
  Settings,
  Menu,
  ChevronLeft
} from 'lucide-react';

interface SidebarProps {
  isCollapsed: boolean;
  onToggle: (collapsed: boolean) => void;
}

const Sidebar = ({ isCollapsed, onToggle }: SidebarProps) => {
  const location = useLocation();
  const [activeItem, setActiveItem] = useState(location.pathname);

  const menuItems = [
    { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', isActive: true },
    { path: '/template-upload', icon: Upload, label: 'Upload Template' },
    { path: '/templates', icon: FileText, label: 'Templates' },
    { path: '/social-media', icon: MessageSquare, label: 'Social Media' },
    { path: '/compliance', icon: Shield, label: 'Compliance' },
  ];

  // If user is a Developer, show a simplified developer menu
  const userRole = typeof window !== 'undefined' ? localStorage.getItem('user_role') : null;
  const developerMenu = [
    { path: '/dev/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/dev/templates', icon: FileText, label: 'Templates' },
    { path: '/dev/validation', icon: Shield, label: 'Validation' },
    { path: '/dev/migration', icon: Upload, label: 'Template Migration' },
    { path: '/dev/compliance', icon: Shield, label: 'Compliance' },
    { path: '/dev/settings', icon: Settings, label: 'Settings' },
  ];

  const finalMenu = userRole === 'Developer' ? developerMenu : menuItems;

  const handleLogoClick = () => {
    // Check if user is logged in
    const token = localStorage.getItem('access_token');
    if (token) {
      // If logged in, navigate to dashboard
      window.location.href = '/dashboard';
    } else {
      // If not logged in, navigate to homepage
      window.location.href = '/';
    }
  };

  return (
    <div className={`fixed left-0 top-0 h-full bg-white shadow-medium border-r border-gray-100 transition-all duration-300 ${isCollapsed ? 'w-16' : 'w-64'}`}>
      <div className="p-6">
        <div className="flex items-center justify-between">
          <button
            onClick={handleLogoClick}
            className={`flex items-center space-x-3 hover:opacity-80 transition-opacity ${isCollapsed ? 'justify-center' : ''}`}
          >
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">C</span>
            </div>
            {!isCollapsed && (
              <span className="text-xl font-semibold text-gray-800">CreatiVal AI</span>
            )}
          </button>
          <button
            onClick={() => onToggle(!isCollapsed)}
            className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
          >
            {isCollapsed ? <Menu size={18} /> : <ChevronLeft size={18} />}
          </button>
        </div>
      </div>
      
      <nav className="px-4 space-y-1">
        {finalMenu.map((item) => {
          const Icon = item.icon;
          const isActive = activeItem === item.path;
          
          return (
            <a
              key={item.path}
              href={item.path}
              className={`sidebar-item ${isActive ? 'active' : ''} ${isCollapsed ? 'justify-center' : ''}`}
              onClick={() => setActiveItem(item.path)}
              title={isCollapsed ? item.label : ''}
            >
              <Icon size={20} className={isCollapsed ? '' : 'mr-3'} />
              {!isCollapsed && <span>{item.label}</span>}
            </a>
          );
        })}
      </nav>

      {!isCollapsed && (
        <div className="absolute bottom-6 left-4 right-4">
          <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg p-4 text-white">
            <h4 className="font-medium text-sm">Upgrade to Pro</h4>
            <p className="text-xs opacity-90 mt-1">Get advanced compliance features</p>
            <button className="mt-3 bg-white/20 hover:bg-white/30 text-white text-xs font-medium py-2 px-3 rounded-md transition-colors">
              Learn More
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Sidebar;