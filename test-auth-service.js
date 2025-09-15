// Script de teste direto do authService
// Execute este script no console do navegador

console.log("🧪 Teste Direto do authService...");

// 1. Testar getCurrentPlan diretamente
console.log("1. Testando getCurrentPlan...");
if (window.authService && typeof window.authService.getCurrentPlan === 'function') {
  window.authService.getCurrentPlan().then(function(plan) {
    console.log("   ✅ getCurrentPlan retornou:", plan);
    console.log("   📊 Análise:", {
      isTrial: plan === 'trial',
      isBasic: plan === 'basic',
      isPremium: plan === 'premium',
      isUnknown: plan === 'unknown',
      expectedForMonthly: plan === 'basic'
    });
  }).catch(function(error) {
    console.log("   ❌ Erro em getCurrentPlan:", error);
  });
} else {
  console.log("   ❌ getCurrentPlan não disponível");
}

// 2. Testar getTrialDaysLeft diretamente
console.log("2. Testando getTrialDaysLeft...");
if (window.authService && typeof window.authService.getTrialDaysLeft === 'function') {
  window.authService.getTrialDaysLeft().then(function(days) {
    console.log("   ✅ getTrialDaysLeft retornou:", days);
    console.log("   📊 Análise:", {
      daysValue: days,
      isNumber: typeof days === 'number',
      isExpired: days <= 0,
      isValid: days > 0
    });
  }).catch(function(error) {
    console.log("   ❌ Erro em getTrialDaysLeft:", error);
  });
} else {
  console.log("   ❌ getTrialDaysLeft não disponível");
}

// 3. Testar getCurrentUser
console.log("3. Testando getCurrentUser...");
if (window.authService && typeof window.authService.getCurrentUser === 'function') {
  window.authService.getCurrentUser().then(function(user) {
    console.log("   ✅ getCurrentUser retornou:", {
      id: user?.id,
      email: user?.email,
      plano: user?.plano,
      dataExpiracao: user?.dataExpiracao
    });
  }).catch(function(error) {
    console.log("   ❌ Erro em getCurrentUser:", error);
  });
} else {
  console.log("   ❌ getCurrentUser não disponível");
}

// 4. Simulação da lógica do AuthGuard
console.log("4. Simulando lógica do AuthGuard...");
setTimeout(function() {
  if (window.authService) {
    Promise.all([
      window.authService.getCurrentPlan(),
      window.authService.getTrialDaysLeft()
    ]).then(function(results) {
      var plan = results[0];
      var daysLeft = results[1];

      var shouldRedirect = plan === "trial" && typeof daysLeft === "number" && daysLeft <= 0;

      console.log("   📊 Simulação AuthGuard:", {
        plan: plan,
        daysLeft: daysLeft,
        shouldRedirect: shouldRedirect,
        condition1: plan === "trial",
        condition2: typeof daysLeft === "number",
        condition3: daysLeft <= 0,
        expectedBehavior: plan === 'basic' ? 'should NOT redirect' : 'check conditions'
      });
    }).catch(function(error) {
      console.log("   ❌ Erro na simulação:", error);
    });
  }
}, 1000);

console.log("🧪 Teste concluído. Aguarde os resultados...");
