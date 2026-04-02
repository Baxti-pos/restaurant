import React, { useEffect, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Download,
  Building2,
  Users,
  ShoppingBag,
  Receipt,
  LogOut,
  ChevronDown,
  User,
  Utensils,
  UtensilsCrossed,
  Package,
  Boxes,
  MoreHorizontal,
  BarChart3 } from
'lucide-react';
import { Branch, User as UserType } from '../../lib/types';
import { clsx } from 'clsx';
import { hasAnyPermission, hasPermission } from '../../lib/permissions';
import { usePwaInstall } from '../../lib/pwa';
import { toast } from '../ui/Toast';
import { onRealtimeEvent } from '../../lib/socket';
import { playRealtimeSound, unlockRealtimeSound } from '../../lib/realtimeSound';

interface OwnerLayoutProps {
  children: React.ReactNode;
  currentBranch?: Branch;
  branches: Branch[];
  onBranchChange: (branchId: string) => void;
  user?: UserType;
  onLogout: () => void;
}

const navItems = [
  { id: 'dashboard', label: 'Bosh sahifa', icon: LayoutDashboard, path: '/dashboard' },
  { id: 'tables', label: 'Stollar', icon: UtensilsCrossed, path: '/tables' },
  { id: 'orders', label: 'Buyurtmalar', icon: ShoppingBag, path: '/orders' },
  { id: 'products', label: 'Mahsulotlar', icon: Package, path: '/products' },
  { id: 'inventory', label: 'Inventar', icon: Boxes, path: '/inventory' },
  { id: 'product-analytics', label: 'Analitika', icon: BarChart3, path: '/product-analytics' },
  { id: 'expenses', label: 'Xarajatlar', icon: Receipt, path: '/expenses' },
  { id: 'waiters', label: 'Girgittonlar', icon: Users, path: '/waiters' },
  { id: 'managers', label: 'Menejerlar', icon: User, path: '/managers' },
  { id: 'branches', label: 'Filiallar', icon: Building2, path: '/branches' },
];

const mobileTabs = [
  { id: 'dashboard', label: 'Bosh sahifa', icon: LayoutDashboard, path: '/dashboard' },
  { id: 'tables', label: 'Stollar', icon: UtensilsCrossed, path: '/tables' },
  { id: 'orders', label: 'Sotuvlar', icon: ShoppingBag, path: '/orders' },
  { id: 'products', label: 'Mahsulotlar', icon: Package, path: '/products' },
  { id: 'expenses', label: 'Xarajatlar', icon: Receipt, path: '/expenses' },
];

export function OwnerLayout({
  children,
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
  const location = useLocation();
  const navigate = useNavigate();
  const isWaiter = user?.role === 'waiter';
  const { canInstall, isStandalone, install, isIos } = usePwaInstall();
  const showInstallAction = isWaiter && !isStandalone && (canInstall || isIos);

  useEffect(() => {
    if (isWaiter && isStandalone) {
      document.body.classList.add('waiter-standalone');
      return () => {
        document.body.classList.remove('waiter-standalone');
      };
    }
    document.body.classList.remove('waiter-standalone');
  }, [isStandalone, isWaiter]);

  useEffect(() => {
    const activate = () => {
      void unlockRealtimeSound();
    };

    window.addEventListener('pointerdown', activate, { passive: true });
    window.addEventListener('keydown', activate);

    return () => {
      window.removeEventListener('pointerdown', activate);
      window.removeEventListener('keydown', activate);
    };
  }, []);

  useEffect(() => {
    const unsubscribe = onRealtimeEvent(({ event, payload }) => {
      if (event !== 'qr.order.created' && event !== 'service.request.created') {
        return;
      }

      if (
        payload &&
        typeof payload === 'object' &&
        'branchId' in payload &&
        currentBranch?.id &&
        (payload as { branchId?: string }).branchId !== currentBranch.id
      ) {
        return;
      }

      void playRealtimeSound(event === 'service.request.created' ? 'service-call' : 'qr-order');
    });

    return unsubscribe;
  }, [currentBranch?.id]);

  const handleLogout = () => {
    onLogout();
    setProfileDropdown(false);
    setMobileMenuOpen(false);
  };

  const handleMobileNavigate = (path: string) => {
    navigate(path);
    setMobileMenuOpen(false);
  };

  const handleInstall = async () => {
    if (isIos && !canInstall) {
      toast.info("iPhone: Safari'da Share -> Add to Home Screen orqali o'rnating");
      setMobileMenuOpen(false);
      return;
    }
    await install();
    setMobileMenuOpen(false);
  };

  const canSwitchBranch = user?.role === 'owner' || user?.role === 'manager';

  const canAccessPage = (pageId: string) => {
    if (!user) return false;
    if (user.role === 'owner') return true;
    if (user.role === 'waiter') {
      return pageId === 'tables' || pageId === 'orders' || pageId === 'profile';
    }
    if (user.role !== 'manager') return false;

    if (pageId === 'dashboard') return hasPermission(user, 'DASHBOARD_VIEW');
    if (pageId === 'tables') return hasAnyPermission(user, ['TABLES_VIEW', 'TABLES_MANAGE']);
    if (pageId === 'orders') return hasAnyPermission(user, ['ORDERS_VIEW', 'REPORTS_VIEW']);
    if (pageId === 'products' || pageId === 'product-analytics') return hasPermission(user, 'PRODUCTS_VIEW');
    if (pageId === 'inventory') return hasAnyPermission(user, ['INVENTORY_VIEW', 'INVENTORY_MANAGE']);
    if (pageId === 'expenses') return hasPermission(user, 'EXPENSES_VIEW');
    if (pageId === 'waiters') return hasPermission(user, 'WAITERS_VIEW');
    if (pageId === 'profile') return true;
    return false;
  };

  const filteredNavItems = navItems.filter((item) => canAccessPage(item.id));
  const filteredMobileTabs = mobileTabs.filter((item) => canAccessPage(item.id));
  
  const activeNavItem = navItems.find((item) => item.path === location.pathname);
  const pageTitle = activeNavItem?.label || (location.pathname === '/profile' ? 'Profil' : 'Baxti POS');

  return (
    <div className={clsx(
      'bg-slate-50 flex',
      isWaiter ? 'h-[100dvh] flex-col overflow-hidden' : 'h-[100dvh] flex-col lg:flex-row overflow-hidden'
    )}>

      {!isWaiter && sidebarOpen && (
        <div className="fixed inset-0 bg-slate-900/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {!isWaiter && (
        <aside className={clsx(
          'fixed inset-y-0 left-0 z-50 w-60 bg-slate-900 flex-col transition-transform duration-200 lg:translate-x-0 hidden lg:flex',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}>
          <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="h-8 w-8 bg-indigo-600 rounded-lg flex items-center justify-center">
                <Utensils className="h-4.5 w-4.5 text-white" />
              </div>
              <span className="text-white font-semibold text-base tracking-tight">Baxti POS</span>
            </div>
          </div>

          <nav className="flex-1 px-2.5 py-3 space-y-1 overflow-y-auto">
            {filteredNavItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.id}
                  to={item.path}
                  onClick={() => setSidebarOpen(false)}
                  className={({ isActive }) => clsx(
                    'w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-colors',
                    isActive ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                  )}
                >
                  <Icon className="h-4 w-4 flex-shrink-0" size={16} />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>

          <div className="px-2.5 py-3 border-t border-slate-800">
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-slate-500 hover:bg-red-50 hover:text-red-600 transition-all text-[13px] font-medium group"
            >
              <LogOut className="h-4 w-4" />
              <span>Chiqish</span>
            </button>
          </div>
        </aside>
      )}

      <div className={clsx(
        'flex-1 flex flex-col min-w-0',
        isWaiter ? 'pb-[calc(4.375rem+env(safe-area-inset-bottom))] h-[100dvh]' : 'lg:ml-60 h-full overflow-hidden'
      )}>
        {!isWaiter && (
          <header className="hidden lg:flex bg-white border-b border-slate-200 sticky top-0 z-30 h-14 items-center px-5 justify-between">
            <div className="flex items-center space-x-3">
              <div className="relative">
                <button
                  onClick={() => {
                    if (!canSwitchBranch) return;
                    setBranchDropdown(!branchDropdown);
                    setProfileDropdown(false);
                  }}
                  className={clsx(
                    "flex items-center space-x-2 px-2.5 py-1.5 rounded-lg transition-colors",
                    canSwitchBranch ? "hover:bg-slate-50" : "cursor-default"
                  )}
                >
                  <div className="h-2 w-2 rounded-full bg-emerald-500 flex-shrink-0" />
                  <span className="text-sm font-medium text-slate-700 hidden sm:block">Faol filial:</span>
                  <span className="text-sm font-semibold text-slate-900 max-w-[128px] truncate">
                    {currentBranch?.name || 'Filial tanlanmagan'}
                  </span>
                  {canSwitchBranch && <ChevronDown className="h-4 w-4 text-slate-400 flex-shrink-0" />}
                </button>

                {canSwitchBranch && branchDropdown && (
                  <div className="absolute top-full left-0 mt-1 w-60 bg-white rounded-xl shadow-lg border border-slate-200 py-1 z-50">
                    <p className="px-4 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">Filialni almashtirish</p>
                    {branches.map((b) => (
                      <button
                        key={b.id}
                        onClick={() => {
                          onBranchChange(b.id);
                          setBranchDropdown(false);
                        }}
                        className={clsx(
                          'w-full text-left px-4 py-2 text-sm hover:bg-slate-50 flex items-center space-x-2',
                          currentBranch?.id === b.id ? 'text-indigo-600 font-medium' : 'text-slate-700'
                        )}
                      >
                        {currentBranch?.id === b.id && <div className="h-1.5 w-1.5 rounded-full bg-indigo-600 flex-shrink-0" />}
                        <span>{b.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="relative">
              <button
                onClick={() => {
                  setProfileDropdown(!profileDropdown);
                  setBranchDropdown(false);
                }}
                className="flex items-center space-x-2 px-2.5 py-1.5 rounded-lg hover:bg-slate-50 transition-colors"
              >
                <div className="h-7 w-7 rounded-full bg-indigo-100 flex items-center justify-center">
                  <User className="h-3.5 w-3.5 text-indigo-600" />
                </div>
                <span className="text-sm font-medium text-slate-700 hidden sm:block">{user?.name || 'Admin'}</span>
                <ChevronDown className="h-4 w-4 text-slate-400" />
              </button>

              {profileDropdown && (
                <div className="absolute top-full right-0 mt-1 w-44 bg-white rounded-xl shadow-lg border border-slate-200 py-1 z-50">
                  <div className="px-4 py-2.5 border-b border-slate-100">
                    <p className="text-sm font-semibold text-slate-900">{user?.name}</p>
                    <p className="text-xs text-slate-500">Boshqaruvchi</p>
                  </div>
                  <button
                    onClick={() => { navigate('/profile'); setProfileDropdown(false); }}
                    className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center space-x-2"
                  >
                    <User className="h-4 w-4" />
                    <span>Profil</span>
                  </button>
                  <button
                    onClick={() => { onLogout(); setProfileDropdown(false); }}
                    className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center space-x-2"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Chiqish</span>
                  </button>
                </div>
              )}
            </div>
          </header>
        )}

        <header className={clsx(
          'lg:hidden bg-white border-b border-slate-200 sticky top-0 z-30 px-4 pt-[max(0.625rem,env(safe-area-inset-top))] pb-2.5',
          isWaiter && 'shadow-sm'
        )}>
          <div className="flex justify-between items-center mb-1.5">
            <h1 className="text-base font-semibold text-slate-900">{pageTitle}</h1>
            <div className="relative">
              <button onClick={() => setProfileDropdown(!profileDropdown)} className="h-7 w-7 rounded-full bg-indigo-100 flex items-center justify-center">
                <User className="h-3.5 w-3.5 text-indigo-600" />
              </button>
              {profileDropdown && (
                <div className="absolute top-full right-0 mt-1 w-44 bg-white rounded-xl shadow-lg border border-slate-200 py-1 z-50">
                  <div className="px-4 py-2.5 border-b border-slate-100">
                    <p className="text-sm font-semibold text-slate-900">{user?.name}</p>
                    <p className="text-xs text-slate-500">{isWaiter ? 'Girgitton' : 'Boshqaruvchi'}</p>
                  </div>
                  <button
                    onClick={() => { navigate('/profile'); setProfileDropdown(false); }}
                    className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center space-x-2"
                  >
                    <User className="h-4 w-4" />
                    <span>Profil</span>
                  </button>
                  <button
                    onClick={() => { onLogout(); setProfileDropdown(false); }}
                    className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center space-x-2"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Chiqish</span>
                  </button>
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center justify-between gap-2">
            <div className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-emerald-50 text-emerald-700">
              Faol filial: {currentBranch?.name}
            </div>
            {showInstallAction && (
              <button onClick={handleInstall} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-indigo-600 text-white">
                <Download className="h-3.5 w-3.5" />
                <span>Ilovani o'rnatish</span>
              </button>
            )}
          </div>
        </header>

        {(branchDropdown || profileDropdown) && (
          <div className="fixed inset-0 z-20" onClick={() => { setBranchDropdown(false); setProfileDropdown(false); }} />
        )}

        <main className={clsx('flex-1 overflow-y-auto', isWaiter ? 'p-3' : 'p-4 sm:p-4 pb-24 lg:pb-4')}>
          <div className={clsx('w-full', !isWaiter && '[zoom:0.9]')}>{children}</div>
        </main>
      </div>

      <div className={clsx(
        'lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-50 pb-[env(safe-area-inset-bottom)]',
        isWaiter && 'shadow-[0_-8px_24px_rgba(15,23,42,0.08)]'
      )}>
        <div className="flex justify-between items-center px-1.5">
          {filteredMobileTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = location.pathname === tab.path;
            return (
              <NavLink
                key={tab.id}
                to={tab.path}
                className={clsx(
                  'flex-1 flex flex-col items-center py-1.5 gap-0.5',
                  isActive ? 'text-indigo-600' : 'text-slate-400'
                )}
              >
                <Icon className={clsx('h-5 w-5')} strokeWidth={isActive ? 2.4 : 2} />
                <span className="text-[10px] font-medium tracking-tight">{tab.label}</span>
              </NavLink>
            );
          })}
          <button
            onClick={() => setMobileMenuOpen(true)}
            className={clsx(
              'flex-1 flex flex-col items-center py-1.5 gap-0.5',
              mobileMenuOpen ? 'text-indigo-600' : 'text-slate-400'
            )}
          >
            <MoreHorizontal className="h-5 w-5" />
            <span className="text-[10px] font-medium tracking-tight">Ko'proq</span>
          </button>
        </div>
      </div>

      {mobileMenuOpen && (
        <>
          <div className="fixed inset-0 bg-slate-900/50 z-50 lg:hidden" onClick={() => setMobileMenuOpen(false)} />
          <div className="fixed bottom-0 left-0 right-0 bg-white rounded-t-2xl z-50 lg:hidden pb-[env(safe-area-inset-bottom)] animate-in slide-in-from-bottom duration-200">
            <div className="p-4 space-y-1">
              <div className="w-12 h-1 bg-slate-200 rounded-full mx-auto mb-4" />
              {canAccessPage('inventory') && (
                <button
                  onClick={() => handleMobileNavigate('/inventory')}
                  className={clsx(
                    'w-full flex items-center space-x-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors',
                    location.pathname === '/inventory' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-700 hover:bg-slate-50'
                  )}
                >
                  <Boxes className='h-4.5 w-4.5' />
                  <span>Inventar</span>
                </button>
              )}
              {canAccessPage('waiters') && (
                <button
                  onClick={() => handleMobileNavigate('/waiters')}
                  className={clsx(
                    'w-full flex items-center space-x-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors',
                    location.pathname === '/waiters' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-700 hover:bg-slate-50'
                  )}
                >
                  <Users className="h-4.5 w-4.5" />
                  <span>Girgittonlar</span>
                </button>
              )}
              {user?.role === 'owner' && (
                <button
                  onClick={() => handleMobileNavigate('/managers')}
                  className={clsx(
                    'w-full flex items-center space-x-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors',
                    location.pathname === '/managers' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-700 hover:bg-slate-50'
                  )}
                >
                  <User className="h-4.5 w-4.5" />
                  <span>Menejerlar</span>
                </button>
              )}
              {user?.role === 'owner' && (
                <button
                  onClick={() => handleMobileNavigate('/branches')}
                  className={clsx(
                    'w-full flex items-center space-x-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors',
                    location.pathname === '/branches' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-700 hover:bg-slate-50'
                  )}
                >
                  <Building2 className="h-4.5 w-4.5" />
                  <span>Filiallar</span>
                </button>
              )}
              <button
                onClick={() => handleMobileNavigate('/profile')}
                className={clsx(
                  'w-full flex items-center space-x-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors',
                  location.pathname === '/profile' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-700 hover:bg-slate-50'
                )}
              >
                <User className="h-4.5 w-4.5" />
                <span>Profil</span>
              </button>
              {showInstallAction && (
                <button
                  onClick={handleInstall}
                  className="w-full flex items-center space-x-3 px-4 py-2.5 rounded-xl text-sm font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 transition-colors"
                >
                  <Download className="h-4.5 w-4.5" />
                  <span>Ilovani o'rnatish</span>
                </button>
              )}
              <div className="h-px bg-slate-100 my-2" />
              <button
                onClick={handleLogout}
                className="w-full flex items-center space-x-3 px-4 py-2.5 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
              >
                <LogOut className="h-4.5 w-4.5" />
                <span>Chiqish</span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
