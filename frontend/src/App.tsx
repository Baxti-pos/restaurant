import { useEffect, useState } from 'react';
import { LoginPage } from './pages/LoginPage';
import { BranchSelectPage } from './pages/BranchSelectPage';
import { OwnerLayout } from './components/layout/OwnerLayout';
import { DashboardPage } from './pages/owner/DashboardPage';
import { BranchesPage } from './pages/owner/BranchesPage';
import { WaitersPage } from './pages/owner/WaitersPage';
import { TablesPage } from './pages/owner/TablesPage';
import { ProductsPage } from './pages/owner/ProductsPage';
import { ExpensesPage } from './pages/owner/ExpensesPage';
import { OrdersPage } from './pages/owner/OrdersPage';
import { ProfilePage } from './pages/owner/ProfilePage';
import { ManagersPage } from './pages/owner/ManagersPage';
import { ToastProvider } from './components/ui/Toast';
import { getAuth, setAuth, clearAuth } from './lib/auth';
import { api } from './lib/api';
import { User, Branch } from './lib/types';
import { hasAnyPermission, hasPermission } from './lib/permissions';
type Page =
'dashboard' |
'branches' |
'waiters' |
'managers' |
'tables' |
'products' |
'expenses' |
'orders' |
'profile';

const canAccessPage = (user: User | null, page: Page) => {
  if (!user) {
    return false;
  }

  if (user.role === 'owner') {
    return true;
  }

  if (user.role === 'waiter') {
    return false;
  }

  if (page === 'profile') {
    return true;
  }

  if (page === 'branches' || page === 'managers') {
    return false;
  }

  if (page === 'dashboard') {
    return hasPermission(user, 'DASHBOARD_VIEW');
  }

  if (page === 'tables') {
    return hasPermission(user, 'TABLES_VIEW');
  }

  if (page === 'orders') {
    return hasAnyPermission(user, ['ORDERS_VIEW', 'REPORTS_VIEW']);
  }

  if (page === 'products') {
    return hasPermission(user, 'PRODUCTS_VIEW');
  }

  if (page === 'expenses') {
    return hasPermission(user, 'EXPENSES_VIEW');
  }

  if (page === 'waiters') {
    return hasPermission(user, 'WAITERS_VIEW');
  }

  return false;
};

const resolveFallbackPage = (user: User | null): Page => {
  const orderedPages: Page[] = [
  'dashboard',
  'tables',
  'orders',
  'products',
  'expenses',
  'waiters',
  'branches',
  'managers',
  'profile'];


  for (const page of orderedPages) {
    if (canAccessPage(user, page)) {
      return page;
    }
  }

  return 'profile';
};
export function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [activeBranchId, setActiveBranchId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');
  const [appReady, setAppReady] = useState(false);

  const refreshBranches = async () => {
    const list = await api.branches.list();
    setBranches(list);
    const auth = getAuth();
    if (auth.user && auth.token) {
      setAuth({
        ...auth,
        branches: list
      });
    }
    return list;
  };

  // Restore session on mount
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
            // login session eskirgan bo'lishi mumkin
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
    u: User,
    token: string,
    initialActiveBranchId: string | null = null,
    initialBranches: Branch[] = []
  ) => {
    setUser(u);
    setIsAuthenticated(true);
    setAuth({
      user: u,
      token,
      activeBranchId: initialActiveBranchId,
      branches: initialBranches
    });
    setActiveBranchId(initialActiveBranchId);
    setBranches(initialBranches);

    if (u.role !== 'owner') {
      return;
    }

    try {
      await refreshBranches();
    } catch {
      if (initialBranches.length === 0) {
        setBranches([]);
      }
    }
  };

  const handleBranchSelect = async (branchId: string) => {
    try {
      const result = await api.auth.selectBranch(branchId);
      const auth = getAuth();

      setAuth({
        ...auth,
        token: result.token,
        activeBranchId: branchId
      });

      setActiveBranchId(branchId);
      setCurrentPage((prev) => (canAccessPage(user, prev as Page) ? prev : resolveFallbackPage(user)));
    } catch {
      setActiveBranchId(null);
    }
  };

  const handleSwitchBranch = async (branchId: string) => {
    try {
      const result = await api.auth.selectBranch(branchId);
      const auth = getAuth();

      setAuth({
        ...auth,
        token: result.token,
        activeBranchId: branchId
      });

      setActiveBranchId(branchId);
    } catch {
      // ignore
    }
  };

  const handleLogout = () => {
    clearAuth();
    setUser(null);
    setIsAuthenticated(false);
    setBranches([]);
    setActiveBranchId(null);
    setCurrentPage('dashboard');
  };

  const handleBranchesChange = () => {
    refreshBranches().catch(() => {
      setBranches([]);
    });
  };

  useEffect(() => {
    if (!user || !activeBranchId) {
      return;
    }

    if (!canAccessPage(user, currentPage)) {
      setCurrentPage(resolveFallbackPage(user));
    }
  }, [activeBranchId, currentPage, user]);

  const handleUserChange = (nextUser: User, nextToken?: string) => {
    const auth = getAuth();
    const resolvedToken = nextToken && nextToken.trim() ? nextToken : auth.token;

    if (!resolvedToken) {
      return;
    }

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
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="h-10 w-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-slate-500 text-sm">Yuklanmoqda...</p>
        </div>
      </div>);

  }
  if (!isAuthenticated) {
    return (
      <>
        <ToastProvider />
        <LoginPage onLogin={handleLogin} />
      </>);

  }
  if (!activeBranchId) {
    return (
      <>
        <ToastProvider />
        <BranchSelectPage
          branches={branches}
          onSelect={handleBranchSelect}
          onLogout={handleLogout} />

      </>);

  }

  const activeBranch = branches.find((b) => b.id === activeBranchId);
  const activeBranchName = activeBranch?.name || '';
  return (
    <>
      <ToastProvider />
      <OwnerLayout
        currentPage={currentPage}
        onNavigate={(p) => setCurrentPage(p as Page)}
        currentBranch={activeBranch}
        branches={branches}
        onBranchChange={handleSwitchBranch}
        user={user!}
        onLogout={handleLogout}>

        {currentPage === 'dashboard' &&
        <DashboardPage
          activeBranchId={activeBranchId}
          activeBranchName={activeBranchName}
          onNavigate={(p) => setCurrentPage(p as Page)} />

        }
        {currentPage === 'branches' &&
        <BranchesPage onBranchesChange={handleBranchesChange} />
        }
        {currentPage === 'waiters' &&
        <WaitersPage
          activeBranchId={activeBranchId}
          activeBranchName={activeBranchName} />

        }
        {currentPage === 'managers' &&
        <ManagersPage branches={branches} />
        }
        {currentPage === 'tables' &&
        <TablesPage
          activeBranchId={activeBranchId}
          activeBranchName={activeBranchName} />

        }
        {currentPage === 'products' &&
        <ProductsPage
          activeBranchId={activeBranchId}
          activeBranchName={activeBranchName} />

        }
        {currentPage === 'expenses' &&
        <ExpensesPage
          activeBranchId={activeBranchId}
          activeBranchName={activeBranchName} />

        }
        {currentPage === 'orders' &&
        <OrdersPage
          activeBranchId={activeBranchId}
          activeBranchName={activeBranchName} />

        }
        {currentPage === 'profile' &&
        <ProfilePage user={user!} onUserChange={handleUserChange} />
        }
      </OwnerLayout>
    </>);

}
