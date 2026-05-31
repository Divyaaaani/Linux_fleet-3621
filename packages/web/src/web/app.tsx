import { Route, Switch } from "wouter";
import Index from "./pages/index";
import NodesPage from "./pages/nodes";
import NodeDetail from "./pages/node-detail";
import AlertsPage from "./pages/alerts";
import OnboardingPage from "./pages/onboarding";
import GrafanaPage from "./pages/grafana";
import { Provider } from "./components/provider";

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
    </Provider>
  );
}

export default App;
