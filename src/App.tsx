import { useState } from "react";
import { ShieldCheck, Calculator, Search, FileText, Users, Settings, LogOut } from "lucide-react";
import { Toaster } from "sonner";
import { useAuth } from "./hooks/useAuth";
import Login from "./components/Login";
import CalculadoraDiarias from "./components/CalculadoraDiarias";
import ConsultaRapida from "./components/ConsultaRapida";
import RelatoriosDiarias from "./components/RelatoriosDiarias";
import GerenciarCredores from "./components/GerenciarCredores";
import PainelAdmin from "./components/PainelAdmin";

type Aba = "consulta" | "calculadora" | "relatorios" | "credores" | "admin";

const abas: { id: Aba; label: string; icon: React.ReactNode; permissao: string }[] = [
  { id: "consulta", label: "Consulta Rápida", icon: <Search className="h-4 w-4" />, permissao: "consulta" },
  { id: "calculadora", label: "Calculadora", icon: <Calculator className="h-4 w-4" />, permissao: "calculadora" },
  { id: "relatorios", label: "Relatórios", icon: <FileText className="h-4 w-4" />, permissao: "relatorios" },
  { id: "credores", label: "Credores", icon: <Users className="h-4 w-4" />, permissao: "credores" },
  { id: "admin", label: "Admin", icon: <Settings className="h-4 w-4" />, permissao: "admin" },
];

export default function App() {
  const { loading, isAuthenticated, hasPermissao, logout, user } = useAuth();
  const [abaAtiva, setAbaAtiva] = useState<Aba>("calculadora");

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login />;
  }

  const abasPermitidas = abas.filter((aba) => hasPermissao(aba.permissao));

  return (
    <div className="min-h-screen bg-gray-50">
      <Toaster position="top-right" />
      
      <header className="bg-blue-900 text-white sticky top-0 z-10">
        <div className="mx-auto max-w-[1400px] px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-white/15">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-widest opacity-80">
                  Polícia Militar do Acre · PMAC
                </p>
                <h1 className="font-serif text-base font-semibold leading-tight">
                  Sistema de Diárias
                </h1>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm hidden sm:inline">
                {user?.email?.split("@")[0]}
                {user?.role === "admin" && <span className="ml-1 text-xs bg-yellow-500 px-1 rounded">Admin</span>}
              </span>
              <button
                onClick={logout}
                className="flex items-center gap-1 rounded-md bg-white/10 px-3 py-1 text-sm hover:bg-white/20"
              >
                <LogOut className="h-4 w-4" />
                Sair
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="border-b bg-white shadow-sm sticky top-[60px] z-10">
        <div className="mx-auto max-w-[1400px] px-6">
          <div className="flex gap-1 overflow-x-auto">
            {abasPermitidas.map((aba) => (
              <button
                key={aba.id}
                onClick={() => setAbaAtiva(aba.id)}
                className={`
                  flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors
                  border-b-2 whitespace-nowrap
                  ${abaAtiva === aba.id 
                    ? "border-blue-600 text-blue-600" 
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }
                `}
              >
                {aba.icon}
                {aba.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-[1400px] px-6 py-6">
        {abaAtiva === "consulta" && <ConsultaRapida />}
        {abaAtiva === "calculadora" && <CalculadoraDiarias />}
        {abaAtiva === "relatorios" && <RelatoriosDiarias />}
        {abaAtiva === "credores" && <GerenciarCredores />}
        {abaAtiva === "admin" && hasPermissao("admin") && <PainelAdmin />}
      </main>
    </div>
  );
}