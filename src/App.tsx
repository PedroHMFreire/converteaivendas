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
import Lojas from "./pages/Lojas";
import Vendedores from "./pages/Vendedores";
import RegistroVendas from "./pages/RegistroVendas";
import Upgrade from "./pages/Upgrade";
import NotFound from "./pages/NotFound";

// Importe a sidebar (ajuste o caminho se necessário)
import { SidebarProvider } from "@/components/ui/sidebar";
import { Sidebar } from "@/components/ui/sidebar";

const queryClient = new QueryClient();

// Componente para rotas internas com sidebar
function InternalLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <div style={{ display: "flex", minHeight: "100vh" }}>
        <Sidebar />
        <div style={{ flex: 1 }}>{children}</div>
      </div>
    </SidebarProvider>
  );
}

function AppRoutes() {
  const location = useLocation();
  // Rotas que NÃO devem mostrar a sidebar
  const hideSidebarRoutes = ["/", "/login", "/register"];
  const hideSidebar = hideSidebarRoutes.includes(location.pathname);

  return hideSidebar ? (
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
        <Route path="/lojas" element={<Lojas />} />
        <Route path="/vendedores" element={<Vendedores />} />
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