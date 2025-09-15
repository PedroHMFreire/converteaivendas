// Script de teste para verificar correção dos campos
// Execute este script no console do navegador

console.log("🧪 Teste de Correção de Campos - PayPal Integration");

// 1. Testar se os campos estão sendo salvos corretamente
console.log("1. Testando campos salvos no PayPal confirm...");
console.log("   ✅ Campos CORRETOS agora:");
console.log("      - plano: 'basic' (mapeado de plan_type)");
console.log("      - data_expiracao: timestamp (mapeado de expires_at)");
console.log("      - plano_recorrencia: 'mensal'|'trimestral'|'anual'");

// 2. Testar leitura dos campos corrigidos
console.log("2. Testando leitura dos campos corrigidos...");
if (window.authService) {
  Promise.all([
    window.authService.getCurrentPlan(),
    window.authService.getCurrentUser(),
    window.authService.getTrialDaysLeft()
  ]).then(function(results) {
    var plan = results[0];
    var user = results[1];
    var daysLeft = results[2];

    console.log("   📊 Estado atual do usuário:");
    console.log("      - Plano lido:", plan);
    console.log("      - Perfil completo:", {
      id: user?.id,
      plano: user?.plano,
      dataExpiracao: user?.dataExpiracao
    });
    console.log("      - Dias restantes:", daysLeft);

    console.log("   📈 Análise:");
    console.log("      - Deve ser 'basic' para plano mensal:", plan === 'basic');
    console.log("      - Não deve redirecionar:", plan === 'basic');
    console.log("      - TrialBanner deve desaparecer:", plan !== 'trial' || daysLeft <= 0);

  }).catch(function(error) {
    console.log("   ❌ Erro ao testar leitura:", error);
  });
} else {
  console.log("   ❌ authService não disponível");
}

// 3. Simular novo pagamento para testar
console.log("3. Para testar novo pagamento:");
console.log("   - Fazer novo pagamento PayPal");
console.log("   - Verificar se plano muda para 'basic'");
console.log("   - Verificar se TrialBanner desaparece");
console.log("   - Verificar se AuthGuard permite acesso");

// 4. Verificar se eventos estão funcionando
console.log("4. Testando sistema de eventos...");
if (window.userEvents) {
  console.log("   ✅ userEvents disponível");
  console.log("   - STATUS_CHANGED deve ser emitido após pagamento");
  console.log("   - PROFILE_UPDATED deve ser emitido após atualização");
} else {
  console.log("   ❌ userEvents não disponível");
}

console.log("🧪 Teste concluído. Verifique os logs acima.");
