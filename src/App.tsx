import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Layout from "@/components/Layout";
import Dashboard from "@/pages/Dashboard";
import BillingRules from "@/pages/billing/BillingRules";
import RateTable from "@/pages/billing/RateTable";
import BillingCalculator from "@/pages/billing/BillingCalculator";
import InvoiceList from "@/pages/billing/InvoiceList";
import InvoiceDetail from "@/pages/billing/InvoiceDetail";
import ScaffoldList from "@/pages/scaffold/ScaffoldList";
import ScheduleCalendar from "@/pages/scaffold/ScheduleCalendar";
import Inventory from "@/pages/scaffold/Inventory";
import WaitlistQueue from "@/pages/waitlist/WaitlistQueue";
import NotificationLogs from "@/pages/waitlist/NotificationLogs";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="billing">
            <Route index element={<Navigate to="rules" replace />} />
            <Route path="rules" element={<BillingRules />} />
            <Route path="rates" element={<RateTable />} />
            <Route path="calculator" element={<BillingCalculator />} />
          </Route>
          <Route path="scaffold">
            <Route index element={<Navigate to="list" replace />} />
            <Route path="list" element={<ScaffoldList />} />
            <Route path="schedule" element={<ScheduleCalendar />} />
            <Route path="inventory" element={<Inventory />} />
          </Route>
          <Route path="bills">
            <Route index element={<Navigate to="list" replace />} />
            <Route path="list" element={<InvoiceList />} />
            <Route path=":id" element={<InvoiceDetail />} />
          </Route>
          <Route path="waitlist">
            <Route index element={<Navigate to="queue" replace />} />
            <Route path="queue" element={<WaitlistQueue />} />
            <Route path="notifications" element={<NotificationLogs />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Router>
  );
}
