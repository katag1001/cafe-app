import { BrowserRouter, Route, Routes } from 'react-router-dom'
import './App.css'

import Header from './components/general/Header'
import Homepage from './pages/Homepage'
import LoginPage  from './pages/LoginPage'
import Register from './pages/Register'
import NewCafe from './pages/NewCafe'
import ViewOneCafe from './components/cafes/view_cafes/ViewOneCafe'

function App() {
  return (
    <BrowserRouter>
      <Header />

      <Routes>
        <Route path="/*" element={<Homepage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<Register />} />
        <Route path="/newcafe" element={<NewCafe />} />
        <Route path="/cafes/:id" element={<ViewOneCafe />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
