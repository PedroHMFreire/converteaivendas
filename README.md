# React + Vite Template - Lasy AI

Bem-vindo ao seu app Lasy! Este é um template [React](https://react.dev) + [Vite](https://vite.dev) otimizado para desenvolvimento rápido e deploys sem problemas.

## 🚀 Melhorias para Deploy na Vercel

Este template inclui otimizações específicas para evitar erros comuns de deploy:

### ✅ **Compatibilidade de Dependências**

- **React 19** + **TanStack Query 5.75** + todas as dependências atualizadas
- **react-day-picker v9** compatível com React 19
- **Configuração `.npmrc`** para resolver conflitos automaticamente

### ✅ **Performance Otimizada**

- **Vite 6.3** para builds ultra-rápidos
- **SWC** para compilação otimizada
- **Tree-shaking** automático para bundles menores

### ✅ **Componentes Atualizados**

- **Calendar component** compatível com react-day-picker v9
- **UI components** do Shadcn/UI nas versões mais recentes
- **Router** React Router DOM 6.28 para navegação

---

## 🛠️ Começando

Execute o servidor de desenvolvimento:

```bash
npm run dev
# ou
yarn dev
# ou
pnpm dev
# ou
bun dev
```

Abra [http://localhost:5173](http://localhost:5173) no seu navegador para ver o resultado.

Você pode começar editando os arquivos em `src/`. O Vite atualiza automaticamente com hot reload.

---

## 📚 Stack Tecnológica

- **Framework**: React 19 com hooks modernos
- **Build Tool**: Vite 6.3 com SWC
- **Routing**: React Router DOM 6.28
- **Styling**: Tailwind CSS + Shadcn/UI
- **Icons**: Lucide React
- **Forms**: React Hook Form + Zod
- **State Management**: TanStack Query
- **UI Components**: Radix UI primitives

---

## 🔧 Deploy na Vercel

### **Configuração Automática**

1. Conecte seu repositório GitHub à Vercel
2. A Vercel detectará automaticamente Vite
3. O build será executado com `npm run build`
4. Deploy automático em cada push

### **Variáveis de Ambiente**

Se você estiver usando APIs externas, configure na Vercel:

```bash
VITE_API_URL=sua_url_da_api
VITE_SUPABASE_URL=sua_url_do_supabase
VITE_SUPABASE_ANON_KEY=sua_chave_anonima
```

> **Nota**: Prefixe variáveis client-side com `VITE_`

---

## 📦 Scripts Disponíveis

- `npm run dev` - Inicia servidor de desenvolvimento
- `npm run build` - Build para produção
- `npm run build:dev` - Build para desenvolvimento
- `npm run preview` - Preview do build local
- `npm run lint` - Executa ESLint

---

## 🎯 Deploy Otimizado

### **Vite + Vercel = Performance Máxima**

- ⚡ **Build ultra-rápido** com Vite
- 🗜️ **Bundles otimizados** com tree-shaking
- 🔄 **Hot reload** instantâneo em desenvolvimento
- 📱 **PWA ready** com Vite PWA plugin

### **Zero Configuration**

O template já vem configurado para deploy direto na Vercel sem configurações adicionais!

---

_Template otimizado para uso com Lasy AI - desenvolvimento rápido e deploys sem problemas!_
