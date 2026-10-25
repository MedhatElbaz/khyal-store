import { useEffect, useMemo, useState } from 'react'
import {
  Search, ShoppingCart, Menu, X, Heart, House, CookingPot, Zap,
  Sparkles, Package, Phone, SlidersHorizontal, Plus, Pencil, Trash2,
  LogIn, LogOut, LayoutDashboard, ChevronLeft, MessageCircle, CheckCircle2
} from 'lucide-react'
import { isSupabaseConfigured, supabase } from './lib/supabase'

type Product = {
  id: string
  name: string
  category: string
  brand: string
  price: number
  old_price?: number | null
  description?: string | null
  image_url?: string | null
  stock: number
  is_featured?: boolean
  is_published?: boolean
}

const demoProducts: Product[] = [
  { id:'demo-1', name:'طقم حلل جرانيت 10 قطع', category:'الحلل وأدوات الطهي', brand:'خيال', price:2450, old_price:2890, stock:8, is_featured:true, image_url:'https://images.unsplash.com/photo-1584990347449-a9f2a3f6f6b8?auto=format&fit=crop&w=800&q=80', description:'طقم عملي للمطبخ بتصميم أنيق.' },
  { id:'demo-2', name:'طقم حلل استانلس ستيل', category:'الحلل وأدوات الطهي', brand:'خيال', price:1890, stock:12, is_featured:true, image_url:'https://images.unsplash.com/photo-1584990347449-a9f2a3f6f6b8?auto=format&fit=crop&w=800&q=80', description:'أدوات طهي للاستخدام اليومي.' },
  { id:'demo-3', name:'طقم أدوات مطبخ 12 قطعة', category:'رفايع المطبخ', brand:'خيال', price:420, old_price:500, stock:20, is_featured:true, image_url:'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=800&q=80', description:'أساسيات مفيدة لكل مطبخ.' },
  { id:'demo-4', name:'غلاية مياه كهربائية', category:'أجهزة كهربائية', brand:'خيال', price:650, stock:7, is_featured:true, image_url:'https://images.unsplash.com/photo-1608354580875-30bd4168b351?auto=format&fit=crop&w=800&q=80', description:'غلاية للاستخدام المنزلي اليومي.' },
  { id:'demo-5', name:'علب حفظ الطعام — طقم', category:'التخزين والتنظيم', brand:'خيال', price:280, stock:16, image_url:'https://images.unsplash.com/photo-1498837167922-ddd27525d352?auto=format&fit=crop&w=800&q=80', description:'لترتيب المطبخ وحفظ الأطعمة.' },
  { id:'demo-6', name:'طقم أطباق تقديم', category:'الصيني والتقديم', brand:'خيال', price:760, stock:5, image_url:'https://images.unsplash.com/photo-1610701596007-11502861dcfa?auto=format&fit=crop&w=800&q=80', description:'طقم تقديم مناسب للبيت والضيوف.' },
]

const categories = [
  { name:'الكل', icon:House },
  { name:'الحلل وأدوات الطهي', icon:CookingPot },
  { name:'رفايع المطبخ', icon:Sparkles },
  { name:'أجهزة كهربائية', icon:Zap },
  { name:'الصيني والتقديم', icon:Package },
  { name:'التخزين والتنظيم', icon:SlidersHorizontal },
]

const money = (n:number) => new Intl.NumberFormat('ar-EG', { maximumFractionDigits: 0 }).format(n) + ' ج.م'

export default function App() {
  const [products, setProducts] = useState<Product[]>(demoProducts)
  const [category, setCategory] = useState('الكل')
  const [query, setQuery] = useState('')
  const [cart, setCart] = useState<Record<string, number>>({})
  const [cartOpen, setCartOpen] = useState(false)
  const [adminOpen, setAdminOpen] = useState(false)
  const [mobileMenu, setMobileMenu] = useState(false)
  const [session, setSession] = useState<any>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  const [notice, setNotice] = useState('')
  const [editing, setEditing] = useState<Product | null>(null)
  const [form, setForm] = useState({ name:'', category:'رفايع المطبخ', brand:'خيال', price:'', old_price:'', stock:'0', image_url:'', description:'' })

  useEffect(() => {
    if (!supabase) return
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => setSession(nextSession))
    const load = async () => {
      const { data, error } = await supabase!.from('products').select('*').eq('is_published', true).order('created_at', { ascending: false })
      if (!error && data) setProducts(data as Product[])
    }
    load()
    return () => listener.subscription.unsubscribe()
  }, [])

  const filtered = useMemo(() => products.filter(p => {
    const matchCategory = category === 'الكل' || p.category === category
    const matchQuery = `${p.name} ${p.brand} ${p.category}`.toLowerCase().includes(query.toLowerCase())
    return matchCategory && matchQuery && p.is_published !== false
  }), [products, category, query])

  const cartItems = products.filter(p => (cart[p.id] || 0) > 0)
  const cartTotal = cartItems.reduce((sum, p) => sum + p.price * cart[p.id], 0)
  const whatsapp = import.meta.env.VITE_WHATSAPP_NUMBER || ''
  const addToCart = (p:Product) => {
    setCart(prev => ({ ...prev, [p.id]: Math.min((prev[p.id] || 0) + 1, Math.max(p.stock, 1)) }))
    setNotice('تمت إضافة المنتج إلى السلة')
    window.setTimeout(() => setNotice(''), 2400)
  }
  const orderWhatsApp = () => {
    if (!whatsapp) { setNotice('أضف رقم واتساب في إعدادات المشروع أولًا'); return }
    const lines = cartItems.map(p => `${p.name} × ${cart[p.id]} — ${money(p.price * cart[p.id])}`).join('\n')
    const text = encodeURIComponent(`طلب جديد من متجر KHYAL\n${lines}\nالإجمالي: ${money(cartTotal)}\nيرجى التواصل لتأكيد الطلب.`)
    window.open(`https://wa.me/${whatsapp.replace(/\D/g,'')}?text=${text}`, '_blank', 'noopener,noreferrer')
  }
  const login = async (e:React.FormEvent) => {
    e.preventDefault(); setLoginError('')
    if (!supabase) { setLoginError('اربط المشروع بـ Supabase أولًا حسب ملف README.'); return }
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setLoginError('تعذر تسجيل الدخول. راجع البيانات وإعدادات Supabase.')
  }
  const logout = async () => { if (supabase) await supabase.auth.signOut(); setSession(null) }
  const resetForm = () => { setEditing(null); setForm({ name:'', category:'رفايع المطبخ', brand:'خيال', price:'', old_price:'', stock:'0', image_url:'', description:'' }) }
  const editProduct = (p:Product) => {
    setEditing(p)
    setForm({ name:p.name, category:p.category, brand:p.brand || 'خيال', price:String(p.price), old_price:p.old_price ? String(p.old_price) : '', stock:String(p.stock), image_url:p.image_url || '', description:p.description || '' })
  }
  const saveProduct = async (e:React.FormEvent) => {
    e.preventDefault()
    if (!supabase || !session) return
    const payload = { name:form.name.trim(), category:form.category, brand:form.brand.trim(), price:Number(form.price), old_price:form.old_price ? Number(form.old_price) : null, stock:Number(form.stock), image_url:form.image_url.trim() || null, description:form.description.trim(), is_published:true }
    if (!payload.name || !Number.isFinite(payload.price) || payload.price < 0 || payload.stock < 0) { setNotice('راجع اسم المنتج والسعر والمخزون'); return }
    const result = editing
      ? await supabase.from('products').update(payload).eq('id', editing.id).select().single()
      : await supabase.from('products').insert(payload).select().single()
    if (result.error) { setNotice('لم يتم حفظ المنتج. راجع صلاحيات قاعدة البيانات.'); return }
    setProducts(prev => editing ? prev.map(p => p.id === editing.id ? result.data as Product : p) : [result.data as Product, ...prev])
    resetForm(); setNotice('تم حفظ المنتج بنجاح')
  }
  const deleteProduct = async (p:Product) => {
    if (!supabase || !session || !confirm(`حذف المنتج "${p.name}"؟`)) return
    const { error } = await supabase.from('products').delete().eq('id', p.id)
    if (error) { setNotice('تعذر الحذف. راجع الصلاحيات.'); return }
    setProducts(prev => prev.filter(item => item.id !== p.id))
  }

  return <div className="app-shell">
    <div className="top-strip">خيال — كل اللي بيتك محتاجه في مكان واحد</div>
    <header className="site-header">
      <button className="icon-button mobile-only" aria-label="فتح القائمة" onClick={() => setMobileMenu(!mobileMenu)}>{mobileMenu ? <X/> : <Menu/>}</button>
      <a className="brand" href="#" aria-label="KHYAL الصفحة الرئيسية"><span className="brand-mark">خ</span><span><strong>KHYAL</strong><small>خيال للأدوات المنزلية</small></span></a>
      <div className="search-box"><Search size={19}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="بتدور على إيه؟ حلل، رفايع، أجهزة..." aria-label="ابحث عن منتج"/></div>
      <div className="header-actions">
        <button className="icon-button" onClick={()=>setAdminOpen(true)} title="لوحة الإدارة"><LayoutDashboard/><span className="desktop-label">الإدارة</span></button>
        <button className="icon-button cart-button" onClick={()=>setCartOpen(true)} aria-label="سلة التسوق"><ShoppingCart/><span>السلة</span><b>{Object.values(cart).reduce((a,b)=>a+b,0)}</b></button>
      </div>
    </header>
    <nav className={`category-nav ${mobileMenu ? 'nav-open':''}`}>
      {categories.map(c => <button key={c.name} className={category===c.name?'active':''} onClick={()=>{setCategory(c.name);setMobileMenu(false)}}><c.icon size={17}/>{c.name}</button>)}
    </nav>

    <main>
      <section className="hero">
        <div className="hero-copy"><span className="eyebrow"><Sparkles size={15}/> اختيارات تليق ببيتك</span><h1>تفاصيل صغيرة<br/><em>تفرق في بيتك</em></h1><p>اكتشف أدوات مطبخ، حلل، رفايع وأجهزة منزلية مختارة بعناية وبأسعار مناسبة.</p><button className="primary-button" onClick={()=>document.getElementById('products')?.scrollIntoView({behavior:'smooth'})}>تسوق المنتجات <ChevronLeft size={18}/></button><div className="hero-points"><span><CheckCircle2 size={16}/> اختيارات متنوعة</span><span><CheckCircle2 size={16}/> طلب سهل</span></div></div>
        <div className="hero-art"><div className="hero-circle"></div><div className="hero-card card-one"><CookingPot size={68}/><span>أدوات طهي</span></div><div className="hero-card card-two"><Sparkles size={42}/><span>رفايع المطبخ</span></div><div className="hero-card card-three"><Zap size={40}/><span>أجهزة منزلية</span></div><span className="art-star">✦</span></div>
      </section>

      <section className="trust-row"><div><Package/><span><b>تشكيلة متنوعة</b><small>احتياجات البيت اليومية</small></span></div><div><Heart/><span><b>اختيارات عملية</b><small>للمطبخ والبيت</small></span></div><div><MessageCircle/><span><b>تواصل بسهولة</b><small>للاستفسار عن المنتجات</small></span></div></section>

      <section className="products-section" id="products">
        <div className="section-heading"><div><span className="eyebrow">تسوق على مزاجك</span><h2>{category==='الكل'?'منتجات مختارة ليك':category}</h2><p>اختار اللي يناسب بيتك وميزانيتك</p></div><span className="results-count">{filtered.length} منتجات</span></div>
        <div className="mobile-search search-box"><Search size={18}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="ابحث عن منتج..."/></div>
        <div className="product-grid">
          {filtered.map(p=><article className="product-card" key={p.id}><div className="product-image">{p.image_url ? <img src={p.image_url} alt={p.name} loading="lazy" onError={e=>{e.currentTarget.style.display='none'}}/> : <div className="image-placeholder"><CookingPot size={48}/></div>}{p.old_price && p.old_price>p.price && <span className="discount-badge">عرض</span>}<button className="quick-add" onClick={()=>addToCart(p)} aria-label={`أضف ${p.name} للسلة`}><Plus size={19}/></button></div><div className="product-info"><span className="product-category">{p.category}</span><h3>{p.name}</h3><div className="price-line"><strong>{money(p.price)}</strong>{p.old_price && p.old_price>p.price && <del>{money(p.old_price)}</del>}</div><div className="stock-line">{p.stock>0?'متاح للطلب':'اسأل عن التوفر'}</div><button className="add-button" onClick={()=>addToCart(p)}><ShoppingCart size={17}/> أضف للسلة</button></div></article>)}
        </div>
        {filtered.length===0 && <div className="empty-state"><Search size={35}/><h3>ملقيناش منتجات مطابقة</h3><p>جرب كلمة بحث مختلفة أو اختار قسم تاني.</p><button className="secondary-button" onClick={()=>{setQuery('');setCategory('الكل')}}>عرض كل المنتجات</button></div>}
      </section>
      <section className="bottom-cta"><div><span className="eyebrow">محتاج مساعدة؟</span><h2>مش لاقي اللي بتدور عليه؟</h2><p>تواصل معانا واسأل عن المنتج المناسب ليك.</p></div><button className="primary-button" onClick={()=>whatsapp?window.open(`https://wa.me/${whatsapp.replace(/\D/g,'')}`,'_blank','noopener,noreferrer'):setNotice('أضف رقم واتساب في إعدادات المشروع أولًا')}><Phone size={18}/> تواصل معنا</button></section>
    </main>
    <footer><a className="brand footer-brand" href="#"><span className="brand-mark">خ</span><span><strong>KHYAL</strong><small>خيال للأدوات المنزلية</small></span></a><p>اختيارات عملية لبيت أجمل.</p><small>© {new Date().getFullYear()} KHYAL — جميع الحقوق محفوظة</small></footer>

    {cartOpen && <div className="overlay" onMouseDown={e=>{if(e.target===e.currentTarget)setCartOpen(false)}}><aside className="drawer"><div className="drawer-head"><h2><ShoppingCart/> سلة التسوق</h2><button className="icon-button" onClick={()=>setCartOpen(false)} aria-label="إغلاق"><X/></button></div>{cartItems.length===0?<div className="empty-state"><ShoppingCart size={36}/><h3>السلة لسه فاضية</h3><p>ضيف المنتجات اللي عجبتك.</p></div>:<><div className="cart-list">{cartItems.map(p=><div className="cart-item" key={p.id}><div className="cart-thumb">{p.image_url&&<img src={p.image_url} alt=""/>}</div><div className="cart-item-info"><b>{p.name}</b><strong>{money(p.price)}</strong><div className="quantity-control"><button onClick={()=>setCart(c=>({...c,[p.id]:Math.max(0,(c[p.id]||0)-1)}))}>−</button><span>{cart[p.id]}</span><button onClick={()=>setCart(c=>({...c,[p.id]:Math.min(p.stock || 99,(c[p.id]||0)+1)}))}>+</button></div></div><button className="icon-button danger" onClick={()=>setCart(c=>({...c,[p.id]:0}))} aria-label="حذف"><Trash2 size={17}/></button></div>)}</div><div className="cart-footer"><div className="total-line"><span>الإجمالي المبدئي</span><strong>{money(cartTotal)}</strong></div><small>مصاريف الشحن يتم تأكيدها مع المتجر.</small><button className="primary-button full-button" onClick={orderWhatsApp}><MessageCircle size={18}/> أكمل الطلب على واتساب</button></div></>}</aside></div>}

    {adminOpen && <div className="overlay" onMouseDown={e=>{if(e.target===e.currentTarget)setAdminOpen(false)}}><aside className="admin-panel"><div className="drawer-head"><h2><LayoutDashboard/> لوحة إدارة خيال</h2><button className="icon-button" onClick={()=>setAdminOpen(false)} aria-label="إغلاق"><X/></button></div>{!isSupabaseConfigured?<div className="setup-note"><h3>خطوة إعداد مطلوبة</h3><p>الواجهة جاهزة للتجربة بمنتجات تجريبية. لتفعيل الإدارة الحقيقية، أنشئ مشروع Supabase ثم أضف بيانات الاتصال في ملف <code>.env</code> ونفّذ ملف <code>supabase/schema.sql</code>.</p><p>راجع README لمعرفة خطوات إنشاء أول حساب مدير بطريقة آمنة.</p></div>:!session?<form className="admin-login" onSubmit={login}><h3>تسجيل دخول المدير</h3><label>البريد الإلكتروني<input type="email" value={email} onChange={e=>setEmail(e.target.value)} required autoComplete="username"/></label><label>كلمة المرور<input type="password" value={password} onChange={e=>setPassword(e.target.value)} required autoComplete="current-password"/></label>{loginError&&<p className="form-error">{loginError}</p>}<button className="primary-button full-button"><LogIn size={17}/> تسجيل الدخول</button><small>يجب إنشاء حساب المدير مسبقًا من Supabase وتعيين دوره حسب ملف التعليمات.</small></form>:<div className="admin-content"><div className="admin-welcome"><div><b>أهلًا بيك في الإدارة</b><small>{session.user.email}</small></div><button className="secondary-button" onClick={logout}><LogOut size={16}/> خروج</button></div><div className="admin-stats"><div><small>المنتجات المعروضة</small><b>{products.length}</b></div><div><small>إجمالي وحدات المخزون</small><b>{products.reduce((s,p)=>s+p.stock,0)}</b></div></div><form className="product-form" onSubmit={saveProduct}><h3>{editing?'تعديل منتج':'إضافة منتج جديد'}</h3><label>اسم المنتج<input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} required/></label><div className="form-row"><label>القسم<select value={form.category} onChange={e=>setForm({...form,category:e.target.value})}>{categories.filter(c=>c.name!=='الكل').map(c=><option key={c.name}>{c.name}</option>)}</select></label><label>الماركة<input value={form.brand} onChange={e=>setForm({...form,brand:e.target.value})}/></label></div><div className="form-row"><label>السعر بالجنيه<input type="number" min="0" step="1" value={form.price} onChange={e=>setForm({...form,price:e.target.value})} required/></label><label>السعر قبل العرض<input type="number" min="0" step="1" value={form.old_price} onChange={e=>setForm({...form,old_price:e.target.value})}/></label></div><div className="form-row"><label>المخزون<input type="number" min="0" step="1" value={form.stock} onChange={e=>setForm({...form,stock:e.target.value})} required/></label><label>رابط صورة المنتج<input type="url" value={form.image_url} onChange={e=>setForm({...form,image_url:e.target.value})} placeholder="https://..."/></label></div><label>الوصف<textarea value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/></label><div className="form-row"><button className="primary-button" type="submit">{editing?'حفظ التعديلات':'إضافة المنتج'}</button>{editing&&<button className="secondary-button" type="button" onClick={resetForm}>إلغاء</button>}</div></form><h3>إدارة المنتجات</h3><div className="admin-product-list">{products.map(p=><div className="admin-product" key={p.id}><div><b>{p.name}</b><small>{money(p.price)} · المخزون {p.stock}</small></div><button className="icon-button" onClick={()=>editProduct(p)} aria-label="تعديل"><Pencil size={17}/></button><button className="icon-button danger" onClick={()=>deleteProduct(p)} aria-label="حذف"><Trash2 size={17}/></button></div>)}</div></div>}</aside></div>}
    {notice && <div className="toast" role="status">{notice}</div>}
  </div>
}
