<svelte:head>
  <title>Mentions légales — Thower</title>
</svelte:head>

<div class="page">
  <header>
    <a href="/" class="logo">T<span>H</span>OWER</a>
  </header>

  <main>
    <h1>Mentions légales</h1>

    <section>
      <h2>Propriété intellectuelle</h2>
      <p>L'ensemble des contenus du site (textes, images, logos, graphismes, fonctionnalités) est protégé par le droit d'auteur et la propriété intellectuelle.</p>
      <p>Toute reproduction ou utilisation sans autorisation préalable est strictement interdite.</p>
    </section>

    <section>
      <h2>Données personnelles</h2>
      <p>Le site collecte et traite des données personnelles conformément à la <a href="/politique-confidentialite" class="link">Politique de confidentialité</a>.</p>
    </section>

    <section>
      <h2>Cookies</h2>
      <p>Le site utilise des cookies pour améliorer l'expérience utilisateur et mesurer l'audience.</p>
      <p>L'utilisateur peut gérer ses préférences ou refuser les cookies via le bandeau prévu à cet effet.</p>
    </section>

    <section>
      <h2>Responsabilité</h2>
      <p>Le site met tout en œuvre pour assurer la fiabilité des informations.</p>
      <p>Toutefois, l'éditeur ne peut être tenu responsable des erreurs ou omissions dans les contenus ni des dommages liés à l'utilisation du site.</p>
    </section>

    <section>
      <h2>Droit applicable</h2>
      <p>Les présentes mentions légales sont régies par le droit français.</p>
      <p>Tout litige relève des tribunaux compétents du siège de l'éditeur.</p>
    </section>
  </main>

  <footer>
    <a href="/cgu" class="footer-link">CGU</a>
    <div class="footer-copy">© 2026 Thower · Tous droits réservés</div>
  </footer>
</div>

<style>
  @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500&display=swap');

  :global(body) { background: #0a0a0a; margin: 0; }

  .page {
    min-height: 100dvh;
    background: #0a0a0a;
    color: #f0ede8;
    font-family: 'DM Sans', sans-serif;
    display: flex;
    flex-direction: column;
  }

  header {
    padding: 28px 48px;
    border-bottom: 1px solid rgba(255,255,255,0.06);
  }

  .logo {
    font-family: 'Bebas Neue', sans-serif;
    font-size: 1.6rem;
    letter-spacing: 0.12em;
    color: #f0ede8;
    text-decoration: none;
  }
  .logo span { color: #c9a84c; }

  main {
    flex: 1;
    max-width: 760px;
    width: 100%;
    margin: 0 auto;
    padding: 60px 32px 80px;
  }

  h1 {
    font-family: 'Bebas Neue', sans-serif;
    font-size: 2.8rem;
    letter-spacing: 0.08em;
    color: #f0ede8;
    margin: 0 0 48px;
    line-height: 1;
  }
  h1::after {
    content: '';
    display: block;
    width: 48px;
    height: 2px;
    background: #c9a84c;
    margin-top: 16px;
  }

  section {
    margin-bottom: 36px;
    padding-bottom: 36px;
    border-bottom: 1px solid rgba(255,255,255,0.05);
  }
  section:last-child { border-bottom: none; }

  h2 {
    font-family: 'Bebas Neue', sans-serif;
    font-size: 1rem;
    letter-spacing: 0.12em;
    color: #c9a84c;
    margin: 0 0 14px;
    text-transform: uppercase;
  }

  p {
    font-size: 0.875rem;
    line-height: 1.75;
    color: rgba(240,237,232,0.7);
    margin: 0 0 10px;
    font-weight: 300;
  }

  .link {
    color: #c9a84c;
    text-decoration: none;
  }
  .link:hover { text-decoration: underline; }

  footer {
    padding: 28px 48px;
    border-top: 1px solid rgba(255,255,255,0.06);
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .footer-link {
    font-size: 0.65rem;
    color: rgba(240,237,232,0.2);
    letter-spacing: 0.06em;
    text-decoration: none;
    transition: color 0.2s;
  }
  .footer-link:hover { color: rgba(240,237,232,0.5); }

  .footer-copy {
    font-size: 0.65rem;
    color: rgba(240,237,232,0.2);
    letter-spacing: 0.06em;
  }

  @media (max-width: 640px) {
    header { padding: 20px 24px; }
    main { padding: 40px 20px 60px; }
    h1 { font-size: 2rem; }
    footer { flex-direction: column; gap: 10px; text-align: center; padding: 20px 24px; }
  }
</style>
