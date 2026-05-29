import { useState, useEffect } from "react";
import { Users, CheckCircle, XCircle, Trash2, UserCheck, Lock } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "../integrations/supabase/client";
import { useAuth } from "../hooks/useAuth";

interface Usuario {
  id: string;
  email: string;
  nome: string;
  role: string;
  status: string;
  permissoes: string[];
  created_at: string;
}

export default function PainelAdmin() {
  const { isAdmin } = useAuth();
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);

  const carregarUsuarios = async () => {
    const { data, error } = await supabase.from("perfis").select("*").order("created_at", { ascending: false });
    if (!error && data) setUsuarios(data);
  };

  useEffect(() => { if (isAdmin) carregarUsuarios(); }, [isAdmin]);

  const atualizarStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("perfis").update({ status }).eq("id", id);
    if (error) toast.error("Erro ao atualizar");
    else { toast.success(`Usuário ${status === "approved" ? "aprovado" : "rejeitado"}`); carregarUsuarios(); }
  };

  const atualizarRole = async (id: string, role: string) => {
    const { error } = await supabase.from("perfis").update({ role }).eq("id", id);
    if (error) toast.error("Erro ao atualizar permissão");
    else { toast.success(`Permissão alterada`); carregarUsuarios(); }
  };

  const removerUsuario = async (id: string, email: string) => {
    if (confirm(`Deseja remover ${email}?`)) {
      await supabase.from("perfis").delete().eq("id", id);
      toast.success("Usuário removido");
      carregarUsuarios();
    }
  };

  if (!isAdmin) {
    return (
      <div className="rounded-lg border bg-white p-12 text-center">
        <Lock className="mx-auto h-12 w-12 text-red-400" />
        <h2 className="mt-4 text-xl font-semibold">Acesso Negado</h2>
      </div>
    );
  }

  const pendentes = usuarios.filter((u) => u.status === "pending");
  const aprovados = usuarios.filter((u) => u.status === "approved");

  return (
    <div className="space-y-6">
      <div><h2 className="text-xl font-semibold">Painel Administrativo</h2><p className="text-sm text-gray-500">Gerenciamento de usuários</p></div>

      <div className="rounded-lg border bg-white">
        <div className="border-b bg-yellow-50 px-4 py-3">
          <h3 className="font-semibold text-yellow-800 flex items-center gap-2"><UserCheck className="h-4 w-4" /> Pendentes ({pendentes.length})</h3>
        </div>
        {pendentes.length === 0 ? <div className="p-8 text-center text-gray-500">Nenhum usuário pendente</div> :
          pendentes.map((u) => (
            <div key={u.id} className="p-4 flex justify-between items-center border-t">
              <div><p className="font-medium">{u.email}</p></div>
              <div className="flex gap-2">
                <button onClick={() => atualizarStatus(u.id, "approved")} className="flex items-center gap-1 rounded-md bg-green-100 px-3 py-1 text-green-700"><CheckCircle className="h-4 w-4" />Aprovar</button>
                <button onClick={() => atualizarStatus(u.id, "rejected")} className="flex items-center gap-1 rounded-md bg-red-100 px-3 py-1 text-red-700"><XCircle className="h-4 w-4" />Rejeitar</button>
              </div>
            </div>
          ))}
      </div>

      <div className="rounded-lg border bg-white">
        <div className="border-b bg-green-50 px-4 py-3">
          <h3 className="font-semibold text-green-800 flex items-center gap-2"><Users className="h-4 w-4" /> Aprovados ({aprovados.length})</h3>
        </div>
        {aprovados.map((u) => (
          <div key={u.id} className="p-4 border-t">
            <div className="flex justify-between items-start">
              <div><p className="font-medium">{u.email}</p><p className="text-sm text-gray-500">Permissões: {u.permissoes?.join(", ")}</p></div>
              <div className="flex gap-2">
                <select value={u.role} onChange={(e) => atualizarRole(u.id, e.target.value)} className="rounded-md border px-2 py-1 text-sm">
                  <option value="user">Usuário</option>
                  <option value="admin">Admin</option>
                </select>
                <button onClick={() => removerUsuario(u.id, u.email)} className="rounded-md p-1 text-red-500"><Trash2 className="h-4 w-4" /></button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
