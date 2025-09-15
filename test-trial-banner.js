// Script de teste para verificar sincronização do TrialBanner
// Execute este script no console do navegador após fazer login

console.log("🧪 Iniciando testes de sincronização do TrialBanner...");

// 1. Verificar se o componente está montado
const trialBannerElement = document.querySelector('[class*="bg-amber-50"]');
console.log("1. TrialBanner visível:", !!trialBannerElement);

// 2. Verificar função de debug global
if (typeof (window as any).debugTrialBanner === 'function') {
  console.log("2. ✅ Função debugTrialBanner disponível");
  (window as any).debugTrialBanner();
} else {
  console.log("2. ❌ Função debugTrialBanner não encontrada");
}

// 3. Simular evento de mudança de status
console.log("3. Simulando mudança de status...");
if (window.userEvents) {
  window.userEvents.emit('STATUS_CHANGED', {
    plano: 'premium',
    dataExpiracao: null
  });
  console.log("   ✅ Evento STATUS_CHANGED emitido");
} else {
  console.log("   ❌ userEvents não encontrado");
}

// 4. Verificar cache do auth
console.log("4. Verificando cache do auth...");
if (window.authService) {
  window.authService.refreshUserData().then(user => {
    console.log("   ✅ Cache atualizado:", user);
  }).catch(error => {
    console.log("   ❌ Erro ao atualizar cache:", error);
  });
} else {
  console.log("   ❌ authService não encontrado");
}

console.log("🧪 Testes concluídos. Verifique os logs acima.");
