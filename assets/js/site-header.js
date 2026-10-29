const headerScript = document.currentScript;
const headerStyles = headerScript
  ? new URL('../css/site-header.css?v=22', headerScript.src).href
  : '';

document.querySelectorAll('[data-site-header]').forEach(function (host) {
  const root = host.dataset.root || '';
  const shadow = host.attachShadow({ mode: 'open' });

  host.style.cssText = 'all:initial;display:block;position:absolute;top:0;left:0;width:100%;height:0;z-index:80;';

  shadow.innerHTML = `
    <link rel="stylesheet" href="${headerStyles}">
    <div class="shared-header">
      <nav class="nav">
        <a class="brand" href="${root}" aria-label="Tikpan home"></a>
        <div class="links" id="navlinks">
          <div class="nav-dropdown">
            <a href="${root}#employers" class="dropdown-trigger">Employers <span class="nav-chevron" aria-hidden="true"><svg viewBox="0 0 12 8"><path d="m1 1 5 5 5-5"/></svg></span></a>
            <div class="dropdown-menu">
              <span class="dropdown-label">Our sectors</span>
              <a href="${root}sectors/marine-offshore-fishing/">Marine, Offshore &amp; Fishing</a>
              <a href="${root}sectors/engineering-construction/">Engineering &amp; Construction</a>
              <a href="${root}sectors/logistics-warehousing/">Logistics &amp; Warehousing</a>
              <a href="${root}sectors/healthcare/">Healthcare</a>
              <a href="${root}sectors/nannies-childcare/">Nannies &amp; Childcare Professionals</a>
              <a href="${root}sectors/hospitality/">Hospitality</a>
              <a href="${root}sectors/professional-administration/">Professional &amp; Administration</a>
            </div>
          </div>
          <div class="nav-dropdown">
            <a href="${root}#contact" class="dropdown-trigger">Candidates <span class="nav-chevron" aria-hidden="true"><svg viewBox="0 0 12 8"><path d="m1 1 5 5 5-5"/></svg></span></a>
            <div class="dropdown-menu candidate-menu">
              <a href="mailto:info@tikpanrecruitment.co.uk?subject=Candidate%20CV%20submission" class="dropdown-overview">Email Your CV</a>
              <a href="${root}vacancies/">View Vacancies</a>
            </div>
          </div>
          <a href="${root}about/">About Us</a>
          <a href="${root}#contact">Contact</a>
        </div>
        <a href="${root}#contact" class="header-cta">Request Staff</a>
        <button class="menu" type="button" aria-label="Open navigation" aria-controls="navlinks" aria-expanded="false">☰</button>
      </nav>
    </div>`;

  const header = shadow.querySelector('.shared-header');
  const menu = shadow.querySelector('.menu');
  const links = shadow.querySelector('.links');

  function setMenuOpen(open) {
    links.classList.toggle('open', open);
    header.classList.toggle('menu-open', open);
    menu.setAttribute('aria-expanded', String(open));
    menu.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
    menu.textContent = open ? '×' : '☰';
    document.documentElement.style.overflow = open ? 'hidden' : '';
  }

  setMenuOpen(false);

  menu.addEventListener('click', function () {
    setMenuOpen(!links.classList.contains('open'));
  });

  links.querySelectorAll('a').forEach(function (link) {
    link.addEventListener('click', function () {
      setMenuOpen(false);
    });
  });

  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && links.classList.contains('open')) {
      setMenuOpen(false);
      menu.focus();
    }
  });

  window.addEventListener('resize', function () {
    if (window.innerWidth > 900 && links.classList.contains('open')) setMenuOpen(false);
  });

  function updateHeader() {
    header.classList.toggle('scrolled', window.scrollY > 24);
  }

  updateHeader();
  window.addEventListener('scroll', updateHeader, { passive: true });
});
