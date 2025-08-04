import { useEffect, useState, useRef } from "react";
import { toast } from "@/components/ui/use-toast";
import { supabase } from "@/lib/supabaseClient";
import { authService } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { BarChart3, Download, AlertTriangle, Gift, Trophy, Smile, TrendingUp } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Chart } from "@/components/ui/chart";

const LOCAL_KEY = "converte:vendas:";
const PREMIO_KEY = "converte:premio-semana:";

function getLocalKey(userId: string) {
  return `${LOCAL_KEY}${userId}`;
}
function getPremioKey(userId: string) {
  return `${PREMIO_KEY}${userId}`;
}

function salvarVendasLocais(userId: string, vendas: Venda[]) {
  localStorage.setItem(getLocalKey(userId), JSON.stringify(vendas));
}
function carregarVendasLocais(userId: string): Venda[] {
  const raw = localStorage.getItem(getLocalKey(userId));
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}
function salvarPremioSemana(userId: string, premio: string) {
  localStorage.setItem(getPremioKey(userId), premio);
}
function carregarPremioSemana(userId: string): string {
  return localStorage.getItem(getPremioKey(userId)) || "";
}

async function sincronizarComBanco(userId: string, vendas: Venda[]) {
  try {
    await supabase
      .from("vendas_backup")
      .upsert([{ user_id: userId, vendas, updated_at: new Date().toISOString() }]);
  } catch (err) {
    console.error("Erro ao sincronizar vendas com banco:", err);
  }
}

type Venda = {
  id: string;
  vendedorId: string;
  lojaId: string;
  atendimentos: number;
  vendas: number;
  data: string;
  user_id: string;
};

type Vendedor = {
  id: string;
  nome: string;
  lojaId: string;
};

type Loja = {
  id: string;
  nome: string;
};

const dateOnly = (d: string) => new Date(d).toISOString().split('T')[0];

function calcularMetrica(vendas: Venda[], vendedores: Vendedor[], lojas: Loja[]) {
  const porVendedor = vendedores.map((v) => {
    const vendasVendedor = vendas.filter((vd) => vd.vendedorId === v.id);
    const atendimentos = vendasVendedor.reduce((a, b) => a + (b.atendimentos || 0), 0);
    const vendasEfet = vendasVendedor.reduce((a, b) => a + (b.vendas || 0), 0);
    const conversao = atendimentos > 0 ? ((vendasEfet / atendimentos) * 100) : 0;
    return {
      ...v,
      atendimentos,
      vendas: vendasEfet,
      conversao,
      lojaNome: lojas.find((l) => l.id === v.lojaId)?.nome || "Sem loja",
    };
  });
  const porLoja = lojas.map((l) => {
    const vendedoresLoja = vendedores.filter((v) => v.lojaId === l.id).map((v) => v.id);
    const vendasLoja = vendas.filter((vd) => vendedoresLoja.includes(vd.vendedorId));
    const atendimentos = vendasLoja.reduce((a, b) => a + (b.atendimentos || 0), 0);
    const vendasEfet = vendasLoja.reduce((a, b) => a + (b.vendas || 0), 0);
    const conversao = atendimentos > 0 ? ((vendasEfet / atendimentos) * 100) : 0;
    return {
      ...l,
      atendimentos,
      vendas: vendasEfet,
      conversao,
    };
  });
  const totalAtendimentos = vendas.reduce((a, b) => a + (b.atendimentos || 0), 0);
  const totalVendas = vendas.reduce((a, b) => a + (b.vendas || 0), 0);
  const conversaoGeral = totalAtendimentos > 0 ? ((totalVendas / totalAtendimentos) * 100) : 0;
  const melhorVendedor = porVendedor.sort((a, b) => b.conversao - a.conversao)[0];
  const melhorLoja = porLoja.sort((a, b) => b.conversao - a.conversao)[0];

  return {
    porVendedor,
    porLoja,
    totalAtendimentos,
    totalVendas,
    conversaoGeral,
    melhorVendedor,
    melhorLoja,
  };
}

const RegistroVendas = () => {
  const [vendas, setVendas] = useState<Venda[]>([]);
  const [vendedores, setVendedores] = useState<Vendedor[]>([]);
  const [lojas, setLojas] = useState<Loja[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingVenda, setEditingVenda] = useState<Venda | null>(null);
  const [filtroLoja, setFiltroLoja] = useState("");
  const [filtroVendedor, setFiltroVendedor] = useState("");
  const [filtroDataInicio, setFiltroDataInicio] = useState("");
  const [filtroDataFim, setFiltroDataFim] = useState("");
  const [premioSemana, setPremioSemana] = useState("");
  const [premioEdit, setPremioEdit] = useState("");
  const [editandoPremio, setEditandoPremio] = useState(false);
  const [conversaoPreview, setConversaoPreview] = useState<number | null>(null);
  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const init = async () => {
      const user = await authService.getCurrentUser();
      if (!user?.id) {
        toast({
          title: "Erro",
          description: "Usuário não autenticado.",
          variant: "destructive",
        });
        return;
      }
      setUserId(user.id);

      let vendasLocais = carregarVendasLocais(user.id);
      if (!vendasLocais.length) {
        const { data, error } = await supabase
          .from("vendas_backup")
          .select("vendas")
          .eq("user_id", user.id)
          .order("updated_at", { ascending: false })
          .limit(1)
          .single();
        if (data?.vendas) {
          vendasLocais = data.vendas;
          salvarVendasLocais(user.id, vendasLocais);
        }
        if (error) {
          toast({
            title: "Erro ao buscar vendas do Supabase",
            description: error.message,
            variant: "destructive",
          });
        }
      }
      setVendas(vendasLocais);

      const vendedoresRaw = localStorage.getItem(`converte:vendedores:${user.id}`);
      let vendedoresLocais: Vendedor[] = [];
      if (vendedoresRaw) {
        try {
          vendedoresLocais = JSON.parse(vendedoresRaw);
        } catch {
          vendedoresLocais = [];
        }
      }
      setVendedores(vendedoresLocais);

      const lojasRaw = localStorage.getItem(`converte:lojas:${user.id}`);
      let lojasLocais: Loja[] = [];
      if (lojasRaw) {
        try {
          lojasLocais = JSON.parse(lojasRaw);
        } catch {
          lojasLocais = [];
        }
      }
      setLojas(lojasLocais);

      setPremioSemana(carregarPremioSemana(user.id));
      setPremioEdit(carregarPremioSemana(user.id));
    };
    init();
  }, []);

  useEffect(() => {
    if (!userId || !vendas.length) return;
    if (syncIntervalRef.current) clearInterval(syncIntervalRef.current);
    syncIntervalRef.current = setInterval(() => {
      sincronizarComBanco(userId, vendas);
    }, 30 * 60 * 1000);
    return () => {
      if (syncIntervalRef.current) clearInterval(syncIntervalRef.current);
    };
  }, [userId, vendas]);

  const salvarVenda = (venda: Venda) => {
    if (!userId) return;

    let novasVendas = editingVenda
      ? vendas.filter((v) => v.id !== venda.id)
      : [...vendas];

    for (let i = 0; i < venda.atendimentos; i++) {
      novasVendas.push({
        ...venda,
        id: editingVenda ? venda.id : crypto.randomUUID(),
        atendimentos: 1,
        vendas: i < venda.vendas ? 1 : 0,
      });
    }

    setVendas(novasVendas);
    salvarVendasLocais(userId, novasVendas);
    sincronizarComBanco(userId, novasVendas);
    setIsDialogOpen(false);
    setEditingVenda(null);
    setConversaoPreview(null);
    toast({
      title: "Venda registrada!",
      description: `Conversão: ${((venda.vendas / (venda.atendimentos || 1)) * 100).toFixed(1)}%`,
      variant: "success",
    });
  };

  const excluirVenda = (id: string) => {
    if (!userId) return;
    const novasVendas = vendas.filter((v) => v.id !== id);
    setVendas(novasVendas);
    salvarVendasLocais(userId, novasVendas);
    sincronizarComBanco(userId, novasVendas);
  };

  const editarVenda = (venda: Venda) => {
    setEditingVenda(venda);
    setIsDialogOpen(true);
    setConversaoPreview(
      venda.atendimentos > 0 ? (venda.vendas / venda.atendimentos) * 100 : null
    );
  };

  const novaVenda = () => {
    setEditingVenda({
      id: crypto.randomUUID(),
      vendedorId: "",
      lojaId: "",
      atendimentos: 0,
      vendas: 0,
      data: dateOnly(new Date().toISOString()),
      user_id: userId!,
    });
    setIsDialogOpen(true);
    setConversaoPreview(null);
  };

  const vendedoresFiltrados = filtroLoja
    ? vendedores.filter((v) => v.lojaId === filtroLoja)
    : vendedores;

  useEffect(() => {
    if (filtroVendedor) {
      const vendedor = vendedores.find((v) => v.id === filtroVendedor);
      if (vendedor) setFiltroLoja(vendedor.lojaId);
    }
  }, [filtroVendedor]);

  const vendasFiltradas = vendas.filter((v) => {
    const dataVenda = dateOnly(v.data);
    const dentroPeriodo =
      (!filtroDataInicio || dataVenda >= filtroDataInicio) &&
      (!filtroDataFim || dataVenda <= filtroDataFim);
    return (
      (!filtroLoja || v.lojaId === filtroLoja) &&
      (!filtroVendedor || v.vendedorId === filtroVendedor) &&
      dentroPeriodo
    );
  });

  const metricas = calcularMetrica(vendasFiltradas, vendedores, lojas);
  const ranking = [...metricas.porVendedor].sort((a, b) => b.conversao - a.conversao);

  const exportarPDF = () => {
    const doc = new jsPDF();
    doc.text("Relatório de Vendas", 14, 16);
    doc.setFontSize(10);
    doc.text(`Data: ${new Date().toLocaleDateString()}`, 14, 22);

    autoTable(doc, {
      head: [["Vendedor", "Loja", "Atendimentos", "Vendas", "Conversão (%)"]],
      body: ranking.map((v) => [
        v.nome,
        v.lojaNome,
        v.atendimentos,
        v.vendas,
        v.conversao.toFixed(1),
      ]),
      startY: 30,
    });

    doc.save("relatorio-vendas.pdf");
  };

  const mediaConversao = metricas.conversaoGeral;
  const vendedoresAbaixoMedia = ranking.filter((v) => v.conversao < mediaConversao && v.atendimentos > 0);

const evolucaoPorDia = (() => {
  const dias: { [data: string]: { atendimentos: number; vendas: number } } = {};

  vendasFiltradas.forEach((v) => {
    // Garantir que a data seja uma string válida
    const rawData = v.data || "";
    const dateObj = new Date(rawData);
    if (isNaN(dateObj.getTime())) return; // ignora se a data for inválida

    const d = dateObj.toISOString().split("T")[0]; // formato yyyy-mm-dd

    if (!dias[d]) dias[d] = { atendimentos: 0, vendas: 0 };
    dias[d].atendimentos += v.atendimentos || 0;
    dias[d].vendas += v.vendas || 0;
  });

  return Object.entries(dias).map(([data, val]) => ({
    data,
    ...val,
  }));
})();

  // Conversão por loja para o gráfico
  const conversaoPorLoja = metricas.porLoja.map(loja => ({
    nome: loja.nome,
    conversao: Number(loja.conversao.toFixed(1)),
  }));

  // Prêmio da semana - edição e salvar
  const handlePremioEdit = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPremioEdit(e.target.value);
    setEditandoPremio(true);
  };
  const handleSalvarPremio = () => {
    setPremioSemana(premioEdit);
    if (userId) salvarPremioSemana(userId, premioEdit);
    setEditandoPremio(false);
    toast({
      title: "Prêmio da semana salvo!",
      description: premioEdit,
      variant: "success",
    });
  };

  const handleVendedorChange = (vendedorId: string) => {
    const vendedor = vendedores.find((v) => v.id === vendedorId);
    setEditingVenda((prev) =>
      prev
        ? {
            ...prev,
            vendedorId,
            lojaId: vendedor?.lojaId || "",
          }
        : prev
    );
  };

  const handleAtendimentosChange = (atendimentos: number) => {
    setEditingVenda((prev) =>
      prev ? { ...prev, atendimentos } : prev
    );
    setConversaoPreview(
      editingVenda && atendimentos > 0
        ? (editingVenda.vendas / atendimentos) * 100
        : null
    );
  };
  const handleVendasChange = (vendasNum: number) => {
    setEditingVenda((prev) =>
      prev ? { ...prev, vendas: vendasNum } : prev
    );
    setConversaoPreview(
      editingVenda && editingVenda.atendimentos > 0
        ? (vendasNum / editingVenda.atendimentos) * 100
        : null
    );
  };

  return (
    <div className="w-full max-w-6xl mx-auto px-2 md:px-4 py-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2 text-gray-900 dark:text-white">
          <TrendingUp className="w-7 h-7 text-blue-500" /> Registro de Vendas
        </h1>
        <div className="flex gap-2">
          <Button onClick={novaVenda} className="bg-blue-600 text-white font-bold hover:bg-blue-700">
            <Smile className="w-4 h-4 mr-1" /> Nova Venda
          </Button>
          <Button variant="outline" onClick={exportarPDF}>
            <Download className="w-4 h-4 mr-1" /> Exportar PDF
          </Button>
        </div>
      </div>

      {/* Filtros + Prêmio da semana */}
      <div className="flex flex-wrap gap-2 mb-6 items-end">
        <div>
          <label className="block text-xs font-bold mb-1">Loja</label>
          <select
            className="border rounded p-2 dark:bg-zinc-800 dark:text-white"
            value={filtroLoja}
            onChange={(e) => {
              setFiltroLoja(e.target.value);
              setFiltroVendedor("");
            }}
          >
            <option value="">Todas as lojas</option>
            {lojas.map((l) => (
              <option key={l.id} value={l.id}>
                {l.nome}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-bold mb-1">Vendedor</label>
          <select
            className="border rounded p-2 dark:bg-zinc-800 dark:text-white"
            value={filtroVendedor}
            onChange={(e) => setFiltroVendedor(e.target.value)}
          >
            <option value="">Todos os vendedores</option>
            {vendedoresFiltrados.map((v) => (
              <option key={v.id} value={v.id}>
                {v.nome}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-bold mb-1">Data início</label>
          <input
            className="border rounded p-2 dark:bg-zinc-800 dark:text-white"
            type="date"
            value={filtroDataInicio}
            onChange={(e) => setFiltroDataInicio(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs font-bold mb-1">Data fim</label>
          <input
            className="border rounded p-2 dark:bg-zinc-800 dark:text-white"
            type="date"
            value={filtroDataFim}
            onChange={(e) => setFiltroDataFim(e.target.value)}
          />
        </div>
        <Button
          variant="outline"
          onClick={() => {
            setFiltroLoja("");
            setFiltroVendedor("");
            setFiltroDataInicio("");
            setFiltroDataFim("");
          }}
        >
          Limpar Filtros
        </Button>
        {/* Prêmio da semana ao lado do filtro */}
        <div className="flex items-end gap-2 ml-auto">
          <div className="flex flex-col">
            <label className="text-xs font-bold mb-1 text-yellow-700 flex items-center gap-1 uppercase">
              <Trophy className="w-4 h-4 text-yellow-600" />
              Prêmio da Semana
            </label>
            <input
              className="border-2 border-yellow-300 rounded-lg p-2 text-base font-semibold bg-white/80 focus:outline-none focus:ring-2 focus:ring-yellow-300 dark:bg-zinc-900 dark:border-yellow-600"
              placeholder="Ex: Vale-Presente, Dia de Folga..."
              value={premioEdit}
              onChange={handlePremioEdit}
              style={{ minWidth: 220 }}
            />
          </div>
          <Button
            type="button"
            className="bg-yellow-400 hover:bg-yellow-500 text-yellow-900 font-bold"
            onClick={handleSalvarPremio}
            disabled={!editandoPremio || premioEdit.trim() === ""}
          >
            Salvar
          </Button>
        </div>
      </div>

      {/* Indicadores rápidos */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        {[
          {
            label: "Atendimentos",
            value: metricas.totalAtendimentos,
            icon: <Smile className="w-5 h-5 text-blue-500" />,
          },
          {
            label: "Vendas",
            value: metricas.totalVendas,
            icon: <TrendingUp className="w-5 h-5 text-green-500" />,
          },
          {
            label: "Conversão Média",
            value: `${metricas.conversaoGeral.toFixed(1)}%`,
            icon: <BarChart3 className="w-5 h-5 text-purple-500" />,
          },
          {
            label: "Melhor Vendedor",
            value: metricas.melhorVendedor?.nome || "-",
            icon: <Trophy className="w-5 h-5 text-yellow-500" />,
          },
          {
            label: "Melhor Loja",
            value: metricas.melhorLoja?.nome || "-",
            icon: <Gift className="w-5 h-5 text-pink-500" />,
          },
        ].map((card) => (
          <div
            key={card.label}
            className="rounded-xl shadow p-4 flex flex-col items-center bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800"
            style={{ minHeight: 100 }}
          >
            <span className="mb-1">{card.icon}</span>
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">{card.label}</span>
            <span className="text-2xl font-extrabold text-gray-900 dark:text-white">{card.value}</span>
          </div>
        ))}
      </div>

      {/* Ranking dos vendedores */}
      <div className="mb-8">
        <h2 className="text-lg font-bold mb-2 flex items-center gap-2 text-blue-700 dark:text-blue-300">
          <BarChart3 className="w-5 h-5" /> Ranking de Conversão dos Vendedores
        </h2>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-gray-100 dark:bg-zinc-800 text-gray-900 dark:text-gray-100">
                <th className="px-2 py-1 text-left">#</th>
                <th className="px-2 py-1 text-left">Vendedor</th>
                <th className="px-2 py-1 text-left">Loja</th>
                <th className="px-2 py-1 text-center">Atendimentos</th>
                <th className="px-2 py-1 text-center">Vendas</th>
                <th className="px-2 py-1 text-center">Conversão</th>
                <th className="px-2 py-1 text-center">Alerta</th>
              </tr>
            </thead>
            <tbody>
              {ranking.map((v, idx) => (
                <tr
                  key={v.id}
                  className={
                    idx < 3
                      ? "bg-green-50 dark:bg-green-900/20"
                      : ""
                  }
                >
                  <td className="px-2 py-1">{idx + 1}</td>
                  <td className="px-2 py-1 font-medium">{v.nome}</td>
                  <td className="px-2 py-1">{v.lojaNome}</td>
                  <td className="px-2 py-1 text-center">{v.atendimentos}</td>
                  <td className="px-2 py-1 text-center">{v.vendas}</td>
                  <td className="px-2 py-1 text-center">{v.conversao.toFixed(1)}%</td>
                  <td className="px-2 py-1 text-center">
                    {v.atendimentos > 0 && v.conversao < mediaConversao && (
                      <span title="Conversão abaixo da média">
                        <AlertTriangle className="w-4 h-4 text-red-500 inline" />
                      </span>
                    )}
                    {idx === 0 && v.conversao > 0 && (
                      <span title="Melhor Conversão" className="ml-1">🏆</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {vendedoresAbaixoMedia.length > 0 && (
          <div className="mt-2 text-sm text-red-600 dark:text-red-400 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            {vendedoresAbaixoMedia.length} vendedor(es) com conversão abaixo da média.
          </div>
        )}
      </div>

      {/* Gráficos lado a lado */}
      <div className="mb-8 grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Gráfico de evolução */}
        <div>
          <h2 className="text-lg font-bold mb-2 text-green-700 dark:text-green-300 flex items-center gap-2">
            <TrendingUp className="w-5 h-5" /> Evolução de Atendimentos e Vendas
          </h2>
          <div className="bg-white dark:bg-zinc-900 rounded-lg shadow p-4">
            <Chart
              data={evolucaoPorDia}
              type="bar"
              keys={["atendimentos", "vendas"]}
              config={{
                atendimentos: { color: "#6366f1" },
                vendas: { color: "#10b981" },
              }}
            />
          </div>
        </div>
        {/* Gráfico de conversão por loja */}
        <div>
          <h2 className="text-lg font-bold mb-2 text-blue-700 dark:text-blue-300 flex items-center gap-2">
            <BarChart3 className="w-5 h-5" /> Conversão por Lojas
          </h2>
          <div className="bg-white dark:bg-zinc-900 rounded-lg shadow p-4">
            <Chart
              data={conversaoPorLoja}
              type="bar"
              keys={["conversao"]}
              config={{
                conversao: { color: "#22c55e" },
              }}
              xKey="nome"
              yLabel="%"
            />
          </div>
        </div>
      </div>

      {/* Modal de adicionar/editar venda */}
      {isDialogOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-zinc-900 p-6 rounded shadow-lg min-w-[320px]">
            <h2 className="text-lg font-bold mb-2 flex items-center gap-2">
              <Smile className="w-5 h-5 text-green-500" />
              {editingVenda && editingVenda.id ? "Editar Venda" : "Nova Venda"}
            </h2>
            <form
              onSubmit={e => {
                e.preventDefault();
                if (
                  editingVenda &&
                  editingVenda.atendimentos > 0 &&
                  editingVenda.vendas >= 0 &&
                  editingVenda.vendedorId &&
                  editingVenda.lojaId &&
                  editingVenda.data
                ) {
                  salvarVenda(editingVenda);
                } else {
                  toast({
                    title: "Erro",
                    description: "Preencha todos os campos obrigatórios.",
                    variant: "destructive",
                  });
                }
              }}
            >
              <input
                className="border p-2 w-full mb-2 dark:bg-zinc-800 dark:text-white"
                type="date"
                value={editingVenda?.data ? dateOnly(editingVenda.data) : dateOnly(new Date().toISOString())}
                onChange={(e) =>
                  setEditingVenda((prev) =>
                    prev
                      ? { ...prev, data: e.target.value }
                      : {
                          id: crypto.randomUUID(),
                          vendedorId: vendedores[0]?.id || "",
                          lojaId: lojas[0]?.id || "",
                          atendimentos: 0,
                          vendas: 0,
                          data: e.target.value,
                          user_id: userId!,
                        }
                  )
                }
                required
              />
              <select
                className="border p-2 w-full mb-2 dark:bg-zinc-800 dark:text-white"
                value={editingVenda?.vendedorId ?? ""}
                onChange={(e) => handleVendedorChange(e.target.value)}
                required
              >
                <option value="">Selecione o vendedor</option>
                {vendedores.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.nome}
                  </option>
                ))}
              </select>
              <select
                className="border p-2 w-full mb-2 dark:bg-zinc-800 dark:text-white"
                value={editingVenda?.lojaId ?? ""}
                disabled
                required
              >
                <option value="">Selecione a loja</option>
                {lojas.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.nome}
                  </option>
                ))}
              </select>
              <div className="flex gap-2 mb-2">
                <input
                  className="border p-2 w-full dark:bg-zinc-800 dark:text-white"
                  type="number"
                  min={0}
                  placeholder="Atendimentos"
                  value={editingVenda?.atendimentos ?? ""}
                  onChange={(e) => handleAtendimentosChange(Number(e.target.value))}
                  required
                />
                <input
                  className="border p-2 w-full dark:bg-zinc-800 dark:text-white"
                  type="number"
                  min={0}
                  placeholder="Vendas"
                  value={editingVenda?.vendas ?? ""}
                  onChange={(e) => handleVendasChange(Number(e.target.value))}
                  required
                />
              </div>
              {editingVenda && editingVenda.atendimentos > 0 && (
                <div className="mb-2 text-sm text-green-700 dark:text-green-300 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  Conversão:{" "}
                  <span className="font-bold">
                    {(
                      (editingVenda.vendas / editingVenda.atendimentos) *
                      100
                    ).toFixed(1)}
                    %
                  </span>
                </div>
              )}
              <div className="flex justify-end gap-2">
                <Button variant="outline" type="button" onClick={() => { setIsDialogOpen(false); setConversaoPreview(null); }}>
                  Cancelar
                </Button>
                <Button type="submit">Salvar</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Rodapé */}
      <footer className="mt-12 py-6 border-t text-center text-xs text-gray-500 dark:text-gray-400">
        Convertê &copy; {new Date().getFullYear()} &mdash; Performance e resultados com inteligência.
      </footer>
    </div>
  );
};

export default RegistroVendas;