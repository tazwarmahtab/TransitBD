import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { AnimatePresence } from "framer-motion";

// Providers
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { TutorialProvider } from "@/hooks/use-tutorial";
import { queryClient } from "./lib/queryClient";

// Components
import { Toaster } from "@/components/ui/toaster";
import { ProtectedRoute } from "@/lib/protected-route";
import { TutorialTooltip } from "@/components/ui/tutorial-tooltip";
import { BackgroundPattern } from "@/components/ui/background-pattern";
import { VoiceAssistant } from "@/components/ui/voice-assistant";

// Pages
import HomePage from "@/pages/home-page";
import AuthPage from "@/pages/auth-page";
import DashboardPage from "@/pages/dashboard";
import TransitCardPage from "@/pages/transit-card";
import NotFound from "@/pages/not-found";

function Router() {
  const { user } = useAuth();

  return (
    <AnimatePresence mode="wait">
      <Switch>
        <Route path="/" component={HomePage} />
        <Route path="/auth" component={user ? DashboardPage : AuthPage} />
        <ProtectedRoute path="/dashboard" component={DashboardPage} />
        <ProtectedRoute path="/transit-card" component={TransitCardPage} />
        <Route component={NotFound} />
      </Switch>
    </AnimatePresence>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TutorialProvider>
          <BackgroundPattern />
          <Router />
          <VoiceAssistant />
          <Toaster />
        </TutorialProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;