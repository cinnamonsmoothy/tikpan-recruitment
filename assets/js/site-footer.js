document.querySelectorAll('[data-site-footer]').forEach(function (footer) {
  const root = footer.dataset.root || '';

  if (!document.querySelector('link[data-site-footer-styles]')) {
    const styles = document.createElement('link');
    styles.rel = 'stylesheet';
    styles.href = root + 'assets/css/site-footer.css?v=20';
    styles.dataset.siteFooterStyles = '';
    document.head.appendChild(styles);
  }

  footer.innerHTML = `
    <div class="container">
      <div class="footer-grid">
        <div>
          <a class="footer-brand" href="${root}index.html" aria-label="Tikpan home"></a>
          <p>Connecting employers and candidates across specialist industries through an honest, people-first approach.</p>
          <div class="footer-company">
            <strong>TIKPAN RECRUITMENT GROUP LTD</strong>
            <span>Company number SC904648</span>
            <span>Registered office: 10 Sycamore Row, Fraserburgh, Aberdeenshire, Scotland, AB43 9AF</span>
          </div>
        </div>
        <div>
          <h4>Sectors</h4>
          <a href="${root}sectors/marine-offshore-fishing/index.html">Marine, Offshore &amp; Fishing</a>
          <a href="${root}sectors/engineering-construction/index.html">Engineering &amp; Construction</a>
          <a href="${root}sectors/logistics-warehousing/index.html">Logistics &amp; Warehousing</a>
          <a href="${root}sectors/healthcare/index.html">Healthcare</a>
          <a href="${root}sectors/hospitality/index.html">Hospitality</a>
          <a href="${root}sectors/professional-administration/index.html">Professional &amp; Administration</a>
        </div>
        <div>
          <h4>Explore</h4>
          <a href="${root}about/index.html">About Us</a>
          <a href="${root}vacancies/index.html">Vacancies</a>
          <a href="${root}index.html#employers">Employers</a>
          <a href="${root}index.html#candidates">Candidates</a>
        </div>
        <div>
          <h4>Useful links</h4>
          <a href="${root}index.html#contact">Request Staff</a>
          <a href="${root}index.html#contact">Contact Us</a>
          <a href="${root}privacy/index.html">Candidate Privacy Notice</a>
        </div>
      </div>
      <div class="copyright">© <span id="year" data-footer-year></span> Tikpan Recruitment Group Ltd. All rights reserved.</div>
    </div>`;

  footer.querySelector('[data-footer-year]').textContent = new Date().getFullYear();
});
