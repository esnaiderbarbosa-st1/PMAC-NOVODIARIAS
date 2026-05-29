import { useEffect, useState } from "react";

export function useAuth() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem("diarias_user");
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  const login = async (email: string, senha: string) => {
    try {
      // Admin padrão
      const adminEmail = "esnaider.barbosa@gmail.com";
      
      if (email === adminEmail && senha.length >= 3) {
        const userData = {
          id: "admin-id",
          email: adminEmail,
          role: "admin",
          permissoes: ["calculadora", "consulta", "relatorios", "credores", "admin"]
        };
        
        localStorage.setItem("diarias_user", JSON.stringify(userData));
        setUser(userData);
        
        setTimeout(() => {
          window.location.reload();
        }, 500);
        
        return { data: { user: userData } };
      }
      
      throw new Error("Usuário não encontrado");
    } catch (error: any) {
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem("diarias_user");
    setUser(null);
    window.location.reload();
  };

  const isAuthenticated = !!user;
  const isAdmin = user?.role === "admin";
  const hasPermissao = (permissao: string) => {
    if (isAdmin) return true;
    return user?.permissoes?.includes(permissao) ?? false;
  };

  return {
    user,
    loading,
    login,
    logout,
    isAdmin,
    isAuthenticated,
    hasPermissao,
  };
}