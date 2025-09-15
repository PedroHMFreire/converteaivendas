// Script de teste para verificar AuthGuard
// Execute este script no console do navegador após fazer login

console.log("🧪 Iniciando testes de AuthGuard...");

// 1. Verificar se a função de debug está disponível
if (typeof window.debugAuthGuard === 'function') {
  console.log("1. ✅ Função debugAuthGuard disponível");
  window.debugAuthGuard();
} else {
  console.log("1. ❌ Função debugAuthGuard não encontrada");
}

// 2. Testar diretamente as funções do authService
console.log("2. Testando authService diretamente...");
if (window.authService) {
  Promise.all([
    window.authService.getTrialDaysLeft(),
    window.authService.getCurrentPlan ? window.authService.getCurrentPlan() : Promise.resolve('unknown')
  ]).then(function(results) {
    var daysLeft = results[0];
    var plan = results[1];
    console.log("   ✅ Dados do authService:", { daysLeft: daysLeft, plan: plan });
    console.log("   📊 Análise:", {
      shouldRedirect: plan === "trial" && typeof daysLeft === "number" && daysLeft <= 0,
      planType: plan,
      daysLeft: daysLeft,
      isTrial: plan === "trial",
      isExpired: typeof daysLeft === "number" && daysLeft <= 0
    });
  }).catch(function(error) {
    console.log("   ❌ Erro ao testar authService:", error);
  });
} else {
  console.log("   ❌ authService não encontrado");
}

// 3. Simular evento de mudança de status
console.log("3. Simulando mudança de status para plano mensal...");
if (window.userEvents) {
  window.userEvents.emit('STATUS_CHANGED', {
    plano: 'basic',
    dataExpiracao: null
  });
  console.log("   ✅ Evento STATUS_CHANGED emitido para plano 'basic'");
} else {
  console.log("   ❌ userEvents não encontrado");
}

// 4. Verificar se o redirecionamento acontece
console.log("4. Verificando comportamento de redirecionamento...");
setTimeout(function() {
  var currentPath = window.location.pathname;
  console.log("   📍 Caminho atual:", currentPath);
  console.log("   📊 Status:", {
    isOnUpgrade: currentPath === '/upgrade',
    isOnDashboard: currentPath.includes('/dashboard'),
    timestamp: new Date().toISOString()
  });
}, 2000);

console.log("🧪 Testes concluídos. Verifique os logs acima.");
