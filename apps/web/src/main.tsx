import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./app.tsx";
import { DataProvider, AppProvider } from "./context";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AppProvider>
      <DataProvider>
        <App />
      </DataProvider>
    </AppProvider>
  </React.StrictMode>
);
