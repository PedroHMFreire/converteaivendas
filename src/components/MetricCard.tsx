import { useEffect, useState } from "react";
import { Smile } from "lucide-react";
import MetricCard from "@/components/MetricCard";
import { calculateDashboardData } from "@/lib/dashboard-utils";

const Dashboard = () => {
  const [dashboardData, setDashboardData] = useState<any>(null);

  useEffect(() => {
    // Substitua pelo método correto para obter o userId no seu app
    const userId = localStorage.getItem("user_id") || "";
    const data = calculateDashboardData(userId);
    setDashboardData(data);
  }, []);

  if (!dashboardData) return null;

  return (
    <div className="w-full max-w-6xl mx-auto px-2 md:px-4 py-8">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <MetricCard
          title="Atendimentos"
          value={dashboardData.totalAtendimentos}
          icon={Smile}
        />
        {/* Os outros cards/gráficos virão aqui nos próximos passos */}
      </div>
    </div>
  );
};

export default Dashboard;