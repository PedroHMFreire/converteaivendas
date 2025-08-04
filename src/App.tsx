import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { ThemeProvider } from "next-themes";

import LandingPage from "./pages/LandingPage";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Cadastros from "./pages/Cadastros";
import RegistroVendas from "./pages/RegistroVendas";
import Upgrade from "./pages/Upgrade";
import NotFound from "./pages/NotFound";

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
  // Rotas que NÃO devem mostrar o Header
  const hideHeaderRoutes = ["/", "/login", "/register"];
  const hideHeader = hideHeaderRoutes.includes(location.pathname);

  return hideHeader ? (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  ) : (
    <InternalLayout>
      <Routes>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/cadastros" element={<Cadastros />} />
        <Route path="/registro" element={<RegistroVendas />} />
        <Route path="/upgrade" element={<Upgrade />} />
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