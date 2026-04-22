import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx"; // 우리가 만든 App.jsx를 불러옵니다.

const rootElement = document.getElementById("root")!;
const root = ReactDOM.createRoot(rootElement);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
