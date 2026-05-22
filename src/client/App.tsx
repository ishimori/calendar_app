import { Navigate, Route, Routes } from 'react-router-dom'
import { SheetPage } from './pages/SheetPage'
import { GanttPage } from './pages/GanttPage'

export function App() {
  return (
    <div className="app">
      <main className="app-main">
        <Routes>
          <Route path="/" element={<Navigate to="/sheet" replace />} />
          <Route path="/sheet" element={<SheetPage />} />
          <Route path="/gantt" element={<GanttPage />} />
        </Routes>
      </main>
    </div>
  )
}
