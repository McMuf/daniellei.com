import { Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import Home from './pages/Home'
import Work from './pages/Work'
import Projects from './pages/Projects'
import Writing from './pages/Writing'
import Post from './pages/Post'
import './App.css'

function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="work" element={<Work />} />
        <Route path="projects" element={<Projects />} />
        <Route path="writing" element={<Writing />} />
        <Route path="writing/:slug" element={<Post />} />
      </Route>
    </Routes>
  )
}

export default App
