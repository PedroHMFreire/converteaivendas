import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation, Navigate } from "react-router-dom";
import { ThemeProvider } from "next-themes";

import LandingPage from "./pages/LandingPage";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Cadastros from "./pages/Cadastros";
import Upgrade from "./pages/Upgrade";
import NotFound from "./pages/NotFound";
import Home from "./pages/Home";
import RegistroVendas from "./pages/RegistroVendas";

// NOVO: Insights da IA
import InsightsIA from "./pages/InsightsIA";

// Importe o Header (menu de topo)
import Header from "@/components/Header";
// Se quiser rodapé global, importe aqui
// import Footer from "@/components/Footer";

const queryClient = new QueryClient();

// Layout interno com Header (menu de topo)
function InternalLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      <main style={{ minHeight: "100vh" }}>{children}</main>
      {/* <Footer /> */}
    </>
  );
}

function AppRoutes() {
  const location = useLocation();
  // Telas públicas sem Header
  const hideHeaderRoutes = ["/login", "/register", "/landing"];
  const hideHeader = hideHeaderRoutes.includes(location.pathname);

  return hideHeader ? (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/landing" element={<LandingPage />} />
      {/* Qualquer outra rota pública desconhecida volta pra Home */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  ) : (
    <InternalLayout>
      <Routes>
        {/* Home principal */}
        <Route path="/" element={<Home />} />

        {/* Vendas (Raio-X) */}
        <Route path="/vendas" element={<RegistroVendas />} />

        {/* Insights da IA */}
        <Route path="/insights" element={<InsightsIA />} />

        {/* Demais páginas */}
        <Route path="/cadastros" element={<Cadastros />} />
        <Route path="/upgrade" element={<Upgrade />} />

        {/* Redirecionamentos de rotas antigas */}
        <Route path="/dashboard" element={<Navigate to="/" replace />} />
        <Route path="/registro" element={<Navigate to="/vendas" replace />} />
        <Route path="/registro-vendas" element={<Navigate to="/vendas" replace />} />
        <Route path="/insights-ia" element={<Navigate to="/insights" replace />} />

        {/* 404 */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </InternalLayout>
  );
}

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
