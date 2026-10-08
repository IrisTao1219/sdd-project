import { Link, NavLink, Route, Routes } from 'react-router-dom';
import { DishDetailPage, HomePage, NotFoundPage, RecommendationPage, RestaurantDetailPage } from './pages';
import './styles.css';

export default function App() {
  return (
    <div className="app-shell">
      <header className="site-header">
        <Link className="brand" to="/" aria-label="食光指南首页"><span className="brand-mark" aria-hidden="true">食</span><span>食光指南</span></Link>
        <nav aria-label="主导航"><NavLink to="/" end>餐饮浏览</NavLink><NavLink to="/recommend">帮我推荐</NavLink></nav>
        <span className="mvp-badge">MVP · 校园限定</span>
      </header>
      <main><Routes><Route path="/" element={<HomePage />} /><Route path="/recommend" element={<RecommendationPage />} /><Route path="/restaurants/:id" element={<RestaurantDetailPage />} /><Route path="/dishes/:id" element={<DishDetailPage />} /><Route path="*" element={<NotFoundPage />} /></Routes></main>
      <footer><span>食光指南</span><p>先解决今天吃什么，再慢慢认识整座校园。</p></footer>
    </div>
  );
}
