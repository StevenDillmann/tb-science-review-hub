import React from "react"
import ReactDOM from "react-dom/client"
import App from "./App"
import "./index.css"

const mql = window.matchMedia("(prefers-color-scheme: dark)")
const applyTheme = (dark: boolean) =>
  document.documentElement.classList.toggle("dark", dark)
applyTheme(mql.matches)
mql.addEventListener("change", (e) => applyTheme(e.matches))

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
