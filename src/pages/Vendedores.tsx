import { useEffect, useState, useRef } from "react";
import { toast } from "@/components/ui/use-toast";
import { supabase } from "@/lib/supabaseClient";
import { authService } from "@/lib/auth";
import { Button } from "@/components/ui/button";

// Chave base para salvar vendedores locais por usuário
const LOCAL_KEY = "converte:vendedores:";

// Utilitário para obter a chave localStorage por usuário
function getLocalKey(userId: string) {
  return `${LOCAL_KEY}${userId}`;
}

// Função para salvar vendedores locais
function salvarVendedoresLocais(userId: string, vendedores: Vendedor[]) {
  localStorage.setItem(getLocalKey(userId), JSON.stringify(vendedores));
}

// Função para carregar vendedores locais
function carregarVendedoresLocais(userId: string): Vendedor[] {
  const raw = localStorage.getItem(getLocalKey(userId));
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

// Função para sincronizar vendedores locais com Supabase (backup)
async function sincronizarComBanco(userId: string, vendedores: Vendedor[]) {
  try {
    await supabase
      .from("vendedores_backup")
      .upsert([{ user_id: userId, vendedores, updated_at: new Date().toISOString() }]);
  } catch (err) {
    console.error("Erro ao sincronizar vendedores com banco:", err);
  }
}

// Tipo Vendedor (ajuste conforme seu modelo)
type Vendedor = {
  id: string;
  nome: string;
  lojaId: string;
  email?: string | null;
  telefone?: string | null;
  meta?: number | null;
  user_id: string;
};

type LojaOption = {
  id: string;
  nome: string;
};

const Vendedores = () => {
  const [vendedores, setVendedores] = useState<Vendedor[]>([]);
  const [lojas, setLojas] = useState<LojaOption[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingVendedor, setEditingVendedor] = useState<Vendedor | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Carrega vendedores locais ao abrir a página
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

      // 1. Tenta carregar do localStorage
      let vendedoresLocais = carregarVendedoresLocais(user.id);

      // 2. Se não houver dados locais, busca do Supabase (fallback) e salva localmente
      if (!vendedoresLocais.length) {
        const { data, error } = await supabase
          .from("vendedores_backup")
          .select("vendedores")
          .eq("user_id", user.id)
          .order("updated_at", { ascending: false })
          .limit(1)
          .single();
        if (data?.vendedores) {
          vendedoresLocais = data.vendedores;
          salvarVendedoresLocais(user.id, vendedoresLocais);
        }
        if (error) {
          toast({
            title: "Erro ao buscar vendedores do Supabase",
            description: error.message,
            variant: "destructive",
          });
        }
      }

      setVendedores(vendedoresLocais);

      // Carregar lojas para seleção (ajuste para buscar do localStorage, se necessário)
      const lojasRaw = localStorage.getItem(`converte:lojas:${user.id}`);
      let lojasOptions: LojaOption[] = [];
      if (lojasRaw) {
        try {
          lojasOptions = JSON.parse(lojasRaw);
        } catch {
          lojasOptions = [];
        }
      }
      setLojas(lojasOptions);
    };
    init();
    // eslint-disable-next-line
  }, []);

  // Sincronização automática a cada 30 minutos
  useEffect(() => {
    if (!userId || !vendedores.length) return;
    if (syncIntervalRef.current) clearInterval(syncIntervalRef.current);
    syncIntervalRef.current = setInterval(() => {
      sincronizarComBanco(userId, vendedores);
    }, 30 * 60 * 1000); // 30 minutos
    return () => {
      if (syncIntervalRef.current) clearInterval(syncIntervalRef.current);
    };
  }, [userId, vendedores]);

  // Adiciona ou edita um vendedor
  const salvarVendedor = (vendedor: Vendedor) => {
    if (!userId) return;
    let novosVendedores: Vendedor[];
    if (editingVendedor) {
      // Editar
      novosVendedores = vendedores.map((v) => (v.id === vendedor.id ? vendedor : v));
    } else {
      // Adicionar
      novosVendedores = [...vendedores, vendedor];
    }
    setVendedores(novosVendedores);
    salvarVendedoresLocais(userId, novosVendedores);
    sincronizarComBanco(userId, novosVendedores); // backup imediato
    setIsDialogOpen(false);
    setEditingVendedor(null);
  };

  // Exclui um vendedor
  const excluirVendedor = (id: string) => {
    if (!userId) return;
    const novosVendedores = vendedores.filter((v) => v.id !== id);
    setVendedores(novosVendedores);
    salvarVendedoresLocais(userId, novosVendedores);
    sincronizarComBanco(userId, novosVendedores); // backup imediato
  };

  // Abre o modal para editar
  const editarVendedor = (vendedor: Vendedor) => {
    setEditingVendedor(vendedor);
    setIsDialogOpen(true);
  };

  // Abre o modal para adicionar
  const novoVendedor = () => {
    setEditingVendedor(null);
    setIsDialogOpen(true);
  };

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Vendedores</h1>
        <Button onClick={novoVendedor}>Novo Vendedor</Button>
      </div>
      <ul>
        {vendedores.map((vendedor) => (
          <li key={vendedor.id} className="flex justify-between items-center border-b py-2">
            <span>
              {vendedor.nome}{" "}
              <span className="text-xs text-muted-foreground">
                ({lojas.find((l) => l.id === vendedor.lojaId)?.nome || "Sem loja"})
              </span>
            </span>
            <div>
              <Button variant="outline" size="sm" onClick={() => editarVendedor(vendedor)}>
                Editar
              </Button>
              <Button
                variant="destructive"
                size="sm"
                className="ml-2"
                onClick={() => excluirVendedor(vendedor.id)}
              >
                Excluir
              </Button>
            </div>
          </li>
        ))}
      </ul>
      {/* Modal de adicionar/editar vendedor (exemplo simples, substitua pelo seu dialog/modal) */}
      {isDialogOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded shadow-lg min-w-[300px]">
            <h2 className="text-lg font-bold mb-2">
              {editingVendedor ? "Editar Vendedor" : "Novo Vendedor"}
            </h2>
            {/* Formulário simples, ajuste conforme seu modelo */}
            <input
              className="border p-2 w-full mb-2"
              placeholder="Nome do vendedor"
              value={editingVendedor?.nome ?? ""}
              onChange={(e) =>
                setEditingVendedor((prev) =>
                  prev
                    ? { ...prev, nome: e.target.value }
                    : {
                        id: crypto.randomUUID(),
                        nome: e.target.value,
                        lojaId: lojas[0]?.id || "",
                        user_id: userId!,
                      }
                )
              }
            />
            <select
              className="border p-2 w-full mb-2"
              value={editingVendedor?.lojaId ?? ""}
              onChange={(e) =>
                setEditingVendedor((prev) =>
                  prev ? { ...prev, lojaId: e.target.value } : prev
                )
              }
            >
              <option value="">Selecione a loja</option>
              {lojas.map((loja) => (
                <option key={loja.id} value={loja.id}>
                  {loja.nome}
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
                    editingVendedor &&
                    editingVendedor.nome.trim() &&
                    editingVendedor.lojaId
                  ) {
                    salvarVendedor(editingVendedor);
                  } else {
                    toast({
                      title: "Erro",
                      description: "Nome e loja obrigatórios.",
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

export default Vendedores;