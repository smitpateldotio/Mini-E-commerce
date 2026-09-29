import { useEffect, useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronDown,
  Heart,
  LoaderCircle,
  Menu,
  Minus,
  Plus,
  Search,
  ShoppingBag,
  SlidersHorizontal,
  Sparkles,
  X,
} from "lucide-react";
import {
  api,
  clearToken,
  getToken,
  jsonBody,
  setToken,
  tokenRole,
} from "./api.js";

const categories = ["All pieces", "Tops", "Layers", "Bottoms", "Accessories"];
const fallbackPhoto =
  "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=900&q=85";
const money = (amount, currency = "INR") =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount || 0);

function App() {
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState(() =>
    JSON.parse(localStorage.getItem("forme.cart") || "[]"),
  );
  const [user, setUser] = useState(null);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All pieces");
  const [sort, setSort] = useState("featured");
  const [panel, setPanel] = useState("");
  const [authMode, setAuthMode] = useState("login");
  const [authEmail, setAuthEmail] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const [catalogError, setCatalogError] = useState("");

  const loadProducts = async () => {
    setCatalogError("");
    try {
      const result = await api("/products");
      setProducts(result.data?.products || []);
    } catch (error) {
      setCatalogError(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
    const restoreSession = async () => {
      try {
        let result;
        if (getToken()) {
          result = await api("/auth/me");
        } else {
          result = await api("/auth/refresh-token", { method: "POST" });
          if (result.data?.accessToken) setToken(result.data.accessToken);
        }
        if (result?.data?.user) {
          setUser({ ...result.data.user, role: tokenRole(getToken()) });
        }
      } catch {
        clearToken();
      }
    };
    restoreSession();
  }, []);

  useEffect(() => {
    localStorage.setItem("forme.cart", JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    if (!notice) return undefined;
    const timer = window.setTimeout(() => setNotice(""), 2600);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const visibleProducts = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const filtered = products.filter((product) => {
      const matchesQuery =
        !normalized ||
        `${product.title} ${product.description}`
          .toLowerCase()
          .includes(normalized);
      const matchesCategory =
        category === "All pieces" ||
        product.category?.toLowerCase() === category.toLowerCase();
      return matchesQuery && matchesCategory;
    });
    if (sort === "price-low")
      filtered.sort((a, b) => a.price.amount - b.price.amount);
    if (sort === "price-high")
      filtered.sort((a, b) => b.price.amount - a.price.amount);
    return filtered;
  }, [products, query, category, sort]);

  const cartCount = cart.reduce((total, item) => total + item.quantity, 0);

  const addToCart = (product, size) => {
    if (!size) {
      setNotice("Choose an available size first");
      return;
    }
    const currency = product.price?.currency || "INR";
    if (
      cart.some((item) => (item.product.price?.currency || "INR") !== currency)
    ) {
      setNotice("Your bag can hold one currency at a time");
      return;
    }
    const current = cart.find(
      (item) => item.product._id === product._id && item.size === size,
    );
    const available =
      product.sizes?.find((item) => item.size === size)?.stock || 0;
    if (current && current.quantity >= available) {
      setNotice("No more stock available in this size");
      return;
    }
    setCart((items) => {
      const existing = items.find(
        (item) => item.product._id === product._id && item.size === size,
      );
      if (existing)
        return items.map((item) =>
          item === existing ? { ...item, quantity: item.quantity + 1 } : item,
        );
      return [...items, { product, size, quantity: 1 }];
    });
    setNotice("Added to your bag");
  };

  const updateQuantity = (productId, size, delta) => {
    const current = cart.find(
      (item) => item.product._id === productId && item.size === size,
    );
    const available =
      current?.product.sizes?.find((item) => item.size === size)?.stock || 0;
    if (delta > 0 && current && current.quantity >= available) {
      setNotice("No more stock available in this size");
      return;
    }
    setCart((items) =>
      items
        .map((item) =>
          item.product._id === productId && item.size === size
            ? { ...item, quantity: item.quantity + delta }
            : item,
        )
        .filter((item) => item.quantity > 0),
    );
  };

  const openAuth = (mode = "login") => {
    setAuthMode(mode);
    setPanel("account");
  };

  const handleAuth = async (formData) => {
    const endpoint = authMode === "login" ? "/auth/login" : "/auth/register";
    const result = await api(endpoint, {
      method: "POST",
      body: jsonBody(formData),
    });
    if (authMode === "register") {
      setAuthEmail(result.data?.user?.email || formData.email);
      setAuthMode("login");
      setNotice("Account created. Sign in to continue.");
      return;
    }
    const token = result.data?.accessToken;
    if (token) setToken(token);
    setUser({ ...result.data.user, role: tokenRole(token || "") });
    setPanel("");
    window.history.replaceState(null, "", "/");
    window.scrollTo({ top: 0, behavior: "smooth" });
    setNotice(
      `Welcome${result.data.user.name ? `, ${result.data.user.name.split(" ")[0]}` : " back"}`,
    );
  };

  const logout = async () => {
    try {
      await api("/auth/logout", { method: "POST" });
    } catch {
      /* Local session still needs clearing. */
    }
    clearToken();
    setUser(null);
    setPanel("");
    setNotice("You’re signed out");
  };

  const placeOrder = async (shippingAddress) => {
    const result = await api("/orders", {
      method: "POST",
      body: jsonBody({
        items: cart.map((item) => ({
          productId: item.product._id,
          size: item.size,
          quantity: item.quantity,
        })),
        shippingAddress,
      }),
    });
    setCart([]);
    setNotice("Your order is confirmed");
    return result.data.order;
  };

  return (
    <>
      <div className="announcement">
        <Sparkles size={13} /> Good things, worn often{" "}
        <span className="announcement-dot">·</span> Thoughtful pieces for
        everyday
      </div>
      <header className="site-header">
        <a className="wordmark" href="#top" aria-label="Forme home">
          FORME<span>®</span>
        </a>
        <nav className="desktop-nav" aria-label="Main navigation">
          <a href="#shop">Shop all</a>
          <a href="#story">Our point of view</a>
          {user?.role === "seller" && (
            <button className="nav-link" onClick={() => setPanel("seller")}>
              Studio
            </button>
          )}
        </nav>
        <div className="header-actions">
          <button
            className="icon-button search-trigger"
            aria-label="Focus search"
            onClick={() => document.getElementById("product-search")?.focus()}
          >
            <Search size={19} />
          </button>
          <button
            className="account-button"
            onClick={() => (user ? setPanel("account") : openAuth())}
          >
            {user ? `Hi, ${user.name.split(" ")[0]}` : "Account"}
          </button>
          <button
            className="bag-button"
            onClick={() => setPanel("bag")}
            aria-label={`Open bag, ${cartCount} items`}
          >
            <ShoppingBag size={19} />
            <span>Bag</span>
            <b>{cartCount}</b>
          </button>
        </div>
      </header>

      <main id="top">
        <section className="hero">
          <div className="hero-copy">
            <p className="eyebrow">
              <span className="eyebrow-line" /> The everyday edit · 01
            </p>
            <h1>
              Less, but
              <br />
              <em>loved longer.</em>
            </h1>
            <p className="hero-description">
              Considered pieces for the life you actually live. Easy to wear,
              hard to leave behind.
            </p>
            <a className="primary-link" href="#shop">
              Explore the collection <ArrowRight size={16} />
            </a>
            <div className="hero-footnote">
              <span>01 / 03</span>
              <span className="footnote-rule" /> New season, same good taste
            </div>
          </div>
          <div
            className="hero-image"
            role="img"
            aria-label="A quiet, sunlit clothing studio"
          >
            <div className="image-caption">
              <span>FORME STUDIO</span>
              <span>EST. MMXXIV</span>
            </div>
            <div className="hero-stamp">
              <span>MADE FOR</span>
              <strong>
                real
                <br />
                days
              </strong>
              <ArrowDown size={16} />
            </div>
          </div>
        </section>

        <section className="ticker" aria-label="Our values">
          <div>
            GOOD FIT, NO FUSS <span>✳</span> FEWER, BETTER THINGS <span>✳</span>{" "}
            MADE TO REPEAT <span>✳</span> GOOD FIT, NO FUSS <span>✳</span>{" "}
            FEWER, BETTER THINGS <span>✳</span> MADE TO REPEAT <span>✳</span>
          </div>
        </section>

        <section className="shop-section" id="shop">
          <div className="section-heading">
            <div>
              <p className="eyebrow">The considered collection</p>
              <h2>
                Pieces with <em>purpose.</em>
              </h2>
            </div>
            <p className="section-aside">
              Good clothes earn their place.
              <br />
              Start with the ones you’ll reach for.
            </p>
          </div>
          <div className="shop-controls">
            <div
              className="category-tabs"
              role="tablist"
              aria-label="Filter products"
            >
              {categories.map((item) => (
                <button
                  key={item}
                  role="tab"
                  aria-selected={category === item}
                  className={category === item ? "active" : ""}
                  onClick={() => setCategory(item)}
                >
                  {item}
                </button>
              ))}
            </div>
            <label className="sort-select">
              <SlidersHorizontal size={14} />
              <select
                aria-label="Sort products"
                value={sort}
                onChange={(event) => setSort(event.target.value)}
              >
                <option value="featured">Sort: featured</option>
                <option value="price-low">Price: low to high</option>
                <option value="price-high">Price: high to low</option>
              </select>
              <ChevronDown size={13} />
            </label>
          </div>
          <div className="search-row">
            <Search size={16} />
            <input
              id="product-search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Find your next favourite"
            />
            <span>
              {visibleProducts.length}{" "}
              {visibleProducts.length === 1 ? "piece" : "pieces"}
            </span>
          </div>
          {catalogError && (
            <div className="inline-alert">
              {catalogError} <button onClick={loadProducts}>Try again</button>
            </div>
          )}
          {loading ? (
            <div className="loading-state">
              <LoaderCircle className="spin" size={22} /> Finding the good ones…
            </div>
          ) : visibleProducts.length ? (
            <div className="product-grid">
              {visibleProducts.map((product, index) => (
                <ProductCard
                  key={product._id}
                  product={product}
                  index={index}
                  onAdd={addToCart}
                />
              ))}
            </div>
          ) : (
            <div className="empty-products">
              <div className="empty-mark">F.</div>
              <h3>
                {products.length
                  ? "Nothing in this edit just yet."
                  : "A little room for something good."}
              </h3>
              <p>
                {products.length
                  ? "Try a different search or category."
                  : "The collection is waiting for its first pieces. Check back soon."}
              </p>
              {products.length > 0 && (
                <button
                  onClick={() => {
                    setCategory("All pieces");
                    setQuery("");
                  }}
                >
                  Clear filters <ArrowRight size={15} />
                </button>
              )}
            </div>
          )}
        </section>

        <section className="story-section" id="story">
          <div className="story-image">
            <span>AN EVERYDAY UNIFORM</span>
          </div>
          <div className="story-copy">
            <p className="eyebrow">A little more intention</p>
            <h2>
              Wear it out.
              <br />
              <em>Then wear it again.</em>
            </h2>
            <p>
              We believe a wardrobe should feel like a deep breath. Pieces that
              work hard, feel good, and make getting dressed the easiest part of
              your day.
            </p>
            <a href="#shop" className="text-link">
              Meet your new regulars <ArrowUpRight size={16} />
            </a>
            <span className="story-index">FORME / 001</span>
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <a className="wordmark footer-mark" href="#top">
          FORME<span>®</span>
        </a>
        <p>Good things, worn often.</p>
        <div>
          <a href="#shop">Shop</a>
          <button onClick={() => openAuth()}>Your account</button>
        </div>
        <small>© 2025 FORME STUDIO. MADE FOR REAL DAYS.</small>
      </footer>

      {panel === "bag" && (
        <BagDrawer
          cart={cart}
          user={user}
          onClose={() => setPanel("")}
          onQuantity={updateQuantity}
          onCheckout={placeOrder}
          onSignIn={() => openAuth()}
        />
      )}
      {panel === "account" &&
        (user ? (
          <AccountPanel
            user={user}
            onClose={() => setPanel("")}
            onLogout={logout}
            onStudio={() => setPanel("seller")}
          />
        ) : (
          <AuthPanel
            mode={authMode}
            onMode={setAuthMode}
            defaultEmail={authEmail}
            onClose={() => setPanel("")}
            onSubmit={handleAuth}
          />
        ))}
      {panel === "seller" && user?.role === "seller" && (
        <SellerPanel onClose={() => setPanel("")} onChanged={loadProducts} />
      )}
      {notice && (
        <div className="toast">
          <Check size={15} />
          {notice}
        </div>
      )}
    </>
  );
}

function ProductCard({ product, index, onAdd }) {
  const [size, setSize] = useState("");
  const availableSizes = (product.sizes || []).filter((item) => item.stock > 0);
  const photo = product.images?.[0] || fallbackPhoto;
  return (
    <article className="product-card" style={{ "--card-index": index }}>
      <div className="product-photo-wrap">
        <img
          className="product-photo"
          src={photo}
          alt={product.title}
          loading="lazy"
          onError={(event) => {
            event.currentTarget.src = fallbackPhoto;
          }}
        />
        <button
          className="save-button"
          aria-label={`Save ${product.title}`}
          onClick={() => onAdd(product, availableSizes[0]?.size)}
          title="Add your size to bag"
        >
          <Heart size={17} />
        </button>
        <span className="product-number">
          F / {String(index + 1).padStart(2, "0")}
        </span>
      </div>
      <div className="product-meta">
        <div>
          <h3>{product.title}</h3>
          <p>{product.description}</p>
        </div>
        <strong>{money(product.price?.amount, product.price?.currency)}</strong>
      </div>
      <div className="product-buy-row">
        <div className="size-picker" aria-label="Choose size">
          {availableSizes.length ? (
            availableSizes.map((item) => (
              <button
                key={item.size}
                className={size === item.size ? "selected" : ""}
                aria-pressed={size === item.size}
                title={`${item.size}, ${item.stock} in stock`}
                onClick={() => setSize(item.size)}
              >
                {item.size}
              </button>
            ))
          ) : (
            <span className="sold-out">Currently unavailable</span>
          )}
        </div>
        <button
          className="add-button"
          disabled={!availableSizes.length}
          onClick={() => onAdd(product, size)}
          aria-label={`Add ${product.title} to bag`}
        >
          <Plus size={17} />
        </button>
      </div>
    </article>
  );
}

function BagDrawer({ cart, user, onClose, onQuantity, onCheckout, onSignIn }) {
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [order, setOrder] = useState(null);
  const subtotal = cart.reduce(
    (sum, item) => sum + (item.product.price?.amount || 0) * item.quantity,
    0,
  );
  const submitOrder = async (event) => {
    event.preventDefault();
    if (!user) {
      onSignIn();
      return;
    }
    setBusy(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const shippingAddress = Object.fromEntries(form.entries());
    try {
      setOrder(await onCheckout(shippingAddress));
    } catch (reason) {
      setError(reason.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div
      className="overlay"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <aside className="drawer" aria-label="Shopping bag">
        <div className="drawer-heading">
          <div>
            <p className="eyebrow">Your good things</p>
            <h2>
              The bag{" "}
              <span>
                ({cart.reduce((count, item) => count + item.quantity, 0)})
              </span>
            </h2>
          </div>
          <button
            className="icon-button"
            aria-label="Close bag"
            onClick={onClose}
          >
            <X size={20} />
          </button>
        </div>
        {order ? (
          <div className="order-confirmation">
            <span className="confirmation-mark">
              <Check size={23} />
            </span>
            <p className="eyebrow">
              ORDER / {order._id.slice(-6).toUpperCase()}
            </p>
            <h3>
              It’s on its way
              <br />
              <em>to you.</em>
            </h3>
            <p>
              Your order is confirmed. Pay{" "}
              {money(order.subtotal, order.currency)} when it arrives.
            </p>
            <button className="primary-link" onClick={onClose}>
              Back to the collection <ArrowRight size={15} />
            </button>
          </div>
        ) : cart.length ? (
          <>
            <div className="bag-items">
              {cart.map((item) => (
                <div
                  className="bag-item"
                  key={`${item.product._id}-${item.size}`}
                >
                  <img src={item.product.images?.[0] || fallbackPhoto} alt="" />
                  <div className="bag-item-info">
                    <h3>{item.product.title}</h3>
                    <p>Size {item.size}</p>
                    <strong>
                      {money(
                        item.product.price?.amount,
                        item.product.price?.currency,
                      )}
                    </strong>
                    <div className="quantity-control">
                      <button
                        aria-label="Remove one"
                        onClick={() =>
                          onQuantity(item.product._id, item.size, -1)
                        }
                      >
                        <Minus size={13} />
                      </button>
                      <span>{item.quantity}</span>
                      <button
                        aria-label="Add one"
                        onClick={() =>
                          onQuantity(item.product._id, item.size, 1)
                        }
                      >
                        <Plus size={13} />
                      </button>
                    </div>
                  </div>
                  <span className="line-total">
                    {money(
                      (item.product.price?.amount || 0) * item.quantity,
                      item.product.price?.currency,
                    )}
                  </span>
                </div>
              ))}
            </div>
            {checkoutOpen ? (
              <form className="checkout-form" onSubmit={submitOrder}>
                <div className="checkout-form-heading">
                  <button type="button" onClick={() => setCheckoutOpen(false)}>
                    ← Back to bag
                  </button>
                  <span>Cash on delivery</span>
                </div>
                {!user && (
                  <p className="checkout-signin">
                    Sign in to place this order.{" "}
                    <button type="button" onClick={onSignIn}>
                      Sign in
                    </button>
                  </p>
                )}
                <div className="checkout-fields">
                  <label>
                    Full name
                    <input
                      name="name"
                      defaultValue={user?.name || ""}
                      autoComplete="name"
                      minLength="2"
                      required
                    />
                  </label>
                  <label>
                    Phone
                    <input
                      name="phone"
                      type="tel"
                      autoComplete="tel"
                      required
                    />
                  </label>
                  <label className="address-field">
                    Street address
                    <input
                      name="addressLine"
                      autoComplete="street-address"
                      minLength="5"
                      required
                    />
                  </label>
                  <label>
                    City
                    <input
                      name="city"
                      autoComplete="address-level2"
                      minLength="2"
                      required
                    />
                  </label>
                  <label>
                    State / region
                    <input
                      name="state"
                      autoComplete="address-level1"
                      minLength="2"
                      required
                    />
                  </label>
                  <label>
                    Postal code
                    <input
                      name="postalCode"
                      autoComplete="postal-code"
                      minLength="3"
                      required
                    />
                  </label>
                </div>
                {error && <p className="form-error">{error}</p>}
                <button className="form-submit" disabled={busy || !user}>
                  {busy ? (
                    <LoaderCircle size={17} className="spin" />
                  ) : (
                    `Place order · ${money(subtotal, cart[0]?.product.price?.currency)}`
                  )}
                  <ArrowRight size={16} />
                </button>
                <small className="checkout-note">
                  No online payment needed. Pay the delivery partner on arrival.
                </small>
              </form>
            ) : (
              <div className="bag-summary">
                <div>
                  <span>Subtotal</span>
                  <strong>
                    {money(subtotal, cart[0]?.product.price?.currency)}
                  </strong>
                </div>
                <button
                  className="checkout-button"
                  onClick={() => setCheckoutOpen(true)}
                >
                  Continue to delivery <ArrowRight size={16} />
                </button>
                <small>
                  Cash on delivery · Your bag is saved on this device.
                </small>
              </div>
            )}
          </>
        ) : (
          <div className="bag-empty">
            <ShoppingBag size={27} />
            <h3>Your bag is taking a little breather.</h3>
            <p>Good things are waiting in the collection.</p>
            <button className="primary-link" onClick={onClose}>
              Explore the collection <ArrowRight size={15} />
            </button>
          </div>
        )}
      </aside>
    </div>
  );
}

function AuthPanel({ mode, defaultEmail, onMode, onClose, onSubmit }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const submit = async (event) => {
    event.preventDefault();
    setError("");
    setBusy(true);
    const form = new FormData(event.currentTarget);
    const payload = Object.fromEntries(form.entries());
    try {
      await onSubmit(payload);
    } catch (reason) {
      setError(reason.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div
      className="overlay"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <section className="auth-panel">
        <button
          className="icon-button close-auth"
          aria-label="Close"
          onClick={onClose}
        >
          <X size={20} />
        </button>
        <p className="eyebrow">FORME / YOUR ACCOUNT</p>
        <h2>
          {mode === "login" ? (
            <>
              Good to
              <br />
              <em>see you.</em>
            </>
          ) : (
            <>
              Let’s make
              <br />
              <em>this official.</em>
            </>
          )}
        </h2>
        <p className="auth-intro">
          {mode === "login"
            ? "Sign in and pick up where you left off."
            : "A considered wardrobe starts right here."}
        </p>
        <form onSubmit={submit} className="auth-form">
          {mode === "register" && (
            <label>
              Your name
              <input
                name="name"
                minLength="3"
                required
                autoComplete="name"
                placeholder="Name you go by"
              />
            </label>
          )}
          <label>
            Email address
            <input
              name="email"
              type="email"
              required
              autoComplete="email"
              defaultValue={defaultEmail}
              placeholder="you@example.com"
            />
          </label>
          <label>
            Password
            <input
              name="password"
              type="password"
              minLength="6"
              required
              autoComplete={
                mode === "login" ? "current-password" : "new-password"
              }
              placeholder="At least 6 characters"
            />
          </label>
          {mode === "register" && (
            <label>
              Confirm password
              <input
                name="confirmPassword"
                type="password"
                minLength="6"
                required
                autoComplete="new-password"
                placeholder="Type it once more"
              />
            </label>
          )}
          {error && <p className="form-error">{error}</p>}
          <button className="form-submit" disabled={busy}>
            {busy ? (
              <LoaderCircle size={17} className="spin" />
            ) : mode === "login" ? (
              "Sign in"
            ) : (
              "Create account"
            )}
            <ArrowRight size={16} />
          </button>
        </form>
        <p className="auth-switch">
          {mode === "login" ? "New around here?" : "Already have an account?"}{" "}
          <button
            onClick={() => onMode(mode === "login" ? "register" : "login")}
          >
            {mode === "login" ? "Create an account" : "Sign in"}
          </button>
        </p>
      </section>
    </div>
  );
}

function AccountPanel({ user, onClose, onLogout, onStudio }) {
  return (
    <div
      className="overlay"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <section className="auth-panel account-panel">
        <button
          className="icon-button close-auth"
          aria-label="Close"
          onClick={onClose}
        >
          <X size={20} />
        </button>
        <p className="eyebrow">FORME / YOUR ACCOUNT</p>
        <h2>
          Hi, <em>{user.name.split(" ")[0]}.</em>
        </h2>
        <p className="auth-intro">Signed in as {user.email}</p>
        {user.role === "seller" && (
          <button className="account-action" onClick={onStudio}>
            Open seller studio <ArrowRight size={16} />
          </button>
        )}
        <button className="account-action signout" onClick={onLogout}>
          Sign out <ArrowRight size={16} />
        </button>
      </section>
    </div>
  );
}

function SellerPanel({ onClose, onChanged }) {
  const [items, setItems] = useState([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const load = async () => {
    try {
      const result = await api("/products/seller");
      setItems(result.data?.products || []);
    } catch (error) {
      setMessage(error.message);
    }
  };
  useEffect(() => {
    load();
  }, []);
  const create = async (event) => {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const files = form.getAll("images").filter((file) => file.size > 0);
    const payload = new FormData();
    payload.append("title", form.get("title"));
    payload.append("description", form.get("description"));
    payload.append("category", form.get("category"));
    payload.append(
      "price",
      JSON.stringify({
        amount: Number(form.get("amount")),
        currency: form.get("currency"),
      }),
    );
    payload.append(
      "sizes",
      JSON.stringify(
        ["XS", "S", "M", "L", "XL", "XXL"]
          .map((size) => ({ size, stock: Number(form.get(`stock-${size}`)) }))
          .filter((size) => size.stock > 0),
      ),
    );
    files.slice(0, 5).forEach((file) => payload.append("images", file));
    try {
      await api("/products", { method: "POST", body: payload });
      formElement.reset();
      setMessage("Piece added. It starts unpublished until you’re ready.");
      await load();
      onChanged();
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  };
  const setPublished = async (product) => {
    try {
      await api(
        `/products/${product._id}/${product.published ? "unpublish" : "publish"}`,
        { method: "PATCH" },
      );
      await load();
      onChanged();
    } catch (error) {
      setMessage(error.message);
    }
  };
  return (
    <div
      className="overlay seller-overlay"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <section className="seller-panel">
        <div className="drawer-heading">
          <div>
            <p className="eyebrow">FORME / STUDIO</p>
            <h2>Your collection</h2>
          </div>
          <button
            className="icon-button"
            aria-label="Close studio"
            onClick={onClose}
          >
            <X size={20} />
          </button>
        </div>
        <div className="seller-content">
          <div className="seller-list">
            <div className="seller-list-heading">
              <h3>Pieces</h3>
              <span>{items.length} total</span>
            </div>
            {items.length ? (
              items.map((item) => (
                <div className="seller-row" key={item._id}>
                  <img src={item.images?.[0] || fallbackPhoto} alt="" />
                  <div>
                    <strong>{item.title}</strong>
                    <small>
                      {money(item.price?.amount, item.price?.currency)} ·{" "}
                      {(item.sizes || []).reduce(
                        (sum, size) => sum + size.stock,
                        0,
                      )}{" "}
                      in stock
                    </small>
                  </div>
                  <span
                    className={`status ${item.published ? "live" : "draft"}`}
                  >
                    {item.published ? "Live" : "Draft"}
                  </span>
                  <button
                    className="publish-toggle"
                    onClick={() => setPublished(item)}
                  >
                    {item.published ? "Unpublish" : "Publish"}
                  </button>
                </div>
              ))
            ) : (
              <p className="seller-empty">Your first piece starts here.</p>
            )}
          </div>
          <form className="product-form" onSubmit={create}>
            <h3>Add a piece</h3>
            <label>
              Product name
              <input
                name="title"
                minLength="2"
                maxLength="100"
                required
                placeholder="e.g. The everyday shirt"
              />
            </label>
            <label>
              About this piece
              <textarea
                name="description"
                minLength="20"
                maxLength="500"
                required
                placeholder="What makes it worth reaching for?"
              />
            </label>
            <label>
              Category
              <select name="category" required>
                {categories.slice(1).map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </label>
            <div className="form-inline">
              <label>
                Price
                <input
                  name="amount"
                  type="number"
                  min="1"
                  step="1"
                  required
                  placeholder="0"
                />
              </label>
              <label>
                Currency
                <select name="currency">
                  <option value="INR">INR ₹</option>
                  <option value="USD">USD $</option>
                </select>
              </label>
            </div>
            <fieldset className="stock-fields">
              <legend>Stock by size</legend>
              <div>
                {["XS", "S", "M", "L", "XL", "XXL"].map((size) => (
                  <label key={size}>
                    {size}
                    <input
                      name={`stock-${size}`}
                      type="number"
                      min="0"
                      defaultValue="0"
                    />
                  </label>
                ))}
              </div>
            </fieldset>
            <label>
              Product photos{" "}
              <span className="field-hint">Up to 5 images, 1 MB each</span>
              <input name="images" type="file" accept="image/*" multiple />
            </label>
            {message && <p className="form-feedback">{message}</p>}
            <button className="form-submit" disabled={busy}>
              {busy ? (
                <LoaderCircle size={17} className="spin" />
              ) : (
                "Add as draft"
              )}
              <ArrowRight size={16} />
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}

export default App;
