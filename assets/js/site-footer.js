document.querySelectorAll('[data-site-footer]').forEach(function (footer) {
  const root = footer.dataset.root || '';

  if (!document.querySelector('link[data-site-footer-styles]')) {
    const styles = document.createElement('link');
    styles.rel = 'stylesheet';
    styles.href = root + 'assets/css/site-footer.css?v=19';
    styles.dataset.siteFooterStyles = '';
    document.head.appendChild(styles);
  }

  footer.innerHTML = `
    <div class="container">
      <div class="footer-grid">
        <div>
          <a class="footer-brand" href="${root}index.html" aria-label="Tikpan home"></a>
          <p>Connecting employers and candidates across specialist industries through an honest, people-first approach.</p>
        </div>
        <div>
          <h4>Explore</h4>
          <a href="${root}about/index.html">About Us</a>
          <a href="${root}index.html#sectors">Our Sectors</a>
          <a href="${root}index.html#employers">Employers</a>
          <a href="${root}index.html#contact">Candidates</a>
        </div>
        <div>
          <h4>Useful links</h4>
          <a href="${root}vacancies/index.html">Vacancies</a>
          <a href="${root}index.html#contact">Request Staff</a>
          <a href="${root}index.html#contact">Contact Us</a>
        </div>
      </div>
      <div class="copyright">© <span id="year" data-footer-year></span> Tikpan Recruitment Group Ltd. All rights reserved.</div>
    </div>`;

  footer.querySelector('[data-footer-year]').textContent = new Date().getFullYear();
});
