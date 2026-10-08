import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ApiError, getDish, getOptions, getRecommendations, getRestaurant, getRestaurants } from './api';
import type { DishDetail, Options, Preferences, Recommendation, Restaurant, RestaurantDetail } from './types';

type LoadState = 'loading' | 'success' | 'empty' | 'error';
const mealLabels: Record<string, string> = { breakfast: '早餐', lunch: '午餐', dinner: '晚餐', late_night: '夜宵' };
const dayLabels = ['一', '二', '三', '四', '五', '六', '日'];
const formatDistance = (meters: number) => meters < 1000 ? `${meters} 米` : `${(meters / 1000).toFixed(1)} 公里`;

function PageState({ type, title, text, retry }: { type: 'loading' | 'empty' | 'error'; title: string; text: string; retry?: () => void }) {
  return <div className="state-panel" role={type === 'error' ? 'alert' : 'status'}>{type === 'loading' ? <span className="loader" aria-hidden="true" /> : <span className="state-icon" aria-hidden="true">{type === 'error' ? '!' : '○'}</span>}<h3>{title}</h3><p>{text}</p>{retry && <button type="button" onClick={retry}>重新加载</button>}</div>;
}

function RestaurantCard({ restaurant, reasons }: { restaurant: Restaurant; reasons?: Recommendation['reasons'] }) {
  const location = useLocation();
  return (
    <article className="restaurant-card">
      <div className="card-topline"><span className={restaurant.openNow ? 'status open' : 'status closed'}><span className="status-dot" aria-hidden="true" />{restaurant.openNow ? '营业中' : '已打烊'}</span><span className="rating" aria-label={restaurant.rating ? `评分 ${restaurant.rating}` : '暂无评分'}><span aria-hidden="true">★</span> {restaurant.rating ?? '暂无'}</span></div>
      <div><p className="canteen">{restaurant.canteenName}</p><h3><Link to={`/restaurants/${restaurant.id}`} state={{ from: `${location.pathname}${location.search}` }}>{restaurant.name}</Link></h3><p className="description">{restaurant.description ?? '这家档口还没有简介，欢迎到店探索。'}</p></div>
      <div className="tags" aria-label="口味标签">{[...restaurant.cuisines, ...restaurant.flavors].slice(0, 3).map((tag) => <span key={tag}>{tag}</span>)}</div>
      {reasons && <ul className="reason-list">{reasons.map((reason) => <li key={`${reason.type}-${reason.text}`}>{reason.text}</li>)}</ul>}
      <div className="card-footer"><div><strong>¥{restaurant.averagePrice}</strong><small>人均</small></div><div className="place"><span>{restaurant.location}</span><small>距中心教学楼 {formatDistance(restaurant.distanceMeters)}</small></div></div>
      <Link className="card-link" to={`/restaurants/${restaurant.id}`} state={{ from: `${location.pathname}${location.search}` }}>查看详情 <span aria-hidden="true">→</span></Link>
    </article>
  );
}

function updateMulti(params: URLSearchParams, setParams: (next: URLSearchParams) => void, key: string, value: string) {
  const values = (params.get(key) ?? '').split(',').filter(Boolean);
  const next = values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
  const copy = new URLSearchParams(params);
  if (next.length) copy.set(key, next.join(',')); else copy.delete(key);
  setParams(copy);
}

export function HomePage() {
  const [params, setParams] = useSearchParams();
  const [draft, setDraft] = useState(params.get('q') ?? '');
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [options, setOptions] = useState<Options>({ flavors: [], cuisines: [], dietaryWarnings: [], mealPeriods: [] });
  const [state, setState] = useState<LoadState>('loading');
  const [reference, setReference] = useState('校园中心教学楼');
  const [reloadKey, setReloadKey] = useState(0);
  const query = params.toString();

  useEffect(() => { const controller = new AbortController(); getOptions(controller.signal).then((value) => setOptions(value.data)).catch(() => undefined); return () => controller.abort(); }, []);
  useEffect(() => {
    const controller = new AbortController(); setState('loading');
    getRestaurants(new URLSearchParams(query), controller.signal).then((value) => { setRestaurants(value.data); setReference(value.meta.distanceReference); setState(value.data.length ? 'success' : 'empty'); }).catch((error) => { if (!(error instanceof DOMException && error.name === 'AbortError')) setState('error'); });
    return () => controller.abort();
  }, [query, reloadKey]);

  const setParam = (key: string, value: string) => { const copy = new URLSearchParams(params); if (value) copy.set(key, value); else copy.delete(key); setParams(copy); };
  const submitSearch = (event: FormEvent) => { event.preventDefault(); setParam('q', draft.trim()); };
  const activeCount = [...params.keys()].filter((key) => key !== 'sort').length;

  return <>
    <section className="hero compact-hero"><div className="hero-copy"><p className="eyebrow">CAMPUS FOOD GUIDE</p><h1>今天，<em>吃点好的。</em></h1><p className="hero-text">按名称、菜品、口味或预算快速找到这一餐。所有距离均为校园参考距离。</p><Link className="primary-action filled" to="/recommend">不知道吃什么？帮我推荐 <span aria-hidden="true">→</span></Link></div><div className="hero-art" aria-hidden="true"><div className="sun" /><div className="plate"><span className="leaf leaf-one" /><span className="leaf leaf-two" /><span className="food food-one" /><span className="food food-two" /><span className="food food-three" /></div></div></section>
    <section className="catalog-section" id="restaurants">
      <div className="section-heading dark-heading"><div><p className="eyebrow">FIND YOUR FLAVOR</p><h2>校园风味一览</h2></div><p>{state === 'success' || state === 'empty' ? `找到 ${restaurants.length} 个档口` : '正在读取校园菜单'}</p></div>
      <form className="search-bar" onSubmit={submitSearch}><label className="sr-only" htmlFor="search">搜索餐厅、菜品或口味</label><span aria-hidden="true">⌕</span><input id="search" value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="搜索餐厅、菜品、菜系或口味" maxLength={80} /><button type="submit">搜索</button>{params.get('q') && <button className="text-button" type="button" onClick={() => { setDraft(''); setParam('q', ''); }}>清空</button>}</form>
      <div className="catalog-layout">
        <aside className="filter-panel"><div className="filter-title"><h3>筛选条件</h3>{activeCount > 0 && <button type="button" onClick={() => { setParams({}); setDraft(''); }}>全部重置</button>}</div>
          <label>最高预算（元）<input type="number" min="0" max="500" value={params.get('maxPrice') ?? ''} onChange={(event) => setParam('maxPrice', event.target.value)} placeholder="例如 20" /></label>
          <label>最大距离<select value={params.get('maxDistance') ?? ''} onChange={(event) => setParam('maxDistance', event.target.value)}><option value="">不限距离</option><option value="300">300 米内</option><option value="500">500 米内</option><option value="800">800 米内</option><option value="1200">1.2 公里内</option></select></label>
          <label>最低评分<select value={params.get('minRating') ?? ''} onChange={(event) => setParam('minRating', event.target.value)}><option value="">不限评分</option><option value="4">4.0 及以上</option><option value="4.3">4.3 及以上</option><option value="4.5">4.5 及以上</option></select></label>
          <label>用餐时段<select value={params.get('mealPeriod') ?? ''} onChange={(event) => setParam('mealPeriod', event.target.value)}><option value="">不限时段</option>{options.mealPeriods.map((item) => <option value={item} key={item}>{mealLabels[item]}</option>)}</select></label>
          <fieldset><legend>偏好口味</legend><div className="choice-grid">{options.flavors.map((item) => <label className="check-chip" key={item}><input type="checkbox" checked={(params.get('flavors') ?? '').split(',').includes(item)} onChange={() => updateMulti(params, setParams, 'flavors', item)} /><span>{item}</span></label>)}</div></fieldset>
          <fieldset><legend>忌口排除</legend><div className="choice-grid">{options.dietaryWarnings.map((item) => <label className="check-chip warning" key={item}><input type="checkbox" checked={(params.get('avoid') ?? '').split(',').includes(item)} onChange={() => updateMulti(params, setParams, 'avoid', item)} /><span>{item}</span></label>)}</div></fieldset>
          <label className="switch-row"><input type="checkbox" checked={params.get('openNow') === 'true'} onChange={(event) => setParam('openNow', event.target.checked ? 'true' : '')} /><span>仅看当前营业</span></label>
        </aside>
        <div className="results-panel"><div className="result-toolbar"><span>{activeCount ? `已启用 ${activeCount} 类条件` : '浏览全部档口'}</span><label>排序<select value={params.get('sort') ?? ''} onChange={(event) => setParam('sort', event.target.value)}><option value="">默认顺序</option><option value="distance_asc">距离最近</option><option value="rating_desc">评分最高</option><option value="price_asc">价格最低</option></select></label></div>
          {state === 'loading' && <PageState type="loading" title="正在准备今日菜单" text="稍等片刻，好味道马上出现。" />}
          {state === 'error' && <PageState type="error" title="餐饮信息暂时没有端上来" text="请确认服务已启动，然后再试一次。" retry={() => setReloadKey((value) => value + 1)} />}
          {state === 'empty' && <PageState type="empty" title="没有找到符合条件的档口" text="试试减少筛选条件，或清空搜索关键词。" />}
          {state === 'success' && <div className="restaurant-grid">{restaurants.map((restaurant) => <RestaurantCard key={restaurant.id} restaurant={restaurant} />)}</div>}
          <p className="distance-note">距离均为距{reference}的步行参考距离</p>
        </div>
      </div>
    </section>
  </>;
}

const initialPreferences = (): Preferences => { try { return JSON.parse(sessionStorage.getItem('food-preferences') ?? '{}') as Preferences; } catch { return {}; } };
const initialRecommendations = (): Recommendation[] => { try { return JSON.parse(sessionStorage.getItem('food-recommendations') ?? '[]') as Recommendation[]; } catch { return []; } };

export function RecommendationPage() {
  const [options, setOptions] = useState<Options>({ flavors: [], cuisines: [], dietaryWarnings: [], mealPeriods: [] });
  const [preferences, setPreferences] = useState<Preferences>(initialPreferences);
  const [results, setResults] = useState<Recommendation[]>(initialRecommendations);
  const [state, setState] = useState<'idle' | LoadState>(() => initialRecommendations().length ? 'success' : 'idle');
  const [error, setError] = useState('');
  useEffect(() => { const controller = new AbortController(); getOptions(controller.signal).then((value) => setOptions(value.data)).catch((caught) => { if (!(caught instanceof DOMException && caught.name === 'AbortError')) setError('偏好选项暂时无法加载'); }); return () => controller.abort(); }, []);
  const setPreference = <K extends keyof Preferences>(key: K, value: Preferences[K]) => setPreferences((current) => ({ ...current, [key]: value || undefined }));
  const toggle = (key: 'flavors' | 'avoid', value: string) => { const current = preferences[key] ?? []; setPreference(key, (current.includes(value) ? current.filter((item) => item !== value) : [...current, value]) as Preferences[typeof key]); };
  const hasPreference = useMemo(() => Object.values(preferences).some((value) => Array.isArray(value) ? value.length > 0 : value !== undefined && value !== false), [preferences]);
  const submit = async (event: FormEvent) => { event.preventDefault(); setError(''); if (!hasPreference) { setError('请至少选择或输入一项偏好'); return; } setState('loading'); sessionStorage.setItem('food-preferences', JSON.stringify(preferences)); try { const response = await getRecommendations(preferences); setResults(response.data); sessionStorage.setItem('food-recommendations', JSON.stringify(response.data)); setState(response.data.length ? 'success' : 'empty'); } catch (caught) { setError(caught instanceof ApiError ? caught.message : '推荐服务暂时不可用'); setState('error'); } };
  const reset = () => { setPreferences({}); setResults([]); setState('idle'); setError(''); sessionStorage.removeItem('food-preferences'); sessionStorage.removeItem('food-recommendations'); };
  return <section className="recommend-page"><div className="page-intro"><p className="eyebrow">PERSONAL PICKS</p><h1>告诉我你的偏好</h1><p>预算、口味、距离、时段和忌口，选一项也可以。我们只推荐真正满足硬性要求的档口。</p></div>
    <div className="recommend-layout"><form className="preference-form" onSubmit={submit} noValidate><div className="form-heading"><h2>这一餐想怎么吃？</h2><button type="button" onClick={reset}>重置</button></div>
      <div className="form-row"><label>最高预算（元）<input type="number" min="0" max="500" value={preferences.maxPrice ?? ''} onChange={(event) => setPreference('maxPrice', event.target.value === '' ? undefined : Number(event.target.value))} placeholder="例如 20" /></label><label>最远距离<select value={preferences.maxDistance ?? ''} onChange={(event) => setPreference('maxDistance', event.target.value ? Number(event.target.value) : undefined)}><option value="">不限距离</option><option value="300">300 米</option><option value="500">500 米</option><option value="800">800 米</option><option value="1200">1.2 公里</option></select></label></div>
      <div className="form-row"><label>最低评分<select value={preferences.minRating ?? ''} onChange={(event) => setPreference('minRating', event.target.value ? Number(event.target.value) : undefined)}><option value="">不限评分</option><option value="4">4.0</option><option value="4.3">4.3</option><option value="4.5">4.5</option></select></label><label>用餐时段<select value={preferences.mealPeriod ?? ''} onChange={(event) => setPreference('mealPeriod', event.target.value || undefined)}><option value="">不限时段</option>{options.mealPeriods.map((item) => <option key={item} value={item}>{mealLabels[item]}</option>)}</select></label></div>
      <fieldset><legend>喜欢的口味</legend><div className="choice-grid large">{options.flavors.map((item) => <label className="check-chip" key={item}><input type="checkbox" checked={(preferences.flavors ?? []).includes(item)} onChange={() => toggle('flavors', item)} /><span>{item}</span></label>)}</div></fieldset>
      <fieldset><legend>需要避开的食材</legend><div className="choice-grid large">{options.dietaryWarnings.map((item) => <label className="check-chip warning" key={item}><input type="checkbox" checked={(preferences.avoid ?? []).includes(item)} onChange={() => toggle('avoid', item)} /><span>{item}</span></label>)}</div></fieldset>
      <label className="switch-row"><input type="checkbox" checked={preferences.openNow ?? false} onChange={(event) => setPreference('openNow', event.target.checked || undefined)} /><span>只推荐当前营业的档口</span></label>
      {error && <p className="form-error" role="alert">{error}</p>}<button className="recommend-button" type="submit" disabled={state === 'loading'}>{state === 'loading' ? '正在寻找…' : '生成我的推荐'}</button>
    </form><div className="recommend-results"><div className="results-intro"><span>TOP PICKS</span><h2>{state === 'idle' ? '你的推荐会出现在这里' : state === 'success' ? `为你找到 ${results.length} 个选择` : '推荐结果'}</h2></div>
      {state === 'idle' && <div className="recommend-placeholder"><span aria-hidden="true">✦</span><p>选择偏好后，我们会给出最多 5 个结果，并说明每个推荐的理由。</p></div>}
      {state === 'loading' && <PageState type="loading" title="正在搭配这一餐" text="我们正在核对预算、口味和营业信息。" />}
      {state === 'empty' && <PageState type="empty" title="暂时没有完全符合的选择" text="硬性条件不会被自动放宽，请修改预算、距离、时段或忌口要求。" />}
      {state === 'error' && <PageState type="error" title="推荐暂时失败" text="你的偏好已经保留，请稍后再试。" />}
      {state === 'success' && <div className="recommend-list">{results.map((restaurant, index) => <div className="ranked-card" key={restaurant.id}><span className="rank">0{index + 1}</span><RestaurantCard restaurant={restaurant} reasons={restaurant.reasons} /></div>)}</div>}
    </div></div>
  </section>;
}

function useBackTarget() { const location = useLocation(); const state = location.state as { from?: string } | null; return state?.from ?? '/'; }

export function RestaurantDetailPage() {
  const { id = '' } = useParams(); const back = useBackTarget(); const [data, setData] = useState<RestaurantDetail | null>(null); const [state, setState] = useState<LoadState>('loading');
  useEffect(() => { const controller = new AbortController(); setState('loading'); getRestaurant(id, controller.signal).then((value) => { setData(value.data); setState('success'); }).catch((error) => { if (!(error instanceof DOMException && error.name === 'AbortError')) setState('error'); }); return () => controller.abort(); }, [id]);
  if (state === 'loading') return <section className="detail-page"><PageState type="loading" title="正在读取档口信息" text="马上就好。" /></section>;
  if (state === 'error' || !data) return <section className="detail-page"><PageState type="error" title="没有找到这个餐饮档口" text="它可能已被移除，返回列表看看其他选择。" /><Link className="back-link" to={back}>← 返回原页面</Link></section>;
  return <section className="detail-page"><Link className="back-link" to={back}>← 返回原页面</Link><div className="detail-hero"><div><p className="eyebrow">{data.canteenName}</p><h1>{data.name}</h1><p>{data.description ?? '暂无档口简介'}</p><div className="tags">{[...data.cuisines, ...data.flavors].map((item) => <span key={item}>{item}</span>)}</div></div><div className="detail-price"><strong>¥{data.averagePrice}</strong><span>人均参考</span></div></div>
    <div className="detail-facts"><div><span>位置</span><strong>{data.location}</strong></div><div><span>参考距离</span><strong>{formatDistance(data.distanceMeters)}</strong></div><div><span>校园评分</span><strong>{data.rating ?? '暂无'}</strong></div><div><span>营业状态</span><strong className={data.openNow ? 'open-text' : ''}>{data.openNow ? '营业中' : '已打烊'}</strong></div></div>
    <div className="detail-columns"><article><h2>营业时间</h2>{data.businessHours.map((hours, index) => <p key={`${hours.start}-${index}`}>周{hours.days.map((day) => dayLabels[day - 1]).join('、')} · {hours.start}—{hours.end} · {hours.mealPeriods.map((item) => mealLabels[item]).join('、')}</p>)}</article><article><h2>忌口与过敏提示</h2><p>{data.dietaryWarnings.length ? `档口标注包含：${data.dietaryWarnings.join('、')}` : '档口层面暂无已标注项目，请进入菜品详情核对具体食材。'}</p></article></div>
    <div className="dish-section"><div className="section-heading"><div><p className="eyebrow">MENU</p><h2>代表菜品</h2></div><p>{data.dishes.length} 道</p></div><div className="dish-grid">{data.dishes.map((dish) => <Link className="dish-card" to={`/dishes/${dish.id}`} state={{ from: `/restaurants/${data.id}` }} key={dish.id}><div><span>{dish.cuisine}</span><h3>{dish.name}</h3><p>{dish.description ?? '暂无菜品简介'}</p></div><strong>¥{dish.price}</strong></Link>)}</div></div>
  </section>;
}

export function DishDetailPage() {
  const { id = '' } = useParams(); const navigate = useNavigate(); const [data, setData] = useState<DishDetail | null>(null); const [state, setState] = useState<LoadState>('loading');
  useEffect(() => { const controller = new AbortController(); getDish(id, controller.signal).then((value) => { setData(value.data); setState('success'); }).catch((error) => { if (!(error instanceof DOMException && error.name === 'AbortError')) setState('error'); }); return () => controller.abort(); }, [id]);
  if (state === 'loading') return <section className="detail-page"><PageState type="loading" title="正在读取菜品信息" text="马上就好。" /></section>;
  if (state === 'error' || !data) return <section className="detail-page"><PageState type="error" title="没有找到这个菜品" text="返回上一页看看其他选择。" /><button className="back-link button-link" onClick={() => navigate(-1)}>← 返回上一页</button></section>;
  return <section className="detail-page dish-detail"><button className="back-link button-link" onClick={() => navigate(-1)}>← 返回上一页</button><div className="detail-hero"><div><p className="eyebrow">{data.restaurant?.name ?? '校园菜品'}</p><h1>{data.name}</h1><p>{data.description ?? '暂无菜品简介'}</p><div className="tags"><span>{data.cuisine}</span>{data.flavors.map((item) => <span key={item}>{item}</span>)}</div></div><div className="detail-price"><strong>¥{data.price}</strong><span>单份参考</span></div></div><div className="detail-columns"><article><h2>主要食材</h2><p>{data.ingredients?.join('、') ?? '暂无可靠食材信息'}</p></article><article><h2>忌口与过敏提示</h2><p>{data.dietaryWarnings.length ? `标注包含：${data.dietaryWarnings.join('、')}` : '暂无已标注项目；如有严重过敏，请就餐前向档口确认。'}</p></article></div>{data.restaurant && <Link className="primary-action filled" to={`/restaurants/${data.restaurant.id}`}>查看所属档口 →</Link>}</section>;
}

export function NotFoundPage() { return <section className="not-found"><span>404</span><h1>这里没有菜单</h1><p>你访问的页面不存在，回到校园餐饮列表继续看看吧。</p><Link className="primary-action filled" to="/">返回首页</Link></section>; }
