import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },

  // Configurações de build otimizadas
  build: {
    target: "es2020",
    minify: "esbuild",
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ["react", "react-dom"],
          ui: [
            "@radix-ui/react-dialog",
            "@radix-ui/react-toast",
            "@radix-ui/react-select",
          ],
        },
      },
    },
  },

  // Configurações de servidor de desenvolvimento
  server: {
    port: 5173,
    host: true,
    open: true,
  },

  // Configurações de preview
  preview: {
    port: 4173,
    host: true,
  },

  // Configurações de dependências
  optimizeDeps: {
    include: [
      "react",
      "react-dom",
      "react-router-dom",
      "@tanstack/react-query",
      "sonner",
      "lucide-react",
    ],
  },

  // Configurações de ambiente
  define: {
    "process.env": process.env,
  },
});
