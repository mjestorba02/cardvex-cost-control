import { Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { Dashboard } from '@/pages/Dashboard';
import { BudgetBaseline, ContractBoq, ProjectSummary } from '@/pages/Baseline';
import { EquipmentSheet } from '@/pages/daily/EquipmentSheet';
import { FuelSheet } from '@/pages/daily/FuelSheet';
import { LaborSheet } from '@/pages/daily/LaborSheet';
import { MaterialsSheet } from '@/pages/daily/MaterialsSheet';
import { MaintenanceSheet } from '@/pages/daily/MaintenanceSheet';
import { DailySummary } from '@/pages/DailySummary';
import { Weekly } from '@/pages/Weekly';
import { Accomplishment } from '@/pages/Accomplishment';
import { Variance } from '@/pages/Variance';
import { Monthly } from '@/pages/Monthly';
import { CostVsAccomplishment } from '@/pages/CostVsAccomplishment';
import { Forecast } from '@/pages/Forecast';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="project" element={<ProjectSummary />} />
        <Route path="contract" element={<ContractBoq />} />
        <Route path="budget" element={<BudgetBaseline />} />
        <Route path="daily/equipment" element={<EquipmentSheet />} />
        <Route path="daily/fuel" element={<FuelSheet />} />
        <Route path="daily/labor" element={<LaborSheet />} />
        <Route path="daily/materials" element={<MaterialsSheet />} />
        <Route path="daily/maintenance" element={<MaintenanceSheet />} />
        <Route path="daily/summary" element={<DailySummary />} />
        <Route path="weekly" element={<Weekly />} />
        <Route path="accomplishment" element={<Accomplishment />} />
        <Route path="variance" element={<Variance />} />
        <Route path="monthly" element={<Monthly />} />
        <Route path="cost-vs-accomplishment" element={<CostVsAccomplishment />} />
        <Route path="forecast" element={<Forecast />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
