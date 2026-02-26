import React, { useEffect, useState } from 'react';
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
'orders';
export function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [activeBranchId, setActiveBranchId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');
  const [appReady, setAppReady] = useState(false);
  // Restore session on mount
  useEffect(() => {
    const auth = getAuth();
    if (auth.token && auth.user) {
      setUser(auth.user);
      setIsAuthenticated(true);
      if (auth.activeBranchId) {
        setActiveBranchId(auth.activeBranchId);
      }
    }
    api.branches.list().then((b) => {
      setBranches(b);
      setAppReady(true);
    });
  }, []);
  const handleLogin = (u: User, token: string) => {
    setUser(u);
    setIsAuthenticated(true);
    setAuth({
      user: u,
      token,
      activeBranchId: null
    });
  };
  const handleBranchSelect = (branchId: string) => {
    setActiveBranchId(branchId);
    const auth = getAuth();
    setAuth({
      ...auth,
      activeBranchId: branchId
    });
    setCurrentPage('dashboard');
  };
  const handleSwitchBranch = (branchId: string) => {
    setActiveBranchId(branchId);
    const auth = getAuth();
    setAuth({
      ...auth,
      activeBranchId: branchId
    });
  };
  const handleLogout = () => {
    clearAuth();
    setUser(null);
    setIsAuthenticated(false);
    setActiveBranchId(null);
    setCurrentPage('dashboard');
  };
  const handleBranchesChange = () => {
    api.branches.list().then((b) => setBranches(b));
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
      </OwnerLayout>
    </>);

}