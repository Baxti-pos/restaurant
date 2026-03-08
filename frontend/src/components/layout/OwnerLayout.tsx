import React, { useState } from 'react';
import {
  LayoutDashboard,
  Building2,
  Users,
  ShoppingBag,
  Receipt,
  LogOut,
  Menu,
  X,
  ChevronDown,
  User,
  Utensils,
  UtensilsCrossed,
  Package,
  MoreHorizontal } from
'lucide-react';
import { Branch, User as UserType } from '../../lib/types';
import { clsx } from 'clsx';
import { hasAnyPermission, hasPermission } from '../../lib/permissions';
interface OwnerLayoutProps {
  children: React.ReactNode;
  currentPage: string;
  onNavigate: (page: string) => void;
  currentBranch?: Branch;
  branches: Branch[];
  onBranchChange: (branchId: string) => void;
  user?: UserType;
  onLogout: () => void;
}
const navItems = [
{
  id: 'dashboard',
  label: 'Bosh sahifa',
  icon: LayoutDashboard
},
{
  id: 'tables',
  label: 'Stollar',
  icon: UtensilsCrossed
},
{
  id: 'orders',
  label: 'Buyurtmalar',
  icon: ShoppingBag
},
{
  id: 'products',
  label: 'Mahsulotlar',
  icon: Package
},
{
  id: 'expenses',
  label: 'Xarajatlar',
  icon: Receipt
},
{
  id: 'waiters',
  label: 'Girgittonlar',
  icon: Users
},
{
  id: 'managers',
  label: 'Menejerlar',
  icon: User
},
{
  id: 'branches',
  label: 'Filiallar',
  icon: Building2
}];

// Mobile bottom tabs configuration
const mobileTabs = [
{
  id: 'dashboard',
  label: 'Bosh sahifa',
  icon: LayoutDashboard
},
{
  id: 'tables',
  label: 'Stollar',
  icon: UtensilsCrossed
},
{
  id: 'orders',
  label: 'Sotuvlar',
  icon: ShoppingBag
},
{
  id: 'products',
  label: 'Mahsulotlar',
  icon: Package
},
{
  id: 'expenses',
  label: 'Xarajatlar',
  icon: Receipt
}];

export function OwnerLayout({
  children,
  currentPage,
  onNavigate,
  currentBranch,
  branches,
  onBranchChange,
  user,
  onLogout
}: OwnerLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [branchDropdown, setBranchDropdown] = useState(false);
  const [profileDropdown, setProfileDropdown] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const handleLogout = () => {
    onLogout();
    setProfileDropdown(false);
    setMobileMenuOpen(false);
  };
  const handleMobileNavigate = (page: string) => {
    onNavigate(page);
    setMobileMenuOpen(false);
  };
  // Get current page label
  const canAccessPage = (page: string) => {
    if (!user) {
      return false;
    }

    if (user.role === 'owner') {
      return true;
    }

    if (user.role !== 'manager') {
      return false;
    }

    if (page === 'dashboard') return hasPermission(user, 'DASHBOARD_VIEW');
    if (page === 'tables') return hasPermission(user, 'TABLES_VIEW');
    if (page === 'orders') return hasAnyPermission(user, ['ORDERS_VIEW', 'REPORTS_VIEW']);
    if (page === 'products') return hasPermission(user, 'PRODUCTS_VIEW');
    if (page === 'expenses') return hasPermission(user, 'EXPENSES_VIEW');
    if (page === 'waiters') return hasPermission(user, 'WAITERS_VIEW');
    if (page === 'profile') return true;
    return false;
  };

  const filteredNavItems = navItems.filter((item) => canAccessPage(item.id));
  const filteredMobileTabs = mobileTabs.filter((item) => canAccessPage(item.id));
  const pageTitle =
  navItems.find((item) => item.id === currentPage)?.label ||
  (currentPage === 'profile' ? 'Profil' : 'Baxti POS');
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col lg:flex-row">
      {/* Mobile backdrop for sidebar (only if needed, but we removed burger) */}
      {sidebarOpen &&
      <div
        className="fixed inset-0 bg-slate-900/50 z-40 lg:hidden"
        onClick={() => setSidebarOpen(false)} />

      }

      {/* Sidebar (Desktop only) */}
      <aside
        className={clsx(
          'fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 flex-col transition-transform duration-200 lg:translate-x-0 hidden lg:flex',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}>

        {/* Logo */}
        <div className="px-6 py-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="h-9 w-9 bg-indigo-600 rounded-xl flex items-center justify-center">
              <Utensils className="h-5 w-5 text-white" />
            </div>
            <span className="text-white font-bold text-lg">Baxti POS</span>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {filteredNavItems.map((item) => {
            const Icon = item.icon;
            const active = currentPage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onNavigate(item.id);
                  setSidebarOpen(false);
                }}
                className={clsx(
                  'w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors',
                  active ?
                  'bg-indigo-600 text-white' :
                  'text-slate-400 hover:bg-slate-800 hover:text-white'
                )}>

                <Icon
                  className="h-4.5 w-4.5 flex-shrink-0"
                  style={{
                    width: 18,
                    height: 18
                  }} />

                <span>{item.label}</span>
              </button>);

          })}
        </nav>

        {/* User */}
        <div className="px-3 py-4 border-t border-slate-800">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-slate-500 hover:bg-red-50 hover:text-red-600 transition-all text-sm font-medium group">

            <LogOut className="h-4 w-4" />
            <span>Chiqish</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 lg:ml-64 pb-20 lg:pb-0">
        {/* Desktop Topbar */}
        <header className="hidden lg:flex bg-white border-b border-slate-200 sticky top-0 z-30 h-16 items-center px-6 justify-between">
          <div className="flex items-center space-x-3">
            {/* Branch switcher */}
            <div className="relative">
              <button
                onClick={() => {
                  setBranchDropdown(!branchDropdown);
                  setProfileDropdown(false);
                }}
                className="flex items-center space-x-2 px-3 py-2 rounded-xl hover:bg-slate-50 transition-colors">

                <div className="h-2 w-2 rounded-full bg-emerald-500 flex-shrink-0" />
                <span className="text-sm font-medium text-slate-700 hidden sm:block">
                  Faol filial:
                </span>
                <span className="text-sm font-semibold text-slate-900 max-w-[140px] truncate">
                  {currentBranch?.name || 'Filial tanlanmagan'}
                </span>
                <ChevronDown className="h-4 w-4 text-slate-400 flex-shrink-0" />
              </button>

              {branchDropdown &&
              <div className="absolute top-full left-0 mt-1 w-64 bg-white rounded-xl shadow-lg border border-slate-200 py-1 z-50">
                  <p className="px-4 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Filialni almashtirish
                  </p>
                  {branches.map((b) =>
                <button
                  key={b.id}
                  onClick={() => {
                    onBranchChange(b.id);
                    setBranchDropdown(false);
                  }}
                  className={clsx(
                    'w-full text-left px-4 py-2.5 text-sm hover:bg-slate-50 flex items-center space-x-2',
                    currentBranch?.id === b.id ?
                    'text-indigo-600 font-medium' :
                    'text-slate-700'
                  )}>

                      {currentBranch?.id === b.id &&
                  <div className="h-1.5 w-1.5 rounded-full bg-indigo-600 flex-shrink-0" />
                  }
                      <span>{b.name}</span>
                    </button>
                )}
                </div>
              }
            </div>
          </div>

          {/* Profile */}
          <div className="relative">
            <button
              onClick={() => {
                setProfileDropdown(!profileDropdown);
                setBranchDropdown(false);
              }}
              className="flex items-center space-x-2 px-3 py-2 rounded-xl hover:bg-slate-50 transition-colors">

              <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center">
                <User className="h-4 w-4 text-indigo-600" />
              </div>
              <span className="text-sm font-medium text-slate-700 hidden sm:block">
                {user?.name || 'Admin'}
              </span>
              <ChevronDown className="h-4 w-4 text-slate-400" />
            </button>

            {profileDropdown &&
            <div className="absolute top-full right-0 mt-1 w-48 bg-white rounded-xl shadow-lg border border-slate-200 py-1 z-50">
                <div className="px-4 py-3 border-b border-slate-100">
                  <p className="text-sm font-semibold text-slate-900">
                    {user?.name}
                  </p>
                  <p className="text-xs text-slate-500">Boshqaruvchi</p>
                </div>
                <button
                onClick={() => {
                  onNavigate('profile');
                  setProfileDropdown(false);
                }}
                className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 flex items-center space-x-2">

                  <User className="h-4 w-4" />
                  <span>Profil</span>
                </button>
                <button
                onClick={() => {
                  onLogout();
                  setProfileDropdown(false);
                }}
                className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 flex items-center space-x-2">

                  <LogOut className="h-4 w-4" />
                  <span>Chiqish</span>
                </button>
              </div>
            }
          </div>
        </header>

        {/* Mobile Header (New POS Style) */}
        <header className="lg:hidden bg-white border-b border-slate-200 sticky top-0 z-30 px-4 py-3">
          <div className="flex justify-between items-center mb-1">
            <h1 className="text-lg font-bold text-slate-900">{pageTitle}</h1>
            <div className="relative">
              <button
                onClick={() => setProfileDropdown(!profileDropdown)}
                className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center">

                <User className="h-4 w-4 text-indigo-600" />
              </button>
              {profileDropdown &&
              <div className="absolute top-full right-0 mt-1 w-48 bg-white rounded-xl shadow-lg border border-slate-200 py-1 z-50">
                  <div className="px-4 py-3 border-b border-slate-100">
                    <p className="text-sm font-semibold text-slate-900">
                      {user?.name}
                    </p>
                    <p className="text-xs text-slate-500">Boshqaruvchi</p>
                  </div>
                  <button
                  onClick={() => {
                    onNavigate('profile');
                    setProfileDropdown(false);
                  }}
                  className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 flex items-center space-x-2">

                    <User className="h-4 w-4" />
                    <span>Profil</span>
                  </button>
                  <button
                  onClick={() => {
                    onLogout();
                    setProfileDropdown(false);
                  }}
                  className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 flex items-center space-x-2">

                    <LogOut className="h-4 w-4" />
                    <span>Chiqish</span>
                  </button>
                </div>
              }
            </div>
          </div>
          <div className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-50 text-emerald-700">
            Faol filial: {currentBranch?.name}
          </div>
        </header>

        {/* Click outside to close dropdowns */}
        {(branchDropdown || profileDropdown) &&
        <div
          className="fixed inset-0 z-20"
          onClick={() => {
            setBranchDropdown(false);
            setProfileDropdown(false);
          }} />

        }

        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="max-w-7xl mx-auto">{children}</div>
        </main>
      </div>

      {/* Mobile Bottom Tab Bar */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-50 pb-[env(safe-area-inset-bottom)]">
        <div className="flex justify-between items-center px-1">
          {filteredMobileTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = currentPage === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onNavigate(tab.id)}
                className={clsx(
                  'flex-1 flex flex-col items-center py-2 gap-0.5',
                  isActive ? 'text-indigo-600' : 'text-slate-400'
                )}>

                <Icon
                  className={clsx('h-6 w-6', isActive)}
                  strokeWidth={isActive ? 2.5 : 2} />

                <span className="text-[10px] font-medium">{tab.label}</span>
              </button>);

          })}
          <button
            onClick={() => setMobileMenuOpen(true)}
            className={clsx(
              'flex-1 flex flex-col items-center py-2 gap-0.5',
              mobileMenuOpen ? 'text-indigo-600' : 'text-slate-400'
            )}>

            <MoreHorizontal className="h-6 w-6" />
            <span className="text-[10px] font-medium">Ko'proq</span>
          </button>
        </div>
      </div>

      {/* Mobile "Ko'proq" Bottom Sheet */}
      {mobileMenuOpen &&
      <>
          <div
          className="fixed inset-0 bg-slate-900/50 z-50 lg:hidden"
          onClick={() => setMobileMenuOpen(false)} />

          <div className="fixed bottom-0 left-0 right-0 bg-white rounded-t-2xl z-50 lg:hidden pb-[env(safe-area-inset-bottom)] animate-in slide-in-from-bottom duration-200">
            <div className="p-4 space-y-1">
              <div className="w-12 h-1 bg-slate-200 rounded-full mx-auto mb-4" />
              {canAccessPage('waiters') &&
              <button
                onClick={() => handleMobileNavigate('waiters')}
                className={clsx(
                  'w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors',
                  currentPage === 'waiters' ?
                  'bg-indigo-50 text-indigo-600' :
                  'text-slate-700 hover:bg-slate-50'
                )}>

                  <Users className="h-5 w-5" />
                  <span>Girgittonlar</span>
                </button>
              }
              {user?.role === 'owner' &&
              <button
                onClick={() => handleMobileNavigate('managers')}
                className={clsx(
                  'w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors',
                  currentPage === 'managers' ?
                  'bg-indigo-50 text-indigo-600' :
                  'text-slate-700 hover:bg-slate-50'
                )}>

                  <User className="h-5 w-5" />
                  <span>Menejerlar</span>
                </button>
              }
              {user?.role === 'owner' &&
              <button
                onClick={() => handleMobileNavigate('branches')}
                className={clsx(
                  'w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors',
                  currentPage === 'branches' ?
                  'bg-indigo-50 text-indigo-600' :
                  'text-slate-700 hover:bg-slate-50'
                )}>

                  <Building2 className="h-5 w-5" />
                  <span>Filiallar</span>
                </button>
              }
              <button
              onClick={() => handleMobileNavigate('profile')}
              className={clsx(
                'w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors',
                currentPage === 'profile' ?
                'bg-indigo-50 text-indigo-600' :
                'text-slate-700 hover:bg-slate-50'
              )}>

                <User className="h-5 w-5" />
                <span>Profil</span>
              </button>
              <div className="h-px bg-slate-100 my-2" />
              <button
              onClick={handleLogout}
              className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 transition-colors">

                <LogOut className="h-5 w-5" />
                <span>Chiqish</span>
              </button>
            </div>
          </div>
        </>
      }
    </div>);

}
