// Script de teste para verificar uso correto das colunas da view
// Execute este script no console do navegador

console.log("🧪 Teste de Uso Correto das Colunas da View v_profiles_access");

// 1. Testar getCurrentUser (deve usar plan_type e expires_at)
console.log("1. Testando getCurrentUser com colunas corretas...");
if (window.authService && typeof window.authService.getCurrentUser === 'function') {
  window.authService.getCurrentUser().then(function(user) {
    console.log("   ✅ getCurrentUser retornou:", {
      id: user?.id,
      plano: user?.plano,
      dataExpiracao: user?.dataExpiracao,
      fonte: "v_profiles_access (plan_type → plano, expires_at → dataExpiracao)"
    });

    console.log("   📊 Mapeamento verificado:", {
      planoMapeado: user?.plano,
      esperado: user?.plano === 'basic' ? '✅ mensal mapeado para basic' :
               user?.plano === 'premium' ? '✅ anual mapeado para premium' :
               user?.plano === 'trial' ? '✅ trial mantido' : '❓ desconhecido'
    });
  }).catch(function(error) {
    console.log("   ❌ Erro em getCurrentUser:", error);
  });
} else {
  console.log("   ❌ getCurrentUser não disponível");
}

// 2. Testar getCurrentPlan (deve usar plan_type)
console.log("2. Testando getCurrentPlan com plan_type...");
if (window.authService && typeof window.authService.getCurrentPlan === 'function') {
  window.authService.getCurrentPlan().then(function(plan) {
    console.log("   ✅ getCurrentPlan retornou:", plan);
    console.log("   📊 Mapeamento:", {
      planRetornado: plan,
      fonte: "v_profiles_access.plan_type",
      mapeamento: plan === 'basic' ? '✅ mensal → basic' :
                  plan === 'premium' ? '✅ anual → premium' :
                  plan === 'trial' ? '✅ trial' : '❓ desconhecido'
    });
  }).catch(function(error) {
    console.log("   ❌ Erro em getCurrentPlan:", error);
  });
} else {
  console.log("   ❌ getCurrentPlan não disponível");
}

// 3. Verificar consistência entre as funções
console.log("3. Verificando consistência com colunas corretas...");
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
        fonte: consistente ? "✅ Ambos usam v_profiles_access corretamente" :
              "❌ Inconsistência nas colunas da view"
      });

      if (!consistente) {
        console.log("   🚨 PROBLEMA: Verificar se ambas funções usam as mesmas colunas da view");
        console.log("   💡 getCurrentUser deve usar: plan_type, expires_at");
        console.log("   💡 getCurrentPlan deve usar: plan_type");
      }
    }).catch(function(error) {
      console.log("   ❌ Erro na verificação de consistência:", error);
    });
  }
}, 1000);

// 4. Verificar TrialBanner com dados corretos
console.log("4. Verificando TrialBanner com dados da view...");
setTimeout(function() {
  var trialBanner = document.querySelector('[class*="bg-amber-50"]');
  console.log("   📊 TrialBanner:", {
    visivel: !!trialBanner,
    status: !!trialBanner ? "❌ Ainda visível (verificar dados da view)" : "✅ Não visível (dados corretos)"
  });

  if (!!trialBanner) {
    console.log("   💡 Se ainda visível, verificar:");
    console.log("      - Se plan_type na view está correto");
    console.log("      - Se expires_at está atualizado");
    console.log("      - Se o mapeamento está funcionando");
  }
}, 2000);

console.log("🧪 Teste concluído. Verifique os logs acima.");
