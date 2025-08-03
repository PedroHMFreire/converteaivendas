import { useEffect, useState, useRef } from "react";
import { toast } from "@/components/ui/use-toast";
import { supabase } from "@/lib/supabaseClient";
import { authService } from "@/lib/auth";
import { Button } from "@/components/ui/button";

const LOCAL_KEY = "converte:vendas:";

function getLocalKey(userId: string) {
  return `${LOCAL_KEY}${userId}`;
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

async function sincronizarComBanco(userId: string, vendas: Venda[]) {
  try {
    await supabase
      .from("vendas_backup")
      .upsert([{ user_id: userId, vendas, updated_at: new Date().toISOString() }]);
  } catch (err) {
    console.error("Erro ao sincronizar vendas com banco:", err);
  }
}

// Tipos (ajuste conforme seu modelo)
type Venda = {
  id: string;
  vendedorId: string;
  lojaId: string;
  valor: number;
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

const RegistroVendas = () => {
  const [vendas, setVendas] = useState<Venda[]>([]);
  const [vendedores, setVendedores] = useState<Vendedor[]>([]);
  const [lojas, setLojas] = useState<Loja[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingVenda, setEditingVenda] = useState<Venda | null>(null);
  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Carrega vendas, vendedores e lojas locais ao abrir a página
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

      // Vendas
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

      // Vendedores
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

      // Lojas
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
    };
    init();
    // eslint-disable-next-line
  }, []);

  // Sincronização automática a cada 30 minutos
  useEffect(() => {
    if (!userId || !vendas.length) return;
    if (syncIntervalRef.current) clearInterval(syncIntervalRef.current);
    syncIntervalRef.current = setInterval(() => {
      sincronizarComBanco(userId, vendas);
    }, 30 * 60 * 1000); // 30 minutos
    return () => {
      if (syncIntervalRef.current) clearInterval(syncIntervalRef.current);
    };
  }, [userId, vendas]);

  // Adiciona ou edita uma venda
  const salvarVenda = (venda: Venda) => {
    if (!userId) return;
    let novasVendas: Venda[];
    if (editingVenda) {
      // Editar
      novasVendas = vendas.map((v) => (v.id === venda.id ? venda : v));
    } else {
      // Adicionar
      novasVendas = [...vendas, venda];
    }
    setVendas(novasVendas);
    salvarVendasLocais(userId, novasVendas);
    sincronizarComBanco(userId, novasVendas); // backup imediato
    setIsDialogOpen(false);
    setEditingVenda(null);
  };

  // Exclui uma venda
  const excluirVenda = (id: string) => {
    if (!userId) return;
    const novasVendas = vendas.filter((v) => v.id !== id);
    setVendas(novasVendas);
    salvarVendasLocais(userId, novasVendas);
    sincronizarComBanco(userId, novasVendas); // backup imediato
  };

  // Abre o modal para editar
  const editarVenda = (venda: Venda) => {
    setEditingVenda(venda);
    setIsDialogOpen(true);
  };

  // Abre o modal para adicionar
  const novaVenda = () => {
    setEditingVenda(null);
    setIsDialogOpen(true);
  };

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Registro de Vendas</h1>
        <Button onClick={novaVenda}>Nova Venda</Button>
      </div>
      <ul>
        {vendas.map((venda) => (
          <li key={venda.id} className="flex justify-between items-center border-b py-2">
            <span>
              {dateOnly(venda.data)} - R$ {venda.valor.toFixed(2)} -{" "}
              {vendedores.find((v) => v.id === venda.vendedorId)?.nome || "Sem vendedor"} /{" "}
              {lojas.find((l) => l.id === venda.lojaId)?.nome || "Sem loja"}
            </span>
            <div>
              <Button variant="outline" size="sm" onClick={() => editarVenda(venda)}>
                Editar
              </Button>
              <Button
                variant="destructive"
                size="sm"
                className="ml-2"
                onClick={() => excluirVenda(venda.id)}
              >
                Excluir
              </Button>
            </div>
          </li>
        ))}
      </ul>
      {/* Modal de adicionar/editar venda (exemplo simples, substitua pelo seu dialog/modal) */}
      {isDialogOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded shadow-lg min-w-[300px]">
            <h2 className="text-lg font-bold mb-2">
              {editingVenda ? "Editar Venda" : "Nova Venda"}
            </h2>
            {/* Formulário simples, ajuste conforme seu modelo */}
            <input
              className="border p-2 w-full mb-2"
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
                        valor: 0,
                        data: e.target.value,
                        user_id: userId!,
                      }
                )
              }
            />
            <input
              className="border p-2 w-full mb-2"
              type="number"
              placeholder="Valor"
              value={editingVenda?.valor ?? ""}
              onChange={(e) =>
                setEditingVenda((prev) =>
                  prev ? { ...prev, valor: Number(e.target.value) } : prev
                )
              }
            />
            <select
              className="border p-2 w-full mb-2"
              value={editingVenda?.vendedorId ?? ""}
              onChange={(e) =>
                setEditingVenda((prev) =>
                  prev ? { ...prev, vendedorId: e.target.value } : prev
                )
              }
            >
              <option value="">Selecione o vendedor</option>
              {vendedores.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.nome}
                </option>
              ))}
            </select>
            <select
              className="border p-2 w-full mb-2"
              value={editingVenda?.lojaId ?? ""}
              onChange={(e) =>
                setEditingVenda((prev) =>
                  prev ? { ...prev, lojaId: e.target.value } : prev
                )
              }
            >
              <option value="">Selecione a loja</option>
              {lojas.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.nome}
                </option>
              ))}
            </select>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button
                onClick={() => {
                  if (
                    editingVenda &&
                    editingVenda.valor > 0 &&
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
                Salvar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RegistroVendas;