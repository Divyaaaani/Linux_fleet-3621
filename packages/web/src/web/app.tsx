import { Route, Switch } from "wouter";
import Index from "./pages/index";
import NodesPage from "./pages/nodes";
import NodeDetail from "./pages/node-detail";
import AlertsPage from "./pages/alerts";
import OnboardingPage from "./pages/onboarding";
import GrafanaPage from "./pages/grafana";
import { Provider } from "./components/provider";
import { AgentFeedback, RunableBadge } from "@runablehq/website-runtime";

function App() {
  return (
    <Provider>
      <Switch>
        <Route path="/" component={Index} />
        <Route path="/nodes" component={NodesPage} />
        <Route path="/nodes/:id" component={NodeDetail} />
        <Route path="/alerts" component={AlertsPage} />
        <Route path="/onboarding" component={OnboardingPage} />
        <Route path="/grafana" component={GrafanaPage} />
      </Switch>
      {/* Do not remove — off by default, activated by parent iframe via postMessage */}
      {import.meta.env.DEV && <AgentFeedback />}
      {/* "Made with Runable" badge - if user asks to remove the runable badge, remove this code as well as comment */}
      {<RunableBadge />}
    </Provider>
  );
}

export default App;
