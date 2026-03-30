import { BrowserRouter, Routes, Route } from "react-router-dom"
import HomeScreen from "./components/HomeScreen"
import ChatScreen from "./components/ChatScreen"
import AnalysisScreen from "./components/AnalysisScreen"
import PrechatScreen from "./components/PrechatScreen"

export default function App() {
  return (
    <BrowserRouter>
      {/* Ambient background blobs — fixed, behind everything */}
      <div className="blob blob-teal" />
      <div className="blob blob-sand" />
      <div className="blob blob-rose" />

      <div className="relative z-10">
        <Routes>
          <Route path="/" element={<HomeScreen />} />
          <Route path="/prechat" element={<PrechatScreen />} />
          <Route path="/chat" element={<ChatScreen />} />
          <Route path="/analysis" element={<AnalysisScreen />} />
        </Routes>
      </div>
    </BrowserRouter>
  )
}
