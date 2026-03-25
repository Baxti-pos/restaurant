import { useEffect, useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import { OwnerLayout } from './components/layout/OwnerLayout';
import { ToastProvider } from './components/ui/Toast';
import { clearAuth, getAuth, setAuth } from './lib/auth';
import { api } from './lib/api';
import { Branch, User } from './lib/types';
import { hasAnyPermission, hasPermission } from './lib/permissions';
import { connectRealtime, disconnectRealtime } from './lib/socket';
import { BranchSelectPage } from './pages/BranchSelectPage';
import { LoginPage } from './pages/LoginPage';
import { BranchesPage } from './pages/owner/BranchesPage';
import { DashboardPage } from './pages/owner/DashboardPage';
import { ExpensesPage } from './pages/owner/ExpensesPage';
import { InventoryPage } from './pages/owner/InventoryPage';
import { ManagersPage } from './pages/owner/ManagersPage';
import { OrdersPage } from './pages/owner/OrdersPage';
import { ProductAnalyticsPage } from './pages/owner/ProductAnalyticsPage';
import { ProductsPage } from './pages/owner/ProductsPage';
import { ProfilePage } from './pages/owner/ProfilePage';
import { TablesPage } from './pages/owner/TablesPage';
import { WaitersPage } from './pages/owner/WaitersPage';

const canAccessPage = (user: User | null, page: string) => {
  if (!user) return false;
  if (user.role === 'owner') return true;

  if (user.role === 'waiter') {
    return page === 'tables' || page === 'orders' || page === 'profile';
  }

  if (page === 'profile') return true;
  if (page === 'branches' || page === 'managers') return false;

  if (page === 'dashboard') return hasPermission(user, 'DASHBOARD_VIEW');
  if (page === 'tables') return hasAnyPermission(user, ['TABLES_VIEW', 'TABLES_MANAGE']);
  if (page === 'orders') return hasAnyPermission(user, ['ORDERS_VIEW', 'REPORTS_VIEW']);
  if (page === 'products' || page === 'product-analytics') return hasPermission(user, 'PRODUCTS_VIEW');
  if (page === 'inventory') return hasAnyPermission(user, ['INVENTORY_VIEW', 'INVENTORY_MANAGE']);
  if (page === 'expenses') return hasPermission(user, 'EXPENSES_VIEW');
  if (page === 'waiters') return hasPermission(user, 'WAITERS_VIEW');

  return false;
};

const resolveFallbackPage = (user: User | null): string => {
  const orderedPages: string[] = [
    'dashboard',
    'tables',
    'orders',
    'products',
    'inventory',
    'expenses',
    'waiters',
    'branches',
    'managers',
    'profile'
  ];

  for (const page of orderedPages) {
    if (canAccessPage(user, page)) return `/${page}`;
  }

  return '/profile';
};

function AppRoutes() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [activeBranchId, setActiveBranchId] = useState<string | null>(null);
  const [appReady, setAppReady] = useState(false);
  const navigate = useNavigate();

  const refreshBranches = async () => {
    const list = await api.branches.list();
    setBranches(list);
    const auth = getAuth();
    if (auth.user && auth.token) {
      setAuth({ ...auth, branches: list });
    }
    return list;
  };

  useEffect(() => {
    const bootstrap = async () => {
      const auth = getAuth();
      if (!auth.token || !auth.user) {
        setAppReady(true);
        return;
      }

      setUser(auth.user);
      setIsAuthenticated(true);

      if (auth.user.role !== 'owner') {
        const cachedBranches = Array.isArray(auth.branches) ? auth.branches : [];
        setBranches(cachedBranches);

        if (auth.activeBranchId) {
          setActiveBranchId(auth.activeBranchId);
          setAppReady(true);
          return;
        }

        if (auth.user.role === 'manager' && cachedBranches.length > 0) {
          const fallbackBranchId = cachedBranches[0].id;
          try {
            const result = await api.auth.selectBranch(fallbackBranchId);
            setAuth({
              ...auth,
              token: result.token,
              activeBranchId: fallbackBranchId,
              branches: cachedBranches
            });
            setActiveBranchId(fallbackBranchId);
            setAppReady(true);
            return;
          } catch {
            clearAuth();
            setUser(null);
            setIsAuthenticated(false);
            setAppReady(true);
            return;
          }
        }

        clearAuth();
        setUser(null);
        setIsAuthenticated(false);
        setAppReady(true);
        return;
      }

      try {
        const list = await refreshBranches();
        if (auth.activeBranchId && list.some((branch) => branch.id === auth.activeBranchId)) {
          setActiveBranchId(auth.activeBranchId);
        }
      } catch {
        clearAuth();
        setUser(null);
        setIsAuthenticated(false);
        setActiveBranchId(null);
      }

      setAppReady(true);
    };

    void bootstrap();
  }, []);

  const handleLogin = async (
    nextUser: User,
    token: string,
    branchId: string | null = null,
    branchList: Branch[] = []
  ) => {
    setUser(nextUser);
    setIsAuthenticated(true);
    setAuth({ user: nextUser, token, activeBranchId: branchId, branches: branchList });
    setActiveBranchId(branchId);
    setBranches(branchList);

    if (nextUser.role === 'owner') {
      try {
        await refreshBranches();
      } catch {}
    }

    navigate(resolveFallbackPage(nextUser));
  };

  const handleBranchSelect = async (branchId: string) => {
    try {
      const result = await api.auth.selectBranch(branchId);
      const auth = getAuth();
      setAuth({ ...auth, token: result.token, activeBranchId: branchId });
      setActiveBranchId(branchId);
    } catch {
      setActiveBranchId(null);
    }
  };

  const handleSwitchBranch = async (branchId: string) => {
    try {
      const result = await api.auth.selectBranch(branchId);
      const auth = getAuth();
      setAuth({ ...auth, token: result.token, activeBranchId: branchId });
      setActiveBranchId(branchId);
    } catch {}
  };

  const handleLogout = () => {
    disconnectRealtime();
    clearAuth();
    setUser(null);
    setIsAuthenticated(false);
    setBranches([]);
    setActiveBranchId(null);
    navigate('/');
  };

  useEffect(() => {
    if (isAuthenticated && activeBranchId) {
      connectRealtime(activeBranchId);
    } else {
      disconnectRealtime();
    }
  }, [isAuthenticated, activeBranchId]);

  const handleUserChange = (nextUser: User, nextToken?: string) => {
    const auth = getAuth();
    const resolvedToken = nextToken?.trim() || auth.token;
    if (!resolvedToken) return;

    setUser(nextUser);
    setAuth({
      user: nextUser,
      token: resolvedToken,
      activeBranchId: auth.activeBranchId,
      branches: auth.branches ?? []
    });
  };

  if (!appReady) {
    return (
      <div className='min-h-screen bg-slate-50 flex items-center justify-center'>
        <div className='text-center'>
          <div className='h-10 w-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3' />
          <p className='text-slate-500 text-sm'>Yuklanmoqda...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage onLogin={handleLogin} />;
  }

  if (!activeBranchId) {
    return (
      <BranchSelectPage
        branches={branches}
        onSelect={handleBranchSelect}
        onLogout={handleLogout}
      />
    );
  }

  const activeBranch = branches.find((branch) => branch.id === activeBranchId);
  const activeBranchName = activeBranch?.name || '';

  const ProtectedRoute = ({ children, page }: { children: React.ReactNode; page: string }) => {
    if (!canAccessPage(user, page)) {
      return <Navigate to={resolveFallbackPage(user)} replace />;
    }

    return <>{children}</>;
  };

  return (
    <OwnerLayout
      currentBranch={activeBranch}
      branches={branches}
      onBranchChange={handleSwitchBranch}
      user={user!}
      onLogout={handleLogout}
    >
      <Routes>
        <Route
          path='/dashboard'
          element={
            <ProtectedRoute page='dashboard'>
              <DashboardPage
                activeBranchId={activeBranchId}
                activeBranchName={activeBranchName}
                onNavigate={(page) => navigate(`/${page}`)}
              />
            </ProtectedRoute>
          }
        />
        <Route
          path='/branches'
          element={
            <ProtectedRoute page='branches'>
              <BranchesPage onBranchesChange={() => refreshBranches()} />
            </ProtectedRoute>
          }
        />
        <Route
          path='/waiters'
          element={
            <ProtectedRoute page='waiters'>
              <WaitersPage activeBranchId={activeBranchId} activeBranchName={activeBranchName} />
            </ProtectedRoute>
          }
        />
        <Route
          path='/managers'
          element={
            <ProtectedRoute page='managers'>
              <ManagersPage branches={branches} />
            </ProtectedRoute>
          }
        />
        <Route
          path='/tables'
          element={
            <ProtectedRoute page='tables'>
              <TablesPage activeBranchId={activeBranchId} activeBranchName={activeBranchName} />
            </ProtectedRoute>
          }
        />
        <Route
          path='/products'
          element={
            <ProtectedRoute page='products'>
              <ProductsPage activeBranchId={activeBranchId} activeBranchName={activeBranchName} />
            </ProtectedRoute>
          }
        />
        <Route
          path='/inventory'
          element={
            <ProtectedRoute page='inventory'>
              <InventoryPage activeBranchId={activeBranchId} activeBranchName={activeBranchName} />
            </ProtectedRoute>
          }
        />
        <Route
          path='/product-analytics'
          element={
            <ProtectedRoute page='product-analytics'>
              <ProductAnalyticsPage activeBranchId={activeBranchId} activeBranchName={activeBranchName} />
            </ProtectedRoute>
          }
        />
        <Route
          path='/expenses'
          element={
            <ProtectedRoute page='expenses'>
              <ExpensesPage activeBranchId={activeBranchId} activeBranchName={activeBranchName} />
            </ProtectedRoute>
          }
        />
        <Route
          path='/orders'
          element={
            <ProtectedRoute page='orders'>
              <OrdersPage activeBranchId={activeBranchId} activeBranchName={activeBranchName} />
            </ProtectedRoute>
          }
        />
        <Route path='/profile' element={<ProfilePage user={user!} onUserChange={handleUserChange} />} />
        <Route path='*' element={<Navigate to={resolveFallbackPage(user)} replace />} />
      </Routes>
    </OwnerLayout>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <ToastProvider />
      <AppRoutes />
    </BrowserRouter>
  );
}
