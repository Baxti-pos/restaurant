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
import { ToastProvider } from './components/ui/Toast';
import { getAuth, setAuth, clearAuth } from './lib/auth';
import { api } from './lib/api';
import { User, Branch } from './lib/types';
type Page =
'dashboard' |
'branches' |
'waiters' |
'tables' |
'products' |
'expenses' |
'orders' |
'profile';
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
        if (auth.activeBranchId) {
          setActiveBranchId(auth.activeBranchId);
        }
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
      activeBranchId: initialActiveBranchId
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
      setCurrentPage('dashboard');
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
      activeBranchId: auth.activeBranchId
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
