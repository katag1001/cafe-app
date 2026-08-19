import { BrowserRouter, Route, Routes } from 'react-router-dom'
import './App.css'

import Header from './components/general/Header'
import Homepage from './pages/Homepage'
import Login from './pages/Login'
import Register from './pages/Register'
import NewCafe from './pages/NewCafe'

function App() {
  return (
    <BrowserRouter>
      <Header />

      <Routes>
        <Route path="/*" element={<Homepage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/newcafe" element={<NewCafe />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
