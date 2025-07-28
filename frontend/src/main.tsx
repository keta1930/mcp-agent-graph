import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  // 暂时移除 StrictMode 来测试是否解决了重复渲染问题
  // <StrictMode>
    <App />
  // </StrictMode>,
)
