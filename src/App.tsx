// src/App.tsx
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation, Navigate } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { ThemeProvider } from "next-themes";

import LandingPage from "./pages/LandingPage";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ResetPassword from "./pages/ResetPassword";
import Cadastros from "./pages/Cadastros";
import Upgrade from "./pages/Upgrade";
import NotFound from "./pages/NotFound";
import Home from "./pages/Home";
import RegistroVendas from "./pages/RegistroVendas";

// Insights da IA
import InsightsIA from "./pages/InsightsIA";

// Sucesso de cobrança (mantemos com extensão)
import BillingSuccess from "./pages/BillingSuccess.tsx";

// Header (menu de topo)
import Header from "@/components/Header";

// Guard trial/autenticação só nas rotas internas
import AuthGuard from "@/components/AuthGuard";

const queryClient = new QueryClient();

// Layout interno com Header + AuthGuard
function InternalLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      <main style={{ minHeight: "100vh" }}>
        <AuthGuard>{children}</AuthGuard>
      </main>
    </>
  );
}

function AppRoutes() {
  const location = useLocation();

  // Páginas públicas SEM header (inclui "/" que agora é Landing)
  const hideHeaderRoutes = ["/", "/login", "/register", "/landing", "/billing/success", "/reset-password"];
  const hideHeader = hideHeaderRoutes.includes(location.pathname);

  return hideHeader ? (
    <Routes>
      {/* ✅ Rota raiz — Landing pública */}
      <Route path="/" element={<LandingPage />} />
      {/* Alias opcional da landing */}
      <Route path="/landing" element={<LandingPage />} />

      {/* Acesso/conta */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
  <Route path="/reset-password" element={<ResetPassword />} />

      {/* Sucesso do Mercado Pago (pública) */}
      <Route path="/billing/success" element={<BillingSuccess />} />

      {/* Qualquer outra rota pública desconhecida → volta pra Landing */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  ) : (
    <InternalLayout>
      <Routes>
        {/* ✅ Área logada principal agora é /app */}
        <Route path="/app" element={<Home />} />

        {/* Vendas (Raio-X) */}
        <Route path="/vendas" element={<RegistroVendas />} />

        {/* Insights da IA */}
        <Route path="/insights" element={<InsightsIA />} />

        {/* Cadastros e Upgrade */}
        <Route path="/cadastros" element={<Cadastros />} />
        <Route path="/upgrade" element={<Upgrade />} />

        {/* Redirecionamentos de rotas antigas */}
        <Route path="/dashboard" element={<Navigate to="/app" replace />} />
        <Route path="/registro" element={<Navigate to="/vendas" replace />} />
        <Route path="/registro-vendas" element={<Navigate to="/vendas" replace />} />
        <Route path="/insights-ia" element={<Navigate to="/insights" replace />} />

        {/* 404 interno → manda pra /app */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </InternalLayout>
  );
}

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </HelmetProvider>
  </ThemeProvider>
);

export default App;
