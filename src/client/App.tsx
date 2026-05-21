import { NavLink, Navigate, Route, Routes } from 'react-router-dom'
import { SheetPage } from './pages/SheetPage'
import { GanttPage } from './pages/GanttPage'

export function App() {
  return (
    <div className="app">
      <header className="app-header">
        <h1>Calendar App</h1>
        <nav>
          <NavLink to="/sheet" className={({ isActive }) => (isActive ? 'tab active' : 'tab')}>
            シート1 (テーブル)
          </NavLink>
          <NavLink to="/gantt" className={({ isActive }) => (isActive ? 'tab active' : 'tab')}>
            シート2 (ガント)
          </NavLink>
        </nav>
      </header>
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
