import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/lib/auth";
import Landing from "./pages/Landing";
import Demo from "./pages/Demo";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import SupplyDashboard from "./pages/SupplyDashboard";
import DemandDashboard from "./pages/DemandDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import MyProjects from "./pages/MyProjects";
import ProjectManage from "./pages/ProjectManage";
import AccountSettings from "./pages/AccountSettings";
import Pitch from "./pages/Pitch";
import NotFound from "./pages/NotFound";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfUse from "./pages/TermsOfUse";
import JoinKolektiv from "./pages/JoinKolektiv";
import Connect from "./pages/Connect";
import PlanGRG from "./pages/PlanGRG";
import PlanWBS from "./pages/PlanWBS";
import { KutQuickLinks } from "./components/KutQuickLinks";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/demo" element={<Demo />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/supply" element={<SupplyDashboard />} />
            <Route path="/demand" element={<DemandDashboard />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/my-projects" element={<MyProjects />} />
            <Route path="/project/:projectId" element={<ProjectManage />} />
            <Route path="/account" element={<AccountSettings />} />
            <Route path="/pitch" element={<Pitch />} />
            <Route path="/join-kolektiv" element={<JoinKolektiv />} />
            <Route path="/connect" element={<Connect />} />
            <Route path="/plan/grg-mica" element={<PlanGRG />} />
            <Route path="/plan/grg-mica-wbs" element={<PlanWBS />} />
            <Route path="/privacy" element={<PrivacyPolicy />} />
            <Route path="/terms" element={<TermsOfUse />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
          <KutQuickLinks />
        </TooltipProvider>
      </AuthProvider>
    </BrowserRouter>
  </QueryClientProvider>
);

export default App;
