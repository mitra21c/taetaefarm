import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { AuthProvider } from './context/AuthContext';
import { SubMenuProvider, useSubMenu } from './context/SubMenuContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import LoginPage from './pages/LoginPage';
import MyPage from './pages/MyPage';
import MembersPage from './pages/MembersPage';
import FarmPage from './pages/FarmPage';
import CropsPage from './pages/CropsPage';
import OrderPage from './pages/OrderPage';
import OrderStatusPage from './pages/OrderStatusPage';
import MarketPricePage from './pages/MarketPricePage';
import styles from './App.module.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 1000 * 60 * 5, retry: 1 },
    mutations: { retry: 0 },
  },
});

function Layout({ children }: { children: React.ReactNode }) {
  const { subItems } = useSubMenu();
  const topOffset = subItems.length > 0 ? 148 : 104;

  return (
    <div className={styles.layout}>
      <Navbar />
      <main className={styles.content} style={{ marginTop: topOffset }}>
        {children}
      </main>
      <Footer />
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter basename="/taetaefarm">
        <AuthProvider>
          <SubMenuProvider>
            <Routes>
              <Route path="/" element={<Navigate to="/farm" replace />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/mypage" element={<Layout><MyPage /></Layout>} />
              <Route path="/members" element={<Layout><MembersPage /></Layout>} />
              <Route path="/farm" element={<Layout><FarmPage /></Layout>} />
              <Route path="/crops" element={<Layout><CropsPage /></Layout>} />
              <Route path="/order" element={<Layout><OrderPage /></Layout>} />
              <Route path="/order-status" element={<Layout><OrderStatusPage /></Layout>} />
              <Route path="/market-price" element={<Layout><MarketPricePage /></Layout>} />
            </Routes>
          </SubMenuProvider>
        </AuthProvider>
      </BrowserRouter>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
