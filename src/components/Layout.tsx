import { useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Calculator, Receipt, Building2, CalendarDays,
  Package, ListTodo, Bell, Menu, X, User, Settings, GitBranch
} from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { useEffect } from 'react';

const navigation = [
  { name: '仪表盘', path: '/dashboard', icon: LayoutDashboard },
  {
    name: '分时段计费', children: [
      { name: '计费规则', path: '/billing/rules', icon: Settings },
      { name: '费率表', path: '/billing/rates', icon: Calculator },
      { name: '计费计算器', path: '/billing/calculator', icon: Calculator },
    ]
  },
  {
    name: '脚手架管理', children: [
      { name: '脚手架列表', path: '/scaffold/list', icon: Building2 },
      { name: '排期日历', path: '/scaffold/schedule', icon: CalendarDays },
      { name: '库存盘点', path: '/scaffold/inventory', icon: Package },
      { name: '出入库追踪', path: '/scaffold/inventory-tracking', icon: GitBranch },
    ]
  },
  { name: '账单管理', path: '/bills/list', icon: Receipt },
  {
    name: '候补补位', children: [
      { name: '候补队列', path: '/waitlist/queue', icon: ListTodo },
      { name: '补位通知', path: '/waitlist/notifications', icon: Bell },
    ]
  },
];

function Sidebar({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  const location = useLocation();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const toggleGroup = (name: string) => {
    setExpanded(prev => ({ ...prev, [name]: !prev[name] }));
  };

  return (
    <aside className={`fixed left-0 top-0 h-screen bg-steel-900 text-white transition-all duration-300 z-40 ${collapsed ? 'w-16' : 'w-64'}`}>
      <div className="h-16 flex items-center justify-between px-4 border-b-2 border-steel-700">
        {!collapsed && (
          <h1 className="font-display font-bold text-xl tracking-wider text-industrial-peak">
            SCAFFOLD<span className="text-white">RENT</span>
          </h1>
        )}
        <button onClick={onToggle} className="p-2 hover:bg-steel-800 rounded transition-colors">
          {collapsed ? <Menu size={20} /> : <X size={20} />}
        </button>
      </div>

      <nav className="py-4 overflow-y-auto h-[calc(100vh-4rem)] scrollbar-industrial">
        {navigation.map((item, idx) => {
          if ('children' in item) {
            const isActive = item.children.some(c => location.pathname.startsWith(c.path));
            const isExpanded = expanded[item.name] ?? isActive;
            const GroupIcon = item.children[0].icon;
            return (
              <div key={idx}>
                <button
                  onClick={() => toggleGroup(item.name)}
                  className={`w-full flex items-center gap-3 px-4 py-3 font-display font-semibold uppercase tracking-wider text-sm transition-colors ${
                    isActive ? 'bg-steel-800 text-white border-l-4 border-industrial-peak' : 'text-steel-300 hover:bg-steel-800 hover:text-white border-l-4 border-transparent'
                  }`}
                >
                  <GroupIcon size={18} className="shrink-0" />
                  {!collapsed && <span className="flex-1 text-left">{item.name}</span>}
                </button>
                {!collapsed && isExpanded && (
                  <div className="bg-steel-950">
                    {item.children.map(child => (
                      <NavLink
                        key={child.path}
                        to={child.path}
                        className={({ isActive }) =>
                          `flex items-center gap-3 pl-12 pr-4 py-2.5 font-mono text-sm transition-colors ${
                            isActive ? 'text-industrial-peak bg-steel-800/50' : 'text-steel-400 hover:text-white hover:bg-steel-800/30'
                          }`
                        }
                      >
                        <span className="w-1 h-1 bg-current rounded-full" />
                        {child.name}
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
            );
          }
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                isActive ? 'sidebar-link-active' : 'sidebar-link'
              }
            >
              <item.icon size={18} className="shrink-0" />
              {!collapsed && <span>{item.name}</span>}
            </NavLink>
          );
        })}
      </nav>
    </aside>
  );
}

function Header() {
  const waitlist = useAppStore(s => s.waitlist);
  const notifications = useAppStore(s => s.notifications);
  const pendingWaitlist = waitlist.filter(w => w.status === 'waiting').length;

  return (
    <header className="h-16 bg-white border-b-2 border-steel-900 flex items-center justify-between px-6 sticky top-0 z-30">
      <div className="flex items-center gap-4">
        <h2 className="font-display font-bold text-lg uppercase tracking-wider text-steel-900">
          脚手架周转租赁管理系统
        </h2>
      </div>
      <div className="flex items-center gap-4">
        <div className="relative">
          <button className="p-2 hover:bg-steel-100 rounded transition-colors relative">
            <Bell size={20} className="text-steel-700" />
            {pendingWaitlist > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-industrial-danger text-white text-xs font-bold rounded-full flex items-center justify-center border-2 border-white">
                {pendingWaitlist}
              </span>
            )}
          </button>
        </div>
        <div className="h-8 w-px bg-steel-300" />
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-steel-800 rounded flex items-center justify-center text-white">
            <User size={18} />
          </div>
          <div className="hidden md:block">
            <div className="font-display font-semibold text-sm text-steel-900">系统管理员</div>
            <div className="font-mono text-xs text-steel-500">admin@scaffold.com</div>
          </div>
        </div>
      </div>
    </header>
  );
}

export default function Layout() {
  const [collapsed, setCollapsed] = useState(false);
  const initStore = useAppStore(s => s.initStore);
  const processAutoRelease = useAppStore(s => s.processAutoRelease);

  useEffect(() => {
    initStore();
    const interval = setInterval(() => {
      processAutoRelease();
    }, 60000);
    return () => clearInterval(interval);
  }, [initStore, processAutoRelease]);

  return (
    <div className="min-h-screen bg-steel-50">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(c => !c)} />
      <div className={`transition-all duration-300 ${collapsed ? 'ml-16' : 'ml-64'}`}>
        <Header />
        <main className="p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
