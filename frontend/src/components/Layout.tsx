import { Outlet, NavLink } from 'react-router-dom';

const navigation = [
  { name: 'Dashboard', href: '/' },
  { name: 'RFPs', href: '/rfps' },
  { name: 'Vendors', href: '/vendors' },
];

export default function Layout() {
  return (
    <div className="min-h-screen bg-violet-50">
      {/* Header */}
      <header className="bg-white border-b border-violet-100 shadow-sm sticky top-0 z-50 backdrop-blur-sm bg-white/95">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-lg font-semibold text-violet-950 tracking-tight">RFP Manager</h1>
            </div>
            <nav className="flex space-x-1">
              {navigation.map((item) => (
                <NavLink
                  key={item.name}
                  to={item.href}
                  className={({ isActive }) =>
                    `px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                      isActive
                        ? 'bg-violet-950 text-white shadow-sm'
                        : 'text-violet-700 hover:text-violet-950 hover:bg-violet-50'
                    }`
                  }
                >
                  {item.name}
                </NavLink>
              ))}
            </nav>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-6 lg:px-8 py-10">
        <Outlet />
      </main>
    </div>
  );
}
