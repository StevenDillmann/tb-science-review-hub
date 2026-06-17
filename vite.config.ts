import path from "node:path"
import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"

export default defineConfig({
  // Match the repo name so assets resolve at https://<user>.github.io/tb-science-task-dashboard/
  base: "/tb-science-task-dashboard/",
  plugins: [react()],
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
})
