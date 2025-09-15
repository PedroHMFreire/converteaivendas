// Script de teste para verificar uso correto das tabelas
// Execute este script no console do navegador

console.log("🧪 Teste de Uso Correto das Tabelas Supabase");

// 1. Testar getCurrentUser (deve usar v_profiles_access)
console.log("1. Testando getCurrentUser...");
if (window.authService && typeof window.authService.getCurrentUser === 'function') {
  window.authService.getCurrentUser().then(function(user) {
    console.log("   ✅ getCurrentUser retornou:", {
      id: user?.id,
      plano: user?.plano,
      dataExpiracao: user?.dataExpiracao,
      fonte: "v_profiles_access" // Deve vir da view
    });
  }).catch(function(error) {
    console.log("   ❌ Erro em getCurrentUser:", error);
  });
} else {
  console.log("   ❌ getCurrentUser não disponível");
}

// 2. Testar getCurrentPlan (já usa v_profiles_access)
console.log("2. Testando getCurrentPlan...");
if (window.authService && typeof window.authService.getCurrentPlan === 'function') {
  window.authService.getCurrentPlan().then(function(plan) {
    console.log("   ✅ getCurrentPlan retornou:", plan);
    console.log("   📊 Análise:", {
      isTrial: plan === 'trial',
      isBasic: plan === 'basic',
      isPremium: plan === 'premium',
      fonte: "v_profiles_access"
    });
  }).catch(function(error) {
    console.log("   ❌ Erro em getCurrentPlan:", error);
  });
} else {
  console.log("   ❌ getCurrentPlan não disponível");
}

// 3. Verificar consistência entre as funções
console.log("3. Verificando consistência...");
setTimeout(function() {
  if (window.authService) {
    Promise.all([
      window.authService.getCurrentUser(),
      window.authService.getCurrentPlan()
    ]).then(function(results) {
      var user = results[0];
      var plan = results[1];

      var consistente = user && user.plano === plan;
      console.log("   📊 Consistência:", {
        userPlano: user?.plano,
        planDireto: plan,
        consistente: consistente,
        status: consistente ? "✅ Dados consistentes" : "❌ Dados inconsistentes"
      });

      if (!consistente) {
        console.log("   🚨 PROBLEMA: getCurrentUser e getCurrentPlan retornam valores diferentes!");
        console.log("   💡 Solução: Ambos devem usar v_profiles_access");
      }
    }).catch(function(error) {
      console.log("   ❌ Erro na verificação de consistência:", error);
    });
  }
}, 1000);

// 4. Testar TrialBanner
console.log("4. Verificando TrialBanner...");
setTimeout(function() {
  var trialBanner = document.querySelector('[class*="bg-amber-50"]');
  console.log("   📊 TrialBanner:", {
    visivel: !!trialBanner,
    status: !!trialBanner ? "❌ Ainda visível (problema)" : "✅ Não visível (correto)"
  });
}, 2000);

console.log("🧪 Teste concluído. Verifique os logs acima.");
