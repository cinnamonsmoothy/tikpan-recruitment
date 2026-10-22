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
          <a class="footer-brand" href="${root}" aria-label="Tikpan home"></a>
          <p>Connecting employers and candidates across specialist industries through an honest, people-first approach.</p>
          <div class="footer-company">
            <strong>TIKPAN RECRUITMENT GROUP LTD</strong>
            <span>Company number SC904648</span>
            <span>Registered office: 10 Sycamore Row, Fraserburgh, Aberdeenshire, Scotland, AB43 9AF</span>
          </div>
        </div>
        <div>
          <h4>Sectors</h4>
          <a href="${root}sectors/marine-offshore-fishing/">Marine, Offshore &amp; Fishing</a>
          <a href="${root}sectors/engineering-construction/">Engineering &amp; Construction</a>
          <a href="${root}sectors/logistics-warehousing/">Logistics &amp; Warehousing</a>
          <a href="${root}sectors/healthcare/">Healthcare</a>
          <a href="${root}sectors/hospitality/">Hospitality</a>
          <a href="${root}sectors/professional-administration/">Professional &amp; Administration</a>
        </div>
        <div>
          <h4>Explore</h4>
          <a href="${root}about/">About Us</a>
          <a href="${root}vacancies/">Vacancies</a>
          <a href="${root}#employers">Employers</a>
          <a href="${root}#candidates">Candidates</a>
        </div>
        <div>
          <h4>Useful links</h4>
          <a href="${root}#contact">Request Staff</a>
          <a href="${root}#contact">Contact Us</a>
          <a href="${root}privacy/">Candidate Privacy Notice</a>
          <a href="mailto:info@tikpanrecruitment.co.uk">info@tikpanrecruitment.co.uk</a>
          <a href="tel:+447383831601">+44 7383 831601</a>
          <a href="https://wa.me/447383831601">WhatsApp: +44 7383 831601</a>
        </div>
      </div>
      <div class="copyright"><span>© <span id="year" data-footer-year></span> Tikpan Recruitment Group Ltd. All rights reserved.</span><span class="design-credit">Website designed by <a href="https://findcandidates.co.uk" target="_blank" rel="noopener noreferrer">FindCandidates.co.uk</a>.</span></div>
    </div>`;

  footer.querySelector('[data-footer-year]').textContent = new Date().getFullYear();
});
