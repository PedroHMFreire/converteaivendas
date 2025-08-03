import { useEffect, useState, useRef } from "react";
import { toast } from "@/components/ui/use-toast";
import { supabase } from "@/lib/supabaseClient";
import { authService } from "@/lib/auth";
import { Button } from "@/components/ui/button";

// Chave base para salvar lojas locais por usuário
const LOCAL_KEY = "converte:lojas:";

// Utilitário para obter a chave localStorage por usuário
function getLocalKey(userId: string) {
  return `${LOCAL_KEY}${userId}`;
}

// Função para salvar lojas locais
function salvarLojasLocais(userId: string, lojas: Loja[]) {
  localStorage.setItem(getLocalKey(userId), JSON.stringify(lojas));
}

// Função para carregar lojas locais
function carregarLojasLocais(userId: string): Loja[] {
  const raw = localStorage.getItem(getLocalKey(userId));
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

// Função para sincronizar lojas locais com Supabase (backup)
async function sincronizarComBanco(userId: string, lojas: Loja[]) {
  try {
    await supabase
      .from("lojas_backup")
      .upsert([{ user_id: userId, lojas, updated_at: new Date().toISOString() }]);
  } catch (err) {
    console.error("Erro ao sincronizar lojas com banco:", err);
  }
}

// Tipo Loja (ajuste conforme seu modelo)
type Loja = {
  id: string;
  nome: string;
  // ...outros campos...
};

const Lojas = () => {
  const [lojas, setLojas] = useState<Loja[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingLoja, setEditingLoja] = useState<Loja | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Carrega lojas locais ao abrir a página
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
      let lojasLocais = carregarLojasLocais(user.id);

      // 2. Se não houver dados locais, busca do Supabase (fallback) e salva localmente
      if (!lojasLocais.length) {
        const { data, error } = await supabase
          .from("lojas_backup")
          .select("lojas")
          .eq("user_id", user.id)
          .order("updated_at", { ascending: false })
          .limit(1)
          .single();
        if (data?.lojas) {
          lojasLocais = data.lojas;
          salvarLojasLocais(user.id, lojasLocais);
        }
        if (error) {
          toast({
            title: "Erro ao buscar lojas do Supabase",
            description: error.message,
            variant: "destructive",
          });
        }
      }

      setLojas(lojasLocais);
    };
    init();
    // eslint-disable-next-line
  }, []);

  // Sincronização automática a cada 30 minutos
  useEffect(() => {
    if (!userId || !lojas.length) return;
    if (syncIntervalRef.current) clearInterval(syncIntervalRef.current);
    syncIntervalRef.current = setInterval(() => {
      sincronizarComBanco(userId, lojas);
    }, 10 * 60 * 1000); // 30 minutos
    return () => {
      if (syncIntervalRef.current) clearInterval(syncIntervalRef.current);
    };
  }, [userId, lojas]);

  // Adiciona ou edita uma loja
  const salvarLoja = (loja: Loja) => {
    if (!userId) return;
    let novasLojas: Loja[];
    if (editingLoja) {
      // Editar
      novasLojas = lojas.map((l) => (l.id === loja.id ? loja : l));
    } else {
      // Adicionar
      novasLojas = [...lojas, loja];
    }
    setLojas(novasLojas);
    salvarLojasLocais(userId, novasLojas);
    sincronizarComBanco(userId, novasLojas); // backup imediato
    setIsDialogOpen(false);
    setEditingLoja(null);
  };

  // Exclui uma loja
  const excluirLoja = (id: string) => {
    if (!userId) return;
    const novasLojas = lojas.filter((l) => l.id !== id);
    setLojas(novasLojas);
    salvarLojasLocais(userId, novasLojas);
    sincronizarComBanco(userId, novasLojas); // backup imediato
  };

  // Abre o modal para editar
  const editarLoja = (loja: Loja) => {
    setEditingLoja(loja);
    setIsDialogOpen(true);
  };

  // Abre o modal para adicionar
  const novaLoja = () => {
    setEditingLoja(null);
    setIsDialogOpen(true);
  };

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Lojas</h1>
        <Button onClick={novaLoja}>Nova Loja</Button>
      </div>
      <ul>
        {lojas.map((loja) => (
          <li key={loja.id} className="flex justify-between items-center border-b py-2">
            <span>{loja.nome}</span>
            <div>
              <Button variant="outline" size="sm" onClick={() => editarLoja(loja)}>
                Editar
              </Button>
              <Button
                variant="destructive"
                size="sm"
                className="ml-2"
                onClick={() => excluirLoja(loja.id)}
              >
                Excluir
              </Button>
            </div>
          </li>
        ))}
      </ul>
      {/* Modal de adicionar/editar loja (exemplo simples, substitua pelo seu dialog/modal) */}
      {isDialogOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded shadow-lg min-w-[300px]">
            <h2 className="text-lg font-bold mb-2">
              {editingLoja ? "Editar Loja" : "Nova Loja"}
            </h2>
            {/* Formulário simples, ajuste conforme seu modelo */}
            <input
              className="border p-2 w-full mb-2"
              placeholder="Nome da loja"
              value={editingLoja?.nome ?? ""}
              onChange={(e) =>
                setEditingLoja((prev) =>
                  prev ? { ...prev, nome: e.target.value } : { id: crypto.randomUUID(), nome: e.target.value }
                )
              }
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button
                onClick={() => {
                  if (editingLoja && editingLoja.nome.trim()) {
                    salvarLoja(editingLoja);
                  } else {
                    toast({
                      title: "Erro",
                      description: "Nome da loja obrigatório.",
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

export default Lojas;