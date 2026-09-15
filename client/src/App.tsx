import { Route, Switch } from "wouter";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import ErrorBoundary from "@/components/ErrorBoundary";
import NotFound from "@/pages/NotFound";
import AnalyticsStudio from "@/pages/AnalyticsStudio";
import Customers from "@/pages/Customers";
import CustomerDetail from "@/pages/CustomerDetail";
import Usage from "@/pages/Usage";
import { Invoices, ProductsPlans, Subscriptions, Team } from "@/pages/Management";
import Settings from "@/pages/Settings";
import Login from "@/pages/Login";
import { AppProvider } from "@/contexts/AppContext";

function Router() {
  return (
    <Switch>
      <Route path="/" component={AnalyticsStudio} />
      <Route path="/analytics" component={AnalyticsStudio} />
      <Route path="/customers" component={Customers} />
      <Route path="/customers/:id" component={CustomerDetail} />
      <Route path="/usage" component={Usage} />
      <Route path="/subscriptions" component={Subscriptions} />
      <Route path="/products" component={ProductsPlans} />
      <Route path="/invoices" component={Invoices} />
      <Route path="/team" component={Team} />
      <Route path="/settings" component={Settings} />
      <Route path="/login" component={Login} />
      <Route component={NotFound} />
    </Switch>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppProvider>
        <TooltipProvider delayDuration={180}>
          <Router />
          <Toaster position="bottom-right" richColors closeButton />
        </TooltipProvider>
      </AppProvider>
    </ErrorBoundary>
  );
}
