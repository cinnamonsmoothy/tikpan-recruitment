const headerScript = document.currentScript;
const headerStyles = headerScript
  ? new URL('../css/site-header.css?v=21', headerScript.src).href
  : '';

document.querySelectorAll('[data-site-header]').forEach(function (host) {
  const root = host.dataset.root || '';
  const shadow = host.attachShadow({ mode: 'open' });

  host.style.cssText = 'all:initial;display:block;position:absolute;top:0;left:0;width:100%;height:0;z-index:80;';

  shadow.innerHTML = `
    <link rel="stylesheet" href="${headerStyles}">
    <div class="shared-header">
      <nav class="nav">
        <a class="brand" href="${root}index.html" aria-label="Tikpan home"></a>
        <div class="links" id="navlinks">
          <a href="${root}about/index.html">About Us</a>
          <div class="nav-dropdown">
            <a href="${root}index.html#employers" class="dropdown-trigger">Employers <span class="nav-chevron" aria-hidden="true"><svg viewBox="0 0 12 8"><path d="m1 1 5 5 5-5"/></svg></span></a>
            <div class="dropdown-menu">
              <span class="dropdown-label">Our sectors</span>
              <a href="${root}sectors/marine-offshore-fishing/index.html">Marine, Offshore &amp; Fishing</a>
              <a href="${root}sectors/engineering-construction/index.html">Engineering &amp; Construction</a>
              <a href="${root}sectors/logistics-warehousing/index.html">Logistics &amp; Warehousing</a>
              <a href="${root}sectors/healthcare/index.html">Healthcare</a>
              <a href="${root}sectors/hospitality/index.html">Hospitality</a>
              <a href="${root}sectors/professional-administration/index.html">Professional &amp; Administration</a>
            </div>
          </div>
          <div class="nav-dropdown">
            <a href="${root}index.html#contact" class="dropdown-trigger">Candidates <span class="nav-chevron" aria-hidden="true"><svg viewBox="0 0 12 8"><path d="m1 1 5 5 5-5"/></svg></span></a>
            <div class="dropdown-menu candidate-menu">
              <a href="mailto:YOUR_EMAIL_HERE?subject=Candidate%20CV%20submission" class="dropdown-overview">Email Your CV ↗</a>
              <a href="${root}vacancies/index.html">View Vacancies</a>
            </div>
          </div>
          <a href="${root}index.html#contact">Contact</a>
        </div>
        <a href="${root}index.html#contact" class="header-cta">Request Staff ↗</a>
        <button class="menu" type="button" aria-label="Toggle navigation" aria-expanded="false">☰</button>
      </nav>
    </div>`;

  const header = shadow.querySelector('.shared-header');
  const menu = shadow.querySelector('.menu');
  const links = shadow.querySelector('.links');

  menu.addEventListener('click', function () {
    const open = links.classList.toggle('open');
    menu.setAttribute('aria-expanded', String(open));
  });

  links.querySelectorAll('a').forEach(function (link) {
    link.addEventListener('click', function () {
      links.classList.remove('open');
      menu.setAttribute('aria-expanded', 'false');
    });
  });

  function updateHeader() {
    header.classList.toggle('scrolled', window.scrollY > 24);
  }

  updateHeader();
  window.addEventListener('scroll', updateHeader, { passive: true });
});
