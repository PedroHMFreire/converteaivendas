import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Store, Users } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { authService } from "@/lib/auth";
import { toast } from "@/components/ui/use-toast";

/* =========================
   Tipos
========================= */
type Loja = { id: string; nome: string; ticketMedio?: number }; // ← agora com ticketMedio
type Vendedor = { id: string; nome: string; lojaId: string };

/* =========================
   localStorage helpers
========================= */
const LOCAL_KEY_LOJAS = "converte:lojas:";
const LOCAL_KEY_VENDEDORES = "converte:vendedores:";

function getLocalKey(base: string, userId: string) {
  return `${base}${userId}`;
}
function salvarLocais<T>(base: string, userId: string, dados: T[]) {
  localStorage.setItem(getLocalKey(base, userId), JSON.stringify(dados));
}
function carregarLocais<T>(base: string, userId: string): T[] {
  const raw = localStorage.getItem(getLocalKey(base, userId));
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

/* =========================
   Utils
========================= */
const brl = (n?: number) =>
  typeof n === "number"
    ? n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 2 })
    : "-";

/* =========================
   Persistência (Supabase)
========================= */
async function upsertCadastros(userId: string, lojas: Loja[], vendedores: Vendedor[]) {
  try {
    const { error } = await supabase
      .from("cadastros")
      .upsert(
        [
          {
            user_id: userId,
            lojas,
            vendedores,
            updated_at: new Date().toISOString(),
          },
        ],
        { onConflict: "user_id" }
      );
    if (error) throw error;
  } catch (err: any) {
    console.error("[SUPABASE] Erro ao salvar cadastros:", err);
    throw err;
  }
}

/* =========================
   Componentes de lista
========================= */
function CadastroLojas({
  lojas,
  onAdd,
  onEdit,
  onDelete,
}: {
  lojas: Loja[];
  onAdd: () => void;
  onEdit: (item: Loja) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="bg-white dark:bg-zinc-900 rounded-xl shadow p-6 flex flex-col">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Store className="w-5 h-5" /> Lojas
        </h2>
        <Button onClick={onAdd} size="sm" className="flex items-center gap-1">
          <Plus className="w-4 h-4" /> Nova
        </Button>
      </div>
      <ul className="divide-y divide-gray-200 dark:divide-zinc-800">
        {lojas.length === 0 && (
          <li className="text-center text-gray-400 py-8">Nenhuma loja cadastrada.</li>
        )}
        {lojas.map((item) => (
          <li key={item.id} className="flex justify-between items-center py-3">
            <div className="flex flex-col">
              <span className="font-medium">{item.nome}</span>
              <span className="text-xs text-gray-500">
                Ticket médio: <strong>{brl(item.ticketMedio)}</strong>
              </span>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => onEdit(item)}>
                Editar
              </Button>
              <Button variant="destructive" size="sm" onClick={() => onDelete(item.id)}>
                Excluir
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function CadastroVendedores({
  vendedores,
  lojas,
  onAdd,
  onEdit,
  onDelete,
}: {
  vendedores: Vendedor[];
  lojas: Loja[];
  onAdd: () => void;
  onEdit: (item: Vendedor) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="bg-white dark:bg-zinc-900 rounded-xl shadow p-6 flex flex-col">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Users className="w-5 h-5" /> Vendedores
        </h2>
        <Button onClick={onAdd} size="sm" className="flex items-center gap-1" disabled={lojas.length === 0}>
          <Plus className="w-4 h-4" /> Novo
        </Button>
      </div>
      {lojas.length === 0 && (
        <div className="text-sm text-yellow-600 dark:text-yellow-300 mb-4">
          Cadastre pelo menos uma loja antes de adicionar vendedores.
        </div>
      )}
      <ul className="divide-y divide-gray-200 dark:divide-zinc-800">
        {vendedores.length === 0 && (
          <li className="text-center text-gray-400 py-8">Nenhum vendedor cadastrado.</li>
        )}
        {vendedores.map((item) => (
          <li key={item.id} className="flex justify-between items-center py-3">
            <span className="font-medium">
              {item.nome}
              <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                ({lojas.find((l) => l.id === item.lojaId)?.nome || "Loja não encontrada"})
              </span>
            </span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => onEdit(item)}>
                Editar
              </Button>
              <Button variant="destructive" size="sm" onClick={() => onDelete(item.id)}>
                Excluir
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* =========================
   Página
========================= */
export default function Cadastros() {
  const [aba, setAba] = useState<"lojas" | "vendedores">("lojas");
  const [lojas, setLojas] = useState<Loja[]>([]);
  const [vendedores, setVendedores] = useState<Vendedor[]>([]);
  const [modal, setModal] = useState<{
    tipo: "loja" | "vendedor";
    modo: "novo" | "editar";
    aberto: boolean;
    item?: Loja | Vendedor;
  }>({ tipo: "loja", modo: "novo", aberto: false });

  // campos do modal
  const [nome, setNome] = useState("");
  const [lojaId, setLojaId] = useState(""); // Para vendedor
  const [ticketMedioInput, setTicketMedioInput] = useState<string>(""); // ← input do ticket

  const [userId, setUserId] = useState<string | null>(null);

  // Carrega do Supabase (cadastros) ao montar
  useEffect(() => {
    (async () => {
      const user = await authService.getCurrentUser();
      if (!user?.id) {
        toast({ title: "Erro", description: "Usuário não autenticado.", variant: "destructive" });
        return;
      }
      setUserId(user.id);

      // Busca oficial
      const { data, error } = await supabase
        .from("cadastros")
        .select("lojas, vendedores")
        .eq("user_id", user.id)
        .limit(1)
        .single();

      if (error && error.code !== "PGRST116") {
        // PGRST116 = row not found (ok, seguimos para localStorage)
        console.error("[SUPABASE] Erro ao ler cadastros:", error);
        toast({ title: "Erro ao buscar cadastros do Supabase", description: error.message, variant: "destructive" });
      }

      if (data && (Array.isArray(data.lojas) || Array.isArray(data.vendedores))) {
        const lojasDb = (data.lojas || []) as Loja[];
        const vendedoresDb = (data.vendedores || []) as Vendedor[];
        setLojas(lojasDb);
        setVendedores(vendedoresDb);
        salvarLocais(LOCAL_KEY_LOJAS, user.id, lojasDb);
        salvarLocais(LOCAL_KEY_VENDEDORES, user.id, vendedoresDb);
      } else {
        // Fallback: localStorage
        const lojasLocal = carregarLocais<Loja>(LOCAL_KEY_LOJAS, user.id);
        const vendedoresLocal = carregarLocais<Vendedor>(LOCAL_KEY_VENDEDORES, user.id);
        setLojas(lojasLocal);
        setVendedores(vendedoresLocal);
      }
    })();
  }, []);

  // Salva automaticamente no Supabase sempre que mudar (se houver dados)
  useEffect(() => {
    (async () => {
      if (!userId) return;
      try {
        // Evita gravar "vazio absoluto" sem necessidade
        if (lojas.length === 0 && vendedores.length === 0) return;
        await upsertCadastros(userId, lojas, vendedores);
      } catch (e: any) {
        toast({ title: "Erro ao salvar cadastros", description: String(e), variant: "destructive" });
      }
    })();
  }, [lojas, vendedores, userId]);

  /* ===== CRUD Lojas ===== */
  const handleAddLoja = () => {
    setModal({ tipo: "loja", modo: "novo", aberto: true });
    setNome("");
    setTicketMedioInput(""); // limpa o ticket
  };
  const handleEditLoja = (loja: Loja) => {
    setModal({ tipo: "loja", modo: "editar", aberto: true, item: loja });
    setNome(loja.nome);
    setTicketMedioInput(loja.ticketMedio !== undefined ? String(loja.ticketMedio) : "");
  };
  const handleDeleteLoja = (id: string) => {
    if (!userId) return;
    // Ao excluir loja, remova vendedores dessa loja
    const novasLojas = lojas.filter((l) => l.id !== id);
    const novosVendedores = vendedores.filter((v) => v.lojaId !== id);
    setLojas(novasLojas);
    setVendedores(novosVendedores);
    salvarLocais(LOCAL_KEY_LOJAS, userId, novasLojas);
    salvarLocais(LOCAL_KEY_VENDEDORES, userId, novosVendedores);
  };

  /* ===== CRUD Vendedores ===== */
  const handleAddVendedor = () => {
    setModal({ tipo: "vendedor", modo: "novo", aberto: true });
    setNome("");
    setLojaId(lojas[0]?.id || "");
  };
  const handleEditVendedor = (v: Vendedor) => {
    setModal({ tipo: "vendedor", modo: "editar", aberto: true, item: v });
    setNome(v.nome);
    setLojaId(v.lojaId);
  };
  const handleDeleteVendedor = (id: string) => {
    if (!userId) return;
    const novosVendedores = vendedores.filter((v) => v.id !== id);
    setVendedores(novosVendedores);
    salvarLocais(LOCAL_KEY_VENDEDORES, userId, novosVendedores);
  };

  /* ===== Salvar do modal ===== */
  const handleSalvar = () => {
    if (!userId || !nome.trim()) return;

    if (modal.tipo === "loja") {
      const parsedTicket = ticketMedioInput.trim() === "" ? undefined : Math.max(0, Number(ticketMedioInput));
      let novasLojas: Loja[] = [];

      if (modal.modo === "novo") {
        novasLojas = [...lojas, { id: crypto.randomUUID(), nome, ticketMedio: parsedTicket }];
      } else if (modal.item) {
        novasLojas = lojas.map((l) =>
          l.id === (modal.item as Loja).id ? { ...l, nome, ticketMedio: parsedTicket } : l
        );
      }

      setLojas(novasLojas);
      if (userId) salvarLocais(LOCAL_KEY_LOJAS, userId, novasLojas);
    } else {
      if (!lojaId) return;
      let novosVendedores: Vendedor[] = [];

      if (modal.modo === "novo") {
        novosVendedores = [...vendedores, { id: crypto.randomUUID(), nome, lojaId }];
      } else if (modal.item) {
        novosVendedores = vendedores.map((v) =>
          v.id === (modal.item as Vendedor).id ? { ...v, nome, lojaId } : v
        );
      }

      setVendedores(novosVendedores);
      if (userId) salvarLocais(LOCAL_KEY_VENDEDORES, userId, novosVendedores);
    }

    setModal({ ...modal, aberto: false });
    setNome("");
    setLojaId("");
    setTicketMedioInput("");
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-2 md:px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Cadastros</h1>

      {/* Abas */}
      <div className="flex gap-2 mb-8">
        <button
          className={`px-4 py-2 rounded-t-lg font-semibold transition ${
            aba === "lojas"
              ? "bg-white dark:bg-zinc-900 border-b-2 border-blue-600 text-blue-700 dark:text-blue-300"
              : "bg-gray-100 dark:bg-zinc-800 text-gray-500"
          }`}
          onClick={() => setAba("lojas")}
        >
          Lojas
        </button>
        <button
          className={`px-4 py-2 rounded-t-lg font-semibold transition ${
            aba === "vendedores"
              ? "bg-white dark:bg-zinc-900 border-b-2 border-blue-600 text-blue-700 dark:text-blue-300"
              : "bg-gray-100 dark:bg-zinc-800 text-gray-500"
          }`}
          onClick={() => setAba("vendedores")}
        >
          Vendedores
        </button>
      </div>

      {/* Conteúdo das abas */}
      <div>
        {aba === "lojas" ? (
          <CadastroLojas lojas={lojas} onAdd={handleAddLoja} onEdit={handleEditLoja} onDelete={handleDeleteLoja} />
        ) : (
          <CadastroVendedores vendedores={vendedores} lojas={lojas} onAdd={handleAddVendedor} onEdit={handleEditVendedor} onDelete={handleDeleteVendedor} />
        )}
      </div>

      {/* Modal */}
      {modal.aberto && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" aria-modal="true" role="dialog">
          <div className="bg-white dark:bg-zinc-900 p-6 rounded shadow-lg min-w-[320px]">
            <h2 className="text-lg font-bold mb-3">
              {modal.modo === "novo"
                ? modal.tipo === "loja"
                  ? "Nova Loja"
                  : "Novo Vendedor"
                : modal.tipo === "loja"
                ? "Editar Loja"
                : "Editar Vendedor"}
            </h2>

            {/* Campo nome (sempre) */}
            <input
              className="border rounded p-2 w-full mb-3 dark:bg-zinc-800 dark:text-white"
              placeholder={modal.tipo === "loja" ? "Nome da loja" : "Nome do vendedor"}
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              autoFocus
            />

            {/* Campo ticket médio (somente para loja) */}
            {modal.tipo === "loja" && (
              <div className="mb-3">
                <label className="block text-xs font-bold mb-1">Ticket médio (R$)</label>
                <input
                  className="border rounded p-2 w-full dark:bg-zinc-800 dark:text-white"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  step={1}
                  placeholder="Ex.: 180"
                  value={ticketMedioInput}
                  onChange={(e) => setTicketMedioInput(e.target.value)}
                />
                <p className="text-[11px] text-gray-500 mt-1">Usado para calcular o <em>valor perdido</em> no Raio-X de Vendas.</p>
              </div>
            )}

            {/* Select de loja (somente para vendedor) */}
            {modal.tipo === "vendedor" && (
              <select
                className="border rounded p-2 w-full mb-3 dark:bg-zinc-800 dark:text-white"
                value={lojaId}
                onChange={(e) => setLojaId(e.target.value)}
              >
                {lojas.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.nome}
                  </option>
                ))}
              </select>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setModal({ ...modal, aberto: false })}>
                Cancelar
              </Button>
              <Button onClick={handleSalvar}>Salvar</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
