import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
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
import CropPricePage from './pages/CropPricePage';
import DevPage from './pages/DevPage';
import styles from './App.module.css';

// 문서 편집기(TipTap)가 커서 스마트 팜 화면에 들어갈 때만 내려받는다
const SmartFarmPage = lazy(() => import('./pages/SmartFarmPage'));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 1000 * 60 * 5, retry: 1 },
    mutations: { retry: 0 },
  },
});

function Layout({ children }: { children: React.ReactNode }) {
  const { subItems } = useSubMenu();
  // Navbar: topBar 80px + subMenuBar 60px
  const topOffset = subItems.length > 0 ? 140 : 80;

  return (
    <div className={styles.layout}>
      <Navbar />
      <main className={styles.content} style={{ marginTop: topOffset }}>
        <Suspense fallback={null}>{children}</Suspense>
      </main>
      <Footer />
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter basename={import.meta.env.BASE_URL}>
        <AuthProvider>
          <SubMenuProvider>
            <Routes>
              <Route path="/" element={<Layout><FarmPage /></Layout>} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/mypage" element={<Layout><MyPage /></Layout>} />
              <Route path="/members" element={<Layout><MembersPage /></Layout>} />
              <Route path="/farm" element={<Layout><FarmPage /></Layout>} />
              <Route path="/smart-farm/:area" element={<Layout><SmartFarmPage /></Layout>} />
              <Route path="/smart-farm/:area/p/:nodeId" element={<Layout><SmartFarmPage /></Layout>} />
              <Route path="/crops" element={<Layout><CropsPage /></Layout>} />
              <Route path="/order" element={<Layout><OrderPage /></Layout>} />
              <Route path="/order-status" element={<Layout><OrderStatusPage /></Layout>} />
              <Route path="/market-price" element={<Layout><MarketPricePage /></Layout>} />
              <Route path="/crop-price" element={<Layout><CropPricePage /></Layout>} />
              <Route path="/dev" element={<Layout><DevPage /></Layout>} />
            </Routes>
          </SubMenuProvider>
        </AuthProvider>
      </BrowserRouter>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
